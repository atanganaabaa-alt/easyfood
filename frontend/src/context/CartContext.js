// Contexte du panier : gère les plats ajoutés, persistés dans le localStorage.
// Règle métier : un panier ne contient les plats que d'UN SEUL restaurant à la fois.
import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const CartContext = createContext(null);

const PANIER_VIDE = { restaurantId: null, restaurantNom: '', fraisLivraison: 0, items: [] };

export function CartProvider({ children }) {
  // On restaure le panier depuis le localStorage au démarrage.
  const [panier, setPanier] = useState(() => {
    const stocke = localStorage.getItem('easyfood_panier');
    return stocke ? JSON.parse(stocke) : PANIER_VIDE;
  });

  // Sauvegarde le panier (mémoire + localStorage).
  const sauvegarder = useCallback((nouveau) => {
    localStorage.setItem('easyfood_panier', JSON.stringify(nouveau));
    setPanier(nouveau);
  }, []);

  // Ajoute un plat. Si le panier contient déjà un AUTRE restaurant, on renvoie
  // { ok: false } pour que l'interface demande confirmation avant de le vider.
  const ajouter = useCallback((plat, restaurant, forcer = false) => {
    let actuel = panier;
    if (actuel.restaurantId && actuel.restaurantId !== restaurant.id) {
      if (!forcer) return { ok: false, raison: 'autre_restaurant' };
      actuel = PANIER_VIDE; // on repart d'un panier vide pour le nouveau restaurant
    }

    const items = [...actuel.items];
    const index = items.findIndex((i) => i.id === plat.id);
    if (index >= 0) {
      items[index] = { ...items[index], quantite: items[index].quantite + 1 };
    } else {
      items.push({ id: plat.id, nom: plat.nom, prix: plat.prix, photo_url: plat.photo_url, quantite: 1 });
    }

    sauvegarder({
      restaurantId: restaurant.id,
      restaurantNom: restaurant.nom,
      fraisLivraison: restaurant.frais_livraison || 0,
      items,
    });
    return { ok: true };
  }, [panier, sauvegarder]);

  // Modifie la quantité d'un plat (delta = +1 ou -1). Retire le plat si quantité = 0.
  const modifierQuantite = useCallback((platId, delta) => {
    const items = panier.items
      .map((i) => (i.id === platId ? { ...i, quantite: i.quantite + delta } : i))
      .filter((i) => i.quantite > 0);
    sauvegarder(items.length === 0 ? PANIER_VIDE : { ...panier, items });
  }, [panier, sauvegarder]);

  // Retire complètement un plat du panier.
  const retirer = useCallback((platId) => {
    const items = panier.items.filter((i) => i.id !== platId);
    sauvegarder(items.length === 0 ? PANIER_VIDE : { ...panier, items });
  }, [panier, sauvegarder]);

  // Vide entièrement le panier.
  const vider = useCallback(() => sauvegarder(PANIER_VIDE), [sauvegarder]);

  // Valeurs dérivées : sous-total et nombre d'articles.
  const sousTotal = useMemo(
    () => panier.items.reduce((somme, i) => somme + i.prix * i.quantite, 0),
    [panier.items]
  );
  const nombreArticles = useMemo(
    () => panier.items.reduce((somme, i) => somme + i.quantite, 0),
    [panier.items]
  );

  const valeur = { panier, ajouter, modifierQuantite, retirer, vider, sousTotal, nombreArticles };
  return <CartContext.Provider value={valeur}>{children}</CartContext.Provider>;
}

// Hook pratique pour accéder au panier.
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart doit être utilisé dans un CartProvider.');
  return ctx;
}
