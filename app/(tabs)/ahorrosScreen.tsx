import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { supabase } from '@/scripts/lib/supabase';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- FUNCIONES DE UTILIDAD DE FORMATO (SIN CAMBIOS) ---

/**
 * Formatea un número a formato de Pesos Colombianos (COP) con separadores de miles.
 * Ej: 1234567.89 -> "$1.234.567,89"
 * @param value El número a formatear (puede ser string o number).
 * @returns El string formateado.
 */
const formatCOP = (value: number | string): string => {
    // Asegura que es un número (o 0 si no es válido)
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '$0';

    // Formatear usando Intl.NumberFormat para COP (locale 'es-CO')
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(num);
};

/**
 * Limpia un string de formato COP para obtener solo el valor numérico (number).
 * Esto es necesario para los inputs donde se escribe el valor.
 * @param formattedValue El string formateado (ej: "1.234.567,89").
 * @returns El número flotante limpio (ej: 1234567.89).
 */
const cleanFormatToNumber = (formattedValue: string): number => {
    // 1. Elimina todo lo que no sea dígito o coma (,)
    let cleanText = formattedValue.replace(/[^\d,]/g, '');
    
    // 2. Reemplaza la coma decimal (,) por el punto decimal (.)
    cleanText = cleanText.replace(',', '.');
    
    return parseFloat(cleanText) || 0;
};

// INTERFAZ 1: DATO CRUDO RECIBIDO DE SUPABASE (SALDO VIENE COMO STRING)
interface BolsilloRaw {
    id: number;
    nombre: string;
    saldo: string;
    created_at: string;
}

// INTERFAZ 2: ESTADO DE REACT (SALDO ES NUMERO)
interface Bolsillo {
    id: number;
    nombre: string;
    saldo: number;
    created_at: string;
}

type TransactionType = 'guardar' | 'quitar';

export default function AhorrosScreen() {
    const insets = useSafeAreaInsets();
    const [bolsillos, setBolsillos] = useState<Bolsillo[]>([]);
    const [cargando, setCargando] = useState(false);
    // @ts-ignore
    const navigation = useNavigation();

    // Estados para Modales y Transacciones
    const [isAddPocketModalVisible, setAddPocketModalVisible] = useState(false);
    const [newPocketName, setNewPocketName] = useState('');

    // Estados para Transacciones (sin Picker)
    const [isTransactionModalVisible, setTransactionModalVisible] = useState(false);
    const [transactionType, setTransactionType] = useState<TransactionType>('guardar');
    
    // amount ahora guarda el valor NUMÉRICO, y amountFormatted guarda el string formateado para el input.
    const [amount, setAmount] = useState<number>(0); 
    const [amountFormatted, setAmountFormatted] = useState<string>(''); // Nuevo estado para el input
    
    const [activePocketForTransaction, setActivePocketForTransaction] = useState<Bolsillo | null>(null);
    const [concept, setConcept] = useState('');

    // Estados para Edición y Eliminación
    const [isEditPocketModalVisible, setEditPocketModalVisible] = useState(false);
    const [editingPocket, setEditingPocket] = useState<Bolsillo | null>(null);
    const [editingPocketName, setEditingPocketName] = useState('');

    // Super Total (Calculado en tiempo real)
    const superTotal = useMemo(() => {
        return bolsillos.reduce((sum, pocket) => sum + (pocket.saldo || 0), 0);
    }, [bolsillos]);

    // Lógica de BackHandler (SIN CAMBIOS)
    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                // @ts-ignore
                navigation.navigate('index');
                return true;
            };
            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [navigation])
    );

    // Función de transformación (convierte el saldo de string a number) (SIN CAMBIOS)
    const transformRecord = (record: BolsilloRaw): Bolsillo => ({
        ...record,
        saldo: parseFloat(record.saldo.toString())
    });

    // Función para cargar los bolsillos (SIN CAMBIOS)
    const fetchBolsillos = useCallback(async () => {
        setCargando(true);
        try {
            const { data, error } = await supabase
                .from('bolsillos')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error al cargar bolsillos:', error);
                Alert.alert('Error', 'No se pudieron cargar los datos iniciales.');
            } else if (data) {
                setBolsillos((data as BolsilloRaw[]).map(transformRecord));
            }
        } catch (error) {
            console.error('Error general de carga:', error);
        } finally {
            setCargando(false);
        }
    }, []);

    //  Manejador de Actualización en Tiempo Real (Realtime) (SIN CAMBIOS)
    const handleRealtimeUpdate = (payload: RealtimePostgresChangesPayload<BolsilloRaw>) => {
        setBolsillos(prevBolsillos => {
            const { eventType, new: newRecord, old: oldRecord } = payload;
            let updatedBolsillos = [...prevBolsillos];

            switch (eventType) {
                case 'INSERT':
                    if (newRecord) {
                        const newBolsillo = transformRecord(newRecord);
                        updatedBolsillos = [...updatedBolsillos, newBolsillo];
                    }
                    break;
                case 'UPDATE':
                    if (newRecord) {
                        const newBolsillo = transformRecord(newRecord);
                        updatedBolsillos = updatedBolsillos.map(bolsillo =>
                            bolsillo.id === newBolsillo.id ? newBolsillo : bolsillo
                        );
                    }
                    break;
                case 'DELETE':
                    if (oldRecord && oldRecord.id) {
                        updatedBolsillos = updatedBolsillos.filter(bolsillo => bolsillo.id !== oldRecord.id);
                    }
                    break;
            }
            return updatedBolsillos;
        });
    };
    //  Suscripción y Carga Inicial (SIN CAMBIOS)
    useEffect(() => {
        fetchBolsillos();

        const channel = supabase
            .channel('bolsillos-realtime-global')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bolsillos',
                },
                handleRealtimeUpdate as (payload: RealtimePostgresChangesPayload<any>) => void
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchBolsillos]);


    // --- Lógica de Transacciones y CRUD ---
    // `monto.toFixed(2)` asegura que el valor se guarde como string numérico en BD (por ejemplo: "1234.56")
    const logTransaction = async (bolsillo_id: number, monto: number, concepto: string) => {
        const { error } = await supabase
            .from('bolsillos_transacciones')
            .insert([
                {
                    bolsillo_id: bolsillo_id,
                    monto: monto.toFixed(2), // Se guarda el string numérico
                    concepto: concepto.trim() || (monto > 0 ? 'Ahorro' : 'Retiro')
                }
            ]);

        if (error) {
            console.error('Error al registrar transacción:', error);
            Alert.alert('Error de Registro', 'No se pudo guardar el registro de la transacción.');
        }
    };

    // `newSaldo.toFixed(2)` asegura que el valor se guarde como string numérico en BD (por ejemplo: "1234.56")
    const updatePocketSaldo = async (id: number, newSaldo: number) => {
        const { error } = await supabase
            .from('bolsillos')
            .update({ saldo: newSaldo.toFixed(2) }) // Se guarda el string numérico
            .eq('id', id);

        if (error) {
            Alert.alert('Error de BD', 'No se pudo actualizar el saldo: ' + error.message);
            console.error('Error al actualizar saldo:', error);
            return false;
        }
        return true;
    };

    // Lógica para crear bolsillo (SIN CAMBIOS)
    const createPocket = async () => {
        if (!newPocketName.trim()) {
            Alert.alert('Error', 'El nombre no puede estar vacío.');
            return;
        }

        const { error } = await supabase
            .from('bolsillos')
            .insert([
                { nombre: newPocketName.trim(), saldo: 0 }
            ]);

        if (error) {
            console.error('Error al crear bolsillo:', error);
            Alert.alert('Error', 'No se pudo crear el bolsillo.');
            return;
        }

        setNewPocketName('');
        setAddPocketModalVisible(false);
    };

    //  LÓGICA DE RENOMBRAR (SIN CAMBIOS)
    const renamePocket = async () => {
        if (!editingPocket || !editingPocketName.trim()) return;

        setCargando(true);
        const { error } = await supabase
            .from('bolsillos')
            .update({ nombre: editingPocketName.trim() })
            .eq('id', editingPocket.id);

        setCargando(false);
        if (error) {
            console.error('Error al renombrar bolsillo:', error);
            Alert.alert('Error', 'No se pudo renombrar el bolsillo.');
        } else {
            Alert.alert('Éxito', `Bolsillo renombrado a: ${editingPocketName.trim()}`);
            setEditPocketModalVisible(false);
            setEditingPocket(null);
            setEditingPocketName('');
        }
    };

    //  LÓGICA DE ELIMINAR (SIN CAMBIOS)
    const deletePocket = async () => {
        if (!editingPocket) return;

        if (editingPocket.saldo > 0) {
            Alert.alert('Error', 'No puedes eliminar un bolsillo con saldo. Retira el dinero primero.');
            return;
        }

        Alert.alert(
            'Confirmar Eliminación',
            `¿Estás seguro de que quieres eliminar permanentemente el bolsillo "${editingPocket.nombre}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        setCargando(true);
                        const { error } = await supabase
                            .from('bolsillos')
                            .delete()
                            .eq('id', editingPocket.id);

                        setCargando(false);
                        if (error) {
                            console.error('Error al eliminar bolsillo:', error);
                            Alert.alert('Error', 'No se pudo eliminar el bolsillo.');
                        } else {
                            Alert.alert('Éxito', `Bolsillo "${editingPocket.nombre}" eliminado.`);
                            setEditPocketModalVisible(false);
                            setEditingPocket(null);
                        }
                    },
                },
            ],
            { cancelable: false }
        );
    };

    // Abre el modal de edición/eliminación (SIN CAMBIOS)
    const openEditModal = (bolsillo: Bolsillo) => {
        setEditingPocket(bolsillo);
        setEditingPocketName(bolsillo.nombre);
        setEditPocketModalVisible(true);
    };

    // Lógica para retiros múltiples (SIN CAMBIOS - Solo usa formatCOP en el mensaje)
    const withdrawWithMultiplePockets = async (mainPocket: Bolsillo, totalAmount: number, missingAmount: number, otherPockets: Bolsillo[]) => {

        let success = true;
        const finalConcept = concept.trim() || 'Retiro múltiple';

        // 1. Retirar todo lo que queda del bolsillo principal (saldarlo a 0)
        const withdrawMain = mainPocket.saldo;
        success = await updatePocketSaldo(mainPocket.id, 0);
        if (!success) return;
        await logTransaction(mainPocket.id, -withdrawMain, finalConcept);

        let remainingToWithdraw = missingAmount;

        // 2. Retirar de otros bolsillos hasta completar
        for (const pocket of otherPockets) {
            if (remainingToWithdraw <= 0) break;

            const currentSaldo = pocket.saldo;
            const withdrawAmount = Math.min(currentSaldo, remainingToWithdraw);
            const newSaldo = currentSaldo - withdrawAmount;

            success = await updatePocketSaldo(pocket.id, newSaldo);
            if (!success) return;

            await logTransaction(pocket.id, -withdrawAmount, `Apoyo a retiro (${mainPocket.nombre}): ${finalConcept}`);

            remainingToWithdraw -= withdrawAmount;
        }
        
        // Formato COP para el mensaje de éxito
        Alert.alert('✅ Éxito Completo', `Retiro de ${formatCOP(totalAmount)} completado usando múltiples bolsillos.\nConcepto: ${finalConcept}`);
    };


    // Función para abrir el modal de transacción (SIN CAMBIOS)
    const openTransactionModal = (type: TransactionType, pocket: Bolsillo) => {
        setTransactionType(type);
        setActivePocketForTransaction(pocket);
        setAmount(0); // Limpia el valor numérico
        setAmountFormatted(''); // Limpia el valor formateado
        setConcept('');
        setTransactionModalVisible(true);
    };

    // **CORRECCIÓN CLAVE:** Manejador de cambio de texto para el input de transacciones
    const handleAmountChange = (text: string) => {
        // 1. Eliminar todo lo que no sea dígito o coma decimal (,)
        let cleanInput = text.replace(/[^\d,]/g, '');

        // 2. Asegurar que solo haya una coma decimal
        const parts = cleanInput.split(',');
        if (parts.length > 2) {
            // Si hay más de una coma, solo mantener la primera
            cleanInput = parts[0] + ',' + parts.slice(1).join('');
        }

        // 3. Obtener el valor numérico limpio (usando la función de limpieza que cambia ',' por '.')
        const numericValue = cleanFormatToNumber(cleanInput);
        setAmount(numericValue);

        // 4. Formatear para visualización en el input (separador de miles con punto)
        if (cleanInput.length > 0) {
            // Si el input solo tiene la coma al final (ej: "123,"), Intl no lo formatea bien
            if (cleanInput.endsWith(',')) {
                // Mantener el valor hasta la coma, y agregar los puntos de miles al entero
                const integerPart = parts[0] || '0';
                const formattedInteger = new Intl.NumberFormat('es-CO', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                }).format(parseInt(integerPart) || 0);

                // Reemplazamos el punto de miles por el punto real y volvemos a poner la coma
                let finalFormattedText = formattedInteger.replace(/\./g, '#').replace(/,/g, '.').replace(/#/g, '.');
                setAmountFormatted(finalFormattedText + ',');

            } else if (cleanInput.includes(',')) {
                // Si incluye decimales, forzamos un formato con puntos y coma decimal
                const formattedValue = new Intl.NumberFormat('es-CO', {
                    minimumFractionDigits: parts[1].length,
                    maximumFractionDigits: parts[1].length,
                }).format(numericValue);

                // Intl usa coma para miles y punto para decimal en 'es-CO'. Toca hacer un swap:
                // 1. Quitar el separador de miles (,) de Intl
                let swapped = formattedValue.replace(/\./g, '#').replace(/,/g, '.').replace(/#/g, ',');
                setAmountFormatted(swapped);

            } else {
                // Si es un entero sin coma, simplemente formatear con puntos de miles
                const formattedValue = new Intl.NumberFormat('es-CO', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                }).format(numericValue);
                
                // Reemplazamos el separador decimal de Intl por la coma de miles (visual)
                let finalFormattedText = formattedValue.replace(/\./g, '#').replace(/,/g, '.').replace(/#/g, '.');
                setAmountFormatted(finalFormattedText);
            }
        } else {
            setAmountFormatted('');
        }
    };


    //  Manejador principal de Guardar/Quitar (SIN CAMBIOS - Usa el valor numérico `amount`)
    const handleTransaction = async () => {
        const value = amount; // Usamos el valor NUMÉRICO del estado
        const pocket = activePocketForTransaction;

        const cleanUp = (isSuccess: boolean = false) => {
            setAmount(0);
            setAmountFormatted(''); // Limpia el input formateado
            setActivePocketForTransaction(null);
            if (isSuccess) setConcept('');
        };

        if (!pocket) {
            Alert.alert('Error Interno', 'No se ha seleccionado un bolsillo para la transacción.');
            return;
        }
        if (value <= 0 || isNaN(value)) {
            Alert.alert('Error', 'Verifica el monto. Debe ser un valor numérico positivo.');
            return;
        }

        if (transactionType === 'guardar') {
            const nuevoSaldo = pocket.saldo + value;
            const success = await updatePocketSaldo(pocket.id, nuevoSaldo);

            if (success) {
                await logTransaction(pocket.id, value, concept);
                // Formato COP para el mensaje de éxito
                Alert.alert('✅ Éxito', `${formatCOP(value)} guardados en ${pocket.nombre}.\nConcepto: ${concept.trim() || 'Ahorro'}`);
                setTransactionModalVisible(false);
                cleanUp(true);
            } else {
                cleanUp(false);
            }

        } else if (transactionType === 'quitar') {

            if (pocket.saldo >= value) {
                const nuevoSaldo = pocket.saldo - value;
                const success = await updatePocketSaldo(pocket.id, nuevoSaldo);

                if (success) {
                    await logTransaction(pocket.id, -value, concept);
                    // Formato COP para el mensaje de éxito
                    Alert.alert('✅ Éxito', `${formatCOP(value)} retirados de ${pocket.nombre}.\nConcepto: ${concept.trim() || 'Retiro simple'}`);
                    setTransactionModalVisible(false);
                    cleanUp(true);
                } else {
                    cleanUp(false);
                }
            } else {
                const faltante = value - pocket.saldo;
                const otrosBolsillos = bolsillos
                    .filter(b => b.id !== pocket.id && b.saldo > 0)
                    .sort((a, b) => b.saldo - a.saldo);
                const totalOtrosSaldos = otrosBolsillos.reduce((sum, b) => sum + b.saldo, 0);

                if (pocket.saldo + totalOtrosSaldos >= value) {

                    const confirmAction = () => {
                        setTransactionModalVisible(false);
                        cleanUp(true);
                        withdrawWithMultiplePockets(pocket, value, faltante, otrosBolsillos);
                    };

                    // Formato COP en el mensaje de alerta
                    Alert.alert(
                        '💸 Saldo Insuficiente',
                        `A **${pocket.nombre}** le faltan ${formatCOP(faltante)}.\n\n¿Deseas usar **otros bolsillos** para completar el retiro de ${formatCOP(value)}?`,
                        [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Completar Retiro', onPress: confirmAction, style: 'default' },
                        ],
                        { cancelable: false }
                    );
                    return;
                } else {
                    // Formato COP en el mensaje de alerta
                    Alert.alert('🚫 No se puede retirar',
                        `No tienes suficiente dinero en total (${formatCOP(superTotal)}) para retirar ${formatCOP(value)}.`
                    );
                }
                cleanUp(false);
            }
        }
    };

    // Función de limpieza al cerrar el modal de Transacción (SIN CAMBIOS)
    const handleModalHide = () => {
        setAmount(0); // Limpia el valor numérico
        setAmountFormatted(''); // Limpia el input formateado
        setActivePocketForTransaction(null);
        setConcept('');
    };

    // --- Componentes de Renderizado ---

    // BolsilloCard (Usa formatCOP)
    const BolsilloCard = ({ bolsillo }: { bolsillo: Bolsillo }) => (
        <ThemedView style={styles.pocketCardContainer}>
            <TouchableOpacity style={styles.pocketCard} onPress={() => openEditModal(bolsillo)}>
                <ThemedText style={styles.pocketName}>💰 {bolsillo.nombre}</ThemedText>
                <ThemedView style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ThemedText style={styles.pocketBalance} type="subtitle">
                        {/* Aplicar formatCOP para el saldo */}
                        {formatCOP(bolsillo.saldo)}
                    </ThemedText>
                    <IconSymbol name="pencil.circle" size={24} color="#888" style={{ marginLeft: 10 }} />
                </ThemedView>
            </TouchableOpacity>

            {/* BOTONES INDEPENDIENTES DE ACCIÓN (SIN CAMBIOS) */}
            <ThemedView style={styles.cardActions}>
                <TouchableOpacity
                    style={[styles.button, styles.saveButton, styles.smallButton]}
                    onPress={() => openTransactionModal('guardar', bolsillo)}
                >
                    <IconSymbol name="list.clipboard.fill" size={18} color="#FFF" />
                    <ThemedText style={styles.smallButtonText}>Guardar</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.button,
                        styles.withdrawButton,
                        styles.smallButton,
                        bolsillo.saldo <= 0 && styles.disabledButton
                    ]}
                    onPress={() => openTransactionModal('quitar', bolsillo)}
                    disabled={bolsillo.saldo <= 0}
                >
                    <IconSymbol name="cube" size={18} color="#FFF" />
                    <ThemedText style={styles.smallButtonText}>Quitar</ThemedText>
                </TouchableOpacity>
            </ThemedView>
        </ThemedView>
    );


    return (
        <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
            <ThemedText type="title" style={styles.header}>Vista de Ahorros Independiente</ThemedText>

            {/*  Super Total Display */}
            <ThemedView style={styles.totalContainer}>
                <ThemedText style={styles.totalLabel} type="default">SUPER TOTAL GENERAL</ThemedText>
                <ThemedText style={styles.totalAmount} type="title">
                    {/* Aplicar formatCOP al total */}
                    {formatCOP(superTotal)}
                </ThemedText>
            </ThemedView>

            {/* Lista de Bolsillos (SIN CAMBIOS) */}
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {cargando ? (
                    <ActivityIndicator size="large" color="#4A90E2" style={{ marginTop: 50 }} />
                ) : bolsillos.length === 0 ? (
                    <ThemedText style={styles.emptyText}>
                        Aún no tienes bolsillos. ¡Crea el primero!
                    </ThemedText>
                ) : (
                    <ThemedView>
                        <ThemedText style={styles.instructionText}>
                            Toca el nombre/saldo para editar. Usa los botones Guardar/Quitar.
                        </ThemedText>
                        {bolsillos.map((bolsillo) => (
                            <BolsilloCard key={bolsillo.id} bolsillo={bolsillo} />
                        ))}
                    </ThemedView>
                )}
            </ScrollView>

            {/*  Botones de Acción - SOLO Crear Nuevo Bolsillo (SIN CAMBIOS) */}
            <ThemedView style={styles.bottomActions}>
                <TouchableOpacity
                    style={[styles.button, styles.createPocketButton]}
                    onPress={() => setAddPocketModalVisible(true)}
                >
                    <IconSymbol name="list.clipboard.fill" size={24} color="#FFF" />
                    <ThemedText style={styles.buttonText}>Crear Nuevo Bolsillo</ThemedText>
                </TouchableOpacity>
            </ThemedView>

            {/* --- Modales --- */}

            {/* Modal para Crear Bolsillo (SIN CAMBIOS) */}
            <Modal isVisible={isAddPocketModalVisible} onBackdropPress={() => setAddPocketModalVisible(false)}>
                {isAddPocketModalVisible && (
                    <ThemedView style={styles.modalContent}>
                        <ThemedText style={styles.modalTitle} type="subtitle">Crear Nuevo Bolsillo</ThemedText>
                        <TextInput
                            style={styles.input}
                            placeholder="Nombre del Bolsillo (Ej: Viaje, Emergencia)"
                            value={newPocketName}
                            onChangeText={setNewPocketName}
                            maxLength={30}
                        />

                        <TouchableOpacity
                            style={[styles.button, styles.createPocketButton]} 
                            onPress={createPocket}
                        >
                            <ThemedText style={styles.buttonText}>Crear Bolsillo</ThemedText>
                        </TouchableOpacity>
                    </ThemedView>
                )}
            </Modal>

            {/* Modal para Transacciones (Guardar/Quitar) */}
            <Modal
                isVisible={isTransactionModalVisible}
                onBackdropPress={() => setTransactionModalVisible(false)}
                onModalHide={handleModalHide}
            >
                {isTransactionModalVisible && activePocketForTransaction && (
                    <ThemedView style={styles.modalContent}>
                        <ThemedText style={styles.modalTitle} type="subtitle">
                            {transactionType === 'guardar' ? 'Guardar Dinero en' : 'Quitar Dinero de'} **{activePocketForTransaction.nombre}**
                        </ThemedText>

                        <ThemedText style={styles.pickerLabel} type="default">
                            {/* Aplicar formatCOP para el saldo actual */}
                            Saldo Actual: **{formatCOP(activePocketForTransaction.saldo)}**
                        </ThemedText>

                        {/* Input para el monto, con formato visual */}
                        <TextInput
                            style={styles.input}
                            placeholder="Monto a transferir (Ej: 1.000,00)"
                            keyboardType="numeric"
                            value={amountFormatted} // Usar el estado formateado
                            onChangeText={handleAmountChange} // Manejador corregido
                        />

                        {/* Campo de Concepto Opcional (SIN CAMBIOS) */}
                        <TextInput
                            style={styles.input}
                            placeholder="Concepto (Opcional: Ej. Pago luz, Regalo)"
                            value={concept}
                            onChangeText={setConcept}
                            maxLength={100}
                        />

                        <TouchableOpacity
                            style={[
                                styles.button, 
                                transactionType === 'quitar' ? styles.withdrawButton : styles.saveButton,
                                // Usar el valor NUMÉRICO para la validación
                                (amount <= 0) && styles.disabledButton
                            ]}
                            onPress={handleTransaction}
                            // Usar el valor NUMÉRICO para deshabilitar
                            disabled={amount <= 0}
                        >
                            <ThemedText style={styles.buttonText}>
                                {transactionType === 'guardar' ? 'GUARDAR AHORRO' : 'QUITAR DINERO'}
                            </ThemedText>
                        </TouchableOpacity>
                    </ThemedView>
                )}
            </Modal>

            {/* MODAL DE EDICIÓN/ELIMINACIÓN */}
            <Modal isVisible={isEditPocketModalVisible} onBackdropPress={() => setEditPocketModalVisible(false)}>
                {isEditPocketModalVisible && editingPocket && (
                    <ThemedView style={styles.modalContent}>
                        <ThemedText style={styles.modalTitle} type="subtitle">
                            Editar **{editingPocket.nombre}**
                        </ThemedText>

                        <ThemedText style={styles.pickerLabel} type="default">
                            {/* Aplicar formatCOP para el saldo actual */}
                            Saldo Actual: **{formatCOP(editingPocket.saldo)}**
                        </ThemedText>

                        {/* Campo para renombrar (SIN CAMBIOS) */}
                        <TextInput
                            style={styles.input}
                            placeholder="Nuevo nombre para el bolsillo"
                            value={editingPocketName}
                            onChangeText={setEditingPocketName}
                            maxLength={30}
                        />

                        {/* Botón Renombrar (SIN CAMBIOS) */}
                        <TouchableOpacity
                            style={[
                                styles.button, 
                                styles.createPocketButton,
                                (editingPocketName.trim() === editingPocket.nombre || !editingPocketName.trim()) && styles.disabledButton
                            ]}
                            onPress={renamePocket}
                            disabled={editingPocketName.trim() === editingPocket.nombre || !editingPocketName.trim()}
                        >
                            <ThemedText style={styles.buttonText}>Guardar Nuevo Nombre</ThemedText>
                        </TouchableOpacity>

                        {/* Separador (SIN CAMBIOS) */}
                        <ThemedView style={styles.separator} />

                        {/* Botón Eliminar (SIN CAMBIOS) */}
                        <TouchableOpacity
                            style={[
                                styles.button, 
                                styles.deleteButton,
                                editingPocket.saldo > 0 && styles.disabledButton
                            ]}
                            onPress={deletePocket}
                            disabled={editingPocket.saldo > 0}
                        >
                            <ThemedText style={styles.buttonText}>
                                {editingPocket.saldo > 0 ? '🚫 SALDO > $0.00' : '🗑️ Eliminar Bolsillo'}
                            </ThemedText>
                        </TouchableOpacity>

                    </ThemedView>
                )}
            </Modal>
        </ThemedView>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F7F7',
    },
    header: {
        textAlign: 'center',
        marginVertical: 10,
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    totalContainer: {
        backgroundColor: '#4A90E2',
        borderRadius: 10,
        padding: 20,
        marginHorizontal: 15,
        marginBottom: 20,
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
    },
    totalAmount: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
    },
    scrollContent: {
        paddingHorizontal: 15,
        paddingBottom: 150,
    },
    pocketCardContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        overflow: 'hidden',
    },
    pocketCard: {
        padding: 18,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        backgroundColor: '#f9f9f9',
    },
    pocketName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#555',
    },
    pocketBalance: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#3CB371',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#888',
    },
    instructionText: {
        textAlign: 'center',
        fontSize: 14,
        color: '#888',
        marginBottom: 10,
        fontStyle: 'italic',
    },
    bottomActions: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 15,
        backgroundColor: '#F7F7F7',
        borderTopWidth: 1,
        borderTopColor: '#DDD',
    },
    transactionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginHorizontal: 2,
        justifyContent: 'center',
    },
    smallButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    smallButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 5,
    },
    createPocketButton: {
        backgroundColor: '#1E90FF', 
    },
    saveButton: {
        backgroundColor: '#3CB371', 
        marginRight: 10,
    },
    withdrawButton: {
        backgroundColor: '#FF6347', 
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 5,
    },
    disabledButton: {
        opacity: 0.5,
        backgroundColor: '#ccc',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 22,
        borderRadius: 15,
        alignItems: 'stretch',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    input: {
        height: 50,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 20,
        backgroundColor: '#f9f9f9',
        fontSize: 16,
    },
    modalButton: {
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'center',
        backgroundColor: '#3CB371',
    },
    pickerLabel: {
        fontSize: 16,
        marginBottom: 5,
        color: '#555',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    separator: {
        height: 1,
        backgroundColor: '#ddd',
        marginVertical: 20,
    },
    deleteButton: {
        backgroundColor: '#A00000', 
    }
});