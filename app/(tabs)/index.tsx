import PasswordManagerModal from '@/componentes/PasswordManagerModal';
import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { supabase } from '@/scripts/lib/supabase';
import { useAuth } from '@/utilidades/context/AuthContext';
import { useConfig } from '@/utilidades/context/ConfigContext';
import { useOrdenes } from '@/utilidades/context/OrdenesContext';
import { useColorScheme } from '@/utilidades/hooks/use-color-scheme';

import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const { usuario, logout } = useAuth();
  const { ordenes } = useOrdenes();
  const { numeroNequi, numeroDaviplata, guardarNumeros, cargarConfiguracion } = useConfig();
  const insets = useSafeAreaInsets();

  // Modal states
  const [modalMenuVisible, setModalMenuVisible] = useState(false);
  const [modalPagosVisible, setModalPagosVisible] = useState(false);
  const [modalPasswordsVisible, setModalPasswordsVisible] = useState(false);

  // Admin auth states
  const [modalAdminAuthVisible, setModalAdminAuthVisible] = useState(false);
  const [adminPasswordStr, setAdminPasswordStr] = useState('');
  const [validandoAdmin, setValidandoAdmin] = useState(false);

  const [tempNequi, setTempNequi] = useState('');
  const [tempDaviplata, setTempDaviplata] = useState('');

  const [ordenesGeneralesPendientes, setOrdenesGeneralesPendientes] = useState(0);

  // Cargar conteo de ordenesgenerales pendientes por cobrar
  const cargarGeneralesPendientes = useCallback(async () => {
    try {
      const { count } = await supabase
        .from('ordenesgenerales')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente_por_pagar');
      setOrdenesGeneralesPendientes(count ?? 0);
    } catch (e) {
      console.error('Error contando generales pendientes:', e);
    }
  }, []);

  useEffect(() => {
    cargarGeneralesPendientes();
    // Suscripción realtime para actualizaciones inmediatas
    const sub = supabase
      .channel('cobrar-badge-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordenesgenerales' }, cargarGeneralesPendientes)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [cargarGeneralesPendientes]);

  const ordenesMesasPendientes = ordenes.filter(o => o.estado === 'pendiente_por_pagar').length;
  const totalPorCobrar = ordenesMesasPendientes + ordenesGeneralesPendientes;
  const hayOrdenesPorCobrar = totalPorCobrar > 0;


  // Animation values
  const scale = useSharedValue(1);

  useEffect(() => {
    // Continuous pulse animation
    scale.value = withRepeat(
      withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true // reverse
    );
  }, []);

  // Update temp values when modal opens
  useEffect(() => {
    const fetchFreshData = async () => {
      if (modalPagosVisible) {
        await cargarConfiguracion(); // Recargar de la DB al abrir el modal
      }
    };
    fetchFreshData();
  }, [modalPagosVisible]);

  // Actualizar temps cuando cambie la global (después de cargar)
  useEffect(() => {
    if (modalPagosVisible) {
      setTempNequi(numeroNequi);
      setTempDaviplata(numeroDaviplata);
    }
  }, [numeroNequi, numeroDaviplata, modalPagosVisible]);

  const handleGuardarConfig = async () => {
    await guardarNumeros(tempNequi, tempDaviplata);
    setModalPagosVisible(false);
  };

  const confirmarAccesoPasswords = async () => {
    if (!usuario) {
      Alert.alert('Error', 'Sesión de administrador no encontrada.');
      return;
    }

    setValidandoAdmin(true);

    try {
      const { data: adminData, error: adminError } = await supabase
        .from('usuarios')
        .select('contrasena')
        .eq('id', usuario.id)
        .single();

      if (adminError || !adminData) {
        throw new Error('Error al validar credenciales de administrador.');
      }

      if (adminData.contrasena !== adminPasswordStr) {
        Alert.alert('Error', 'Contraseña de administrador incorrecta.');
        setValidandoAdmin(false);
        return;
      }

      // Éxito: cerrar modal de auth, abrir el de passwords
      setModalAdminAuthVisible(false);
      setModalPasswordsVisible(true);

    } catch (error) {
      console.error('Error al validar contraseña:', error);
      Alert.alert('Error', 'No se pudo validar la contraseña.');
    } finally {
      setValidandoAdmin(false);
      setAdminPasswordStr(''); // limpiar campo por seguridad
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  //  Ir al login
  const handleAdminLogin = () => {
    router.push('/(tabs)/loginAdmin');
  };

  //  Acciones
  const handleStartOrder = () => router.push('/(tabs)/seleccionar-mesa');
  const handleAhorros = () => router.push('/(tabs)/ahorrosScreen');
  const handleGastos = () => router.push('/gastos');
  const handleCobrar = () => {
    router.push('/cobrar');
  };

  const esAdmin = usuario?.rol_id === 1;
  const esCajera = usuario?.rol_id === 3;
  const esCocinera = usuario?.rol_id === 4;

  //  Mostrar botón de salir si es admin, cajera o cocinera
  const mostrarSalir = esAdmin || esCajera || esCocinera;


  return (
    <ThemedView style={styles.container}>
      {/* Header con Admin o Salir y Configuración */}
      <ThemedView style={[styles.header, { paddingTop: Math.max(insets.top, 60) }]}>
        <ThemedText type="title" style={styles.welcomeText}>
          Bienvenido a Pio's Pizza{usuario ? `, ${usuario.nombre}` : ''}
        </ThemedText>

        <View style={styles.headerButtons}>
          {esAdmin && (
            <TouchableOpacity
              style={styles.configIconButton}
              onPress={() => setModalMenuVisible(true)}
            >
              <IconSymbol name="gearshape.fill" size={24} color="#8B4513" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.adminButton,
              mostrarSalir ? { backgroundColor: '#B22222' } : {},
            ]}
            onPress={mostrarSalir ? logout : handleAdminLogin}
          >
            <IconSymbol
              name={mostrarSalir ? 'arrow.backward.circle.fill' : 'person.fill'}
              size={24}
              color="#fff"
            />
            <ThemedText style={styles.adminText}>
              {mostrarSalir ? 'Salir' : 'Login'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>

      {/* Botón central - Iniciar Orden */}
      <ThemedView style={styles.centerSection}>
        <TouchableOpacity style={styles.startOrderButton} onPress={handleStartOrder}>
          <IconSymbol name="plus.circle.fill" size={48} color="#fff" />
          <ThemedText style={styles.startOrderText}>Iniciar Orden</ThemedText>
        </TouchableOpacity>

        {/* Botón Cobrar - Solo para Admin */}
        {mostrarSalir && (
          <Animated.View style={hayOrdenesPorCobrar ? animatedStyle : undefined}>
            <TouchableOpacity style={styles.cobrarButton} onPress={handleCobrar}>
              <Image
                source={require('../../assets/iconocobrar.png')}
                style={styles.cobrarIcon}
                resizeMode="contain"
              />
              <ThemedText style={styles.cobrarText}>Cobrar</ThemedText>
              {hayOrdenesPorCobrar && (
                <View style={{
                  position: 'absolute', top: -10, right: -10,
                  backgroundColor: '#D32F2F', borderRadius: 14,
                  minWidth: 28, height: 28, justifyContent: 'center',
                  alignItems: 'center', paddingHorizontal: 5,
                  borderWidth: 2, borderColor: '#fff',
                  zIndex: 10,
                  elevation: 5
                }}>
                  <ThemedText style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                    {totalPorCobrar > 99 ? '99+' : totalPorCobrar}
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}
      </ThemedView>

      {/* Botones de navegación REORGANIZADOS Y SIMPLIFICADOS */}
      <ThemedView style={[styles.mainButtonsContainer, {
        paddingBottom: Math.max(insets.bottom + 30, 30)
      }]}>

        {/* Solo Admin → Ahorros (SIN ANIMACIÓN) */}
        {mostrarSalir && (
          <TouchableOpacity
            style={[styles.mainButton, styles.savingsButton]}
            onPress={handleAhorros}
          >
            <IconSymbol name="cube.box.fill" size={32} color="#FFF" />
            <ThemedText style={styles.savingsButtonText}>Ahorros</ThemedText>
          </TouchableOpacity>
        )}

        {/* Solo Admin → Gastos (REDSEÑADO) */}
        {esAdmin && (
          <TouchableOpacity
            style={[styles.mainButton, styles.gastosButton]}
            onPress={handleGastos}
            activeOpacity={0.8}
          >
            <IconSymbol name="cart.fill" size={32} color="#FFF" />
            <ThemedText style={styles.gastosButtonText}>Gastos</ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>

      {/* Modal de Menú de Configuración Principal */}
      <Modal
        visible={modalMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <IconSymbol name="gearshape.fill" size={28} color="#FF8C00" />
              <ThemedText style={styles.modalTitle}>Configuración</ThemedText>
            </View>

            <View style={styles.modalButtonsStack}>
              <TouchableOpacity
                style={styles.btnMenuOpcion}
                onPress={() => {
                  setModalMenuVisible(false);
                  setModalAdminAuthVisible(true);
                }}
              >
                <IconSymbol name="lock.fill" size={20} color="#FF8C00" />
                <ThemedText style={styles.btnMenuOpcionTexto}>Contraseñas</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnMenuOpcion}
                onPress={() => {
                  setModalMenuVisible(false);
                  setModalPagosVisible(true);
                }}
              >
                <IconSymbol name="creditcard.fill" size={20} color="#FF8C00" />
                <ThemedText style={styles.btnMenuOpcionTexto}>Métodos de Pago</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalMenuVisible(false)}>
                <ThemedText style={styles.btnHeaderTextoC}>Cerrar</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Control de Acceso (Admin) para Contraseñas */}
      <Modal
        visible={modalAdminAuthVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalAdminAuthVisible(false)}
      >
        <View style={styles.modalOverlaySecondary}>
          <View style={styles.modalContentSecondary}>
            <View style={styles.modalHeaderSecondary}>
              <IconSymbol name="exclamationmark.shield.fill" size={28} color="#B22222" />
              <ThemedText style={styles.modalTitleSecondary}>Autorización Requerida</ThemedText>
            </View>

            <ThemedText style={styles.authDescription}>
              Ingresa tu contraseña de administrador para gestionar las contraseñas.
            </ThemedText>

            <TextInput
              style={styles.input}
              placeholder="Tu contraseña actual"
              placeholderTextColor="#999"
              secureTextEntry
              value={adminPasswordStr}
              onChangeText={setAdminPasswordStr}
              autoFocus
            />

            <View style={styles.authActions}>
              <TouchableOpacity
                style={[styles.cancelAuthBtn, { opacity: validandoAdmin ? 0.5 : 1 }]}
                onPress={() => {
                  setModalAdminAuthVisible(false);
                  setAdminPasswordStr('');
                }}
                disabled={validandoAdmin}
              >
                <ThemedText style={styles.cancelAuthText}>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmAuthBtn, { opacity: validandoAdmin ? 0.7 : 1 }]}
                onPress={confirmarAccesoPasswords}
                disabled={validandoAdmin}
              >
                {validandoAdmin ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.confirmAuthText}>Confirmar</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Configuración de Pagos */}
      <Modal
        visible={modalPagosVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalPagosVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <IconSymbol name="gearshape.fill" size={28} color="#FF8C00" />
              <ThemedText style={styles.modalTitle}>Configuración de Pagos</ThemedText>
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>Número de Nequi</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Ej. 300 123 4567"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                value={tempNequi}
                onChangeText={setTempNequi}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>Número de Daviplata</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Ej. 310 987 6543"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                value={tempDaviplata}
                onChangeText={setTempDaviplata}
              />
            </View>

            <View style={styles.modalButtonsStack}>
              <TouchableOpacity style={styles.btnGuardar} onPress={handleGuardarConfig}>
                <ThemedText style={styles.btnHeaderTexto}>Guardar Cambios</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalPagosVisible(false)}>
                <ThemedText style={styles.btnHeaderTextoC}>Cancelar</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Gestión de Contraseñas */}
      <PasswordManagerModal
        visible={modalPasswordsVisible}
        onClose={() => setModalPasswordsVisible(false)}
      />

    </ThemedView>
  );
}

//  Estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8DC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  configIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D2691E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  adminText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center', // Center vertically
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 20, // Add gap between Iniciar Orden and Cobrar
  },
  startOrderButton: {
    backgroundColor: '#FF8C00',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    minWidth: 200,
    // Removing marginTop/Bottom to let centerSection handle spacing via gap/justifyContent
  },
  startOrderText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  cobrarButton: {
    backgroundColor: '#32CD32',
    paddingVertical: 20,
    paddingHorizontal: 38,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    minWidth: 160,
  },
  cobrarText: {
    color: '#fff',
    fontSize: 21,
    fontWeight: 'bold',
  },
  cobrarIcon: {
    width: 32,
    height: 32,
  },
  mainButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly', // Changed to space-evenly for better centering of 2 items
    alignItems: 'center', // Align items vertically
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 20,
  },
  mainButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 110,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  // New styles for the creative Savings button
  savingsButton: {
    backgroundColor: '#4A90E2', // Different color for savings
    elevation: 10, // Higher elevation
    shadowColor: '#4A90E2', // Colored shadow
    shadowOpacity: 0.4,
    shadowRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  savingsButtonText: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  // --- BOTÓN GASTOS (ESTILO AHORROS - ROJO) ---
  gastosButton: {
    backgroundColor: '#E53935', // Rojo vibrante pero elegante
    elevation: 10,
    shadowColor: '#E53935',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  gastosButtonText: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  mainButtonText: { // Fallback for other buttons
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    textAlign: 'center',
  },
  // --- MODAL CONFIGURACIÓN ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#495057',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    color: '#333',
  },
  modalButtonsStack: {
    marginTop: 10,
    gap: 12,
  },
  btnGuardar: {
    backgroundColor: '#FF8C00',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 2,
  },
  btnCancelar: {
    backgroundColor: '#F1F3F5',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnHeaderTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  btnHeaderTextoC: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  btnMenuOpcion: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
    marginBottom: 8,
  },
  btnMenuOpcionTexto: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  // Estilos del modal secundario (Autorización Admin)
  modalOverlaySecondary: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContentSecondary: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 350,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalHeaderSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  modalTitleSecondary: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#B22222',
  },
  authDescription: {
    fontSize: 14,
    color: '#495057',
    textAlign: 'center',
    marginBottom: 20,
  },
  authActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelAuthBtn: {
    flex: 1,
    backgroundColor: '#F1F3F5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelAuthText: {
    color: '#666',
    fontWeight: 'bold',
  },
  confirmAuthBtn: {
    flex: 1,
    backgroundColor: '#B22222',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmAuthText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});