Add-Type @'
using System.Runtime.InteropServices;
public class SleepBlock {
  [DllImport("kernel32.dll")]
  public static extern uint SetThreadExecutionState(uint esFlags);
}
'@

$hours = if ($args[0]) { [int]$args[0] } else { 4 }
$end = (Get-Date).AddHours($hours)
# ES_CONTINUOUS (0x80000000) | ES_SYSTEM_REQUIRED (0x1)
$flags = [uint32][int64]2147483649

while ((Get-Date) -lt $end) {
  [void][SleepBlock]::SetThreadExecutionState($flags)
  Start-Sleep -Seconds 45
}
