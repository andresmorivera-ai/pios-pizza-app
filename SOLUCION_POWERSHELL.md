# 🔧 Solución: Error de Política de Ejecución de PowerShell

Este error ocurre porque PowerShell tiene deshabilitada la ejecución de scripts por seguridad.

## ✅ Solución 1: Cambiar la Política de Ejecución (Recomendado)

### Opción A: Solo para la sesión actual (Temporal)

Abre PowerShell como **Administrador** y ejecuta:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```

Luego ejecuta:
```bash
npm install
```

### Opción B: Para el usuario actual (Permanente)

Abre PowerShell como **Administrador** y ejecuta:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Luego ejecuta:
```bash
npm install
```

### Opción C: Bypass solo para este comando

Ejecuta en PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -Command "npm install"
```

---

## ✅ Solución 2: Usar CMD en lugar de PowerShell

1. En VS Code, abre una nueva terminal
2. En la esquina superior derecha de la terminal, haz clic en el **▼** (flecha hacia abajo)
3. Selecciona **Command Prompt** o **CMD** en lugar de PowerShell
4. Ejecuta:

```bash
npm install
```

---

## ✅ Solución 3: Usar Git Bash (Si lo tienes instalado)

1. En VS Code, abre una nueva terminal
2. Selecciona **Git Bash** como terminal
3. Ejecuta:

```bash
npm install
```

---

## ✅ Solución 4: Ejecutar npm directamente desde CMD

1. Abre **CMD** (Símbolo del sistema) desde el menú de inicio
2. Navega a la carpeta del proyecto:

```bash
cd C:\pios-pizza-app-main\pios-pizza-app-main
```

3. Ejecuta:

```bash
npm install
```

---

## 🔍 Verificar la Política Actual

Para ver qué política tienes actualmente, ejecuta en PowerShell:

```powershell
Get-ExecutionPolicy
```

**Valores posibles:**
- `Restricted` - No permite scripts (tu caso actual)
- `RemoteSigned` - Permite scripts locales y remotos firmados (recomendado)
- `Unrestricted` - Permite todos los scripts (menos seguro)

---

## ⚠️ Nota de Seguridad

La política `RemoteSigned` es segura y recomendada porque:
- Permite ejecutar scripts locales (como npm)
- Requiere que scripts remotos estén firmados digitalmente
- Es la configuración estándar para desarrolladores

---

## 🎯 Solución Rápida (Recomendada)

**La forma más rápida es usar CMD en VS Code:**

1. Abre VS Code
2. Terminal → Nueva Terminal
3. Haz clic en el **▼** junto al símbolo **+** en la terminal
4. Selecciona **Command Prompt**
5. Ejecuta: `npm install`

¡Listo! No necesitas cambiar ninguna política.





