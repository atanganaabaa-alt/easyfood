// ============================================================
// Service de paiement mobile money (Orange Money & MTN MoMo)
// ------------------------------------------------------------
// ⚠️ VERSION SIMULÉE pour le développement.
// L'interface (initierPaiement / verifierPaiement) est identique à celle
// des vraies APIs : le jour où vous avez vos identifiants marchands,
// remplacez le contenu de ces fonctions par les appels HTTP réels
// (axios.post vers l'API Orange / MTN) sans rien changer ailleurs.
// ============================================================

// Génère une référence de transaction lisible (ex: "OM-1A2B3C4D").
function genererReference(mode) {
  const prefixe = mode === 'orange_money' ? 'OM' : 'MTN';
  const aleatoire = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefixe}-${aleatoire}`;
}

// Initie un paiement mobile money.
// Retourne { reference, statut } où statut vaut 'paye' | 'en_attente' | 'echoue'.
async function initierPaiement({ mode, telephone, montant }) {
  if (!['orange_money', 'mtn_momo'].includes(mode)) {
    throw new Error('Mode de paiement non supporté.');
  }
  if (!telephone || !montant || montant <= 0) {
    throw new Error('Téléphone et montant valides requis pour le paiement.');
  }

  const reference = genererReference(mode);

  // --- SIMULATION ---
  // Dans la vraie vie : on appellerait l'API de l'opérateur, qui enverrait
  // une demande de confirmation (push USSD) sur le téléphone du client.
  // Ici, on considère le paiement comme accepté immédiatement.
  console.log(`💳 [${mode}] Paiement simulé de ${montant} XAF depuis ${telephone} (réf: ${reference})`);

  // Exemple de branchement réel (à décommenter et adapter le moment venu) :
  // const { data } = await axios.post(process.env.ORANGE_MONEY_URL, {
  //   amount: montant, currency: 'XAF', payer: telephone,
  // }, { headers: { Authorization: `Bearer ${process.env.ORANGE_MONEY_TOKEN}` } });
  // return { reference: data.payToken, statut: 'en_attente' };

  return { reference, statut: 'paye' };
}

// Vérifie le statut d'un paiement déjà initié (utile pour le push réel).
async function verifierPaiement(reference) {
  // En simulation, un paiement initié est toujours considéré comme payé.
  console.log(`🔎 Vérification du paiement ${reference} → payé (simulation)`);
  return { reference, statut: 'paye' };
}

module.exports = { initierPaiement, verifierPaiement };
