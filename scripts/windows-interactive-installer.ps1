param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop'
$result=@{status='FAIL';standardUser=$false;interactive=$true;uacBypassed=$false}
$process=$null
try {
  $identity=[Security.Principal.WindowsIdentity]::GetCurrent()
  $principal=New-Object Security.Principal.WindowsPrincipal($identity)
  if($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'Interactive worker must use a real non-administrator token'}
  $result.standardUser=$true
  $workerTemp=Join-Path $Root 'worker-temp'
  [IO.Directory]::CreateDirectory($workerTemp) | Out-Null
  $env:TEMP=$workerTemp
  $env:TMP=$workerTemp
  $result.workerTemp=$workerTemp
  Add-Type -AssemblyName UIAutomationClient
  Add-Type -AssemblyName UIAutomationTypes
  Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Collections.Generic;
public static class InstallerDesktopProbe {
  [DllImport("user32.dll")] public static extern IntPtr GetProcessWindowStation();
  [DllImport("user32.dll")] public static extern IntPtr GetThreadDesktop(uint id);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll",CharSet=CharSet.Unicode,SetLastError=true)] public static extern bool GetUserObjectInformation(IntPtr handle,int index,StringBuilder value,int length,out int needed);
  public static string Name(IntPtr handle){int needed;var value=new StringBuilder(256);return GetUserObjectInformation(handle,2,value,512,out needed)?value.ToString():"unavailable:"+Marshal.GetLastWin32Error();}
  public delegate bool ChildCallback(IntPtr window,IntPtr parameter);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent,ChildCallback callback,IntPtr parameter);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr window,StringBuilder name,int size);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr window);
  [DllImport("user32.dll")] public static extern bool IsWindowEnabled(IntPtr window);
  [DllImport("user32.dll",CharSet=CharSet.Unicode,EntryPoint="SendMessageW")] public static extern IntPtr ReadText(IntPtr window,uint message,IntPtr size,StringBuilder value);
  [DllImport("user32.dll",CharSet=CharSet.Unicode,EntryPoint="SendMessageW")] public static extern IntPtr WriteText(IntPtr window,uint message,IntPtr unused,string value);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr window);
  [DllImport("user32.dll",SetLastError=true)] public static extern bool SetCursorPos(int x,int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags,uint x,uint y,uint data,UIntPtr extra);
  public static IntPtr[] Edits(IntPtr parent){var found=new List<IntPtr>();EnumChildWindows(parent,(window,unused)=>{var name=new StringBuilder(128);GetClassName(window,name,128);if(name.ToString()=="Edit" && IsWindowVisible(window) && IsWindowEnabled(window))found.Add(window);return true;},IntPtr.Zero);return found.ToArray();}
  public static string Text(IntPtr window){var text=new StringBuilder(4096);ReadText(window,13,(IntPtr)4096,text);return text.ToString();}
  public static void SetText(IntPtr window,string value){WriteText(window,12,IntPtr.Zero,value);}
  public static void Click(int x,int y){if(!SetCursorPos(x,y))throw new Exception("Native input desktop access denied: "+Marshal.GetLastWin32Error());mouse_event(2,0,0,0,UIntPtr.Zero);mouse_event(4,0,0,0,UIntPtr.Zero);}
}
'@
  $result.windowStation=[InstallerDesktopProbe]::Name([InstallerDesktopProbe]::GetProcessWindowStation())
  $result.desktop=[InstallerDesktopProbe]::Name([InstallerDesktopProbe]::GetThreadDesktop([InstallerDesktopProbe]::GetCurrentThreadId()))
  $result.sessionId=[Diagnostics.Process]::GetCurrentProcess().SessionId
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
  $result.pages=$pages
  while(-not $process.HasExited -and (Get-Date) -lt $deadline){
    $windows=[System.Windows.Automation.AutomationElement]::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children,[System.Windows.Automation.Condition]::TrueCondition)
    $result.rootWindowCount=$windows.Count
    $result.processWindowTitle=$process.MainWindowTitle
    $window=$null
    foreach($candidate in $windows){if($candidate.Current.ProcessId -eq $process.Id -or $candidate.Current.Name -match 'Smart Manage.*Setup|Smart Manage.*Installation'){$window=$candidate;break}}
    if(-not $window){Start-Sleep -Milliseconds 250;$process.Refresh();continue}
    $controls=$window.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.Condition]::TrueCondition)
    $buttons=@();$edits=@();$labels=@()
    foreach($control in $controls){
      if($control.Current.IsOffscreen){continue}
      $label=$control.Current.Name.Replace('&','').Trim()
      if($label){$labels+=$label}
      if($control.Current.ControlType.Id -eq [System.Windows.Automation.ControlType]::RadioButton.Id -and $label -match 'Only for me|Just me'){
        $selection=$control.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern);$selection.Select()
      }
      if($control.Current.ControlType.Id -eq [System.Windows.Automation.ControlType]::CheckBox.Id -and $label -match '^Run '){
        $toggle=$control.GetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern)
        if($toggle.Current.ToggleState -eq [System.Windows.Automation.ToggleState]::On){$toggle.Toggle()}
      }
      if($control.Current.ControlType.Id -eq [System.Windows.Automation.ControlType]::Edit.Id){$edits+=$control}
      if($label -match '^(Next\s*>?|Install|Finish|I Agree)$'){
        $result.nextControl=@{name=$label;typeId=$control.Current.ControlType.Id;enabled=$control.Current.IsEnabled;patterns=@($control.GetSupportedPatterns() | ForEach-Object ProgrammaticName)}
        if($control.Current.IsEnabled){$buttons+=@{element=$control;label=$label}}
      }
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
    if(-not $directorySeen){
      foreach($handle in [InstallerDesktopProbe]::Edits([IntPtr]$window.Current.NativeWindowHandle)){
        $text=[InstallerDesktopProbe]::Text($handle)
        if($text -match '^[A-Za-z]:\\'){
          $expected=Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Programs'
          if(-not $text.StartsWith($expected,[StringComparison]::OrdinalIgnoreCase)){throw "Unexpected native default folder: $text"}
          $result.defaultDirectory=$text
          [InstallerDesktopProbe]::SetText($handle,$destination)
          if([InstallerDesktopProbe]::Text($handle) -ne $destination){throw 'Native directory edit did not retain the custom path'}
          $directorySeen=$true
        }
      }
    }
    $result.lastVisibleLabels=$labels
    $button=$buttons | Where-Object {$_.label -match '^(Next\s*>?|Install|Finish|I Agree)$'} | Select-Object -First 1
    if($button){
      if($button.label -eq 'Install' -and -not $directorySeen){throw 'Refusing installation before the custom directory UI is verified'}
      $pages.Add(@{button=$button.label;visibleLabels=$labels})
      $action=$null
      if($button.element.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern,[ref]$action)){$action.Invoke()}
      else{
        [InstallerDesktopProbe]::SetForegroundWindow([IntPtr]$window.Current.NativeWindowHandle) | Out-Null
        $bounds=$button.element.Current.BoundingRectangle
        if($bounds.Width -le 0 -or $bounds.Height -le 0){throw 'Installer button has no clickable screen bounds'}
        [InstallerDesktopProbe]::Click([int]($bounds.X+$bounds.Width/2),[int]($bounds.Y+$bounds.Height/2))
      }
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
