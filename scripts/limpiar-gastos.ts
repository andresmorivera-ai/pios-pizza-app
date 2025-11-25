import { supabase } from './lib/supabase';

async function limpiarGastos() {
    try {
        console.log('🗑️  Eliminando todos los gastos de la base de datos...');

        const { error } = await supabase
            .from('gastos')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos los registros

        if (error) {
            console.error('❌ Error al eliminar gastos:', error);
            throw error;
        }

        console.log('✅ Todos los gastos han sido eliminados exitosamente');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

limpiarGastos();
