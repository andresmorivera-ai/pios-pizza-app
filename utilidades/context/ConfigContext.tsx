import { supabase } from '@/scripts/lib/supabase';
import React, { createContext, useContext, useEffect, useState } from 'react';

// Context Values
interface ConfigContextType {
    numeroNequi: string;
    numeroDaviplata: string;
    guardarNumeros: (nequi: string, daviplata: string) => Promise<void>;
    cargarConfiguracion: () => Promise<void>;
    isLoading: boolean;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider = ({ children }: { children: React.ReactNode }) => {
    const [numeroNequi, setNumeroNequi] = useState<string>('');
    const [numeroDaviplata, setNumeroDaviplata] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Load from Supabase
    const cargarConfiguracion = async () => {
        try {
            const { data, error } = await supabase
                .from('metodospago')
                .select('*')
                .limit(1)
                .single();

            if (data) {
                setNumeroNequi(data.nequi || '');
                setNumeroDaviplata(data.daviplata || '');
            } else if (error && error.code !== 'PGRST116') {
                console.error('Error fetching metodospago:', error);
            }
        } catch (error) {
            console.error('Error al cargar configuración:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        cargarConfiguracion();
    }, []);

    // Save to Supabase
    const guardarNumeros = async (nequi: string, daviplata: string) => {
        try {
            // First check if a row exists
            const { data: existingData } = await supabase
                .from('metodospago')
                .select('id')
                .limit(1)
                .maybeSingle();

            // Convertir a null si están vacíos para evitar error con el tipo 'numeric' de la tabla
            const dbNequi = nequi.trim() === '' ? null : Number(nequi);
            const dbDaviplata = daviplata.trim() === '' ? null : Number(daviplata);

            if (existingData?.id) {
                // Update existing row
                const { error } = await supabase
                    .from('metodospago')
                    .update({ nequi: dbNequi, daviplata: dbDaviplata })
                    .eq('id', existingData.id);
                if (error) throw error;
            } else {
                // Insert new row if none exists
                const { error } = await supabase
                    .from('metodospago')
                    .insert([{ nequi: dbNequi, daviplata: dbDaviplata }]);
                if (error) throw error;
            }

            setNumeroNequi(nequi);
            setNumeroDaviplata(daviplata);
        } catch (error) {
            console.error('Error al guardar configuración en BD:', error);
            throw error;
        }
    };

    return (
        <ConfigContext.Provider
            value={{
                numeroNequi,
                numeroDaviplata,
                guardarNumeros,
                cargarConfiguracion,
                isLoading,
            }}
        >
            {children}
        </ConfigContext.Provider>
    );
};

export const useConfig = () => {
    const context = useContext(ConfigContext);
    if (context === undefined) {
        throw new Error('useConfig debe usarse dentro de un ConfigProvider');
    }
    return context;
};
