# tools/validate.ps1

$projectRoot = Get-Location
$issueCount = 0

function Report-Issue($message) {
    global:
    $issueCount += 1
    Write-Error $message
}

function Read-Json($filePath) {
    if (!(Test-Path $filePath)) {
        Report-Issue "Missing JSON file: $filePath"
        return $null
    }
    try {
        return Get-Content -Raw -Path $filePath -Encoding utf8 | ConvertFrom-Json
    } catch {
        Report-Issue "Invalid JSON: $filePath ($($_.Exception.Message))"
        return $null
    }
}

function Check-Imports($dir) {
    $files = Get-ChildItem -Path $dir -Filter *.js -Recurse
    foreach ($file in $files) {
        $content = Get-Content -Raw -Path $file.FullName -Encoding utf8
        # Match imports: import ... from '...'
        $matches = [regex]::Matches($content, 'import\s+(?:.*?\s+from\s+)?[''"](.*?)[''"]')
        foreach ($m in $matches) {
            $importPath = $m.Groups[1].Value
            if ($importPath.StartsWith('.')) {
                $resolvedPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($file.DirectoryName, $importPath))
                # Add JS extension if missing, since ES modules must resolve exact filenames
                if (!(Test-Path $resolvedPath) -and !(Test-Path "$resolvedPath.js")) {
                    Report-Issue "Missing import: $importPath in $($file.FullName)"
                }
            }
        }
    }
}

function Check-WorldRegistry {
    $worldsDir = Join-Path $projectRoot "Worlds"
    $registryPath = Join-Path $worldsDir "WorldList.json"
    $registry = Read-Json $registryPath
    if ($null -eq $registry) {
        Report-Issue "Worlds/WorldList.json must be an array of world folder names."
        return
    }

    $seenWorlds = @{}
    foreach ($worldName in $registry) {
        if ([string]::IsNullOrWhiteSpace($worldName)) {
            Report-Issue "World registry entry must be a non-empty string"
            continue
        }
        if ($seenWorlds.Contains($worldName)) {
            Report-Issue "Duplicate world registry entry: $worldName"
        }
        $seenWorlds[$worldName] = $true

        $worldDir = Join-Path $worldsDir $worldName
        $worldJsonPath = Join-Path $worldDir "world.json"
        if (!(Test-Path $worldJsonPath)) {
            Report-Issue "Missing world.json for registered world: $worldName"
            continue
        }

        $world = Read-Json $worldJsonPath
        if ($null -eq $world) { continue }

        foreach ($field in @('id', 'title', 'description')) {
            if (!$world.$field) {
                Report-Issue "World '$worldName' is missing required field: $field"
            }
        }

        foreach ($field in @('coverImage', 'logo', 'theme', 'lore')) {
            if ($world.$field) {
                $assetPath = Join-Path $worldDir $world.$field
                if (!(Test-Path $assetPath)) {
                    Report-Issue "World '$worldName' references missing $($field): $($world.$field)"
                }
            }
        }

        $bots = @()
        if ($world.bots) { $bots += $world.bots }
        if ($world.featuredBots) { $bots += $world.featuredBots }
        $bots = $bots | Select-Object -Unique

        foreach ($botId in $bots) {
            $botJsonPath = Join-Path $worldDir "characters/$botId/data/$botId.json"
            if (!(Test-Path $botJsonPath)) {
                Report-Issue "World '$worldName' references missing bot JSON: $botId"
                continue
            }

            $bot = Read-Json $botJsonPath
            if ($null -eq $bot) { continue }

            foreach ($field in @('id', 'name')) {
                if (!$bot.$field) {
                    Report-Issue "Bot '$botId' in '$worldName' is missing required field: $field"
                }
            }

            foreach ($field in @('cardImage', 'avatar', 'sprite')) {
                if ($bot.$field) {
                    $assetPath = Join-Path $worldDir "characters/$botId/$($bot.$field)"
                    if (!(Test-Path $assetPath)) {
                        Report-Issue "Bot '$botId' references missing $($field): $($bot.$field)"
                    }
                }
            }
        }
    }
}

function Check-ToolsRegistry {
    $toolsPath = Join-Path $projectRoot "data/tools.json"
    $tools = Read-Json $toolsPath
    if ($null -eq $tools) { return }
    if (!$tools.tools) {
        Report-Issue "data/tools.json must contain a tools array."
        return
    }

    foreach ($tool in $tools.tools) {
        foreach ($field in @('id', 'name', 'link', 'intro')) {
            if (!$tool.$field) {
                Report-Issue "Tool entry is missing required field: $field"
            }
        }
        if ($tool.image) {
            $imgPath = Join-Path $projectRoot $tool.image
            if (!(Test-Path $imgPath)) {
                Report-Issue "Tool '$($tool.id)' references missing image: $($tool.image)"
            }
        }
    }
}

function Check-PreloadedHTML {
    $worldsDir = Join-Path $projectRoot "Worlds"
    $registryPath = Join-Path $worldsDir "WorldList.json"
    $registry = Read-Json $registryPath
    if ($null -eq $registry) { return }

    foreach ($worldName in $registry) {
        $worldPath = Join-Path $worldsDir $worldName
        $worldJsonPath = Join-Path $worldPath "world.json"
        if (!(Test-Path $worldJsonPath)) { continue }
        $worldMeta = Read-Json $worldJsonPath
        if ($null -eq $worldMeta) { continue }

        # A. Check world HTML page
        $htmlPath = Join-Path $projectRoot "$($worldName.ToLower()).html"
        if (!(Test-Path $htmlPath)) {
            Report-Issue "Missing preloaded HTML file for world '$worldName': expected $($worldName.ToLower()).html in root directory."
            continue
        }

        $htmlContent = Get-Content -Raw -Path $htmlPath -Encoding utf8
        if ($htmlContent.Contains('<!-- PRELOADED_DATA_PLACEHOLDER -->')) {
            Report-Issue "Preloaded HTML for world '$worldName' is not compiled: contains PRELOADED_DATA_PLACEHOLDER."
        }
        if (!$htmlContent.Contains('id="preloaded-world-data"')) {
            Report-Issue "Preloaded HTML for world '$worldName' is missing preloaded JSON data block."
        }
        if (!$htmlContent.Contains('id="preloaded-world-jsonld"')) {
            Report-Issue "Preloaded HTML for world '$worldName' is missing JSON-LD metadata block."
        }

        # B. Check bot HTML pages
        $botIds = @()
        if ($worldMeta.bots) { $botIds += $worldMeta.bots }
        if ($worldMeta.featuredBots) { $botIds += $worldMeta.featuredBots }
        $botIds = $botIds | Select-Object -Unique

        foreach ($botId in $botIds) {
            $botHtmlPath = Join-Path $projectRoot "bot-$($botId.ToLower()).html"
            if (!(Test-Path $botHtmlPath)) {
                Report-Issue "Missing preloaded HTML file for bot '$botId': expected bot-$($botId.ToLower()).html in root directory."
                continue
            }

            $botHtmlContent = Get-Content -Raw -Path $botHtmlPath -Encoding utf8
            if ($botHtmlContent.Contains('<!-- PRELOADED_DATA_PLACEHOLDER -->')) {
                Report-Issue "Preloaded HTML for bot '$botId' is not compiled: contains PRELOADED_DATA_PLACEHOLDER."
            }
            if (!$botHtmlContent.Contains('id="preloaded-world-data"')) {
                Report-Issue "Preloaded HTML for bot '$botId' is missing preloaded JSON data block."
            }
            if (!$botHtmlContent.Contains('id="preloaded-world-jsonld"')) {
                Report-Issue "Preloaded HTML for bot '$botId' is missing JSON-LD metadata block."
            }
        }
    }
}

Check-Imports (Join-Path $projectRoot "js")
Check-WorldRegistry
Check-ToolsRegistry
Check-PreloadedHTML

if ($issueCount -gt 0) {
    Write-Error "Validation failed with $issueCount issue(s)."
    exit 1
}

Write-Host "Validation passed successfully!"
exit 0
