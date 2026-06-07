// Page liste des restaurants : recherche, tri (comparaison), badge "Meilleur choix"
// et carte géographique pour trouver les restaurants proches de soi.
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import CarteRestaurants from '../components/CarteRestaurants';
import {
  formaterFrais, formaterDelai, scoreComparaison, distanceKm, fraisDepuisDistance,
} from '../utils/format';
import './Restaurants.css';

// Image par défaut si un restaurant n'a pas de logo.
const LOGO_DEFAUT = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400';

// Options de tri proposées à l'utilisateur (comparaison).
const TRIS = [
  { cle: 'meilleur', label: '🏆 Meilleur choix' },
  { cle: 'rapide', label: '⏱️ Le plus rapide' },
  { cle: 'cher', label: '💰 Le moins cher' },
  { cle: 'proche', label: '📍 Le plus proche' },
  { cle: 'note', label: '⭐ Mieux notés' },
];

function Restaurants() {
  const [searchParams] = useSearchParams();
  const [restaurants, setRestaurants] = useState([]);
  // Pré-remplit la recherche depuis l'URL (?q=...) si la navbar a lancé une recherche.
  const [recherche, setRecherche] = useState(searchParams.get('q') || '');
  const [tri, setTri] = useState('meilleur');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  // Position du client (géolocalisation ou clic sur la carte).
  const [position, setPosition] = useState(null);
  const [geoErreur, setGeoErreur] = useState('');
  const [geoChargement, setGeoChargement] = useState(false);
  const [carteVisible, setCarteVisible] = useState(false);
  // Filtres (Sprint 4) : catégorie, note minimale, distance maximale.
  const [categories, setCategories] = useState([]);
  const [categorie, setCategorie] = useState('');
  const [noteMin, setNoteMin] = useState(0);
  const [distanceMax, setDistanceMax] = useState(0);

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

  // Synchronise la recherche si l'URL change (nouvelle recherche depuis la navbar).
  useEffect(() => {
    setRecherche(searchParams.get('q') || '');
  }, [searchParams]);

  // Charge la liste des catégories disponibles (pour le filtre).
  useEffect(() => {
    api.get('/restaurants/meta/categories')
      .then(({ data }) => setCategories(data))
      .catch(() => {});
  }, []);

  // Demande la position du navigateur (géolocalisation).
  const utiliserMaPosition = () => {
    if (!navigator.geolocation) {
      setGeoErreur("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    setGeoErreur('');
    setGeoChargement(true);
    setCarteVisible(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoChargement(false);
      },
      () => {
        setGeoErreur("Impossible d'obtenir votre position. Vous pouvez la choisir sur la carte.");
        setGeoChargement(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Recalcule distance et frais depuis la position du client (si connue).
  const restaurantsEnrichis = useMemo(() => {
    if (!position) return restaurants;
    return restaurants.map((r) => {
      if (r.latitude == null || r.longitude == null) return r;
      const dist = distanceKm(position.lat, position.lng, Number(r.latitude), Number(r.longitude));
      if (dist == null) return r;
      return {
        ...r,
        distance_km: Number(dist.toFixed(1)),
        frais_livraison: fraisDepuisDistance(dist),
        _dynamique: true,
      };
    });
  }, [restaurants, position]);

  // Identifiant du restaurant ayant le meilleur score (le plus bas).
  const meilleurId = useMemo(() => {
    if (restaurantsEnrichis.length === 0) return null;
    return restaurantsEnrichis.reduce((meilleur, r) =>
      scoreComparaison(r) < scoreComparaison(meilleur) ? r : meilleur
    ).id;
  }, [restaurantsEnrichis]);

  // Filtre (recherche + catégorie + note + distance) puis trie la liste.
  const affiches = useMemo(() => {
    const filtres = restaurantsEnrichis.filter((r) => {
      const texte = `${r.nom} ${r.adresse}`.toLowerCase();
      if (!texte.includes(recherche.toLowerCase())) return false;
      if (categorie && r.categorie !== categorie) return false;
      if (noteMin && Number(r.note) < noteMin) return false;
      if (distanceMax && Number(r.distance_km) > distanceMax) return false;
      return true;
    });

    const trie = [...filtres];
    switch (tri) {
      case 'rapide':
        trie.sort((a, b) => a.delai_max - b.delai_max);
        break;
      case 'cher':
        trie.sort((a, b) => a.frais_livraison - b.frais_livraison);
        break;
      case 'proche':
        trie.sort((a, b) => a.distance_km - b.distance_km);
        break;
      case 'note':
        trie.sort((a, b) => b.note - a.note);
        break;
      default:
        trie.sort((a, b) => scoreComparaison(a) - scoreComparaison(b));
    }
    return trie;
  }, [restaurantsEnrichis, recherche, tri, categorie, noteMin, distanceMax]);

  return (
    <div className="ef-container ef-page">
      <div className="ef-page-head">
        <h1>Trouvez le meilleur restaurant</h1>
        <p className="ef-text-muted">
          Comparez les prix, les délais et la distance, puis commandez en un clic.
        </p>
      </div>

      <input
        type="search"
        className="ef-input ef-search"
        placeholder="🔎 Rechercher un restaurant ou une ville..."
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
      />

      {/* Géolocalisation : trouver les restaurants proches et les moins chers. */}
      <div className="ef-geo-bar">
        <button className="ef-btn ef-btn-primary ef-btn-sm" onClick={utiliserMaPosition} disabled={geoChargement}>
          📍 {geoChargement ? 'Localisation...' : 'Restaurants près de moi'}
        </button>
        <button className="ef-btn ef-btn-outline ef-btn-sm" onClick={() => setCarteVisible((v) => !v)}>
          {carteVisible ? 'Masquer la carte' : 'Afficher la carte'}
        </button>
        {position && (
          <span className="ef-geo-actif">Distances et frais calculés depuis votre position.</span>
        )}
      </div>
      {geoErreur && <div className="ef-alert ef-alert-error ef-mt">{geoErreur}</div>}

      {carteVisible && (
        <CarteRestaurants
          restaurants={affiches}
          position={position}
          onChoisirPosition={(p) => setPosition(p)}
          meilleurId={meilleurId}
        />
      )}

      {/* Barre de tri (chips) pour comparer selon différents critères. */}
      <div className="ef-chips">
        {TRIS.map((t) => (
          <button
            key={t.cle}
            className={`ef-chip ${tri === t.cle ? 'active' : ''}`}
            onClick={() => setTri(t.cle)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtres : catégorie, note minimale, distance maximale. */}
      <div className="ef-filtres">
        <select className="ef-select" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className="ef-select" value={noteMin} onChange={(e) => setNoteMin(Number(e.target.value))}>
          <option value={0}>Toutes les notes</option>
          <option value={4.5}>4,5 ★ et plus</option>
          <option value={4}>4 ★ et plus</option>
          <option value={3}>3 ★ et plus</option>
        </select>
        <select className="ef-select" value={distanceMax} onChange={(e) => setDistanceMax(Number(e.target.value))}>
          <option value={0}>Toutes distances</option>
          <option value={2}>Moins de 2 km</option>
          <option value={5}>Moins de 5 km</option>
          <option value={10}>Moins de 10 km</option>
        </select>
        {(categorie || noteMin > 0 || distanceMax > 0) && (
          <button
            type="button"
            className="ef-chip"
            onClick={() => { setCategorie(''); setNoteMin(0); setDistanceMax(0); }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {chargement && <p className="ef-center ef-text-muted ef-mt">Chargement en cours...</p>}
      {erreur && <div className="ef-alert ef-alert-error ef-mt">{erreur}</div>}

      {!chargement && !erreur && affiches.length === 0 && (
        <p className="ef-center ef-text-muted ef-mt">Aucun restaurant trouvé.</p>
      )}

      <div className="ef-resto-grid">
        {affiches.map((r) => (
          <Link to={`/restaurants/${r.id}`} key={r.id} className="ef-card ef-resto-card">
            <div className="ef-resto-img" style={{ backgroundImage: `url(${r.logo_url || LOGO_DEFAUT})` }}>
              {r.id === meilleurId && <span className="ef-best-badge">🏆 Meilleur choix</span>}
            </div>
            <div className="ef-resto-body">
              <h3>{r.nom}</h3>
              {r.categorie && <span className="ef-resto-cat">{r.categorie}</span>}
              {r.description && <p className="ef-text-muted ef-resto-desc">{r.description}</p>}

              {/* Ligne de métadonnées : note, délai, distance, frais. */}
              <div className="ef-resto-meta">
                <span className="ef-meta-note">⭐ {Number(r.note).toFixed(1)}</span>
                <span>· ⏱️ {formaterDelai(r.delai_min, r.delai_max)}</span>
                <span>· 📍 {Number(r.distance_km).toFixed(1)} km</span>
              </div>
              <div className="ef-resto-frais">🛵 {formaterFrais(r.frais_livraison)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Restaurants;
