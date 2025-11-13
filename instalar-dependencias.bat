@echo off
echo ========================================
echo   Instalando dependencias del proyecto
echo ========================================
echo.

echo Agregando Node.js al PATH...
set PATH=%PATH%;C:\Program Files\nodejs\

echo.
echo Verificando Node.js...
node --version
npm --version

echo.
echo Instalando dependencias (esto puede tardar varios minutos)...
echo.

cd /d "%~dp0"
npm install

echo.
echo ========================================
echo   Instalacion completada
echo ========================================
echo.
echo Para iniciar el proyecto, ejecuta:
echo   npm start
echo.
pause





