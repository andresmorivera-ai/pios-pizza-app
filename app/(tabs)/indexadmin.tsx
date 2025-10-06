import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { useColorScheme } from '@/utilidades/hooks/use-color-scheme';
import { router } from 'expo-router';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';

export default function HomeScreen() {
  const colorScheme = useColorScheme();

  const handleStartOrder = () => {
    router.push('/iniciar-orden');
  };

  const handlePedidos = () => {
    router.push('/pedidos');
  };

  const handleInventario = () => {
    Alert.alert('Inventario', 'Navegando a la sección de inventario');
  };

  const handleReportes = () => {
    Alert.alert('Reportes', 'Navegando a la sección de reportes');
  };

  const handleSalir = () => {
    router.push('/loginAdmin');
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header con Admin */}
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.welcomeText}>
          Bienvenido a Pio's Pizza -ADMIN-
        </ThemedText>
        <TouchableOpacity style={styles.adminButton} onPress={handleSalir}>
          <IconSymbol name="gearshape.fill" size={24} color="#fff" />
          <ThemedText style={styles.adminText}>Salir</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* Botón central - Iniciar Orden */}
      <ThemedView style={styles.centerSection}>
        <TouchableOpacity style={styles.startOrderButton} onPress={handleStartOrder}>
          <IconSymbol name="plus.circle.fill" size={48} color="#fff" />
          <ThemedText style={styles.startOrderText}>Cobrar</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* Botones de navegación principal */}
      <ThemedView style={styles.mainButtonsContainer}>
        <TouchableOpacity style={styles.mainButton} onPress={handlePedidos}>
          <IconSymbol name="list.clipboard.fill" size={28} color="#FF8C00" />
          <ThemedText style={styles.mainButtonText}>Pedidos</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.mainButton} onPress={handleInventario}>
          <IconSymbol name="archivebox.fill" size={28} color="#FF8C00" />
          <ThemedText style={styles.mainButtonText}>Inventario</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.mainButton} onPress={handleReportes}>
          <IconSymbol name="chart.bar.fill" size={28} color="#FF8C00" />
          <ThemedText style={styles.mainButtonText}>Reportes</ThemedText>
        </TouchableOpacity>
        
      </ThemedView>
      

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8DC', // Cream background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B4513', // Saddle brown
    flex: 1,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D2691E', // Chocolate
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  startOrderButton: {
    backgroundColor: '#FF8C00', // Dark Orange
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
  },
  startOrderText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  mainButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 30,
  },
  mainButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 100,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  mainButtonText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    textAlign: 'center',
  },
});