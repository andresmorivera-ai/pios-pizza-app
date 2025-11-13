@echo off
echo ========================================
echo   Instalando dependencias del proyecto
echo   Usando CMD (sin problemas de PowerShell)
echo ========================================
echo.

echo Agregando Node.js al PATH...
set PATH=%PATH%;C:\Program Files\nodejs\

echo.
echo Verificando Node.js...
node --version
npm --version

echo.
echo Cambiando al directorio del proyecto...
cd /d "%~dp0"

echo.
echo Instalando dependencias (esto puede tardar varios minutos)...
echo Por favor espera...
echo.

call npm install

if %errorlevel% == 0 (
    echo.
    echo ========================================
    echo   [OK] Instalacion completada exitosamente
    echo ========================================
    echo.
    echo Para iniciar el proyecto, ejecuta:
    echo   npm start
    echo.
    echo NOTA: Usa CMD (no PowerShell) para ejecutar comandos npm
    echo.
) else (
    echo.
    echo ========================================
    echo   [ERROR] Hubo un problema durante la instalacion
    echo ========================================
    echo.
    echo Por favor revisa los mensajes de error arriba
    echo.
)

pause





