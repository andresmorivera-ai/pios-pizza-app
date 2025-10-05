import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

export default function SeleccionarMesaScreen() {
  const [mesaSeleccionada, setMesaSeleccionada] = useState<number | null>(null);

  // Crear array de mesas del 1 al 12
  const mesas = Array.from({ length: 12 }, (_, i) => i + 1);

  const handleSeleccionarMesa = (numeroMesa: number) => {
    setMesaSeleccionada(numeroMesa);
    // Navegar a la pantalla de iniciar orden
    router.push({
      pathname: '/crear-orden',
      params: { mesa: numeroMesa.toString() }
    });
  };

  const renderMesa = (numeroMesa: number) => {
    const isSelected = mesaSeleccionada === numeroMesa;
    
    return (
      <TouchableOpacity
        key={numeroMesa}
        style={[
          styles.mesaButton,
          isSelected && styles.mesaSelected
        ]}
        onPress={() => handleSeleccionarMesa(numeroMesa)}
      >
        <ThemedText style={[
          styles.mesaText,
          isSelected && styles.mesaTextSelected
        ]}>
          {numeroMesa}
        </ThemedText>
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <Link href="/iniciar-orden" style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#8B4513" />
        </Link>
        <ThemedText type="title" style={styles.title}>
          Seleccionar Mesa
        </ThemedText>
      </ThemedView>

      {/* Contenido principal */}
      <ThemedView style={styles.content}>
        <ThemedText style={styles.subtitle}>
          Selecciona la mesa para iniciar la orden:
        </ThemedText>

        {/* Grid de mesas 3x4 */}
        <ThemedView style={styles.mesasGrid}>
          {mesas.map(renderMesa)}
        </ThemedView>

        {/* Información adicional */}
        <ThemedView style={styles.infoContainer}>
          <IconSymbol name="info.circle" size={20} color="#8B4513" />
          <ThemedText style={styles.infoText}>
            Toca una mesa para comenzar la orden
          </ThemedText>
        </ThemedView>

      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8DC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B4513',
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#8B4513',
    textAlign: 'center',
    marginBottom: 30,
  },
  mesasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 30,
  },
  mesaButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 3,
    borderColor: '#8B4513', // Borde café
  },
  mesaSelected: {
    backgroundColor: '#FF8C00',
    borderColor: '#FF8C00',
  },
  mesaText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#8B4513',
    fontFamily: 'System',
    letterSpacing: 1,
  },
  mesaTextSelected: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    fontFamily: 'System',
    letterSpacing: 1,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#8B4513',
    fontStyle: 'italic',
  },
});
