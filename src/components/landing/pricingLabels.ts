/**
 * Libellés de la grille tarifaire publique.
 *
 * Tous dérivés de la configuration servie par GET /public/plans — AUCUN prix,
 * quota ou tarif de dépassement n'est écrit en dur ici. Changer un pack dans
 * Admin › Abonnements change la landing, sans redéploiement.
 *
 * Extraits du composant pour être testés : une carte tarifaire qui annonce
 * autre chose que ce qui est appliqué est un litige commercial.
 */

/** 59 → "59", 59.5 → "59,5", 0.6 → "0,6" — la landing affiche des prix compacts. */
export const compactPrice = (n: number): string =>
  Number.isInteger(n) ? String(n) : String(n).replace('.', ',');

/** « X établissement(s) inclus » — dérivé de included_properties. */
export const includedLabel = (n: number, lang: string): string => {
  if (lang === 'en') return `${n} propert${n > 1 ? 'ies' : 'y'} included`;
  if (lang === 'ar') return `${n} مؤسسة مشمولة`;
  return `${n} établissement${n > 1 ? 's' : ''} inclus`;
};

/** « Option multi-établissements : +99 TND/mois par établissement » — dérivé de extra_property_price. */
export const extraLabel = (price: number, lang: string): string => {
  const p = compactPrice(price);
  if (lang === 'en') return `Multi-property option: +${p} TND/month per property`;
  if (lang === 'ar') return `خيار تعدد المؤسسات: +${p} د.ت/شهر لكل مؤسسة`;
  return `Option multi-établissements : +${p} TND/mois par établissement`;
};

/**
 * « 0,6 TND / check-in supplémentaire » — dérivé de overage_price et
 * overage_bundle_size. Tranche de 1 (grille V3) : on annonce un prix au
 * check-in ; la formulation par lot reste disponible si un pack repasse à un
 * bundle > 1.
 */
export const overageLabel = (price: number, bundle: number, lang: string): string => {
  const p = compactPrice(price);
  if (bundle === 1) {
    if (lang === 'en') return `${p} TND per additional check-in`;
    if (lang === 'ar') return `${p} د.ت لكل تسجيل وصول إضافي`;
    return `${p} TND / check-in supplémentaire`;
  }
  if (lang === 'en') return `+${p} TND per bundle of ${bundle} additional check-ins`;
  if (lang === 'ar') return `+${p} د.ت لكل شريحة من ${bundle} تسجيل وصول إضافي`;
  return `+${p} TND par tranche de ${bundle} check-ins supplémentaires`;
};

/**
 * Phrase de réassurance sous la grille. Le dépassement est une règle de
 * facturation majeure : elle est dite en clair sur la page, jamais reléguée
 * aux seules CGV.
 */
export const overageReassurance = (lang: string): string => {
  if (lang === 'en') return 'Over your quota? Keep registering your travellers. Additional check-ins are billed automatically at the rate shown.';
  if (lang === 'ar') return 'تجاوزتم حصتكم؟ واصلوا تسجيل مسافريكم. تُفوتر تسجيلات الوصول الإضافية تلقائيًا بالسعر المذكور.';
  return 'Vous dépassez votre quota ? Continuez à enregistrer vos voyageurs. Les check-ins supplémentaires sont automatiquement facturés au tarif indiqué.';
};

/** Ligne « plusieurs petites structures ? » sous la grille. */
export const contactLabel = (lang: string): { text: string; cta: string } => {
  if (lang === 'en') return { text: 'Managing several small properties?', cta: 'Contact us' };
  if (lang === 'ar') return { text: 'تديرون عدة مؤسسات صغيرة؟', cta: 'اتصلوا بنا' };
  return { text: 'Vous gérez plusieurs petites structures ?', cta: 'Contactez-nous' };
};
