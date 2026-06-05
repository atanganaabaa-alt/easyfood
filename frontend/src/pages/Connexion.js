// Page de connexion.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

function Connexion() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  // Soumet le formulaire de connexion.
  const seConnecter = async (e) => {
    e.preventDefault();
    setErreur('');
    setChargement(true);
    try {
      const utilisateur = await login(email, motDePasse);
      // On redirige le restaurateur vers son tableau de bord, sinon vers les restaurants.
      navigate(utilisateur.role === 'restaurateur' ? '/restaurateur' : '/restaurants');
    } catch (err) {
      setErreur(err.response?.data?.message || 'Connexion impossible. Réessayez.');
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="ef-auth-wrap">
      <div className="ef-card ef-auth-card">
        <h1 className="ef-auth-title">Content de vous revoir</h1>
        <p className="ef-auth-subtitle">Connectez-vous pour commander vos plats préférés.</p>

        {erreur && <div className="ef-alert ef-alert-error">{erreur}</div>}

        <form onSubmit={seConnecter}>
          <div className="ef-field">
            <label className="ef-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="ef-input"
              placeholder="vous@exemple.cm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="ef-field">
            <label className="ef-label" htmlFor="mdp">Mot de passe</label>
            <input
              id="mdp"
              type="password"
              className="ef-input"
              placeholder="••••••••"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="ef-btn ef-btn-primary ef-btn-block" disabled={chargement}>
            {chargement ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="ef-demo-hint">
          💡 Compte de démo : <strong>client@easyfood.cm</strong> / <strong>easyfood123</strong>
        </div>

        <p className="ef-auth-switch">
          Pas encore de compte ? <Link to="/inscription">Inscrivez-vous</Link>
        </p>
      </div>
    </div>
  );
}

export default Connexion;
