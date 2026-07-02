@echo off
setlocal enabledelayedexpansion

:: =============================================
::   WORLD NEXUS - New Character Scaffold Script
:: =============================================

echo.
echo  ============================================
echo   World Nexus - New Character Creator
echo  ============================================
echo.

:: =============================================
::   INPUT
:: =============================================

set /p WORLD_ID="Enter world ID (must already exist, e.g. arcanis): "

if "%WORLD_ID%"=="" (
    echo Error: World ID cannot be empty.
    pause
    exit /b 1
)

set WORLD_DIR=%~dp0%WORLD_ID%

if not exist "%WORLD_DIR%" (
    echo Error: World folder "%WORLD_ID%" does not exist.
    pause
    exit /b 1
)

set /p CHAR_ID="Enter character ID (lowercase, hyphenated, e.g. john-doe): "

if "%CHAR_ID%"=="" (
    echo Error: Character ID cannot be empty.
    pause
    exit /b 1
)

set CHAR_DIR=%WORLD_DIR%\characters\%CHAR_ID%

if exist "%CHAR_DIR%" (
    echo Error: Character folder "%CHAR_ID%" already exists in world "%WORLD_ID%".
    pause
    exit /b 1
)

set /p CHAR_NAME="Enter character full name (e.g. John Doe): "
set /p CHAR_DESC="Enter short description: "
set /p CHAR_TAGS="Enter tags (comma-separated, e.g. Hero,Villain,Anti-Hero): "
set /p CHAR_ENDPOINT="Enter Joyland chat URL (or leave blank): "
set /p CHAR_STATUS="Enter status (public/private) [default: public]: "
set /p CHAR_FEATURED="Featured character? (true/false) [default: false]: "
set /p CHAR_META_ROLE="Enter character role/class (e.g. S-Rank Hero): "
set /p CHAR_META_TIMELINE="Enter timeline (e.g. Post-Rift Event Era): "

if "%CHAR_STATUS%"=="" set CHAR_STATUS=public
if "%CHAR_FEATURED%"=="" set CHAR_FEATURED=false
if "%CHAR_ENDPOINT%"=="" set CHAR_ENDPOINT=

echo.

:: =============================================
::   FOLDER STRUCTURE
:: =============================================

echo Creating folder structure...

mkdir "%CHAR_DIR%"
mkdir "%CHAR_DIR%\data"
mkdir "%CHAR_DIR%\images"

echo   [OK] Folders created.

:: =============================================
::   PARSE TAGS INTO JSON ARRAY
:: =============================================

set TAGS_JSON=
set TAG_LIST=%CHAR_TAGS%

:tag_loop
for /f "tokens=1* delims=," %%A in ("%TAG_LIST%") do (
    set TAG=%%A
    set TAG=!TAG: =!
    if "!TAGS_JSON!"=="" (
        set TAGS_JSON="!TAG!"
    ) else (
        set TAGS_JSON=!TAGS_JSON!, "!TAG!"
    )
    set TAG_LIST=%%B
)
if not "%TAG_LIST%"=="" goto tag_loop

:: =============================================
::   data/<char-id>.json
:: =============================================

echo Creating character JSON...

(
echo {
echo   "id": "%CHAR_ID%",
echo   "name": "%CHAR_NAME%",
echo   "world": "%WORLD_ID%",
echo   "description": "%CHAR_DESC%",
echo   "genres": [
echo     %TAGS_JSON%
echo   ],
echo   "cardImage": "images/%CHAR_ID%-avatar.avif",
echo   "avatar": "images/%CHAR_ID%-avatar.avif",
echo   "sprite": "images/%CHAR_ID%-sprite.png",
echo   "lore": "data/%CHAR_ID%-lore.md",
echo   "scenario": "data/%CHAR_ID%-scenario.md",
echo   "chatEndpoint": "%CHAR_ENDPOINT%",
echo   "status": "%CHAR_STATUS%",
echo   "featured": %CHAR_FEATURED%,
echo   "metadata": {
echo     "character": "%CHAR_META_ROLE%",
echo     "timeline": "%CHAR_META_TIMELINE%"
echo   }
echo }
) > "%CHAR_DIR%\data\%CHAR_ID%.json"

echo   [OK] data\%CHAR_ID%.json

:: =============================================
::   data/<char-id>_lore.json
:: =============================================

echo Creating lore entries JSON...

(
echo {
echo   "1": {
echo     "content": "Add a key lore fact about %CHAR_NAME% here. Use {{user}} to reference the player.",
echo     "key": [
echo       "trait",
echo       "keyword"
echo     ]
echo   },
echo   "2": {
echo     "content": "Add another lore fact here.",
echo     "key": [
echo       "keyword"
echo     ]
echo   }
echo }
) > "%CHAR_DIR%\data\%CHAR_ID%_lore.json"

echo   [OK] data\%CHAR_ID%_lore.json

:: =============================================
::   data/<char-id>-lore.md
:: =============================================

echo Creating lore markdown...

(
echo # %CHAR_NAME% - Lore
echo.
echo ^> Character lore for use with AI chat systems. Write in second-person where needed.
echo.
echo ## Background
echo.
echo Describe %CHAR_NAME%'s background, origin, and history here.
echo.
echo ## Personality
echo.
echo Describe their personality, mannerisms, speech patterns, and worldview.
echo.
echo ## Abilities
echo.
echo List and describe their powers, skills, or notable abilities.
echo.
echo ## Relationships
echo.
echo Describe key relationships with other characters or factions.
echo.
echo ## Appearance
echo.
echo Describe their physical appearance, outfit, and notable features.
) > "%CHAR_DIR%\data\%CHAR_ID%-lore.md"

echo   [OK] data\%CHAR_ID%-lore.md

:: =============================================
::   data/<char-id>-scenario.md
:: =============================================

echo Creating scenario markdown...

(
echo # %CHAR_NAME% - Scenario
echo.
echo ^> Opening scenario or system prompt for chat interactions.
echo.
echo ## Setting
echo.
echo Describe the setting and context for interactions with %CHAR_NAME%.
echo.
echo ## Opening
echo.
echo Write the opening message or scene that greets the user.
echo.
echo ## Notes
echo.
echo Any special rules, tone guidelines, or interaction notes.
) > "%CHAR_DIR%\data\%CHAR_ID%-scenario.md"

echo   [OK] data\%CHAR_ID%-scenario.md

:: =============================================
::   images README
:: =============================================

(
echo Place the following image files in this folder:
echo.
echo   %CHAR_ID%-avatar.avif   - Character avatar/card image
echo   %CHAR_ID%-avatar.png    - PNG fallback for avatar
echo   %CHAR_ID%-bgi.avif      - Background image for character page
echo   %CHAR_ID%-sprite.png    - Full-body sprite image
) > "%CHAR_DIR%\images\README.txt"

echo   [OK] Image placeholder notes created.

:: =============================================
::   DONE
:: =============================================

echo.
echo  ============================================
echo   Character "%CHAR_NAME%" scaffolded!
echo  ============================================
echo.
echo   Location : %CHAR_DIR%
echo.
echo   Next steps:
echo     1. Add images to:  characters\%CHAR_ID%\images\
echo     2. Fill in lore:   data\%CHAR_ID%-lore.md
echo     3. Fill in scene:  data\%CHAR_ID%-scenario.md
echo     4. Add lore facts: data\%CHAR_ID%_lore.json
echo     5. Add "%CHAR_ID%" to world.json featuredBots if featured
echo.

pause
