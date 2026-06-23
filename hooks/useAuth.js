'use client';
import { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUsuario(null);
        setCargando(false);
        return;
      }

      const cargarUsuario = async (reintentos = 0) => {
        try {
          const snap = await getDoc(doc(db, 'usuarios', firebaseUser.uid));
          if (!snap.exists()) {
            setUsuario(null);
          } else {
            setUsuario({ uid: firebaseUser.uid, ...snap.data() });
          }
          setCargando(false);
        } catch (err) {
          if (err.code === 'permission-denied' && reintentos < 3) {
            await new Promise((r) => setTimeout(r, 600 * (reintentos + 1)));
            return cargarUsuario(reintentos + 1);
          }
          console.error('Error leyendo usuario de Firestore:', err);
          setUsuario(null);
          setCargando(false);
        }
      };

      await cargarUsuario();
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}