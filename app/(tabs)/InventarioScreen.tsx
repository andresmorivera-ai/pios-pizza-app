import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { Colors } from '@/configuracion/constants/theme';
import { useColorScheme } from '@/utilidades/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function InventarioScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Gestión Financiera</Text>
                <Text style={[styles.subtitle, { color: theme.icon }]}>Selecciona una opción para administrar</Text>
            </View>

            <View style={styles.menuContainer}>
                {/* Botón de Gastos */}
                <TouchableOpacity
                    style={[styles.card, { backgroundColor: theme.card }]}
                    onPress={() => router.push('/gastos')}
                    activeOpacity={0.7}
                >
                    <View style={[styles.iconContainer, { backgroundColor: '#FFE0B2' }]}>
                        <IconSymbol name="cart.fill" size={40} color="#F57C00" />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={[styles.cardTitle, { color: theme.text }]}>Gastos</Text>
                        <Text style={[styles.cardDescription, { color: theme.icon }]}>
                            Registrar compras, servicios y otros egresos.
                        </Text>
                    </View>
                    <IconSymbol name="chevron.right" size={24} color={theme.icon} />
                </TouchableOpacity>

                {/* Botón de Nómina */}
                <TouchableOpacity
                    style={[styles.card, { backgroundColor: theme.card }]}
                    onPress={() => alert('Próximamente: Módulo de Nómina')}
                    activeOpacity={0.7}
                >
                    <View style={[styles.iconContainer, { backgroundColor: '#E1BEE7' }]}>
                        <IconSymbol name="person.2.fill" size={40} color="#7B1FA2" />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={[styles.cardTitle, { color: theme.text }]}>Nómina</Text>
                        <Text style={[styles.cardDescription, { color: theme.icon }]}>
                            Gestionar pagos a empleados y turnos.
                        </Text>
                    </View>
                    <IconSymbol name="chevron.right" size={24} color={theme.icon} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    header: {
        marginBottom: 30,
        marginTop: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
    },
    menuContainer: {
        gap: 20,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 14,
    },
});
