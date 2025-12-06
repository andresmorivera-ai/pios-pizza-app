import { HapticTab } from '@/componentes/haptic-tab';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { Colors } from '@/configuracion/constants/theme';
import { useAuth } from '@/utilidades/context/AuthContext';
import { useColorScheme } from '@/utilidades/hooks/use-color-scheme';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Decide visibilidad de las tabs según el rol del usuario.
 * 1 = admin, 2 = mesero, 3 = cocinera, 4 = cajera
 */
function getVisibilityFlags(rolId: number | null) {
  switch (rolId) {
    case 1:
      return { home: true, pedidos: true, cocina: true, inventario: true, reportes: true, caja: false ,domicilios: false , ordenesGenerales: false};
    case 2:
      return { home: true, pedidos: true, cocina: false, inventario: false, reportes: false, caja: false ,domicilios: false , ordenesGenerales: false};
    case 3:
      return { home: false, pedidos: false, cocina: false, inventario: false, reportes: false, caja: false ,domicilios: false , ordenesGenerales: false};
    case 4:
      return { home: true, pedidos: true, cocina: true, inventario: true, reportes: false, caja: true ,domicilios: false , ordenesGenerales: false};
    default:
      return { home: true, pedidos: true, cocina: true, inventario: true, reportes: false, caja: true ,domicilios: false , ordenesGenerales: false};
  }
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { usuario, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rolId, setRolId] = useState<number | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const load = async () => {
      await refreshUser();
      setRolId(usuario?.rol_id ?? 2);
      setLoading(false);
    };
    load();
  }, [usuario]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF8C00" />
      </View>
    );
  }

  const vis = getVisibilityFlags(rolId);

  return (
    <Tabs
      key={rolId}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: 65 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          href: vis.home ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{
          title: 'Pedidos',
          href: vis.pedidos ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.clipboard.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="CocinaScreen"
        options={{
          title: 'Cocina',
          href: vis.cocina ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="fork.knife" color={color} />,
        }}
      />
      <Tabs.Screen
        name="InventarioScreen"
        options={{
          title: 'Inventario',
          href: vis.inventario ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="archivebox.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reportes"
        options={{
          title: 'Reportes',
          href: vis.reportes ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="CajaScreen"
        options={{
          title: 'Caja',
          href: vis.caja ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="creditcard.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="DomiciliosScreen"
        options={{
          title: 'Domicilios',
          href: vis.domicilios ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="creditcard.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ordenesGenerales"
        options={{
          title: 'Pedidos Generales',
          href: vis.ordenesGenerales ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="creditcard.fill" color={color} />,
        }}
      />
      <Tabs.Screen name="loginAdmin" options={{ href: null }} />
      <Tabs.Screen name="iniciar-orden" options={{ href: null }} />
      <Tabs.Screen name="seleccionar-mesa" options={{ href: null }} />
      <Tabs.Screen name="crear-orden" options={{ href: null }} />
    </Tabs>
  );
}