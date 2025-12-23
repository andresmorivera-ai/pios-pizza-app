---
description: Create Android APK
---

# Generar APK de Android

Este flujo de trabajo te permitirá generar un archivo `.apk` instalable en cualquier dispositivo Android sin necesidad de la Play Store.

## Prerrequisitos
1. **Cuenta de Expo**: Debes tener una cuenta en [expo.dev](https://expo.dev).
2. **EAS CLI instalado**: Ejecuta `npm install -g eas-cli` si no lo tienes.

## Pasos

1. **Iniciar sesión en EAS** (si no lo has hecho):
   ```bash
   eas login
   ```
   *Ingresa tus credenciales de Expo cuando se te solicite.*

2. **Configurar el proyecto** (si es la primera vez):
   ```bash
   eas build:configure
   ```
   *Responde 'Yes' o 'Android' a las preguntas que aparezcan.*

3. **Iniciar la compilación del APK**:
   ```bash
   eas build -p android --profile preview
   ```
   - Este comando subirá tu código a los servidores de Expo.
   - Espera a que termine la "Build Queue" y el proceso de compilación.
   - Al finalizar, te dará un **enlace de descarga** directo al archivo `.apk`.

4. **Descargar e Instalar**:
   - Abre el enlace generado en tu celular o descarga el archivo en tu PC y envíalo.
   - Instálalo (es posible que debas activar "Orígenes desconocidos" en tu Android).

## Notas Importantes
- Este APK es de tipo "Preview", ideal para pruebas internas y compartir directamente.
- Si recibes errores de credenciales o keystore, deja que EAS maneje las credenciales automáticamente eligiendo las opciones predeterminadas.
