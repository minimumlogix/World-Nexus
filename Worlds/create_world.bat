@echo off
setlocal enabledelayedexpansion

:: =============================================
::   WORLD NEXUS - New World Scaffold Script
:: =============================================

echo.
echo  ============================================
echo   World Nexus - New World Creator
echo  ============================================
echo.

:: =============================================
::   INPUT
:: =============================================

set /p WORLD_ID="Enter world ID (lowercase, no spaces, e.g. my-world): "

if "%WORLD_ID%"=="" (
    echo Error: World ID cannot be empty.
    pause
    exit /b 1
)

set WORLD_DIR=%~dp0%WORLD_ID%

if exist "%WORLD_DIR%" (
    echo Error: World folder "%WORLD_ID%" already exists.
    pause
    exit /b 1
)

set /p WORLD_TITLE="Enter world title (e.g. My World): "
set /p WORLD_AUTHOR="Enter author name: "
set /p WORLD_DESC="Enter short description: "
set /p WORLD_GENRES="Enter genres (comma-separated, e.g. fantasy,action): "

echo.

:: =============================================
::   FOLDER STRUCTURE
:: =============================================

echo Creating folder structure...

mkdir "%WORLD_DIR%"
mkdir "%WORLD_DIR%\images"
mkdir "%WORLD_DIR%\subpages"
mkdir "%WORLD_DIR%\characters"

echo   [OK] Folders created.

:: =============================================
::   PARSE GENRES INTO JSON ARRAY
:: =============================================

set GENRES_JSON=
set GENRE_LIST=%WORLD_GENRES%

:genre_loop
for /f "tokens=1* delims=," %%A in ("%GENRE_LIST%") do (
    set GENRE=%%A
    set GENRE=!GENRE: =!
    if "!GENRES_JSON!"=="" (
        set GENRES_JSON="!GENRE!"
    ) else (
        set GENRES_JSON=!GENRES_JSON!, "!GENRE!"
    )
    set GENRE_LIST=%%B
)
if not "%GENRE_LIST%"=="" goto genre_loop

:: =============================================
::   world.json
:: =============================================

echo Creating world.json...

(
echo {
echo   "id": "%WORLD_ID%",
echo   "title": "%WORLD_TITLE%",
echo   "author": "%WORLD_AUTHOR%",
echo   "colaborators": [
echo     "%WORLD_AUTHOR%"
echo   ],
echo   "description": "%WORLD_DESC%",
echo   "genres": [
echo     %GENRES_JSON%
echo   ],
echo   "coverImage": "images/cover.avif",
echo   "logo": "logo.avif",
echo   "theme": "style.css",
echo   "lore": "lore.md",
echo   "botCount": 0,
echo   "hoverPreview": false,
echo   "hoverImages": [],
echo   "featuredBots": []
echo }
) > "%WORLD_DIR%\world.json"

echo   [OK] world.json

:: =============================================
::   library.json
:: =============================================

echo Creating library.json...

(
echo {
echo   "Example Term": {
echo     "definition": "Replace this with a lore term definition relevant to your world.",
echo     "subpage": "subpages/example-term.md"
echo   }
echo }
) > "%WORLD_DIR%\library.json"

echo   [OK] library.json

:: =============================================
::   lore.md
:: =============================================

echo Creating lore.md...

(
echo # %WORLD_TITLE%
echo.
echo ^> Add your world's lore overview here.
echo.
echo ## Overview
echo.
echo Describe the world setting, atmosphere, and tone.
echo.
echo ## History
echo.
echo Describe key historical events that shaped this world.
echo.
echo ## Geography
echo.
echo Describe the major regions, nations, or locations.
echo.
echo ## Society
echo.
echo Describe social structures, culture, and daily life.
echo.
echo ## Factions
echo.
echo List and describe the major factions or organizations.
echo.
echo ## Secrets
echo.
echo Hidden truths and mysteries of the world.
) > "%WORLD_DIR%\lore.md"

echo   [OK] lore.md

:: =============================================
::   lore.yaml
:: =============================================

echo Creating lore.yaml...

(
echo ## World of %WORLD_TITLE%
echo setting: "Describe the world's core setting and atmosphere."
echo technology: "Describe the level of technology or magic present."
echo daily_life: "Describe what everyday life looks like for citizens."
echo secrets: "Hidden truths, conspiracies, or mysteries."
echo rules: "World laws, social rules, or governing systems."
echo races: "List the major races or species."
echo nations: "List the major nations or regions."
echo factions: "List the major factions or organizations."
echo artifacts: "List notable artifacts or powerful items."
echo arcanes: "List notable powers, abilities, or magic types."
echo villains: "List notable antagonists."
echo anti_heros: "List notable anti-heroes or morally grey characters."
echo corporates: "List major corporations or institutions if applicable."
) > "%WORLD_DIR%\lore.yaml"

echo   [OK] lore.yaml

:: =============================================
::   style.css
:: =============================================

echo Creating style.css...

(
echo /* ===========================
echo    %WORLD_TITLE% - World Theme
echo =========================== */
echo.
echo /* ===========================
echo    CSS Variables
echo =========================== */
echo.
echo :root {
echo   --world-primary:     #6c63ff;
echo   --world-secondary:   #a78bfa;
echo   --world-accent:      #f472b6;
echo   --world-bg:          #0f0e17;
echo   --world-surface:     #1a1825;
echo   --world-text:        #e2e0f0;
echo   --world-text-muted:  #8b89a0;
echo   --world-border:      rgba^(108, 99, 255, 0.25^);
echo   --world-glow:        rgba^(108, 99, 255, 0.4^);
echo }
echo.
echo /* ===========================
echo    World Card
echo =========================== */
echo.
echo /* Add world-specific card overrides here */
echo.
echo /* ===========================
echo    Character Cards
echo =========================== */
echo.
echo /* Add character card styles here */
echo.
echo /* ===========================
echo    Lore Page
echo =========================== */
echo.
echo /* Add lore page styles here */
) > "%WORLD_DIR%\style.css"

echo   [OK] style.css

:: =============================================
::   subpages/example-term.md
:: =============================================

echo Creating example subpage...

(
echo # Example Term
echo.
echo Replace this file with an actual lore entry for a term defined in library.json.
echo.
echo ## Description
echo.
echo Detailed description of this lore term.
echo.
echo ## History
echo.
echo Origins and history of this element in the world.
echo.
echo ## Significance
echo.
echo Why this term matters to the world or its characters.
) > "%WORLD_DIR%\subpages\example-term.md"

echo   [OK] subpages\example-term.md

:: =============================================
::   Placeholder images readme
:: =============================================

(
echo Place the following image files in this folder:
echo.
echo   cover.avif    - World cover image ^(shown on world card^)
echo   preview1.svg  - Optional hover preview image 1
echo   preview2.svg  - Optional hover preview image 2
echo.
echo Images should be in AVIF or SVG format for best performance.
) > "%WORLD_DIR%\images\README.txt"

(
echo Place your world logo here as:
echo.
echo   logo.avif
echo.
echo This logo appears on the world detail page header.
) > "%WORLD_DIR%\logo-README.txt"

echo   [OK] Image placeholder notes created.

:: =============================================
::   DONE
:: =============================================

echo.
echo  ============================================
echo   World "%WORLD_TITLE%" scaffolded!
echo  ============================================
echo.
echo   Location : %WORLD_DIR%
echo.
echo   Next steps:
echo     1. Add your logo as:        %WORLD_ID%\logo.avif
echo     2. Add a cover image as:    %WORLD_ID%\images\cover.avif
echo     3. Fill in lore.md and lore.yaml with your world details
echo     4. Update library.json with your world's key lore terms
echo     5. Add characters using the characters\ folder
echo     6. Add "%WORLD_ID%" to WorldList.json
echo.

pause
