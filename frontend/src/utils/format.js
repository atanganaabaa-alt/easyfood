// Fonctions utilitaires de formatage.

// Formate un montant en francs CFA (XAF), ex: 2500 -> "2 500 FCFA".
export function formaterPrix(montant) {
  const nombre = Number(montant) || 0;
  return `${nombre.toLocaleString('fr-FR')} FCFA`;
}

// Formate les frais de livraison (0 = gratuit).
export function formaterFrais(frais) {
  const nombre = Number(frais) || 0;
  return nombre === 0 ? 'Livraison offerte' : `${nombre.toLocaleString('fr-FR')} FCFA`;
}

// Formate le délai de livraison, ex: "25-35 min".
export function formaterDelai(min, max) {
  return `${min}-${max} min`;
}

// Calcule un score de comparaison : plus il est BAS, meilleur est le restaurant.
// On combine le délai de livraison, la distance et les frais, ajustés par la note.
export function scoreComparaison(r) {
  const delaiMoyen = (Number(r.delai_min) + Number(r.delai_max)) / 2;
  const distance = Number(r.distance_km) || 0;
  const frais = Number(r.frais_livraison) || 0;
  const note = Number(r.note) || 0;
  // Pondération simple : temps (min) + distance (x4) + frais (/150) - bonus de note.
  return delaiMoyen + distance * 4 + frais / 150 - note * 3;
}
