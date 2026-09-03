import { useEffect } from 'react';

/** Nom du produit, suffixé à chaque titre d'écran. */
const SUFFIX = 'Qayed';

/**
 * Donne son titre à l'onglet.
 *
 * ── Ce que cela corrige ──────────────────────────────────────────────────
 *
 * Aucun écran applicatif ne posait `document.title` — seules les pages
 * publiques du site le font, via `useSeoMeta`. Mesuré dans le navigateur : sur
 * le tableau de bord, l'assistant de check-in et l'historique, l'onglet
 * affichait toujours « Qayed — Enregistrez vos voyageurs en 30 secondes »,
 * c'est-à-dire l'accroche commerciale de la page d'accueil.
 *
 * Trois conséquences concrètes :
 *
 *  - une réception qui garde plusieurs onglets ouverts ne peut pas les
 *    distinguer ; ils portent tous le même nom ;
 *  - l'historique et les favoris du navigateur enregistrent ce même libellé
 *    pour tous les écrans ;
 *  - un lecteur d'écran annonce le titre du document au changement de page.
 *    Dans une application à navigation interne, un titre qui ne change jamais
 *    ne dit jamais où l'on vient d'arriver.
 *
 * ── Pourquoi dans les gabarits ───────────────────────────────────────────
 *
 * `HotelLayout` et `AuthorityLayout` reçoivent déjà un `title` pour leur `<h1>`.
 * Brancher le titre du document au même endroit couvre tous les écrans d'un
 * coup, sans toucher aux pages, et garantit que l'onglet et l'en-tête ne
 * peuvent pas se contredire — ils lisent la même valeur.
 *
 * Le titre est restauré au démontage : sans cela, revenir sur le site public
 * garderait le titre du dernier écran applicatif.
 */
export const useDocumentTitle = (title?: string): void => {
  useEffect(() => {
    if (!title) return;

    const precedent = document.title;
    document.title = `${title} — ${SUFFIX}`;

    return () => {
      document.title = precedent;
    };
  }, [title]);
};
