# 🔧 Solución: Node.js instalado pero no funciona

## ✅ Problema Identificado

Node.js **SÍ está instalado** (versión 24.11.0) en:
```
C:\Program Files\nodejs\
```

Pero **NO está en el PATH** del sistema, por eso los comandos `node` y `npm` no funcionan.

---

## 🚀 Solución Rápida (Temporal)

### Opción 1: Usar el script automático

Ejecuta en la terminal de VS Code (CMD):

```bash
agregar-nodejs-path.bat
```

Este script:
- Agregará Node.js al PATH temporalmente
- Instalará las dependencias del proyecto automáticamente

### Opción 2: Usar la ruta completa

Puedes usar Node.js directamente con la ruta completa:

```bash
"C:\Program Files\nodejs\npm.cmd" install
```

---

## 🔧 Solución Permanente: Agregar Node.js al PATH

### Método 1: Usando la interfaz gráfica (Recomendado)

1. **Presiona `Windows + R`**
2. **Escribe:** `sysdm.cpl` y presiona Enter
3. **Ve a la pestaña "Opciones avanzadas"**
4. **Click en "Variables de entorno"**
5. **En "Variables del sistema"**, busca **"Path"** y haz click en **"Editar"**
6. **Click en "Nuevo"**
7. **Agrega:** `C:\Program Files\nodejs\`
8. **Click en "Aceptar"** en todas las ventanas
9. **Cierra y reinicia VS Code completamente**

### Método 2: Usando PowerShell (Como Administrador)

1. Abre **PowerShell como Administrador**
2. Ejecuta:

```powershell
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\nodejs\", [EnvironmentVariableTarget]::Machine)
```

3. **Reinicia VS Code**

### Método 3: Reinstalar Node.js

1. Ve a: https://nodejs.org/
2. Descarga la versión LTS
3. Durante la instalación, **asegúrate de marcar "Add to PATH"**
4. Completa la instalación
5. **Reinicia VS Code**

---

## ✅ Verificar que Funciona

Después de agregar Node.js al PATH, abre una **nueva terminal** en VS Code y ejecuta:

```bash
node --version
npm --version
```

Deberías ver:
```
v24.11.0
10.9.2
```

---

## 📦 Instalar Dependencias del Proyecto

Una vez que Node.js funcione, ejecuta:

```bash
npm install
```

Esto instalará todas las dependencias del proyecto.

---

## 🚀 Iniciar el Proyecto

Después de instalar las dependencias:

```bash
npm start
```

---

## ⚠️ Nota Importante

Si después de agregar Node.js al PATH aún no funciona:

1. **Cierra VS Code completamente** (no solo la ventana, cierra todo)
2. **Abre VS Code de nuevo**
3. **Abre una nueva terminal** (Terminal → Nueva Terminal)
4. **Selecciona CMD** como terminal (no PowerShell)
5. Prueba de nuevo: `node --version`

---

## 🎯 Resumen de Pasos

1. ✅ Node.js está instalado (v24.11.0)
2. ⚠️ Falta agregarlo al PATH
3. 🔧 Ejecuta `agregar-nodejs-path.bat` para solución temporal
4. 🔧 O agrega Node.js al PATH permanentemente (ver arriba)
5. ✅ Reinicia VS Code
6. ✅ Ejecuta `npm install`
7. ✅ Ejecuta `npm start`





