// Lecture / écriture des paramètres globaux (table parametres).
const pool = require('../config/db');

async function lire(cle, defaut = null) {
  const result = await pool.query('SELECT valeur FROM parametres WHERE cle = $1', [cle]);
  return result.rows[0]?.valeur ?? defaut;
}

async function ecrire(cle, valeur) {
  await pool.query(
    `INSERT INTO parametres (cle, valeur) VALUES ($1, $2)
     ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur`,
    [cle, String(valeur)]
  );
}

// Taux de commission (ex: 0.10 = 10 %).
async function tauxCommission() {
  const brut = await lire('taux_commission', '0.10');
  const taux = Number(brut);
  return Number.isFinite(taux) && taux >= 0 && taux <= 1 ? taux : 0.1;
}

module.exports = { lire, ecrire, tauxCommission };
