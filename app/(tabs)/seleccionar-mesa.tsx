import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { Orden, useOrdenes } from '@/utilidades/context/OrdenesContext';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

export default function SeleccionarMesaScreen() {
  const [mesaSeleccionada, setMesaSeleccionada] = useState<number | null>(null);
  const { ordenes } = useOrdenes();

  // Crear array de mesas del 1 al 12
  const mesas = Array.from({ length: 12 }, (_, i) => i + 1);

  // Obtener el estado actual de una mesa basado en su orden más reciente
  const getEstadoMesa = (numeroMesa: number): Orden['estado'] | null => {
    const ordenesMesa = ordenes.filter(orden => orden.mesa === numeroMesa.toString());
    if (ordenesMesa.length === 0) return null;
    
    // Obtener la orden más reciente
    const ordenMasReciente = ordenesMesa[ordenesMesa.length - 1];
    return ordenMasReciente.estado;
  };

  // Obtener el color de la mesa según su estado
  const getColorMesa = (numeroMesa: number) => {
    const estado = getEstadoMesa(numeroMesa);
    
    switch (estado) {
      case 'pendiente':
        return '#FF8C00'; // Naranja
      case 'en_preparacion':
        return '#2196F3'; // Azul
      case 'listo':
        return '#4CAF50'; // Verde
      case 'entregado':
        return '#9E9E9E'; // Gris
      default:
        return '#fff'; // Blanco (sin orden)
    }
  };

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
    const colorMesa = getColorMesa(numeroMesa);
    const estado = getEstadoMesa(numeroMesa);
    const tieneOrden = estado !== null;
    
    return (
      <TouchableOpacity
        key={numeroMesa}
        style={[
          styles.mesaButton,
          { backgroundColor: colorMesa },
          isSelected && styles.mesaSelected
        ]}
        onPress={() => handleSeleccionarMesa(numeroMesa)}
      >
        <ThemedText style={[
          styles.mesaText,
          tieneOrden && styles.mesaTextConOrden,
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
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <ThemedText style={styles.subtitle}>
          Selecciona la mesa para iniciar la orden:
        </ThemedText>

        {/* Grid de mesas 3x4 */}
        <ThemedView style={styles.mesasGrid}>
          {mesas.map(renderMesa)}
        </ThemedView>

        {/* Información adicional */}
        <ThemedView style={styles.infoContainer}>
          <IconSymbol name="info.circle" size={16} color="#999" />
          <ThemedText style={styles.infoText}>
            Toca una mesa para comenzar la orden
          </ThemedText>
        </ThemedView>

        {/* Leyenda de colores - Debajo del aviso */}
        <ThemedView style={styles.leyendaContainer}>
          <ThemedText style={styles.leyendaTitulo}>Estado de las mesas</ThemedText>
          
          <ThemedView style={styles.leyendaRow}>
            <ThemedView style={styles.leyendaItem}>
              <ThemedView style={[styles.colorBox, { backgroundColor: '#fff', borderWidth: 2, borderColor: '#8B4513' }]} />
              <ThemedText style={styles.leyendaTexto}>Disponible</ThemedText>
            </ThemedView>

            <ThemedView style={styles.leyendaItem}>
              <ThemedView style={[styles.colorBox, { backgroundColor: '#FF8C00' }]} />
              <ThemedText style={styles.leyendaTexto}>Pendiente</ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.leyendaRow}>
            <ThemedView style={styles.leyendaItem}>
              <ThemedView style={[styles.colorBox, { backgroundColor: '#2196F3' }]} />
              <ThemedText style={styles.leyendaTexto}>Preparación</ThemedText>
            </ThemedView>

            <ThemedView style={styles.leyendaItem}>
              <ThemedView style={[styles.colorBox, { backgroundColor: '#4CAF50' }]} />
              <ThemedText style={styles.leyendaTexto}>Listo</ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 45,
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 15,
  },
  subtitle: {
    fontSize: 15,
    color: '#8B4513',
    textAlign: 'center',
    marginBottom: 10,
  },
  mesasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
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
  mesaTextConOrden: {
    color: '#fff',
    fontWeight: 'bold',
  },
  mesaTextSelected: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'System',
    letterSpacing: 1,
  },
  leyendaContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  leyendaTitulo: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 8,
    textAlign: 'center',
  },
  leyendaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  leyendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  colorBox: {
    width: 24,
    height: 24,
    borderRadius: 5,
  },
  leyendaTexto: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
});
