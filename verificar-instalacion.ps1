# Script de Verificación de Instalación - PIOS Pizza App
# Ejecuta este script para verificar qué necesitas instalar

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verificación de Instalación" -ForegroundColor Cyan
Write-Host "  PIOS Pizza App" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$todoInstalado = $true

# Verificar Node.js
Write-Host "1. Verificando Node.js..." -ForegroundColor Yellow
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCheck) {
    $nodeVersion = node --version
    Write-Host "   ✓ Node.js instalado: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "   ✗ Node.js NO está instalado" -ForegroundColor Red
    Write-Host "     → Descarga desde: https://nodejs.org/" -ForegroundColor Yellow
    $todoInstalado = $false
}

Write-Host ""

# Verificar npm
Write-Host "2. Verificando npm..." -ForegroundColor Yellow
$npmCheck = Get-Command npm -ErrorAction SilentlyContinue
if ($npmCheck) {
    $npmVersion = npm --version
    Write-Host "   ✓ npm instalado: v$npmVersion" -ForegroundColor Green
} else {
    Write-Host "   ✗ npm NO está instalado" -ForegroundColor Red
    Write-Host "     → npm viene con Node.js, reinstala Node.js" -ForegroundColor Yellow
    $todoInstalado = $false
}

Write-Host ""

# Verificar si node_modules existe
Write-Host "3. Verificando dependencias del proyecto..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   ✓ Dependencias instaladas (carpeta node_modules existe)" -ForegroundColor Green
} else {
    Write-Host "   ✗ Dependencias NO instaladas" -ForegroundColor Red
    Write-Host "     → Ejecuta: npm install" -ForegroundColor Yellow
    $todoInstalado = $false
}

Write-Host ""

# Verificar Expo CLI
Write-Host "4. Verificando Expo CLI..." -ForegroundColor Yellow
$expoCheck = Get-Command expo -ErrorAction SilentlyContinue
if ($expoCheck) {
    $expoVersion = expo --version
    Write-Host "   ✓ Expo CLI instalado globalmente: v$expoVersion" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Expo CLI no instalado globalmente (pero puedes usar npx)" -ForegroundColor Yellow
    Write-Host "     → No es necesario instalarlo, npx lo descargará automáticamente" -ForegroundColor Gray
}

Write-Host ""

# Verificar archivo de configuración de Supabase
Write-Host "5. Verificando configuración de Supabase..." -ForegroundColor Yellow
if (Test-Path "scripts\lib\supabase.ts") {
    Write-Host "   ✓ Archivo de configuración de Supabase encontrado" -ForegroundColor Green
} else {
    Write-Host "   ✗ Archivo de configuración de Supabase NO encontrado" -ForegroundColor Red
    Write-Host "     → Verifica que el archivo scripts/lib/supabase.ts exista" -ForegroundColor Yellow
    $todoInstalado = $false
}

Write-Host ""

# Resumen
Write-Host "========================================" -ForegroundColor Cyan
if ($todoInstalado) {
    Write-Host "  ✓ ¡Todo está listo!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Para iniciar el proyecto, ejecuta:" -ForegroundColor Cyan
    Write-Host "    npm start" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "  ⚠ Hay elementos pendientes de instalar" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Sigue estos pasos:" -ForegroundColor Cyan
    Write-Host "  1. Instala Node.js desde: https://nodejs.org/" -ForegroundColor White
    Write-Host "  2. Reinicia VS Code" -ForegroundColor White
    Write-Host "  3. Ejecuta: npm install" -ForegroundColor White
    Write-Host "  4. Ejecuta: npm start" -ForegroundColor White
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan

