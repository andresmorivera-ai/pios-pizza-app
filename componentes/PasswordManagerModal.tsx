import { ThemedText } from '@/componentes/themed-text';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { supabase } from '@/scripts/lib/supabase';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
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
    contrasena: string;
};

interface PasswordManagerModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function PasswordManagerModal({ visible, onClose }: PasswordManagerModalProps) {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [cargando, setCargando] = useState(false);

    // Contraseñas editables por el admin
    const [nuevasContrasenas, setNuevasContrasenas] = useState<{ [key: number]: string }>({});

    // Visibilidad de contraseñas (ojito)
    const [mostrarContrasena, setMostrarContrasena] = useState<{ [key: number]: boolean }>({});

    const [guardandoId, setGuardandoId] = useState<number | null>(null);

    useEffect(() => {
        if (visible) {
            obtenerUsuarios();
            setMostrarContrasena({});
        }
    }, [visible]);

    const obtenerUsuarios = async () => {
        setCargando(true);
        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('id, nombre, correo, rol_id, contrasena')
                .order('id');

            if (error) throw error;
            if (data) {
                setUsuarios(data as Usuario[]);
                // Inicializar los inputs con las contraseñas actuales
                const initialPasswords: { [key: number]: string } = {};
                (data as Usuario[]).forEach(u => {
                    initialPasswords[u.id] = u.contrasena;
                });
                setNuevasContrasenas(initialPasswords);
            }
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
            Alert.alert('Error', 'No se pudieron cargar los usuarios.');
        } finally {
            setCargando(false);
        }
    };

    const handlePasswordChange = (id: number, text: string) => {
        setNuevasContrasenas(prev => ({ ...prev, [id]: text }));
    };

    const toggleMostrarContrasena = (id: number) => {
        setMostrarContrasena(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleGuardar = async (id: number) => {
        const nuevaContrasena = nuevasContrasenas[id];
        if (!nuevaContrasena || nuevaContrasena.trim() === '') {
            Alert.alert('Error', 'La contraseña no puede estar vacía.');
            return;
        }

        setGuardandoId(id);

        try {
            const { error: updateError } = await supabase
                .from('usuarios')
                .update({ contrasena: nuevaContrasena })
                .eq('id', id);

            if (updateError) throw updateError;

            Alert.alert('Éxito', 'Contraseña actualizada correctamente.');
        } catch (error) {
            console.error('Error al actualizar contraseña:', error);
            Alert.alert('Error', 'No se pudo actualizar la contraseña.');
        } finally {
            setGuardandoId(null);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <IconSymbol name="lock.fill" size={28} color="#FF8C00" />
                        <ThemedText style={styles.modalTitle}>Gestionar Contraseñas</ThemedText>
                    </View>

                    {cargando ? (
                        <ActivityIndicator size="large" color="#FF8C00" style={{ marginVertical: 20 }} />
                    ) : (
                        <FlatList
                            data={usuarios}
                            keyExtractor={(item) => item.id.toString()}
                            style={styles.list}
                            renderItem={({ item }) => (
                                <View style={styles.userCard}>
                                    <View style={styles.userInfo}>
                                        <ThemedText style={styles.userName}>{item.nombre}</ThemedText>
                                        <ThemedText style={styles.userRole}>Rol ID: {item.rol_id}</ThemedText>
                                    </View>
                                    <View style={styles.passwordContainer}>
                                        <View style={styles.inputWrapper}>
                                            <TextInput
                                                style={styles.inputWithIcon}
                                                placeholder="Contraseña"
                                                placeholderTextColor="#999"
                                                secureTextEntry={!mostrarContrasena[item.id]}
                                                value={nuevasContrasenas[item.id] || ''}
                                                onChangeText={(text) => handlePasswordChange(item.id, text)}
                                            />
                                            <TouchableOpacity
                                                style={styles.eyeIconBtn}
                                                onPress={() => toggleMostrarContrasena(item.id)}
                                            >
                                                <IconSymbol
                                                    name={mostrarContrasena[item.id] ? "eye.slash.fill" : "eye.fill"}
                                                    size={22}
                                                    color="#8B4513"
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.saveBtn}
                                        onPress={() => handleGuardar(item.id)}
                                        disabled={guardandoId === item.id}
                                    >
                                        {guardandoId === item.id ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <ThemedText style={styles.saveBtnText}>Guardar</ThemedText>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}
                        />
                    )}

                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <ThemedText style={styles.closeBtnText}>Cerrar</ThemedText>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
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
        maxWidth: 500,
        maxHeight: '80%',
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
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#495057',
    },
    list: {
        width: '100%',
    },
    userCard: {
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    userInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#8B4513',
    },
    userRole: {
        fontSize: 12,
        color: '#666',
        backgroundColor: '#E9ECEF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        overflow: 'hidden',
    },
    passwordContainer: {
        marginBottom: 12,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#CED4DA',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#333',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#CED4DA',
        borderRadius: 8,
    },
    inputWithIcon: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 14,
        color: '#333',
    },
    eyeIconBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveBtn: {
        backgroundColor: '#FF8C00',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 80,
    },
    saveBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    closeBtn: {
        backgroundColor: '#F1F3F5',
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 16,
    },
    closeBtnText: {
        color: '#666',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
