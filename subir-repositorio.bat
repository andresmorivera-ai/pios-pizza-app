@echo off
REM Script para subir el proyecto al repositorio de GitHub
REM Repositorio: https://github.com/andresmorivera-ai/pios-pizza-app

echo === Subiendo proyecto a GitHub ===

REM Cambiar al directorio del proyecto
cd /d "C:\Users\junta\Documents\GitHub\pios-pizza-app\pios-pizza-app"

REM Verificar si git está disponible
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git no está instalado o no está en el PATH
    echo Por favor instala Git desde https://git-scm.com/download/win
    pause
    exit /b 1
)

REM Verificar si ya existe un repositorio git
if exist ".git" (
    echo Repositorio git ya existe
) else (
    echo Inicializando repositorio git...
    git init
)

REM Verificar el remote
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo Configurando remote origin...
    git remote add origin https://github.com/andresmorivera-ai/pios-pizza-app.git
) else (
    echo Remote ya configurado, actualizando...
    git remote set-url origin https://github.com/andresmorivera-ai/pios-pizza-app.git
)

REM Agregar todos los archivos
echo.
echo Agregando archivos al staging area...
git add .

REM Verificar el estado
echo.
echo Estado del repositorio:
git status

REM Hacer commit
echo.
echo Creando commit...
set /p commitMessage="Ingresa el mensaje del commit (o presiona Enter para usar mensaje por defecto): "
if "%commitMessage%"=="" set commitMessage=Actualización del proyecto Pio's Pizza App
git commit -m "%commitMessage%"

REM Hacer pull primero para sincronizar
echo.
echo Sincronizando con el repositorio remoto...
git pull origin main --allow-unrelated-histories >nul 2>&1
if errorlevel 1 (
    echo Intentando con branch master...
    git pull origin master --allow-unrelated-histories >nul 2>&1
)

REM Hacer push
echo.
echo Subiendo cambios al repositorio...
git push -u origin main
if errorlevel 1 (
    echo Intentando con branch master...
    git push -u origin master
)

if %errorlevel% equ 0 (
    echo.
    echo ¡Éxito! El proyecto ha sido subido al repositorio.
    echo Repositorio: https://github.com/andresmorivera-ai/pios-pizza-app
) else (
    echo.
    echo Hubo un error al subir los cambios. Verifica tus credenciales de GitHub.
)

pause

