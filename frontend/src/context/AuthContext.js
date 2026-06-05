// Contexte d'authentification : partage l'utilisateur connecté et le token
// dans toute l'application, et gère la connexion / déconnexion.
import { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // On restaure l'utilisateur depuis le localStorage au démarrage (session persistante).
  const [user, setUser] = useState(() => {
    const stocke = localStorage.getItem('easyfood_user');
    return stocke ? JSON.parse(stocke) : null;
  });

  // Enregistre la session (token + utilisateur) localement et en mémoire.
  const enregistrerSession = useCallback((token, utilisateur) => {
    localStorage.setItem('easyfood_token', token);
    localStorage.setItem('easyfood_user', JSON.stringify(utilisateur));
    setUser(utilisateur);
  }, []);

  // Connexion : appelle l'API puis enregistre la session.
  const login = useCallback(async (email, motDePasse) => {
    const { data } = await api.post('/auth/login', { email, mot_de_passe: motDePasse });
    enregistrerSession(data.token, data.user);
    return data.user;
  }, [enregistrerSession]);

  // Inscription : crée le compte puis connecte directement l'utilisateur.
  const register = useCallback(async (champs) => {
    const { data } = await api.post('/auth/register', champs);
    enregistrerSession(data.token, data.user);
    return data.user;
  }, [enregistrerSession]);

  // Déconnexion : on nettoie tout.
  const logout = useCallback(() => {
    localStorage.removeItem('easyfood_token');
    localStorage.removeItem('easyfood_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Petit hook pratique pour accéder au contexte d'authentification.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider.");
  }
  return ctx;
}
