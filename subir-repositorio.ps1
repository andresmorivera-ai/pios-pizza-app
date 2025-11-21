# Script para subir el proyecto al repositorio de GitHub
# Repositorio: https://github.com/andresmorivera-ai/pios-pizza-app

Write-Host "=== Subiendo proyecto a GitHub ===" -ForegroundColor Green

# Cambiar al directorio del proyecto
Set-Location "C:\Users\junta\Documents\GitHub\pios-pizza-app\pios-pizza-app"

# Verificar si git está disponible
try {
    $gitVersion = git --version
    Write-Host "Git encontrado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Git no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host "Por favor instala Git desde https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

# Verificar si ya existe un repositorio git
if (Test-Path ".git") {
    Write-Host "Repositorio git ya existe" -ForegroundColor Yellow
} else {
    Write-Host "Inicializando repositorio git..." -ForegroundColor Cyan
    git init
}

# Verificar el remote
$remoteUrl = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Configurando remote origin..." -ForegroundColor Cyan
    git remote add origin https://github.com/andresmorivera-ai/pios-pizza-app.git
} else {
    Write-Host "Remote ya configurado: $remoteUrl" -ForegroundColor Yellow
    # Actualizar el remote por si acaso
    git remote set-url origin https://github.com/andresmorivera-ai/pios-pizza-app.git
}

# Agregar todos los archivos
Write-Host "Agregando archivos al staging area..." -ForegroundColor Cyan
git add .

# Verificar el estado
Write-Host "`nEstado del repositorio:" -ForegroundColor Cyan
git status

# Hacer commit
Write-Host "`nCreando commit..." -ForegroundColor Cyan
$commitMessage = Read-Host "Ingresa el mensaje del commit (o presiona Enter para usar mensaje por defecto)"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "Actualización del proyecto Pio's Pizza App"
}
git commit -m $commitMessage

# Hacer pull primero para sincronizar (por si hay cambios en el remoto)
Write-Host "`nSincronizando con el repositorio remoto..." -ForegroundColor Cyan
git pull origin main --allow-unrelated-histories 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Intentando con branch master..." -ForegroundColor Yellow
    git pull origin master --allow-unrelated-histories 2>&1 | Out-Null
}

# Hacer push
Write-Host "`nSubiendo cambios al repositorio..." -ForegroundColor Cyan
git push -u origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Intentando con branch master..." -ForegroundColor Yellow
    git push -u origin master
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n¡Éxito! El proyecto ha sido subido al repositorio." -ForegroundColor Green
    Write-Host "Repositorio: https://github.com/andresmorivera-ai/pios-pizza-app" -ForegroundColor Cyan
} else {
    Write-Host "`nHubo un error al subir los cambios. Verifica tus credenciales de GitHub." -ForegroundColor Red
}




