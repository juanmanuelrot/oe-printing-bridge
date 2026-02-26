# build-installer.ps1
# Builds the Printer Bridge Windows installer.
#
# Prerequisites:
#   - Node.js 18+ installed
#   - Inno Setup 6 installed (https://jrsoftware.org/isinfo.php)
#
# Usage:
#   cd bridge
#   powershell -ExecutionPolicy Bypass -File scripts/build-installer.ps1

$ErrorActionPreference = "Stop"

$BridgeDir = Split-Path -Parent $PSScriptRoot
Push-Location $BridgeDir

Write-Host "==> Installing dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

Write-Host "==> Compiling TypeScript..." -ForegroundColor Cyan
npx tsc
if ($LASTEXITCODE -ne 0) { throw "TypeScript compilation failed" }

Write-Host "==> Packaging standalone exe with pkg..." -ForegroundColor Cyan
if (-not (Test-Path "build")) { New-Item -ItemType Directory -Path "build" | Out-Null }
npx @yao-pkg/pkg . --targets node20-win-x64 --output build/printer-bridge.exe --compress GZip
if ($LASTEXITCODE -ne 0) { throw "pkg packaging failed" }

Write-Host "==> Build output:" -ForegroundColor Cyan
Get-ChildItem build/printer-bridge.exe | Format-Table Name, Length

# --- Inno Setup ---
$InnoCompiler = $null
$InnoSearchPaths = @(
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
    "${env:LOCALAPPDATA}\Programs\Inno Setup 6\ISCC.exe"
)
foreach ($path in $InnoSearchPaths) {
    if (Test-Path $path) {
        $InnoCompiler = $path
        break
    }
}

if ($InnoCompiler) {
    Write-Host "==> Building installer with Inno Setup..." -ForegroundColor Cyan
    & $InnoCompiler installer.iss
    if ($LASTEXITCODE -ne 0) { throw "Inno Setup compilation failed" }
    Write-Host ""
    Write-Host "Installer created: build/PrinterBridgeSetup.exe" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Inno Setup not found. Skipping installer creation." -ForegroundColor Yellow
    Write-Host "Install Inno Setup 6 from https://jrsoftware.org/isinfo.php" -ForegroundColor Yellow
    Write-Host "Then re-run this script, or compile manually:" -ForegroundColor Yellow
    Write-Host '  & "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss' -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Standalone exe is still available at: build/printer-bridge.exe" -ForegroundColor Green
}

Pop-Location
