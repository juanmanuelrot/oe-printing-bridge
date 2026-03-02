import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { execFile } from 'node:child_process';

export function getLogPath(): string {
  if (process.platform === 'win32') {
    return join(process.env.APPDATA ?? homedir(), 'printer-bridge', 'printer-bridge.log');
  }
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Logs', 'printer-bridge.log');
  }
  return join(homedir(), '.local', 'share', 'printer-bridge', 'printer-bridge.log');
}

export function setupFileLogging(): string {
  const logPath = getLogPath();

  try {
    mkdirSync(dirname(logPath), { recursive: true });
    const stream = createWriteStream(logPath, { flags: 'a' });

    const write = (level: string, args: unknown[]) => {
      const line = `[${new Date().toISOString()}] [${level}] ${args.map(String).join(' ')}\n`;
      stream.write(line);
    };

    const origLog = console.log.bind(console);
    const origWarn = console.warn.bind(console);
    const origError = console.error.bind(console);

    console.log = (...args: unknown[]) => { origLog(...args); write('INFO', args); };
    console.warn = (...args: unknown[]) => { origWarn(...args); write('WARN', args); };
    console.error = (...args: unknown[]) => { origError(...args); write('ERROR', args); };
  } catch {
    // Non-fatal: continue without file logging
  }

  return logPath;
}

export function openLogFile(logPath: string): void {
  if (process.platform === 'win32') {
    execFile('notepad.exe', [logPath]);
  } else if (process.platform === 'darwin') {
    execFile('open', [logPath]);
  } else {
    execFile('xdg-open', [logPath]);
  }
}
