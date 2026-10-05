<#
.SYNOPSIS
    Workzzy Job Visibility Test
.DESCRIPTION
    Tests if a worker can see job address and images after applying but before acceptance.
#>
$API_BASE = "http://localhost:5000"
$TIMESTAMP = (Get-Date).ToFileTime()
$HIRER_EMAIL = "vis_hirer_$TIMESTAMP@example.com"
$WORKER_EMAIL = "vis_worker_$TIMESTAMP@example.com"
$PASSWORD = "securepassword123"

function Register-User ($email, $name, $role) {
    return Invoke-RestMethod "$API_BASE/api/auth/register" -Method Post -Body (@{
        email = $email; password = $PASSWORD; name = $name; role = $role
    } | ConvertTo-Json) -ContentType "application/json"
}

try {
    Write-Host "1. Registering users..." -ForegroundColor Yellow
    $hirer = Register-User $HIRER_EMAIL "Vis Hirer" "hirer"
    $worker = Register-User $WORKER_EMAIL "Vis Worker" "worker"

    # 2. Hirer Creates Job with Image
    Write-Host "`n2. Creating job..." -ForegroundColor Yellow
    $job = Invoke-RestMethod "$API_BASE/api/jobs" -Method Post -Body (@{
        title = "Vis Test Job"; initialDescription = "Desc"; fullDescription = "Full Desc";
        address = "SECRET_ADDRESS_123"; hirerId = $hirer.user.id; price = 50
    } | ConvertTo-Json) -ContentType "application/json" -Headers @{ Authorization = "Bearer $($hirer.session.access_token)" }

    # Add Image (Public=False)
    Invoke-RestMethod "$API_BASE/api/jobs/$($job.id)/images" -Method Post -Body (@{
        url = "http://secret-image.com"; isPublic = $false; caption = "Secret"
    } | ConvertTo-Json) -ContentType "application/json" -Headers @{ Authorization = "Bearer $($hirer.session.access_token)" } | Out-Null

    # 3. Worker Checks Job (Should be restricted)
    Write-Host "`n3. Worker checks job BEFORE applying..." -ForegroundColor Yellow
    $jobBefore = Invoke-RestMethod "$API_BASE/api/jobs/$($job.id)" -Headers @{ Authorization = "Bearer $($worker.session.access_token)" }
    
    if ($jobBefore.address -match "Restricted") { Write-Host "Confirmed: Address restricted before apply" -ForegroundColor Green }
    else { Write-Host "FAIL: Address visible before apply! ($($jobBefore.address))" -ForegroundColor Red }

    # 4. Worker Applies
    Write-Host "`n4. Worker Applies..." -ForegroundColor Yellow
    $appData = Invoke-RestMethod "$API_BASE/api/applications" -Method Post -Body (@{
        jobId = $job.id; message = "Apply"
    } | ConvertTo-Json) -ContentType "application/json" -Headers @{ Authorization = "Bearer $($worker.session.access_token)" }
    
    # Confirm Application (Deposit) - Assuming this sets state to APPLIED
    Invoke-RestMethod "$API_BASE/api/applications/$($appData.application.id)/confirm" -Method Post -Headers @{ Authorization = "Bearer $($worker.session.access_token)" }

    # 5. Worker Checks Job AGAIN (Goal: Should see address now)
    Write-Host "`n5. Worker checks job AFTER applying..." -ForegroundColor Magenta
    $jobAfter = Invoke-RestMethod "$API_BASE/api/jobs/$($job.id)" -Headers @{ Authorization = "Bearer $($worker.session.access_token)" }
    
    # Check Address
    if ($jobAfter.address -eq "SECRET_ADDRESS_123") {
        Write-Host "SUCCESS: Address visible after application!" -ForegroundColor Green
    } else {
        Write-Host "FAILURE: Address still restricted: $($jobAfter.address)" -ForegroundColor Red
    }

    # Check Images (API call to get images)
    $images = Invoke-RestMethod "$API_BASE/api/jobs/$($job.id)/images" -Headers @{ Authorization = "Bearer $($worker.session.access_token)" }
    if ($images.Count -gt 0) {
        Write-Host "SUCCESS: $($images.Count) images visible!" -ForegroundColor Green
    } else {
        Write-Host "FAILURE: No images visible." -ForegroundColor Red
    }

} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Details: $($reader.ReadToEnd())" -ForegroundColor Red
    }
}
