$content = Get-Content -Raw 'js\app.js'
$content = $content -replace "const me = await getCurrentUser\(\);\\\\n            if \(!me\) return null;", "const me = await getCurrentUser();`r`n            if (!me) return null;"
Set-Content -Encoding UTF8 'js\app.js' -Value $content
Write-Host "Done"
