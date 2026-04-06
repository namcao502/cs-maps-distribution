Add-Type -AssemblyName System.Windows.Forms

$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = "Select your Counter-Strike executable (cstrike.exe)"
$dialog.Filter = "Executable files (*.exe)|*.exe"
$dialog.InitialDirectory = "C:\Games"

if ($dialog.ShowDialog() -ne "OK") {
    Write-Host "Cancelled."
    Read-Host "Press Enter to close"
    exit
}

$exePath = $dialog.FileName
$exeDir  = Split-Path $exePath

# Escape backslashes for .reg string values (each \ becomes \\)
$escapedExe = $exePath -replace '\\', '\\'
$escapedDir = $exeDir  -replace '\\', '\\'

# cmd /c wrapper sets CWD to the game directory before launching.
# Counter-Strike (GoldSrc engine) requires CWD = installation directory or it
# fails to locate its assets. Browsers launch URI handlers with their own CWD,
# not the exe's folder, so a plain exe path in the registry is not enough.
$regContent = @"
Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\cs]
@="URL:Counter-Strike Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\cs\shell]

[HKEY_CLASSES_ROOT\cs\shell\open]

[HKEY_CLASSES_ROOT\cs\shell\open\command]
@="cmd /c \"cd /d \"$escapedDir\" && \"$escapedExe\"\""
"@

$regFile = "$env:TEMP\cs-launch.reg"
try {
    $regContent | Out-File -FilePath $regFile -Encoding unicode
    regedit /s $regFile
    Write-Host "Done! You can now use the Launch CS button on the website."
} finally {
    if (Test-Path $regFile) { Remove-Item $regFile }
}
Read-Host "Press Enter to close"
