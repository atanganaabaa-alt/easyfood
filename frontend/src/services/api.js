// Service API central : configure axios pour parler au backend EasyFood.
import axios from 'axios';

// URL de base de l'API. Modifiable via la variable d'environnement REACT_APP_API_URL.
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL });

// Intercepteur : ajoute automatiquement le token JWT à chaque requête s'il existe.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('easyfood_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
