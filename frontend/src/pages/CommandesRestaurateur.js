// Gestion des commandes reçues par le restaurateur.
// La liste se rafraîchit automatiquement toutes les 8 secondes (temps réel léger).
import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../services/api';
import { formaterPrix, infoStatut, formaterDate } from '../utils/format';
import './Commandes.css';

// Action suivante proposée selon le statut courant de la commande.
const ACTIONS = {
  en_attente: [
    { statut: 'acceptee', label: 'Accepter', primaire: true },
    { statut: 'annulee', label: 'Refuser', primaire: false },
  ],
  acceptee: [{ statut: 'en_preparation', label: 'Commencer la préparation', primaire: true }],
  en_preparation: [{ statut: 'prete', label: 'Marquer comme prête', primaire: true }],
  prete: [{ statut: 'livree', label: 'Marquer comme livrée', primaire: true }],
};

function CommandesRestaurateur() {
  const [commandes, setCommandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const premierChargement = useRef(true);

  // Récupère les commandes du restaurateur.
  const charger = useCallback(async () => {
    try {
      const { data } = await api.get('/commandes/restaurant');
      setCommandes(data);
      setErreur('');
    } catch (err) {
      setErreur("Impossible de charger les commandes.");
    } finally {
      if (premierChargement.current) {
        setChargement(false);
        premierChargement.current = false;
      }
    }
  }, []);

  // Chargement initial + rafraîchissement automatique toutes les 8 s.
  useEffect(() => {
    charger();
    const intervalle = setInterval(charger, 8000);
    return () => clearInterval(intervalle);
  }, [charger]);

  // Change le statut d'une commande puis recharge la liste.
  const changerStatut = async (id, statut) => {
    try {
      await api.put(`/commandes/${id}/statut`, { statut });
      await charger();
    } catch (err) {
      setErreur("Impossible de mettre à jour la commande.");
    }
  };

  // Nombre de commandes nécessitant une action (nouvelles ou en cours).
  const enCours = commandes.filter((c) => ['en_attente', 'acceptee', 'en_preparation', 'prete'].includes(c.statut)).length;

  return (
    <div className="ef-container ef-page">
      <div className="ef-page-head">
        <h1>Commandes reçues</h1>
        <p className="ef-text-muted">
          {enCours > 0 ? `${enCours} commande(s) à traiter. ` : 'Aucune commande en attente. '}
          La liste se met à jour automatiquement.
        </p>
      </div>

      {chargement && <p className="ef-center ef-text-muted ef-mt">Chargement...</p>}
      {erreur && <div className="ef-alert ef-alert-error">{erreur}</div>}

      {!chargement && commandes.length === 0 && (
        <p className="ef-center ef-text-muted ef-mt">Vous n'avez pas encore reçu de commande.</p>
      )}

      <div className="ef-cmd-liste">
        {commandes.map((c) => {
          const statut = infoStatut(c.statut);
          const actions = ACTIONS[c.statut] || [];
          return (
            <div key={c.id} className={`ef-card ef-cmd-card ${c.statut === 'en_attente' ? 'ef-cmd-nouvelle' : ''}`}>
              <div className="ef-cmd-head">
                <div>
                  <strong>Commande #{c.id}</strong>
                  <span className="ef-text-muted"> · {c.client_nom}</span>
                  <div className="ef-text-muted ef-cmd-date">{formaterDate(c.created_at)}</div>
                </div>
                <span className={`ef-statut ef-statut-${statut.classe}`}>{statut.label}</span>
              </div>

              <ul className="ef-cmd-items">
                {c.items.map((i) => (
                  <li key={i.id}>
                    <span>{i.quantite} × {i.nom_plat}</span>
                    <span>{formaterPrix(i.prix_unitaire * i.quantite)}</span>
                  </li>
                ))}
              </ul>

              <div className="ef-cmd-foot">
                <span className="ef-text-muted">📍 {c.adresse_livraison} · 📞 {c.telephone}</span>
                <strong>Total : {formaterPrix(c.total)}</strong>
              </div>

              {actions.length > 0 && (
                <div className="ef-cmd-actions">
                  {actions.map((a) => (
                    <button
                      key={a.statut}
                      className={`ef-btn ef-btn-sm ${a.primaire ? 'ef-btn-primary' : 'ef-btn-outline'}`}
                      onClick={() => changerStatut(c.id, a.statut)}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CommandesRestaurateur;
