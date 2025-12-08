import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { Layout } from '@/configuracion/constants/Layout';
import { supabase } from '@/scripts/lib/supabase';
import { Link, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const formatErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
};

const logError = (context: string, error: unknown) => {
  console.error(`${context}: ${formatErrorMessage(error)}`);
};

type Mesa = {
  id: number;
  numero_mesa: number;
  estado: 'disponible' | 'pendiente' | 'en_preparacion' | 'listo' | 'pendiente_por_pagar' | 'entregado' | 'pago';
  ultima_actualizacion: string;
};

//  Actualiza el estado de la mesa en base a su última orden
async function actualizarEstadoMesaDesdeOrden(mesaNumero: number) {
  const { data: ordenesMesa, error } = await supabase
    .from('ordenes')
    .select('estado')
    .eq('mesa', mesaNumero.toString())
    .order('fecha_creacion', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error obteniendo orden:', error);
    return;
  }

  const nuevoEstado = ordenesMesa?.[0]?.estado ?? 'disponible';

  const { error: updateError } = await supabase
    .from('mesas')
    .update({
      estado: nuevoEstado,
      ultima_actualizacion: new Date().toISOString(),
    })
    .eq('numero_mesa', mesaNumero);

  if (updateError) console.error('Error actualizando mesa:', updateError);
}

export default function SeleccionarMesaScreen() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [mesaSeleccionada, setMesaSeleccionada] = useState<number | null>(null);
  const [errorMesas, setErrorMesas] = useState<string | null>(null);
  const animacionesRef = useRef<{ [key: number]: Animated.Value }>({});
  const insets = useSafeAreaInsets();
  const handlellevar = () => router.push('/(tabs)/ordenesGenerales');
  const handleDomicilio = () => router.push('/(tabs)/DomiciliosScreen');

  //  Colores según estado
  const getColorMesa = (estado: Mesa['estado'] | undefined) => {
    switch (estado) {
      case 'disponible':
        return '#fff';
      case 'pendiente':
        return '#FF8C00';
      case 'en_preparacion':
        return '#2196F3';
      case 'listo':
        return '#4CAF50';
      case 'pendiente_por_pagar':
        return '#D84315';
      case 'entregado':
        return '#9C27B0';
      case 'pago':
        return '#28A745';
      default:
        return '#fff';
    }
  };

  // Carga inicial
  const cargarMesas = async () => {
    try {
      const { data, error } = await supabase
        .from('mesas')
        .select('*')
        .order('numero_mesa', { ascending: true });

      if (error) {
        throw error;
      }

      if (data) {
        setMesas(data);
        setErrorMesas(null);
      }
    } catch (error) {
      logError('Error cargando mesas', error);
      setErrorMesas(`No se pudieron cargar las mesas: ${formatErrorMessage(error)}`);
    }
  };

  // 🔹 Efecto de animación cuando cambia el estado de una mesa
  const animarCambio = (mesaId: number) => {
    if (!animacionesRef.current[mesaId]) {
      animacionesRef.current[mesaId] = new Animated.Value(1);
    }

    Animated.sequence([
      Animated.timing(animacionesRef.current[mesaId], {
        toValue: 1.15,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(animacionesRef.current[mesaId], {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // 🔹 Escuchar cambios en tiempo real
  useEffect(() => {
    cargarMesas();

    const canalMesas = supabase
      .channel('mesas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, (payload) => {
        if (payload.new) {
          const mesaActualizada = payload.new as Mesa;
          animarCambio(mesaActualizada.id);

          setMesas((prev) => {
            const existe = prev.find((m) => m.id === mesaActualizada.id);
            if (existe) {
              return prev.map((m) => (m.id === mesaActualizada.id ? mesaActualizada : m));
            } else {
              return [...prev, mesaActualizada];
            }
          });
        }
      })
      .subscribe();

    const canalOrdenes = supabase
      .channel('ordenes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordenes' }, async (payload) => {
        const nuevaOrden = payload.new as { mesa?: string };
        if (nuevaOrden?.mesa) {
          const mesaNumero = parseInt(nuevaOrden.mesa);
          if (!isNaN(mesaNumero)) {
            await actualizarEstadoMesaDesdeOrden(mesaNumero);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canalMesas);
      supabase.removeChannel(canalOrdenes);
    };
  }, []);

  //  Seleccionar mesa
  const handleSeleccionarMesa = (numeroMesa: number) => {
    setMesaSeleccionada(numeroMesa);
    router.push({
      pathname: '/crear-orden',
      params: { mesa: numeroMesa.toString() },
    });
  };

  //  Renderizar mesa con animación
  const renderMesa = (mesa: Mesa) => {
    if (!animacionesRef.current[mesa.id]) {
      animacionesRef.current[mesa.id] = new Animated.Value(1);
    }

    const isSelected = mesaSeleccionada === mesa.numero_mesa;
    const colorMesa = getColorMesa(mesa.estado);

    return (
      <Animated.View
        key={mesa.id}
        style={{
          transform: [{ scale: animacionesRef.current[mesa.id] }],
          width: '30%',
        }}
      >
        <TouchableOpacity
          style={[
            styles.mesaButton,
            { backgroundColor: colorMesa },
            isSelected && styles.mesaSelected,
          ]}
          onPress={() => handleSeleccionarMesa(mesa.numero_mesa)}
          activeOpacity={0.8}
        >
          <ThemedText
            style={[
              styles.mesaText,
              mesa.estado !== 'disponible' && styles.mesaTextConOrden,
            ]}
          >
            {mesa.numero_mesa}
          </ThemedText>
        </TouchableOpacity>
      </Animated.View>
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
      {errorMesas && (
        <ThemedView style={styles.errorBanner}>
          <ThemedText style={styles.errorBannerText}>{errorMesas}</ThemedText>
        </ThemedView>
      )}

      {/* Contenido */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <ThemedText style={styles.subtitle}>
          Selecciona la mesa para iniciar la orden:
        </ThemedText>

        <ThemedView style={styles.mesasGrid}>{mesas.map(renderMesa)}</ThemedView>

        {/* Leyenda */}
        <ThemedView style={styles.leyendaContainer}>
          <ThemedText style={styles.leyendaTitulo}>Estado de las mesas</ThemedText>

          <ThemedView style={styles.leyendaRow}>
            <ThemedView style={styles.leyendaItem}>
              <ThemedView
                style={[
                  styles.colorBox,
                  { backgroundColor: '#fff', borderWidth: 2, borderColor: '#8B4513' },
                ]}
              />
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

          <ThemedView style={styles.leyendaRow}>
            <ThemedView style={styles.leyendaItem}>
              <ThemedView style={[styles.colorBox, { backgroundColor: '#9C27B0' }]} />
              <ThemedText style={styles.leyendaTexto}>Entregado</ThemedText>
            </ThemedView>

            <ThemedView style={styles.leyendaItem}>
              <ThemedView style={[styles.colorBox, { backgroundColor: '#28A745' }]} />
              <ThemedText style={styles.leyendaTexto}>Pagado</ThemedText>
            </ThemedView>
          </ThemedView>

        </ThemedView>
        <ThemedView style={[styles.mainButtonsContainer, {
          paddingBottom: Math.max(insets.bottom + 30, 30)
        }]}>
          {/* Pedidos → Visible para todos */}
          <TouchableOpacity style={styles.mainButton} onPress={handlellevar}>
            <IconSymbol name="bag.fill" size={28} color="#FF8C00" />
            <ThemedText style={styles.mainButtonText}>Llevar</ThemedText>
          </TouchableOpacity>

          {/* Solo Admin → Inventario */}

          <TouchableOpacity style={styles.mainButton} onPress={handleDomicilio}>
            <IconSymbol name="motorcycle.fill" size={28} color="#FF8C00" />
            <ThemedText style={styles.mainButtonText}>Domicilio</ThemedText>
          </TouchableOpacity>


          {/* Solo Admin → Reportes */}


        </ThemedView>
      </ScrollView>

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Layout.verticalScale(45),
    paddingHorizontal: Layout.spacing.l,
    paddingBottom: Layout.spacing.s,
    gap: Layout.spacing.m,
  },

  backButton: { padding: Layout.spacing.s },
  title: { fontSize: Layout.fontSize.xxl, fontWeight: 'bold', color: '#8B4513', flex: 1 },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: Layout.spacing.l, paddingBottom: Layout.spacing.m },
  subtitle: {
    fontSize: Layout.fontSize.m,
    color: '#8B4513',
    textAlign: 'center',
    marginBottom: Layout.spacing.s,
  },
  mesasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: Layout.spacing.s,
    marginBottom: Layout.spacing.s,
  },
  mesaButton: {
    aspectRatio: 1,
    borderRadius: Layout.borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 3,
    borderColor: '#8B4513',
  },
  mesaSelected: {
    borderColor: '#000000',
    borderWidth: 4
  },
  mesaText: { fontSize: Layout.fontSize.xxl, fontWeight: '300', color: '#8B4513', textAlign: 'center' },
  mesaTextConOrden: { color: '#fff', fontWeight: 'bold' },
  leyendaContainer: {
    backgroundColor: '#fff',
    padding: Layout.spacing.m,
    borderRadius: Layout.borderRadius.l,
    marginBottom: Layout.spacing.xs,
    elevation: 3,
  },
  leyendaTitulo: {
    fontSize: Layout.fontSize.m,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: Layout.spacing.s,
    textAlign: 'center',
  },
  leyendaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.xs,
  },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.s, flex: 1 },
  colorBox: { width: Layout.icon.m, height: Layout.icon.m, borderRadius: Layout.borderRadius.s },
  leyendaTexto: { fontSize: Layout.fontSize.s, color: '#555', fontWeight: '500' },
  errorBanner: {
    marginHorizontal: Layout.spacing.l,
    marginBottom: Layout.spacing.s,
    borderRadius: Layout.borderRadius.l,
    borderWidth: 1,
    borderColor: '#FF8C00',
    backgroundColor: '#FFF7F0',
    padding: Layout.spacing.s,
  },
  errorBannerText: {
    color: '#8B0000',
    fontWeight: '600',
  },
  mainButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: Layout.spacing.l,
    paddingHorizontal: Layout.spacing.m,
    borderRadius: Layout.borderRadius.xl,
    minWidth: 100,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  mainButtonText: {
    marginTop: Layout.spacing.s,
    fontSize: Layout.fontSize.l,
    fontWeight: '600',
    color: '#8B4513',
    textAlign: 'center',
  },
  mainButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Layout.spacing.l,
    paddingVertical: Layout.spacing.l,
  },
});
