# 🚀 Guía de Instalación - Proyecto PIOS Pizza App

Esta guía te ayudará a instalar todo lo necesario para correr el proyecto en Windows.

## 📋 Requisitos Previos

1. **Node.js** (versión 18 o superior)
2. **npm** (viene incluido con Node.js)
3. **Git** (opcional, pero recomendado)
4. **Expo CLI** (se instala globalmente)

---

## 🔧 Paso 1: Instalar Node.js

### Opción A: Descarga directa (Recomendado)

1. Ve a: https://nodejs.org/
2. Descarga la versión **LTS** (Long Term Support) - Recomendada
3. Ejecuta el instalador `.msi`
4. Durante la instalación:
   - ✅ Acepta los términos
   - ✅ Marca la opción "Automatically install the necessary tools"
   - ✅ Deja todas las opciones por defecto
5. Haz clic en "Install"
6. Reinicia VS Code después de la instalación

### Opción B: Usando Chocolatey (si lo tienes instalado)

```powershell
choco install nodejs-lts
```

### Verificar instalación

Abre una **nueva terminal** en VS Code (Terminal → Nueva Terminal) y ejecuta:

```bash
node --version
npm --version
```

Deberías ver algo como:
```
v20.11.0
10.2.4
```

---

## 📦 Paso 2: Instalar dependencias del proyecto

1. Abre VS Code en la carpeta del proyecto
2. Abre la terminal integrada (Terminal → Nueva Terminal o `Ctrl + Ñ`)
3. Navega a la carpeta del proyecto (si no estás ahí):

```bash
cd C:\pios-pizza-app-main\pios-pizza-app-main
```

4. Instala las dependencias:

```bash
npm install
```

Esto puede tardar varios minutos. Verás que se descargan muchos paquetes.

---

## 🌐 Paso 3: Instalar Expo CLI globalmente

Ejecuta en la terminal:

```bash
npm install -g expo-cli
```

O si prefieres usar npx (no requiere instalación global):

```bash
npx expo --version
```

---

## ⚙️ Paso 4: Configurar Supabase (Base de Datos)

El proyecto usa Supabase como base de datos. Las credenciales ya están configuradas en:
- `scripts/lib/supabase.ts`

**Nota:** Si necesitas cambiar las credenciales, edita ese archivo.

---

## 🚀 Paso 5: Iniciar el proyecto

### Opción A: Usando npm

```bash
npm start
```

### Opción B: Usando npx

```bash
npx expo start
```

### Opción C: Usando el script del package.json

```bash
npm run start
```

---

## 📱 Paso 6: Ejecutar la aplicación

Una vez que ejecutes `npm start`, verás un código QR y varias opciones:

### Opción 1: En tu teléfono (Recomendado para desarrollo)

1. Instala la app **Expo Go** desde:
   - Android: [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)

2. Escanea el código QR que aparece en la terminal con:
   - **Android**: Usa la app Expo Go directamente
   - **iOS**: Usa la cámara del iPhone

### Opción 2: En el navegador web

Presiona `w` en la terminal para abrir en el navegador web.

### Opción 3: En un emulador Android

1. Instala [Android Studio](https://developer.android.com/studio)
2. Configura un emulador Android
3. Presiona `a` en la terminal cuando Expo esté corriendo

### Opción 4: En un simulador iOS (solo macOS)

Si tienes Mac, puedes presionar `i` para abrir en el simulador iOS.

---

## 🛠️ Comandos Útiles

### Ver todas las opciones disponibles:

```bash
npm run
```

### Ejecutar en modo específico:

```bash
npm run android    # Solo Android
npm run ios         # Solo iOS (Mac)
npm run web         # Solo navegador web
```

### Limpiar caché si hay problemas:

```bash
npm start -- --clear
```

### Reinstalar dependencias:

```bash
rm -rf node_modules
npm install
```

---

## ❌ Solución de Problemas Comunes

### Error: "node no se reconoce como comando"

**Solución:**
1. Reinicia VS Code completamente
2. Abre una nueva terminal
3. Verifica que Node.js esté instalado: `node --version`

### Error: "npm ERR! code EACCES"

**Solución:**
Ejecuta VS Code como administrador o usa:
```bash
npm install --global --force
```

### Error: "Cannot find module"

**Solución:**
```bash
rm -rf node_modules
npm install
```

### Error: "Port 8081 already in use"

**Solución:**
```bash
# En Windows PowerShell
netstat -ano | findstr :8081
taskkill /PID <PID_NUMBER> /F
```

O simplemente reinicia la terminal y ejecuta `npm start` de nuevo.

### Error de conexión a Supabase

**Solución:**
1. Verifica tu conexión a internet
2. Revisa las credenciales en `scripts/lib/supabase.ts`
3. Asegúrate de que el proyecto Supabase esté activo

---

## 📚 Recursos Adicionales

- [Documentación de Expo](https://docs.expo.dev/)
- [Documentación de React Native](https://reactnative.dev/)
- [Documentación de Supabase](https://supabase.com/docs)

---

## ✅ Checklist de Instalación

- [ ] Node.js instalado y verificado
- [ ] npm funcionando
- [ ] Dependencias del proyecto instaladas (`npm install`)
- [ ] Expo CLI instalado (o usando npx)
- [ ] Proyecto iniciado con `npm start`
- [ ] App corriendo en dispositivo/emulador/navegador

---

## 🎉 ¡Listo!

Una vez completados todos los pasos, deberías poder ver la aplicación corriendo. Si tienes algún problema, revisa la sección de "Solución de Problemas Comunes" o consulta la documentación de Expo.

**¡Feliz desarrollo! 🚀**





