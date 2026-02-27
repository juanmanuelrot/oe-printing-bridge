import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFile, unlink } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

function runPowerShell(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { timeout: 10_000 },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr.trim() || err.message));
          return;
        }
        resolve(stdout.trim());
      },
    );
  });
}

export interface WinPrinter {
  name: string;
  isDefault: boolean;
  status: string;
}

/**
 * List installed printers using PowerShell's Get-Printer cmdlet.
 */
export async function getPrinters(): Promise<WinPrinter[]> {
  const script = `
    $defaultPrinter = (Get-CimInstance -ClassName Win32_Printer | Where-Object { $_.Default }).Name
    Get-Printer | ForEach-Object {
      [PSCustomObject]@{
        name      = $_.Name
        isDefault = ($_.Name -eq $defaultPrinter)
        status    = $_.PrinterStatus.ToString()
      }
    } | ConvertTo-Json -Compress
  `;

  const output = await runPowerShell(script);
  if (!output) return [];

  const parsed = JSON.parse(output);
  // PowerShell returns a single object (not array) when there's only one printer
  return Array.isArray(parsed) ? parsed : [parsed];
}

/**
 * Get the status of a single printer by name.
 */
export async function getPrinterStatus(printerName: string): Promise<string> {
  const escaped = printerName.replace(/'/g, "''");
  const script = `
    $p = Get-Printer -Name '${escaped}' -ErrorAction SilentlyContinue
    if ($p) { $p.PrinterStatus.ToString() } else { 'NOT_FOUND' }
  `;
  return runPowerShell(script);
}

/**
 * Send raw bytes to a Windows printer using .NET's RawPrinterHelper via PowerShell.
 * Writes data to a temp file and sends it through the Win32 spooler API.
 */
export async function printRaw(printerName: string, data: Buffer): Promise<void> {
  // Write data to a temp file to avoid PowerShell encoding issues with binary data
  const tmpFile = join(tmpdir(), `pb-${randomBytes(8).toString('hex')}.bin`);
  await writeFile(tmpFile, data);

  const escapedPrinter = printerName.replace(/'/g, "''");
  const escapedPath = tmpFile.replace(/'/g, "''");

  const script = `
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static bool SendBytesToPrinter(string szPrinterName, byte[] bytes) {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Printer Bridge RAW Document";
        di.pDataType = "RAW";

        if (!OpenPrinter(szPrinterName.Normalize(), out hPrinter, IntPtr.Zero))
            return false;

        if (!StartDocPrinter(hPrinter, 1, di)) {
            ClosePrinter(hPrinter);
            return false;
        }

        if (!StartPagePrinter(hPrinter)) {
            EndDocPrinter(hPrinter);
            ClosePrinter(hPrinter);
            return false;
        }

        IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);

        int dwWritten;
        bool success = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);

        Marshal.FreeCoTaskMem(pUnmanagedBytes);
        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);

        return success;
    }
}
'@

$bytes = [System.IO.File]::ReadAllBytes('${escapedPath}')
$result = [RawPrinterHelper]::SendBytesToPrinter('${escapedPrinter}', $bytes)
if (-not $result) {
    throw "Failed to send data to printer '${escapedPrinter}'"
}
Write-Output 'OK'
`;

  try {
    await runPowerShell(script);
  } finally {
    // Clean up temp file
    await unlink(tmpFile).catch(() => {});
  }
}
