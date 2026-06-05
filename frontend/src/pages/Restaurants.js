// Page liste des restaurants : recherche, tri (comparaison) et badge "Meilleur choix".
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { formaterFrais, formaterDelai, scoreComparaison } from '../utils/format';
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

  // Identifiant du restaurant ayant le meilleur score (le plus bas).
  const meilleurId = useMemo(() => {
    if (restaurants.length === 0) return null;
    return restaurants.reduce((meilleur, r) =>
      scoreComparaison(r) < scoreComparaison(meilleur) ? r : meilleur
    ).id;
  }, [restaurants]);

  // Filtre (recherche) puis trie la liste selon le critère choisi.
  const affiches = useMemo(() => {
    const filtres = restaurants.filter((r) => {
      const texte = `${r.nom} ${r.adresse}`.toLowerCase();
      return texte.includes(recherche.toLowerCase());
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
  }, [restaurants, recherche, tri]);

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
