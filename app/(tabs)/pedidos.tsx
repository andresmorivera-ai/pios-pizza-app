import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { supabase } from '@/scripts/lib/supabase';
import { useAuth } from '@/utilidades/context/AuthContext';
import { Orden, useOrdenes } from '@/utilidades/context/OrdenesContext';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'; // Importar el tipo de payload
import { router } from 'expo-router'; // Importar router de expo-router
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
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

type TipoPestaña = 'mesas' | 'domicilios' | 'llevar';

export default function OrdenesUnificadasScreen() {
    const { ordenes, actualizarEstadoOrden, eliminarOrden } = useOrdenes();
    const { usuario } = useAuth();
    const insets = useSafeAreaInsets();
    const [pestañaActiva, setPestañaActiva] = useState<TipoPestaña>('mesas');
    const [ordenesGenerales, setOrdenesGenerales] = useState<OrdenGeneral[]>([]);
    const [cargando, setCargando] = useState(false);

    // Cargar órdenes generales desde Supabase
    const cargarOrdenesGenerales = useCallback(async () => {
        setCargando(true);
        try {
            const { data, error } = await supabase
                .from('ordenesgenerales')
                .select('*')
                // Cambio de 'creado_en' a 'created_at' para coincidir con la interfaz
                .order('creado_en', { ascending: false }); // CAMBIO: Usar 'created_at' que es el nombre de la columna en la interfaz y por defecto en Supabase.

            if (error) {
                console.error('Error cargando órdenes generales:', error);
            } else if (data) {
                setOrdenesGenerales(data as OrdenGeneral[]);
            }
        } catch (error) {
            console.error('Error general:', error);
        } finally {
            setCargando(false);
        }
    }, []);

    // Función para manejar las actualizaciones de Realtime
    const handleRealtimeUpdate = (payload: RealtimePostgresChangesPayload<OrdenGeneral>) => {
        console.log('🔔 Cambio en tiempo real en órdenes generales:', payload);

        setOrdenesGenerales(prevOrdenes => {
            const { eventType, new: newRecord, old: oldRecord } = payload;
            let updatedOrdenes = [...prevOrdenes];

            switch (eventType) {
                case 'INSERT':
                    // Se asume que newRecord contiene el objeto OrdenGeneral completo
                    // Se añade al principio para que se vea como la orden más nueva
                    if (newRecord) {
                        updatedOrdenes = [newRecord as OrdenGeneral, ...updatedOrdenes];
                    }
                    break;
                case 'UPDATE':
                    // Se reemplaza el registro por el nuevo
                    if (newRecord) {
                        updatedOrdenes = updatedOrdenes.map(orden =>
                            orden.id === (newRecord as OrdenGeneral).id ? (newRecord as OrdenGeneral) : orden
                        );
                    }
                    break;
                case 'DELETE':
                    // Se filtra y elimina el registro
                    if (oldRecord && oldRecord.id) {
                        updatedOrdenes = updatedOrdenes.filter(orden => orden.id !== oldRecord.id);
                    }
                    break;
                default:
                    // Para otros eventos o si falla la lógica anterior, recargar la lista completa
                    cargarOrdenesGenerales();
                    return prevOrdenes;
            }
            return updatedOrdenes;
        });
    };

    // Cargar órdenes generales al montar y suscribirse a cambios en tiempo real
    useEffect(() => {
        cargarOrdenesGenerales();

        // Suscripción en tiempo real a cambios en ordenesgenerales
        const subscription = supabase
            .channel('ordenes-generales-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*', // Escuchar INSERT, UPDATE y DELETE
                    schema: 'public',
                    table: 'ordenesgenerales'
                },
                handleRealtimeUpdate // Usar la nueva función de manejo directo
            )
            .subscribe();

        return () => {
            // Importante: Desuscribirse al desmontar el componente
            subscription.unsubscribe();
        };
    }, [cargarOrdenesGenerales]); // Dependencia agregada a cargarOrdenesGenerales (aunque es useCallback, es buena práctica)

    // Filtrar órdenes según la pestaña activa
    const ordenesFiltradas = ordenes.filter(orden => {
        return pestañaActiva === 'mesas';
    });

    // Filtrar órdenes generales según tipo
    const ordenesGeneralesFiltradas = ordenesGenerales.filter(orden => {
        if (pestañaActiva === 'domicilios') {
            return orden.tipo.toLowerCase().includes('domicilio');
        } else if (pestañaActiva === 'llevar') {
            return orden.tipo.toLowerCase().includes('llevar');
        }
        return false;
    });

    // Contar órdenes por tipo
    const contadorMesas = ordenes.length;
    const contadorDomicilios = ordenesGenerales.filter(o =>
        o.tipo.toLowerCase().includes('domicilio')
    ).length;
    const contadorLlevar = ordenesGenerales.filter(o =>
        o.tipo.toLowerCase().includes('llevar')
    ).length;

    const calcularTotalOrden = (orden: Orden): number => {
        if (orden.total) return orden.total;

        return orden.productos.reduce((total, producto) => {
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

    const getEstadoColor = (estado: string) => {
        switch (estado) {
            case 'disponible':
                return '#9E9E9E';
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
                return '#FF8C00';
        }
    };

    const getEstadoTexto = (estado: string) => {
        switch (estado) {
            case 'disponible':
                return 'Disponible';
            case 'pendiente':
                return 'Pendiente';
            case 'en_preparacion':
                return 'En Preparación';
            case 'listo':
                return 'Listo';
            case 'pendiente_por_pagar':
                return 'Pendiente por pagar';
            case 'entregado':
                return 'Entregado';
            case 'pago':
                return 'Pagado';
            default:
                return 'Pendiente';
        }
    };

    const handleCambiarEstado = (orden: Orden) => {
        let nuevoEstado: Orden['estado'];
        let tituloBoton: string;

        switch (orden.estado) {
            case 'pendiente':
                return;
            case 'en_preparacion':
                nuevoEstado = 'listo';
                tituloBoton = 'Marcar como Listo';
                break;
            case 'listo':
                nuevoEstado = 'pendiente_por_pagar';
                tituloBoton = 'Marcar como pendiente por pagar';
                break;
            case 'pendiente_por_pagar':
                return;
            case 'disponible':
                return;
            case 'entregado':
                nuevoEstado = 'pago';
                tituloBoton = 'Registrar Pago';
                break;
            default:
                return;
        }

        Alert.alert(
            'Cambiar Estado',
            `¿${tituloBoton} para Mesa ${orden.mesa}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: () => actualizarEstadoOrden(orden.id, nuevoEstado)
                }
            ]
        );
    };

    const handleCambiarEstadoGeneral = async (orden: OrdenGeneral) => {
        let nuevoEstado: string;
        let tituloBoton: string;

        switch (orden.estado) {
            case 'pendiente':
                return;
            case 'en_preparacion':
                nuevoEstado = 'listo';
                tituloBoton = 'Marcar como Listo';
                break;
            case 'listo':
                nuevoEstado = 'pendiente_por_pagar';
                tituloBoton = 'Marcar como pendiente por pagar';
                break;
            case 'pendiente_por_pagar':
                return;
            case 'disponible':
                return;
            case 'entregado':
                nuevoEstado = 'pago';
                tituloBoton = 'Registrar Pago';
                break;
            default:
                return;
        }

        Alert.alert(
            'Cambiar Estado',
            `¿${tituloBoton} para ${orden.tipo}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('ordenesgenerales')
                                .update({ estado: nuevoEstado })
                                .eq('id', orden.id);

                            if (error) {
                                console.error('Error actualizando estado:', error);
                                Alert.alert('Error', 'No se pudo actualizar el estado');
                            } else {
                                // El real-time debería manejar la actualización del estado local, 
                                // pero lo mantenemos para feedback inmediato.
                                setOrdenesGenerales(prev =>
                                    prev.map(o => o.id === orden.id ? { ...o, estado: nuevoEstado } : o)
                                );
                            }
                        } catch (error) {
                            console.error('Error:', error);
                            Alert.alert('Error', 'Ocurrió un error al actualizar');
                        }
                    }
                }
            ]
        );
    };

    const handleEliminarOrden = (orden: Orden) => {
        Alert.alert(
            'Eliminar Orden',
            `¿Estás seguro de eliminar la orden de Mesa ${orden.mesa}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => eliminarOrden(orden.id)
                }
            ]
        );
    };

    const handleEliminarOrdenGeneral = async (ordenId: string, tipo: string) => {
        Alert.alert(
            'Eliminar Orden',
            `¿Estás seguro de eliminar esta orden de ${tipo}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('ordenesgenerales')
                                .delete()
                                .eq('id', ordenId);

                            if (error) {
                                console.error('Error eliminando orden:', error);
                                Alert.alert('Error', 'No se pudo eliminar la orden');
                            } else {
                                // El real-time debería manejar la actualización, pero actualizamos localmente
                                setOrdenesGenerales(prev => prev.filter(o => o.id !== ordenId));
                            }
                        } catch (error) {
                            console.error('Error:', error);
                            Alert.alert('Error', 'Ocurrió un error al eliminar');
                        }
                    }
                }
            ]
        );
    };

    // Renderizar orden de mesa
    const renderOrdenMesa = (orden: Orden) => {
        const totalOrden = calcularTotalOrden(orden);

        return (
            <ThemedView key={orden.id} style={styles.ordenCard}>
                <ThemedView style={styles.ordenHeader}>
                    <ThemedView style={styles.mesaInfo}>
                        <IconSymbol name="table.furniture" size={20} color="#FF8C00" />
                        <ThemedText style={styles.mesaTexto}>Mesa {orden.mesa}</ThemedText>
                    </ThemedView>

                    <ThemedView style={[
                        styles.estadoBadge,
                        { backgroundColor: getEstadoColor(orden.estado) }
                    ]}>
                        <ThemedText style={styles.estadoTexto}>
                            {getEstadoTexto(orden.estado)}
                        </ThemedText>
                    </ThemedView>
                </ThemedView>

                <ThemedView style={styles.totalContainer}>
                    <ThemedText style={styles.totalLabel}>Total:</ThemedText>
                    <ThemedText style={styles.totalValor}>
                        ${totalOrden.toLocaleString('es-CO')}
                    </ThemedText>
                </ThemedView>

                <ThemedView style={styles.productosContainer}>
                    <ThemedText style={styles.productosTitulo}>Productos:</ThemedText>
                    {orden.productos.map((producto, index) => {
                        const partes = producto.split(' X');
                        const productoConPrecio = partes[0];
                        const cantidad = partes[1];
                        const productoLimpio = productoConPrecio.split(' $')[0].trim();

                        return (
                            <ThemedView key={index} style={styles.productoItemContainer}>
                                <ThemedText style={styles.productoItem}>
                                    • {productoLimpio}
                                </ThemedText>
                                {cantidad && (
                                    <ThemedView style={styles.cantidadBadge}>
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
                    <ThemedText style={styles.fechaTexto}>
                        {orden.fechaCreacion.toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </ThemedText>

                    {/* Contenedor de acciones: Botón Agregar Más y Botones de Estado/Eliminar */}
                    <ThemedView style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        {/* Botón para agregar más productos (solo si no está pagada) */}
                        {orden.estado !== 'pago' && (
                            <TouchableOpacity
                                style={styles.agregarMasButton}
                                onPress={() => router.push({
                                    pathname: '/crear-orden',
                                    params: { mesa: orden.mesa }
                                })}
                            >
                                <IconSymbol name="plus.circle.fill" size={34} color="#4CAF50" />
                            </TouchableOpacity>
                        )}
                        
                        <ThemedView style={styles.botonesContainer}>
                            {orden.estado !== 'pago' && orden.estado !== 'pendiente_por_pagar' && orden.estado !== 'disponible' && orden.estado !== 'pendiente' && orden.estado !== 'en_preparacion' && (
                                <TouchableOpacity
                                    style={[
                                        styles.accionButton,
                                        { backgroundColor: getEstadoColor(orden.estado) }
                                    ]}
                                    onPress={() => handleCambiarEstado(orden)}
                                >
                                    <IconSymbol name="checkmark.circle.fill" size={16} color="#fff" />
                                    <ThemedText style={styles.accionButtonTexto}>
                                        {

                                            orden.estado === 'listo' ? 'Entregar' :
                                                'Pagar'
                                        }
                                    </ThemedText>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={styles.eliminarButton}
                                onPress={() => handleEliminarOrden(orden)}
                            >
                                <IconSymbol name="trash" size={16} color="#fff" />
                            </TouchableOpacity>
                        </ThemedView>
                    </ThemedView>
                </ThemedView>
            </ThemedView>
        );
    };

    // Renderizar orden general (domicilios o llevar)
    const renderOrdenGeneral = (orden: OrdenGeneral) => {
        const tipoP = orden.tipo.toLowerCase().includes('domicilio') ? 'domicilios' : 'llevar'; // CAMBIO: Obtener tipo de pestaña

        return (
            <ThemedView key={orden.id} style={styles.ordenCard}>
                <ThemedView style={styles.ordenHeader}>
                    <ThemedView style={styles.mesaInfo}>
                        <IconSymbol
                            name={orden.tipo.includes('Domicilio') ? 'car.fill' : 'bag.fill'}
                            size={20}
                            color="#FF8C00"
                        />
                        <ThemedText style={styles.mesaTexto}>{orden.tipo}</ThemedText>
                    </ThemedView>

                    <ThemedView style={[
                        styles.estadoBadge,
                        { backgroundColor: getEstadoColor(orden.estado) }
                    ]}>
                        <ThemedText style={styles.estadoTexto}>
                            {getEstadoTexto(orden.estado)}
                        </ThemedText>
                    </ThemedView>
                </ThemedView>

                {orden.referencia && (
                    <ThemedView style={styles.referenciaContainer}>
                        <IconSymbol name="info.circle" size={16} color="#666" />
                        <ThemedText style={styles.referenciaTexto}>{orden.referencia}</ThemedText>
                    </ThemedView>
                )}

                <ThemedView style={styles.totalContainer}>
                    <ThemedText style={styles.totalLabel}>Total:</ThemedText>
                    <ThemedText style={styles.totalValor}>
                        ${orden.total.toLocaleString('es-CO')}
                    </ThemedText>
                </ThemedView>

                <ThemedView style={styles.productosContainer}>
                    <ThemedText style={styles.productosTitulo}>Productos:</ThemedText>
                    {orden.productos.map((producto, index) => {
                        const partes = producto.split(' X');
                        const productoConPrecio = partes[0];
                        const cantidad = partes[1];
                        const productoLimpio = productoConPrecio.split(' $')[0].trim();

                        return (
                            <ThemedView key={index} style={styles.productoItemContainer}>
                                <ThemedText style={styles.productoItem}>
                                    • {productoLimpio}
                                </ThemedText>
                                {cantidad && (
                                    <ThemedView style={styles.cantidadBadge}>
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
                    <ThemedText style={styles.fechaTexto}>
                        {new Date(orden.created_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </ThemedText>

                    {/* Contenedor de acciones: Botón Agregar Más y Botones de Estado/Eliminar */}
                    <ThemedView style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        {/* Botón para agregar más productos (solo si no está pagada) */}
                        {orden.estado !== 'pago' && (
                            <TouchableOpacity
                                style={styles.agregarMasButton}
                                onPress={() => router.push({
                                    pathname: '/crear-orden',
                                    // CAMBIO: Pasar idOrden y tipo para la actualización
                                    params: { idOrden: orden.id, tipo: tipoP } 
                                })}
                            >
                                <IconSymbol name="plus.circle.fill" size={34} color="#4CAF50" />
                            </TouchableOpacity>
                        )}
                        
                        <ThemedView style={styles.botonesContainer}>
                            {orden.estado !== 'pago' && orden.estado !== 'pendiente_por_pagar' && orden.estado !== 'disponible' && orden.estado !== 'pendiente' && orden.estado !== 'en_preparacion' &&(
                                <TouchableOpacity
                                style={[
                                    styles.accionButton,
                                    { backgroundColor: getEstadoColor(orden.estado) }
                                ]}
                                onPress={() => handleCambiarEstadoGeneral(orden)}
                            >
                                <IconSymbol name="checkmark.circle.fill" size={16} color="#fff" />
                                <ThemedText style={styles.accionButtonTexto}>
                                    {
                                        orden.estado === 'pendiente' ? 'Comenzar' :
                                            orden.estado === 'en_preparacion' ? 'Listo' :
                                                orden.estado === 'listo' ? 'Entregar' :
                                                    'Pagar'
                                    }
                                </ThemedText>
                            </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={styles.eliminarButton}
                                onPress={() => handleEliminarOrdenGeneral(orden.id, orden.tipo)}
                            >
                                <IconSymbol name="trash" size={16} color="#fff" />
                            </TouchableOpacity>
                        </ThemedView>
                    </ThemedView>
                </ThemedView>
            </ThemedView>
        );
    };

    const contadorTotal = pestañaActiva === 'mesas'
        ? ordenesFiltradas.length
        : ordenesGeneralesFiltradas.length;

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <ThemedView style={[styles.header, { paddingTop: Math.max(insets.top + 60, 60) }]}>
                <ThemedView style={styles.headerTop}>
                    <ThemedText type="title" style={styles.title}>
                        Órdenes
                    </ThemedText>
                    <ThemedView style={styles.contadorContainer}>
                        <ThemedText style={styles.contadorTexto}>
                            {contadorTotal} {contadorTotal === 1 ? 'orden' : 'órdenes'}
                        </ThemedText>
                    </ThemedView>
                </ThemedView>

                {/* Pestañas */}
                <ThemedView style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[
                            styles.tab,
                            pestañaActiva === 'mesas' && styles.tabActiva
                        ]}
                        onPress={() => setPestañaActiva('mesas')}
                    >
                        <IconSymbol
                            name="table.furniture"
                            size={18}
                            color={pestañaActiva === 'mesas' ? '#FF8C00' : '#666'}
                        />
                        <ThemedText style={[
                            styles.tabTexto,
                            pestañaActiva === 'mesas' && styles.tabTextoActivo
                        ]}>
                            Mesas ({contadorMesas})
                        </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.tab,
                            pestañaActiva === 'domicilios' && styles.tabActiva
                        ]}
                        onPress={() => setPestañaActiva('domicilios')}
                    >
                        <IconSymbol
                            name="car.fill"
                            size={18}
                            color={pestañaActiva === 'domicilios' ? '#FF8C00' : '#666'}
                        />
                        <ThemedText style={[
                            styles.tabTexto,
                            pestañaActiva === 'domicilios' && styles.tabTextoActivo
                        ]}>
                            Domicilios ({contadorDomicilios})
                        </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.tab,
                            pestañaActiva === 'llevar' && styles.tabActiva
                        ]}
                        onPress={() => setPestañaActiva('llevar')}
                    >
                        <IconSymbol
                            name="bag.fill"
                            size={18}
                            color={pestañaActiva === 'llevar' ? '#FF8C00' : '#666'}
                        />
                        <ThemedText style={[
                            styles.tabTexto,
                            pestañaActiva === 'llevar' && styles.tabTextoActivo
                        ]}>
                            Llevar ({contadorLlevar})
                        </ThemedText>
                    </TouchableOpacity>
                </ThemedView>
            </ThemedView>

            {/* Lista de órdenes */}
            <ScrollView
                style={styles.listaOrdenes}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 20) }}
            >
                {cargando ? (
                    <ThemedView style={styles.emptyState}>
                        <ThemedText style={styles.emptyStateTexto}>Cargando...</ThemedText>
                    </ThemedView>
                ) : (
                    <>
                        {pestañaActiva === 'mesas' ? (
                            ordenesFiltradas.length === 0 ? (
                                <ThemedView style={styles.emptyState}>
                                    <IconSymbol name="table.furniture" size={64} color="#ccc" />
                                    <ThemedText style={styles.emptyStateTexto}>
                                        No hay órdenes de mesas
                                    </ThemedText>
                                    <ThemedText style={styles.emptyStateSubtexto}>
                                        Las órdenes de mesas aparecerán aquí
                                    </ThemedText>
                                </ThemedView>
                            ) : (
                                ordenesFiltradas.map(renderOrdenMesa)
                            )
                        ) : (
                            ordenesGeneralesFiltradas.length === 0 ? (
                                <ThemedView style={styles.emptyState}>
                                    <IconSymbol
                                        name={pestañaActiva === 'domicilios' ? 'car.fill' : 'bag.fill'}
                                        size={64}
                                        color="#ccc"
                                    />
                                    <ThemedText style={styles.emptyStateTexto}>
                                        No hay órdenes de {pestañaActiva}
                                    </ThemedText>
                                    <ThemedText style={styles.emptyStateSubtexto}>
                                        Las órdenes aparecerán aquí cuando se creen
                                    </ThemedText>
                                </ThemedView>
                            ) : (
                                ordenesGeneralesFiltradas.map(renderOrdenGeneral)
                            )
                        )}
                    </>
                )}
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
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#fff',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#8B4513',
    },
    contadorContainer: {
        backgroundColor: '#FF8C00',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    contadorTexto: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    tabsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: '#f0f0f0',
        gap: 6,
    },
    tabActiva: {
        backgroundColor: '#FFE4CC',
        borderWidth: 2,
        borderColor: '#FF8C00',
    },
    tabTexto: {
        fontSize: 13,
        fontWeight: '500',
        color: '#666',
    },
    tabTextoActivo: {
        color: '#FF8C00',
        fontWeight: '700',
    },
    listaOrdenes: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    ordenCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 16,
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
    mesaInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    mesaTexto: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#8B4513',
    },
    estadoBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    estadoTexto: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
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
    referenciaTexto: {
        fontSize: 12,
        color: '#666',
        flex: 1,
    },
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8B4513',
    },
    totalValor: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#28A745',
    },
    productosContainer: {
        marginBottom: 12,
    },
    productosTitulo: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8B4513',
        marginBottom: 6,
    },
    productoItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    productoItem: {
        fontSize: 14,
        color: '#666',
        flex: 1,
    },
    cantidadBadge: {
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
    ordenFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    fechaTexto: {
        fontSize: 12,
        color: '#999',
    },
    botonesContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    accionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    accionButtonTexto: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    eliminarButton: {
        backgroundColor: '#F44336',
        padding: 8,
        borderRadius: 8,
    },
    // Nuevo estilo para el botón de agregar más productos
    agregarMasButton: {
        padding: 4,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
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
});