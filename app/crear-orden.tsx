import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { useOrdenes } from '@/utilidades/context/OrdenesContext';
import { Link, router, useLocalSearchParams } from 'expo-router';
// Conexión Supabase
import { supabase } from '@/scripts/lib/supabase';






export default function CrearOrdenScreen() {
  const { mesa } = useLocalSearchParams();
  const [productos, setProductos] = useState<string[]>([]);
  const [productosSeleccionados, setProductosSeleccionados] = useState<string[]>([]);
  const { agregarOrden } = useOrdenes();


// Cargar productos desde Supabase

  useEffect(() => {
    const obtenerProductos = async () => {
      const { data, error } = await supabase
        .from('productos')
        .select('nombre'); // Solo queremos el nombre

      if (error) {
        console.error('Error cargando productos:', error);
        Alert.alert('Error', 'No se pudieron cargar los productos.');
      } else if (data) {
        setProductos(data.map((item) => item.nombre));
      }
    };

    obtenerProductos();
  }, []);


// Manejo de selección

  const handleToggleProducto = (producto: string) => {
    setProductosSeleccionados((prev) =>
      prev.includes(producto)
        ? prev.filter((p) => p !== producto)
        : [...prev, producto]
    );
  };


// Confirmar orden

  const handleConfirmarOrden = () => {
    if (productosSeleccionados.length > 0) {
      agregarOrden(mesa as string, productosSeleccionados);

      const listaProductos = productosSeleccionados
        .map((producto, index) => `${index + 1}. ${producto}`)
        .join('\n');

      Alert.alert(
        'Orden Confirmada',
        `Orden para Mesa ${mesa}:\n\n${listaProductos}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert('Error', 'Por favor selecciona al menos un producto.');
    }
  };


// UI

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <Link href="/seleccionar-mesa" style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#8B4513" />
        </Link>
        <ThemedText type="title" style={styles.title}>
          Crear Orden
        </ThemedText>
      </ThemedView>

      {/* Contenido principal */}
      <ThemedView style={styles.content}>
        {/* Información de la mesa */}
        <ThemedView style={styles.mesaInfo}>
          <IconSymbol name="table.furniture" size={32} color="#FF8C00" />
          <ThemedText style={styles.mesaText}>Mesa {mesa}</ThemedText>
        </ThemedView>

        {/* Lista de productos */}
        <ThemedView style={styles.productosContainer}>
          <ScrollView style={styles.listaProductos} showsVerticalScrollIndicator={false}>
            {productos.map((producto, index) => {
              const isSelected = productosSeleccionados.includes(producto);
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.productoItem}
                  onPress={() => handleToggleProducto(producto)}
                >
                  <ThemedView style={styles.productoContent}>
                    <ThemedText style={styles.productoTexto}>{producto}</ThemedText>
                    <ThemedView
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSelected,
                      ]}
                    >
                      {isSelected && (
                        <IconSymbol name="checkmark" size={16} color="#fff" />
                      )}
                    </ThemedView>
                  </ThemedView>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </ThemedView>

        {/* Botones de acción */}
        <ThemedView style={styles.actionsContainer}>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmarOrden}>
            <IconSymbol name="checkmark.circle.fill" size={24} color="#fff" />
            <ThemedText style={styles.confirmButtonText}>Confirmar Orden</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <IconSymbol name="xmark.circle.fill" size={24} color="#fff" />
            <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}


// Estilos

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
    paddingBottom: 100,
    gap: 30,
  },
  mesaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    gap: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  mesaText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF8C00',
  },
  productosContainer: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    maxHeight: 450,
  },
  listaProductos: {
    maxHeight: 350,
    paddingRight: 4,
  },
  productoItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
  },
  productoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productoTexto: {
    fontSize: 16,
    color: '#8B4513',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8B4513',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#FF8C00',
    borderColor: '#FF8C00',
  },
  actionsContainer: {
    gap: 16,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF8C00',
    padding: 16,
    borderRadius: 15,
    gap: 12,
    elevation: 4,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC3545',
    padding: 16,
    borderRadius: 15,
    gap: 12,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});