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

# ---------- 3. 推送（先探测线路，再推送） ----------
#
# 这台机器到 GitHub 的线路不稳定，实测出现过两种相反的情况：
#   有时直连完全不通（21 秒超时），走代理 1.6 秒成功；
#   有时代理卡死，直连 3 秒成功。
#
# 关键教训：http.lowSpeedLimit 只对「传输太慢」生效，对「连接建立不起来」
# 无效——卡死的代理会让 git 无限等待。所以必须由外部强制超时。
# 做法：把 git 放进后台作业，等固定秒数，超时就杀掉。
#
# 先探测再推送：每条线路先跑一次只读的 ls-remote，8 秒内返回才算通。
# 这样卡死的线路只浪费 8 秒，而不是整次 push 的时间。

$modes = @(
    @{ Name = '当前配置'; Extra = @() },
    @{ Name = '直连';     Extra = @('-c', 'http.proxy=') },
    @{ Name = '代理 7890'; Extra = @('-c', 'http.proxy=http://127.0.0.1:7890') }
)

# 在后台作业里跑 git，超时返回 $false
function Invoke-GitWithTimeout {
    param([string[]]$GitArgs, [int]$TimeoutSec = 8)

    $job = Start-Job -ScriptBlock {
        param($a)
        $saved = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try {
            $out = & git @a 2>&1
            return [pscustomobject]@{ Code = $LASTEXITCODE; Out = (($out | Out-String).Trim()) }
        } finally {
            $ErrorActionPreference = $saved
        }
    } -ArgumentList (,$GitArgs)

    $finished = Wait-Job $job -Timeout $TimeoutSec
    if (-not $finished) {
        Stop-Job $job -ErrorAction SilentlyContinue
        Remove-Job $job -Force -ErrorAction SilentlyContinue
        return [pscustomobject]@{ TimedOut = $true; Code = -1; Out = '' }
    }
    $r = Receive-Job $job
    Remove-Job $job -Force -ErrorAction SilentlyContinue
    return [pscustomobject]@{ TimedOut = $false; Code = $r.Code; Out = $r.Out }
}

Show "[3/4] 探测可用线路..." 'Green'
$chosen = $null
foreach ($m in $modes) {
    $probe = Invoke-GitWithTimeout (@('-C', $SiteRoot) + $m.Extra + @('ls-remote', 'origin', 'refs/heads/main')) 8
    if (-not $probe.TimedOut -and $probe.Out -match 'refs/heads/main') {
        Show ("  " + $m.Name + " 可用") 'Green'
        $chosen = $m
        break
    }
    Show ("  " + $m.Name + " 不通" + $(if ($probe.TimedOut) { "（超时）" } else { "" })) 'Yellow'
}

if (-not $chosen) {
    Show "没有任何线路可用，改动已提交在本地，稍后重跑即可。" 'Red'
    exit 1
}

Show ("推送中（经由：" + $chosen.Name + "）...") 'Green'
$pushR = Invoke-GitWithTimeout (@('-C', $SiteRoot) + $chosen.Extra + @('push')) 60
$fetchR = Invoke-GitWithTimeout (@('-C', $SiteRoot) + $chosen.Extra + @('fetch', '-q', 'origin')) 30

# 不看 push 的返回码，直接问远端——这是唯一可信的判据
$remote = (git -C $SiteRoot rev-parse origin/main).Trim()

# ---------- 4. 报告结果 ----------

if ($local -eq $remote) {
    Show ("`n完成。远端已同步到 " + $local.Substring(0, 7) + "（经由：" + $chosen.Name + "）") 'Green'
    Show "Pages 大约 30-60 秒后重新构建，地址 https://javaochen.github.io/"
    exit 0
} else {
    Show ("`n未同步！本地 " + $local.Substring(0, 7) + "  远端 " + $remote.Substring(0, 7)) 'Red'
    Show "改动已提交在本地，没丢。网络恢复后重跑本脚本即可（或用 git push）。" 'Yellow'
    exit 1
}
