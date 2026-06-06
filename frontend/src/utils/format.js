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

// Libellé lisible + classe de couleur pour un statut de commande.
export function infoStatut(statut) {
  const map = {
    en_attente: { label: 'En attente', classe: 'attente' },
    acceptee: { label: 'Acceptée', classe: 'acceptee' },
    en_preparation: { label: 'En préparation', classe: 'preparation' },
    prete: { label: 'Prête', classe: 'prete' },
    en_livraison: { label: 'En livraison', classe: 'livraison' },
    livree: { label: 'Livrée', classe: 'livree' },
    annulee: { label: 'Annulée', classe: 'annulee' },
  };
  return map[statut] || { label: statut, classe: 'attente' };
}

// Étapes de suivi affichées au client (dans l'ordre).
export const ETAPES_SUIVI = [
  { statut: 'en_attente', label: 'Confirmée' },
  { statut: 'en_preparation', label: 'En préparation' },
  { statut: 'prete', label: 'Prête' },
  { statut: 'en_livraison', label: 'En livraison' },
  { statut: 'livree', label: 'Livrée' },
];

// Index de progression d'une commande sur la timeline de suivi.
export function indiceEtape(statut) {
  // "acceptee" est regroupée avec "confirmée" pour la barre de progression.
  const equivalences = { acceptee: 'en_attente' };
  const cible = equivalences[statut] || statut;
  const i = ETAPES_SUIVI.findIndex((e) => e.statut === cible);
  return i;
}

// Formate une date ISO en format lisible court (ex: "5 juin 2026 à 21:50").
export function formaterDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// Distance en kilomètres entre deux points GPS (formule de Haversine).
export function distanceKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v == null || isNaN(v))) return null;
  const R = 6371; // rayon de la Terre en km
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Estime les frais de livraison (XAF) à partir d'une distance en km.
// Base de 300 FCFA + 200 FCFA/km, arrondi à la dizaine de FCFA (50), minimum 300.
export function fraisDepuisDistance(km) {
  if (km == null || isNaN(km)) return null;
  const brut = 300 + km * 200;
  return Math.max(300, Math.round(brut / 50) * 50);
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
