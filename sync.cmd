@echo off
rem One command: stage -> commit -> push -> verify remote
rem Usage (from repo root):
rem   sync "what changed"        <- real commit
rem   sync "what changed" dry    <- dry run, nothing is committed
setlocal
if "%~1"=="" (
    echo Usage: sync "commit message" [dry]
    exit /b 1
)
set EXTRA=
if /i "%~2"=="dry" set EXTRA=-DryRun
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\git-sync.ps1" -Message "%~1" %EXTRA%