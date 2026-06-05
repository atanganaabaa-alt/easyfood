// Page de paiement : adresse de livraison + choix du mode de paiement mobile money.
import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formaterPrix, formaterFrais } from '../utils/format';
import './Checkout.css';

// Modes de paiement proposés.
const MODES = [
  { value: 'orange_money', label: 'Orange Money', emoji: '🟠' },
  { value: 'mtn_momo', label: 'MTN Mobile Money', emoji: '🟡' },
];

function Checkout() {
  const { panier, sousTotal, vider } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [adresse, setAdresse] = useState('');
  const [telephone, setTelephone] = useState('');
  const [mode, setMode] = useState('orange_money');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  // Vrai une fois la commande validée : évite que le vidage du panier ne
  // déclenche la redirection "panier vide" avant la redirection finale.
  const [commandeOk, setCommandeOk] = useState(false);

  // Sécurité : panier vide (et commande non encore passée) => retour au panier.
  if (panier.items.length === 0 && !commandeOk) {
    return <Navigate to="/panier" replace />;
  }

  const total = sousTotal + (panier.fraisLivraison || 0);

  // Envoie la commande au backend (qui déclenche le paiement mobile money).
  const payer = async (e) => {
    e.preventDefault();
    setErreur('');
    setChargement(true);
    try {
      const { data } = await api.post('/commandes', {
        restaurant_id: panier.restaurantId,
        items: panier.items.map((i) => ({ plat_id: i.id, quantite: i.quantite })),
        adresse_livraison: adresse,
        telephone,
        mode_paiement: mode,
      });
      setCommandeOk(true);
      vider();
      // Redirige vers l'historique avec un message de succès.
      navigate('/mes-commandes', { state: { commandeReussie: data.id } });
    } catch (err) {
      setErreur(err.response?.data?.message || 'Le paiement a échoué. Veuillez réessayer.');
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="ef-container ef-page ef-checkout">
      <div className="ef-page-head">
        <h1>Paiement</h1>
        <p className="ef-text-muted">Commande chez <strong>{panier.restaurantNom}</strong></p>
      </div>

      {erreur && <div className="ef-alert ef-alert-error">{erreur}</div>}

      <form onSubmit={payer} className="ef-checkout-grid">
        <div className="ef-card ef-checkout-form">
          <h3>Adresse de livraison</h3>
          <div className="ef-field">
            <label className="ef-label" htmlFor="adr">Où vous livrer ?</label>
            <input id="adr" className="ef-input" placeholder="Ex : Bonapriso, rue 1.234, Douala"
              value={adresse} onChange={(e) => setAdresse(e.target.value)} required />
          </div>
          <div className="ef-field">
            <label className="ef-label" htmlFor="tel">Téléphone (pour le paiement et le livreur)</label>
            <input id="tel" type="tel" className="ef-input" placeholder="+237 6XX XX XX XX"
              value={telephone} onChange={(e) => setTelephone(e.target.value)} required />
          </div>

          <h3 className="ef-mt">Mode de paiement</h3>
          <div className="ef-paiement-options">
            {MODES.map((m) => (
              <label key={m.value} className={`ef-paiement-option ${mode === m.value ? 'active' : ''}`}>
                <input type="radio" name="mode" value={m.value}
                  checked={mode === m.value} onChange={() => setMode(m.value)} />
                <span className="ef-paiement-emoji" aria-hidden="true">{m.emoji}</span>
                <span>{m.label}</span>
              </label>
            ))}
          </div>
          <p className="ef-text-muted ef-paiement-note">
            Vous recevrez une demande de confirmation sur votre téléphone {user?.nom ? `, ${user.nom.split(' ')[0]}` : ''}.
          </p>
        </div>

        {/* Récapitulatif */}
        <aside className="ef-card ef-recap">
          <h3>Votre commande</h3>
          {panier.items.map((i) => (
            <div key={i.id} className="ef-recap-ligne">
              <span>{i.quantite} × {i.nom}</span>
              <span>{formaterPrix(i.prix * i.quantite)}</span>
            </div>
          ))}
          <div className="ef-recap-ligne">
            <span>Livraison</span>
            <span>{formaterFrais(panier.fraisLivraison)}</span>
          </div>
          <div className="ef-recap-ligne ef-recap-total">
            <span>Total</span>
            <span>{formaterPrix(total)}</span>
          </div>
          <button type="submit" className="ef-btn ef-btn-primary ef-btn-block ef-mt" disabled={chargement}>
            {chargement ? 'Paiement en cours...' : `Payer ${formaterPrix(total)}`}
          </button>
        </aside>
      </form>
    </div>
  );
}

export default Checkout;
