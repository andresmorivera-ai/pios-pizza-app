import { ThemedText } from '@/componentes/themed-text';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { Layout } from '@/configuracion/constants/Layout';
import { useState } from 'react';
import {
    Animated,
    Modal,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface FinalizarDiaModalsProps {
    visible: boolean;
    onClose: () => void;
    totalGanancias: number;
    totalGastos: number;
    balance: number;
    totalOrdenesPagadas: number;
    cantidadGastos: number;
}

export function FinalizarDiaModals({
    visible,
    onClose,
    totalGanancias,
    totalGastos,
    balance,
    totalOrdenesPagadas,
    cantidadGastos,
}: FinalizarDiaModalsProps) {
    const [modalConfirmacionVisible, setModalConfirmacionVisible] = useState(false);
    const [modalResumenVisible, setModalResumenVisible] = useState(false);
    const [montoAhorro, setMontoAhorro] = useState('');
    const [fadeAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(0.8));

    const handleConfirmar = () => {
        setModalConfirmacionVisible(false);
        setModalResumenVisible(true);
        // Animar entrada del modal de resumen
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handleCerrarResumen = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.8,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setModalResumenVisible(false);
            setMontoAhorro('');
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.8);
            onClose();
        });
    };

    const handleGuardarAhorro = () => {
        const ahorro = parseFloat(montoAhorro.replace(/[^0-9]/g, '') || '0');
        if (ahorro > 0 && ahorro <= balance) {

            handleCerrarResumen();
        }
    };

    // Mostrar modal de confirmación cuando visible cambia a true
    if (visible && !modalConfirmacionVisible && !modalResumenVisible) {
        setModalConfirmacionVisible(true);
    }

    return (
        <>
            {/* Modal de Confirmación */}
            <Modal
                visible={modalConfirmacionVisible}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    setModalConfirmacionVisible(false);
                    onClose();
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalConfirmacion}>
                        <View style={styles.modalConfirmacionIcono}>
                            <IconSymbol name="exclamationmark.triangle.fill" size={48} color="#FF8C00" />
                        </View>
                        <ThemedText style={styles.modalConfirmacionTitulo}>¿Finalizar el día?</ThemedText>
                        <ThemedText style={styles.modalConfirmacionTexto}>
                            Estás a punto de cerrar la jornada del día de hoy. Se generará un resumen completo de
                            ventas y gastos.
                        </ThemedText>
                        <View style={styles.modalConfirmacionBotones}>
                            <TouchableOpacity
                                style={styles.modalBotonCancelar}
                                onPress={() => {
                                    setModalConfirmacionVisible(false);
                                    onClose();
                                }}
                            >
                                <ThemedText style={styles.modalBotonCancelarTexto}>Cancelar</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalBotonConfirmar} onPress={handleConfirmar}>
                                <IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />
                                <ThemedText style={styles.modalBotonConfirmarTexto}>Sí, finalizar</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal de Resumen del Día */}
            <Modal
                visible={modalResumenVisible}
                transparent
                animationType="none"
                onRequestClose={handleCerrarResumen}
            >
                <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
                    <Animated.View style={[styles.modalResumen, { transform: [{ scale: scaleAnim }] }]}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Header del Resumen */}
                            <View style={styles.resumenHeader}>
                                <View style={styles.resumenHeaderIcono}>
                                    <IconSymbol name="star.fill" size={40} color="#FFD700" />
                                </View>
                                <ThemedText style={styles.resumenTitulo}>¡Día Finalizado!</ThemedText>
                                <ThemedText style={styles.resumenSubtitulo}>
                                    {new Date().toLocaleDateString('es-ES', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </ThemedText>
                            </View>

                            {/* Estadísticas del Día */}
                            <View style={styles.resumenStats}>
                                {/* Ventas */}
                                <View style={styles.resumenStatCard}>
                                    <View style={styles.resumenStatIcono}>
                                        <IconSymbol name="arrow.up.circle.fill" size={32} color="#28A745" />
                                    </View>
                                    <ThemedText style={styles.resumenStatLabel}>Ventas del Día</ThemedText>
                                    <ThemedText style={styles.resumenStatValor}>
                                        ${totalGanancias.toLocaleString('es-CO')}
                                    </ThemedText>
                                    <ThemedText style={styles.resumenStatDetalle}>
                                        {totalOrdenesPagadas} órdenes
                                    </ThemedText>
                                </View>

                                {/* Gastos */}
                                <View style={styles.resumenStatCard}>
                                    <View style={styles.resumenStatIcono}>
                                        <IconSymbol name="arrow.down.circle.fill" size={32} color="#DC3545" />
                                    </View>
                                    <ThemedText style={styles.resumenStatLabel}>Gastos del Día</ThemedText>
                                    <ThemedText style={styles.resumenStatValor}>
                                        ${totalGastos.toLocaleString('es-CO')}
                                    </ThemedText>
                                    <ThemedText style={styles.resumenStatDetalle}>
                                        {cantidadGastos} registros
                                    </ThemedText>
                                </View>

                                {/* Balance */}
                                <View style={[styles.resumenStatCard, styles.resumenStatCardBalance]}>
                                    <View style={styles.resumenStatIcono}>
                                        <IconSymbol name="chart.line.uptrend.xyaxis" size={32} color="#FF8C00" />
                                    </View>
                                    <ThemedText style={styles.resumenStatLabel}>Balance Final</ThemedText>
                                    <ThemedText style={[styles.resumenStatValor, styles.resumenBalanceValor]}>
                                        ${balance.toLocaleString('es-CO')}
                                    </ThemedText>
                                    <ThemedText style={styles.resumenStatDetalle}>
                                        {balance >= 0 ? '¡Excelente trabajo! 🎉' : 'Revisa tus gastos 📊'}
                                    </ThemedText>
                                </View>
                            </View>

                            {/* Sección de Ahorro */}
                            <View style={styles.resumenAhorroSection}>
                                <View style={styles.resumenAhorroHeader}>
                                    <IconSymbol name="banknote.fill" size={24} color="#FF8C00" />
                                    <ThemedText style={styles.resumenAhorroTitulo}>
                                        ¿Cuánto deseas ahorrar?
                                    </ThemedText>
                                </View>
                                <ThemedText style={styles.resumenAhorroSubtitulo}>
                                    Separa una parte de tus ganancias para el futuro
                                </ThemedText>
                                <View style={styles.resumenAhorroInputContainer}>
                                    <ThemedText style={styles.resumenAhorroSigno}>$</ThemedText>
                                    <TextInput
                                        style={styles.resumenAhorroInput}
                                        value={montoAhorro}
                                        onChangeText={setMontoAhorro}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        placeholderTextColor="#999"
                                    />
                                </View>
                                {montoAhorro && parseFloat(montoAhorro.replace(/[^0-9]/g, '') || '0') > 0 && (
                                    <View style={styles.resumenAhorroInfo}>
                                        <ThemedText style={styles.resumenAhorroInfoTexto}>
                                            Balance después del ahorro: $
                                            {(
                                                balance - parseFloat(montoAhorro.replace(/[^0-9]/g, '') || '0')
                                            ).toLocaleString('es-CO')}
                                        </ThemedText>
                                    </View>
                                )}
                            </View>

                            {/* Botones */}
                            <View style={styles.resumenBotones}>
                                <TouchableOpacity style={styles.resumenBotonSecundario} onPress={handleCerrarResumen}>
                                    <ThemedText style={styles.resumenBotonSecundarioTexto}>Cerrar</ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.resumenBotonPrimario,
                                        (!montoAhorro || parseFloat(montoAhorro.replace(/[^0-9]/g, '') || '0') === 0) &&
                                        styles.resumenBotonDeshabilitado,
                                    ]}
                                    onPress={handleGuardarAhorro}
                                    disabled={
                                        !montoAhorro || parseFloat(montoAhorro.replace(/[^0-9]/g, '') || '0') === 0
                                    }
                                >
                                    <IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />
                                    <ThemedText style={styles.resumenBotonPrimarioTexto}>Guardar Ahorro</ThemedText>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </Animated.View>
                </Animated.View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Layout.spacing.l,
    },
    modalConfirmacion: {
        backgroundColor: '#fff',
        borderRadius: Layout.borderRadius.xl,
        padding: Layout.spacing.xl,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    modalConfirmacionIcono: {
        marginBottom: Layout.spacing.m,
    },
    modalConfirmacionTitulo: {
        fontSize: Layout.fontSize.xxl,
        fontWeight: 'bold',
        color: '#8B4513',
        marginBottom: Layout.spacing.m,
        textAlign: 'center',
    },
    modalConfirmacionTexto: {
        fontSize: Layout.fontSize.m,
        color: '#666',
        textAlign: 'center',
        marginBottom: Layout.spacing.xl,
        lineHeight: 22,
    },
    modalConfirmacionBotones: {
        flexDirection: 'row',
        gap: Layout.spacing.m,
        width: '100%',
    },
    modalBotonCancelar: {
        flex: 1,
        paddingVertical: Layout.spacing.m,
        backgroundColor: '#f0f0f0',
        borderRadius: Layout.borderRadius.l,
        alignItems: 'center',
    },
    modalBotonCancelarTexto: {
        fontSize: Layout.fontSize.m,
        fontWeight: '600',
        color: '#666',
    },
    modalBotonConfirmar: {
        flex: 1,
        paddingVertical: Layout.spacing.m,
        backgroundColor: '#FF8C00',
        borderRadius: Layout.borderRadius.l,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Layout.spacing.s,
    },
    modalBotonConfirmarTexto: {
        fontSize: Layout.fontSize.m,
        fontWeight: 'bold',
        color: '#fff',
    },
    modalResumen: {
        backgroundColor: '#fff',
        borderRadius: Layout.borderRadius.xl,
        padding: Layout.spacing.xl,
        width: '100%',
        maxWidth: 500,
        maxHeight: '90%',
    },
    resumenHeader: {
        alignItems: 'center',
        marginBottom: Layout.spacing.xl,
        paddingBottom: Layout.spacing.l,
        borderBottomWidth: 2,
        borderBottomColor: '#FFE0B2',
    },
    resumenHeaderIcono: {
        marginBottom: Layout.spacing.m,
    },
    resumenTitulo: {
        fontSize: Layout.fontSize.xxxl,
        fontWeight: 'bold',
        color: '#FF8C00',
        marginBottom: Layout.spacing.s,
    },
    resumenSubtitulo: {
        fontSize: Layout.fontSize.m,
        color: '#666',
        textAlign: 'center',
    },
    resumenStats: {
        gap: Layout.spacing.m,
        marginBottom: Layout.spacing.xl,
    },
    resumenStatCard: {
        backgroundColor: '#F8F9FA',
        borderRadius: Layout.borderRadius.l,
        padding: Layout.spacing.l,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E0E0E0',
    },
    resumenStatCardBalance: {
        backgroundColor: '#FFF8F0',
        borderColor: '#FFD700',
    },
    resumenStatIcono: {
        marginBottom: Layout.spacing.s,
    },
    resumenStatLabel: {
        fontSize: Layout.fontSize.m,
        color: '#666',
        marginBottom: Layout.spacing.xs,
    },
    resumenStatValor: {
        fontSize: Layout.fontSize.xxxl,
        fontWeight: 'bold',
        color: '#8B4513',
        marginBottom: Layout.spacing.xs,
    },
    resumenBalanceValor: {
        color: '#FF8C00',
    },
    resumenStatDetalle: {
        fontSize: Layout.fontSize.s,
        color: '#999',
    },
    resumenAhorroSection: {
        backgroundColor: '#F0F8FF',
        borderRadius: Layout.borderRadius.l,
        padding: Layout.spacing.l,
        marginBottom: Layout.spacing.l,
        borderWidth: 2,
        borderColor: '#B0D4FF',
    },
    resumenAhorroHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Layout.spacing.s,
        marginBottom: Layout.spacing.s,
    },
    resumenAhorroTitulo: {
        fontSize: Layout.fontSize.l,
        fontWeight: 'bold',
        color: '#8B4513',
    },
    resumenAhorroSubtitulo: {
        fontSize: Layout.fontSize.s,
        color: '#666',
        marginBottom: Layout.spacing.m,
    },
    resumenAhorroInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: Layout.borderRadius.l,
        borderWidth: 2,
        borderColor: '#FF8C00',
        paddingHorizontal: Layout.spacing.m,
        marginBottom: Layout.spacing.s,
    },
    resumenAhorroSigno: {
        fontSize: Layout.fontSize.xxl,
        fontWeight: 'bold',
        color: '#FF8C00',
        marginRight: Layout.spacing.s,
    },
    resumenAhorroInput: {
        flex: 1,
        fontSize: Layout.fontSize.xxl,
        fontWeight: 'bold',
        color: '#8B4513',
        paddingVertical: Layout.spacing.m,
    },
    resumenAhorroInfo: {
        backgroundColor: '#fff',
        borderRadius: Layout.borderRadius.m,
        padding: Layout.spacing.m,
    },
    resumenAhorroInfoTexto: {
        fontSize: Layout.fontSize.m,
        color: '#666',
        textAlign: 'center',
    },
    resumenBotones: {
        flexDirection: 'row',
        gap: Layout.spacing.m,
    },
    resumenBotonSecundario: {
        flex: 1,
        paddingVertical: Layout.spacing.m,
        backgroundColor: '#f0f0f0',
        borderRadius: Layout.borderRadius.l,
        alignItems: 'center',
    },
    resumenBotonSecundarioTexto: {
        fontSize: Layout.fontSize.m,
        fontWeight: '600',
        color: '#666',
    },
    resumenBotonPrimario: {
        flex: 1,
        paddingVertical: Layout.spacing.m,
        backgroundColor: '#28A745',
        borderRadius: Layout.borderRadius.l,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Layout.spacing.s,
    },
    resumenBotonDeshabilitado: {
        backgroundColor: '#ccc',
    },
    resumenBotonPrimarioTexto: {
        fontSize: Layout.fontSize.m,
        fontWeight: 'bold',
        color: '#fff',
    },
});
