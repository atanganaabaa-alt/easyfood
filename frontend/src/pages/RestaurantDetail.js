// Page détail d'un restaurant : ses infos + la liste de ses plats (le menu).
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { formaterPrix, formaterFrais, formaterDelai } from '../utils/format';
import './RestaurantDetail.css';

const PLAT_DEFAUT = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';

function RestaurantDetail() {
  const { id } = useParams();
  const { ajouter } = useCart();
  const [restaurant, setRestaurant] = useState(null);
  const [plats, setPlats] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [ajoute, setAjoute] = useState(null); // id du plat venant d'être ajouté (feedback)

  // Ajoute un plat au panier. Gère le cas d'un panier d'un autre restaurant.
  const ajouterAuPanier = (plat) => {
    const res = ajouter(plat, restaurant);
    if (!res.ok && res.raison === 'autre_restaurant') {
      const ok = window.confirm(
        "Votre panier contient déjà des plats d'un autre restaurant. Le vider pour commander ici ?"
      );
      if (ok) ajouter(plat, restaurant, true);
      else return;
    }
    setAjoute(plat.id);
    setTimeout(() => setAjoute((actuel) => (actuel === plat.id ? null : actuel)), 1200);
  };

  // Charge en parallèle les infos du restaurant et ses plats.
  useEffect(() => {
    const charger = async () => {
      try {
        const [resResto, resPlats] = await Promise.all([
          api.get(`/restaurants/${id}`),
          api.get(`/plats/restaurant/${id}`),
        ]);
        setRestaurant(resResto.data);
        setPlats(resPlats.data);
      } catch (err) {
        setErreur("Ce restaurant est introuvable.");
      } finally {
        setChargement(false);
      }
    };
    charger();
  }, [id]);

  if (chargement) {
    return <p className="ef-center ef-text-muted ef-page">Chargement du menu...</p>;
  }

  if (erreur || !restaurant) {
    return (
      <div className="ef-container ef-page ef-center">
        <div className="ef-alert ef-alert-error">{erreur || 'Restaurant introuvable.'}</div>
        <Link to="/restaurants" className="ef-btn ef-btn-outline ef-mt">← Retour aux restaurants</Link>
      </div>
    );
  }

  return (
    <div className="ef-detail">
      {/* Bandeau d'en-tête du restaurant */}
      <div
        className="ef-detail-banner"
        style={{ backgroundImage: `url(${restaurant.logo_url || PLAT_DEFAUT})` }}
      >
        <div className="ef-detail-banner-overlay">
          <div className="ef-container">
            <Link to="/restaurants" className="ef-detail-retour">← Tous les restaurants</Link>
            <h1>{restaurant.nom}</h1>
            <p>📍 {restaurant.adresse}</p>
            <div className="ef-detail-meta">
              <span>⭐ {Number(restaurant.note).toFixed(1)}</span>
              <span>⏱️ {formaterDelai(restaurant.delai_min, restaurant.delai_max)}</span>
              <span>📍 {Number(restaurant.distance_km).toFixed(1)} km</span>
              <span>🛵 {formaterFrais(restaurant.frais_livraison)}</span>
            </div>
            {restaurant.horaires && <span className="ef-badge">🕒 {restaurant.horaires}</span>}
          </div>
        </div>
      </div>

      <div className="ef-container ef-page">
        {restaurant.description && (
          <p className="ef-detail-desc">{restaurant.description}</p>
        )}

        <h2 className="ef-menu-title">Le menu</h2>

        {plats.length === 0 ? (
          <p className="ef-text-muted">Ce restaurant n'a pas encore ajouté de plats.</p>
        ) : (
          <div className="ef-plat-grid">
            {plats.map((p) => (
              <div key={p.id} className={`ef-card ef-plat-card ${!p.disponible ? 'indispo' : ''}`}>
                <div
                  className="ef-plat-img"
                  style={{ backgroundImage: `url(${p.photo_url || PLAT_DEFAUT})` }}
                />
                <div className="ef-plat-body">
                  <div className="ef-plat-head">
                    <h3>{p.nom}</h3>
                    <span className="ef-plat-prix">{formaterPrix(p.prix)}</span>
                  </div>
                  {p.description && <p className="ef-text-muted ef-plat-desc">{p.description}</p>}
                  {p.disponible ? (
                    <button
                      className={`ef-btn ef-btn-primary ef-btn-sm ef-btn-block ${ajoute === p.id ? 'ef-btn-ok' : ''}`}
                      onClick={() => ajouterAuPanier(p)}
                    >
                      {ajoute === p.id ? 'Ajouté ✓' : 'Ajouter au panier'}
                    </button>
                  ) : (
                    <span className="ef-badge ef-badge-indispo">Indisponible</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RestaurantDetail;
