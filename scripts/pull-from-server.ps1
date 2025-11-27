# Script to pull files from server and update local files
# You'll be prompted for the server password when connecting

$SERVER = "root@159.223.232.158"
$SERVER_DIR = "/root/haber-backend"
$LOCAL_DIR = "C:\Users\pc\haber-backend"

Write-Host "=== Pulling Files from Server ===" -ForegroundColor Cyan
Write-Host "You'll be prompted for the server password" -ForegroundColor Yellow
Write-Host ""

# List of files to pull from server
$filesToPull = @(
    "config/cache.js",
    "controllers/articleVideoController.js",
    "controllers/articleImageController.js",
    "controllers/newsController.js",
    "middleware/cacheMiddleware.js"
)

foreach ($file in $filesToPull) {
    Write-Host "Pulling $file..." -ForegroundColor Yellow
    
    $serverPath = "${SERVER_DIR}/${file}"
    $localPath = Join-Path $LOCAL_DIR $file
    
    # Create directory if it doesn't exist
    $localDir = Split-Path $localPath -Parent
    if (-not (Test-Path $localDir)) {
        New-Item -ItemType Directory -Path $localDir -Force | Out-Null
    }
    
    # Copy file using scp (you'll enter password)
    scp "${SERVER}:${serverPath}" $localPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Updated $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Failed to pull $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Done! ===" -ForegroundColor Green
Write-Host "Files have been updated from server" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review the changes: git status" -ForegroundColor White
Write-Host "2. Commit if needed: git add . ; git commit -m 'Sync from server'" -ForegroundColor White
Write-Host "3. Push to GitHub: git push origin main" -ForegroundColor White

