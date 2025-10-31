import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { Link, router } from 'expo-router';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';

export default function IniciarOrdenScreen() {
  const handleQRScanner = () => {
    Alert.alert('Lector QR', 'Función de lector QR será implementada');
  };

  const handleManual = () => {
    router.push('/(tabs)/seleccionar-mesa');
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <Link href="/" style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#8B4513" />
        </Link>
        <ThemedText type="title" style={styles.title}>
          Iniciar Orden
        </ThemedText>
      </ThemedView>

      {/* Contenido principal */}
      <ThemedView style={styles.content}>
        <ThemedText style={styles.subtitle}>
          Selecciona cómo quieres iniciar la orden:
        </ThemedText>

        {/* Botón Lector QR */}
        <TouchableOpacity style={styles.optionButton} onPress={handleQRScanner}>
          <ThemedView style={styles.optionContent}>
            <IconSymbol name="qrcode.viewfinder" size={48} color="#FF8C00" />
            <ThemedText style={styles.optionTitle}>Lector QR</ThemedText>
            <ThemedText style={styles.optionDescription}>
              Escanea el código QR de la mesa
            </ThemedText>
          </ThemedView>
        </TouchableOpacity>

        {/* Botón Manual */}
        <TouchableOpacity style={styles.optionButton} onPress={handleManual}>
          <ThemedView style={styles.optionContent}>
            <IconSymbol name="hand.tap.fill" size={48} color="#FF8C00" />
            <ThemedText style={styles.optionTitle}>Selección Manual</ThemedText>
            <ThemedText style={styles.optionDescription}>
              Selecciona la mesa manualmente
            </ThemedText>
          </ThemedView>
        </TouchableOpacity>

      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8DC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B4513',
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    gap: 30,
  },
  subtitle: {
    fontSize: 18,
    color: '#8B4513',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  optionContent: {
    alignItems: 'center',
    gap: 16,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  optionDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
