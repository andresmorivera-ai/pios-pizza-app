import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

type Usuario = {
  id: number;
  nombre: string;   // Usamos el nombre del usuario directamente
  correo: string;
  rol_id: number;
} | null;

type AuthContextType = {
  usuario: Usuario;
  login: (userData: Usuario) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  usuario: null,
  login: async () => { },
  logout: async () => { },
  refreshUser: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [usuario, setUsuario] = useState<Usuario>(null);

  useEffect(() => {
    refreshUser();
  }, []);

  // Usuario por defecto (Mesero)
  const meseroDefault: Usuario = {
    id: 2,
    nombre: 'Mesero',
    correo: 'mesero@piospizza.com',
    rol_id: 2,
  };

  //  Refrescar usuario desde AsyncStorage
  const refreshUser = async () => {
    try {
      const data = await AsyncStorage.getItem('usuario');
      if (data) {
        const parsed = JSON.parse(data);

        setUsuario(parsed);
      } else {

        await AsyncStorage.setItem('usuario', JSON.stringify(meseroDefault));
        setUsuario(meseroDefault);
      }
    } catch (error) {
      console.error(' Error al refrescar usuario:', error);
    }
  };

  //  Login
  const login = async (userData: Usuario) => {
    if (!userData) return;
    try {

      await AsyncStorage.setItem('usuario', JSON.stringify(userData));
      await AsyncStorage.setItem('refreshTabs', '1');
      setUsuario(userData);
    } catch (error) {
      console.error(' Error en login:', error);
    }
  };

  // Logout
  const logout = async () => {
    try {

      await AsyncStorage.removeItem('usuario');
      await AsyncStorage.setItem('refreshTabs', '1');
      await AsyncStorage.setItem('usuario', JSON.stringify(meseroDefault));
      setUsuario(meseroDefault);
    } catch (error) {
      console.error(' Error en logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);