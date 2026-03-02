; Inno Setup Script for Printer Bridge (x86 / 32-bit Windows)
; Bundles a 32-bit Node.js runtime with the application files.
; Requires Inno Setup 6+ (https://jrsoftware.org/isinfo.php)

#ifndef MyAppVersion
  #define MyAppVersion "1.0.0"
#endif

#ifndef StagingDir
  #define StagingDir "build-x86"
#endif

#define MyAppName "Printer Bridge"
#define MyAppPublisher "OrderEat"
#define MyAppURL "https://github.com/juanmanuelrot/oe-printing-bridge"

[Setup]
AppId={{B8A3D2E1-4F6C-4A9B-8E7D-1C2F3A4B5D6E}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
OutputDir=build
OutputBaseFilename=PrinterBridgeSetup-x86
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=lowest
WizardStyle=modern
CloseApplications=force

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "{#StagingDir}\node.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#StagingDir}\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#StagingDir}\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#StagingDir}\node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\node.exe"; Parameters: "dist\index.js"; WorkingDir: "{app}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\node.exe"; Parameters: "dist\index.js"; WorkingDir: "{app}"; \
  Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent

[Code]
const
  TaskName = 'PrinterBridge';

{ Creates a Windows Scheduled Task that auto-starts on logon and
  restarts the app automatically after a crash (up to 10 times,
  with a 30-second delay between attempts). }
procedure CreateScheduledTask;
var
  TmpPs1, Script, AppDir, NodePath: string;
  ResultCode: Integer;
begin
  AppDir   := ExpandConstant('{app}');
  NodePath := AppDir + '\node.exe';
  TmpPs1   := ExpandConstant('{tmp}\create-bridge-task.ps1');

  Script :=
    '$nodePath = ''' + NodePath + '''' + #13#10 +
    '$appDir   = ''' + AppDir + '''' + #13#10 +
    '$taskName = ''' + TaskName + '''' + #13#10 +
    '$userId   = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name' + #13#10 +
    '$xml = @"' + #13#10 +
    '<?xml version="1.0" encoding="UTF-16"?>' + #13#10 +
    '<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">' + #13#10 +
    '  <Principals>' + #13#10 +
    '    <Principal id="Author">' + #13#10 +
    '      <UserId>$userId</UserId>' + #13#10 +
    '      <RunLevel>LeastPrivilege</RunLevel>' + #13#10 +
    '    </Principal>' + #13#10 +
    '  </Principals>' + #13#10 +
    '  <Triggers>' + #13#10 +
    '    <LogonTrigger><Enabled>true</Enabled></LogonTrigger>' + #13#10 +
    '  </Triggers>' + #13#10 +
    '  <Settings>' + #13#10 +
    '    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>' + #13#10 +
    '    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>' + #13#10 +
    '    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>' + #13#10 +
    '    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>' + #13#10 +
    '    <RestartOnFailure>' + #13#10 +
    '      <Interval>PT30S</Interval>' + #13#10 +
    '      <Count>10</Count>' + #13#10 +
    '    </RestartOnFailure>' + #13#10 +
    '  </Settings>' + #13#10 +
    '  <Actions Context="Author">' + #13#10 +
    '    <Exec>' + #13#10 +
    '      <Command>$nodePath</Command>' + #13#10 +
    '      <Arguments>dist\index.js</Arguments>' + #13#10 +
    '      <WorkingDirectory>$appDir</WorkingDirectory>' + #13#10 +
    '    </Exec>' + #13#10 +
    '  </Actions>' + #13#10 +
    '</Task>' + #13#10 +
    '"@' + #13#10 +
    '$tmpXml = [System.IO.Path]::GetTempFileName() + ''.xml''' + #13#10 +
    '[System.IO.File]::WriteAllText($tmpXml, $xml, [System.Text.Encoding]::Unicode)' + #13#10 +
    'schtasks.exe /Create /TN "$taskName" /XML "$tmpXml" /F' + #13#10 +
    'Remove-Item -Force $tmpXml';

  SaveStringToFile(TmpPs1, Script, False);
  Exec(
    'powershell.exe',
    '-NonInteractive -ExecutionPolicy Bypass -File "' + TmpPs1 + '"',
    '',
    SW_HIDE,
    ewWaitUntilTerminated,
    ResultCode
  );
  DeleteFile(TmpPs1);
end;

{ Stops the running task and removes it. }
procedure StopAndDeleteScheduledTask;
var
  ResultCode: Integer;
begin
  Exec('schtasks.exe', '/End /TN "' + TaskName + '"', '',
       SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Sleep(2000);
  Exec('schtasks.exe', '/Delete /TN "' + TaskName + '" /F', '',
       SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
    CreateScheduledTask;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then
    StopAndDeleteScheduledTask;
end;
