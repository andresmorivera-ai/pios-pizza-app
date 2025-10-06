import { useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { router } from 'expo-router';
import { supabase } from '@/scripts/lib/supabase';

// Componente principal

export default function LoginScreen() {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);

  
  // Función de inicio de sesión
  
  const handleLogin = async () => {
    if (!correo || !contrasena) {
      Alert.alert('Error', 'Por favor ingresa tu correo y contraseña.');
      return;
    }

    setCargando(true);

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, correo, contrasena, rol_id')
        .eq('correo', correo)
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

      // Login exitoso
      
      router.push('/(tabs)/indexadmin'); // Puedes cambiar esta ruta según tu flujo
    } catch (e) {
      Alert.alert('Error', 'No se pudo conectar al servidor.');
      console.error('Error de conexión:', e);
    } finally {
      setCargando(false);
    }
  };

    
    // Interfaz
    
    return (
        <ThemedView style={styles.container}>

            <ThemedView style={[styles.header, { backgroundColor: 'transparent' }]}>
                <IconSymbol name="flame.fill" size={50} color="#FF8C00" />
                <ThemedText type="title" style={[styles.title, { backgroundColor: 'transparent' }]}>
                    Login Admin
                </ThemedText>
            </ThemedView>

            {/* Formulario */}
            <ThemedView style={styles.formContainer}>
                <ThemedText style={styles.label}>Correo electrónico</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="ejemplo@correo.com" 
          placeholderTextColor="#B5651D"
          keyboardType="email-address"
          autoCapitalize="none"
          value={correo}
          onChangeText={setCorreo}
        />

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
    </ThemedView>
  );
}


// Estilos

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8DC',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    color: '#8B4513',
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 10,
  },
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
  label: {
    fontSize: 16,
    color: '#8B4513',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#8B4513',
    marginBottom: 20,
    backgroundColor: '#FFF8E1',
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
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});