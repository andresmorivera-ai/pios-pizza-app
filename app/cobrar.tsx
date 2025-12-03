import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { supabase } from '@/scripts/lib/supabase';
import { Orden, useOrdenes } from '@/utilidades/context/OrdenesContext';
import { useColorScheme } from '@/utilidades/hooks/use-color-scheme';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Interfaz para órdenes generales desde Supabase
interface OrdenGeneral {
  id: string;
  tipo: string;
  referencia?: string;
  productos: string[];
  total: number;
  estado: string;
  created_at: string;
}

export default function CobrarScreen() {
  const colorScheme = useColorScheme();
  const { ordenes } = useOrdenes();
  const insets = useSafeAreaInsets();
  const [ordenesGenerales, setOrdenesGenerales] = useState<OrdenGeneral[]>([]);
  const [cargando, setCargando] = useState(false);

  // Cargar órdenes generales desde Supabase
  const cargarOrdenesGenerales = useCallback(async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('ordenesgenerales')
        .select('*')
        .order('creado_en', { ascending: false });

      if (error) {
        console.error('Error cargando órdenes generales:', error);
      } else if (data) {
        setOrdenesGenerales(data);
      }
    } catch (error) {
      console.error('Error general:', error);
    } finally {
      setCargando(false);
    }
  }, []);

  // Cargar órdenes generales al montar
  useEffect(() => {
    cargarOrdenesGenerales();
    
    // Suscripción en tiempo real a cambios en ordenesgenerales
    const subscription = supabase
      .channel('ordenes-generales-cobrar-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ordenesgenerales'
        },
        () => {
          cargarOrdenesGenerales();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [cargarOrdenesGenerales]);

  // Filtrar órdenes con estado "pendiente_por_pagar" (pendientes de pago)
  const ordenesPendientesMesas = ordenes.filter(orden => orden.estado === 'pendiente_por_pagar');
  const ordenesGeneralesPendientes = ordenesGenerales.filter(orden => orden.estado === 'pendiente_por_pagar');
  
  // Combinar todas las órdenes pendientes
  const todasLasOrdenesPendientes = ordenesPendientesMesas.length + ordenesGeneralesPendientes.length;

  // Debug: Log para ver qué órdenes hay
  console.log('🏪 [Cobrar] Total órdenes mesas:', ordenes.length);
  console.log('🏪 [Cobrar] Total órdenes generales:', ordenesGenerales.length);
  console.log('🏪 [Cobrar] Órdenes pendientes mesas:', ordenesPendientesMesas.length);
  console.log('🏪 [Cobrar] Órdenes pendientes generales:', ordenesGeneralesPendientes.length);

  // Navegar a detalles de cobro para mesas
  const handleCobrarOrden = (orden: Orden) => {
    router.push({
      pathname: '/detalles-cobro',
      params: {
        ordenId: orden.id,
        mesa: orden.mesa,
        total: orden.total.toString(),
        productos: JSON.stringify(orden.productos)
      }
    });
  };

  // Navegar a detalles de cobro para órdenes generales
  const handleCobrarOrdenGeneral = (orden: OrdenGeneral) => {
    router.push({
      pathname: '/detalles-cobro',
      params: {
        ordenId: orden.id,
        mesa: orden.tipo,
        total: orden.total.toString(),
        productos: JSON.stringify(orden.productos)
      }
    });
  };

  // Renderizar cada orden de mesa pendiente
  const renderOrdenMesa = ({ item }: { item: Orden }) => (
    <View style={styles.ordenCard}>
      <View style={styles.ordenHeader}>
        <View style={styles.mesaContainer}>
          <IconSymbol name="table.furniture.fill" size={20} color="#8B4513" />
          <ThemedText style={styles.mesaText}>Mesa {item.mesa}</ThemedText>
        </View>
        <ThemedText style={styles.totalText}>${item.total.toLocaleString()}</ThemedText>
      </View>
      
      <View style={styles.ordenInfo}>
        <ThemedText style={styles.itemsText}>
          {item.productos.length} {item.productos.length === 1 ? 'item' : 'items'}
        </ThemedText>
        <ThemedText style={styles.fechaText}>
          {item.fechaCreacion.toLocaleString()}
        </ThemedText>
      </View>

      <TouchableOpacity 
        style={styles.cobrarButton} 
        onPress={() => handleCobrarOrden(item)}
      >
        <IconSymbol name="creditcard.fill" size={20} color="#fff" />
        <ThemedText style={styles.cobrarButtonText}>Cobrar $</ThemedText>
      </TouchableOpacity>
    </View>
  );

  // Renderizar cada orden general pendiente
  const renderOrdenGeneral = ({ item }: { item: OrdenGeneral }) => (
    <View style={styles.ordenCard}>
      <View style={styles.ordenHeader}>
        <View style={styles.mesaContainer}>
          <IconSymbol 
            name={item.tipo.toLowerCase().includes('domicilio') ? 'car.fill' : 'bag.fill'} 
            size={20} 
            color="#8B4513" 
          />
          <ThemedText style={styles.mesaText}>{item.tipo}</ThemedText>
        </View>
        <ThemedText style={styles.totalText}>${item.total.toLocaleString()}</ThemedText>
      </View>
      
      {item.referencia && (
        <View style={styles.referenciaContainer}>
          <IconSymbol name="info.circle" size={14} color="#666" />
          <ThemedText style={styles.referenciaText}>{item.referencia}</ThemedText>
        </View>
      )}

      <View style={styles.ordenInfo}>
        <ThemedText style={styles.itemsText}>
          {item.productos.length} {item.productos.length === 1 ? 'item' : 'items'}
        </ThemedText>
        <ThemedText style={styles.fechaText}>
          {new Date(item.created_at).toLocaleString()}
        </ThemedText>
      </View>

      <TouchableOpacity 
        style={styles.cobrarButton} 
        onPress={() => handleCobrarOrdenGeneral(item)}
      >
        <IconSymbol name="creditcard.fill" size={20} color="#fff" />
        <ThemedText style={styles.cobrarButtonText}>Cobrar $</ThemedText>
      </TouchableOpacity>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={[styles.header, { paddingTop: Math.max(insets.top + 40, 40) }]}>
        <ThemedText type="title" style={styles.title}>
          Órdenes por pagar
        </ThemedText>
      </ThemedView>

      {/* Lista de órdenes pendientes */}
      {todasLasOrdenesPendientes === 0 ? (
        <ThemedView style={styles.emptyContainer}>
          <IconSymbol name="checkmark.circle.fill" size={64} color="#32CD32" />
          <ThemedText style={styles.emptyTitle}>No hay órdenes pendientes</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Todas las órdenes han sido cobradas
          </ThemedText>
        </ThemedView>
      ) : (
        <ScrollView 
          style={styles.listContainer}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 20) }}
          showsVerticalScrollIndicator={false}
        >
          {/* Renderizar órdenes de mesas */}
          {ordenesPendientesMesas.map((orden) => (
            <View key={`mesa-${orden.id}`}>
              {renderOrdenMesa({ item: orden })}
            </View>
          ))}

          {/* Renderizar órdenes generales (domicilios y llevar) */}
          {ordenesGeneralesPendientes.map((orden) => (
            <View key={`general-${orden.id}`}>
              {renderOrdenGeneral({ item: orden })}
            </View>
          ))}
        </ScrollView>
      )}
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
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: -100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8B4513',
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 5,
  },
  ordenCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  ordenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mesaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mesaText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#32CD32',
  },
  referenciaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  referenciaText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  ordenInfo: {
    marginBottom: 16,
  },
  itemsText: {
    fontSize: 14,
    color: '#8B4513',
    marginBottom: 4,
  },
  fechaText: {
    fontSize: 12,
    color: '#8B4513',
    opacity: 0.7,
  },
  cobrarButton: {
    backgroundColor: '#32CD32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  cobrarButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});