#!/usr/bin/env node
/**
 * Garde-fou anti-dérive du système de design.
 *
 * Le code avait accumulé ~1 400 classes de couleur hors charte et ~700 hex en
 * dur. Les rampes de tailwind.config.js et les tokens ont ramené le tout dans
 * la charte ; ce script empêche la dérive de recommencer.
 *
 * Il refuse :
 *   1. un hex littéral dans src/ (hors fichiers de tokens et logos tiers) ;
 *   2. une taille de police hors échelle (`text-[9px]`, `text-[11px]`…) ;
 *   3. `outline-none` / `focus:outline-none` sans anneau de remplacement.
 *
 * Usage : npm run check:design
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SRC = new URL('../src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/** Fichiers autorisés à porter des valeurs littérales. */
const ALLOWED_FILES = [
  join('styles', 'tokens.css'),
  join('styles', 'fonts.css'),
  // Dessin sur <canvas> : ctx.fillStyle n'accepte pas var().
  join('components', 'hotel', 'CINCapture.tsx'),
];

/** Couleurs de marques tierces (logos de paiement) — hors charte par nature. */
const ALLOWED_HEX = new Set([
  '#EB001B', '#F79E1B', '#FF5F00', '#1A1F71', '#2D6DB5', '#252525', '#FFFFFF',
]);

const rules = [
  {
    id: 'hex-en-dur',
    re: /#[0-9a-fA-F]{6}\b/g,
    message: 'couleur en dur — utiliser un token de src/styles/tokens.css',
    allow: (m) => ALLOWED_HEX.has(m.toUpperCase()),
    // `var(--token, #hex)` est un repli volontaire : la valeur littérale ne
    // sert que si la feuille de tokens n'a pas chargé (limite d'erreur racine).
    skipLine: (line) => /var\(--[a-z-]+,\s*#/.test(line),
  },
  {
    // Ne vise QUE les tailles : `text-[--qayed-cachet]` est une couleur
    // arbitraire, pas une taille, et doit passer.
    id: 'taille-hors-echelle',
    re: /text-\[(?!1[2-9]px\]|[2-9]\d+px\])\d+(?:\.\d+)?(?:px|rem|em)\]/g,
    message: 'taille de police hors échelle — plancher 12px, voir .t-* dans index.css',
  },
  {
    id: 'focus-supprime',
    re: /(?<!focus-visible:)\boutline-none\b/g,
    message: 'état focus supprimé sans anneau de remplacement sur la même ligne',
    // Un `outline-none` accompagné d'un `ring-` porte son propre état focus :
    // c'est un remplacement explicite, pas une suppression.
    skipLine: (line) => /\bring-/.test(line),
  },
];

const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { walk(full); continue; }
    if (/\.(tsx?|css)$/.test(entry)) files.push(full);
  }
})(SRC);

let failures = 0;
for (const file of files) {
  const rel = relative(SRC, file);
  if (ALLOWED_FILES.some((a) => rel === a || rel.endsWith(sep + a))) continue;

  const lines = readFileSync(file, 'utf8').split('\n');
  let inBlockComment = false;
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    // Les commentaires documentent parfois une ancienne valeur : on les ignore.
    // Le suivi des blocs /* … */ est nécessaire — un commentaire de plusieurs
    // lignes ne commence pas forcément par `*`.
    const opens = trimmed.includes('/*');
    const closes = trimmed.includes('*/');
    const wasInComment = inBlockComment;
    if (opens && !closes) inBlockComment = true;
    else if (closes) inBlockComment = false;
    if (wasInComment || opens || trimmed.startsWith('//') || trimmed.startsWith('*')) return;

    for (const rule of rules) {
      // Certaines règles s'étendent sur plusieurs lignes (@apply découpé) :
      // on regarde aussi les deux lignes suivantes avant de conclure.
      const context = [line, lines[i + 1] ?? '', lines[i + 2] ?? ''].join(' ');
      if (rule.skipLine?.(context)) continue;
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(line)) !== null) {
        if (rule.allow?.(m[0])) continue;
        console.error(`src/${rel}:${i + 1}  [${rule.id}] ${m[0]} — ${rule.message}`);
        failures++;
      }
    }
  });
}

if (failures > 0) {
  console.error(`\n${failures} écart(s) au système de design.`);
  process.exit(1);
}
console.log(`Système de design : aucun écart sur ${files.length} fichiers.`);
