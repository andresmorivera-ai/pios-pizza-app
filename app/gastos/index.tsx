import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { Colors } from '@/configuracion/constants/theme';
import { supabase } from '@/scripts/lib/supabase';
import { useColorScheme } from '@/utilidades/hooks/use-color-scheme';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Gasto {
    id: string;
    nombre: string;
    concepto: string;
    valor: number;
    fecha: string;
    bolsillo_id?: number; // Nuevo campo opcional
}

interface Bolsillo {
    id: number;
    nombre: string;
    saldo: number;
}

export default function GastosScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const [gastos, setGastos] = useState<Gasto[]>([]);
    const [bolsillos, setBolsillos] = useState<Bolsillo[]>([]); // Estado para bolsillos
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [guardando, setGuardando] = useState(false);

    // Estado del formulario
    const [nombre, setNombre] = useState('');
    const [concepto, setConcepto] = useState('');
    const [valor, setValor] = useState('');
    const [valorFormateado, setValorFormateado] = useState('');
    const [selectedBolsilloIds, setSelectedBolsilloIds] = useState<number[]>([]); // Array de IDs

    useEffect(() => {
        cargarGastos();
        cargarBolsillos(); // Cargar bolsillos al inicio
    }, []);

    const cargarGastos = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('gastos')
                .select('*')
                .order('fecha', { ascending: false });

            if (error) throw error;

            setGastos(data || []);
        } catch (error) {
            console.error('Error cargando gastos:', error);
            Alert.alert('Error', 'No se pudieron cargar los gastos');
        } finally {
            setLoading(false);
        }
    };

    const cargarBolsillos = async () => {
        const { data, error } = await supabase.from('bolsillos').select('id, nombre, saldo').order('nombre');
        if (data) setBolsillos(data as any[]); // Tipado rápido
    };

    // Manejo de selección inteligente
    const toggleBolsillo = (id: number) => {
        const montoGasto = parseFloat(valor) || 0;
        if (montoGasto === 0) {
            Alert.alert('Define el valor', 'Primero ingresa el valor del gasto');
            return;
        }

        const bolsillo = bolsillos.find(b => b.id === id);
        if (!bolsillo) return;

        // Caso 1: Ya está seleccionado, lo deseleccionamos
        if (selectedBolsilloIds.includes(id)) {
            setSelectedBolsilloIds(prev => prev.filter(pId => pId !== id));
            return;
        }

        // Calcular saldo actual de los ya seleccionados
        const saldoActualSeleccionado = selectedBolsilloIds.reduce((sum, pId) => {
            const b = bolsillos.find(x => x.id === pId);
            return sum + (b?.saldo || 0);
        }, 0);

        // Si con lo que ya tengo + el nuevo ME PASO o LLEGO, genial. 
        // Pero la regla del usuario: "si gasto es mayor... mensaje... deja elegir 2"

        // Lógica simplificada:
        // Si no hay nada seleccionado:
        if (selectedBolsilloIds.length === 0) {
            if (bolsillo.saldo >= montoGasto) {
                // Alcanza con uno solo -> Selección única
                setSelectedBolsilloIds([id]);
            } else {
                // No alcanza -> Selección única + Alerta + Modo múltiple iniciado (implícito)
                setSelectedBolsilloIds([id]);
                Alert.alert(
                    'Saldo Insuficiente',
                    `En "${bolsillo.nombre}" tienes $${bolsillo.saldo.toLocaleString('es-CO')}. Te faltan $${(montoGasto - bolsillo.saldo).toLocaleString('es-CO')}.\n\nSelecciona otros bolsillos para completar.`
                );
            }
        } else {
            // Ya hay selección (estamos en modo múltiple o completando)
            // Simplemente agregamos el nuevo
            setSelectedBolsilloIds(prev => [...prev, id]);
        }
    };

    const agregarGasto = async () => {
        if (!nombre || !valor) {
            Alert.alert('Faltan datos', 'Por favor completa el nombre y el valor');
            return;
        }

        if (selectedBolsilloIds.length === 0) {
            Alert.alert('Selecciona un Bolsillo', 'Debes elegir de qué bolsillo(s) sale el dinero.');
            return;
        }

        const valorNumerico = parseFloat(valor);

        // Validar saldo total
        // CORRECCIÓN: Respetar el orden de selección (selectedBolsilloIds) para que la lógica de descuento sea FIFO
        const bolsillosSeleccionados = selectedBolsilloIds
            .map(id => bolsillos.find(b => b.id === id))
            .filter((b): b is Bolsillo => b !== undefined);

        const saldoTotalDisponible = bolsillosSeleccionados.reduce((sum, b) => sum + b.saldo, 0);

        if (saldoTotalDisponible < valorNumerico) {
            Alert.alert(
                'Saldo Insuficiente Total',
                `Has seleccionado bolsillos con un total de $${saldoTotalDisponible.toLocaleString('es-CO')}, pero el gasto es de $${valorNumerico.toLocaleString('es-CO')}.`
            );
            return;
        }

        try {
            setGuardando(true);

            // 1. Insertar Gasto 
            // Usamos el ID del primer bolsillo como referencia principal
            const primaryPocketId = selectedBolsilloIds[0];

            const { data: gastoData, error: gastoError } = await supabase
                .from('gastos')
                .insert([
                    {
                        nombre,
                        concepto: concepto || 'Sin descripción',
                        valor: valorNumerico,
                        fecha: new Date().toISOString(),
                        bolsillo_id: primaryPocketId
                    },
                ])
                .select()
                .single();

            if (gastoError) throw gastoError;

            // 2. Descontar de los bolsillos (Lógica de reparto)
            let remanente = valorNumerico;

            for (const bolsillo of bolsillosSeleccionados) {
                if (remanente <= 0) break;

                // Cuánto sacamos de este bolsillo? Lo que tenga, o lo que falte.
                const aDescontar = Math.min(bolsillo.saldo, remanente);

                // Actualizar Saldo DB
                const nuevoSaldo = bolsillo.saldo - aDescontar;
                const { error: updateError } = await supabase
                    .from('bolsillos')
                    .update({ saldo: nuevoSaldo })
                    .eq('id', bolsillo.id);

                if (updateError) throw updateError;

                // Registrar Transacción
                await supabase.from('bolsillos_transacciones').insert([{
                    bolsillo_id: bolsillo.id,
                    monto: -aDescontar,
                    concepto: `Gasto: ${nombre}${selectedBolsilloIds.length > 1 ? ' (Pago compartido)' : ''}`
                }]);

                remanente -= aDescontar;
            }

            // Recargar lista gastos
            setGastos([gastoData, ...gastos]);

            // Actualizar bolsillos locales
            await cargarBolsillos(); // Recargar fresh data

            setModalVisible(false);
            limpiarFormulario();
            Alert.alert('Éxito', 'Gasto registrado correctamente.');

        } catch (error: any) {
            console.error('Error guardando gasto:', error);
            Alert.alert('Error', error.message || 'No se pudo guardar el gasto');
        } finally {
            setGuardando(false);
        }
    };

    const limpiarFormulario = () => {
        setNombre('');
        setConcepto('');
        setValor('');
        setValorFormateado('');
        setSelectedBolsilloIds([]);
    };

    const formatearNumero = (texto: string) => {
        const soloNumeros = texto.replace(/[^0-9]/g, '');
        if (soloNumeros === '') {
            setValor('');
            setValorFormateado('');
            return;
        }
        setValor(soloNumeros);
        const numeroFormateado = parseInt(soloNumeros).toLocaleString('es-CO');
        setValorFormateado(numeroFormateado);
    };

    const renderItem = ({ item }: { item: Gasto }) => (
        <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.cardIcon}>
                <IconSymbol name="cart.fill" size={24} color="#F57C00" />
            </View>
            <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{item.nombre}</Text>
                <Text style={[styles.cardSubtitle, { color: theme.icon }]}>{item.concepto}</Text>
            </View>
            <View style={styles.cardRight}>
                <Text style={[styles.cardAmount, { color: '#D32F2F' }]}>
                    -${item.valor.toLocaleString('es-CO')}
                </Text>
                <Text style={[styles.cardDate, { color: theme.icon }]}>
                    {new Date(item.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="arrow.left" size={28} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Gastos</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.tint} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={gastos}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Text style={[styles.emptyText, { color: theme.icon }]}>
                            No hay gastos registrados
                        </Text>
                    }
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
            >
                <IconSymbol name="plus.circle.fill" size={60} color={theme.tint} />
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Nuevo Gasto</Text>

                        <TextInput
                            style={[styles.input, { color: theme.text, borderColor: theme.icon }]}
                            placeholder="Nombre (ej. Tomates)"
                            placeholderTextColor={theme.icon}
                            value={nombre}
                            onChangeText={setNombre}
                        />

                        <TextInput
                            style={[styles.input, { color: theme.text, borderColor: theme.icon }]}
                            placeholder="Concepto (opcional)"
                            placeholderTextColor={theme.icon}
                            value={concepto}
                            onChangeText={setConcepto}
                        />

                        <View style={styles.inputValorContainer}>
                            <View style={[styles.inputValorWrapper, { borderColor: theme.icon }]}>
                                <Text style={[styles.pesosSimbolo, { color: theme.tint }]}>$</Text>
                                <TextInput
                                    style={[styles.inputValor, { color: theme.text }]}
                                    placeholder="0"
                                    placeholderTextColor={theme.icon}
                                    value={valorFormateado}
                                    onChangeText={formatearNumero}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        {/* SELECTOR DE BOLSILLO */}
                        <Text style={{ marginBottom: 10, fontWeight: 'bold', color: theme.text }}>¿De qué bolsillo(s) sale?</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, maxHeight: 60 }}>
                            {bolsillos.map(b => {
                                const selectionIndex = selectedBolsilloIds.indexOf(b.id);
                                const isSelected = selectionIndex !== -1;

                                // Calcular indicativo de "Se vacía"
                                let willEmpty = false;
                                let deductionOrderLabel = '';

                                if (isSelected && valor) {
                                    const montoGasto = parseFloat(valor) || 0;
                                    // Sumar saldo de los anteriores en la lista de seleccionados para saber cuánto falta cuando llegue a mí
                                    let saldoAnterior = 0;
                                    for (let i = 0; i < selectionIndex; i++) {
                                        const prevId = selectedBolsilloIds[i];
                                        const prevB = bolsillos.find(pb => pb.id === prevId);
                                        if (prevB) saldoAnterior += prevB.saldo;
                                    }

                                    const remanente = montoGasto - saldoAnterior;
                                    if (remanente > 0) {
                                        // Si todavía falta plata cuando llega mi turno
                                        const descuento = Math.min(b.saldo, remanente);
                                        if (descuento >= b.saldo) willEmpty = true;
                                    }
                                    deductionOrderLabel = `#${selectionIndex + 1}`;
                                }

                                return (
                                    <TouchableOpacity
                                        key={b.id}
                                        onPress={() => toggleBolsillo(b.id)}
                                        style={{
                                            backgroundColor: isSelected ? theme.tint : '#EEE',
                                            paddingHorizontal: 15,
                                            paddingVertical: 10,
                                            borderRadius: 20,
                                            marginRight: 10,
                                            borderWidth: 1,
                                            borderColor: isSelected ? theme.tint : '#DDD',
                                            flexDirection: 'row',
                                            alignItems: 'center'
                                        }}
                                    >
                                        {isSelected && (
                                            <View style={{
                                                backgroundColor: '#FFF',
                                                borderRadius: 10,
                                                width: 20,
                                                height: 20,
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                marginRight: 8
                                            }}>
                                                <Text style={{ color: theme.tint, fontWeight: 'bold', fontSize: 12 }}>
                                                    {selectionIndex + 1}
                                                </Text>
                                            </View>
                                        )}
                                        <View>
                                            <Text style={{ color: isSelected ? '#FFF' : '#333', fontWeight: '500' }}>
                                                {b.nombre}
                                            </Text>
                                            <Text style={{ fontSize: 10, color: isSelected ? '#EEE' : '#666' }}>
                                                ${b.saldo.toLocaleString('es-CO')}
                                            </Text>
                                            {willEmpty && (
                                                <Text style={{
                                                    fontSize: 10,
                                                    color: '#FFCDD2',
                                                    fontWeight: 'bold',
                                                    marginTop: 2
                                                }}>
                                                    ¡Se vacía!
                                                </Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                )
                            })}
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonCancel]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.buttonTextCancel}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: theme.tint }]}
                                onPress={agregarGasto}
                                disabled={guardando}
                            >
                                {guardando ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonTextConfirm}>Guardar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
    backButton: { marginRight: 15 },
    title: { fontSize: 24, fontWeight: 'bold' },
    listContent: { padding: 20, paddingBottom: 100 },
    card: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    cardIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    cardContent: { flex: 1 },
    cardRight: { alignItems: 'flex-end' },
    cardTitle: { fontSize: 16, fontWeight: 'bold' },
    cardSubtitle: { fontSize: 14, marginBottom: 2 },
    cardDate: { fontSize: 12, marginTop: 4 },
    cardAmount: { fontSize: 16, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16 },
    fab: { position: 'absolute', bottom: 150, alignSelf: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5, zIndex: 999 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 15, fontSize: 16 },
    inputValorContainer: { marginBottom: 15 },
    inputValorWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, backgroundColor: '#F8F9FA' },
    pesosSimbolo: { fontSize: 24, fontWeight: 'bold', marginRight: 8 },
    inputValor: { flex: 1, fontSize: 20, fontWeight: '600', padding: 0 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    button: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
    buttonCancel: { backgroundColor: '#FFEBEE' },
    buttonTextCancel: { color: '#D32F2F', fontWeight: 'bold' },
    buttonTextConfirm: { color: '#fff', fontWeight: 'bold' },
});
