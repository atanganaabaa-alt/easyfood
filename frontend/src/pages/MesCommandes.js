// Historique des commandes du client.
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import { formaterPrix, infoStatut, formaterDate } from '../utils/format';
import './Commandes.css';

function MesCommandes() {
  const location = useLocation();
  const [commandes, setCommandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  // Affiche un message si on arrive juste après une commande réussie.
  const commandeReussie = location.state?.commandeReussie;

  useEffect(() => {
    const charger = async () => {
      try {
        const { data } = await api.get('/commandes/mes');
        setCommandes(data);
      } catch (err) {
        setErreur("Impossible de charger vos commandes.");
      } finally {
        setChargement(false);
      }
    };
    charger();
  }, []);

  return (
    <div className="ef-container ef-page">
      <div className="ef-page-head">
        <h1>Mes commandes</h1>
        <p className="ef-text-muted">Suivez l'état de vos commandes en cours et passées.</p>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MesCommandes;
