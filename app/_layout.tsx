import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/utilidades/context/AuthContext';
import { OrdenesProvider } from '@/utilidades/context/OrdenesContext';
import { useColorScheme } from '@/utilidades/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OrdenesProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              <Stack.Screen name="iniciar-orden" options={{ headerShown: false }} />
              <Stack.Screen name="seleccionar-mesa" options={{ headerShown: false }} />
              <Stack.Screen name="crear-orden" options={{ headerShown: false }} />
              <Stack.Screen name="desglose-ventas" options={{ headerShown: false }} />
              <Stack.Screen name="cobrar" options={{ headerShown: false }} />
              <Stack.Screen name="domicilios" options={{ headerShown: false }} />
              <Stack.Screen name="ordenes-generales" options={{ headerShown: false }} />  
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </OrdenesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
