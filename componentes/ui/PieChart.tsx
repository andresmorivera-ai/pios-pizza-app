import { Layout } from '@/configuracion/constants/Layout';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';

interface PieChartData {
  metodoPago: string;
  total: number;
  porcentaje: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  size?: number;
  strokeWidth?: number;
}

export function PieChart({ data, size = 280, strokeWidth = 25 }: PieChartProps) {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = (size - strokeWidth) / 2 - 15;
  const innerRadius = radius - strokeWidth; // Radio interno para crear un donut chart

  // Función para convertir ángulos a coordenadas
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  // Función para crear el path de un arco
  const createArcPath = (
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    innerRadius: number = 0
  ): string => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const innerStart = polarToCartesian(x, y, innerRadius, endAngle);
    const innerEnd = polarToCartesian(x, y, innerRadius, startAngle);

    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    if (innerRadius === 0) {
      // Arco simple (pie chart)
      return [
        'M',
        start.x,
        start.y,
        'A',
        radius,
        radius,
        0,
        largeArcFlag,
        0,
        end.x,
        end.y,
        'L',
        x,
        y,
        'Z',
      ].join(' ');
    } else {
      // Arco con radio interno (donut chart)
      return [
        'M',
        start.x,
        start.y,
        'A',
        radius,
        radius,
        0,
        largeArcFlag,
        0,
        end.x,
        end.y,
        'L',
        innerEnd.x,
        innerEnd.y,
        'A',
        innerRadius,
        innerRadius,
        0,
        largeArcFlag,
        1,
        innerStart.x,
        innerStart.y,
        'Z',
      ].join(' ');
    }
  };

  // Calcular los arcos para cada segmento
  let currentAngle = 0; // Empezar desde arriba

  const segments = data.map((item) => {
    const percentage = item.porcentaje / 100;
    const rawAngle = percentage * 360;
    const safeAngle = Math.min(rawAngle, 359.999);
    const startAngle = currentAngle;
    const endAngle = currentAngle + safeAngle;

    // Crear el path del arco (donut chart)
    const pathData = createArcPath(centerX, centerY, radius, startAngle, endAngle, innerRadius);

    // Calcular posición del texto (centro del segmento)
    const midAngle = (startAngle + endAngle) / 2;
    const textRadius = (radius + innerRadius) / 2; // Mitad entre radio externo e interno
    const textPos = polarToCartesian(centerX, centerY, textRadius, midAngle);

    currentAngle = endAngle;

    return {
      ...item,
      pathData,
      textX: textPos.x,
      textY: textPos.y,
      midAngle,
    };
  });

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G>
          {segments.map((segment) => (
            <G key={segment.metodoPago}>
              {/* Arco del segmento */}
              <Path
                d={segment.pathData}
                fill={segment.color}
                stroke="#fff"
                strokeWidth={Layout.moderateScale(3)}
                opacity={0.95}
              />
              {/* Texto del porcentaje (solo si es mayor al 8% para que se vea bien) */}
              {segment.porcentaje > 8 && (
                <SvgText
                  x={segment.textX}
                  y={segment.textY + 5}
                  fontSize={Layout.fontSize.m}
                  fontWeight="bold"
                  fill="#fff"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  stroke="#000"
                  strokeWidth="1"
                >
                  {segment.porcentaje.toFixed(0)}%
                </SvgText>
              )}
            </G>
          ))}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
