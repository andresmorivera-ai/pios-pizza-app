@echo off
echo ========================================
echo   Agregando Node.js al PATH
echo ========================================
echo.

echo Node.js encontrado en: C:\Program Files\nodejs\
echo.

echo Agregando Node.js al PATH de esta sesion...
set PATH=%PATH%;C:\Program Files\nodejs\

echo.
echo Verificando instalacion...
echo.

"C:\Program Files\nodejs\node.exe" --version
"C:\Program Files\nodejs\npm.cmd" --version

echo.
echo ========================================
echo   Instalando dependencias del proyecto
echo ========================================
echo.

cd /d "%~dp0"
"C:\Program Files\nodejs\npm.cmd" install

echo.
echo ========================================
echo   Resumen
echo ========================================
echo.
echo [OK] Node.js agregado al PATH temporalmente
echo.
echo IMPORTANTE: Para que funcione permanentemente:
echo.
echo Opcion 1: Reiniciar VS Code (a veces funciona)
echo Opcion 2: Agregar Node.js al PATH del sistema:
echo   1. Presiona Windows + R
echo   2. Escribe: sysdm.cpl
echo   3. Ve a la pestaña "Opciones avanzadas"
echo   4. Click en "Variables de entorno"
echo   5. En "Variables del sistema", busca "Path"
echo   6. Click en "Editar"
echo   7. Click en "Nuevo"
echo   8. Agrega: C:\Program Files\nodejs\
echo   9. Click en "Aceptar" en todas las ventanas
echo   10. Reinicia VS Code
echo.
pause





