# 站点链接检查器
#
# 用途：扫描全站，检查「每个 permalink」和「每个内部链接」是否能对上，
#       找出会 404 的链接。改名之后跑一次，就知道有没有漏改的地方。
#
# 用法（这台机器只有 Windows PowerShell 5.1，没有 pwsh 7；
#       且 LocalMachine 执行策略是 RemoteSigned，本文件无签名，必须用 Bypass）：
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\check-links.ps1
#
# 退出码：0 = 无死链，1 = 有死链

param(
    [string]$SiteRoot
)

$ErrorActionPreference = 'Stop'

# $PSScriptRoot 在某些调用方式下会是空值，用 $MyInvocation 兜底
if (-not $SiteRoot) {
    $scriptDir = $PSScriptRoot
    if (-not $scriptDir) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
    $SiteRoot = Split-Path -Parent $scriptDir
}
$SiteRoot = (Resolve-Path $SiteRoot).Path

Write-Host "站点根目录: $SiteRoot`n"

# ---------- 工具函数 ----------

# 只认「文件第一行是 ---」的 front matter，避免把文档里的示例代码块误当配置
function Get-FrontMatter {
    param([string]$Path)
    $lines = Get-Content $Path -Encoding UTF8
    if ($lines.Count -lt 2) { return $null }
    if ($lines[0].Trim() -ne '---') { return $null }
    for ($i = 1; $i -lt $lines.Count; $i++) {
        if ($lines[$i].Trim() -eq '---') { return ($lines[1..($i-1)] -join "`n") }
    }
    return $null
}

# 剥掉不该被当成链接的东西：围栏代码块、行内代码、LaTeX 公式、HTML 注释
function Remove-NonLinkContent {
    param([string]$Text)
    $Text = [regex]::Replace($Text, '(?s)```.*?```', '')      # 围栏代码块
    $Text = [regex]::Replace($Text, '`[^`\n]*`', '')          # 行内代码
    $Text = [regex]::Replace($Text, '(?s)\$\$.*?\$\$', '')    # 块级公式
    $Text = [regex]::Replace($Text, '\$[^$\n]*\$', '')        # 行内公式
    $Text = [regex]::Replace($Text, '(?s)<!--.*?-->', '')     # HTML 注释
    return $Text
}

# 归一化路径：处理 ./ 和 ../，保证以 / 开头、以 / 结尾
function Get-NormalizedPath {
    param([string]$BaseDir, [string]$Target)
    $resolved = if ($BaseDir) { "$BaseDir/$Target" } else { $Target }
    $resolved = $resolved.Replace('\', '/')
    $parts = @()
    foreach ($seg in ($resolved -split '/')) {
        if ($seg -eq '' -or $seg -eq '.') { continue }
        if ($seg -eq '..') {
            if ($parts.Count -gt 0) { $parts = @($parts[0..($parts.Count - 2)]) }
        } else { $parts += $seg }
    }
    $norm = '/' + ($parts -join '/')
    if (-not $norm.EndsWith('/')) { $norm += '/' }
    return $norm
}

# ---------- 1. 收集所有页面的 permalink ----------

$pages = @{}
$mdFiles = @(Get-ChildItem -Recurse -Force $SiteRoot -Filter *.md |
    Where-Object { $_.FullName -notmatch '\\\.git\\' })

foreach ($f in $mdFiles) {
    $fm = Get-FrontMatter $f.FullName
    if (-not $fm) { continue }
    $m = [regex]::Match($fm, '(?m)^permalink:\s*(\S+)\s*$')
    if ($m.Success) {
        $pm = $m.Groups[1].Value
        $rel = $f.FullName.Replace("$SiteRoot\", '')
        if ($pages.ContainsKey($pm)) {
            Write-Host "[冲突] permalink 重复: $pm" -ForegroundColor Red
            Write-Host "        $($pages[$pm])  和  $rel"
        } else {
            $pages[$pm] = $rel
        }
    }
}

Write-Host "=== 发现 $($pages.Count) 个带 permalink 的页面 ==="
foreach ($k in ($pages.Keys | Sort-Object)) {
    Write-Host ("  {0,-40} {1}" -f $k, $pages[$k])
}
Write-Host ""

# ---------- 2. 检查每个页面内的链接 ----------

$brokenLinks = @()
$checkedLinks = 0

foreach ($f in $mdFiles) {
    $rel = $f.FullName.Replace("$SiteRoot\", '')
    $dir = Split-Path -Parent $rel
    if ($dir -eq $rel) { $dir = '' }
    $content = Remove-NonLinkContent (Get-Content $f.FullName -Raw -Encoding UTF8)

    foreach ($m in [regex]::Matches($content, '\[([^\]]*)\]\(([^)]+)\)')) {
        $target = $m.Groups[2].Value.Trim()
        if ($target -match '^(https?:|mailto:|#)') { continue }
        $checkedLinks++

        $norm = Get-NormalizedPath -BaseDir $dir -Target $target
        $ok = $false
        $why = ''

        if ($pages.ContainsKey($norm)) { $ok = $true; $why = "permalink -> $($pages[$norm])" }

        if (-not $ok) {
            $stripped = $norm.TrimEnd('/')
            foreach ($cand in @("$stripped.md", "$stripped/index.md")) {
                $full = Join-Path $SiteRoot ($cand -replace '/', '\')
                if (Test-Path $full) { $ok = $true; $why = "文件 $cand"; break }
            }
        }

        if ($ok) {
            Write-Host ("  [OK] {0,-30} {1,-24} {2}" -f $rel, $target, $why) -ForegroundColor DarkGray
        } else {
            $brokenLinks += New-Object PSObject -Property @{
                '文件' = $rel; '链接文字' = $m.Groups[1].Value; '地址' = $target; '解析为' = $norm
            }
        }
    }
}

# ---------- 3. 报告 ----------

Write-Host ""
Write-Host ("=== 检查了 " + $checkedLinks + " 个内部链接 ===")
if ($brokenLinks.Count -eq 0) {
    Write-Host "全部通过，没有死链。" -ForegroundColor Green
} else {
    Write-Host ("发现 " + $brokenLinks.Count + " 个死链：") -ForegroundColor Red
    # 不用 Format-Table，避免被外部工具截断成 FormatStartData 之类对象
    foreach ($b in $brokenLinks) {
        Write-Host ("  文件: " + $b.文件)
        Write-Host ("  链接: [" + $b.链接文字 + "](" + $b.地址 + ")")
        Write-Host ("  解析为: " + $b.解析为 + "   —— 该地址既不是任何页面的 permalink，也没有对应文件")
        Write-Host ""
    }
}

# ---------- 4. 尾斜杠风格一致性 ----------

Write-Host "=== 尾斜杠风格 ==="
$noSlash = @($pages.Keys | Where-Object { -not $_.EndsWith('/') -and $_ -ne '/' })
if ($noSlash.Count -gt 0) {
    Write-Host "以下 permalink 没有结尾斜杠，与其他页面不一致，容易导致链接写错：" -ForegroundColor Yellow
    foreach ($k in $noSlash) { Write-Host "  $k  ->  $($pages[$k])" }
} else {
    Write-Host "所有 permalink 都带结尾斜杠，风格统一。" -ForegroundColor Green
}

if ($brokenLinks.Count -eq 0) { exit 0 } else { exit 1 }
