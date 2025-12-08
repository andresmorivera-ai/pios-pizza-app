import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { Layout } from '@/configuracion/constants/Layout';
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
    paddingTop: Layout.verticalScale(60),
    paddingHorizontal: Layout.spacing.l,
    paddingBottom: Layout.spacing.l,
    gap: Layout.spacing.m,
  },
  backButton: {
    padding: Layout.spacing.s,
  },
  title: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    color: '#8B4513',
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.spacing.l,
    paddingTop: Layout.spacing.xxl,
    gap: Layout.spacing.xl,
  },
  subtitle: {
    fontSize: Layout.fontSize.xl,
    color: '#8B4513',
    textAlign: 'center',
    marginBottom: Layout.spacing.l,
  },
  optionButton: {
    backgroundColor: '#fff',
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.xl,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  optionContent: {
    alignItems: 'center',
    gap: Layout.spacing.m,
  },
  optionTitle: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  optionDescription: {
    fontSize: Layout.fontSize.l,
    color: '#666',
    textAlign: 'center',
  },
});
