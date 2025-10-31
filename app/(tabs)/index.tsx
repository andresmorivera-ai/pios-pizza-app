import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { useColorScheme } from '@/utilidades/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Image, StyleSheet, TouchableOpacity } from 'react-native';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const [usuario, setUsuario] = useState<any>(null);

  //  Cargar usuario desde AsyncStorage
  const cargarUsuario = async () => {
    const userData = await AsyncStorage.getItem('usuario');
    if (userData) {
      setUsuario(JSON.parse(userData));
    } else {
      const meseroDefault = {
        id: 0,
        nombre: 'Mesero',
        correo: 'mesero@piospizza.com',
        rol_id: 2,
      };
      await AsyncStorage.setItem('usuario', JSON.stringify(meseroDefault));
      setUsuario(meseroDefault);
    }
  };

  // Se ejecuta cada vez que la pantalla vuelve a estar activa
  useFocusEffect(
    useCallback(() => {
      cargarUsuario();
    }, [])
  );

  //  Cerrar sesión
  const handleLogout = async () => {
    await AsyncStorage.removeItem('usuario');
    const meseroDefault = {
      id: 0,
      nombre: 'Mesero',
      correo: 'mesero@piospizza.com',
      rol_id: 2,
    };
    await AsyncStorage.setItem('usuario', JSON.stringify(meseroDefault));
    setUsuario(meseroDefault);
    Alert.alert('Sesión cerrada', 'Has cerrado sesión. Volviendo al usuario Mesero.');
  };

  //  Ir al login
  const handleAdminLogin = () => {
    router.push('/(tabs)/loginAdmin');
  };

  //  Acciones
  const handleStartOrder = () => {
    router.push('/iniciar-orden');
  };

  const handlePedidos = () => {
    router.push('/pedidos');
  };

  const handleInventario = () => {
    Alert.alert('Inventario', 'Navegando a la sección de inventario');
  };

  const handleReportes = () => {
    router.push('/(tabs)/reportes');
  };

  const handleCobrar = () => {
    router.push('/cobrar');
  };

  const esAdmin = usuario?.rol_id === 1;
  const esMesero = usuario?.rol_id === 2;

  return (
    <ThemedView style={styles.container}>
      {/* Header con Admin o Salir */}
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.welcomeText}>
          Bienvenido a Pio's Pizza{usuario ? `, ${usuario.nombre}` : ''}
        </ThemedText>

        <TouchableOpacity
          style={[
            styles.adminButton,
            esAdmin ? { backgroundColor: '#B22222' } : {},
          ]}
          onPress={esAdmin ? handleLogout : handleAdminLogin}
        >
          <IconSymbol
            name={esAdmin ? 'arrow.backward.circle.fill' : 'gearshape.fill'}
            size={24}
            color="#fff"
          />
          <ThemedText style={styles.adminText}>
            {esAdmin ? 'Salir' : 'Admin'}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* Botón central - Iniciar Orden */}
      <ThemedView style={styles.centerSection}>
        <TouchableOpacity style={styles.startOrderButton} onPress={handleStartOrder}>
          <IconSymbol name="plus.circle.fill" size={48} color="#fff" />
          <ThemedText style={styles.startOrderText}>Iniciar Orden</ThemedText>
        </TouchableOpacity>
        
        {/* Botón Cobrar - Solo para Admin */}
        {esAdmin && (
          <TouchableOpacity style={styles.cobrarButton} onPress={handleCobrar}>
            <Image 
              source={require('../../assets/iconocobrar.png')} 
              style={styles.cobrarIcon}
              resizeMode="contain"
            />
            <ThemedText style={styles.cobrarText}>Cobrar</ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>

      {/*  Botones de navegación */}
      <ThemedView style={styles.mainButtonsContainer}>
        {/*  Pedidos → Visible para todos */}
        <TouchableOpacity style={styles.mainButton} onPress={handlePedidos}>
          <IconSymbol name="list.clipboard.fill" size={28} color="#FF8C00" />
          <ThemedText style={styles.mainButtonText}>Pedidos</ThemedText>
        </TouchableOpacity>

        {/* Solo Admin → Inventario */}
        {esAdmin && (
          <TouchableOpacity style={styles.mainButton} onPress={handleInventario}>
            <IconSymbol name="archivebox.fill" size={28} color="#FF8C00" />
            <ThemedText style={styles.mainButtonText}>Inventario</ThemedText>
          </TouchableOpacity>
        )}

        {/*  Solo Admin → Reportes */}
        {esAdmin && (
          <TouchableOpacity style={styles.mainButton} onPress={handleReportes}>
            <IconSymbol name="chart.bar.fill" size={28} color="#FF8C00" />
            <ThemedText style={styles.mainButtonText}>Reportes</ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
    flex: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
  },
  startOrderText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  cobrarButton: {
    backgroundColor: '#32CD32',
    paddingVertical: 21,
    paddingHorizontal: 38,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    marginTop: 20,
    minWidth: 160,
  },
  cobrarText: {
    color: '#fff',
    fontSize: 21,
    fontWeight: 'bold',
  },
  cobrarIcon: {
    width: 38,
    height: 38,
  },
  mainButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 30,
  },
  mainButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 100,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  mainButtonText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    textAlign: 'center',
  },
});