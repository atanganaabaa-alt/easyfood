// Barre de navigation principale, présente sur toutes les pages.
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Déconnecte l'utilisateur et le ramène à l'accueil.
  const seDeconnecter = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="ef-navbar">
      <div className="ef-container ef-navbar-inner">
        <Link to="/" className="ef-logo">
          <span className="ef-logo-emoji" aria-hidden="true">🍲</span>
          <span>Easy<span className="ef-logo-accent">Food</span></span>
        </Link>

        <nav className="ef-nav-links">
          <Link to="/restaurants">Restaurants</Link>

          {/* Lien vers le tableau de bord réservé aux restaurateurs. */}
          {user?.role === 'restaurateur' && (
            <Link to="/restaurateur">Mon restaurant</Link>
          )}

          {user ? (
            <div className="ef-nav-user">
              <span className="ef-nav-hello">Bonjour, {user.nom?.split(' ')[0]} 👋</span>
              <button className="ef-btn ef-btn-outline ef-btn-sm" onClick={seDeconnecter}>
                Déconnexion
              </button>
            </div>
          ) : (
            <div className="ef-nav-user">
              <Link to="/connexion" className="ef-btn ef-btn-ghost ef-btn-sm">Connexion</Link>
              <Link to="/inscription" className="ef-btn ef-btn-primary ef-btn-sm">S'inscrire</Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
