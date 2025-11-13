@echo off
echo ========================================
echo   Diagnostico de Node.js
echo ========================================
echo.

echo 1. Verificando si Node.js esta instalado...
echo.

if exist "C:\Program Files\nodejs\node.exe" (
    echo    [OK] Node.js encontrado en: C:\Program Files\nodejs\
    "C:\Program Files\nodejs\node.exe" --version
) else if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
    echo    [OK] Node.js encontrado en: %LOCALAPPDATA%\Programs\nodejs\
    "%LOCALAPPDATA%\Programs\nodejs\node.exe" --version
) else (
    echo    [ERROR] Node.js NO encontrado en ubicaciones comunes
)

echo.
echo 2. Verificando comandos disponibles...
echo.

where node >nul 2>&1
if %errorlevel% == 0 (
    echo    [OK] Comando 'node' disponible
    node --version
) else (
    echo    [ERROR] Comando 'node' NO disponible
)

where npm >nul 2>&1
if %errorlevel% == 0 (
    echo    [OK] Comando 'npm' disponible
    npm --version
) else (
    echo    [ERROR] Comando 'npm' NO disponible
)

echo.
echo ========================================
echo   Resumen
echo ========================================
echo.

where node >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Node.js esta instalado y configurado correctamente
    echo.
    echo Para instalar las dependencias, ejecuta:
    echo   npm install
) else (
    echo [ERROR] Node.js NO esta instalado o no esta en el PATH
    echo.
    echo Pasos a seguir:
    echo 1. Descarga Node.js desde: https://nodejs.org/
    echo 2. Instala la version LTS
    echo 3. Durante la instalacion, asegurate de marcar "Add to PATH"
    echo 4. Reinicia VS Code completamente
)

echo.
pause





