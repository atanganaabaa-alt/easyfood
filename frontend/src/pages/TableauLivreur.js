// Tableau de bord du livreur : missions disponibles + mes livraisons.
// La liste se rafraîchit automatiquement toutes les 8 secondes.
import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../services/api';
import { formaterPrix, formaterDate, infoStatut } from '../utils/format';
import './Commandes.css';

function TableauLivreur() {
  const [missions, setMissions] = useState([]);
  const [mesLivraisons, setMesLivraisons] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const premierChargement = useRef(true);

  const charger = useCallback(async () => {
    try {
      const [dispo, miennes] = await Promise.all([
        api.get('/commandes/missions'),
        api.get('/commandes/mes-missions'),
      ]);
      setMissions(dispo.data);
      setMesLivraisons(miennes.data);
      setErreur('');
    } catch (err) {
      setErreur('Impossible de charger les missions.');
    } finally {
      if (premierChargement.current) {
        setChargement(false);
        premierChargement.current = false;
      }
    }
  }, []);

  useEffect(() => {
    charger();
    const intervalle = setInterval(charger, 8000);
    return () => clearInterval(intervalle);
  }, [charger]);

  const accepter = async (id) => {
    try {
      await api.put(`/commandes/${id}/accepter`);
      await charger();
    } catch (err) {
      setErreur(err.response?.data?.message || "Impossible d'accepter cette mission.");
    }
  };

  const confirmerLivraison = async (id) => {
    try {
      await api.put(`/commandes/${id}/livrer`);
      await charger();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Impossible de confirmer la livraison.');
    }
  };

  // Sépare les livraisons en cours et l'historique.
  const enCours = mesLivraisons.filter((c) => c.statut === 'en_livraison');
  const historique = mesLivraisons.filter((c) => c.statut === 'livree');

  return (
    <div className="ef-container ef-page">
      <div className="ef-page-head">
        <h1>Espace livreur</h1>
        <p className="ef-text-muted">
          Acceptez une mission, livrez la commande, puis confirmez la livraison.
          La liste se met à jour automatiquement.
        </p>
      </div>

      {erreur && <div className="ef-alert ef-alert-error">{erreur}</div>}
      {chargement && <p className="ef-center ef-text-muted ef-mt">Chargement...</p>}

      {/* Missions en cours */}
      {enCours.length > 0 && (
        <section className="ef-mb">
          <h2 className="ef-section-title">Livraison en cours</h2>
          <div className="ef-cmd-liste">
            {enCours.map((c) => (
              <div key={c.id} className="ef-card ef-cmd-card ef-cmd-nouvelle">
                <div className="ef-cmd-head">
                  <div>
                    <strong>Commande #{c.id}</strong>
                    <span className="ef-text-muted"> · {c.restaurant_nom}</span>
                    <div className="ef-text-muted ef-cmd-date">Client : {c.client_nom}</div>
                  </div>
                  <span className="ef-statut ef-statut-livraison">En livraison</span>
                </div>
                <div className="ef-cmd-foot">
                  <span className="ef-text-muted">Retrait : {c.restaurant_adresse}</span>
                </div>
                <div className="ef-cmd-foot">
                  <span className="ef-text-muted">Livraison : {c.adresse_livraison} · {c.telephone}</span>
                  <strong>{formaterPrix(c.total)}</strong>
                </div>
                <div className="ef-cmd-actions">
                  <button className="ef-btn ef-btn-sm ef-btn-primary" onClick={() => confirmerLivraison(c.id)}>
                    Confirmer la livraison
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Missions disponibles */}
      <section className="ef-mb">
        <h2 className="ef-section-title">Missions disponibles ({missions.length})</h2>
        {!chargement && missions.length === 0 && (
          <p className="ef-text-muted">Aucune mission disponible pour le moment.</p>
        )}
        <div className="ef-cmd-liste">
          {missions.map((m) => (
            <div key={m.id} className="ef-card ef-cmd-card">
              <div className="ef-cmd-head">
                <div>
                  <strong>Commande #{m.id}</strong>
                  <span className="ef-text-muted"> · {m.restaurant_nom}</span>
                  <div className="ef-text-muted ef-cmd-date">{formaterDate(m.created_at)}</div>
                </div>
                <span className="ef-statut ef-statut-prete">Prête</span>
              </div>
              <div className="ef-cmd-foot">
                <span className="ef-text-muted">Retrait : {m.restaurant_adresse}</span>
              </div>
              <div className="ef-cmd-foot">
                <span className="ef-text-muted">Livraison : {m.adresse_livraison}</span>
                <strong>{formaterPrix(m.frais_livraison)} de livraison</strong>
              </div>
              <div className="ef-cmd-actions">
                <button className="ef-btn ef-btn-sm ef-btn-primary" onClick={() => accepter(m.id)}>
                  Accepter la mission
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Historique */}
      {historique.length > 0 && (
        <section>
          <h2 className="ef-section-title">Mes livraisons terminées</h2>
          <div className="ef-cmd-liste">
            {historique.map((c) => {
              const statut = infoStatut(c.statut);
              return (
                <div key={c.id} className="ef-card ef-cmd-card">
                  <div className="ef-cmd-head">
                    <div>
                      <strong>Commande #{c.id}</strong>
                      <span className="ef-text-muted"> · {c.restaurant_nom}</span>
                      <div className="ef-text-muted ef-cmd-date">{formaterDate(c.created_at)}</div>
                    </div>
                    <span className={`ef-statut ef-statut-${statut.classe}`}>{statut.label}</span>
                  </div>
                  <div className="ef-cmd-foot">
                    <span className="ef-text-muted">{c.adresse_livraison}</span>
                    <strong>{formaterPrix(c.total)}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default TableauLivreur;
