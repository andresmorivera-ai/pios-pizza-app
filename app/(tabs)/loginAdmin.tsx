import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { supabase } from '@/scripts/lib/supabase';
import { useAuth } from '@/utilidades/context/AuthContext';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Usuario = {
  id: number;
  nombre: string;
  correo: string;
  rol_id: number;
};

export default function LoginScreen() {
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<string>(''); // nombre
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    const obtenerUsuarios = async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, correo, rol_id');

      if (error) {
        console.error('Error al obtener usuarios:', error);
        return;
      }
      if (Array.isArray(data)) setUsuarios(data as Usuario[]);
    };
    obtenerUsuarios();
  }, []);

  const handleLogin = async () => {
    if (!usuarioSeleccionado || !contrasena) {
      Alert.alert('Error', 'Por favor selecciona un usuario y escribe la contraseña.');
      return;
    }

    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, correo, contrasena, rol_id')
        .eq('nombre', usuarioSeleccionado)
        .single();

      if (error || !data) {
        Alert.alert('Error', 'Usuario no encontrado.');
        setCargando(false);
        return;
      }

      if (data.contrasena !== contrasena) {
        Alert.alert('Error', 'Contraseña incorrecta.');
        setCargando(false);
        return;
      }

      await login({
        id: data.id,
        nombre: data.nombre,
        correo: data.correo,
        rol_id: data.rol_id,
      });
      
      if (data.rol_id === 3) {
      
      router.push('/(tabs)/CocinaScreen');
    } else {
      router.push('/(tabs)');
    }

    } catch (e) {
      Alert.alert('Error', 'No se pudo conectar al servidor.');
      console.error('Error de conexión:', e);
    } finally {
      setCargando(false);
    }
  };

  const openModal = () => {
    Keyboard.dismiss(); // asegura que no haya teclado abierto
    setModalVisible(true);
  };

  const selectUsuario = (u: Usuario) => {
    setUsuarioSeleccionado(u.nombre);
    setModalVisible(false);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { backgroundColor: 'transparent' }]}>
        <IconSymbol name="flame.fill" size={50} color="#FF8C00" />
        <ThemedText type="title" style={[styles.title, { backgroundColor: 'transparent' }]}>
          Login
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.formContainer}>
        <ThemedText style={styles.label}>Usuario</ThemedText>

        {/* Campo visual idéntico al TextInput */}
        <Pressable onPress={openModal} style={styles.input}>
          <View pointerEvents="none">
            <ThemedText style={usuarioSeleccionado ? styles.inputText : styles.placeholderText}>
              {usuarioSeleccionado ? usuarioSeleccionado : 'Selecciona un usuario'}
            </ThemedText>
          </View>
        </Pressable>

        <ThemedText style={styles.label}>Contraseña</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#B5651D"
          secureTextEntry
          value={contrasena}
          onChangeText={setContrasena}
        />

        <TouchableOpacity
          style={[styles.loginButton, cargando && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={cargando}
        >
          <IconSymbol name="lock.fill" size={22} color="#fff" />
          <ThemedText style={styles.loginButtonText}>
            {cargando ? 'Ingresando...' : 'Iniciar Sesión'}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* Modal con la lista de usuarios (no cambia tu UI principal) */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={modalStyles.backdrop}>
          <View style={modalStyles.modalContainer}>
            <FlatList
              data={usuarios}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={modalStyles.item}
                  onPress={() => selectUsuario(item)}
                >
                  <ThemedText style={modalStyles.itemText}>{item.nombre}</ThemedText>
                  <ThemedText style={modalStyles.itemSubText}>{item.correo}</ThemedText>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={modalStyles.separator} />}
              ListEmptyComponent={() => (
                <View style={modalStyles.empty}>
                  <ThemedText>No hay usuarios disponibles</ThemedText>
                </View>
              )}
            />

            <TouchableOpacity
              style={modalStyles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <ThemedText style={modalStyles.closeText}>Cerrar</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

/* estilos idénticos para inputs y demás */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8DC',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { color: '#8B4513', fontSize: 30, fontWeight: 'bold', marginTop: 10 },
  formContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  label: { fontSize: 16, color: '#8B4513', marginBottom: 6, fontWeight: '600' },

  /* Este style es exactamente igual al TextInput original */
  input: {
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#8B4513',
    marginBottom: 20,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
  },

  inputText: {
    color: '#8B4513',
    fontSize: 16,
  },
  placeholderText: {
    color: '#B5651D',
    fontSize: 16,
  },

  loginButton: {
    flexDirection: 'row',
    backgroundColor: '#FF8C00',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 10,
  },
  loginButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

/* estilos del modal (separados para que no interfieran con tu layout) */
const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '60%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 24,
    elevation: 8,
  },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  itemText: {
    fontSize: 16,
    color: '#8B4513',
    fontWeight: '600',
  },
  itemSubText: {
    fontSize: 12,
    color: '#8B4513',
    opacity: 0.7,
    marginTop: 4,
  },
  separator: { height: 1, backgroundColor: '#EEE' },
  empty: { padding: 16, alignItems: 'center' },
  closeButton: {
    marginTop: 10,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FF8C00',
  },
  closeText: { color: '#fff', fontWeight: '700' },
});