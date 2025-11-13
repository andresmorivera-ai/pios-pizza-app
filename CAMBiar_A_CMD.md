# 🔧 Cómo Cambiar a CMD en VS Code (Solución al Problema de PowerShell)

## ⚠️ Problema

PowerShell está bloqueando la ejecución de scripts npm porque la política de ejecución está deshabilitada.

## ✅ Solución: Usar CMD en lugar de PowerShell

### Método 1: Cambiar Terminal en VS Code (Recomendado)

1. **Abre VS Code**
2. **Abre una terminal** (Terminal → Nueva Terminal o `Ctrl + Ñ`)
3. **Haz click en el menú desplegable** (▼) que está en la esquina superior derecha de la terminal, junto al símbolo **+**
4. **Selecciona "Command Prompt"** o **"CMD"**
5. **Ejecuta tus comandos npm normalmente:**

```bash
npm install
npm start
```

### Método 2: Configurar CMD como Terminal Predeterminada

1. **Abre VS Code**
2. **Presiona `Ctrl + ,`** (abre Configuración)
3. **Busca:** `terminal.integrated.defaultProfile.windows`
4. **Selecciona:** `Command Prompt` o `cmd`
5. **Cierra y reabre VS Code**

### Método 3: Usar el Script .bat Directamente

Ejecuta el script que creamos:

```bash
instalar-usando-cmd.bat
```

Este script:
- Usa CMD automáticamente
- Agrega Node.js al PATH
- Instala las dependencias

---

## 🚀 Después de Cambiar a CMD

Una vez que estés usando CMD, ejecuta:

```bash
npm install
```

Esto debería funcionar sin problemas.

---

## 🔧 Alternativa: Cambiar Política de PowerShell (Si prefieres usar PowerShell)

Si prefieres seguir usando PowerShell, puedes cambiar la política:

1. **Abre PowerShell como Administrador** (click derecho → Ejecutar como administrador)
2. **Ejecuta:**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

3. **Confirma con `S` (Sí)**
4. **Cierra y reabre VS Code**

---

## ✅ Verificar que Funciona

Después de cambiar a CMD, verifica:

```bash
node --version
npm --version
```

Deberías ver las versiones sin errores.

---

## 📝 Nota Importante

**CMD no tiene el problema de políticas de ejecución** que tiene PowerShell, por eso es más fácil usarlo para desarrollo con Node.js.

---

## 🎯 Resumen

1. ✅ Cambia la terminal a **CMD** en VS Code
2. ✅ Ejecuta `npm install`
3. ✅ Ejecuta `npm start`
4. ✅ ¡Listo!





