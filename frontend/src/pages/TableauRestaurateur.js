// Tableau de bord du restaurateur : gérer le profil de son restaurant
// et le menu (ajout, disponibilité, suppression des plats).
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formaterPrix } from '../utils/format';
import './TableauRestaurateur.css';

// Champs vides pour le formulaire de profil du restaurant.
const RESTO_VIDE = {
  nom: '', adresse: '', description: '', logo_url: '', horaires: '',
  delai_min: 20, delai_max: 40, frais_livraison: 0, distance_km: 0,
};
// Champs vides pour le formulaire d'ajout de plat.
const PLAT_VIDE = { nom: '', description: '', prix: '', photo_url: '' };

function TableauRestaurateur() {
  const { user } = useAuth();

  const [restaurant, setRestaurant] = useState(null);
  const [plats, setPlats] = useState([]);
  const [formResto, setFormResto] = useState(RESTO_VIDE);
  const [formPlat, setFormPlat] = useState(PLAT_VIDE);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  // Charge le restaurant du restaurateur connecté (s'il en a déjà un) et ses plats.
  const charger = useCallback(async () => {
    setChargement(true);
    setErreur('');
    try {
      const { data: restos } = await api.get('/restaurants');
      const monResto = restos.find((r) => r.proprietaire_id === user.id) || null;
      setRestaurant(monResto);

      if (monResto) {
        setFormResto({
          nom: monResto.nom || '',
          adresse: monResto.adresse || '',
          description: monResto.description || '',
          logo_url: monResto.logo_url || '',
          horaires: monResto.horaires || '',
          delai_min: monResto.delai_min ?? 20,
          delai_max: monResto.delai_max ?? 40,
          frais_livraison: monResto.frais_livraison ?? 0,
          distance_km: monResto.distance_km ?? 0,
        });
        const { data: sesPlats } = await api.get(`/plats/restaurant/${monResto.id}`);
        setPlats(sesPlats);
      }
    } catch (err) {
      setErreur("Impossible de charger votre restaurant pour le moment.");
    } finally {
      setChargement(false);
    }
  }, [user.id]);

  useEffect(() => {
    charger();
  }, [charger]);

  // Met à jour un champ du formulaire restaurant.
  const modifierResto = (cle, valeur) => setFormResto((prev) => ({ ...prev, [cle]: valeur }));
  // Met à jour un champ du formulaire plat.
  const modifierPlat = (cle, valeur) => setFormPlat((prev) => ({ ...prev, [cle]: valeur }));

  // Crée ou met à jour le profil du restaurant.
  const enregistrerResto = async (e) => {
    e.preventDefault();
    setErreur('');
    setSucces('');
    // On convertit les champs numériques avant l'envoi.
    const charge = {
      ...formResto,
      delai_min: Number(formResto.delai_min) || 0,
      delai_max: Number(formResto.delai_max) || 0,
      frais_livraison: Number(formResto.frais_livraison) || 0,
      distance_km: Number(formResto.distance_km) || 0,
    };
    try {
      if (restaurant) {
        const { data } = await api.put(`/restaurants/${restaurant.id}`, charge);
        setRestaurant(data);
        setSucces('Profil du restaurant mis à jour ✅');
      } else {
        const { data } = await api.post('/restaurants', charge);
        setRestaurant(data);
        setSucces('Restaurant créé ! Ajoutez maintenant vos premiers plats 🍽️');
      }
    } catch (err) {
      setErreur(err.response?.data?.message || "Enregistrement impossible.");
    }
  };

  // Ajoute un nouveau plat au menu.
  const ajouterPlat = async (e) => {
    e.preventDefault();
    setErreur('');
    setSucces('');
    try {
      const { data } = await api.post('/plats', {
        ...formPlat,
        prix: Number(formPlat.prix),
        restaurant_id: restaurant.id,
      });
      setPlats((prev) => [data, ...prev]);
      setFormPlat(PLAT_VIDE);
      setSucces('Plat ajouté au menu 🎉');
    } catch (err) {
      setErreur(err.response?.data?.message || "Ajout du plat impossible.");
    }
  };

  // Bascule la disponibilité d'un plat (disponible / indisponible).
  const basculerDispo = async (plat) => {
    try {
      const { data } = await api.put(`/plats/${plat.id}`, {
        nom: plat.nom,
        description: plat.description,
        prix: plat.prix,
        photo_url: plat.photo_url,
        disponible: !plat.disponible,
      });
      setPlats((prev) => prev.map((p) => (p.id === plat.id ? data : p)));
    } catch (err) {
      setErreur("Modification de la disponibilité impossible.");
    }
  };

  // Supprime un plat du menu.
  const supprimerPlat = async (id) => {
    try {
      await api.delete(`/plats/${id}`);
      setPlats((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setErreur("Suppression impossible.");
    }
  };

  if (chargement) {
    return <p className="ef-center ef-text-muted ef-page">Chargement de votre espace...</p>;
  }

  return (
    <div className="ef-container ef-page ef-dash">
      <div className="ef-page-head">
        <h1>Mon restaurant 👨‍🍳</h1>
        <p className="ef-text-muted">
          Bonjour {user.nom?.split(' ')[0]}, gérez ici votre vitrine et votre menu.
        </p>
      </div>

      {erreur && <div className="ef-alert ef-alert-error">{erreur}</div>}
      {succes && <div className="ef-alert ef-alert-success">{succes}</div>}

      {/* ---- Profil du restaurant ---- */}
      <section className="ef-card ef-dash-card">
        <h2>{restaurant ? 'Profil du restaurant' : 'Créez votre restaurant'}</h2>
        <form onSubmit={enregistrerResto}>
          <div className="ef-field">
            <label className="ef-label" htmlFor="r-nom">Nom du restaurant *</label>
            <input id="r-nom" className="ef-input" placeholder="Ex : Chez Mama Africa"
              value={formResto.nom} onChange={(e) => modifierResto('nom', e.target.value)} required />
          </div>
          <div className="ef-field">
            <label className="ef-label" htmlFor="r-adr">Adresse *</label>
            <input id="r-adr" className="ef-input" placeholder="Ex : Akwa, Douala"
              value={formResto.adresse} onChange={(e) => modifierResto('adresse', e.target.value)} required />
          </div>
          <div className="ef-field">
            <label className="ef-label" htmlFor="r-desc">Description</label>
            <textarea id="r-desc" className="ef-textarea" placeholder="Présentez votre cuisine en quelques mots..."
              value={formResto.description} onChange={(e) => modifierResto('description', e.target.value)} />
          </div>
          <div className="ef-grid-2">
            <div className="ef-field">
              <label className="ef-label" htmlFor="r-logo">Logo / photo (URL)</label>
              <input id="r-logo" className="ef-input" placeholder="https://..."
                value={formResto.logo_url} onChange={(e) => modifierResto('logo_url', e.target.value)} />
            </div>
            <div className="ef-field">
              <label className="ef-label" htmlFor="r-hor">Horaires</label>
              <input id="r-hor" className="ef-input" placeholder="Lun-Dim : 09h - 22h"
                value={formResto.horaires} onChange={(e) => modifierResto('horaires', e.target.value)} />
            </div>
          </div>

          {/* Infos de livraison utilisées pour la comparaison côté client. */}
          <div className="ef-grid-2">
            <div className="ef-field">
              <label className="ef-label" htmlFor="r-dmin">Délai min (min)</label>
              <input id="r-dmin" type="number" min="0" className="ef-input"
                value={formResto.delai_min} onChange={(e) => modifierResto('delai_min', e.target.value)} />
            </div>
            <div className="ef-field">
              <label className="ef-label" htmlFor="r-dmax">Délai max (min)</label>
              <input id="r-dmax" type="number" min="0" className="ef-input"
                value={formResto.delai_max} onChange={(e) => modifierResto('delai_max', e.target.value)} />
            </div>
          </div>
          <div className="ef-grid-2">
            <div className="ef-field">
              <label className="ef-label" htmlFor="r-frais">Frais de livraison (XAF)</label>
              <input id="r-frais" type="number" min="0" className="ef-input"
                value={formResto.frais_livraison} onChange={(e) => modifierResto('frais_livraison', e.target.value)} />
            </div>
            <div className="ef-field">
              <label className="ef-label" htmlFor="r-dist">Distance (km)</label>
              <input id="r-dist" type="number" min="0" step="0.1" className="ef-input"
                value={formResto.distance_km} onChange={(e) => modifierResto('distance_km', e.target.value)} />
            </div>
          </div>

          <button type="submit" className="ef-btn ef-btn-primary">
            {restaurant ? 'Enregistrer les modifications' : 'Créer mon restaurant'}
          </button>
        </form>
      </section>

      {/* ---- Gestion du menu (uniquement si le restaurant existe) ---- */}
      {restaurant && (
        <section className="ef-card ef-dash-card">
          <h2>Mon menu 🍽️</h2>

          <form onSubmit={ajouterPlat} className="ef-plat-form">
            <div className="ef-grid-2">
              <div className="ef-field">
                <label className="ef-label" htmlFor="p-nom">Nom du plat *</label>
                <input id="p-nom" className="ef-input" placeholder="Ex : Ndolè aux crevettes"
                  value={formPlat.nom} onChange={(e) => modifierPlat('nom', e.target.value)} required />
              </div>
              <div className="ef-field">
                <label className="ef-label" htmlFor="p-prix">Prix (XAF) *</label>
                <input id="p-prix" type="number" min="0" className="ef-input" placeholder="2500"
                  value={formPlat.prix} onChange={(e) => modifierPlat('prix', e.target.value)} required />
              </div>
            </div>
            <div className="ef-field">
              <label className="ef-label" htmlFor="p-desc">Description</label>
              <input id="p-desc" className="ef-input" placeholder="Ex : Plat traditionnel, sauce d'arachide..."
                value={formPlat.description} onChange={(e) => modifierPlat('description', e.target.value)} />
            </div>
            <div className="ef-field">
              <label className="ef-label" htmlFor="p-photo">Photo (URL)</label>
              <input id="p-photo" className="ef-input" placeholder="https://..."
                value={formPlat.photo_url} onChange={(e) => modifierPlat('photo_url', e.target.value)} />
            </div>
            <button type="submit" className="ef-btn ef-btn-primary">+ Ajouter le plat</button>
          </form>

          {plats.length === 0 ? (
            <p className="ef-text-muted ef-mt">Aucun plat pour le moment. Ajoutez votre premier plat ci-dessus !</p>
          ) : (
            <ul className="ef-plat-liste">
              {plats.map((p) => (
                <li key={p.id} className={`ef-plat-ligne ${!p.disponible ? 'indispo' : ''}`}>
                  <div className="ef-plat-ligne-info">
                    <strong>{p.nom}</strong>
                    <span className="ef-plat-ligne-prix">{formaterPrix(p.prix)}</span>
                    {p.description && <span className="ef-text-muted ef-plat-ligne-desc">{p.description}</span>}
                  </div>
                  <div className="ef-plat-ligne-actions">
                    <button className="ef-btn ef-btn-outline ef-btn-sm" onClick={() => basculerDispo(p)}>
                      {p.disponible ? 'Rendre indispo.' : 'Rendre dispo.'}
                    </button>
                    <button className="ef-btn ef-btn-ghost ef-btn-sm ef-btn-danger" onClick={() => supprimerPlat(p.id)}>
                      Supprimer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

export default TableauRestaurateur;
