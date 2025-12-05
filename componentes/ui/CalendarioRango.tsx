import { ThemedText } from '@/componentes/themed-text';
import { ThemedView } from '@/componentes/themed-view';
import { IconSymbol } from '@/componentes/ui/icon-symbol';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

interface CalendarioRangoProps {
  visible: boolean;
  onClose: () => void;
  onSelectRange: (fechaInicio: Date, fechaFin: Date) => void;
  fechaInicio?: Date;
  fechaFin?: Date;
}

export function CalendarioRango({
  visible,
  onClose,
  onSelectRange,
  fechaInicio,
  fechaFin
}: CalendarioRangoProps) {
  const [mesActual, setMesActual] = useState(new Date());
  const [seleccionInicio, setSeleccionInicio] = useState<Date | null>(fechaInicio || null);
  const [seleccionFin, setSeleccionFin] = useState<Date | null>(fechaFin || null);
  const [modoSeleccion, setModoSeleccion] = useState<'inicio' | 'fin'>('inicio');

  // Resetear selección cuando cambian las props (cuando se resetea a HOY)
  useEffect(() => {
    if (!fechaInicio && !fechaFin) {
      setSeleccionInicio(null);
      setSeleccionFin(null);
      setModoSeleccion('inicio');
      setMesActual(new Date());
    } else {
      setSeleccionInicio(fechaInicio || null);
      setSeleccionFin(fechaFin || null);
    }
  }, [fechaInicio, fechaFin]);

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const obtenerDiasDelMes = (fecha: Date) => {
    const año = fecha.getFullYear();
    const mes = fecha.getMonth();
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    const diaInicioSemana = primerDia.getDay();

    const dias: (number | null)[] = [];

    // Agregar días vacíos al inicio
    for (let i = 0; i < diaInicioSemana; i++) {
      dias.push(null);
    }

    // Agregar días del mes
    for (let i = 1; i <= diasEnMes; i++) {
      dias.push(i);
    }

    return dias;
  };

  const esFechaEnRango = (dia: number) => {
    if (!seleccionInicio || !seleccionFin) return false;
    const fecha = new Date(mesActual.getFullYear(), mesActual.getMonth(), dia);
    return fecha >= seleccionInicio && fecha <= seleccionFin;
  };

  const esFechaInicio = (dia: number) => {
    if (!seleccionInicio) return false;
    const fecha = new Date(mesActual.getFullYear(), mesActual.getMonth(), dia);
    return fecha.getTime() === seleccionInicio.getTime();
  };

  const esFechaFin = (dia: number) => {
    if (!seleccionFin) return false;
    const fecha = new Date(mesActual.getFullYear(), mesActual.getMonth(), dia);
    return fecha.getTime() === seleccionFin.getTime();
  };

  const esHoy = (dia: number) => {
    const hoy = new Date();
    const fecha = new Date(mesActual.getFullYear(), mesActual.getMonth(), dia);
    return fecha.toDateString() === hoy.toDateString();
  };

  const esFechaFutura = (dia: number) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fecha = new Date(mesActual.getFullYear(), mesActual.getMonth(), dia);
    fecha.setHours(0, 0, 0, 0);
    return fecha > hoy;
  };

  const manejarSeleccionDia = (dia: number) => {
    // No permitir seleccionar días futuros
    if (esFechaFutura(dia)) {
      return;
    }

    const fechaSeleccionada = new Date(mesActual.getFullYear(), mesActual.getMonth(), dia, 0, 0, 0, 0);

    if (modoSeleccion === 'inicio') {
      setSeleccionInicio(fechaSeleccionada);
      setModoSeleccion('fin');
      // Si ya hay una fecha fin y la nueva inicio es después, resetear fin
      if (seleccionFin && fechaSeleccionada > seleccionFin) {
        setSeleccionFin(null);
      }
    } else {
      // No permitir seleccionar fecha fin futura
      if (esFechaFutura(dia)) {
        return;
      }
      if (seleccionInicio && fechaSeleccionada < seleccionInicio) {
        // Si la fecha fin es antes que la inicio, intercambiar
        setSeleccionFin(seleccionInicio);
        setSeleccionInicio(fechaSeleccionada);
      } else {
        setSeleccionFin(fechaSeleccionada);
      }
      setModoSeleccion('inicio');
    }
  };

  const aplicarRango = () => {
    if (seleccionInicio && seleccionFin) {
      // Usar UTC para que coincida con cómo se guardan las fechas en la BD
      const inicio = new Date(Date.UTC(
        seleccionInicio.getFullYear(),
        seleccionInicio.getMonth(),
        seleccionInicio.getDate(),
        0, 0, 0, 0
      ));

      const fin = new Date(Date.UTC(
        seleccionFin.getFullYear(),
        seleccionFin.getMonth(),
        seleccionFin.getDate(),
        23, 59, 59, 999
      ));


      onSelectRange(inicio, fin);
      onClose();
    }
  };

  const limpiarSeleccion = () => {
    setSeleccionInicio(null);
    setSeleccionFin(null);
    setModoSeleccion('inicio');
  };

  const cambiarMes = (direccion: 'anterior' | 'siguiente') => {
    const nuevoMes = new Date(mesActual);
    if (direccion === 'anterior') {
      nuevoMes.setMonth(nuevoMes.getMonth() - 1);
    } else {
      nuevoMes.setMonth(nuevoMes.getMonth() + 1);
    }
    setMesActual(nuevoMes);
  };

  const dias = obtenerDiasDelMes(mesActual);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <ThemedView style={styles.modalContent}>
          {/* Header del calendario */}
          <ThemedView style={styles.header}>
            <TouchableOpacity onPress={() => cambiarMes('anterior')} style={styles.botonMes}>
              <IconSymbol name="chevron.left" size={24} color="#8B4513" />
            </TouchableOpacity>

            <ThemedText style={styles.mesTitulo}>
              {meses[mesActual.getMonth()]} {mesActual.getFullYear()}
            </ThemedText>

            <TouchableOpacity onPress={() => cambiarMes('siguiente')} style={styles.botonMes}>
              <IconSymbol name="chevron.right" size={24} color="#8B4513" />
            </TouchableOpacity>
          </ThemedView>

          {/* Días de la semana */}
          <ThemedView style={styles.diasSemanaContainer}>
            {diasSemana.map((dia, index) => (
              <ThemedView key={index} style={styles.diaSemana}>
                <ThemedText style={styles.diaSemanaTexto}>{dia}</ThemedText>
              </ThemedView>
            ))}
          </ThemedView>

          {/* Calendario */}
          <ThemedView style={styles.calendario}>
            {dias.map((dia, index) => {
              if (dia === null) {
                return <View key={index} style={styles.diaVacio} />;
              }

              const enRango = esFechaEnRango(dia);
              const esInicio = esFechaInicio(dia);
              const esFin = esFechaFin(dia);
              const esHoyDia = esHoy(dia);
              const esFutura = esFechaFutura(dia);

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dia,
                    enRango && !esFutura && styles.diaEnRango,
                    esInicio && !esFutura && styles.diaInicio,
                    esFin && !esFutura && styles.diaFin,
                    esHoyDia && !enRango && !esFutura && styles.diaHoy,
                    esFutura && styles.diaFutura,
                  ]}
                  onPress={() => manejarSeleccionDia(dia)}
                  disabled={esFutura}
                  activeOpacity={esFutura ? 1 : 0.7}
                >
                  <ThemedText
                    style={[
                      styles.diaTexto,
                      (esInicio || esFin) && !esFutura && styles.diaTextoSeleccionado,
                      enRango && !esInicio && !esFin && !esFutura && styles.diaTextoEnRango,
                      esFutura && styles.diaTextoFutura,
                      esHoyDia && !esFutura && !enRango && styles.diaTextoHoy,
                    ]}
                  >
                    {dia}
                  </ThemedText>
                  {esHoyDia && !esFutura && (
                    <ThemedText style={styles.hoyBadge}>HOY</ThemedText>
                  )}
                </TouchableOpacity>
              );
            })}
          </ThemedView>

          {/* Información de selección */}
          <ThemedView style={styles.infoSeleccion}>
            <ThemedView style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>Desde:</ThemedText>
              <ThemedText style={styles.infoFecha}>
                {seleccionInicio
                  ? seleccionInicio.toLocaleDateString('es-ES')
                  : 'Selecciona fecha'}
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>Hasta:</ThemedText>
              <ThemedText style={styles.infoFecha}>
                {seleccionFin
                  ? seleccionFin.toLocaleDateString('es-ES')
                  : 'Selecciona fecha'}
              </ThemedText>
            </ThemedView>
          </ThemedView>

          {/* Botones de acción */}
          <ThemedView style={styles.botonesContainer}>
            <TouchableOpacity style={styles.botonLimpiar} onPress={limpiarSeleccion}>
              <ThemedText style={styles.botonLimpiarTexto}>Limpiar</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.botonAplicar, (!seleccionInicio || !seleccionFin) && styles.botonDeshabilitado]}
              onPress={aplicarRango}
              disabled={!seleccionInicio || !seleccionFin}
            >
              <ThemedText style={styles.botonAplicarTexto}>Aplicar</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botonCerrar} onPress={onClose}>
              <ThemedText style={styles.botonCerrarTexto}>Cerrar</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
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
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  botonMes: {
    padding: 8,
  },
  mesTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  diasSemanaContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  diaSemana: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  diaSemanaTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
  },
  calendario: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  diaVacio: {
    width: '14.28%',
    aspectRatio: 1,
  },
  dia: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    margin: 2,
  },
  diaEnRango: {
    backgroundColor: '#FFE0B2',
  },
  diaInicio: {
    backgroundColor: '#FF8C00',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  diaFin: {
    backgroundColor: '#FF8C00',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  diaHoy: {
    borderWidth: 2,
    borderColor: '#FF8C00',
    backgroundColor: '#FFF8E1',
  },
  diaFutura: {
    backgroundColor: '#E0E0E0',
    opacity: 0.5,
  },
  diaTexto: {
    fontSize: 16,
    color: '#8B4513',
    fontWeight: '500',
  },
  diaTextoSeleccionado: {
    color: '#fff',
    fontWeight: 'bold',
  },
  diaTextoEnRango: {
    color: '#8B4513',
  },
  diaTextoHoy: {
    color: '#FF8C00',
    fontWeight: 'bold',
  },
  diaTextoFutura: {
    color: '#999',
    fontWeight: '400',
  },
  hoyBadge: {
    fontSize: 8,
    color: '#FF8C00',
    fontWeight: 'bold',
    marginTop: -2,
  },
  infoSeleccion: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  infoFecha: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: 'bold',
  },
  botonesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  botonLimpiar: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    alignItems: 'center',
  },
  botonLimpiarTexto: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  botonAplicar: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FF8C00',
    borderRadius: 10,
    alignItems: 'center',
  },
  botonDeshabilitado: {
    backgroundColor: '#ccc',
  },
  botonAplicarTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  botonCerrar: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#DC3545',
    borderRadius: 10,
    alignItems: 'center',
  },
  botonCerrarTexto: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

