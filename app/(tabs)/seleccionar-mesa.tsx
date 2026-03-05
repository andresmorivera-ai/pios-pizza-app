import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { Layout } from '@/configuracion/constants/Layout';
import { supabase } from '@/scripts/lib/supabase';
import { useAuth } from '@/utilidades/context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { Link, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
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
  const suppressRealtimeRef = useRef(false); // suppress realtime during config saves
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol_id === 1;
  const handlellevar = () => router.push('/(tabs)/ordenesGenerales');
  const handleDomicilio = () => router.push('/(tabs)/DomiciliosScreen');

  // --- Estado para modal de configuración de mesas ---
  const [modalConfigVisible, setModalConfigVisible] = useState(false);
  const [numeroMesasInput, setNumeroMesasInput] = useState('');
  const [guardandoConfig, setGuardandoConfig] = useState(false);

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

  // Detecta mesas atascadas (pago / pendiente_por_pagar) sin orden activa y las libera
  const sanearEstadoMesas = async (mesasActuales: Mesa[]) => {
    const estadosOcupados: Mesa['estado'][] = ['pago', 'pendiente_por_pagar', 'pendiente', 'en_preparacion', 'listo', 'entregado'];
    const mesasOcupadas = mesasActuales.filter(m => estadosOcupados.includes(m.estado));

    if (mesasOcupadas.length === 0) return;

    const numerosOcupados = mesasOcupadas.map(m => m.numero_mesa.toString());

    // Buscar ordenes activas (no pagadas) para esas mesas
    const { data: ordenesActivas } = await supabase
      .from('ordenes')
      .select('mesa, estado')
      .in('mesa', numerosOcupados)
      .neq('estado', 'pago');

    const mesasConOrdenActiva = new Set((ordenesActivas || []).map((o: any) => o.mesa));

    // Mesas que están marcadas como ocupadas pero NO tienen orden activa
    const mesasAtascadas = mesasOcupadas.filter(
      m => !mesasConOrdenActiva.has(m.numero_mesa.toString())
    );

    if (mesasAtascadas.length === 0) return;

    console.log('[SANEAR] Mesas atascadas detectadas:', mesasAtascadas.map(m => `Mesa ${m.numero_mesa} (${m.estado})`));

    // Resetear en paralelo
    await Promise.all(
      mesasAtascadas.map(m =>
        supabase
          .from('mesas')
          .update({ estado: 'disponible', ultima_actualizacion: new Date().toISOString() })
          .eq('numero_mesa', m.numero_mesa)
      )
    );

    // Actualizar estado local inmediatamente
    setMesas(prev =>
      prev.map(m =>
        mesasAtascadas.find(a => a.id === m.id)
          ? { ...m, estado: 'disponible' as const }
          : m
      )
    );
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
        // Deduplicate by id to prevent duplicate-key React warnings
        const unique = Array.from(new Map(data.map((m: Mesa) => [m.id, m])).values());
        setMesas(unique);
        setErrorMesas(null);

        // Sanear mesas que puedan estar atascadas en un estado ocupado sin orden real
        await sanearEstadoMesas(unique as Mesa[]);
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
        // Skip realtime updates while doing a config save – cargarMesas will authoratively reset state
        if (suppressRealtimeRef.current) return;

        if (payload.eventType === 'DELETE') {
          const mesaEliminada = payload.old as Mesa;
          setMesas((prev) => prev.filter((m) => m.id !== mesaEliminada.id));
        } else if (payload.new) {
          const mesaActualizada = payload.new as Mesa;
          animarCambio(mesaActualizada.id);

          setMesas((prev) => {
            const existe = prev.find((m) => m.id === mesaActualizada.id);
            if (existe) {
              return prev.map((m) => (m.id === mesaActualizada.id ? mesaActualizada : m));
            } else {
              return [...prev, mesaActualizada].sort((a, b) => a.numero_mesa - b.numero_mesa);
            }
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canalMesas);
    };
  }, []);

  // Recargar y sanear mesas cada vez que la pantalla gana foco
  useFocusEffect(
    useCallback(() => {
      cargarMesas();
    }, [])
  );

  //  Seleccionar mesa
  const handleSeleccionarMesa = (numeroMesa: number) => {
    setMesaSeleccionada(numeroMesa);
    router.push({
      pathname: '/crear-orden',
      params: { mesa: numeroMesa.toString() },
    });
  };

  // --- Configurar número de mesas ---
  const handleAbrirConfig = () => {
    setNumeroMesasInput(mesas.length.toString());
    setModalConfigVisible(true);
  };

  const handleGuardarConfig = async () => {
    const N = parseInt(numeroMesasInput);
    if (isNaN(N) || N < 1 || N > 99) {
      Alert.alert('Número inválido', 'Ingresa un número entre 1 y 99.');
      return;
    }

    setGuardandoConfig(true);
    suppressRealtimeRef.current = true;

    try {
      // PASO 0: Obtener las mesas que quedan FUERA del rango [1..N]
      const { data: mesasSobrantes, error: fetchSobrantesError } = await supabase
        .from('mesas')
        .select('id, numero_mesa, estado')
        .gt('numero_mesa', N)
        .order('numero_mesa', { ascending: false }); // descendente como pidió el usuario

      if (fetchSobrantesError) throw fetchSobrantesError;

      const sobrantes = mesasSobrantes ?? [];
      console.log('[CONFIG] Sobrantes encontradas:', sobrantes.length, sobrantes.map((m: any) => m.numero_mesa));

      // VALIDACIÓN: No permitir eliminar si alguna sobrante tiene órden activa
      const conOrdenActiva = sobrantes.filter((m: any) => m.estado !== 'disponible');
      if (conOrdenActiva.length > 0) {
        const lista = conOrdenActiva
          .map((m: any) => `• Mesa ${m.numero_mesa} (${m.estado})`)
          .join('\n');
        Alert.alert(
          '⚠️ No se puede reducir',
          `Estas mesas tienen órdenes activas.\nEspera a que finalicen:\n\n${lista}`,
          [{ text: 'Entendido', style: 'cancel' }]
        );
        return;
      }

      // PASO 1: Eliminar las mesas sobrantes por ID (descendente: 20, 19, 18...)
      if (sobrantes.length > 0) {
        const ids = sobrantes.map((m: any) => m.id);
        console.log('[CONFIG] Intentando borrar IDs:', ids);

        const { data: deleteData, error: deleteError, count } = await supabase
          .from('mesas')
          .delete()
          .in('id', ids)
          .select(); // select() fuerza que Supabase confirme qué se borró

        console.log('[CONFIG] Delete resultado:', { deleteData, deleteError, count });

        if (deleteError) throw deleteError;

        if (!deleteData || deleteData.length === 0) {
          // Nada se borró - probablemente RLS bloqueó
          Alert.alert(
            '⚠️ Sin permisos de borrado',
            `Supabase devolvió 0 filas eliminadas. Verifica que la política RLS de la tabla "mesas" permita DELETE. IDs intentados: ${ids.join(', ')}`
          );
          return;
        }
      }

      // PASO 2: Re-consultar qué hay genuinamente en [1..N]
      const { data: mesasRestantes, error: fetchError } = await supabase
        .from('mesas')
        .select('numero_mesa')
        .lte('numero_mesa', N)
        .order('numero_mesa', { ascending: true });
      if (fetchError) throw fetchError;

      const existentes = new Set<number>(
        (mesasRestantes ?? []).map((m: any) => Number(m.numero_mesa))
      );
      console.log('[CONFIG] Existentes tras delete:', [...existentes]);

      // PASO 3: Insertar solo los que genuinamente no existen en [1..N]
      const faltantes: { numero_mesa: number; estado: string; ultima_actualizacion: string }[] = [];
      for (let n = 1; n <= N; n++) {
        if (!existentes.has(n)) {
          faltantes.push({
            numero_mesa: n,
            estado: 'disponible',
            ultima_actualizacion: new Date().toISOString(),
          });
        }
      }

      if (faltantes.length > 0) {
        console.log('[CONFIG] Insertando faltantes:', faltantes.map(f => f.numero_mesa));
        const { error: insertError } = await supabase.from('mesas').insert(faltantes);
        if (insertError) throw insertError;
      }

      // PASO 4: Recargar lista y cerrar
      await cargarMesas();
      setModalConfigVisible(false);
      Alert.alert('✅ Listo', `Mesas configuradas: 1 al ${N}.`);
    } catch (err) {
      logError('Error configurando mesas', err);
      Alert.alert('Error', `No se pudo actualizar: ${formatErrorMessage(err)}`);
    } finally {
      suppressRealtimeRef.current = false;
      setGuardandoConfig(false);
    }
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
        key={`mesa-${mesa.id}`}
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
        {esAdmin && (
          <TouchableOpacity
            onPress={handleAbrirConfig}
            style={styles.configBtn}
          >
            <IconSymbol name="gearshape.fill" size={22} color="#8B4513" />
          </TouchableOpacity>
        )}
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

          <ThemedView style={styles.leyendaRow}>
            <ThemedView style={styles.leyendaItem}>
              <ThemedView style={[styles.colorBox, { backgroundColor: '#D84315' }]} />
              <ThemedText style={styles.leyendaTexto}>Por Pagar</ThemedText>
            </ThemedView>
            <ThemedView style={styles.leyendaItem} />
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

      {/* Modal de Configuración de Mesas */}
      <Modal
        visible={modalConfigVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalConfigVisible(false)}
      >
        <View style={styles.configModalOverlay}>
          <View style={styles.configModalContent}>
            <ThemedView style={styles.configModalHeader}>
              <IconSymbol name="table.furniture" size={28} color="#8B4513" />
              <ThemedText style={styles.configModalTitle}>Configurar Mesas</ThemedText>
            </ThemedView>

            <ThemedText style={styles.configModalSubtitle}>
              Actualmente hay <ThemedText style={{ fontWeight: 'bold', color: '#8B4513' }}>{mesas.length}</ThemedText> mesa{mesas.length !== 1 ? 's' : ''}.
              Ingresa el nuevo número total:
            </ThemedText>

            <TextInput
              style={styles.configInput}
              placeholder="Ej: 10"
              placeholderTextColor="#BBB"
              keyboardType="numeric"
              value={numeroMesasInput}
              onChangeText={setNumeroMesasInput}
              maxLength={2}
              autoFocus
            />

            <ThemedText style={styles.configWarning}>
              ⚠️ Al reducir mesas, las de mayor número serán eliminadas permanentemente.
            </ThemedText>

            <View style={styles.configActions}>
              <TouchableOpacity
                style={styles.configCancelBtn}
                onPress={() => setModalConfigVisible(false)}
                disabled={guardandoConfig}
              >
                <ThemedText style={styles.configCancelText}>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.configSaveBtn, guardandoConfig && { opacity: 0.6 }]}
                onPress={handleGuardarConfig}
                disabled={guardandoConfig}
              >
                {guardandoConfig ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <ThemedText style={styles.configSaveText}>Guardar</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

  // --- Config Modal Styles ---
  configBtn: {
    padding: Layout.spacing.s,
    marginLeft: 'auto',
  },
  configModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  configModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  configModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  configModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  configModalSubtitle: {
    fontSize: 15,
    color: '#555',
    marginBottom: 16,
    lineHeight: 22,
  },
  configInput: {
    height: 60,
    borderWidth: 2,
    borderColor: '#D4A574',
    borderRadius: 14,
    paddingHorizontal: 20,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 14,
    backgroundColor: '#FAFAFA',
  },
  configWarning: {
    fontSize: 13,
    color: '#C0392B',
    backgroundColor: '#FDF3F3',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    lineHeight: 20,
  },
  configActions: {
    flexDirection: 'row',
    gap: 12,
  },
  configCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  configCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  configSaveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#8B4513',
  },
  configSaveText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
});
