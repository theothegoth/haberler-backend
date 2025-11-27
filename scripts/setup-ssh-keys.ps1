# Script to set up SSH keys for passwordless access to server
# Run this once, then you won't need to enter password anymore

$SERVER = "root@159.223.232.158"

Write-Host "=== Setting Up SSH Keys for Passwordless Access ===" -ForegroundColor Cyan
Write-Host ""

# Check if SSH key already exists
$sshKeyPath = "$env:USERPROFILE\.ssh\id_rsa"
if (Test-Path $sshKeyPath) {
    Write-Host "SSH key already exists at: $sshKeyPath" -ForegroundColor Yellow
    $response = Read-Host "Do you want to use existing key? (y/n)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        Write-Host "Generating new SSH key..." -ForegroundColor Yellow
        ssh-keygen -t rsa -b 4096 -f $sshKeyPath -N '""'
    }
} else {
    Write-Host "Generating new SSH key..." -ForegroundColor Yellow
    ssh-keygen -t rsa -b 4096 -f $sshKeyPath -N '""'
}

Write-Host ""
Write-Host "Copying public key to server..." -ForegroundColor Yellow
Write-Host "You'll be prompted for the server password ONE LAST TIME" -ForegroundColor Cyan
Write-Host ""

# Copy public key to server
$pubKey = Get-Content "$sshKeyPath.pub"
ssh $SERVER "mkdir -p ~/.ssh && echo '$pubKey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== SUCCESS! ===" -ForegroundColor Green
    Write-Host "SSH keys are now set up. You won't need to enter password anymore!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Test the connection:" -ForegroundColor Cyan
    Write-Host "ssh $SERVER 'echo Connection successful!'" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Error setting up SSH keys" -ForegroundColor Red
    Write-Host "You may need to manually copy the key" -ForegroundColor Yellow
}

