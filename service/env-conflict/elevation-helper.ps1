param(
  [Parameter(Mandatory = $true)][string]$RequestPath,
  [Parameter(Mandatory = $true)][string]$ResultPath,
  [Parameter(Mandatory = $true)][string]$ExpectedHash
)

$ErrorActionPreference = 'Stop'
$ProtocolVersion = 1
$Operation = 'write-system-path'
$RegistrySubKey = 'SYSTEM\CurrentControlSet\Control\Session Manager\Environment'
$RegistryTarget = 'HKLM\\' + $RegistrySubKey + '\\Path'

function Write-JsonFile([string]$Path, [object]$Value) {
  $directory = [System.IO.Path]::GetDirectoryName($Path)
  if ($directory) { [System.IO.Directory]::CreateDirectory($directory) | Out-Null }
  [System.IO.File]::WriteAllText($Path, ($Value | ConvertTo-Json -Depth 8), [System.Text.UTF8Encoding]::new($false))
}

function Test-SafePathEntry([string]$Entry) {
  if ([string]::IsNullOrWhiteSpace($Entry) -or $Entry.Length -gt 4096) { throw 'PATH 条目无效' }
  foreach ($character in $Entry.ToCharArray()) {
    $code = [int][char]$character
    if ($code -le 31 -or $code -eq 127) { throw 'PATH 条目包含控制字符' }
  }
  if ($Entry.Contains('"')) { throw 'PATH 条目包含引号' }
  if ($Entry.IndexOf([char]96) -ge 0 -or $Entry.Contains('$')) { throw 'PATH 条目包含未授权 shell 字符' }
  $absolute = ($Entry -match '^[A-Za-z]:[\\/]') -or $Entry.StartsWith('\\\\') -or ($Entry -match '^%[A-Za-z_][A-Za-z0-9_]*%([\\/]|$)')
  if (-not $absolute) { throw 'PATH 条目必须是绝对路径或 Windows 环境变量路径' }
}

function Read-SystemPath {
  $key = [Microsoft.Win32.Registry]::LocalMachine.OpenSubKey($RegistrySubKey, $false)
  if ($null -eq $key) { throw '无法打开 HKLM 环境注册表项' }
  try {
    $exists = $false
    $value = $key.GetValue('Path', $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
    if ($null -ne $value) { $exists = $true }
    $kind = 'ExpandString'
    $storedValue = ''
    if ($exists) {
      $kind = [string]$key.GetValueKind('Path')
      $storedValue = [string]$value
    }
    return [ordered]@{ platform = 'win32'; target = $RegistryTarget; exists = $exists; value = $storedValue; type = $kind }
  } finally { $key.Dispose() }
}

function Restore-SystemPath([object]$Previous) {
  $key = [Microsoft.Win32.Registry]::LocalMachine.OpenSubKey($RegistrySubKey, $true)
  if ($null -eq $key) { throw '无法以管理员权限打开 HKLM 环境注册表项' }
  try {
    if ([bool]$Previous.exists) {
      $kind = [Enum]::Parse([Microsoft.Win32.RegistryValueKind], [string]$Previous.type)
      $key.SetValue('Path', [string]$Previous.value, $kind)
    } else {
      $key.DeleteValue('Path', $false)
    }
  } finally { $key.Dispose() }
}

function Set-SystemPath([string]$Value, [string]$Type) {
  $key = [Microsoft.Win32.Registry]::LocalMachine.OpenSubKey($RegistrySubKey, $true)
  if ($null -eq $key) { throw '无法以管理员权限打开 HKLM 环境注册表项' }
  try {
    $kind = [Enum]::Parse([Microsoft.Win32.RegistryValueKind], [string]$Type)
    $key.SetValue('Path', $Value, $kind)
  } finally { $key.Dispose() }
}

try {
  if (-not [System.IO.File]::Exists($RequestPath)) { throw '提权请求文件不存在' }
  if ($ExpectedHash -notmatch '^[a-f0-9]{64}$') { throw '提权请求完整性参数无效' }
  $requestContent = [System.IO.File]::ReadAllText($RequestPath)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try { $actualHash = ([BitConverter]::ToString($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($requestContent))).Replace('-', '').ToLowerInvariant()) } finally { $sha.Dispose() }
  if ($actualHash -ne $ExpectedHash) { throw '提权请求完整性校验失败' }
  $request = $requestContent | ConvertFrom-Json
  $keys = @($request.PSObject.Properties.Name | Sort-Object)
  if (($keys -join '|') -ne 'backupPath|operation|pathEntries|platform|requestId|version') { throw '提权请求包含未授权字段' }
  if ([int]$request.version -ne $ProtocolVersion -or [string]$request.operation -ne $Operation -or [string]$request.platform -ne 'win32') { throw '提权请求版本、平台或操作不在白名单内' }
  if ([string]$request.requestId -notmatch '^[a-zA-Z0-9_-]{8,128}$') { throw '提权请求 ID 无效' }
  $entries = @($request.pathEntries)
  if ($entries.Count -lt 1 -or $entries.Count -gt 128) { throw '提权请求 PATH 条目数量无效' }
  $cleanEntries = @()
  foreach ($entry in $entries) { Test-SafePathEntry([string]$entry); $cleanEntries += ([string]$entry).Trim() }
  if (-not [System.IO.Path]::IsPathRooted([string]$request.backupPath)) { throw '提权请求备份路径无效' }
  $backupItem = Get-Item -LiteralPath ([string]$request.backupPath) -Force
  if (($backupItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { throw '拒绝使用符号链接备份目录' }
  if ($ResultPath -and (Test-Path -LiteralPath $ResultPath)) {
    $resultItem = Get-Item -LiteralPath $ResultPath -Force
    if (($resultItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { throw '拒绝写入符号链接结果文件' }
  }

  $previous = Read-SystemPath
  Write-JsonFile ([System.IO.Path]::Combine([string]$request.backupPath, 'system-path.json')) $previous
  $seen = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
  $merged = New-Object 'System.Collections.Generic.List[string]'
  foreach ($entry in ($cleanEntries + ([string]$previous.value -split ';'))) {
    $trimmed = ([string]$entry).Trim()
    if ($trimmed -and $seen.Add($trimmed)) { $merged.Add($trimmed) }
  }
  $next = $merged -join ';'
  $changed = $false
  try {
    Set-SystemPath $next ([string]$previous.type)
    $changed = $true
    $verified = Read-SystemPath
    if (-not $verified.exists -or [string]$verified.value -ne $next) { throw '系统 PATH 写入后校验失败' }
    $result = [ordered]@{ version = $ProtocolVersion; operation = $Operation; requestId = [string]$request.requestId; platform = 'win32'; success = $true; changed = $true; rolledBack = $false; target = $RegistryTarget; message = '系统级 PATH 已由一次性提权助手写入并完成校验。'; backupPath = [string]$request.backupPath; previousValue = [string]$previous.value; nextValue = $next }
  } catch {
    $rolledBack = $false
    if ($changed) { try { Restore-SystemPath $previous; $changed = $false; $rolledBack = $true } catch { $rolledBack = $false } }
    $errorCode = 'ROLLBACK_FAILED'
    if ($rolledBack) { $errorCode = 'WRITE_FAILED' }
    $result = [ordered]@{ version = $ProtocolVersion; operation = $Operation; requestId = [string]$request.requestId; platform = 'win32'; success = $false; changed = $changed; rolledBack = $rolledBack; target = $RegistryTarget; message = '系统级 PATH 未完成写入：' + $_.Exception.Message; backupPath = [string]$request.backupPath; errorCode = $errorCode }
  }
  Write-JsonFile $ResultPath $result
  if (-not $result.success) { exit 1 }
} catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 2
}
