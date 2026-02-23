import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

// Constants
const STORAGE_KEY_NEQUI = 'config_numero_nequi';
const STORAGE_KEY_DAVIPLATA = 'config_numero_daviplata';

// Context Values
interface ConfigContextType {
    numeroNequi: string;
    numeroDaviplata: string;
    guardarNumeros: (nequi: string, daviplata: string) => Promise<void>;
    isLoading: boolean;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider = ({ children }: { children: React.ReactNode }) => {
    const [numeroNequi, setNumeroNequi] = useState<string>('');
    const [numeroDaviplata, setNumeroDaviplata] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Load from AsyncStorage
    const cargarConfiguracion = async () => {
        try {
            const savedNequi = await AsyncStorage.getItem(STORAGE_KEY_NEQUI);
            const savedDaviplata = await AsyncStorage.getItem(STORAGE_KEY_DAVIPLATA);

            if (savedNequi !== null) setNumeroNequi(savedNequi);
            if (savedDaviplata !== null) setNumeroDaviplata(savedDaviplata);
        } catch (error) {
            console.error('Error al cargar configuración:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        cargarConfiguracion();
    }, []);

    // Save to AsyncStorage
    const guardarNumeros = async (nequi: string, daviplata: string) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY_NEQUI, nequi);
            await AsyncStorage.setItem(STORAGE_KEY_DAVIPLATA, daviplata);

            setNumeroNequi(nequi);
            setNumeroDaviplata(daviplata);
        } catch (error) {
            console.error('Error al guardar configuración:', error);
            throw error;
        }
    };

    return (
        <ConfigContext.Provider
            value={{
                numeroNequi,
                numeroDaviplata,
                guardarNumeros,
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
