#!/usr/bin/env node
/**
 * Télécharge les drapeaux servis par l'application dans `public/flags/`.
 *
 * Ils venaient de `flagcdn.com` à l'exécution, en une requête tierce par ligne
 * de liste. Or ces listes sont aussi celles du portail autorité : chaque
 * affichage annonçait à un tiers qu'une adresse IP policière consultait à cet
 * instant un ressortissant de tel pays. Pour un produit dont l'argument est la
 * conformité INPDP, l'origine tierce est le vrai problème — pas les 400 octets.
 *
 * Source : flagcdn.com (flagpedia.net), images du domaine public, dont le site
 * invite explicitement au téléchargement dans un projet.
 *
 * FORMAT — PNG 80px de large, et non SVG. Contre-intuitif, mais mesuré :
 * l'application affiche ces drapeaux à 15-22px, et les SVG portent le tracé
 * complet des blasons. Le drapeau bolivien pèse 240 Ko en SVG chez flagcdn,
 * 100 Ko chez flag-icons... et 630 octets en PNG 80px. Le PNG 80px couvre un
 * affichage à 22px jusqu'en 3x, donc reste net sur tout écran.
 *
 * Les 207 drapeaux pèsent ~100 Ko au total et ne changent pratiquement jamais.
 * Seuls ceux réellement affichés sont téléchargés par le navigateur.
 *
 * Usage : npm run flags:fetch [-- --force]
 *   Sans --force, les fichiers déjà présents ne sont pas retéléchargés.
 *   Après exécution, `git status` montre les drapeaux qui ont changé.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'flags');
const WIDTH = 'w80';

/** Les codes viennent de la table alpha-3 → alpha-2 du produit : une seule
 *  source de vérité, donc aucun drapeau téléchargé pour rien ni manquant. */
const codes = [...new Set(
  [...readFileSync(join(ROOT, 'src', 'lib', 'flags.ts'), 'utf8')
    .matchAll(/[A-Z]{3}:'([A-Z]{2})'/g)].map((m) => m[1].toLowerCase()),
)].sort();

mkdirSync(OUT, { recursive: true });

const force = process.argv.includes('--force');
let written = 0;
let skipped = 0;
const failed = [];

for (const code of codes) {
  const dest = join(OUT, `${code}.png`);
  if (existsSync(dest) && !force) { skipped++; continue; }
  try {
    const res = await fetch(`https://flagcdn.com/${WIDTH}/${code}.png`);
    if (!res.ok) { failed.push(`${code} (HTTP ${res.status})`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    // Garde-fou : une page d'erreur passerait sinon pour une image valide.
    if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) {
      failed.push(`${code} (pas un PNG)`);
      continue;
    }
    writeFileSync(dest, buf);
    written++;
  } catch (err) {
    failed.push(`${code} (${err.message})`);
  }
}

console.log(`${codes.length} codes · ${written} écrits · ${skipped} déjà présents`);
if (failed.length) {
  console.error(`\n${failed.length} échec(s) : ${failed.join(', ')}`);
  console.error("Ces pays retomberont sur l'icône globe — pas de casse, mais à corriger.");
  process.exit(1);
}
