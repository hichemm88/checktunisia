import { describe, it, expect } from 'vitest';
import { parseMrzResponse, MrzParseError } from './mrzExtraction';

/**
 * Corpus SYNTHÉTIQUE du repli vision — ce que Claude peut renvoyer, et ce que
 * nous devons refuser d'en croire.
 *
 * Toutes les valeurs dérivent du spécimen de démonstration « EL FOULANI /
 * FOULEN » (document fictif, sans valeur légale). Aucun passeport réel, aucune
 * donnée personnelle : un fichier de test se lit, se copie et se partage.
 *
 * Ce qui est éprouvé ici n'est pas « le modèle répond », mais les six façons
 * dont sa réponse pourrait être fausse sans que rien ne le montre.
 */

const LINE1 = 'P<TUNEL<FOULANI<<FOULEN<<<<<<<<<<<<<<<<<<<<<<';
const LINE2 = 'X0000000<1TUN9001011M3101012<<<<<<<<<<<<04';

const wellFormed = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    document_type: 'passport',
    document_number: 'X0000000',
    last_name: 'EL FOULANI',
    first_name: 'FOULEN',
    date_of_birth: '1990-01-01',
    expiry_date: '2031-01-01',
    sex: 'M',
    nationality_code: 'TUN',
    issuing_country_code: 'TUN',
    mrz_line1: LINE1,
    mrz_line2: LINE2,
    ...over,
  });

describe('lecture MRZ par vision — cas nominal', () => {
  it('extrait les champs et confirme l\'intégrité de la lecture', () => {
    const r = parseMrzResponse(wellFormed());

    expect(r.document_number).toBe('X0000000');
    expect(r.last_name).toBe('EL FOULANI');
    expect(r.first_name).toBe('FOULEN');
    expect(r.date_of_birth).toBe('1990-01-01');
    expect(r.sex).toBe('M');
    expect(r.nationality_code).toBe('TUN');
    // Les chiffres de contrôle tombent juste : la lecture est corroborée.
    expect(r.mrz_verified).toBe(true);
  });

  it('accepte une réponse encadrée par des balises markdown', () => {
    const r = parseMrzResponse('```json\n' + wellFormed() + '\n```');
    expect(r.document_number).toBe('X0000000');
  });

  it('accepte du bavardage autour du JSON', () => {
    // Le modèle a pour consigne de ne rien ajouter ; s'il le fait quand même,
    // jeter une extraction correcte serait une régression gratuite.
    const r = parseMrzResponse('Voici le résultat :\n' + wellFormed() + '\nBonne journée.');
    expect(r.last_name).toBe('EL FOULANI');
  });
});

describe('lecture MRZ par vision — lectures démenties', () => {
  it('signale une confusion O/0 sur le numéro de document', () => {
    /*
     * Le cœur du sujet. La vision rend un numéro plausible ; seuls les chiffres
     * de contrôle disent qu'il est faux. Sans eux, ce numéro partait sur une
     * fiche de police et plus rien en aval ne pouvait le rattraper.
     */
    const r = parseMrzResponse(
      wellFormed({ document_number: 'XO000000', mrz_line2: LINE2.replace('X0000000', 'XO000000') }),
    );

    expect(r.mrz_verified).toBe(false);
  });

  it('rend null — et non true — quand la MRZ n\'est pas vérifiable', () => {
    // « invérifiable » n'est pas « vérifié ». L'écran doit demander une
    // relecture dans les deux cas, mais l'API ne doit pas mentir sur la raison.
    const r = parseMrzResponse(wellFormed({ mrz_line1: null, mrz_line2: null }));

    expect(r.mrz_verified).toBeNull();
  });
});

describe('lecture MRZ par vision — réponses à refuser', () => {
  it('refuse une date impossible plutôt que de la laisser rouler', () => {
    // Le 31 février passait le contrôle « jour <= 31 », et PHP l'aurait roulé
    // au 3 mars : une date fausse, en base, que personne ne voit passer.
    const r = parseMrzResponse(wellFormed({ date_of_birth: '2001-02-31' }));

    expect(r.date_of_birth).toBeNull();
  });

  it('refuse une naissance dans le futur', () => {
    const r = parseMrzResponse(wellFormed({ date_of_birth: '2099-01-01' }));

    expect(r.date_of_birth).toBeNull();
  });

  it('refuse une année aberrante', () => {
    const r = parseMrzResponse(wellFormed({ expiry_date: '0031-01-01' }));

    expect(r.expiry_date).toBeNull();
  });

  it('rejette la reponse entiere si le sexe sort de la nomenclature', () => {
    /*
     * Comportement constate et conserve : un `sex` hors { M, F, X } fait
     * echouer TOUT le schema, pas seulement ce champ. L'appelant retente une
     * fois, puis retombe sur la saisie manuelle avec la photo conservee —
     * aucune donnee fausse n'entre.
     *
     * A noter, une incoherence mineure : `document_type` utilise `.catch()` et
     * se corrige silencieusement, la ou `sex` fait tout tomber. Deux
     * conventions pour deux enums du meme schema. Ce n'est pas un defaut de
     * securite, et l'uniformiser changerait un comportement de production sans
     * necessite : signale, non modifie.
     */
    expect(() => parseMrzResponse(wellFormed({ sex: 'Homme' }))).toThrow(MrzParseError);
  });

  it('normalise un code pays bruité', () => {
    const r = parseMrzResponse(wellFormed({ nationality_code: 'tun.' }));
    expect(r.nationality_code).toBe('TUN');
  });

  it('rejette une réponse qui n\'est pas du JSON', () => {
    expect(() => parseMrzResponse("Je ne peux pas lire ce document.")).toThrow(MrzParseError);
  });

  it('rejette un document sans MRZ exploitable', () => {
    // La consigne prévoit « tous les champs null » si l'image n'est pas un
    // passeport. Un formulaire prérempli de vide serait pire qu'un échec franc.
    const r = () =>
      parseMrzResponse(
        JSON.stringify({
          document_type: 'passport',
          document_number: null,
          last_name: null,
          first_name: null,
          date_of_birth: null,
          expiry_date: null,
          sex: null,
          nationality_code: null,
          issuing_country_code: null,
          mrz_line1: null,
          mrz_line2: null,
        }),
      );

    expect(r).toThrow(MrzParseError);
  });

  it('accepte une lecture partielle si elle porte de quoi identifier', () => {
    // Une MRZ à moitié lisible vaut mieux qu'un formulaire vide : l'agent
    // complète le reste. Le seuil est « numéro OU nom OU date de naissance ».
    const r = parseMrzResponse(
      wellFormed({ document_number: null, first_name: null, expiry_date: null }),
    );

    expect(r.last_name).toBe('EL FOULANI');
    expect(r.document_number).toBeNull();
  });
});
