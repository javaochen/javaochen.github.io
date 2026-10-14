# 一次完成：暂存 → 提交 → 推送 → 验证远端
#
# 为什么要放在脚本里而不是 git 别名：
#   别名是一行长字符串，引号嵌套极容易出错；脚本可以分行写、能读、能改。
#
# 用法：
#   powershell -ExecutionPolicy Bypass -File tools\git-sync.ps1 -Message "本次改了什么"
#   powershell -ExecutionPolicy Bypass -File tools\git-sync.ps1 -Message "..." -DryRun   # 只看要做的事
#
# 为什么最后要「验证远端」：
#   这台机器到 GitHub 的网络不稳，曾多次出现「命令报错但实际推送成功」的情况。
#   只看退出码会误判，所以必须回头问远端：你到底收到没有。

param(
    [Parameter(Mandatory = $true)][string]$Message,
    [string]$SiteRoot,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

if (-not $SiteRoot) {
    $scriptDir = $PSScriptRoot
    if (-not $scriptDir) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
    $SiteRoot = Split-Path -Parent $scriptDir
}
$SiteRoot = (Resolve-Path $SiteRoot).Path

function Show([string]$Text, [string]$Color = 'Gray') {
    Write-Host $Text -ForegroundColor $Color
}

# ---------- 0. 有东西可提交吗 ----------

$pending = git -C $SiteRoot -c core.quotepath=false status --porcelain
if (-not $pending) {
    Show "工作区没有改动，无需提交。" 'Yellow'
    exit 0
}

Show "=== 待提交的改动 ===" 'Cyan'
$pending | ForEach-Object { Write-Host ("  " + $_) }

if ($DryRun) {
    Show "`n（-DryRun：只显示，不执行）" 'Cyan'
    exit 0
}

# ---------- 1. 暂存 ----------

git -C $SiteRoot add -A
Show "`n[1/4] 已暂存" 'Green'

# ---------- 2. 提交 ----------

git -C $SiteRoot commit -m $Message | Out-Null
if ($LASTEXITCODE -ne 0) { Show "提交失败" 'Red'; exit 1 }
$local = (git -C $SiteRoot rev-parse HEAD).Trim()
Show ("[2/4] 已提交 " + $local.Substring(0, 7)) 'Green'

# ---------- 3. 推送 ----------
#
# 这里刻意不捕获 git push 的输出。原因：
#   ① git 把推送到 stderr，PowerShell 5.1 下赋值捕获会把它当异常抛出；
#   ② 捕获也没意义 —— 这台机器网络不稳，push 的输出和真实结果常常不一致。
# 真正的判据在第 4 步：回头问远端到底收到没有。

Show "[3/4] 推送中..." 'Green'
git -C $SiteRoot push 2>&1 | Out-Null

# ---------- 4. 验证远端（唯一可信的判据） ----------

Show "[4/4] 验证远端..." 'Green'
git -C $SiteRoot fetch -q origin 2>&1 | Out-Null
$remote = (git -C $SiteRoot rev-parse origin/main).Trim()

if ($local -eq $remote) {
    Show ("`n完成。远端已同步到 " + $local.Substring(0, 7)) 'Green'
    Show "Pages 大约 30-60 秒后重新构建，地址 https://javaochen.github.io/"
    exit 0
} else {
    Show ("`n未同步！本地 " + $local.Substring(0, 7) + "  远端 " + $remote.Substring(0, 7)) 'Red'
    Show "改动已提交在本地，没丢。网络恢复后重跑本脚本即可（或用 git push）。" 'Yellow'
    exit 1
}
