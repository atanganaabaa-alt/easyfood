// Page Panier : récapitulatif des plats choisis avant de commander.
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formaterPrix, formaterFrais } from '../utils/format';
import './Panier.css';

function Panier() {
  const { panier, modifierQuantite, retirer, vider, sousTotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const total = sousTotal + (panier.fraisLivraison || 0);

  // Lance la commande : il faut être connecté.
  const commander = () => {
    if (!user) {
      navigate('/connexion');
      return;
    }
    navigate('/checkout');
  };

  if (panier.items.length === 0) {
    return (
      <div className="ef-container ef-page ef-center">
        <div className="ef-empty">
          <div className="ef-empty-emoji">🛒</div>
          <h2>Votre panier est vide</h2>
          <p className="ef-text-muted">Parcourez les restaurants et ajoutez vos plats préférés.</p>
          <Link to="/restaurants" className="ef-btn ef-btn-primary ef-mt">Découvrir les restaurants</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ef-container ef-page ef-panier">
      <div className="ef-page-head">
        <h1>Votre panier</h1>
        <p className="ef-text-muted">Commande chez <strong>{panier.restaurantNom}</strong></p>
      </div>

      <div className="ef-panier-grid">
        {/* Liste des plats */}
        <div className="ef-card ef-panier-items">
          {panier.items.map((i) => (
            <div key={i.id} className="ef-panier-ligne">
              <div
                className="ef-panier-img"
                style={{ backgroundImage: `url(${i.photo_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'})` }}
              />
              <div className="ef-panier-info">
                <strong>{i.nom}</strong>
                <span className="ef-text-muted">{formaterPrix(i.prix)} / unité</span>
              </div>
              <div className="ef-qte">
                <button className="ef-qte-btn" onClick={() => modifierQuantite(i.id, -1)} aria-label="Diminuer">−</button>
                <span className="ef-qte-val">{i.quantite}</span>
                <button className="ef-qte-btn" onClick={() => modifierQuantite(i.id, +1)} aria-label="Augmenter">+</button>
              </div>
              <div className="ef-panier-prix">{formaterPrix(i.prix * i.quantite)}</div>
              <button className="ef-panier-suppr" onClick={() => retirer(i.id)} aria-label="Retirer">✕</button>
            </div>
          ))}
        </div>

        {/* Récapitulatif */}
        <aside className="ef-card ef-recap">
          <h3>Récapitulatif</h3>
          <div className="ef-recap-ligne">
            <span>Sous-total</span>
            <span>{formaterPrix(sousTotal)}</span>
          </div>
          <div className="ef-recap-ligne">
            <span>Livraison</span>
            <span>{formaterFrais(panier.fraisLivraison)}</span>
          </div>
          <div className="ef-recap-ligne ef-recap-total">
            <span>Total</span>
            <span>{formaterPrix(total)}</span>
          </div>
          <button className="ef-btn ef-btn-primary ef-btn-block ef-mt" onClick={commander}>
            Commander
          </button>
          <button className="ef-btn ef-btn-ghost ef-btn-block ef-vider" onClick={vider}>
            Vider le panier
          </button>
        </aside>
      </div>
    </div>
  );
}

export default Panier;
