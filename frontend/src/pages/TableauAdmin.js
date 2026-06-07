// Tableau de bord administrateur : statistiques, commissions, gestion des utilisateurs.
import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { formaterPrix } from '../utils/format';
import './Admin.css';

function TableauAdmin() {
  const [onglet, setOnglet] = useState('stats');
  const [stats, setStats] = useState(null);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [commission, setCommission] = useState(null);
  const [nouveauTaux, setNouveauTaux] = useState('');
  const [filtreRole, setFiltreRole] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  const chargerStats = useCallback(async () => {
    const { data } = await api.get('/admin/stats');
    setStats(data);
    setNouveauTaux(String((data.taux_commission * 100).toFixed(0)));
  }, []);

  const chargerUtilisateurs = useCallback(async () => {
    const params = {};
    if (filtreRole) params.role = filtreRole;
    const { data } = await api.get('/admin/utilisateurs', { params });
    setUtilisateurs(data);
  }, [filtreRole]);

  const chargerCommission = useCallback(async () => {
    const { data } = await api.get('/admin/commission');
    setCommission(data);
    setNouveauTaux(String((data.taux_commission * 100).toFixed(0)));
  }, []);

  useEffect(() => {
    const init = async () => {
      setChargement(true);
      setErreur('');
      try {
        await Promise.all([chargerStats(), chargerUtilisateurs(), chargerCommission()]);
      } catch (err) {
        setErreur('Impossible de charger le tableau de bord.');
      } finally {
        setChargement(false);
      }
    };
    init();
  }, [chargerStats, chargerUtilisateurs, chargerCommission]);

  useEffect(() => {
    if (!chargement) chargerUtilisateurs().catch(() => {});
  }, [filtreRole, chargement, chargerUtilisateurs]);

  const suspendre = async (id, actif) => {
    try {
      await api.put(`/admin/utilisateurs/${id}/statut`, { actif });
      setSucces(actif ? 'Compte réactivé.' : 'Compte suspendu.');
      await chargerUtilisateurs();
      await chargerStats();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Action impossible.');
    }
  };

  const valider = async (id) => {
    try {
      await api.put(`/admin/utilisateurs/${id}/valider`);
      setSucces('Restaurateur validé.');
      await chargerUtilisateurs();
      await chargerStats();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Validation impossible.');
    }
  };

  const supprimer = async (id, nom) => {
    if (!window.confirm(`Supprimer définitivement ${nom} ?`)) return;
    try {
      await api.delete(`/admin/utilisateurs/${id}`);
      setSucces('Utilisateur supprimé.');
      await chargerUtilisateurs();
      await chargerStats();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  const enregistrerTaux = async (e) => {
    e.preventDefault();
    const pct = Number(nouveauTaux);
    if (!Number.isFinite(pct) || pct < 0 || pct > 50) {
      setErreur('Le taux doit être entre 0 et 50 %.');
      return;
    }
    try {
      await api.put('/admin/commission', { taux_commission: pct / 100 });
      setSucces(`Taux de commission mis à jour : ${pct} %.`);
      await chargerStats();
      await chargerCommission();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Mise à jour impossible.');
    }
  };

  return (
    <div className="ef-container ef-page">
      <div className="ef-page-head">
        <h1>Administration EasyFood</h1>
        <p className="ef-text-muted">Supervisez la plateforme, les utilisateurs et les commissions.</p>
      </div>

      <div className="ef-admin-tabs">
        {[
          { id: 'stats', label: 'Statistiques' },
          { id: 'users', label: 'Utilisateurs' },
          { id: 'commission', label: 'Commissions' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            className={`ef-admin-tab ${onglet === t.id ? 'active' : ''}`}
            onClick={() => setOnglet(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {succes && <div className="ef-alert ef-alert-success">{succes}</div>}
      {erreur && <div className="ef-alert ef-alert-error">{erreur}</div>}
      {chargement && <p className="ef-text-muted">Chargement...</p>}

      {!chargement && onglet === 'stats' && stats && (
        <section className="ef-admin-section">
          <div className="ef-admin-grid">
            <div className="ef-stat-card">
              <span className="ef-stat-label">Commandes aujourd'hui</span>
              <strong>{stats.commandes_jour}</strong>
            </div>
            <div className="ef-stat-card">
              <span className="ef-stat-label">Chiffre d'affaires (jour)</span>
              <strong>{formaterPrix(stats.chiffre_affaires_jour)}</strong>
            </div>
            <div className="ef-stat-card">
              <span className="ef-stat-label">Taux de livraison</span>
              <strong>{stats.taux_livraison} %</strong>
            </div>
            <div className="ef-stat-card">
              <span className="ef-stat-label">Satisfaction</span>
              <strong>{stats.satisfaction} / 5</strong>
              <span className="ef-text-muted">{stats.nb_avis} avis</span>
            </div>
            <div className="ef-stat-card">
              <span className="ef-stat-label">Commissions (jour)</span>
              <strong>{formaterPrix(stats.commission_jour)}</strong>
            </div>
            <div className="ef-stat-card">
              <span className="ef-stat-label">Commissions (mois)</span>
              <strong>{formaterPrix(stats.commission_mois)}</strong>
            </div>
            <div className="ef-stat-card">
              <span className="ef-stat-label">Utilisateurs</span>
              <strong>{stats.utilisateurs.total}</strong>
              <span className="ef-text-muted">
                {stats.utilisateurs.clients} clients · {stats.utilisateurs.restaurateurs} restos · {stats.utilisateurs.livreurs} livreurs
              </span>
            </div>
            <div className="ef-stat-card">
              <span className="ef-stat-label">Restos en attente</span>
              <strong>{stats.utilisateurs.resto_en_attente}</strong>
            </div>
          </div>
        </section>
      )}

      {!chargement && onglet === 'users' && (
        <section className="ef-admin-section">
          <div className="ef-filtres-bar">
            <select value={filtreRole} onChange={(e) => setFiltreRole(e.target.value)}>
              <option value="">Tous les rôles</option>
              <option value="client">Clients</option>
              <option value="restaurateur">Restaurateurs</option>
              <option value="livreur">Livreurs</option>
            </select>
          </div>
          <div className="ef-user-table-wrap">
            <table className="ef-user-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {utilisateurs.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nom}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>
                      {!u.actif && <span className="ef-badge ef-badge-off">Suspendu</span>}
                      {u.actif && u.role === 'restaurateur' && !u.valide && (
                        <span className="ef-badge ef-badge-warn">En attente</span>
                      )}
                      {u.actif && (u.role !== 'restaurateur' || u.valide) && (
                        <span className="ef-badge ef-badge-ok">Actif</span>
                      )}
                    </td>
                    <td>
                      <div className="ef-admin-actions">
                        {u.role === 'restaurateur' && !u.valide && (
                          <button type="button" className="ef-btn ef-btn-sm ef-btn-primary" onClick={() => valider(u.id)}>
                            Valider
                          </button>
                        )}
                        <button
                          type="button"
                          className="ef-btn ef-btn-sm ef-btn-outline"
                          onClick={() => suspendre(u.id, !u.actif)}
                        >
                          {u.actif ? 'Suspendre' : 'Réactiver'}
                        </button>
                        <button
                          type="button"
                          className="ef-btn ef-btn-sm ef-btn-ghost"
                          onClick={() => supprimer(u.id, u.nom)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!chargement && onglet === 'commission' && commission && (
        <section className="ef-admin-section">
          <p className="ef-text-muted">
            Commission totale perçue : <strong>{formaterPrix(commission.total)}</strong>
            {' '}({commission.nb_commandes} commandes)
          </p>
          <form className="ef-commission-form ef-mt" onSubmit={enregistrerTaux}>
            <div className="ef-field">
              <label className="ef-label" htmlFor="taux">Taux de commission (%)</label>
              <input
                id="taux"
                type="number"
                className="ef-input"
                min="0"
                max="50"
                step="1"
                value={nouveauTaux}
                onChange={(e) => setNouveauTaux(e.target.value)}
              />
            </div>
            <button type="submit" className="ef-btn ef-btn-primary">Enregistrer</button>
          </form>
          <p className="ef-text-muted ef-mt">
            Appliqué sur chaque commande payée. Exemple : 10 % sur 5 000 FCFA = 500 FCFA de commission.
          </p>
        </section>
      )}
    </div>
  );
}

export default TableauAdmin;
