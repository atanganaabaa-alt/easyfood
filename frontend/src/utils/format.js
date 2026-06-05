// Fonctions utilitaires de formatage.

// Formate un montant en francs CFA (XAF), ex: 2500 -> "2 500 FCFA".
export function formaterPrix(montant) {
  const nombre = Number(montant) || 0;
  return `${nombre.toLocaleString('fr-FR')} FCFA`;
}
