import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { CalendarioRango } from '@/componentes/ui/CalendarioRango';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { supabase } from '@/scripts/lib/supabase';
import { obtenerHistorialVentas, VentaCompleta } from '@/servicios-api/ventas';
import { useOrdenes } from '@/utilidades/context/OrdenesContext';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const extractErrorMessage = (error: unknown) => {
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

const formatShortDate = (date: Date) =>
  `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${date.getFullYear()}`;

const isSameDay = (date1: Date, date2: Date) =>
  date1.getFullYear() === date2.getFullYear() &&
  date1.getMonth() === date2.getMonth() &&
  date1.getDate() === date2.getDate();

const getTodayRange = () => {
  const ahora = new Date();
  const referencia = new Date(ahora);
  referencia.setHours(5, 0, 0, 0);
  if (ahora < referencia) {
    referencia.setDate(referencia.getDate() - 1);
  }
  const inicioDia = new Date(referencia);
  const finDia = new Date(referencia);
  finDia.setDate(finDia.getDate() + 1);
  finDia.setMilliseconds(finDia.getMilliseconds() - 1);
  return { inicioDia, finDia };
};

const isTodayRange = (inicio: Date, fin: Date) => {
  const todayRange = getTodayRange();
  return (
    inicio.getTime() === todayRange.inicioDia.getTime() &&
    fin.getTime() === todayRange.finDia.getTime()
  );
};

const isSameDayRange = (inicio: Date, fin: Date) => {
  return isSameDay(inicio, fin);
};

export default function ReportesScreen() {
  const { ordenes, ordenesEntregadas } = useOrdenes();
  const [ordenesExpandidas, setOrdenesExpandidas] = useState<Set<string>>(new Set());
  const [ventas, setVentas] = useState<VentaCompleta[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [totalGastos, setTotalGastos] = useState(0);
  const [cargandoVentas, setCargandoVentas] = useState(true);
  const [cargandoGastos, setCargandoGastos] = useState(true);
  const [errorVentas, setErrorVentas] = useState<string | null>(null);
  const [calendarioVisible, setCalendarioVisible] = useState(false);
  const [rangoSeleccionado, setRangoSeleccionado] = useState(() => getTodayRange());
  const [vistaActiva, setVistaActiva] = useState<'ventas' | 'gastos'>('ventas');
  const [finalizarDiaVisible, setFinalizarDiaVisible] = useState(false);
  const [confirmacionVisible, setConfirmacionVisible] = useState(false);
  const [resumenVisible, setResumenVisible] = useState(false);
  const [montoAhorrar, setMontoAhorrar] = useState(0);
  const [bolsillos, setBolsillos] = useState<any[]>([]);
  const [asignacionesBolsillos, setAsignacionesBolsillos] = useState<Record<number, number>>({}); // bolsilloId -> monto
  const [bolsilloEditando, setBolsilloEditando] = useState<number | null>(null);
  const [montoTemporal, setMontoTemporal] = useState('');
  const [creandoNuevoBolsillo, setCreandoNuevoBolsillo] = useState(false);
  const [nombreNuevoBolsillo, setNombreNuevoBolsillo] = useState('');
  const [mostrarAhorros, setMostrarAhorros] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [isDayFinalized, setIsDayFinalized] = useState(false); // Estado para controlar visualización de Caja en 0
  const insets = useSafeAreaInsets();

  const esHoyRange = useMemo(() => isTodayRange(rangoSeleccionado.inicioDia, rangoSeleccionado.finDia), [rangoSeleccionado]);
  const esSingleDayRange = useMemo(
    () => isSameDayRange(rangoSeleccionado.inicioDia, rangoSeleccionado.finDia),
    [rangoSeleccionado]
  );

  const fechaBoton = esHoyRange
    ? formatShortDate(rangoSeleccionado.inicioDia)
    : esSingleDayRange
      ? formatShortDate(rangoSeleccionado.inicioDia)
      : `Desde ${formatShortDate(rangoSeleccionado.inicioDia)}\nHasta ${formatShortDate(rangoSeleccionado.finDia)}`;

  const cargarVentas = useCallback(async (range: { inicioDia: Date; finDia: Date }) => {
    try {
      setCargandoVentas(true);
      setErrorVentas(null);


      const ventasCargadas = await obtenerHistorialVentas(
        range.inicioDia.toISOString(),
        range.finDia.toISOString()
      );

      setVentas(ventasCargadas);
    } catch (error) {
      const message = extractErrorMessage(error);
      setErrorVentas(`No se pudieron cargar las ventas: ${message}`);
    } finally {
      setCargandoVentas(false);
    }
  }, []);

  const cargarGastos = useCallback(async (range?: { inicioDia: Date; finDia: Date }) => {
    try {
      setCargandoGastos(true);


      let query = supabase
        .from('gastos')
        .select('*')
        .order('fecha', { ascending: false });

      if (range) {
        query = query
          .gte('fecha', range.inicioDia.toISOString())
          .lte('fecha', range.finDia.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;


      setGastos(data || []);
      const total = (data || []).reduce((sum: number, gasto: any) => sum + (gasto.valor || 0), 0);
      setTotalGastos(total);

    } catch (error) {
      console.error('Error cargando gastos:', error);
      setTotalGastos(0);
    } finally {
      setCargandoGastos(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    const todayRange = getTodayRange();
    setRangoSeleccionado(todayRange);
    cargarVentas(todayRange);
    cargarGastos(todayRange);
    return () => {
      setRangoSeleccionado(getTodayRange());
    };
  }, [cargarVentas, cargarGastos]));

  const ordenesPagadasFallback = ordenesEntregadas.filter(orden => orden.metodoPago);
  const ventasComoOrdenes: Orden[] = ventas.map(venta => {
    const productosFormateados = venta.productos.map(p => {
      return `${p.nombre} $${p.precioUnitario} X${p.cantidad}`;
    });
    return {
      id: venta.id,
      mesa: venta.mesa,
      productos: productosFormateados,
      total: venta.total,
      estado: 'pago' as const,
      fechaCreacion: new Date(venta.fecha_hora),
      fechaEntrega: new Date(venta.fecha_hora),
      metodoPago: venta.metodo_pago as 'daviplata' | 'nequi' | 'efectivo' | 'tarjeta',
      idVenta: venta.id_venta,
    };
  });
  const ordenesParaMostrar = ventasComoOrdenes.length > 0 ? ventasComoOrdenes : ordenesPagadasFallback;
  const totalGanancias =
    ventas.length > 0
      ? ventas.reduce((total, venta) => total + (venta.total || 0), 0)
      : ordenesPagadasFallback.reduce((total, orden) => total + (orden.total || 0), 0);
  const balance = totalGanancias - totalGastos;
  const totalOrdenesPagadas = ventas.length > 0 ? ventas.length : ordenesPagadasFallback.length;
  const totalOrdenes = ordenes.length + totalOrdenesPagadas;
  const ordenesCanceladas = ordenes.filter(o => o.estado === 'cancelado').length;

  /* Estado para historial de Caja (Filtrado por rango) */
  const [historialCajaVisible, setHistorialCajaVisible] = useState(false);
  const [transaccionesCaja, setTransaccionesCaja] = useState<any[]>([]); // Tipo any para unificación rápida
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  /* Estado para creación diferida de bolsillos */
  const [nuevosBolsillosTemporales, setNuevosBolsillosTemporales] = useState<{ id: string; nombre: string; saldo: number }[]>([]);

  // Combinar bolsillos reales y temporales para renderizar
  const todosBolsillos = useMemo(() => {
    return [...bolsillos, ...nuevosBolsillosTemporales];
  }, [bolsillos, nuevosBolsillosTemporales]);

  // Cargar bolsillos cuando se abre el modal de resumen
  useEffect(() => {
    if (resumenVisible) {
      cargarBolsillos();
      // Limpiar asignaciones previas
      setAsignacionesBolsillos({});
      setBolsilloEditando(null);
      setMontoTemporal('');
      setCreandoNuevoBolsillo(false);
      setNombreNuevoBolsillo('');
      setNuevosBolsillosTemporales([]); // Resetear bolsillos temporales
    }
  }, [resumenVisible]);

  const cargarBolsillos = async () => {
    try {
      const { data, error } = await supabase
        .from('bolsillos')
        .select('id, nombre, saldo')
        .neq('nombre', 'Ganancias') // Excluir Ganancias
        .order('nombre');

      if (error) throw error;
      setBolsillos(data || []);
    } catch (error) {
      console.error('Error cargando bolsillos:', error);
    }
  };

  const fetchMovimientosCaja = async () => {
    setCargandoHistorial(true);
    setTransaccionesCaja([]);
    try {
      const inicio = rangoSeleccionado.inicioDia.toISOString();
      const fin = rangoSeleccionado.finDia.toISOString();

      // 1. Fetch Transacciones (Filtradas por fecha)
      const { data: transaccionesData, error: txError } = await supabase
        .from('bolsillos_transacciones')
        .select('*, bolsillos(nombre)')
        .gte('created_at', inicio)
        .lte('created_at', fin)
        .order('created_at', { ascending: false });

      if (txError) throw txError;

      // 2. Fetch Gastos (Filtrados por fecha)
      const { data: gastosData, error: gastosError } = await supabase
        .from('gastos')
        .select(`
            id,
            created_at:fecha, 
            valor, 
            concepto, 
            nombre,
            bolsillo_id,
            bolsillos(nombre)
        `)
        .gte('fecha', inicio)
        .lte('fecha', fin)
        .order('fecha', { ascending: false });

      if (gastosError) throw gastosError;

      // 3. Unificar (Lógica idéntica a AhorrosScreen)
      const transaccionesFiltradas = (transaccionesData || []).filter(tx =>
        !tx.concepto?.startsWith('Gasto: ')
      );

      const gastosFormateados = (gastosData || []).map(g => ({
        id: `gasto_${g.id}`,
        created_at: g.created_at || new Date().toISOString(),
        monto: -Math.abs(g.valor),
        concepto: `Gasto: ${g.nombre} ${g.concepto && g.concepto !== 'Sin descripción' ? `(${g.concepto})` : ''}`,
        bolsillos: g.bolsillos
      }));

      const listaUnificada = [...transaccionesFiltradas, ...gastosFormateados].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setTransaccionesCaja(listaUnificada);
      setHistorialCajaVisible(true);

    } catch (error) {
      console.error('Error cargando historial caja:', error);
      Alert.alert('Error', 'No se pudo cargar el historial.');
    } finally {
      setCargandoHistorial(false);
    }
  };

  const productosParaContar = ventasComoOrdenes.length > 0 ? ventasComoOrdenes : ordenesEntregadas;
  const productosCount: Record<string, number> = {};
  productosParaContar.forEach(orden => {
    orden.productos.forEach(producto => {
      productosCount[producto] = (productosCount[producto] || 0) + 1;
    });
  });

  const productosMasPedidos = Object.entries(productosCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const getMetodoPagoInfo = (metodoPago?: string) => {
    switch (metodoPago) {
      case 'daviplata':
        return { nombre: 'Daviplata', color: '#FF6B35', icono: 'phone.fill' };
      case 'nequi':
        return { nombre: 'Nequi', color: '#00BFA5', icono: 'phone.fill' };
      case 'efectivo':
        return { nombre: 'Efectivo', color: '#4CAF50', icono: 'banknote.fill' };
      case 'tarjeta':
        return { nombre: 'Tarjeta', color: '#2196F3', icono: 'creditcard.fill' };
      default:
        return { nombre: 'No especificado', color: '#999', icono: 'questionmark.circle' };
    }
  };

  const renderEstadistica = (titulo: string, valor: number, icono: string, color: string) => (
    <ThemedView key={titulo} style={[styles.estadisticaCard, { borderLeftColor: color }]}>
      <ThemedView style={styles.estadisticaHeader}>
        <IconSymbol name={icono as any} size={24} color={color} />
        <ThemedText style={styles.estadisticaTitulo}>{titulo}</ThemedText>
      </ThemedView>
      <ThemedText style={[styles.estadisticaValor, { color }]}>{valor}</ThemedText>
    </ThemedView>
  );

  const renderProductoMasPedido = (producto: string, cantidad: number, index: number) => {
    const nombreLimpio = producto.split(' $')[0].trim();

    return (
      <ThemedView key={producto} style={styles.productoItem}>
        <ThemedView style={styles.productoRanking}>
          <ThemedText style={styles.productoNumero}>#{index + 1}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.productoInfo}>
          <ThemedText style={styles.productoNombre}>{nombreLimpio}</ThemedText>
          <ThemedText style={styles.productoCantidad}>{cantidad} pedidos</ThemedText>
        </ThemedView>
        {index === 0 && (
          <ThemedText style={styles.coronaIcono}>👑</ThemedText>
        )}
      </ThemedView>
    );
  };

  const toggleOrdenExpandida = (ordenId: string) => {
    setOrdenesExpandidas(prev => {
      const nuevaSet = new Set(prev);
      if (nuevaSet.has(ordenId)) {
        nuevaSet.delete(ordenId);
      } else {
        nuevaSet.add(ordenId);
      }
      return nuevaSet;
    });
  };

  const calcularTotalOrden = (productos: string[]): number => {
    return productos.reduce((total, producto) => {
      const precioMatch = producto.match(/\$(\d+)/);
      const cantidadMatch = producto.match(/X(\d+)/);

      if (precioMatch) {
        const precioUnitario = parseInt(precioMatch[1]);
        const cantidad = cantidadMatch ? parseInt(cantidadMatch[1]) : 1;
        return total + (precioUnitario * cantidad);
      }

      return total;
    }, 0);
  };

  const renderOrdenEntregada = (orden: Orden) => {
    const isExpandida = ordenesExpandidas.has(orden.id);
    const totalVenta = orden.total || calcularTotalOrden(orden.productos);
    const metodoPagoInfo = getMetodoPagoInfo(orden.metodoPago);

    return (
      <ThemedView key={orden.id} style={styles.ordenEntregadaCard}>
        <ThemedView style={styles.ordenCompacta}>
          <ThemedView style={styles.ordenCompactaRow}>
            <ThemedView style={styles.mesaBadge}>
              <IconSymbol name="table.furniture" size={16} color="#fff" />
              <ThemedText style={styles.mesaBadgeTexto}>Mesa {orden.mesa}</ThemedText>
            </ThemedView>

            {orden.idVenta && (
              <ThemedText style={styles.idVentaTexto}>ID: {orden.idVenta}</ThemedText>
            )}

            <ThemedText style={styles.ordenTotalVenta}>
              ${totalVenta.toLocaleString('es-CO')}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.ordenInfoRow}>
            <ThemedText style={styles.ordenHora}>
              {orden.fechaEntrega?.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
              })} - {orden.fechaEntrega?.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit'
              })}
            </ThemedText>

            <ThemedView style={[styles.metodoPagoBadge, { backgroundColor: metodoPagoInfo.color }]}>
              <IconSymbol name={metodoPagoInfo.icono as any} size={14} color="#fff" />
              <ThemedText style={styles.metodoPagoTexto}>{metodoPagoInfo.nombre}</ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        <TouchableOpacity
          style={styles.detallesButton}
          onPress={() => toggleOrdenExpandida(orden.id)}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.detallesTexto}>Detalles</ThemedText>
          <IconSymbol
            name={isExpandida ? "chevron.up" : "chevron.down"}
            size={18}
            color="#8B4513"
          />
        </TouchableOpacity>

        {isExpandida && (
          <ThemedView style={styles.ordenExpandida}>
            <ThemedView style={styles.divider} />

            <ThemedView style={styles.ordenProductos}>
              <ThemedText style={styles.ordenProductosTitulo}>Productos:</ThemedText>
              {orden.productos.map((producto, index) => {
                const partes = producto.split(' X');
                const productoConPrecio = partes[0];
                const cantidad = partes[1];
                const productoLimpio = productoConPrecio.split(' $')[0].trim();

                return (
                  <ThemedView key={`${orden.id}-prod-${index}`} style={styles.productoDetalleContainer}>
                    <ThemedText style={styles.ordenProductoItem}>
                      • {productoLimpio}
                    </ThemedText>
                    {cantidad && (
                      <ThemedView style={styles.cantidadBadgeReporte}>
                        <ThemedText style={styles.cantidadBadgeTexto}>
                          X{cantidad}
                        </ThemedText>
                      </ThemedView>
                    )}
                  </ThemedView>
                );
              })}
            </ThemedView>

            <ThemedView style={styles.ordenFooter}>
              <IconSymbol name="checkmark.circle.fill" size={16} color="#28A745" />
              <ThemedText style={styles.ordenEstadoTexto}>Entregada</ThemedText>
            </ThemedView>
          </ThemedView>
        )}
      </ThemedView>
    );
  };

  const handleAplicarRango = (inicio: Date, fin: Date) => {
    const nuevoRango = { inicioDia: inicio, finDia: fin };
    setRangoSeleccionado(nuevoRango);
    cargarVentas(nuevoRango);
    cargarGastos(nuevoRango);
  };


  const handleGuardarGanancias = async () => {
    try {
      // Calcular total asignado
      const totalAsignado = Object.values(asignacionesBolsillos).reduce((sum, monto) => sum + monto, 0);

      // Validación: No se puede asignar más de lo que hay en ventas (Usuario solicitó base Ventas)
      if (totalAsignado > totalGanancias) {
        Alert.alert(
          '❌ Mmm no te alcanza',
          `Has asignado $${totalAsignado.toLocaleString('es-CO')} pero tus ventas son $${totalGanancias.toLocaleString('es-CO')}.`,
          [{ text: 'Entendido', style: 'default' }]
        );
        return;
      }

      setGuardando(true);

      // 1. Procesar Bolsillos Temporales (Crearlos en BD)
      const mapaIdTemporalAReal: Record<string, string> = {}; // { temp_123: real_uuid }

      for (const tempBolsillo of nuevosBolsillosTemporales) {
        // Solo creamos el bolsillo si tiene fondos asignados
        const montoAsignado = asignacionesBolsillos[tempBolsillo.id] || 0;

        if (montoAsignado > 0) {
          // Insertar en BD
          const { data: nuevoBolsilloData, error: errorInsert } = await supabase
            .from('bolsillos')
            .insert([{ nombre: tempBolsillo.nombre, saldo: 0 }]) // Saldo inicial 0, se le suma luego
            .select()
            .single();

          if (errorInsert) throw errorInsert;

          if (nuevoBolsilloData) {
            mapaIdTemporalAReal[tempBolsillo.id] = nuevoBolsilloData.id;
          }
        }
      }

      // 2. Procesar cada asignación (existentes y nuevos)
      for (const [bolsilloIdStr, monto] of Object.entries(asignacionesBolsillos)) {
        if (monto <= 0) continue;

        let bolsilloIdReal: number | null = null;

        // Verificar si es ID temporal
        if (bolsilloIdStr.startsWith('temp_')) {
          const idRealStr = mapaIdTemporalAReal[bolsilloIdStr];
          if (idRealStr) {
            bolsilloIdReal = parseInt(idRealStr); // Asumiendo que el ID de Supabase es numeric/int8. 
            // Si es UUID, usar string. En pios-pizza parece ser int4/int8 por el parseInt original.
            // El código original usaba parseInt(bolsilloIdStr).
            // Si el nuevo ID viene de supabase insert, será number.
          }
        } else {
          bolsilloIdReal = parseInt(bolsilloIdStr);
        }

        if (!bolsilloIdReal) continue; // Si no se pudo resolver el ID, saltar.

        // Obtener saldo actual actualizado para seguridad
        const { data: bData, error: bError } = await supabase
          .from('bolsillos')
          .select('saldo')
          .eq('id', bolsilloIdReal)
          .single();

        if (bError && !bError.message.includes('No rows')) throw bError;
        const saldoActual = bData ? bData.saldo : 0;

        // Actualizar saldo del bolsillo
        const nuevoSaldo = saldoActual + monto;
        const { error: errorUpdate } = await supabase
          .from('bolsillos')
          .update({ saldo: nuevoSaldo })
          .eq('id', bolsilloIdReal);

        if (errorUpdate) throw errorUpdate;

        // Registrar transacción
        await supabase.from('bolsillos_transacciones').insert([{
          bolsillo_id: bolsilloIdReal,
          monto: monto,
          concepto: 'Ahorro Cierre de Día'
        }]);
      }

      // calcular remanente y finalizar
      const remanente = totalGanancias - totalAsignado;
      const fechaHoy = new Date().toLocaleDateString('es-ES');

      if (remanente > 0) {
        // Buscar o crear bolsillo "Ganancias"
        const { data: bolsilloGanancias, error: fetchError } = await supabase
          .from('bolsillos')
          .select('*')
          .eq('nombre', 'Ganancias')
          .single();

        let gananciasBolsilloId: number;

        if (fetchError || !bolsilloGanancias) {
          // Crear bolsillo "Ganancias" si no existe
          const { data: nuevoBolsillo, error: createError } = await supabase
            .from('bolsillos')
            .insert([{ nombre: 'Ganancias', saldo: 0 }])
            .select()
            .single();

          if (createError) throw createError;
          gananciasBolsilloId = nuevoBolsillo!.id;
        } else {
          gananciasBolsilloId = bolsilloGanancias.id;
        }

        // Obtener saldo actual y actualizar
        const { data: bolsilloActual } = await supabase
          .from('bolsillos')
          .select('saldo')
          .eq('id', gananciasBolsilloId)
          .single();

        const saldoActual = bolsilloActual ? bolsilloActual.saldo : 0;

        await supabase
          .from('bolsillos')
          .update({ saldo: saldoActual + remanente })
          .eq('id', gananciasBolsilloId);

        // Registrar transacción
        await supabase.from('bolsillos_transacciones').insert([{
          bolsillo_id: gananciasBolsilloId,
          monto: remanente,
          concepto: `Ganancias día ${fechaHoy}`
        }]);
      }

      // Limpiar estados
      setResumenVisible(false);
      setAsignacionesBolsillos({});
      setBolsilloEditando(null);
      setMontoTemporal('');
      setCreandoNuevoBolsillo(false);
      setNombreNuevoBolsillo('');
      setNuevosBolsillosTemporales([]);

      // Recargar ventas y gastos para actualizar Caja a 0
      await cargarVentas(rangoSeleccionado);
      await cargarGastos(rangoSeleccionado);
      setIsDayFinalized(true); // Marcar como finalizado para mostrar Caja en 0

      Alert.alert('✅ Éxito', 'Día finalizado correctamente.');

    } catch (error) {
      console.error('Error al guardar ganancias:', error);
      Alert.alert('Error', 'Hubo un problema al guardar los datos.');
    } finally {
      setGuardando(false);
    }
  };

  const checkStatusDia = async () => {
    if (!esHoyRange) {
      // Si no es hoy, no bloqueamos el botón "estrictamente" por estado, 
      // pero la UI ya lo oculta. 
      // Sin embargo, si quisiéramos ver si ESE día histórico se cerró:
      // setIsDayFinalized(true/false) based on query.
      // Por ahora, el usuario pide consistencia para "Hoy".
      // Aún así, es bueno chequear si ya hay movimientos de cierre en este rango.
    }

    try {
      const inicio = rangoSeleccionado.inicioDia.toISOString();
      const fin = rangoSeleccionado.finDia.toISOString();

      // Buscamos si existe alguna transacción de "Cierre" en este rango
      // Conceptos clave: "Ahorro Cierre de Día" OR "Ganancias día..."
      const { data, error } = await supabase
        .from('bolsillos_transacciones')
        .select('id, concepto')
        .gte('created_at', inicio)
        .lte('created_at', fin)
        .or('concepto.eq.Ahorro Cierre de Día,concepto.ilike.Ganancias día%')
        .limit(1);

      if (error) {
        console.error('Error verificando status dia:', error);
        return;
      }

      if (data && data.length > 0) {
        setIsDayFinalized(true);
      } else {
        setIsDayFinalized(false);
      }

    } catch (err) {
      console.error('Error en checkStatusDia:', err);
    }
  };

  useEffect(() => {
    checkStatusDia();
  }, [rangoSeleccionado]);


  const handleFinalizarDia = () => {
    setConfirmacionVisible(false);
    setResumenVisible(true);
  };




  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={[styles.header, { paddingTop: Math.max(insets.top + 60, 60) }]}>
        <ThemedView style={styles.headerTitleContainer}>
          <ThemedText type="title" style={styles.title}>
            Reportes
          </ThemedText>
          {esHoyRange && (
            <TouchableOpacity
              style={[styles.powerButton, (totalGanancias <= 0 || isDayFinalized) && { opacity: 0.5, borderColor: '#CCC' }]}
              onPress={() => {
                if (totalGanancias <= 0 || isDayFinalized) {
                  Alert.alert(
                    'No disponible',
                    'No hay saldo en caja para finalizar o el día ya ha sido cerrado.'
                  );
                  return;
                }
                setConfirmacionVisible(true);
              }}
              activeOpacity={0.7}
            >
              <IconSymbol
                name="power.circle.fill"
                size={22}
                color={(totalGanancias <= 0 || isDayFinalized) ? "#CCC" : "#D32F2F"}
              />
            </TouchableOpacity>
          )}
        </ThemedView>
        <ThemedView style={styles.dateRow}>
          <TouchableOpacity style={styles.dateButton} onPress={() => setCalendarioVisible(true)}>
            <IconSymbol name="calendar" size={20} color="#8B4513" />
            <ThemedText style={styles.fechaTexto}>{fechaBoton}</ThemedText>
            <IconSymbol name="chevron.down" size={16} color="#8B4513" />
          </TouchableOpacity>
          {esHoyRange && (
            <ThemedText style={styles.hoyBadge}>Hoy</ThemedText>
          )}
        </ThemedView>
      </ThemedView>

      {errorVentas && (
        <ThemedView style={styles.errorBanner}>
          <ThemedText style={styles.errorBannerText}>{errorVentas}</ThemedText>
        </ThemedView>
      )}


      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 20) }}
      >
        {/* Dashboard Financiero */}
        <ThemedView style={styles.dashboardFinanciero}>
          {/* Tarjeta de Ventas - Clickeable */}
          <TouchableOpacity
            style={styles.tarjetaGanancias}
            onPress={() => router.push({
              pathname: '/desglose-ventas',
              params: {
                fechaInicio: rangoSeleccionado.inicioDia.toISOString(),
                fechaFin: rangoSeleccionado.finDia.toISOString()
              }
            })}
            activeOpacity={0.7}
          >
            <ThemedView style={styles.tarjetaHeader}>
              <IconSymbol name="arrow.up.circle.fill" size={32} color="#28A745" />
              <ThemedText style={styles.tarjetaTitulo}>Ventas</ThemedText>
            </ThemedView>
            <ThemedText style={styles.tarjetaValor}>
              ${totalGanancias.toLocaleString('es-CO')}
            </ThemedText>
            <ThemedView style={styles.tarjetaFooter}>
              <IconSymbol name="checkmark.circle" size={14} color="#28A745" />
              <ThemedText style={styles.tarjetaSubtexto}>
                {totalOrdenesPagadas} órdenes pagadas
              </ThemedText>
              <IconSymbol name="chevron.right" size={16} color="#28A745" style={{ marginLeft: 'auto' }} />
            </ThemedView>
          </TouchableOpacity>

          {/* Indicador de Ganancias Guardadas (Solo visible si finalizado) */}
          {isDayFinalized && (
            <ThemedView style={{
              position: 'absolute',
              top: -10,
              right: -5,
              backgroundColor: '#FFB900', // Dorado
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              elevation: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 3,
              zIndex: 10
            }}>
              <IconSymbol name="lock.fill" size={12} color="#FFF" />
              <ThemedText style={{ fontSize: 10, fontWeight: 'bold', color: '#FFF' }}>
                GUARDADO EN AHORROS
              </ThemedText>
            </ThemedView>
          )}

          {/* Tarjeta de Gastos */}
          <TouchableOpacity
            style={styles.tarjetaGastos}
            onPress={() => router.push('/gastos')}
            activeOpacity={0.7}
          >
            <ThemedView style={styles.tarjetaHeader}>
              <IconSymbol name="arrow.down.circle.fill" size={32} color="#DC3545" />
              <ThemedText style={styles.tarjetaTituloGastos}>Gastos</ThemedText>
            </ThemedView>
            <ThemedText style={styles.tarjetaValorGastos}>
              ${totalGastos.toLocaleString('es-CO')}
            </ThemedText>
            <ThemedView style={styles.tarjetaFooter}>
              <IconSymbol name="cart.fill" size={14} color="#DC3545" />
              <ThemedText style={styles.tarjetaSubtextoGastos}>
                {gastos.length} {esHoyRange ? 'gastos hoy' : 'gastos en período'}
              </ThemedText>
              <IconSymbol name="chevron.right" size={16} color="#DC3545" style={{ marginLeft: 'auto' }} />
            </ThemedView>
          </TouchableOpacity>

          {/* Tarjeta de Caja (Click para ver historial filtrado) */}
          <TouchableOpacity
            style={styles.tarjetaBalance}
            activeOpacity={0.7}
            onPress={() => fetchMovimientosCaja()}
          >
            <ThemedView style={styles.tarjetaHeader}>
              <IconSymbol name="chart.line.uptrend.xyaxis" size={30} color="#FF8C00" />
              <ThemedText style={styles.tarjetaTituloBalance}>Caja</ThemedText>
            </ThemedView>
            <ThemedText style={styles.tarjetaValorBalance}>
              ${balance.toLocaleString('es-CO')}
            </ThemedText>
            <ThemedView style={styles.balanceBarra}>
              <ThemedView style={[styles.barraGanancias, { width: totalGastos === 0 ? '100%' : `${(totalGanancias / (totalGanancias + totalGastos)) * 100}%` }]} />
            </ThemedView>
            <ThemedView style={styles.balanceInfo}>
              <ThemedText style={styles.balanceInfoTexto}>
                <ThemedText style={styles.balanceGanancia}>▲ Ganancias Netas </ThemedText>
                {totalGastos > 0 && <ThemedText style={styles.balanceGasto}>▼ Gastos</ThemedText>}
              </ThemedText>
            </ThemedView>
          </TouchableOpacity>
        </ThemedView>

        {/* Estadísticas de Órdenes */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Estado de Órdenes</ThemedText>
          <ThemedView style={styles.estadisticasGrid}>
            {renderEstadistica('Total', totalOrdenes, 'list.clipboard.fill', '#FF8C00')}
            {renderEstadistica('Canceladas', ordenesCanceladas, 'xmark.circle.fill', '#DC3545')}
            {renderEstadistica('Pagadas', totalOrdenesPagadas, 'checkmark.circle.fill', '#28A745')}
          </ThemedView>
        </ThemedView>

        {/* Productos Más Pedidos */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Productos Más Pedidos</ThemedText>
          {productosMasPedidos.length > 0 ? (
            <ThemedView style={styles.productosLista}>
              {productosMasPedidos.map(([producto, cantidad], index) => (
                <View key={`producto-${index}-${producto}`}>
                  {renderProductoMasPedido(producto, cantidad, index)}
                </View>
              ))}
            </ThemedView>
          ) : (
            <ThemedView style={styles.emptyState}>
              <IconSymbol name="chart.bar" size={48} color="#ccc" />
              <ThemedText style={styles.emptyStateTexto}>
                No hay datos de productos
              </ThemedText>
              <ThemedText style={styles.emptyStateSubtexto}>
                Los reportes aparecerán cuando se creen órdenes
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>

        {/* Historial de Ventas */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Historial de Ventas</ThemedText>
          {cargandoVentas ? (
            <ThemedView style={styles.emptyState}>
              <ActivityIndicator size="large" color="#FF8C00" />
              <ThemedText style={styles.emptyStateTexto}>
                Cargando ventas...
              </ThemedText>
            </ThemedView>
          ) : ordenesParaMostrar.length > 0 ? (
            <ThemedView style={styles.ordenesEntregadasLista}>
              {ordenesParaMostrar.slice().reverse().map((orden) => (
                <View key={orden.id}>
                  {renderOrdenEntregada(orden)}
                </View>
              ))}
            </ThemedView>
          ) : (
            <ThemedView style={styles.emptyState}>
              <IconSymbol name="creditcard" size={48} color="#ccc" />
              <ThemedText style={styles.emptyStateTexto}>
                No hay ventas registradas aún
              </ThemedText>
              <ThemedText style={styles.emptyStateSubtexto}>
                El historial aparecerá cuando se procesen pagos
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>


      </ScrollView>

      {/* Modal de Confirmación */}
      <Modal
        visible={confirmacionVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmacionVisible(false)}
      >
        <ThemedView style={styles.modalOverlay}>
          <ThemedView style={styles.confirmacionModal}>
            <IconSymbol name="exclamationmark.triangle.fill" size={48} color="#FF8C00" />
            <ThemedText style={styles.confirmacionTitulo}>¿Finalizar el día?</ThemedText>
            <ThemedText style={styles.confirmacionMensaje}>
              Se mostrará el resumen del día con las ventas y gastos totales
            </ThemedText>
            <ThemedView style={styles.confirmacionBotones}>
              <TouchableOpacity
                style={styles.botonCancelar}
                onPress={() => setConfirmacionVisible(false)}
              >
                <ThemedText style={styles.botonCancelarTexto}>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.botonConfirmar}
                onPress={handleFinalizarDia}
              >
                <ThemedText style={styles.botonConfirmarTexto}>Confirmar</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </Modal>

      {/* Modal de Resumen del Día */}
      <Modal
        visible={resumenVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResumenVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ThemedView style={styles.modalOverlay}>
            <ThemedView style={styles.resumenModal}>
              <ThemedView style={styles.resumenHeaderCompact}>
                <IconSymbol name="star.fill" size={24} color="#FFD700" />
                <ThemedText style={styles.resumenTituloCompact}>Resumen del Día</ThemedText>
                <ThemedText style={styles.resumenFechaCompact}>
                  {new Date().toLocaleDateString('es-ES', {
                    weekday: 'short', day: 'numeric', month: 'long'
                  })}
                </ThemedText>
              </ThemedView>

              <ScrollView
                style={styles.resumenDashboard}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Caja Section - Prominent */}
                <ThemedView style={styles.balanceSection}>
                  <ThemedText style={styles.balanceLabel}>CAJA TOTAL</ThemedText>
                  <View style={styles.balanceValueContainer}>
                    <CountUp value={balance} prefix='$' color='#F57F17' delay={1600} />
                  </View>
                </ThemedView>

                {/* Stats Grid */}
                <ThemedView style={styles.statsGrid}>
                  <ThemedView style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
                    <IconSymbol name="arrow.up.circle.fill" size={24} color="#28A745" />
                    <ThemedText style={[styles.statLabel, { color: '#1B5E20' }]}>Ventas</ThemedText>
                    <View style={styles.statValueCompact}>
                      <CountUp value={totalGanancias} prefix='$' color='#2E7D32' delay={0} />
                    </View>
                  </ThemedView>

                  <ThemedView style={[styles.statCard, { backgroundColor: '#FFEBEE' }]}>
                    <IconSymbol name="arrow.down.circle.fill" size={24} color="#DC3545" />
                    <ThemedText style={[styles.statLabel, { color: '#B71C1C' }]}>Gastos</ThemedText>
                    <View style={styles.statValueCompact}>
                      <CountUp value={totalGastos} prefix='$' color='#C62828' delay={800} />
                    </View>
                  </ThemedView>
                </ThemedView>

                {/* Pocket Allocation Section */}
                {/* Pocket Allocation Section */}
                <View style={styles.ahorroSection}>
                  {/* Botón Acordeón AHORRAR */}
                  <TouchableOpacity
                    style={styles.ahorrarAccordionButton}
                    onPress={() => setMostrarAhorros(!mostrarAhorros)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <IconSymbol name="cube.box.fill" size={28} color="#FFF" />
                      <ThemedText style={styles.ahorrarButtonText}>AHORRAR</ThemedText>
                    </View>
                    <IconSymbol
                      name={mostrarAhorros ? "chevron.up" : "chevron.down"}
                      size={24}
                      color="#FFF"
                    />
                  </TouchableOpacity>

                  {/* Sección Desplegable de Ahorros */}
                  {mostrarAhorros && (
                    <View style={styles.ahorroSectionContent}>

                      {/* Balance Disponible */}
                      <ThemedView style={styles.balanceDisponibleContainer}>
                        <ThemedText style={styles.balanceDisponibleLabel}>DISPONIBLE A REPARTIR</ThemedText>
                        <View style={styles.disponibleValueWrapper}>
                          <ThemedText style={styles.balanceDisponibleValor}>
                            ${(totalGanancias - Object.values(asignacionesBolsillos).reduce((sum, m) => sum + m, 0)).toLocaleString('es-CO')}
                          </ThemedText>
                          {/* Indicador visual animado */}
                          <View style={styles.pulseIndicator} />
                        </View>
                      </ThemedView>

                      {/* Lista de Bolsillos (Reales + Temporales) */}
                      {todosBolsillos.map(bolsillo => {
                        const montoAsignado = asignacionesBolsillos[bolsillo.id] || 0;
                        const estaEditando = bolsilloEditando === bolsillo.id;
                        const isChecked = montoAsignado > 0;

                        return (
                          <ThemedView key={bolsillo.id} style={styles.bolsilloItem}>
                            <View style={[styles.bolsilloRow, isChecked && styles.bolsilloRowActive]}>

                              {/* Info Bolsillo (Izquierda) */}
                              <TouchableOpacity
                                style={styles.bolsilloInfo}
                                onPress={() => {
                                  if (!isChecked) {
                                    setBolsilloEditando(bolsillo.id);
                                    setMontoTemporal('');
                                  }
                                }}
                              >
                                <ThemedText style={styles.bolsilloNombreText}>{bolsillo.nombre}</ThemedText>
                                <ThemedText style={styles.bolsilloSaldoText}>
                                  En bolsillo: ${bolsillo.saldo.toLocaleString('es-CO')}
                                </ThemedText>
                              </TouchableOpacity>

                              {/* Contenedor Derecho: Input/Monto + Checkbox */}
                              <View style={styles.bolsilloRightContainer}>

                                {/* Si está asignado, mostrar monto */}
                                {isChecked && (
                                  <ThemedText style={styles.montoAsignadoText}>
                                    +${montoAsignado.toLocaleString('es-CO')}
                                  </ThemedText>
                                )}

                                {estaEditando && (
                                  <View style={styles.moneyInputWrapper}>
                                    <ThemedText style={styles.currencySymbol}>$</ThemedText>
                                    <TextInput
                                      style={styles.montoInputCompact}
                                      placeholder="0"
                                      placeholderTextColor="#999"
                                      keyboardType="numeric"
                                      value={montoTemporal}
                                      onChangeText={(text) => {
                                        const rawValue = text.replace(/[^0-9]/g, '');
                                        if (rawValue === '') {
                                          setMontoTemporal('');
                                          return;
                                        }
                                        const formatted = parseInt(rawValue).toLocaleString('es-CO');
                                        setMontoTemporal(formatted);
                                      }}
                                      autoFocus
                                      returnKeyType="done"
                                      onSubmitEditing={() => {
                                        const cleanValue = montoTemporal.replace(/\./g, '');
                                        const monto = parseInt(cleanValue) || 0;

                                        if (monto <= 0) {
                                          setBolsilloEditando(null);
                                          return;
                                        }
                                        const totalActual = Object.values(asignacionesBolsillos).reduce((sum, m) => sum + m, 0);
                                        if (totalActual + monto > totalGanancias) {
                                          Alert.alert('❌ No alcanza', 'Saldo insuficiente.');
                                          return;
                                        }
                                        setAsignacionesBolsillos({ ...asignacionesBolsillos, [bolsillo.id]: monto });
                                        setBolsilloEditando(null);
                                        setMontoTemporal('');
                                      }}
                                    />
                                  </View>
                                )}

                                {/* Checkbox (Siempre a la derecha) */}
                                <TouchableOpacity
                                  style={styles.checkboxContainer}
                                  onPress={() => {
                                    if (isChecked) {
                                      // Desmarcar
                                      const nuevas = { ...asignacionesBolsillos };
                                      delete nuevas[bolsillo.id];
                                      setAsignacionesBolsillos(nuevas);
                                      setBolsilloEditando(null);
                                    } else {
                                      if (!estaEditando) {
                                        // Activar edición
                                        setBolsilloEditando(bolsillo.id);
                                        setMontoTemporal('');
                                      } else {
                                        // CONFIRMAR GUARDADO (Logic Checkmark)
                                        const cleanValue = montoTemporal.replace(/\./g, '');
                                        const monto = parseInt(cleanValue) || 0;

                                        if (monto <= 0) {
                                          setBolsilloEditando(null);
                                          return;
                                        }
                                        const totalActual = Object.values(asignacionesBolsillos).reduce((sum, m) => sum + m, 0);
                                        if (totalActual + monto > totalGanancias) {
                                          Alert.alert('❌ No alcanza', 'Saldo insuficiente.');
                                          return;
                                        }
                                        setAsignacionesBolsillos({ ...asignacionesBolsillos, [bolsillo.id]: monto });
                                        setBolsilloEditando(null);
                                        setMontoTemporal('');
                                      }
                                    }
                                  }}
                                >
                                  <IconSymbol
                                    name={isChecked ? "checkmark.square.fill" : "square"}
                                    size={30}
                                    color={isChecked ? "#28A745" : (estaEditando ? "#3498DB" : "#CCC")}
                                  />
                                </TouchableOpacity>
                              </View>
                            </View>
                          </ThemedView>
                        );
                      })}

                      {/* Lógica Crear Nuevo Bolsillo */}
                      {!creandoNuevoBolsillo ? (
                        <TouchableOpacity
                          style={styles.crearBolsilloButton}
                          onPress={() => {
                            setCreandoNuevoBolsillo(true);
                            setNombreNuevoBolsillo('');
                            setMontoTemporal('');
                          }}
                        >
                          <IconSymbol name="plus.circle.fill" size={20} color="#555" />
                          <ThemedText style={styles.crearBolsilloText}>Crear nuevo bolsillo</ThemedText>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.crearBolsilloContainer}>
                          <ThemedText style={styles.crearBolsilloLabel}>Nuevo Bolsillo:</ThemedText>

                          {/* Paso 1: Nombre */}
                          <TextInput
                            style={styles.nuevoBolsilloInput}
                            placeholder="Nombre del bolsillo"
                            placeholderTextColor="#999"
                            value={nombreNuevoBolsillo}
                            onChangeText={setNombreNuevoBolsillo}
                            autoFocus
                          />

                          {/* Paso 2: Monto (aparece si hay nombre) */}
                          {nombreNuevoBolsillo.length > 0 && (
                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                              <View style={[styles.moneyInputWrapper, { flex: 1, width: 'auto' }]}>
                                <ThemedText style={styles.currencySymbol}>$</ThemedText>
                                <TextInput
                                  style={styles.montoInputCompact}
                                  placeholder="Monto inicial"
                                  placeholderTextColor="#999"
                                  keyboardType="numeric"
                                  value={montoTemporal}
                                  onChangeText={(text) => {
                                    const rawValue = text.replace(/[^0-9]/g, '');
                                    if (rawValue === '') {
                                      setMontoTemporal('');
                                      return;
                                    }
                                    const formatted = parseInt(rawValue).toLocaleString('es-CO');
                                    setMontoTemporal(formatted);
                                  }}
                                />
                              </View>
                              <TouchableOpacity
                                style={styles.checkButton}
                                onPress={() => {
                                  if (!nombreNuevoBolsillo.trim()) return;
                                  const cleanValue = montoTemporal.replace(/\./g, '');
                                  const monto = parseInt(cleanValue) || 0;

                                  // Validar balance
                                  const totalActual = Object.values(asignacionesBolsillos).reduce((sum, m) => sum + m, 0);
                                  if (totalActual + monto > totalGanancias) {
                                    Alert.alert('❌ No alcanza', 'No tienes suficiente saldo disponible.');
                                    return;
                                  }

                                  // CREACIÓN DIFERIDA: Solo local
                                  const tempId = 'temp_' + Date.now();
                                  const nuevoBolsilloTemp = {
                                    id: tempId,
                                    nombre: nombreNuevoBolsillo,
                                    saldo: 0
                                  };

                                  setNuevosBolsillosTemporales(prev => [...prev, nuevoBolsilloTemp]);

                                  if (monto > 0) {
                                    setAsignacionesBolsillos(prev => ({
                                      ...prev,
                                      [tempId]: monto
                                    }));
                                  }

                                  // Resetear form
                                  setCreandoNuevoBolsillo(false);
                                  setNombreNuevoBolsillo('');
                                  setMontoTemporal('');
                                }}
                              >
                                <IconSymbol name="checkmark.circle.fill" size={32} color="#28A745" />
                              </TouchableOpacity>
                            </View>
                          )}
                          <TouchableOpacity
                            onPress={() => setCreandoNuevoBolsillo(false)}
                            style={{ alignSelf: 'flex-end', marginTop: 8 }}
                          >
                            <ThemedText style={{ color: '#999', fontSize: 12 }}>Cancelar</ThemedText>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.finalizarButton, guardando && { opacity: 0.7 }]}
                  onPress={() => handleGuardarGanancias()}
                  disabled={guardando}
                >
                  <ThemedText style={styles.finalizarButtonText}>
                    {guardando ? 'Guardando...' : 'Finalizar y Guardar'}
                  </ThemedText>
                  {!guardando && <IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelarResumenButton}
                  onPress={() => {
                    setResumenVisible(false);
                    setMontoAhorrar(0);
                  }}
                >
                  <ThemedText style={styles.cancelarResumenText}>Cancelar</ThemedText>
                </TouchableOpacity>
              </ScrollView>
            </ThemedView>
          </ThemedView>
        </KeyboardAvoidingView>
      </Modal >

      {/* Modal de Historial de Caja */}
      <Modal
        visible={historialCajaVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHistorialCajaVisible(false)}
      >
        <ThemedView style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <ThemedView style={{
            backgroundColor: '#FFF',
            height: '80%',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20
          }}>
            <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <View>
                <ThemedText type="subtitle" style={{ color: '#333' }}>Historial del Período</ThemedText>
                <ThemedText style={{ fontSize: 12, color: '#666' }}>
                  {rangoSeleccionado.inicioDia.toLocaleDateString()} - {rangoSeleccionado.finDia.toLocaleDateString()}
                </ThemedText>
              </View>
              <TouchableOpacity onPress={() => setHistorialCajaVisible(false)}>
                <IconSymbol name="xmark.circle.fill" size={28} color="#CCC" />
              </TouchableOpacity>
            </ThemedView>

            <ScrollView>
              {cargandoHistorial ? (
                <ActivityIndicator size="large" color="#FF8C00" style={{ marginTop: 50 }} />
              ) : transaccionesCaja.length === 0 ? (
                <ThemedText style={{ textAlign: 'center', color: '#888', marginTop: 50 }}>
                  No hay movimientos en este período.
                </ThemedText>
              ) : (
                transaccionesCaja.map((tx) => (
                  <ThemedView key={tx.id} style={{
                    padding: 15,
                    backgroundColor: '#F9F9F9',
                    borderRadius: 10,
                    marginBottom: 10
                  }}>
                    <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <ThemedView style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {!tx.bolsillos && <IconSymbol name="trash" size={14} color="#999" />}
                        <ThemedText style={{ fontWeight: 'bold', color: tx.bolsillos ? '#555' : '#999', fontStyle: tx.bolsillos ? 'normal' : 'italic' }}>
                          {tx.bolsillos?.nombre || 'Bolsillo Eliminado'}
                        </ThemedText>
                      </ThemedView>
                      <ThemedText style={{ color: tx.monto >= 0 ? '#3CB371' : '#FF3B30', fontWeight: 'bold' }}>
                        {tx.monto >= 0 ? '+' : ''}{parseInt(tx.monto).toLocaleString('es-CO')}
                      </ThemedText>
                    </ThemedView>
                    <ThemedText style={{ color: '#333', marginTop: 5 }}>{tx.concepto}</ThemedText>
                    <ThemedText style={{ color: '#999', fontSize: 12, marginTop: 5 }}>
                      {new Date(tx.created_at).toLocaleString()}
                    </ThemedText>
                  </ThemedView>
                ))
              )}
            </ScrollView>
          </ThemedView>
        </ThemedView>
      </Modal>

      {/* Modal de Calendario */}
      < CalendarioRango
        visible={calendarioVisible}
        onClose={() => setCalendarioVisible(false)
        }
        onSelectRange={handleAplicarRango}
        fechaInicio={rangoSeleccionado.inicioDia}
        fechaFin={rangoSeleccionado.finDia}
      />
    </ThemedView >
  );
}




// Componente de animación CountUp independiente con soporte para delay
const CountUp = ({ value, prefix = '', color = '#8B4513', delay = 0 }: { value: number; prefix?: string; color?: string; delay?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setDisplayValue(end);
      return;
    }

    const duration = 1500;
    // Iniciamos la animación después del delay
    const timeoutId = setTimeout(() => {
      const startTime = performance.now();
      let animationFrameId: number;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing: easeOutExpo
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

        const current = Math.round(start + (end - start) * ease);
        setDisplayValue(current);

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate);
        }
      };

      animationFrameId = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]);

  return (
    <ThemedText style={{ fontSize: 24, fontWeight: 'bold', color: color }}>
      {prefix}{displayValue.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
    </ThemedText>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  powerButton: {
    padding: 4,
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#D32F2F',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  fechaTexto: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hoyBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D84315',
  },
  errorBanner: {
    backgroundColor: '#FFF0F0',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FF8C00',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  errorBannerText: {
    color: '#8B0000',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  dashboardFinanciero: {
    marginBottom: 20,
  },
  tarjetaGanancias: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#28A745',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tarjetaGastos: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#DC3545',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tarjetaBalance: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#FF8C00',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tarjetaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tarjetaTitulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28A745',
  },
  tarjetaTituloGastos: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#DC3545',
  },
  tarjetaTituloBalance: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF8C00',
  },
  tarjetaValor: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#28A745',
    marginBottom: 6,
  },
  tarjetaValorGastos: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#DC3545',
    marginBottom: 6,
  },
  tarjetaValorBalance: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF8C00',
    marginBottom: 6,
  },
  tarjetaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    width: '100%',
  },
  tarjetaSubtexto: {
    fontSize: 13,
    color: '#28A745',
    fontWeight: '500',
  },
  tarjetaSubtextoGastos: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  balanceBarra: {
    height: 6,
    backgroundColor: '#FFE0B2',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barraGanancias: {
    height: '100%',
    backgroundColor: '#28A745',
    borderRadius: 8,
  },
  balanceInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  balanceInfoTexto: {
    fontSize: 12,
  },
  balanceGanancia: {
    color: '#28A745',
    fontWeight: 'bold',
  },
  balanceGasto: {
    color: '#DC3545',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 16,
  },
  estadisticasGrid: {
    gap: 12,
  },
  estadisticaCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderLeftWidth: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  estadisticaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  estadisticaTitulo: {
    fontSize: 16,
    color: '#8B4513',
    fontWeight: '600',
  },
  estadisticaValor: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  productosLista: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  productoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productoRanking: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  productoNumero: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  productoInfo: {
    flex: 1,
  },
  productoNombre: {
    fontSize: 16,
    color: '#8B4513',
    fontWeight: '600',
  },
  productoCantidad: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  coronaIcono: {
    fontSize: 32,
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateTexto: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B4513',
    marginTop: 16,
  },
  emptyStateSubtexto: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  ordenesEntregadasLista: {
    gap: 12,
  },
  ordenEntregadaCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#28A745',
  },
  ordenCompacta: {
    marginBottom: 8,
  },
  ordenCompactaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mesaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF8C00',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mesaBadgeTexto: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  ordenTotalVenta: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#28A745',
  },
  idVentaTexto: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'center',
  },
  ordenHora: {
    fontSize: 13,
    color: '#999',
  },
  detallesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginTop: 4,
  },
  detallesTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
  },
  ordenExpandida: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 12,
  },
  productoDetalleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  cantidadBadgeReporte: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  cantidadBadgeTexto: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  ordenProductos: {
    marginBottom: 12,
  },
  ordenProductosTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 6,
  },
  ordenProductoItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
    flex: 1,
    flexWrap: 'wrap',
  },
  ordenFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  ordenEstadoTexto: {
    fontSize: 13,
    color: '#28A745',
    fontWeight: '600',
  },
  ordenInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metodoPagoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metodoPagoTexto: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  finalizarDiaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#DC143C',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    elevation: 6,
    shadowColor: '#DC143C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  finalizarDiaTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmacionModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '85%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  confirmacionTitulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8B4513',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmacionMensaje: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  confirmacionBotones: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  botonCancelar: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  botonCancelarTexto: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  botonConfirmar: {
    flex: 1,
    backgroundColor: '#FF8C00',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  botonConfirmarTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resumenModal: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  resumenHeaderCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resumenTituloCompact: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  resumenFechaCompact: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
    borderLeftWidth: 1,
    borderLeftColor: '#ccc',
    paddingLeft: 8,
    marginLeft: 4,
  },
  resumenDashboard: {
    gap: 16,
  },
  balanceSection: {
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFD54F',
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F57F17',
    letterSpacing: 1,
    marginBottom: 4,
  },
  balanceValueContainer: {
    transform: [{ scale: 1.2 }],
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  statValueCompact: {
    transform: [{ scale: 0.9 }],
  },
  statValueText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  ahorroSection: {
    marginTop: 8,
    // Eliminado fondo y padding para limpieza visual
  },
  ahorroInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 44,
  },
  ahorroInputCompact: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  balanceRestanteText: {
    fontSize: 11,
    color: '#666',
    marginTop: 6,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  bolsilloSelectorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  bolsillosScroll: {
    marginBottom: 12,
  },
  bolsilloChip: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#DDD',
    minWidth: 100,
  },
  bolsilloChipSelected: {
    backgroundColor: '#FF8C00',
    borderColor: '#FF8C00',
  },
  bolsilloChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  bolsilloChipTextSelected: {
    color: '#FFF',
  },
  bolsilloChipSaldo: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  bolsilloChipSaldoSelected: {
    color: '#FFE0B2',
  },
  bolsilloChipNuevo: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#FF8C00',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bolsilloChipNuevoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF8C00',
  },

  finalizarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF8C00',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 20,
    elevation: 4,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  finalizarButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelarResumenButton: {
    marginTop: 12,
    alignItems: 'center',
    padding: 8,
  },
  balanceDisponibleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F6F3', // Mint/Teal light suave
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#1ABC9C', // Borde Teal vibrante
    elevation: 2,
    shadowColor: '#16A085',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  disponibleValueWrapper: {
    alignItems: 'flex-end',
  },
  pulseIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1ABC9C', // Led Teal
    marginTop: 4,
  },
  bolsilloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 4, // Padding externo para el row
    gap: 8,
  },
  bolsilloRowActive: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFC107',
    borderWidth: 1.5,
  },
  checkboxContainer: {
    padding: 12,
  },
  bolsilloInfo: {
    flex: 1,
    paddingVertical: 12,
  },
  crearBolsilloContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF8C00',
    marginTop: 8,
    gap: 12,
  },
  crearBolsilloLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF8C00',
  },
  nuevoBolsilloInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    fontSize: 16,
  },
  balanceDisponibleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  balanceDisponibleValor: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28A745',
  },
  bolsilloItem: {
    marginBottom: 12,
  },
  bolsilloNombre: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  bolsilloNombreConAsignacion: {
    backgroundColor: '#FFF5E6',
    borderColor: '#FF8C00',
    borderWidth: 2,
  },
  bolsilloNombreText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  bolsilloSaldoText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  montoAsignadoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF8C00',
  },
  inputConCheckContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  montoInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
  },
  checkButton: {
    padding: 4,
  },
  crearBolsilloButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F8F8F8', // Gris claro (Igual a bolsilloRow)
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0', // Borde gris suave
    // borderStyle: 'solid', // Default
    marginTop: 8,
  },
  crearBolsilloText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333', // Texto oscuro estándar
  },
  cancelarResumenText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  ahorrarAccordionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#3498DB', // Dodger Blue (Azul Claro Vibrante)
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#2980B9',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  ahorrarButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  ahorroSectionContent: {
    marginBottom: 16,
  },
  bolsilloRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  moneyInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: 110,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 4,
  },
  montoInputCompact: {
    flex: 1,
    padding: 0, // Remove default padding
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});
