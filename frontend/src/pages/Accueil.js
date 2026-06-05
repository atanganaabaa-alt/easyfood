// Page d'accueil : un hero chaleureux qui présente EasyFood.
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Accueil.css';

// Quelques atouts mis en avant sur la page d'accueil.
const ATOUTS = [
  { emoji: '🍲', titre: 'Cuisine locale', texte: 'Du ndolè au poisson braisé, le meilleur du Cameroun.' },
  { emoji: '🛵', titre: 'Livraison rapide', texte: 'Vos plats préférés livrés chauds, près de chez vous.' },
  { emoji: '📱', titre: 'Paiement mobile', texte: 'Réglez en toute simplicité avec Orange Money & MTN MoMo.' },
];

function Accueil() {
  const { user } = useAuth();

  return (
    <div className="ef-accueil">
      <section className="ef-hero">
        <div className="ef-container ef-hero-inner">
          <div className="ef-hero-text">
            <span className="ef-hero-tag">🇨🇲 Le goût du Cameroun, livré chez vous</span>
            <h1>Commandez vos plats préférés, <span className="ef-accent">en un clin d'œil</span>.</h1>
            <p>
              EasyFood réunit les meilleurs restaurants de votre ville. Parcourez les menus,
              commandez et payez avec Orange Money ou MTN MoMo. Simple, rapide, chaleureux.
            </p>
            <div className="ef-hero-actions">
              <Link to="/restaurants" className="ef-btn ef-btn-primary">Découvrir les restaurants</Link>
              {!user && (
                <Link to="/inscription" className="ef-btn ef-btn-outline">Créer un compte</Link>
              )}
            </div>
          </div>

          <div className="ef-hero-visual" aria-hidden="true">
            <div className="ef-hero-emoji">🍛</div>
          </div>
        </div>
      </section>

      <section className="ef-container ef-atouts">
        {ATOUTS.map((a) => (
          <div key={a.titre} className="ef-card ef-atout">
            <div className="ef-atout-emoji">{a.emoji}</div>
            <h3>{a.titre}</h3>
            <p className="ef-text-muted">{a.texte}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export default Accueil;
