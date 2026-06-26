# tools/generate_preloads.ps1

$projectRoot = Get-Location
$templatePath = Join-Path $projectRoot "index.html"
$worldsDir = Join-Path $projectRoot "Worlds"
$registryPath = Join-Path $worldsDir "WorldList.json"

if (!(Test-Path $templatePath)) {
    Write-Error "Missing template index.html at $templatePath"
    exit 1
}

if (!(Test-Path $registryPath)) {
    Write-Error "Missing WorldList.json at $registryPath"
    exit 1
}

$templateHtml = Get-Content -Raw -Path $templatePath -Encoding utf8
$worlds = Get-Content -Raw -Path $registryPath -Encoding utf8 | ConvertFrom-Json

# Helper to escape script tags
function Escape-ScriptTags($str) {
    if (!$str) { return "" }
    return $str -replace '</script>', '<\/script>'
}

# Helper to extract accent color from style.css
function Get-AccentColor($worldRefPath, $theme) {
    if (!$theme) { return @{ accentColor = $null; accentColorRgb = $null } }
    $cssPath = Join-Path $projectRoot (Join-Path $worldRefPath $theme)
    if (!(Test-Path $cssPath)) { return @{ accentColor = $null; accentColorRgb = $null } }

    try {
        $cssText = Get-Content -Raw -Path $cssPath -Encoding utf8
        $accentColor = $null
        $accentColorRgb = $null

        if ($cssText -match '--(?:primary-)?accent\s*:\s*([^;/\n]+)') {
            $accentColor = $Matches[1].Trim()
        }

        if ($cssText -match '--(?:primary-)?accent-rgb\s*:\s*([^;/\n]+)') {
            $accentColorRgb = $Matches[1].Trim()
        } elseif ($accentColor -and $accentColor.StartsWith('#')) {
            $hex = $accentColor.Replace('#', '')
            $r = $null
            $g = $null
            $b = $null
            if ($hex.Length -eq 3) {
                $r = [System.Convert]::ToInt32($hex[0] + $hex[0], 16)
                $g = [System.Convert]::ToInt32($hex[1] + $hex[1], 16)
                $b = [System.Convert]::ToInt32($hex[2] + $hex[2], 16)
            } elseif ($hex.Length -eq 6) {
                $r = [System.Convert]::ToInt32($hex.Substring(0, 2), 16)
                $g = [System.Convert]::ToInt32($hex.Substring(2, 2), 16)
                $b = [System.Convert]::ToInt32($hex.Substring(4, 2), 16)
            }
            if ($r -ne $null -and $g -ne $null -and $b -ne $null) {
                $accentColorRgb = "$r, $g, $b"
            }
        }
        return @{ accentColor = $accentColor; accentColorRgb = $accentColorRgb }
    } catch {
        return @{ accentColor = $null; accentColorRgb = $null }
    }
}

foreach ($worldFolder in $worlds) {
    $worldRefPath = "Worlds/$worldFolder"
    $worldPath = Join-Path $worldsDir $worldFolder
    $worldJsonPath = Join-Path $worldPath "world.json"
    if (!(Test-Path $worldJsonPath)) { continue }

    Write-Host "Processing preloads for world: $worldFolder"
    
    $worldMetaJson = Get-Content -Raw -Path $worldJsonPath -Encoding utf8
    $worldMeta = $worldMetaJson | ConvertFrom-Json
    $worldMeta | Add-Member -MemberType NoteProperty -Name "path" -Value $worldRefPath -Force

    $accentInfo = Get-AccentColor $worldRefPath $worldMeta.theme
    if ($accentInfo.accentColor) {
        $worldMeta | Add-Member -MemberType NoteProperty -Name "accentColor" -Value $accentInfo.accentColor -Force
    }
    if ($accentInfo.accentColorRgb) {
        $worldMeta | Add-Member -MemberType NoteProperty -Name "accentColorRgb" -Value $accentInfo.accentColorRgb -Force
    }

    $botIds = @()
    if ($worldMeta.bots) { $botIds += $worldMeta.bots }
    if ($worldMeta.featuredBots) { $botIds += $worldMeta.featuredBots }
    $botIds = $botIds | Select-Object -Unique

    $bots = @()
    $markdownFiles = @()

    # 1. World Lore Markdown
    if ($worldMeta.lore) {
        $worldLorePath = Join-Path $worldPath $worldMeta.lore
        if (Test-Path $worldLorePath) {
            $markdown = Get-Content -Raw -Path $worldLorePath -Encoding utf8
            $markdownFiles += [PSCustomObject]@{
                path = "$worldRefPath/$($worldMeta.lore)"
                content = $markdown
            }
        }
    }

    # 2. Characters
    foreach ($botId in $botIds) {
        $botDir = Join-Path $worldPath "characters/$botId"
        $botJsonPath = Join-Path $botDir "data/$botId.json"
        if (!(Test-Path $botJsonPath)) {
            Write-Warning "Registered bot JSON not found: $botJsonPath"
            continue
        }

        $botData = Get-Content -Raw -Path $botJsonPath -Encoding utf8 | ConvertFrom-Json
        
        $botData | Add-Member -MemberType NoteProperty -Name "worldId" -Value $worldMeta.id -Force
        $botData | Add-Member -MemberType NoteProperty -Name "worldTitle" -Value $worldMeta.title -Force
        $botData | Add-Member -MemberType NoteProperty -Name "worldAuthor" -Value $worldMeta.author -Force
        $botData | Add-Member -MemberType NoteProperty -Name "worldAccent" -Value $worldMeta.accentColor -Force
        $botData | Add-Member -MemberType NoteProperty -Name "worldAccentRgb" -Value $worldMeta.accentColorRgb -Force

        $cardImage = $null
        if ($botData.cardImage) { $cardImage = "$worldRefPath/characters/$botId/$($botData.cardImage)" }
        $botData | Add-Member -MemberType NoteProperty -Name "cardImage" -Value $cardImage -Force

        $avatar = $null
        if ($botData.avatar) { $avatar = "$worldRefPath/characters/$botId/$($botData.avatar)" }
        $botData | Add-Member -MemberType NoteProperty -Name "avatar" -Value $avatar -Force

        $sprite = $null
        if ($botData.sprite) { $sprite = "$worldRefPath/characters/$botId/$($botData.sprite)" }
        $botData | Add-Member -MemberType NoteProperty -Name "sprite" -Value $sprite -Force

        $originalLore = $botData.lore
        $originalScenario = $botData.scenario

        $lore = $null
        if ($originalLore) { $lore = "characters/$botId/$originalLore" }
        $botData | Add-Member -MemberType NoteProperty -Name "lore" -Value $lore -Force

        $scenario = $null
        if ($originalScenario) { $scenario = "characters/$botId/$originalScenario" }
        $botData | Add-Member -MemberType NoteProperty -Name "scenario" -Value $scenario -Force

        $bots += $botData

        # Read bot lore markdown
        if ($originalLore) {
            $botLorePath = Join-Path $botDir $originalLore
            if (Test-Path $botLorePath) {
                $markdown = Get-Content -Raw -Path $botLorePath -Encoding utf8
                $markdownFiles += [PSCustomObject]@{
                    path = "$worldRefPath/characters/$botId/$originalLore"
                    content = $markdown
                }
            }
        }

        # Read bot scenario markdown
        if ($originalScenario) {
            $botScenarioPath = Join-Path $botDir $originalScenario
            if (Test-Path $botScenarioPath) {
                $markdown = Get-Content -Raw -Path $botScenarioPath -Encoding utf8
                $markdownFiles += [PSCustomObject]@{
                    path = "$worldRefPath/characters/$botId/$originalScenario"
                    content = $markdown
                }
            }
        }
    }

    # Construct Preloaded World Data JSON
    $preloadedWorldData = [Ordered]@{
        worldId = $worldMeta.id
        worldConfig = $worldMeta
        bots = $bots
    }
    $preloadedJsonStr = ConvertTo-Json -InputObject $preloadedWorldData -Depth 100

    # Compile Markdown script tags
    $markdownInject = ""
    foreach ($file in $markdownFiles) {
        $safeId = 'preloaded-markdown-' + ($file.path -replace '[^a-zA-Z0-9_-]', '-')
        $markdownInject += "  <script type=""text/markdown"" id=""$safeId"" data-path=""$($file.path)"">`n"
        $markdownInject += "$(Escape-ScriptTags $file.content)`n"
        $markdownInject += "  </script>`n"
    }

    # Generate hidden sitemap links
    $sitemapHtml = "`n    <nav>`n"
    $sitemapHtml += "      <a href=""index.html"">Nexus Core</a>`n"
    $sitemapHtml += "      <a href=""$($worldMeta.id).html"">$($worldMeta.title) Chronicles</a>`n"
    foreach ($b in $bots) {
        $sitemapHtml += "      <a href=""bot-$($b.id).html"">$($b.name) Profile</a>`n"
    }
    $sitemapHtml += "    </nav>`n"

    # Helper function to compile and write output HTML
    function Compile-HtmlFile($filename, $title, $description, $isBotPage) {
        $injectHtml = "`n  <!-- Embedded World Metadata & Lore Content -->`n"
        $injectHtml += "  <script type=""application/json"" id=""preloaded-world-data"">`n"
        $injectHtml += "  $(Escape-ScriptTags $preloadedJsonStr)`n"
        $injectHtml += "  </script>`n"

        $jsonLdData = $null
        if ($isBotPage) {
            $jsonLdData = [Ordered]@{
                "@context" = "https://schema.org"
                "@type" = "Person"
                name = $title.Split(' ')[0]
                description = $description
                memberOf = [Ordered]@{
                    "@type" = "CreativeWork"
                    name = $worldMeta.title
                }
            }
        } else {
            $genreArr = @()
            if ($worldMeta.genres) { $genreArr = $worldMeta.genres }
            
            $charArr = @()
            foreach ($b in $bots) {
                $charArr += [Ordered]@{
                    "@type" = "Person"
                    name = $b.name
                    description = $b.description
                }
            }

            $jsonLdData = [Ordered]@{
                "@context" = "https://schema.org"
                "@type" = "CreativeWork"
                name = $worldMeta.title
                description = $worldMeta.description
                genre = $genreArr
                author = $null
            }
            if ($worldMeta.author) {
                $jsonLdData.author = [Ordered]@{
                    "@type" = "Person"
                    name = $worldMeta.author
                }
            }
            $jsonLdData | Add-Member -MemberType NoteProperty -Name "character" -Value $charArr -Force
        }
        $jsonLdStr = ConvertTo-Json -InputObject $jsonLdData -Depth 100

        $injectHtml += "  <script type=""application/ld+json"" id=""preloaded-world-jsonld"">`n"
        $injectHtml += "  $(Escape-ScriptTags $jsonLdStr)`n"
        $injectHtml += "  </script>`n"
        $injectHtml += $markdownInject

        $resHtml = $templateHtml.Replace('<!-- PRELOADED_DATA_PLACEHOLDER -->', $injectHtml.Trim())
        $resHtml = $resHtml.Replace('<!-- SEO_LINKS_PLACEHOLDER -->', $sitemapHtml.Trim())

        # Update Title
        $resHtml = $resHtml -replace '<title>[^<]*</title>', "<title>$title</title>"

        # Update Meta Description
        $escapedDesc = $description.Replace('"', '&quot;')
        $descMeta = "<meta name=""description"" content=""$escapedDesc"">"
        if ($resHtml -match '<meta\s+name="description"\s+content="[^"]*"') {
            $resHtml = $resHtml -replace '<meta\s+name="description"\s+content="[^"]*"', $descMeta
        } else {
            $resHtml = $resHtml -replace '</head>', "  $descMeta`n</head>"
        }

        $outputPath = Join-Path $projectRoot $filename
        [System.IO.File]::WriteAllText($outputPath, $resHtml, [System.Text.Encoding]::UTF8)
        Write-Host "Generated preloaded static file: $filename"
    }

    # A. Generate World HTML file
    $worldTitle = "$($worldMeta.title) - World Nexus"
    $worldDesc = $worldMeta.description
    Compile-HtmlFile "$($worldMeta.id).html" $worldTitle $worldDesc $false

    # B. Generate Bot HTML files
    foreach ($bot in $bots) {
        $botTitle = "$($bot.name) - $($worldMeta.title) - World Nexus"
        $botDesc = $bot.description
        if (!$botDesc) { $botDesc = "Read historical chronicles and lore about $($bot.name) in $($worldMeta.title)." }
        Compile-HtmlFile "bot-$($bot.id).html" $botTitle $botDesc $true
    }
}

Write-Host "Static preloads generation complete."
