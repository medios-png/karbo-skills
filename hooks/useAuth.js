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
      try {
        await firebaseUser.getIdToken(true); // fuerza el token antes de leer Firestore
        const ref = doc(db, 'usuarios', firebaseUser.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setUsuario(null);
          setCargando(false);
          return;
        }
        setUsuario({ uid: firebaseUser.uid, ...snap.data() });
        setCargando(false);
      } catch (err) {
        console.error('Error leyendo usuario de Firestore:', err);
        setUsuario(null);
        setCargando(false);
      }
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