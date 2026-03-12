# Test Blaster Webhook - Simple Version
# Run: powershell -File test-blaster-simple.ps1 -Secret "your-secret"

param(
    [string]$Url = "https://misrad-ai.com/api/webhooks/blaster",
    [string]$Secret = "test-secret"
)

Write-Host "Testing Blaster Webhook..."
Write-Host "URL: $Url"
Write-Host "Secret: $($Secret.Substring(0, [Math]::Min(10, $Secret.Length)))..."

$payload = @{
    phone = "972559296626"
    name = "Test User"
    business = "Test Company"
    message = "Test message from PowerShell"
    rule_id = "1"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "x-webhook-secret" = $Secret
}

try {
    $response = Invoke-RestMethod -Uri "$Url`?type=lead" -Method POST -Headers $headers -Body $payload
    Write-Host "SUCCESS! Lead ID: $($response.leadId)" -ForegroundColor Green
    exit 0
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
