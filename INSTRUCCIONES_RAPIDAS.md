# 🚀 Instrucciones Rápidas - Cambiar a CMD en VS Code

## ⚡ Solución Rápida (2 minutos)

### Paso 1: Cambiar Terminal a CMD

1. En VS Code, **abre una terminal** (Terminal → Nueva Terminal o `Ctrl + Ñ`)

2. **Busca este menú** en la esquina superior derecha de la terminal:
   ```
   [▼]  [+]
   ```

3. **Haz click en el ▼** (flecha hacia abajo)

4. **Selecciona "Command Prompt"** o **"CMD"**

5. **¡Listo!** Ahora estás usando CMD

### Paso 2: Ejecutar Comandos

Ahora puedes ejecutar comandos npm sin problemas:

```bash
npm install
```

```bash
npm start
```

---

## 🎯 ¿Por qué CMD y no PowerShell?

- ✅ CMD no tiene políticas de ejecución restrictivas
- ✅ Funciona directamente con npm
- ✅ No requiere configuración adicional
- ✅ Es más simple para desarrollo

---

## 📸 Ubicación del Menú

```
┌─────────────────────────────────────┐
│ Terminal                            │
├─────────────────────────────────────┤
│                                     │
│  [Aquí aparece tu terminal]         │
│                                     │
│                                     │
└─────────────────────────────────────┘
     ↑
   [▼] [+]
   ↑
Haz click aquí
```

---

## ✅ Verificar que Funciona

Después de cambiar a CMD, ejecuta:

```bash
node --version
npm --version
```

Si ves las versiones sin errores, ¡está funcionando!

---

## 🚀 Iniciar el Proyecto

Una vez que las dependencias estén instaladas:

```bash
npm start
```

Esto iniciará el servidor de desarrollo de Expo.

---

## ⚠️ Si Aún Tienes Problemas

1. **Cierra VS Code completamente**
2. **Abre VS Code de nuevo**
3. **Abre una nueva terminal**
4. **Selecciona CMD** (no PowerShell)
5. **Ejecuta:** `npm install`

---

## 📝 Nota

El script `instalar-usando-cmd.bat` está ejecutándose en segundo plano. Si prefieres esperar a que termine, puedes hacerlo. O puedes ejecutar `npm install` manualmente después de cambiar a CMD.





