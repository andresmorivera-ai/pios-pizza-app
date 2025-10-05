// Tipos principales del sistema de gestión de asadero

export interface Mesa {
  id: number;
  numero: number;
  estado: 'disponible' | 'ocupada' | 'reservada';
  capacidad: number;
  created_at?: string;
  updated_at?: string;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria: 'pollo' | 'pizza' | 'hamburguesa' | 'bebida' | 'acompanamiento' | 'postre';
  disponible: boolean;
  imagen?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Orden {
  id: string;
  mesa_id: number;
  productos: ProductoOrden[];
  estado: 'pendiente' | 'en_preparacion' | 'listo' | 'entregado' | 'cancelado';
  total: number;
  notas?: string;
  created_at: string;
  updated_at?: string;
  mesa?: Mesa;
}

export interface ProductoOrden {
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  observaciones?: string;
  producto?: Producto;
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'mesero' | 'cocinero' | 'cajero';
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Reporte {
  id: string;
  tipo: 'ventas_diarias' | 'productos_mas_vendidos' | 'mesas_ocupacion' | 'ingresos';
  fecha_inicio: string;
  fecha_fin: string;
  datos: Record<string, any>;
  created_at: string;
}

// Tipos para formularios y estados
export interface FormularioOrden {
  mesa_id: number;
  productos: ProductoOrden[];
  notas?: string;
}

export interface EstadoApp {
  usuario: Usuario | null;
  mesas: Mesa[];
  productos: Producto[];
  ordenes: Orden[];
  cargando: boolean;
  error: string | null;
}

// Tipos para filtros y búsquedas
export interface FiltroOrdenes {
  estado?: Orden['estado'];
  mesa_id?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
}

export interface FiltroProductos {
  categoria?: Producto['categoria'];
  disponible?: boolean;
  precio_min?: number;
  precio_max?: number;
}

// Tipos para estadísticas
export interface EstadisticasVentas {
  total_ventas: number;
  total_ordenes: number;
  promedio_orden: number;
  producto_mas_vendido: {
    producto: Producto;
    cantidad_vendida: number;
  };
  ventas_por_categoria: Record<string, number>;
}

export interface EstadisticasMesas {
  total_mesas: number;
  mesas_ocupadas: number;
  mesas_disponibles: number;
  promedio_tiempo_ocupacion: number;
  ocupacion_por_hora: Record<string, number>;
}
