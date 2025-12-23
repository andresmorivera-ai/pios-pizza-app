import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { useAuth } from '@/utilidades/context/AuthContext';
import { useColorScheme } from '@/utilidades/hooks/use-color-scheme';

import { router } from 'expo-router';
import { useEffect } from 'react';
import { Image, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const { usuario, logout } = useAuth();
  const insets = useSafeAreaInsets();

  // Animation values
  const scale = useSharedValue(1);

  useEffect(() => {
    // Continuous pulse animation
    scale.value = withRepeat(
      withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true // reverse
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  //  Ir al login
  const handleAdminLogin = () => {
    router.push('/(tabs)/loginAdmin');
  };

  //  Acciones
  const handleStartOrder = () => router.push('/(tabs)/seleccionar-mesa');
  const handleAhorros = () => router.push('/(tabs)/ahorrosScreen');
  const handleCocina = () => router.push('/(tabs)/CocinaScreen');
  const handleCobrar = () => {
    router.push('/cobrar');
  };

  const esAdmin = usuario?.rol_id === 1;
  const esCajera = usuario?.rol_id === 3;
  const esCocinera = usuario?.rol_id === 4;

  //  Mostrar botón de salir si es admin, cajera o cocinera
  const mostrarSalir = esAdmin || esCajera || esCocinera;


  return (
    <ThemedView style={styles.container}>
      {/* Header con Admin o Salir */}
      <ThemedView style={[styles.header, { paddingTop: Math.max(insets.top, 60) }]}>
        <ThemedText type="title" style={styles.welcomeText}>
          Bienvenido a Pio's Pizza{usuario ? `, ${usuario.nombre}` : ''}
        </ThemedText>

        <TouchableOpacity
          style={[
            styles.adminButton,
            mostrarSalir ? { backgroundColor: '#B22222' } : {},
          ]}
          onPress={mostrarSalir ? logout : handleAdminLogin} // usa logout del contexto
        >
          <IconSymbol
            name={mostrarSalir ? 'arrow.backward.circle.fill' : 'gearshape.fill'}
            size={24}
            color="#fff"
          />
          <ThemedText style={styles.adminText}>
            {mostrarSalir ? 'Salir' : 'Login'}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* Botón central - Iniciar Orden */}
      <ThemedView style={styles.centerSection}>
        <TouchableOpacity style={styles.startOrderButton} onPress={handleStartOrder}>
          <IconSymbol name="plus.circle.fill" size={48} color="#fff" />
          <ThemedText style={styles.startOrderText}>Iniciar Orden</ThemedText>
        </TouchableOpacity>

        {/* Botón Cobrar - Solo para Admin */}
        {mostrarSalir && (
          <TouchableOpacity style={styles.cobrarButton} onPress={handleCobrar}>
            <Image
              source={require('../../assets/iconocobrar.png')}
              style={styles.cobrarIcon}
              resizeMode="contain"
            />
            <ThemedText style={styles.cobrarText}>Cobrar</ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>

      {/* Botones de navegación REORGANIZADOS Y SIMPLIFICADOS */}
      <ThemedView style={[styles.mainButtonsContainer, {
        paddingBottom: Math.max(insets.bottom + 30, 30)
      }]}>

        {/* Solo Admin → Ahorros (ANIMADO) */}
        {mostrarSalir && (
          <Animated.View style={[animatedStyle]}>
            <TouchableOpacity
              style={[styles.mainButton, styles.savingsButton]}
              onPress={handleAhorros}
            >
              <IconSymbol name="cube.box.fill" size={32} color="#FFF" />
              <ThemedText style={styles.savingsButtonText}>Ahorros</ThemedText>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Solo Admin → Cocina */}
        {esAdmin && (
          <TouchableOpacity style={styles.mainButton} onPress={handleCocina}>
            <IconSymbol name="flame.fill" size={28} color="#FF8C00" />
            <ThemedText style={styles.mainButtonText}>Cocina</ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>

    </ThemedView>
  );
}

//  Estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8DC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
    flex: 1,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D2691E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  adminText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center', // Center vertically
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 20, // Add gap between Iniciar Orden and Cobrar
  },
  startOrderButton: {
    backgroundColor: '#FF8C00',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    minWidth: 200,
    // Removing marginTop/Bottom to let centerSection handle spacing via gap/justifyContent
  },
  startOrderText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  cobrarButton: {
    backgroundColor: '#32CD32',
    paddingVertical: 20,
    paddingHorizontal: 38,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    minWidth: 160,
  },
  cobrarText: {
    color: '#fff',
    fontSize: 21,
    fontWeight: 'bold',
  },
  cobrarIcon: {
    width: 32,
    height: 32,
  },
  mainButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly', // Changed to space-evenly for better centering of 2 items
    alignItems: 'center', // Align items vertically
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 20,
  },
  mainButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 110,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  // New styles for the creative Savings button
  savingsButton: {
    backgroundColor: '#4A90E2', // Different color for savings
    elevation: 10, // Higher elevation
    shadowColor: '#4A90E2', // Colored shadow
    shadowOpacity: 0.4,
    shadowRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  savingsButtonText: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  mainButtonText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    textAlign: 'center',
  },
});