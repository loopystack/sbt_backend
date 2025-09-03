# PowerShell script to remove all comments from TypeScript/JavaScript files

$fileExtensions = @("*.ts", "*.tsx", "*.js", "*.jsx")
$excludeDirectories = @("node_modules", "dist", ".git")

function Remove-Comments {
    param($filePath)
    
    Write-Host "Processing: $filePath"
    
    $content = Get-Content $filePath -Raw
    
    # Remove single-line comments (// comments)
    $content = $content -replace '(?m)^\s*//.*$', ''
    
    # Remove inline comments but preserve URLs and other important // sequences
    $content = $content -replace '(?<!:)//(?![/\s]*[a-zA-Z0-9]).*$', ''
    
    # Remove multi-line comments /* ... */
    $content = $content -replace '(?s)/\*.*?\*/', ''
    
    # Remove empty lines that were left after comment removal
    $content = $content -replace '(?m)^\s*\r?\n', ''
    
    # Clean up multiple consecutive empty lines
    $content = $content -replace '(\r?\n){3,}', "`n`n"
    
    Set-Content $filePath $content -NoNewline
}

# Get all TypeScript/JavaScript files excluding certain directories
foreach ($extension in $fileExtensions) {
    $files = Get-ChildItem -Path "src" -Filter $extension -Recurse | Where-Object {
        $exclude = $false
        foreach ($excludeDir in $excludeDirectories) {
            if ($_.FullName -like "*$excludeDir*") {
                $exclude = $true
                break
            }
        }
        return !$exclude
    }
    
    foreach ($file in $files) {
        Remove-Comments -filePath $file.FullName
    }
}

# Also process config files in root
$configFiles = @("eslint.config.js", "tailwind.config.cjs", "vite.config.ts", "tsconfig.json", "tsconfig.app.json", "tsconfig.node.json")
foreach ($configFile in $configFiles) {
    if (Test-Path $configFile) {
        Remove-Comments -filePath $configFile
    }
}

Write-Host "Comment removal completed!"
