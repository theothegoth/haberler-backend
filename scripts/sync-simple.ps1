# Simple script to sync server files to local, then push to GitHub

$SERVER = "root@159.223.232.158"
$SERVER_DIR = "/root/haber-backend"
$LOCAL_DIR = "C:\Users\pc\haber-backend"

Write-Host "=== Syncing Server Code to GitHub ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Copy specific files from server to local
Write-Host "Step 1: Copying files from server..." -ForegroundColor Yellow

# List of files to sync (add more as needed)
$filesToSync = @(
    "config/cache.js",
    "controllers/articleVideoController.js",
    "controllers/articleImageController.js",
    "controllers/newsController.js",
    "middleware/cacheMiddleware.js"
)

foreach ($file in $filesToSync) {
    Write-Host "  Copying $file..." -ForegroundColor Gray
    $serverPath = "${SERVER_DIR}/${file}"
    $localPath = Join-Path $LOCAL_DIR $file
    
    # Create directory if it doesn't exist
    $localDir = Split-Path $localPath -Parent
    if (-not (Test-Path $localDir)) {
        New-Item -ItemType Directory -Path $localDir -Force | Out-Null
    }
    
    # Copy file using scp
    scp "${SERVER}:${serverPath}" $localPath 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "    ✗ Failed to copy $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Step 2: Checking git status..." -ForegroundColor Yellow
Set-Location $LOCAL_DIR
git status --short

Write-Host ""
$response = Read-Host "Do you want to commit and push these changes? (y/n)"
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "Step 3: Committing changes..." -ForegroundColor Yellow
    git add -A
    git commit -m "Sync server changes - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    
    Write-Host "Step 4: Pushing to GitHub..." -ForegroundColor Yellow
    git push origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "=== SUCCESS! ===" -ForegroundColor Green
        Write-Host "Server code has been synced to GitHub" -ForegroundColor Green
    } else {
        Write-Host "Error pushing to GitHub" -ForegroundColor Red
    }
} else {
    Write-Host "Skipped commit/push. Files are updated locally." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Cyan

