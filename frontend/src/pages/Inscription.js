// Page d'inscription : crée un compte pour l'un des 4 rôles.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

// Les rôles proposés à l'inscription (l'admin est créé en interne, pas ici).
const ROLES = [
  { value: 'client', label: 'Client', emoji: '🛒' },
  { value: 'restaurateur', label: 'Restaurateur', emoji: '👨‍🍳' },
  { value: 'livreur', label: 'Livreur', emoji: '🛵' },
];

function Inscription() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [champs, setChamps] = useState({
    nom: '',
    email: '',
    telephone: '',
    mot_de_passe: '',
    role: 'client',
  });
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  // Met à jour un champ du formulaire.
  const modifier = (cle, valeur) => setChamps((prev) => ({ ...prev, [cle]: valeur }));

  // Soumet le formulaire d'inscription.
  const sInscrire = async (e) => {
    e.preventDefault();
    setErreur('');
    setChargement(true);
    try {
      const utilisateur = await register(champs);
      const routes = {
        restaurateur: '/restaurateur',
        livreur: '/livreur',
        admin: '/admin',
      };
      navigate(routes[utilisateur.role] || '/restaurants');
    } catch (err) {
      setErreur(err.response?.data?.message || "Inscription impossible. Réessayez.");
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="ef-auth-wrap">
      <div className="ef-card ef-auth-card">
        <h1 className="ef-auth-title">Bienvenue sur EasyFood</h1>
        <p className="ef-auth-subtitle">Créez votre compte en quelques secondes.</p>

        {erreur && <div className="ef-alert ef-alert-error">{erreur}</div>}

        <form onSubmit={sInscrire}>
          <div className="ef-field">
            <label className="ef-label">Je suis...</label>
            <div className="ef-role-grid">
              {ROLES.map((r) => (
                <div
                  key={r.value}
                  className={`ef-role-option ${champs.role === r.value ? 'active' : ''}`}
                  onClick={() => modifier('role', r.value)}
                >
                  <span className="ef-role-emoji" aria-hidden="true">{r.emoji}</span>
                  <span className="ef-role-label">{r.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ef-field">
            <label className="ef-label" htmlFor="nom">Nom complet</label>
            <input
              id="nom"
              type="text"
              className="ef-input"
              placeholder="Ex : Awa Tchamba"
              value={champs.nom}
              onChange={(e) => modifier('nom', e.target.value)}
              required
            />
          </div>

          <div className="ef-field">
            <label className="ef-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="ef-input"
              placeholder="vous@exemple.cm"
              value={champs.email}
              onChange={(e) => modifier('email', e.target.value)}
              required
            />
          </div>

          <div className="ef-field">
            <label className="ef-label" htmlFor="tel">Téléphone</label>
            <input
              id="tel"
              type="tel"
              className="ef-input"
              placeholder="+237 6XX XX XX XX"
              value={champs.telephone}
              onChange={(e) => modifier('telephone', e.target.value)}
            />
          </div>

          <div className="ef-field">
            <label className="ef-label" htmlFor="mdp">Mot de passe</label>
            <input
              id="mdp"
              type="password"
              className="ef-input"
              placeholder="Au moins 6 caractères"
              value={champs.mot_de_passe}
              onChange={(e) => modifier('mot_de_passe', e.target.value)}
              minLength={6}
              required
            />
          </div>

          <button type="submit" className="ef-btn ef-btn-primary ef-btn-block" disabled={chargement}>
            {chargement ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="ef-auth-switch">
          Déjà inscrit ? <Link to="/connexion">Connectez-vous</Link>
        </p>
      </div>
    </div>
  );
}

export default Inscription;
