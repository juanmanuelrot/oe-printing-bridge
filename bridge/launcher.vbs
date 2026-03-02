' Printer Bridge Launcher
' Runs printer-bridge.exe in the background without showing a console window.
' Double-click this file (or register it as the scheduled task command) to start.

Dim WShell, scriptDir
Set WShell  = CreateObject("WScript.Shell")
scriptDir   = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
WShell.Run Chr(34) & scriptDir & "printer-bridge.exe" & Chr(34), 0, False
Set WShell = Nothing
