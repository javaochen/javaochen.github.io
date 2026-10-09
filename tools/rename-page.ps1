# 改名脚本 —— 一次改完所有需要同步的地方
#
# 为什么需要它：改一个页面的文件名，牵动的地方分散在多个文件里。
#   待改文件内的：文件名、H1 标题、front matter 的 title、permalink（4 处）
#   其他文件里的：链接文字、链接地址（2 处）
#   外加：NOTES.md 的目录树
# 手改必漏。这个脚本一次改完，最后自动跑链接校验。
#
# 用法（这台机器只有 Windows PowerShell 5.1，没有 pwsh 7；
#       LocalMachine 执行策略是 RemoteSigned，本文件无签名，必须用 Bypass）：
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\rename-page.ps1 -Old bio -New biography
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\rename-page.ps1 -Old bio -New biography -NewTitle "教育背景"
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\rename-page.ps1 -Old bio -New biography -DryRun
#
# 改名后新 permalink 按全站约定自动设为 <目录>/<新名>/，例如 /about/biography/
#
# 注意：脚本只改文件，不提交、不推送。改完你自己看一遍再决定要不要 push。

param(
    [Parameter(Mandatory = $true)][string]$Old,
    [Parameter(Mandatory = $true)][string]$New,
    [string]$NewTitle,
    [string]$NewLinkText,
    [string]$SiteRoot,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

# $PSScriptRoot 在某些调用方式下会是空值，用 $MyInvocation 兜底
if (-not $SiteRoot) {
    $scriptDir = $PSScriptRoot
    if (-not $scriptDir) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
    $SiteRoot = Split-Path -Parent $scriptDir
}
$SiteRoot = (Resolve-Path $SiteRoot).Path

if ($Old -eq $New) { Write-Host "新旧文件名相同，无需改名。" -ForegroundColor Yellow; exit 0 }

# ---------- 工具 ----------

# 读文本，同时记住 BOM 与尾换行状态，供写回时还原
function Read-Utf8Text {
    param([string]$Path)
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    $hasBom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
    $text = [System.IO.File]::ReadAllText($Path, (New-Object System.Text.UTF8Encoding($hasBom)))
    if ($text.EndsWith("`r`n")) { $end = 'crlf' } elseif ($text.EndsWith("`n")) { $end = 'lf' } else { $end = 'none' }
    if ($text.Contains("`r`n")) { $nl = 'crlf' } else { $nl = 'lf' }
    return New-Object PSObject -Property @{ Text = $text; HasBom = $hasBom; EndNewline = $end; Newline = $nl }
}

# 写文本，还原 BOM 与尾换行状态。
# 不带 BOM 很关键：带 BOM 会让 front matter 失效，因为 Jekyll 要求第一个字符就是 '-'
# 还原尾换行同样关键：否则每次改名都会在文件末尾多/少一个换行，污染 diff
function Write-Utf8Text {
    param([string]$Path, [string]$Text, [bool]$HasBom, [string]$EndNewline)
    $body = $Text.TrimEnd("`r", "`n")
    if ($EndNewline -eq 'crlf')     { $body = $body + "`r`n" }
    elseif ($EndNewline -eq 'lf')   { $body = $body + "`n" }
    [System.IO.File]::WriteAllText($Path, $body, (New-Object System.Text.UTF8Encoding($HasBom)))
}

function Get-Rel {
    param([string]$Full)
    return $Full.Replace("$SiteRoot\", '')
}

# 抓取当前所有 .md 文件。改名后路径会变，必须重新调用，不能用旧列表。
function Get-MdFiles {
    return @(Get-ChildItem -Recurse -Force $SiteRoot -Filter *.md |
        Where-Object { $_.FullName -notmatch '\\\.git\\' })
}

# ---------- 0. 前置检查：不能有未提交的改动被覆盖 ----------

$dirty = git -C $SiteRoot -c core.quotepath=false status --porcelain 2>$null
if ($dirty) {
    Write-Host "工作区有未提交的改动，改名会把它一起搅进来，先提交或暂存：" -ForegroundColor Yellow
    $dirty | ForEach-Object { Write-Host "  $_" }
    if (-not $DryRun) { Write-Host "`n（加 -DryRun 可以只看计划不改文件）" -ForegroundColor Yellow; exit 1 }
}

# ---------- 1. 定位目标文件 ----------

$allMd = Get-MdFiles

$oldFile = $allMd | Where-Object { $_.BaseName -eq $Old } | Select-Object -First 1
if (-not $oldFile) {
    Write-Host "找不到文件名为 '$Old' 的 .md 文件。现存的页面有：" -ForegroundColor Red
    $allMd | ForEach-Object { Write-Host ("  " + $_.BaseName + "   (" + (Get-Rel $_.FullName) + ")") }
    exit 1
}

$relOld = Get-Rel $oldFile.FullName
$dirFull = Split-Path -Parent $oldFile.FullName
$relDir = Get-Rel $dirFull
if ($relDir -eq $relOld) { $relDir = '' }

$newFile = Join-Path $dirFull "$New.md"
if (Test-Path $newFile) { Write-Host "目标文件已存在：$New.md，先处理它。" -ForegroundColor Red; exit 1 }

# ---------- 2. 读出当前事实 ----------

$info = Read-Utf8Text $oldFile.FullName
$content = $info.Text

$oldPermalink = $null
$m = [regex]::Match($content, '(?m)^permalink:\s*(\S+)\s*$')
if ($m.Success) { $oldPermalink = $m.Groups[1].Value }

$oldTitle = $null
$m = [regex]::Match($content, '(?m)^title:\s*(.+?)\s*$')
if ($m.Success) { $oldTitle = $m.Groups[1].Value }

$oldH1 = $null
$m = [regex]::Match($content, '(?m)^#\s+(.+?)\s*$')
if ($m.Success) { $oldH1 = $m.Groups[1].Value }

# 新 permalink 按全站约定：<目录>/<新名>/
$newPermalink = if ($relDir) { "/$relDir/$New/" } else { "/$New/" }

# 链接文字默认沿用旧 H1（没有 H1 就用旧 title）
$linkTextOld = if ($oldH1) { $oldH1 } elseif ($oldTitle) { $oldTitle } else { $Old }
$linkTextNew = if ($NewLinkText) { $NewLinkText } else { $linkTextOld }

Write-Host "=== 改名计划 ==="
Write-Host ("  文件      {0}  ->  {1}" -f $relOld, (Get-Rel $newFile))
Write-Host ("  permalink {0}  ->  {1}" -f $(if ($oldPermalink) { $oldPermalink } else { '（无）' }), $newPermalink)
Write-Host ("  title     {0}  ->  {1}" -f $(if ($oldTitle) { $oldTitle } else { '（无）' }), $(if ($NewTitle) { $NewTitle } else { '（不变）' }))
Write-Host ("  H1        {0}  ->  {1}" -f $(if ($oldH1) { $oldH1 } else { '（无）' }), $(if ($NewTitle) { $NewTitle } else { '（不变）' }))
Write-Host ("  链接文字  {0}  ->  {1}" -f $linkTextOld, $linkTextNew)
Write-Host ""

if ($DryRun) { Write-Host "（-DryRun：只显示计划，未改任何文件）" -ForegroundColor Cyan; exit 0 }

# ---------- 3. 执行改名（用 git mv 保留历史） ----------

git -C $SiteRoot mv $relOld ("$relDir/$New.md".TrimStart('/')) 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Move-Item $oldFile.FullName $newFile
    Write-Host "注意：git mv 失败，已用普通移动代替，git 可能记成「删一个加一个」。" -ForegroundColor Yellow
}

# ---------- 4. 改该文件内部 ----------
# 注意：改名后原路径已失效，这里读的是 $newFile

$info = Read-Utf8Text $newFile
$content = $info.Text

if ($oldPermalink) {
    $content = $content -replace [regex]::Escape("permalink: $oldPermalink"), "permalink: $newPermalink"
} else {
    # 原本没有 permalink，补一行进去
    $content = [regex]::Replace($content, '(?m)^(title:.*)$', "`$1`npermalink: $newPermalink", 1)
}

if ($NewTitle) {
    if ($oldTitle) { $content = $content -replace [regex]::Escape("title: $oldTitle"), "title: $NewTitle" }
    if ($oldH1)    { $content = $content -replace [regex]::Escape("# $oldH1"), "# $NewTitle" }
}

Write-Utf8Text $newFile $content $info.HasBom $info.EndNewline
$innerParts = '文件名、permalink'
if ($NewTitle) { $innerParts = $innerParts + '、title、H1' }
Write-Host ("已改：" + $New + ".md（" + $innerParts + "）")

# ---------- 5. 改其他文件里指向它的链接 ----------
# 关键：必须重新抓文件列表。改名前缓存的列表里存的是旧路径，
# 拿它去读文件会直接报「找不到文件」。

$allMd = Get-MdFiles

$targets = @($oldPermalink, "/$relDir/$Old/", "/$relDir/$Old") |
    Where-Object { $_ } | Select-Object -Unique

$changedFiles = @()
foreach ($f in $allMd) {
    if ($f.FullName -eq $newFile) { continue }
    $rel = Get-Rel $f.FullName
    $fi = Read-Utf8Text $f.FullName
    $text = $fi.Text
    $orig = $text

    foreach ($t in $targets) {
        $newT = $newPermalink
        # 地址前有 ( 或 /，后面必须是 / 或 ) 或 # 或行尾
        $pattern = '(?<=\()' + [regex]::Escape($t) + '(?=(/|\)|#|$))'
        $text = [regex]::Replace($text, $pattern, { param($mm) $newT })

        # 链接文字同步（只在该链接指向旧地址时替换）
        if ($linkTextNew -ne $linkTextOld) {
            $labPattern = '\[(' + [regex]::Escape($linkTextOld) + ')\]\((' + [regex]::Escape($t) + '(?:/|\)|#))'
            $text = [regex]::Replace($text, $labPattern, {
                param($mm)
                '[' + $linkTextNew + '](' + $newT.TrimEnd('/') + $mm.Groups[2].Value.Substring($mm.Groups[2].Value.Length - 1)
            })
        }
    }

    if ($text -ne $orig) {
        Write-Utf8Text $f.FullName $text $fi.HasBom $fi.EndNewline
        $changedFiles += $rel
        Write-Host "已改：$rel（指向它的链接）"
    }
}

# ---------- 6. 更新 NOTES.md 的目录树 ----------

$notes = Join-Path $SiteRoot 'NOTES.md'
if (Test-Path $notes) {
    $ni = Read-Utf8Text $notes
    $t = $ni.Text
    $orig = $t
    $escOld = [regex]::Escape($Old)
    $treePattern = '(?m)^(\s*[│├└─\s]*)' + $escOld + '\.md(\s)'
    $treeReplace = '${1}' + $New + '.md${2}'
    $t = [regex]::Replace($t, $treePattern, $treeReplace)
    if ($t -ne $orig) { Write-Utf8Text $notes $t $ni.HasBom $ni.EndNewline; Write-Host "已改：NOTES.md（目录树）" }
}

# ---------- 7. 自动校验 ----------

Write-Host ""
Write-Host "=== 自动校验 ==="
& "$PSScriptRoot\check-links.ps1" -SiteRoot $SiteRoot 2>&1 |
    Select-String -NotMatch "RequestsDependencyWarning|urllib3|charset_normalizer|warnings.warn|^\s*\+|CategoryInfo|FullyQualified"

Write-Host ""
Write-Host "=== 收尾 ==="
$joined = ($changedFiles -join ', ')
Write-Host ("改动的文件：" + $joined)
Write-Host "还没提交。确认无误后自己 push。"
