# Render memory guard (run in the background next to any render; 7.4 GB laptop, iGPU shares RAM).
# Every 3 s: biggest render Chrome (command line contains remotion-tmp). One process above $capMB = runaway (a 7.2 GB one froze
# Claude): kill every render Chrome so no orphan stays. Logs each new peak with its time, and a summary at the end.
# usage: powershell -NoProfile -File scripts/memguard.ps1 [-minutes 240] [-capMB 5500]
param([double]$minutes = 240, [int]$capMB = 5500)
$end = (Get-Date).AddMinutes($minutes); $peak = 0; $minAv = 99999
while ((Get-Date) -lt $end) {
  $av = (Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory).AvailableMBytes
  $ps = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'chrome.exe' -and $_.CommandLine -like '*remotion-tmp*' })
  $max = 0; foreach ($p in $ps) { $m = $p.PrivatePageCount / 1MB; if ($m -gt $max) { $max = $m } }
  if ($max -gt $peak) { $peak = $max; "{0:HH:mm:ss} new peak render chrome {1:N0} MB, available {2} MB" -f (Get-Date), $max, $av }
  if ($av -lt $minAv) { $minAv = $av }
  if ($max -gt $capMB) { "{0:HH:mm:ss} RUNAWAY {1:N0} MB: killing render chrome" -f (Get-Date), $max; $ps | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} } }
  Start-Sleep -Seconds 3
}
"peak render chrome {0:N0} MB, min available {1} MB" -f $peak, $minAv
