// Historique + suivi en temps réel des commandes du client.
// Chaque commande affiche une timeline de statut et, une fois livrée, un formulaire de notation.
import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import Etoiles from '../components/Etoiles';
import CarteSuivi from '../components/CarteSuivi';
import { formaterPrix, infoStatut, formaterDate, ETAPES_SUIVI, indiceEtape } from '../utils/format';
import './Commandes.css';

// Timeline de progression d'une commande.
function SuiviCommande({ statut }) {
  if (statut === 'annulee') {
    return <p className="ef-suivi-annulee">Cette commande a été annulée.</p>;
  }
  const courant = indiceEtape(statut);
  return (
    <div className="ef-suivi">
      {ETAPES_SUIVI.map((etape, i) => {
        const classe = i < courant ? 'faite' : i === courant ? 'active' : '';
        return (
          <div key={etape.statut} className={`ef-suivi-etape ${classe}`}>
            <div className="ef-suivi-pastille">{i < courant ? '✓' : ''}</div>
            {etape.label}
          </div>
        );
      })}
    </div>
  );
}

// Formulaire de notation (restaurant + livreur) après livraison.
function FormulaireNotation({ commande, onEvalue }) {
  const [noteResto, setNoteResto] = useState(0);
  const [noteLivreur, setNoteLivreur] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const envoyer = async () => {
    if (noteResto < 1) {
      setErreur('Merci de noter le restaurant (au moins 1 étoile).');
      return;
    }
    setErreur('');
    setEnvoi(true);
    try {
      await api.post(`/commandes/${commande.id}/evaluation`, {
        note_restaurant: noteResto,
        note_livreur: commande.livreur_nom && noteLivreur > 0 ? noteLivreur : null,
        commentaire: commentaire.trim() || null,
      });
      onEvalue();
    } catch (err) {
      setErreur(err.response?.data?.message || "Impossible d'enregistrer votre note.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="ef-eval-bloc">
      <strong>Donnez votre avis</strong>
      <div className="ef-eval-ligne ef-mt">
        <span className="ef-label">Le restaurant ({commande.restaurant_nom})</span>
        <Etoiles valeur={noteResto} onChange={setNoteResto} />
      </div>
      {commande.livreur_nom && (
        <div className="ef-eval-ligne">
          <span className="ef-label">Le livreur ({commande.livreur_nom})</span>
          <Etoiles valeur={noteLivreur} onChange={setNoteLivreur} />
        </div>
      )}
      <div className="ef-eval-ligne">
        <span className="ef-label">Commentaire (optionnel)</span>
        <textarea
          className="ef-input"
          rows={2}
          placeholder="Partagez votre expérience..."
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
        />
      </div>
      {erreur && <div className="ef-alert ef-alert-error">{erreur}</div>}
      <button className="ef-btn ef-btn-primary ef-btn-sm" onClick={envoyer} disabled={envoi}>
        {envoi ? 'Envoi...' : 'Envoyer mon avis'}
      </button>
    </div>
  );
}

function MesCommandes() {
  const location = useLocation();
  const [commandes, setCommandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const premierChargement = useRef(true);

  const commandeReussie = location.state?.commandeReussie;

  const charger = useCallback(async () => {
    try {
      const { data } = await api.get('/commandes/mes');
      setCommandes(data);
      setErreur('');
    } catch (err) {
      setErreur('Impossible de charger vos commandes.');
    } finally {
      if (premierChargement.current) {
        setChargement(false);
        premierChargement.current = false;
      }
    }
  }, []);

  // Chargement initial + rafraîchissement automatique (suivi temps réel).
  useEffect(() => {
    charger();
    const intervalle = setInterval(charger, 10000);
    return () => clearInterval(intervalle);
  }, [charger]);

  return (
    <div className="ef-container ef-page">
      <div className="ef-page-head">
        <h1>Mes commandes</h1>
        <p className="ef-text-muted">Suivez l'état de vos commandes en temps réel.</p>
      </div>

      {commandeReussie && (
        <div className="ef-alert ef-alert-success">
          Commande #{commandeReussie} confirmée et payée. Le restaurant la prépare bientôt.
        </div>
      )}

      {chargement && <p className="ef-center ef-text-muted ef-mt">Chargement...</p>}
      {erreur && <div className="ef-alert ef-alert-error">{erreur}</div>}

      {!chargement && !erreur && commandes.length === 0 && (
        <div className="ef-center ef-mt">
          <p className="ef-text-muted">Vous n'avez encore passé aucune commande.</p>
          <Link to="/restaurants" className="ef-btn ef-btn-primary ef-mt">Commander maintenant</Link>
        </div>
      )}

      <div className="ef-cmd-liste">
        {commandes.map((c) => {
          const statut = infoStatut(c.statut);
          const livree = c.statut === 'livree';
          const dejaNote = !!c.evaluation_id;
          return (
            <div key={c.id} className="ef-card ef-cmd-card">
              <div className="ef-cmd-head">
                <div>
                  <strong>Commande #{c.id}</strong>
                  <span className="ef-text-muted ef-cmd-resto"> · {c.restaurant_nom}</span>
                  <div className="ef-text-muted ef-cmd-date">{formaterDate(c.created_at)}</div>
                </div>
                <span className={`ef-statut ef-statut-${statut.classe}`}>{statut.label}</span>
              </div>

              <SuiviCommande statut={c.statut} />

              {c.livreur_nom && (c.statut === 'en_livraison' || livree) && (
                <p className="ef-livreur-info">
                  Livreur : {c.livreur_nom}
                  {c.livreur_telephone ? ` · ${c.livreur_telephone}` : ''}
                </p>
              )}

              {/* Carte de suivi en direct : restaurant + position du livreur. */}
              {c.statut === 'en_livraison' && (c.livreur_lat != null || c.restaurant_lat != null) && (
                <CarteSuivi
                  restaurant={{ lat: c.restaurant_lat, lng: c.restaurant_lng, nom: c.restaurant_nom }}
                  livreur={{ lat: c.livreur_lat, lng: c.livreur_lng }}
                />
              )}

              <ul className="ef-cmd-items">
                {c.items.map((i) => (
                  <li key={i.id}>
                    <span>{i.quantite} × {i.nom_plat}</span>
                    <span>{formaterPrix(i.prix_unitaire * i.quantite)}</span>
                  </li>
                ))}
              </ul>

              <div className="ef-cmd-foot">
                <span className="ef-text-muted">📍 {c.adresse_livraison}</span>
                <strong>Total : {formaterPrix(c.total)}</strong>
              </div>

              {/* Notation après livraison */}
              {livree && dejaNote && (
                <div className="ef-eval-bloc">
                  <span className="ef-eval-merci">Merci pour votre avis</span>
                  <div className="ef-eval-ligne ef-mt">
                    <span className="ef-label">Restaurant</span>
                    <Etoiles valeur={c.note_restaurant} />
                  </div>
                  {c.note_livreur != null && (
                    <div className="ef-eval-ligne">
                      <span className="ef-label">Livreur</span>
                      <Etoiles valeur={c.note_livreur} />
                    </div>
                  )}
                </div>
              )}
              {livree && !dejaNote && (
                <FormulaireNotation commande={c} onEvalue={charger} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MesCommandes;
