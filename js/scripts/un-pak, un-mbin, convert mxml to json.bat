@echo off
setlocal enabledelayedexpansion

:: ========================================================
:: CONFIGURATION SECTION
:: ========================================================

:: Executable to get version from
set "EXE_PATH=F:\SteamLibrary\steamapps\common\No Man's Sky\Binaries\NMS.exe"

:: Directory where .pak files are located
set "GAME_DATA_DIR=F:\SteamLibrary\steamapps\common\No Man's Sky\GAMEDATA\PCBANKS"

:: Directory where PCBANKS-{version} will be created
set "PCBANKS_BASE=F:\Games\No Man's Sky\PCBANKS"

:: HGPAKTool Python script (to process .pak files)
set "PYTHON_SCRIPT=F:/Tools/HGPAKTool/HGPAKTool/hgpaktool.py"

:: .pak files to process (names only)
set "PAK_FILES=NMSARC.MetadataEtc.pak NMSARC.Precache.pak NMSARC.TexUI.pak"

:: Directory where Expeditions-{version} will be created
set "EXPEDITIONS_BASE=F:\Games\No Man's Sky\Projects"

:: MBINCompiler EXE command to run on Expedition subdirectories
set "PROCESS_EXE=F:\Tools\MBINCompiler\MBINCompiler.exe"

:: Mappings: Each index corresponds (subdir, mask, target)
:: ---------------------------------------------------------
::   - SUBDIRS: path under Expeditions
::   - MASKS: file pattern to process
::   - TARGETS: output subpath under PCBANKS directory
:: ---------------------------------------------------------

:: TODO: Fix this so it's more readable and easier to change

set "SUBDIRS=language metadata\gamestate metadata metadata\reality\tables metadata\simulation\missions\tables metadata\simulation\missions\tables metadata\reality\tables metadata\reality\tables metadata\reality\tables metadata\reality\tables metadata\reality\tables metadata\gamestate\playerdata"
set "MASKS=usenglish.MBIN .MBIN .MBIN .MBIN .MBIN .MBIN .MBIN .MBIN .MBIN .MBIN .MBIN .MBIN"
set "TARGETS=language metadata\gamestate\defaultseasonaldata.mbin metadata\idlookuppaths.mbin metadata\reality\tables\rewardtable.mbin metadata\simulation\missions\tables\seasonalmissiontable.mbin metadata\simulation\missions\tables\seasonalbespokemissiontable.mbin metadata\reality\tables\nms_reality_gcproceduraltechnologytable.mbin metadata\reality\tables\nms_reality_gcproducttable.mbin metadata\reality\tables\nms_reality_gcrecipetable.mbin metadata\reality\tables\nms_reality_gcsubstancetable.mbin metadata\reality\tables\nms_reality_gctechnologytable.mbin metadata\gamestate\playerdata\playertitledata.mbin"

:: ========================================================
:: START PROCESS
:: ========================================================

echo Getting version from %EXE_PATH%...

:: Escape backslashes for WMIC (convert \ to \\)
set "WMIC_PATH=%EXE_PATH:\=\\%"

:: Escape single quotes (WMIC chokes on them)
set "WMIC_PATH=%WMIC_PATH:'=\'%"

for /f "tokens=2 delims==" %%a in ('
    wmic datafile where "name='%WMIC_PATH%'" get Version /value ^| find "="
') do set "VERSION=%%a"

if not defined VERSION (
    echo [ERROR] Failed to retrieve version from %EXE_PATH%
    exit /b 1
)

echo Detected version: %VERSION%
set "PCBANKS_DIR=%PCBANKS_BASE%\PCBANKS-%VERSION%"
set "EXPEDITIONS_DIR=%EXPEDITIONS_BASE%\Expeditions-%VERSION%"

echo Creating directories...
mkdir "%PCBANKS_DIR%" 2>nul
mkdir "%EXPEDITIONS_DIR%" 2>nul

:: ========================================================
:: Run Python script on each .pak file
:: ========================================================

set "EXTRACTED_FILE=%PCBANKS_DIR%\EXTRACTED"

if exist "%EXTRACTED_FILE%" (
    echo Extraction already completed previously. Skipping Python step.
) else (
    echo Running Python conversions...

    for %%F in (%PAK_FILES%) do (
        set "PAK_PATH=%GAME_DATA_DIR%\%%F"
        if exist "!PAK_PATH!" (
            echo Processing %%F...
            python "%PYTHON_SCRIPT%" -U "!PAK_PATH!" -O "%PCBANKS_DIR%"
        ) else (
            echo [WARNING] File not found: !PAK_PATH!
        )
    )

    echo Creating extraction marker file...
    type nul > "%EXTRACTED_FILE%"
)

:: ========================================================
:: Run MBINCompiler commands on Expedition subdirectories
:: ========================================================

set "CONVERTED_FILE=%EXPEDITIONS_DIR%\CONVERTED"

if exist "%CONVERTED_FILE%" (
    echo MXML Conversion already completed previously. Skipping MBIN to MXML step.
) else (
    echo Running %PROCESS_EXE% for MBIN to MXML conversion...

    set i=0
    for %%S in (%SUBDIRS%) do (
        set /a i+=1
        call :getItem MASK !i! MASKS
        call :getItem TARGET !i! TARGETS

        set "OUTPUT_DIR=%EXPEDITIONS_DIR%\%%S"
        set "MASK=!MASK!"
        set "SRC_PATH=%PCBANKS_DIR%\!TARGET!"

        if not exist "%~dp0%SRC_DIR%" (
            echo [WARNING] Source directory not found: "%SRC_DIR%"
            goto :continueLoop
        )

        echo.
        echo Processing:
        echo   OUTPUT_DIR: !OUTPUT_DIR!
        echo   Mask:   !MASK!
        echo   SRC_PATH: !SRC_PATH!
        echo -----------------------------------------

        "%PROCESS_EXE%" convert --overwrite --output-dir="!OUTPUT_DIR!" --include="*!MASK!" "!SRC_PATH!"
    )

    echo Creating conversion marker file...
    type nul > "%CONVERTED_FILE%"
    echo done
)

:: ========================================================
:: Convert MXML files to JSON
:: ========================================================
echo Running Node commands...

:: node language_mxmls_to_json.mjs "%EXPEDITIONS_DIR%\language"

:: node defaultseasonaldata_mxml_to_json.mjs "%EXPEDITIONS_DIR%\metadata\gamestate\defaultseasonaldata.MXML"

node other_mxml_to_json.mjs "%EXPEDITIONS_DIR%\metadata\reality\tables\rewardtable.MXML"

:: ========================================================
:: Done
:: ========================================================
echo.
echo =======================================================
echo All tasks completed successfully.
echo PCBANKS output: %PCBANKS_DIR%
echo Expeditions output: %EXPEDITIONS_DIR%
echo =======================================================

pause

exit /b

:: ========================================================
:: Helper function to extract Nth item from a list
:: ========================================================
:getItem
setlocal enabledelayedexpansion
set "INDEX=%2"
set "LIST=%3"
set /a count=0
for %%A in (!%LIST%!) do (
    set /a count+=1
    if !count! equ %INDEX% (
        endlocal & set "%1=%%A" & goto :eof
    )
)
endlocal & set "%1="
goto :eof
