param([switch]$DryRun, [switch]$Force, [string[]]$RefreshType = @())

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$items = Get-Content -LiteralPath (Join-Path $repo 'frontend\src\data\providerTypeImageSources.json') -Raw | ConvertFrom-Json
$dest = Join-Path $repo 'frontend\public\join-types'
$map = [ordered]@{}
$creditRows = [System.Collections.Generic.List[string]]::new()
$failures = [System.Collections.Generic.List[string]]::new()
$seen = @{}
New-Item -ItemType Directory -Force -Path $dest | Out-Null

foreach ($item in $items) {
  if ($seen.ContainsKey($item.id)) {
    $failures.Add("$($item.typeKey): duplicate photo id $($item.id)")
    continue
  }
  $seen[$item.id] = $true
  $file = Join-Path $dest "$($item.typeKey).jpg"
  $shouldRefresh = $Force -and (($RefreshType.Count -eq 0) -or ($item.typeKey -in $RefreshType))
  if ((Test-Path -LiteralPath $file) -and (Get-Item -LiteralPath $file).Length -gt 8000 -and -not $shouldRefresh) {
    $map[$item.typeKey] = "/join-types/$($item.typeKey).jpg"
    $creditRows.Add("| $($item.label.Replace('|','/')) | [Unsplash photo]($($item.page)) | Unsplash License |")
    Write-Output "$($item.typeKey): already downloaded"
    continue
  }
  $download = "https://unsplash.com/photos/$($item.id)/download?force=true"
  $effective = & curl.exe -sSI -L --max-time 30 -o NUL -w '%{url_effective}' $download
  if ($LASTEXITCODE -ne 0 -or -not $effective.StartsWith('https://images.unsplash.com/')) {
    $failures.Add("$($item.typeKey): Unsplash redirect failed")
    continue
  }

  $imageUrl = $effective.Split('?')[0] + '?auto=format&fit=crop&crop=entropy&w=1200&q=82&fm=jpg'
  if (-not $DryRun) {
    & curl.exe -L --fail --silent --show-error --max-time 60 $imageUrl -o $file
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $file) -or (Get-Item -LiteralPath $file).Length -lt 8000) {
      $failures.Add("$($item.typeKey): image download/size check failed")
      continue
    }
    $bytes = [IO.File]::ReadAllBytes($file)
    if ($bytes.Length -lt 3 -or $bytes[0] -ne 255 -or $bytes[1] -ne 216) {
      $failures.Add("$($item.typeKey): invalid JPEG")
      continue
    }
  }
  $map[$item.typeKey] = "/join-types/$($item.typeKey).jpg"
  $creditRows.Add("| $($item.label.Replace('|','/')) | [Unsplash photo]($($item.page)) | Unsplash License |")
  Write-Output "$($item.typeKey): ready"
}

if (-not $DryRun) {
  $map | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $repo 'frontend\src\data\providerTypeImages.json') -Encoding utf8
  @(
    '# Join Platform stock photo credits',
    '',
    'Each provider type has its own locally stored Unsplash photo. Source page and license are recorded per card.',
    '',
    '| Provider type | Source | License |',
    '|---|---|---|'
  ) + $creditRows | Set-Content -LiteralPath (Join-Path $dest 'CREDITS.md') -Encoding utf8
}
Write-Output "mapped=$($map.Count) expected=$($items.Count)"
if ($failures.Count) { Write-Output ('failures=' + ($failures -join '; ')); exit 2 }
