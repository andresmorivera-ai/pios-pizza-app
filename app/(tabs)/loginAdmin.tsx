import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { Layout } from '@/configuracion/constants/Layout';
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
    paddingHorizontal: Layout.spacing.xl,
  },
  header: { alignItems: 'center', marginBottom: Layout.spacing.xxl },
  title: { color: '#8B4513', fontSize: Layout.fontSize.xxl, fontWeight: 'bold', marginTop: Layout.spacing.s },
  formContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.xl,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  label: { fontSize: Layout.fontSize.m, color: '#8B4513', marginBottom: Layout.spacing.xs, fontWeight: '600' },

  /* Este style es exactamente igual al TextInput original */
  input: {
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: Layout.borderRadius.l,
    padding: Layout.spacing.m,
    fontSize: Layout.fontSize.m,
    color: '#8B4513',
    marginBottom: Layout.spacing.l,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
  },

  inputText: {
    color: '#8B4513',
    fontSize: Layout.fontSize.m,
  },
  placeholderText: {
    color: '#B5651D',
    fontSize: Layout.fontSize.m,
  },

  loginButton: {
    flexDirection: 'row',
    backgroundColor: '#FF8C00',
    borderRadius: Layout.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.m,
    gap: Layout.spacing.s,
  },
  loginButtonText: { color: '#fff', fontSize: Layout.fontSize.l, fontWeight: 'bold' },
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
    borderTopLeftRadius: Layout.borderRadius.l,
    borderTopRightRadius: Layout.borderRadius.l,
    paddingHorizontal: Layout.spacing.s,
    paddingTop: Layout.spacing.m,
    paddingBottom: Layout.spacing.xl,
    elevation: 8,
  },
  item: {
    paddingVertical: Layout.spacing.m,
    paddingHorizontal: Layout.spacing.m,
  },
  itemText: {
    fontSize: Layout.fontSize.m,
    color: '#8B4513',
    fontWeight: '600',
  },
  itemSubText: {
    fontSize: Layout.fontSize.s,
    color: '#8B4513',
    opacity: 0.7,
    marginTop: 4,
  },
  separator: { height: 1, backgroundColor: '#EEE' },
  empty: { padding: Layout.spacing.m, alignItems: 'center' },
  closeButton: {
    marginTop: Layout.spacing.s,
    alignSelf: 'center',
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.s,
    borderRadius: Layout.borderRadius.l,
    backgroundColor: '#FF8C00',
  },
  closeText: { color: '#fff', fontWeight: '700' },
});