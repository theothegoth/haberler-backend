# Script to sync server code to local, then push to GitHub
# This ensures server and GitHub have matching code

$SERVER_IP = "159.223.232.158"
$SERVER_USER = "root"
$BACKEND_DIR = "/root/haber-backend"
$LOCAL_DIR = "C:\Users\pc\haber-backend"

Write-Host "=== Syncing Server Code to GitHub ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check what files are different on server
Write-Host "Step 1: Checking server git status..." -ForegroundColor Yellow
$serverStatus = ssh "${SERVER_USER}@${SERVER_IP}" "cd ${BACKEND_DIR} && git status --short"

if ($serverStatus) {
    Write-Host "Server has uncommitted changes:" -ForegroundColor Yellow
    Write-Host $serverStatus
    Write-Host ""
    
    # Step 2: Create a backup branch on server
    Write-Host "Step 2: Creating backup branch on server..." -ForegroundColor Yellow
    ssh "${SERVER_USER}@${SERVER_IP}" "cd ${BACKEND_DIR} && git checkout -b server-backup-$(date +%Y%m%d_%H%M%S) 2>&1"
    
    # Step 3: Commit changes on server
    Write-Host "Step 3: Committing changes on server..." -ForegroundColor Yellow
    ssh "${SERVER_USER}@${SERVER_IP}" "cd ${BACKEND_DIR} && git add -A && git commit -m 'Server changes sync $(date +%Y%m%d_%H%M%S)' 2>&1"
    
    # Step 4: Create a patch file from server
    Write-Host "Step 4: Creating patch file from server..." -ForegroundColor Yellow
    $patchFile = "$env:TEMP\server-changes-$(Get-Date -Format 'yyyyMMdd_HHmmss').patch"
    ssh "${SERVER_USER}@${SERVER_IP}" "cd ${BACKEND_DIR} && git format-patch -1 HEAD --stdout" | Out-File -FilePath $patchFile -Encoding utf8
    
    # Step 5: Apply patch to local
    Write-Host "Step 5: Applying patch to local repository..." -ForegroundColor Yellow
    Set-Location $LOCAL_DIR
    git apply $patchFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Patch applied successfully!" -ForegroundColor Green
        
        # Step 6: Commit and push to GitHub
        Write-Host "Step 6: Committing and pushing to GitHub..." -ForegroundColor Yellow
        git add -A
        git commit -m "Sync server changes to GitHub"
        git push origin main
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "=== SUCCESS! ===" -ForegroundColor Green
            Write-Host "Server code has been synced to GitHub" -ForegroundColor Green
        } else {
            Write-Host "Error pushing to GitHub" -ForegroundColor Red
        }
    } else {
        Write-Host "Error applying patch. You may need to resolve conflicts manually." -ForegroundColor Red
        Write-Host "Patch file saved at: $patchFile" -ForegroundColor Yellow
    }
    
    # Cleanup
    Remove-Item $patchFile -ErrorAction SilentlyContinue
} else {
    Write-Host "Server has no uncommitted changes. Everything is in sync!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Cyan

