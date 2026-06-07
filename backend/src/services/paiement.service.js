// ============================================================
// Service de paiement mobile money (Orange Money & MTN MoMo)
// ------------------------------------------------------------
// Deux modes, pilotés par la variable d'environnement PAIEMENT_MODE :
//   - 'simulation' (défaut) : paiement auto-validé, pour le développement.
//   - 'reel' : appelle réellement les API opérateurs (clés requises dans .env).
//
// L'interface (initierPaiement / verifierPaiement) reste identique quel que
// soit le mode, afin que le reste de l'application n'ait pas à changer.
//
// IMPORTANT (sécurité) : on ne demande JAMAIS le code PIN/mot de passe Mobile
// Money du client dans l'application. Le client valide le paiement sur SON
// téléphone (notification USSD/push envoyée par l'opérateur). Notre rôle se
// limite à initier la demande puis à vérifier le statut.
// ============================================================
const crypto = require('crypto');

const MODE = process.env.PAIEMENT_MODE === 'reel' ? 'reel' : 'simulation';

function genererReference(mode) {
  const prefixe = mode === 'orange_money' ? 'OM' : 'MTN';
  return `${prefixe}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

// --- Helper HTTP (fetch natif Node 18+) ---
async function http(url, options) {
  const reponse = await fetch(url, options);
  const texte = await reponse.text();
  let data = null;
  try { data = texte ? JSON.parse(texte) : null; } catch { data = texte; }
  if (!reponse.ok) {
    const err = new Error(`HTTP ${reponse.status} : ${typeof data === 'string' ? data : JSON.stringify(data)}`);
    err.statut = reponse.status;
    throw err;
  }
  return data;
}

// ------------------------------------------------------------
// MTN MoMo - Collections (RequestToPay)
// Docs : https://momodeveloper.mtn.com
// ------------------------------------------------------------
async function tokenMtn() {
  const base = process.env.MTN_BASE_URL; // ex: https://sandbox.momodeveloper.mtn.com
  const auth = Buffer.from(`${process.env.MTN_API_USER}:${process.env.MTN_API_KEY}`).toString('base64');
  const data = await http(`${base}/collection/token/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Ocp-Apim-Subscription-Key': process.env.MTN_SUBSCRIPTION_KEY,
    },
  });
  return data.access_token;
}

async function payerMtn({ telephone, montant, reference }) {
  const base = process.env.MTN_BASE_URL;
  const token = await tokenMtn();
  await http(`${base}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Reference-Id': reference,
      'X-Target-Environment': process.env.MTN_TARGET_ENV || 'sandbox',
      'Ocp-Apim-Subscription-Key': process.env.MTN_SUBSCRIPTION_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: String(montant),
      currency: process.env.MTN_CURRENCY || 'EUR', // 'XAF' en production CEMAC
      externalId: reference,
      payer: { partyIdType: 'MSISDN', partyId: telephone.replace(/\D/g, '') },
      payerMessage: 'Paiement EasyFood',
      payeeNote: 'Commande EasyFood',
    }),
  });
  // 202 Accepted : la demande est envoyée, le client doit valider sur son téléphone.
  return { reference, statut: 'en_attente' };
}

async function verifierMtn(reference) {
  const base = process.env.MTN_BASE_URL;
  const token = await tokenMtn();
  const data = await http(`${base}/collection/v1_0/requesttopay/${reference}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Target-Environment': process.env.MTN_TARGET_ENV || 'sandbox',
      'Ocp-Apim-Subscription-Key': process.env.MTN_SUBSCRIPTION_KEY,
    },
  });
  const map = { SUCCESSFUL: 'paye', PENDING: 'en_attente', FAILED: 'echoue' };
  return { reference, statut: map[data.status] || 'en_attente' };
}

// ------------------------------------------------------------
// Orange Money - Web Payment
// Docs : https://developer.orange.com (Orange Money WebPay)
// ------------------------------------------------------------
async function tokenOrange() {
  const auth = Buffer.from(`${process.env.ORANGE_CLIENT_ID}:${process.env.ORANGE_CLIENT_SECRET}`).toString('base64');
  const data = await http(`${process.env.ORANGE_BASE_URL}/oauth/v3/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  return data.access_token;
}

async function payerOrange({ montant, reference }) {
  const token = await tokenOrange();
  await http(`${process.env.ORANGE_BASE_URL}/orange-money-webpay/${process.env.ORANGE_COUNTRY || 'cm'}/v1/webpayment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      merchant_key: process.env.ORANGE_MERCHANT_KEY,
      currency: process.env.ORANGE_CURRENCY || 'XAF',
      order_id: reference,
      amount: montant,
      return_url: process.env.ORANGE_RETURN_URL,
      cancel_url: process.env.ORANGE_CANCEL_URL,
      notif_url: process.env.ORANGE_NOTIF_URL,
    }),
  });
  return { reference, statut: 'en_attente' };
}

// ------------------------------------------------------------
// Interface publique
// ------------------------------------------------------------
async function initierPaiement({ mode, telephone, montant }) {
  if (!['orange_money', 'mtn_momo'].includes(mode)) {
    throw new Error('Mode de paiement non supporté.');
  }
  if (!telephone || !montant || montant <= 0) {
    throw new Error('Téléphone et montant valides requis pour le paiement.');
  }

  const reference = genererReference(mode);

  if (MODE === 'simulation') {
    console.log(`[simulation] Paiement ${mode} de ${montant} XAF depuis ${telephone} (réf: ${reference})`);
    return { reference, statut: 'paye' };
  }

  // Mode réel : on déclenche la demande auprès de l'opérateur.
  if (mode === 'mtn_momo') return payerMtn({ telephone, montant, reference });
  return payerOrange({ telephone, montant, reference });
}

async function verifierPaiement(reference) {
  if (MODE === 'simulation') {
    return { reference, statut: 'paye' };
  }
  if (reference.startsWith('MTN-')) return verifierMtn(reference);
  // Orange : la confirmation arrive généralement par webhook (notif_url).
  return { reference, statut: 'en_attente' };
}

module.exports = { initierPaiement, verifierPaiement, MODE };
