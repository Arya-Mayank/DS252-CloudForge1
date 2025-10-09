# Kill any process using port 5000
Write-Host "🔍 Checking for processes on port 5000..." -ForegroundColor Cyan

$processes = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    Write-Host "🛑 Killing existing processes on port 5000..." -ForegroundColor Yellow
    foreach ($pid in $processes) {
        if ($pid -ne 0) {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "   Killed PID: $pid" -ForegroundColor Red
        }
    }
    Start-Sleep -Seconds 2
}

Write-Host "🚀 Starting backend server..." -ForegroundColor Green
npm run dev

