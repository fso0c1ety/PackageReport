param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop'
$result=@{status='FAIL';standardUser=$false;interactive=$true;uacBypassed=$false}
$process=$null
try {
  $identity=[Security.Principal.WindowsIdentity]::GetCurrent()
  $principal=New-Object Security.Principal.WindowsPrincipal($identity)
  if($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'Interactive worker must use a real non-administrator token'}
  $result.standardUser=$true
  Add-Type -AssemblyName UIAutomationClient
  Add-Type -AssemblyName UIAutomationTypes
  $installer=Join-Path $Root 'Smart-Manage-Setup-1.0.32.exe'
  $algorithm=[Security.Cryptography.SHA256]::Create()
  try {$hash=[BitConverter]::ToString($algorithm.ComputeHash([IO.File]::ReadAllBytes($installer))).Replace('-','')}
  finally {$algorithm.Dispose()}
  if($hash -ne 'E28D4D3AAAD54B26ECDD139969359003BB358EFB36E77006087B309FD8EDB490'){throw 'Interactive installer checksum mismatch'}
  $destination=Join-Path $Root 'installed'
  $result.customDirectory=$destination
  $process=Start-Process -FilePath $installer -PassThru -WindowStyle Normal
  $deadline=(Get-Date).AddSeconds(180)
  $directorySeen=$false
  $pages=[System.Collections.Generic.List[object]]::new()
  while(-not $process.HasExited -and (Get-Date) -lt $deadline){
    $windows=[System.Windows.Automation.AutomationElement]::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children,[System.Windows.Automation.Condition]::TrueCondition)
    $window=$null
    foreach($candidate in $windows){if($candidate.Current.Name -match 'Smart Manage.*Setup|Smart Manage.*Installation'){$window=$candidate;break}}
    if(-not $window){Start-Sleep -Milliseconds 250;$process.Refresh();continue}
    $controls=$window.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.Condition]::TrueCondition)
    $buttons=@();$edits=@();$labels=@()
    foreach($control in $controls){
      if($control.Current.IsOffscreen){continue}
      $label=$control.Current.Name.Replace('&','').Trim()
      if($label){$labels+=$label}
      if($control.Current.ControlType -eq [System.Windows.Automation.ControlType]::RadioButton -and $label -match 'Only for me|Just me'){
        $selection=$control.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern);$selection.Select()
      }
      if($control.Current.ControlType -eq [System.Windows.Automation.ControlType]::CheckBox -and $label -match '^Run '){
        $toggle=$control.GetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern)
        if($toggle.Current.ToggleState -eq [System.Windows.Automation.ToggleState]::On){$toggle.Toggle()}
      }
      if($control.Current.ControlType -eq [System.Windows.Automation.ControlType]::Edit){$edits+=$control}
      if($control.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button -and $control.Current.IsEnabled){$buttons+=@{element=$control;label=$label}}
    }
    foreach($edit in $edits){
      $value=$edit.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
      if($value.Current.Value -match '^[A-Za-z]:\\'){
        if(-not $directorySeen){
          $expected=Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Programs'
          if(-not $value.Current.Value.StartsWith($expected,[StringComparison]::OrdinalIgnoreCase)){throw "Unexpected default per-user directory: $($value.Current.Value)"}
          $result.defaultDirectory=$value.Current.Value
        }
        $value.SetValue($destination)
        if($value.Current.Value -ne $destination){throw 'Interactive custom directory was not accepted'}
        $directorySeen=$true
      }
    }
    $button=$buttons | Where-Object {$_.label -match '^(Next\s*>?|Install|Finish|I Agree)$'} | Select-Object -First 1
    if($button){
      if($button.label -eq 'Install' -and -not $directorySeen){throw 'Refusing installation before the custom directory UI is verified'}
      $pages.Add(@{button=$button.label;visibleLabels=$labels})
      $button.element.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
      Start-Sleep -Milliseconds 600
    }else{Start-Sleep -Milliseconds 250}
    $process.Refresh()
  }
  $result.pages=$pages
  if(-not $process.HasExited){throw 'Interactive installer did not complete; desktop/UAC interaction may be unavailable'}
  if($process.ExitCode -ne 0){throw "Interactive installer exit code: $($process.ExitCode)"}
  if(-not $directorySeen){throw 'Real installation-directory UI was not exercised'}
  $exe=Join-Path $destination 'Smart Manage.exe'
  if(-not (Get-Item $exe).VersionInfo.ProductVersion.StartsWith('1.0.32')){throw 'Interactive installed version mismatch'}
  $entries=Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue | Where-Object {([string]$_.UninstallString).Contains($destination)}
  if(-not $entries){throw 'Standard-user uninstall entry missing'}
  $result.installerExitCode=$process.ExitCode
  $result.perUserRegistry=$true
  $result.directoryUI=$true
  $uninstaller=Get-ChildItem $destination -Filter 'Uninstall*.exe' | Select-Object -First 1
  $uninstall=Start-Process -FilePath $uninstaller.FullName -ArgumentList '/S' -Wait -PassThru -WindowStyle Hidden
  if($uninstall.ExitCode -ne 0){throw 'Standard-user uninstall failed'}
  for($i=0;$i -lt 60 -and (Test-Path $exe);$i++){Start-Sleep 1}
  if(Test-Path $exe){throw 'Executable remains after standard-user uninstall'}
  $result.uninstall=$true
  $result.status='PASS'
} catch {
  $result.error=$_.Exception.Message
  $result.stack=$_.ScriptStackTrace
} finally {
  $result | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $Root 'interactive-result.json')
  if($process -and -not $process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}
}
if($result.status -ne 'PASS'){exit 1}
