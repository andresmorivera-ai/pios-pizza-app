import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/componentes/haptic-tab';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { Colors } from '@/configuracion/constants/theme';
import { useColorScheme } from '@/utilidades/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{
          title: 'Pedidos',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.clipboard.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reportes"
        options={{
          title: 'Reportes',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="iniciar-orden"
        options={{
          href: null, // Oculta el tab pero mantiene la ruta
        }}
      />
      <Tabs.Screen
        name="seleccionar-mesa"
        options={{
          href: null, // Oculta el tab pero mantiene la ruta
        }}
      />
    </Tabs>
  );
}