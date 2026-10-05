$API_BASE = "http://localhost:5000"
$TIMESTAMP = (Get-Date).ToFileTime()
$EMAIL = "debug_admin_$TIMESTAMP@example.com"
$PASSWORD = "securepassword123"

try {
    $user = Invoke-RestMethod "$API_BASE/api/auth/register" -Method Post -Body (@{
        email = $EMAIL; password = $PASSWORD; name = "Debug"; role = "hirer"
    } | ConvertTo-Json) -ContentType "application/json"
    $token = $user.session.access_token

    $payments = Invoke-RestMethod "$API_BASE/api/payments" -Headers @{ Authorization = "Bearer $token" }
    
    # OUTPUT JSON
    $payments | Select-Object -Last 5 | ConvertTo-Json -Depth 2

} catch { Write-Host $_ }
