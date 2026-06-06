// Barre de navigation principale, présente sur toutes les pages.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Navbar.css';

function Navbar() {
  const { user, logout } = useAuth();
  const { nombreArticles } = useCart();
  const navigate = useNavigate();
  const [recherche, setRecherche] = useState('');

  // Déconnecte l'utilisateur et le ramène à l'accueil.
  const seDeconnecter = () => {
    logout();
    navigate('/');
  };

  // Lance la recherche : redirige vers la liste des restaurants avec le terme saisi.
  const lancerRecherche = (e) => {
    e.preventDefault();
    const terme = recherche.trim();
    navigate(terme ? `/restaurants?q=${encodeURIComponent(terme)}` : '/restaurants');
  };

  return (
    <header className="ef-navbar">
      <div className="ef-container ef-navbar-inner">
        <Link to="/" className="ef-logo">
          <span className="ef-logo-emoji" aria-hidden="true">🍲</span>
          <span>Easy<span className="ef-logo-accent">Food</span></span>
        </Link>

        {/* Barre de recherche centrale (style livraison). */}
        <form className="ef-nav-search" onSubmit={lancerRecherche}>
          <span className="ef-nav-search-icon" aria-hidden="true">🔎</span>
          <input
            type="search"
            className="ef-nav-search-input"
            placeholder="Rechercher un restaurant ou un plat"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
        </form>

        <nav className="ef-nav-links">
          {/* Liens réservés au restaurateur. */}
          {user?.role === 'restaurateur' && (
            <>
              <Link to="/restaurateur" className="ef-nav-link">Mon restaurant</Link>
              <Link to="/restaurateur/commandes" className="ef-nav-link">Commandes</Link>
            </>
          )}

          {/* Historique réservé aux clients connectés. */}
          {user && user.role === 'client' && (
            <Link to="/mes-commandes" className="ef-nav-link">Mes commandes</Link>
          )}

          {/* Espace réservé aux livreurs. */}
          {user?.role === 'livreur' && (
            <Link to="/livreur" className="ef-nav-link">Mes livraisons</Link>
          )}

          {/* Bouton panier (visible pour tous). */}
          <Link to="/panier" className="ef-cart-btn" aria-label="Panier">
            <span aria-hidden="true">🛒</span>
            {nombreArticles > 0 && <span className="ef-cart-count">{nombreArticles}</span>}
          </Link>

          {user ? (
            <div className="ef-nav-user">
              <span className="ef-nav-hello">Bonjour, {user.nom?.split(' ')[0]}</span>
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
