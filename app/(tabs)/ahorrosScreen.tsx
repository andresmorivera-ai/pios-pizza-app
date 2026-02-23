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
const formatCOP = (value: number | string, decimals: number = 2): string => {
    // Asegura que es un número (o 0 si no es válido)
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '$0';

    // Formatear usando Intl.NumberFormat para COP (locale 'es-CO')
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
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

    // Estados para Modales y Acciones
    const [isDetailModalVisible, setDetailModalVisible] = useState(false);
    const [editingPocketName, setEditingPocketName] = useState('');
    const [editingPocketBalance, setEditingPocketBalance] = useState('');
    const [isCreatingPocket, setIsCreatingPocket] = useState(false);

    const [selectedPocket, setSelectedPocket] = useState<Bolsillo | null>(null);
    const [pocketTransactions, setPocketTransactions] = useState<any[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);

    // ... (Detail State) ...


















    // Lógica para crear bolsillo
    const createPocket = async () => {
        const name = editingPocketName.trim();
        const amountRaw = editingPocketBalance.replace(/[^0-9]/g, '');
        const initialBalance = amountRaw ? parseFloat(amountRaw) : 0;

        if (!name) {
            Alert.alert('Error', 'El nombre no puede estar vacío.');
            return;
        }

        if (initialBalance <= 0) {
            Alert.alert('Monto Inválido', 'El bolsillo debe crearse con un monto mayor a $0.');
            return;
        }

        setCargando(true);

        const { data: pocketData, error: pocketError } = await supabase
            .from('bolsillos')
            .insert([{ nombre: name, saldo: initialBalance }])
            .select()
            .single();



        if (pocketData) {
            const { error: txError } = await supabase
                .from('bolsillos_transacciones')
                .insert([{
                    bolsillo_id: pocketData.id,
                    monto: initialBalance,
                    concepto: 'Depósito Inicial'
                }]);

            if (txError) console.warn('Error logueando depósito inicial:', txError);
        }

        setCargando(false);
        setEditingPocketName('');
        setEditingPocketBalance('');
        setDetailModalVisible(false);
        fetchBolsillos();
    };

    // Al abrir detalle
    const openPocketDetail = (pocket: Bolsillo) => {
        setSelectedPocket(pocket);
        setEditingPocketName(pocket.nombre);
        setEditingPocketBalance('');
        setIsCreatingPocket(false);
        setDetailModalVisible(true);
        fetchTransactions(pocket.id);
    };

    const openCreateModal = () => {
        setSelectedPocket(null); // No hay bolsillo seleccionado
        setEditingPocketName('');
        setEditingPocketBalance('');
        setIsCreatingPocket(true); // MODO CREACIÓN
        setDetailModalVisible(true);
    };

    // Estados para Transacciones
    const [isTransactionModalVisible, setTransactionModalVisible] = useState(false);
    const [transactionType, setTransactionType] = useState<TransactionType>('guardar');

    // Estados para Input de Monto
    const [amount, setAmount] = useState<number>(0);
    const [amountFormatted, setAmountFormatted] = useState<string>('');

    const [activePocketForTransaction, setActivePocketForTransaction] = useState<Bolsillo | null>(null);
    const [concept, setConcept] = useState('');



    // Estados para Historial Global
    const [isGlobalHistoryVisible, setGlobalHistoryVisible] = useState(false);
    const [globalTransactions, setGlobalTransactions] = useState<any[]>([]);

    // Estados para Distribución de Ganancias
    const [isTransferModalVisible, setTransferModalVisible] = useState(false);
    const [transferTargetId, setTransferTargetId] = useState<number | 'new' | null>(null);
    const [newPocketNameForTransfer, setNewPocketNameForTransfer] = useState('');

    // Filtrar bolsillo "Ganancias" para mostrarlo de manera especial
    const bolsilloGanancias = useMemo(() => {
        return bolsillos.find(b => b.nombre === 'Ganancias');
    }, [bolsillos]);

    // Bolsillos normales (sin "Ganancias")
    const bolsillosNormales = useMemo(() => {
        return bolsillos.filter(b => b.nombre !== 'Ganancias');
    }, [bolsillos]);

    // CALCULO SUPER TOTAL (SOLO BOLSILLOS NORMALES - SIN GANANCIAS)
    const superTotal = useMemo(() => {
        return bolsillosNormales.reduce((acc, bolsillo) => acc + bolsillo.saldo, 0);
    }, [bolsillosNormales]);

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

    // Función para cargar los bolsillos
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

    // Cargar historial de transacciones de un bolsillo
    const fetchTransactions = async (pocketId: number) => {
        setLoadingTransactions(true);
        try {
            const { data, error } = await supabase
                .from('bolsillos_transacciones')
                .select('*')
                .eq('bolsillo_id', pocketId)
                .order('created_at', { ascending: false })
                .limit(50); // Últimas 50 transacciones

            if (error) throw error;
            setPocketTransactions(data || []);
        } catch (error) {
            console.error('Error cargando transacciones:', error);
            // No bloqueamos por fallo de historial
        } finally {
            setLoadingTransactions(false);
        }
    };

    // Cargar historial GLOBAL de retiros/gastos
    const fetchGlobalWithdrawals = async () => {
        setLoadingTransactions(true);
        try {
            // 1. Fetch Transacciones (Movimientos, distribuciones, etc)
            const { data: transaccionesData, error: txError } = await supabase
                .from('bolsillos_transacciones')
                .select('*, bolsillos(nombre)')
                .order('created_at', { ascending: false })
                .limit(500);

            if (txError) throw txError;

            // 2. Fetch Gastos (Histórico de gastos puros)
            // Traemos 'bolsillo_id' para poder unir con nombre, pero la tabla 'gastos' tiene 'bolsillo_id'
            // Nota: 'gastos' no tiene relación directa configurada en cliente quizás, hacemos join manual o select
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
                .order('fecha', { ascending: false })
                .limit(500);

            if (gastosError) throw gastosError;

            // 3. Procesar y Unificar

            // a) Transacciones: Filtramos aquellas que sean "Gasto: ..." para evitar duplicados visuales
            //    si ya vamos a mostrar el registro original de la tabla 'gastos'.
            //    PERO, puede que haya transacciones que no estén en la tabla gastos (antiguas).
            //    Estrategia: Si tiene prefijo "Gasto:", asumimos que existe en tabla gastos y lo ocultamos de aquí.
            const transaccionesFiltradas = (transaccionesData || []).filter(tx =>
                !tx.concepto?.startsWith('Gasto: ')
            );

            // b) Gastos: Los convertimos al formato de transacción visual
            const gastosFormateados = (gastosData || []).map(g => ({
                id: `gasto_${g.id}`, // ID único virtual
                created_at: g.created_at || new Date().toISOString(),
                monto: -Math.abs(g.valor), // Siempre negativo
                concepto: `Gasto: ${g.nombre} ${g.concepto && g.concepto !== 'Sin descripción' ? `(${g.concepto})` : ''}`,
                bolsillos: g.bolsillos // Objeto { nombre: ... }
            }));

            // 4. Unir y Ordenar
            const listaUnificada = [...transaccionesFiltradas, ...gastosFormateados].sort((a, b) => {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            setGlobalTransactions(listaUnificada as any);
            setGlobalHistoryVisible(true);
        } catch (error) {
            console.error('Error cargando historial global:', error);
            Alert.alert('Error', 'No se pudo cargar el historial completo.');
        } finally {
            setLoadingTransactions(false);
        }
    };



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
                        // ACTUALIZAR BOLSILLO SELECCIONADO SI ESTÁ ABIERTO
                        if (selectedPocket && selectedPocket.id === newBolsillo.id) {
                            setSelectedPocket(newBolsillo);
                        }
                    }
                    break;
                case 'DELETE':
                    if (oldRecord && oldRecord.id) {
                        updatedBolsillos = updatedBolsillos.filter(bolsillo => bolsillo.id !== oldRecord.id);
                        if (selectedPocket && selectedPocket.id === oldRecord.id) {
                            setDetailModalVisible(false);
                            setSelectedPocket(null);
                        }
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





    //  LÓGICA DE GUARDAR CAMBIOS (RENOMBRAR + SUMAR SALDO)
    const savePocketChanges = async () => {
        if (!selectedPocket) return;

        const newName = editingPocketName.trim();
        // El valor ingresado es lo que se VA A DEJAR (Sumar), no el total
        const amountToAddRaw = editingPocketBalance.replace(/[^0-9]/g, '');
        const amountToAdd = amountToAddRaw ? parseFloat(amountToAddRaw) : 0;

        if (!newName) {
            Alert.alert('Error', 'El nombre no puede estar vacío.');
            return;
        }

        setCargando(true);

        try {
            // 1. Calcular Nuevo Saldo (SUMAR lo que se deja al saldo actual)
            // Si el usuario no escribe nada, amountToAdd es 0, solo cambia nombre.
            const currentBalance = selectedPocket.saldo;
            const newTotalBalance = currentBalance + amountToAdd;

            // 2. Actualizar Bolsillo
            const { error: updateError } = await supabase
                .from('bolsillos')
                .update({
                    nombre: newName,
                    saldo: newTotalBalance
                })
                .eq('id', selectedPocket.id);

            if (updateError) throw updateError;

            // 3. Registrar transacción SOLO si hubo dinero agregado
            if (amountToAdd > 0) {
                const { error: txError } = await supabase
                    .from('bolsillos_transacciones')
                    .insert([{
                        bolsillo_id: selectedPocket.id,
                        monto: amountToAdd,
                        concepto: 'Dinero dejado en bolsillo'
                    }]);
                if (txError) console.warn('Error historial ajuste:', txError);
            }

            Alert.alert('Éxito', 'Bolsillo actualizado correctamente.');
            setDetailModalVisible(false);
            fetchBolsillos();

        } catch (error) {
            console.error('Error al guardar bolsillo:', error);
            Alert.alert('Error', 'No se pudo actualizado el bolsillo.');
        } finally {
            setCargando(false);
        }
    };


    //  LÓGICA DE ELIMINAR
    const deletePocket = async () => {
        if (!selectedPocket) return;

        // NOTA: Se eliminó la restricción de saldo > 0 según el nuevo diseño visual,
        // pero es una buena práctica advertir si hay dinero.
        // Si el usuario quiere eliminar, asumimos que "bota" el dinero o ya lo sacó.
        // Sin embargo, para mayor seguridad, podemos mantener la alerta si tiene saldo.

        const tieneSaldo = selectedPocket.saldo > 0;
        const mensaje = tieneSaldo
            ? `Este bolsillo tiene ${formatCOP(selectedPocket.saldo)}. Si lo eliminas, perderás el registro de este dinero.`
            : '¿Estás seguro de que quieres eliminar este bolsillo permanentemente?';

        Alert.alert(
            'Eliminar Bolsillo',
            mensaje,
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
                            .eq('id', selectedPocket.id);

                        setCargando(false);
                        if (error) {
                            console.error('Error al eliminar bolsillo:', error);
                            Alert.alert('Error', 'No se pudo eliminar el bolsillo (verifica que no tenga gastos asociados o historial).');
                        } else {
                            setDetailModalVisible(false);
                            setSelectedPocket(null);
                            fetchBolsillos();
                        }
                    },
                },
            ],
            { cancelable: false }
        );
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

    const handleDistributeProfits = async () => {
        if (!selectedPocket || selectedPocket.nombre !== 'Ganancias') return;
        if (amount <= 0) {
            Alert.alert('Error', 'Ingresa un monto válido.');
            return;
        }

        if (amount > selectedPocket.saldo) {
            Alert.alert('Saldo Insuficiente', 'No tienes suficientes ganancias para distribuir esa cantidad.');
            return;
        }

        if (!transferTargetId) {
            Alert.alert('Selección Requerida', 'Elige un bolsillo destino o crea uno nuevo.');
            return;
        }

        let targetId = transferTargetId;
        let targetName = '';

        setCargando(true);
        try {
            // 1. Si es nuevo bolsillo, crearlo
            if (targetId === 'new') {
                if (!newPocketNameForTransfer.trim()) {
                    Alert.alert('Error', 'Ingresa un nombre para el nuevo bolsillo.');
                    setCargando(false);
                    return;
                }
                const { data: newPocket, error: createError } = await supabase
                    .from('bolsillos')
                    .insert([{ nombre: newPocketNameForTransfer.trim(), saldo: 0 }])
                    .select()
                    .single();

                if (createError) throw createError;
                targetId = newPocket.id;
                targetName = newPocket.nombre;
            } else {
                const targetPocket = bolsillos.find(b => b.id === targetId);
                if (!targetPocket) throw new Error('Bolsillo destino no encontrado');
                targetName = targetPocket.nombre;
            }

            // 2. Descontar de Ganancias
            const newGananciasBalance = selectedPocket.saldo - amount;
            const { error: updateGananciasError } = await supabase
                .from('bolsillos')
                .update({ saldo: newGananciasBalance })
                .eq('id', selectedPocket.id);

            if (updateGananciasError) throw updateGananciasError;

            // 3. Sumar al Destino
            // Necesitamos el saldo actual del destino fresco
            const { data: targetData, error: targetFetchError } = await supabase
                .from('bolsillos')
                .select('saldo')
                .eq('id', targetId)
                .single();

            if (targetFetchError) throw targetFetchError;

            const newTargetBalance = targetData.saldo + amount;
            const { error: updateTargetError } = await supabase
                .from('bolsillos')
                .update({ saldo: newTargetBalance })
                .eq('id', targetId);

            if (updateTargetError) throw updateTargetError;


            // 4. Logs
            await logTransaction(selectedPocket.id, -amount, `Distribución a ${targetName} `);
            await logTransaction(targetId as number, amount, `Fondos desde Ganancias`);

            Alert.alert('¡Excelente!', `Has distribuido ${formatCOP(amount)} a ${targetName} `);

            // Limpieza y REFRESCO
            setTransferModalVisible(false);
            // setDetailModalVisible(false); // NO CERRAR el detalle principal
            setAmount(0);
            setAmountFormatted('');
            setTransferTargetId(null);
            setNewPocketNameForTransfer('');

            // Recargar datos y también historial específico de ganancias
            await fetchBolsillos();
            if (selectedPocket) {
                // Actualizar el saldo visualmente en el modal abierto
                // fetchBolsillos lo hará, pero necesitamos actualizar 'selectedPocket'
                // El hook handleRealtimeUpdate debería encargarse, pero por seguridad:
                // Re-fetch transactions
                fetchTransactions(selectedPocket.id);
            }

        } catch (e: any) {
            console.error(e);
            Alert.alert('Error', e.message);
        } finally {
            setCargando(false);
        }
    };

    // --- Componentes de Renderizado ---

    // BolsilloCard Actualizada (Solo visual, al tocar abre detalle)
    const BolsilloCard = ({ bolsillo }: { bolsillo: Bolsillo }) => (
        <TouchableOpacity
            style={styles.pocketCardContainer}
            onPress={() => openPocketDetail(bolsillo)}
            activeOpacity={0.9}
        >
            <ThemedView style={styles.pocketCard}>
                <ThemedView style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ThemedText style={styles.pocketName}>{bolsillo.nombre}</ThemedText>
                </ThemedView>

                <ThemedView style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ThemedText style={styles.pocketBalance} type="subtitle">
                        {formatCOP(bolsillo.saldo, 0)}
                    </ThemedText>
                    <IconSymbol name="chevron.right" size={20} color="#CCC" style={{ marginLeft: 10 }} />
                </ThemedView>
            </ThemedView>
        </TouchableOpacity>
    );


    return (
        <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
            <ThemedText type="title" style={styles.header}>Vista de Ahorros Independiente</ThemedText>

            {/*  Super Total Display con Ganancias Integradas */}
            <ThemedView style={styles.totalContainer}>
                <ThemedText style={styles.totalLabel} type="default">SUPER TOTAL GENERAL</ThemedText>
                <ThemedText style={styles.totalAmount} type="title">
                    {formatCOP(superTotal, 0)}
                </ThemedText>

                {/* Ganancias Integradas - Compactas */}
                {bolsilloGanancias && (
                    <TouchableOpacity
                        style={styles.gananciasIntegrada}
                        onPress={() => openPocketDetail(bolsilloGanancias)}
                        activeOpacity={0.7}
                    >
                        <IconSymbol name="star.fill" size={18} color="#FFB900" />
                        <ThemedText style={styles.gananciasLabelCompact}>Ganancias Acumuladas:</ThemedText>
                        <ThemedText style={styles.gananciasAmountCompact}>
                            {formatCOP(bolsilloGanancias.saldo, 0)}
                        </ThemedText>
                        <IconSymbol name="chevron.right" size={16} color="#D17A00" />
                    </TouchableOpacity>
                )}
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
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#E0E0E0',
                                padding: 10,
                                borderRadius: 10,
                                marginBottom: 15
                            }}
                            onPress={() => fetchGlobalWithdrawals()}
                        >
                            <IconSymbol name="list.bullet.rectangle.fill" size={20} color="#555" />
                            <ThemedText style={{ marginLeft: 8, color: '#333', fontWeight: 'bold' }}>Ver movimientos</ThemedText>
                        </TouchableOpacity>
                        {bolsillosNormales.map((bolsillo) => (
                            <BolsilloCard key={bolsillo.id} bolsillo={bolsillo} />
                        ))}
                    </ThemedView>
                )}
            </ScrollView>

            {/*  Botones de Acción - SOLO Crear Nuevo Bolsillo (SIN CAMBIOS) */}
            <ThemedView style={styles.bottomActions}>
                <TouchableOpacity
                    style={[styles.button, styles.createPocketButton]}
                    onPress={openCreateModal}
                >
                    <IconSymbol name="list.clipboard.fill" size={24} color="#FFF" />
                    <ThemedText style={styles.buttonText}>Crear Nuevo Bolsillo</ThemedText>
                </TouchableOpacity>
            </ThemedView>

            {/* --- Modales --- */}



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
                            Saldo Actual: **{formatCOP(activePocketForTransaction.saldo, 0)}**
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

            {/* MODAL DE DETALLE Y EDICIÓN / CREACIÓN DE BOLSILLO */}
            <Modal
                isVisible={isDetailModalVisible}
                onBackdropPress={() => setDetailModalVisible(false)}
                style={{ margin: 0, justifyContent: 'flex-end' }}
                propagateSwipe={true}
            >
                {/* Mostramos el modal si hay bolsillo seleccionado O si estamos creando uno */}
                {isDetailModalVisible && (selectedPocket || isCreatingPocket) && (
                    <ThemedView style={{
                        backgroundColor: '#F7F7F7',
                        height: '92%',
                        borderTopLeftRadius: 25,
                        borderTopRightRadius: 25,
                        overflow: 'hidden'
                    }}>

                        <ThemedView style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingHorizontal: 20,
                            paddingTop: 20,
                            paddingBottom: 10,
                            backgroundColor: '#FFF'
                        }}>
                            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                                <IconSymbol name="xmark.circle.fill" size={30} color="#CCC" />
                            </TouchableOpacity>

                            {/* Solo mostrar eliminar si NO estamos creando Y NO es Ganancias */}
                            {!isCreatingPocket && selectedPocket?.nombre !== 'Ganancias' && (
                                <TouchableOpacity onPress={deletePocket} style={{ padding: 5 }}>
                                    <IconSymbol name="trash" size={28} color="#FF3B30" />
                                </TouchableOpacity>
                            )}
                        </ThemedView>

                        <ScrollView contentContainerStyle={{ padding: 25 }}>

                            {/* 1. HEADER CREATIVO (Nombre y Saldo) */}
                            <ThemedView style={{
                                backgroundColor: '#20B2AA', // LightSeaGreen
                                borderRadius: 20,
                                padding: 28,
                                alignItems: 'center',
                                marginBottom: 30,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 5 },
                                shadowOpacity: 0.15,
                                shadowRadius: 10,
                                elevation: 5
                            }}>
                                <ThemedText style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16, marginBottom: 5, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                                    {editingPocketName || (isCreatingPocket ? 'Nuevo Bolsillo' : '')}
                                </ThemedText>
                                <ThemedText style={{ color: '#FFF', fontSize: 30, fontWeight: '900' }}>
                                    {isCreatingPocket
                                        ? (editingPocketBalance ? `$${editingPocketBalance} ` : '$0')
                                        : (selectedPocket ? formatCOP(selectedPocket.saldo) : '$0')
                                    }
                                </ThemedText>
                                <ThemedText style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 5 }}>
                                    {isCreatingPocket ? 'Saldo Inicial' : 'Saldo Actual'}
                                </ThemedText>
                            </ThemedView>


                            {/* 2. FORMULARIO DE EDICIÓN / CREACIÓN */}
                            {/* Solo mostrar si NO es Ganancias (Read-only para Ganancias) */}
                            {selectedPocket?.nombre !== 'Ganancias' && (
                                <>
                                    <ThemedText type="subtitle" style={{ marginBottom: 20, color: '#333' }}>
                                        {isCreatingPocket ? 'Detalles del Nuevo Bolsillo' : 'Editar Detalles'}
                                    </ThemedText>

                                    {/* Input Nombre */}
                                    <ThemedText style={{ marginBottom: 8, color: '#666', fontWeight: '600' }}>Nombre del Bolsillo</ThemedText>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: '#FFF', borderColor: '#E5E5EA' }]}
                                        placeholder="Ej: Viaje, Ahorros"
                                        value={editingPocketName}
                                        onChangeText={setEditingPocketName}
                                        maxLength={30}
                                    />

                                    {/* Input Saldo */}
                                    <ThemedText style={{ marginBottom: 8, color: '#666', fontWeight: '600' }}>
                                        {isCreatingPocket ? 'Monto Inicial' : '¿Cuánto vas a dejar?'}
                                    </ThemedText>
                                    <ThemedView style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: '#FFF',
                                        borderWidth: 1,
                                        borderColor: '#E5E5EA',
                                        borderRadius: 12,
                                        paddingHorizontal: 15,
                                        marginBottom: 10
                                    }}>
                                        <ThemedText style={{ fontSize: 24, fontWeight: 'bold', color: '#333' }}>$</ThemedText>
                                        <TextInput
                                            style={{ flex: 1, fontSize: 24, fontWeight: 'bold', padding: 15, color: '#333' }}
                                            placeholder="0"
                                            value={editingPocketBalance}
                                            onChangeText={(text) => {
                                                const numericValue = text.replace(/[^0-9]/g, '');
                                                if (!numericValue) {
                                                    setEditingPocketBalance('');
                                                } else {
                                                    const formatted = parseInt(numericValue).toLocaleString('es-CO');
                                                    setEditingPocketBalance(formatted);
                                                }
                                            }}
                                            keyboardType="numeric"
                                        />
                                    </ThemedView>

                                    <ThemedText style={{ fontSize: 13, color: '#8E8E93', lineHeight: 18 }}>
                                        {isCreatingPocket
                                            ? '* Este será el saldo con el que inicia el bolsillo.'
                                            : '* El valor ingresado arriba se **SUMARÁ** al saldo actual del bolsillo.'
                                        }
                                    </ThemedText>

                                    <ThemedText style={{ fontSize: 14, color: '#999', fontStyle: 'italic', marginBottom: 15, textAlign: 'center' }}>
                                        {isCreatingPocket
                                            ? 'Este es el monto inicial con el que se creará el bolsillo.'
                                            : 'Este dinero se sumará al saldo actual del bolsillo.'}
                                    </ThemedText>

                                    {/* Botón principal */}
                                    <TouchableOpacity
                                        style={[styles.button, styles.saveButton]}
                                        onPress={isCreatingPocket ? createPocket : savePocketChanges}
                                        disabled={cargando}
                                    >
                                        {cargando ? (
                                            <ActivityIndicator color="#FFF" />
                                        ) : (
                                            <>
                                                <IconSymbol name="checkmark.circle.fill" size={24} color="#FFF" />
                                                <ThemedText style={styles.buttonText}>
                                                    {isCreatingPocket ? 'Crear Bolsillo' : 'Guardar Cambios'}
                                                </ThemedText>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}

                            {/* 3. HISTORIAL (SOLO SI NO ESTAMOS CREANDO) */}
                            {!isCreatingPocket && (
                                <ThemedView style={{ marginTop: 30, marginBottom: 20 }}>
                                    <ThemedText type="subtitle" style={{ marginBottom: 15, color: '#333' }}>Movimientos Recientes</ThemedText>
                                    {loadingTransactions ? (
                                        <ActivityIndicator size="small" color="#20B2AA" />
                                    ) : pocketTransactions.length === 0 ? (
                                        <ThemedText style={{ color: '#999', fontStyle: 'italic' }}>No hay movimientos registrados.</ThemedText>
                                    ) : (
                                        pocketTransactions.map((tx) => (
                                            <ThemedView key={tx.id} style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                paddingVertical: 12,
                                                borderBottomWidth: 1,
                                                borderBottomColor: '#EEE'
                                            }}>
                                                <ThemedView style={{ flex: 1 }}>
                                                    <ThemedText style={{ color: '#333', fontWeight: '500' }}>{tx.concepto || 'Movimiento'}</ThemedText>
                                                    <ThemedText style={{ color: '#999', fontSize: 12 }}>
                                                        {new Date(tx.created_at).toLocaleDateString()}
                                                    </ThemedText>
                                                </ThemedView>
                                                <ThemedText style={{
                                                    color: tx.monto > 0 ? '#4CD964' : '#FF3B30',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {tx.monto > 0 ? '+' : ''}{formatCOP(tx.monto, 0)}
                                                </ThemedText>
                                            </ThemedView>
                                        ))
                                    )}
                                </ThemedView>
                            )}

                        </ScrollView>

                        {/* 4. BOTÓN ACCIÓN (Sticky Bottom) */}
                        {/* This button is now only shown if it's the 'Ganancias' pocket, otherwise the action button is inside the conditional form block */}
                        {selectedPocket?.nombre === 'Ganancias' && !isCreatingPocket && (
                            <ThemedView style={{
                                padding: 20,
                                backgroundColor: '#FFF',
                                borderTopWidth: 1,
                                borderTopColor: '#EEE',
                                marginBottom: insets.bottom,
                                flexDirection: 'row',
                                gap: 10
                            }}>
                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#FFB900', // Dorado/Amarillo para Ganancias
                                        paddingVertical: 15,
                                        borderRadius: 15,
                                        alignItems: 'center',
                                        shadowColor: "#FFB900",
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 5,
                                        elevation: 6,
                                        flexDirection: 'row',
                                        justifyContent: 'center',
                                        gap: 8
                                    }}
                                    onPress={() => {
                                        setAmount(0);
                                        setAmountFormatted('');
                                        setTransferTargetId(null);
                                        setTransferModalVisible(true);
                                    }}
                                >
                                    <IconSymbol name="gift.fill" size={20} color="#FFF" />
                                    <ThemedText style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>
                                        Retirar / Distribuir
                                    </ThemedText>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={{
                                        paddingVertical: 15,
                                        paddingHorizontal: 20,
                                        borderRadius: 15,
                                        alignItems: 'center',
                                        backgroundColor: '#EEE'
                                    }}
                                    onPress={() => setDetailModalVisible(false)}
                                >
                                    <ThemedText style={{ color: '#555', fontSize: 16, fontWeight: 'bold' }}>
                                        Cerrar
                                    </ThemedText>
                                </TouchableOpacity>
                            </ThemedView>
                        )}

                    </ThemedView>
                )}
            </Modal>

            {/* MODAL HISTORIAL GLOBAL DE GASTOS */}
            <Modal
                isVisible={isGlobalHistoryVisible}
                onBackdropPress={() => setGlobalHistoryVisible(false)}
                style={{ margin: 0, justifyContent: 'flex-end' }}
                propagateSwipe={true}
            >
                <ThemedView style={{
                    backgroundColor: '#FFF',
                    height: '85%',
                    borderTopLeftRadius: 30,
                    borderTopRightRadius: 30,
                    paddingTop: 25,
                    paddingHorizontal: 20,
                    overflow: 'hidden'
                }}>
                    {/* Header decorativo */}
                    <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
                        <ThemedView style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <ThemedView style={{
                                backgroundColor: '#E3F2FD',
                                padding: 10,
                                borderRadius: 12
                            }}>
                                <IconSymbol name="list.bullet.rectangle.fill" size={24} color="#1E90FF" />
                            </ThemedView>
                            <ThemedView>
                                <ThemedText style={{ color: '#333', fontSize: 20, fontWeight: '900' }}>Movimientos</ThemedText>
                                <ThemedText style={{ color: '#888', fontSize: 13 }}>Historial General</ThemedText>
                            </ThemedView>
                        </ThemedView>
                        <TouchableOpacity
                            onPress={() => setGlobalHistoryVisible(false)}
                            style={{ padding: 5, backgroundColor: '#F0F0F0', borderRadius: 20 }}
                        >
                            <IconSymbol name="xmark" size={20} color="#555" />
                        </TouchableOpacity>
                    </ThemedView>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                        {globalTransactions.length === 0 ? (
                            <ThemedView style={{ alignItems: 'center', marginTop: 50 }}>
                                <IconSymbol name="doc.text.magnifyingglass" size={50} color="#DDD" />
                                <ThemedText style={{ textAlign: 'center', color: '#888', marginTop: 15, fontSize: 16 }}>
                                    No hay movimientos registrados recientes.
                                </ThemedText>
                            </ThemedView>
                        ) : (
                            Object.entries(
                                globalTransactions.reduce((acc: any, tx: any) => {
                                    const dateObj = new Date(tx.created_at);

                                    // Formato de Fechas Amigable
                                    const today = new Date();
                                    const isToday = dateObj.getDate() === today.getDate() && dateObj.getMonth() === today.getMonth() && dateObj.getFullYear() === today.getFullYear();

                                    const yesterday = new Date(today);
                                    yesterday.setDate(yesterday.getDate() - 1);
                                    const isYesterday = dateObj.getDate() === yesterday.getDate() && dateObj.getMonth() === yesterday.getMonth() && dateObj.getFullYear() === yesterday.getFullYear();

                                    let dateLabel = dateObj.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
                                    if (isToday) dateLabel = 'Hoy';
                                    else if (isYesterday) dateLabel = 'Ayer';

                                    if (!acc[dateLabel]) acc[dateLabel] = [];
                                    acc[dateLabel].push(tx);
                                    return acc;
                                }, {})
                            ).map(([date, transactions]: [string, any]) => (
                                <ThemedView key={date} style={{ marginBottom: 25 }}>
                                    {/* Etiqueta de Fecha */}
                                    <ThemedView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                        <ThemedText style={{ fontSize: 14, fontWeight: 'bold', color: '#A0A0A0', textTransform: 'uppercase', letterSpacing: 1 }}>{date}</ThemedText>
                                        <ThemedView style={{ flex: 1, height: 1, backgroundColor: '#EEE', marginLeft: 15 }} />
                                    </ThemedView>

                                    {/* Lista de Transacciones de ese día */}
                                    {transactions.map((tx: any) => (
                                        <ThemedView key={tx.id} style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 14,
                                            paddingHorizontal: 12,
                                            backgroundColor: '#FFF',
                                            borderRadius: 16,
                                            marginBottom: 10,
                                            borderWidth: 1,
                                            borderColor: '#F0F0F0',
                                            shadowColor: '#000',
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.03,
                                            shadowRadius: 5,
                                            elevation: 2,
                                        }}>
                                            {/* Icono de Tipo de Movimiento (Sutil) */}
                                            <ThemedView style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 12,
                                                backgroundColor: '#F7F7F7',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                marginRight: 15,
                                                borderWidth: 1,
                                                borderColor: '#EEE'
                                            }}>
                                                <IconSymbol
                                                    name={tx.monto > 0 ? "arrow.down.to.line" : "arrow.up.right.square"}
                                                    size={22}
                                                    color="#888"
                                                />
                                            </ThemedView>

                                            {/* Detalles (Medio) */}
                                            <ThemedView style={{ flex: 1 }}>
                                                <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 }}>
                                                    {tx.concepto && tx.concepto.trim() !== '' ? tx.concepto : 'Movimiento'}
                                                </ThemedText>

                                                <ThemedView style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                    {!tx.bolsillos && <IconSymbol name="trash" size={12} color="#999" />}
                                                    <ThemedText style={{ fontSize: 13, color: tx.bolsillos ? '#777' : '#AAA', fontStyle: tx.bolsillos ? 'normal' : 'italic' }}>
                                                        {tx.bolsillos?.nombre || 'Bolsillo Eliminado'}
                                                    </ThemedText>
                                                </ThemedView>
                                            </ThemedView>

                                            {/* Monto (Derecha) */}
                                            <ThemedView style={{ alignItems: 'flex-end' }}>
                                                <ThemedText style={{
                                                    fontSize: 16,
                                                    fontWeight: '900',
                                                    color: tx.monto > 0 ? '#2E7D32' : '#D32F2F'
                                                }}>
                                                    {tx.monto > 0 ? '+' : ''}{formatCOP(tx.monto, 0)}
                                                </ThemedText>
                                                <ThemedText style={{ fontSize: 11, color: '#BBB', marginTop: 2 }}>
                                                    {new Date(tx.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                                </ThemedText>
                                            </ThemedView>
                                        </ThemedView>
                                    ))}
                                </ThemedView>
                            ))
                        )}
                    </ScrollView>
                </ThemedView>
            </Modal>

            {/* MODAL DE DISTRIBUCIÓN DE GANANCIAS */}
            <Modal
                isVisible={isTransferModalVisible}
                onBackdropPress={() => setTransferModalVisible(false)}
                style={{ margin: 0, justifyContent: 'flex-end' }}
                avoidKeyboard={true}
            >
                <ThemedView style={{
                    backgroundColor: '#FFF',
                    borderTopLeftRadius: 25,
                    borderTopRightRadius: 25,
                    padding: 25,
                    paddingBottom: Math.max(insets.bottom + 20, 30)
                }}>
                    <ThemedView style={{ alignItems: 'center', marginBottom: 20 }}>
                        <IconSymbol name="sparkles" size={40} color="#FFB900" />
                        <ThemedText type="subtitle" style={{ color: '#333', marginTop: 10, textAlign: 'center' }}>
                            ¡Disfruta tus logros!
                        </ThemedText>
                        <ThemedText style={{ color: '#666', textAlign: 'center' }}>
                            Distribuye tus ganancias a un bolsillo existente o crea uno nuevo para tu meta.
                        </ThemedText>
                    </ThemedView>

                    <ThemedText style={styles.pickerLabel}>¿Cuánto deseas mover?</ThemedText>
                    <ThemedView style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: '#E0E0E0',
                        borderRadius: 12,
                        paddingHorizontal: 15,
                        marginBottom: 20,
                        backgroundColor: '#F9F9F9'
                    }}>
                        <ThemedText style={{ fontSize: 24, fontWeight: 'bold', color: '#333', marginRight: 5 }}>$</ThemedText>
                        <TextInput
                            style={{ flex: 1, height: 50, fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center' }}
                            placeholder="0"
                            placeholderTextColor="#CCC"
                            keyboardType="numeric"
                            value={amountFormatted}
                            onChangeText={handleAmountChange}
                        />
                    </ThemedView>

                    <ThemedText style={styles.pickerLabel}>¿A dónde va el dinero?</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                        <TouchableOpacity
                            onPress={() => setTransferTargetId('new')}
                            style={{
                                alignItems: 'center',
                                marginRight: 15,
                                opacity: transferTargetId === 'new' ? 1 : 0.8
                            }}
                        >
                            <ThemedView style={{
                                width: 60,
                                height: 60,
                                borderRadius: 20, // Más cuadrado pero suave
                                backgroundColor: transferTargetId === 'new' ? '#1E90FF' : '#E3F2FD', // Fondo azul claro siempre
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginBottom: 5,
                                borderWidth: 2,
                                borderColor: transferTargetId === 'new' ? '#1E90FF' : '#64B5F6',
                                borderStyle: 'dashed', // Siempre dashed para evocar "espacio vacío"
                                shadowColor: "#1E90FF",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: transferTargetId === 'new' ? 0.4 : 0.1,
                                shadowRadius: 3,
                                elevation: transferTargetId === 'new' ? 4 : 1
                            }}>
                                <IconSymbol name="plus" size={30} color={transferTargetId === 'new' ? '#FFF' : '#1E90FF'} />
                            </ThemedView>
                            <ThemedText style={{ fontSize: 12, fontWeight: 'bold', color: '#333' }}>Nuevo</ThemedText>
                        </TouchableOpacity>

                        {bolsillosNormales.map(b => (
                            <TouchableOpacity
                                key={b.id}
                                onPress={() => setTransferTargetId(b.id)}
                                style={{
                                    alignItems: 'center',
                                    marginRight: 15,
                                    opacity: transferTargetId === b.id ? 1 : 0.6
                                }}
                            >
                                <ThemedView style={{
                                    width: 60,
                                    height: 60,
                                    borderRadius: 30,
                                    backgroundColor: transferTargetId === b.id ? '#3CB371' : '#EEE',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginBottom: 5
                                }}>
                                    <ThemedText style={{ fontSize: 20 }}>💰</ThemedText>
                                </ThemedView>
                                <ThemedText numberOfLines={1} style={{ fontSize: 12, fontWeight: 'bold', width: 60, textAlign: 'center', color: '#333' }}>
                                    {b.nombre}
                                </ThemedText>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {transferTargetId === 'new' && (
                        <TextInput
                            style={styles.input}
                            placeholder="Nombre del nuevo bolsillo"
                            value={newPocketNameForTransfer}
                            onChangeText={setNewPocketNameForTransfer}
                        />
                    )}

                    <TouchableOpacity
                        style={[
                            styles.button,
                            styles.createPocketButton,
                            { backgroundColor: '#FFB900', marginTop: 10 },
                            (amount <= 0 || !transferTargetId) && styles.disabledButton
                        ]}
                        onPress={handleDistributeProfits}
                        disabled={amount <= 0 || !transferTargetId || cargando}
                    >
                        {cargando ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <ThemedText style={styles.buttonText}>Confirmar Distribución</ThemedText>
                        )}
                    </TouchableOpacity>

                </ThemedView>
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
    },

    // Estilos para Ganancias Integradas (Compactas)
    gananciasIntegrada: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 15,
        backgroundColor: '#E3F2FD', // Azul claro suave
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#64B5F6', // Azul claro
    },
    gananciasLabelCompact: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1976D2', // Azul más oscuro para el texto
    },
    gananciasAmountCompact: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1565C0', // Azul oscuro para el monto
    }
});