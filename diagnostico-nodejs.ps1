# Script de Diagnóstico de Node.js
# Este script verifica si Node.js está instalado y configurado correctamente

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Diagnóstico de Node.js" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar ubicaciones comunes de Node.js
Write-Host "1. Verificando ubicaciones de instalación..." -ForegroundColor Yellow
Write-Host ""

$ubicaciones = @(
    "C:\Program Files\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
    "$env:ProgramFiles\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe"
)

$nodeEncontrado = $false
foreach ($ubicacion in $ubicaciones) {
    if (Test-Path $ubicacion) {
        Write-Host "   ✓ Node.js encontrado en: $ubicacion" -ForegroundColor Green
        $nodeEncontrado = $true
        
        # Verificar versión
        $version = & $ubicacion --version
        Write-Host "     Versión: $version" -ForegroundColor Gray
        break
    }
}

if (-not $nodeEncontrado) {
    Write-Host "   ✗ Node.js NO encontrado en ubicaciones comunes" -ForegroundColor Red
}

Write-Host ""

# Verificar PATH
Write-Host "2. Verificando variables de entorno..." -ForegroundColor Yellow
Write-Host ""

$pathActual = $env:PATH
$pathNodejs = $pathActual -split ';' | Where-Object { $_ -like '*nodejs*' }

if ($pathNodejs) {
    Write-Host "   ✓ Node.js encontrado en PATH:" -ForegroundColor Green
    foreach ($path in $pathNodejs) {
        Write-Host "     - $path" -ForegroundColor Gray
    }
} else {
    Write-Host "   ✗ Node.js NO está en el PATH" -ForegroundColor Red
    Write-Host "     → Esto puede causar que 'node' y 'npm' no funcionen" -ForegroundColor Yellow
}

Write-Host ""

# Verificar si node está disponible como comando
Write-Host "3. Verificando comandos disponibles..." -ForegroundColor Yellow
Write-Host ""

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$npmCommand = Get-Command npm -ErrorAction SilentlyContinue

if ($nodeCommand) {
    Write-Host "   ✓ Comando 'node' disponible" -ForegroundColor Green
    Write-Host "     Ubicación: $($nodeCommand.Source)" -ForegroundColor Gray
    $nodeVersion = node --version
    Write-Host "     Versión: $nodeVersion" -ForegroundColor Gray
} else {
    Write-Host "   ✗ Comando 'node' NO disponible" -ForegroundColor Red
}

Write-Host ""

if ($npmCommand) {
    Write-Host "   ✓ Comando 'npm' disponible" -ForegroundColor Green
    Write-Host "     Ubicación: $($npmCommand.Source)" -ForegroundColor Gray
    $npmVersion = npm --version
    Write-Host "     Versión: v$npmVersion" -ForegroundColor Gray
} else {
    Write-Host "   ✗ Comando 'npm' NO disponible" -ForegroundColor Red
}

Write-Host ""

# Resumen y recomendaciones
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Resumen y Recomendaciones" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($nodeEncontrado -and $nodeCommand -and $npmCommand) {
    Write-Host "  ✓ ¡Node.js está instalado y configurado correctamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Si aún tienes problemas, intenta:" -ForegroundColor Yellow
    Write-Host "  1. Cerrar y reabrir VS Code completamente" -ForegroundColor White
    Write-Host "  2. Abrir una nueva terminal" -ForegroundColor White
    Write-Host "  3. Ejecutar: npm install" -ForegroundColor White
} elseif ($nodeEncontrado -and -not $nodeCommand) {
    Write-Host "  ⚠ Node.js está instalado pero NO está en el PATH" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Soluciones:" -ForegroundColor Cyan
    Write-Host "  1. Reinicia VS Code completamente" -ForegroundColor White
    Write-Host "  2. Si no funciona, reinstala Node.js y marca 'Add to PATH'" -ForegroundColor White
    Write-Host "  3. O agrega manualmente Node.js al PATH del sistema" -ForegroundColor White
} else {
    Write-Host "  ✗ Node.js NO está instalado o no se encuentra" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Pasos a seguir:" -ForegroundColor Cyan
    Write-Host "  1. Descarga Node.js desde: https://nodejs.org/" -ForegroundColor White
    Write-Host "  2. Instala la versión LTS (recomendada)" -ForegroundColor White
    Write-Host "  3. Durante la instalación, asegúrate de marcar 'Add to PATH'" -ForegroundColor White
    Write-Host "  4. Reinicia VS Code después de instalar" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan





