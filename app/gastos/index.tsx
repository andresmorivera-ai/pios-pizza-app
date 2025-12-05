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
}

export default function GastosScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const [gastos, setGastos] = useState<Gasto[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [guardando, setGuardando] = useState(false);

    // Estado del formulario
    const [nombre, setNombre] = useState('');
    const [concepto, setConcepto] = useState('');
    const [valor, setValor] = useState('');
    const [valorFormateado, setValorFormateado] = useState('');

    useEffect(() => {
        cargarGastos();
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

    const agregarGasto = async () => {
        if (!nombre || !valor) {
            Alert.alert('Faltan datos', 'Por favor completa el nombre y el valor');
            return;
        }

        try {
            setGuardando(true);
            const valorNumerico = parseFloat(valor);

            // Obtener fecha/hora actual del dispositivo
            const fechaActual = new Date();

            const { data, error } = await supabase
                .from('gastos')
                .insert([
                    {
                        nombre,
                        concepto: concepto || 'Sin descripción',
                        valor: valorNumerico,
                        fecha: fechaActual.toISOString(), // Usar fecha/hora local del dispositivo
                    },
                ])
                .select()
                .single();

            if (error) throw error;

            setGastos([data, ...gastos]);
            setModalVisible(false);
            limpiarFormulario();
            Alert.alert('Éxito', 'Gasto registrado correctamente');
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
    };

    const formatearNumero = (texto: string) => {
        // Remover todo excepto números
        const soloNumeros = texto.replace(/[^0-9]/g, '');

        if (soloNumeros === '') {
            setValor('');
            setValorFormateado('');
            return;
        }

        // Guardar el valor numérico sin formato
        setValor(soloNumeros);

        // Formatear con separador de miles
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
                    -${item.valor.toLocaleString()}
                </Text>
                <Text style={[styles.cardDate, { color: theme.icon }]}>
                    {(() => {
                        const fecha = new Date(item.fecha);
                        const horaFormateada = fecha.toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        const fechaFormateada = fecha.toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit'
                        });
                        return `${fechaFormateada} - ${horaFormateada}`;
                    })()}
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

            {/* Botón Flotante */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
            >
                <IconSymbol name="plus.circle.fill" size={60} color={theme.tint} />
            </TouchableOpacity>

            {/* Modal de Agregar Gasto */}
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
                            {valorFormateado && (
                                <Text style={[styles.valorAyuda, { color: theme.icon }]}>
                                    ${valorFormateado} COP
                                </Text>
                            )}
                        </View>

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
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        marginRight: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cardIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF3E0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    cardContent: {
        flex: 1,
    },
    cardRight: {
        alignItems: 'flex-end',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    cardSubtitle: {
        fontSize: 14,
        marginBottom: 2,
    },
    cardDate: {
        fontSize: 12,
        marginTop: 4,
    },
    cardAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
    },
    fab: {
        position: 'absolute',
        bottom: 150,
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 999,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        marginBottom: 15,
        fontSize: 16,
    },
    inputValorContainer: {
        marginBottom: 15,
    },
    inputValorWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        backgroundColor: '#F8F9FA',
    },
    pesosSimbolo: {
        fontSize: 24,
        fontWeight: 'bold',
        marginRight: 8,
    },
    inputValor: {
        flex: 1,
        fontSize: 20,
        fontWeight: '600',
        padding: 0,
    },
    valorAyuda: {
        fontSize: 12,
        marginTop: 6,
        marginLeft: 4,
        fontStyle: 'italic',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    button: {
        flex: 1,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    buttonCancel: {
        backgroundColor: '#FFEBEE',
    },
    buttonTextCancel: {
        color: '#D32F2F',
        fontWeight: 'bold',
    },
    buttonTextConfirm: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
