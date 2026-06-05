// Page liste des restaurants visibles par le client.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './Restaurants.css';

// Image par défaut si un restaurant n'a pas de logo.
const LOGO_DEFAUT = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400';

function Restaurants() {
  const [restaurants, setRestaurants] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  // Récupère la liste des restaurants au chargement de la page.
  useEffect(() => {
    const charger = async () => {
      try {
        const { data } = await api.get('/restaurants');
        setRestaurants(data);
      } catch (err) {
        setErreur("Impossible de charger les restaurants pour le moment.");
      } finally {
        setChargement(false);
      }
    };
    charger();
  }, []);

  // Filtre les restaurants selon la recherche (nom ou adresse).
  const filtres = restaurants.filter((r) => {
    const texte = `${r.nom} ${r.adresse}`.toLowerCase();
    return texte.includes(recherche.toLowerCase());
  });

  return (
    <div className="ef-container ef-page">
      <div className="ef-page-head">
        <h1>Nos restaurants 🍴</h1>
        <p className="ef-text-muted">Choisissez un restaurant et découvrez son menu.</p>
      </div>

      <input
        type="search"
        className="ef-input ef-search"
        placeholder="🔎 Rechercher un restaurant ou une ville..."
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
      />

      {chargement && <p className="ef-center ef-text-muted ef-mt">Chargement en cours...</p>}
      {erreur && <div className="ef-alert ef-alert-error ef-mt">{erreur}</div>}

      {!chargement && !erreur && filtres.length === 0 && (
        <p className="ef-center ef-text-muted ef-mt">Aucun restaurant trouvé.</p>
      )}

      <div className="ef-resto-grid">
        {filtres.map((r) => (
          <Link to={`/restaurants/${r.id}`} key={r.id} className="ef-card ef-resto-card">
            <div
              className="ef-resto-img"
              style={{ backgroundImage: `url(${r.logo_url || LOGO_DEFAUT})` }}
            />
            <div className="ef-resto-body">
              <h3>{r.nom}</h3>
              <p className="ef-resto-adresse">📍 {r.adresse}</p>
              {r.description && <p className="ef-text-muted ef-resto-desc">{r.description}</p>}
              {r.horaires && <span className="ef-badge">🕒 {r.horaires}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Restaurants;
