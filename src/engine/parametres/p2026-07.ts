import type { Parametres } from './types'

/**
 * Règles du 01/07/2026 au 31/08/2026.
 * Sources (spec § 3) : SPF-FC-2026, ONSS-BE-2026/3, ONSS-CSSS-2026/3, SECUREX-RMMMG.
 */
export const P2026_07: Parametres = {
  id: 'P2026-07',
  valideDu: '2026-07-01',
  valideAu: '2026-08-31',

  // ONSS : cotisation personnelle des travailleurs salariés
  onssTauxPersonnelDixMilliemes: 1307,

  // ONSS-BE-2026/3 « Tranches et montants d'application pour juillet et août 2026 », employés
  bonusEmploi: {
    voletA: { maxCentimes: 12_754, plancherCentimes: 293_793, plafondCentimes: 333_698, coefDixMilliemes: 3196 },
    voletB: { maxCentimes: 17_199, plancherCentimes: 230_062, plafondCentimes: 293_793, coefDixMilliemes: 2699 },
  },

  precompte: {
    // SPF-FC-2026 n° 8, 1° : 30 %, maximum 6 070 €
    fraisForfaitairesTauxDixMilliemes: 3000,
    fraisForfaitairesMaxCentimes: 607_000,
    // SPF-FC-2026 annexe 1 : barème de base
    bareme: [
      { auDelaDeCentimes: 0, fixeCentimes: 0, tauxDixMilliemes: 2675 },
      { auDelaDeCentimes: 1_671_000, fixeCentimes: 446_993, tauxDixMilliemes: 4280 },
      { auDelaDeCentimes: 2_950_000, fixeCentimes: 994_405, tauxDixMilliemes: 4815 },
      { auDelaDeCentimes: 5_105_000, fixeCentimes: 2_032_038, tauxDixMilliemes: 5350 },
    ],
    // SPF-FC-2026 n° 11, a : impôt sur la quotité exemptée de 11 170 €
    impotQuotiteExempteeCentimes: 298_798,
    // SPF-FC-2026 n° 11, b : 30 % imputés au conjoint, maximum 13 790 €
    quotientConjugalTauxDixMilliemes: 3000,
    quotientConjugalMaxCentimes: 1_379_000,
    // SPF-FC-2026 annexe 3
    reductionEnfantsCentimes: [0, 62_400, 165_600, 440_400, 762_000, 1_110_000, 1_459_200, 1_812_000, 2_199_600],
    reductionEnfantSupplementaireCentimes: 386_400,
    // SPF-FC-2026 annexe 4, 1
    reductionParentIsoleCentimes: 62_400,
    // SPF-FC-2026 annexe 4, 5
    reductionConjointAutresMax290Centimes: 174_000,
    // SPF-FC-2026 annexe 4, 6
    reductionConjointPensionMax579Centimes: 347_400,
    // SPF-FC-2026 n° 20
    bonusFiscalVoletADixMilliemes: 3314,
    bonusFiscalVoletBDixMilliemes: 5254,
  },

  // ONSS-CSSS-2026/3, montants trimestriels ÷ 3 (spec § 5.2, étape 11)
  cotisationSpeciale: {
    individuelle: [
      { jusquaCentimes: 194_538, fixeCentimes: 0, tauxDixMilliemes: 0, seuilCentimes: 0, minCentimes: 0, maxCentimes: null },
      { jusquaCentimes: 219_018, fixeCentimes: 0, tauxDixMilliemes: 422, seuilCentimes: 194_538, minCentimes: 0, maxCentimes: null },
      { jusquaCentimes: 373_700, fixeCentimes: 1_033, tauxDixMilliemes: 110, seuilCentimes: 219_018, minCentimes: 0, maxCentimes: null },
      { jusquaCentimes: 410_000, fixeCentimes: 2_735, tauxDixMilliemes: 338, seuilCentimes: 373_700, minCentimes: 0, maxCentimes: null },
      { jusquaCentimes: 603_882, fixeCentimes: 3_961, tauxDixMilliemes: 110, seuilCentimes: 410_000, minCentimes: 0, maxCentimes: null },
      { jusquaCentimes: null, fixeCentimes: 6_094, tauxDixMilliemes: 0, seuilCentimes: 0, minCentimes: 0, maxCentimes: null },
    ],
    communeConjointAvecRevenus: [
      // trimestre < 3 285,29 € ⇔ mois ≤ 1 095,09 €
      { jusquaCentimes: 109_509, fixeCentimes: 0, tauxDixMilliemes: 0, seuilCentimes: 0, minCentimes: 0, maxCentimes: null },
      // trimestre < 5 836,14 € ⇔ mois ≤ 1 945,37 €
      { jusquaCentimes: 194_537, fixeCentimes: 515, tauxDixMilliemes: 0, seuilCentimes: 0, minCentimes: 0, maxCentimes: null },
      { jusquaCentimes: 219_018, fixeCentimes: 0, tauxDixMilliemes: 590, seuilCentimes: 194_538, minCentimes: 515, maxCentimes: null },
      { jusquaCentimes: null, fixeCentimes: 1_444, tauxDixMilliemes: 110, seuilCentimes: 219_018, minCentimes: 0, maxCentimes: 5_164 },
    ],
    communeConjointSansRevenus: [
      { jusquaCentimes: 194_538, fixeCentimes: 0, tauxDixMilliemes: 0, seuilCentimes: 0, minCentimes: 0, maxCentimes: null },
      { jusquaCentimes: 219_018, fixeCentimes: 0, tauxDixMilliemes: 590, seuilCentimes: 194_538, minCentimes: 0, maxCentimes: null },
      { jusquaCentimes: null, fixeCentimes: 1_444, tauxDixMilliemes: 110, seuilCentimes: 219_018, minCentimes: 0, maxCentimes: 6_094 },
    ],
  },

  // ONSS-TR : part patronale max 8,91 € (depuis le 01/01/2026), part du travailleur min 1,09 €,
  // valeur faciale max 10,00 €. ONSS-FR : indemnité de bureau 160,99 €/mois (01/03 → 31/08/2026).
  // ONSS-EC : écochèques 250,00 €/an.
  avantages: {
    titresRepasPartPatronaleMaxCentimes: 891,
    titresRepasPartTravailleurMinCentimes: 109,
    titresRepasValeurFacialeMaxCentimes: 1_000,
    teletravailMaxCentimes: 16_099,
    ecochequesMaxAnnuelCentimes: 25_000,
  },

  // Allocations exceptionnelles 2026 (pécule de vacances, prime de fin d'année) : onze tranches
  // de rémunération annuelle brute normale, sans aucune déduction (ni ONSS ni frais professionnels),
  // colonne « pécule » et colonne « autres allocations ». Confirmé : annexe III à l'arrêté royal
  // d'exécution du CIR 92 (AR du 11/12/2025, Moniteur belge du 29/12/2025), n° 53. La dernière
  // tranche a le même taux dans les deux colonnes (53,50 %) : le texte ne prévoit pas de taux
  // distinct de 57,53 % pour les « autres allocations » au-delà de 59 900 €.
  allocationsExceptionnelles: {
    tranches: [
      { jusquaAnnuelCentimes: 1_067_500, peculeDixMilliemes: 0, autreDixMilliemes: 0 },
      { jusquaAnnuelCentimes: 1_366_000, peculeDixMilliemes: 1917, autreDixMilliemes: 2322 },
      { jusquaAnnuelCentimes: 1_737_500, peculeDixMilliemes: 2120, autreDixMilliemes: 2523 },
      { jusquaAnnuelCentimes: 2_084_000, peculeDixMilliemes: 2625, autreDixMilliemes: 3028 },
      { jusquaAnnuelCentimes: 2_358_000, peculeDixMilliemes: 3130, autreDixMilliemes: 3533 },
      { jusquaAnnuelCentimes: 2_634_000, peculeDixMilliemes: 3433, autreDixMilliemes: 3836 },
      { jusquaAnnuelCentimes: 3_183_000, peculeDixMilliemes: 3634, autreDixMilliemes: 4038 },
      { jusquaAnnuelCentimes: 3_464_000, peculeDixMilliemes: 3937, autreDixMilliemes: 4341 },
      { jusquaAnnuelCentimes: 4_586_000, peculeDixMilliemes: 4239, autreDixMilliemes: 4644 },
      { jusquaAnnuelCentimes: 5_990_000, peculeDixMilliemes: 4744, autreDixMilliemes: 5148 },
      { jusquaAnnuelCentimes: null, peculeDixMilliemes: 5350, autreDixMilliemes: 5350 },
    ],
    // Annexe III n° 54 — exonération totale, index = nombre d'enfants (1 à 12). Confirmé : même
    // référence que ci-dessus, n° 54, tableau « montant limite » (18 858 € à 94 120 €).
    exonerationEnfantsPlafondsCentimes: [
      0,
      1_885_800,
      2_247_000,
      2_896_000,
      3_620_000,
      4_344_000,
      5_068_000,
      5_792_000,
      6_516_000,
      7_240_000,
      7_964_000,
      8_688_000,
      9_412_000,
    ],
    // Annexe III n° 55 — réduction, index = nombre d'enfants (1 à 5), sous un second plafond de
    // rémunération annuelle brute normale. Confirmé : même référence, n° 55.
    reductionsEnfants: [
      { plafondAnnuelCentimes: 0, reductionDixMilliemes: 0 },
      { plafondAnnuelCentimes: 2_894_000, reductionDixMilliemes: 750 },
      { plafondAnnuelCentimes: 2_894_000, reductionDixMilliemes: 2000 },
      { plafondAnnuelCentimes: 3_183_500, reductionDixMilliemes: 3500 },
      { plafondAnnuelCentimes: 3_762_500, reductionDixMilliemes: 5500 },
      { plafondAnnuelCentimes: 4_052_000, reductionDixMilliemes: 7500 },
    ],
    // ONSS, « La retenue sur le double pécule de vacances du secteur privé » : la retenue de
    // 13,07 % ne porte pas sur la part correspondant à la rémunération à partir du 3e jour de la
    // 4e semaine. Dans le cas standard (droits complets, 20 jours de vacances légales), cela exclut
    // 3 jours sur 20, donc 85 % du double pécule y reste soumis.
    partPeculeSoumiseRetenueDixMilliemes: 8_500,
  },

  // Voiture de société, revenus 2026 : émissions de référence 70 g/km (essence, LPG, gaz naturel)
  // et 58 g/km (diesel) ; ATN minimum 1 690 €/an. Confirmé : SPF Finances, FAQ « Avantage de toute
  // nature résultant de l'utilisation à des fins personnelles d'un véhicule mis gratuitement à
  // disposition » (finances.belgium.be/sites/default/files/downloads/121-faq-voitures-de-societe-2026.pdf,
  // tableaux p. 1-2 : émissions de référence 2026 = 70/58 g/km ; minimum indexé, exercice d'imposition
  // 2027 = 1 690 €, soit les revenus 2026) ; émissions fixées par arrêté royal, selon Securex
  // et Partena (source secondaire) du 17/12/2025 (Moniteur belge du 24/12/2025), non vérifié
  // sur ejustice.just.fgov.be.
  voiture: { emissionReferenceEssenceGrammesKm: 70, emissionReferenceDieselGrammesKm: 58, atnMinimumAnnuelCentimes: 169_000 },

  // Budget mobilité, loi du 17/03/2019 : cotisation spéciale de sécurité sociale de 38,07 % due par
  // le travailleur sur le solde versé en espèces (art. 22 de la loi, insérant l'art. 38 § 3novodecies
  // dans la loi du 29/06/1981 sur les principes généraux de la sécurité sociale des travailleurs
  // salariés). Bornes du budget annuel indexées chaque année (art. 12 § 4) : 3 233,00 € à 17 244,00 € en 2026,
  // confirmées sur lebudgetmobilite.be (portail interfédéral) et les instructions ONSS.
  budgetMobilite: {
    tauxCotisationSpecialeDixMilliemes: 3_807,
    budgetAnnuelMinCentimes: 323_300,
    budgetAnnuelMaxCentimes: 1_724_400,
  },

  // SECUREX-RMMMG (source secondaire), 18 ans et plus, à partir de juillet 2026
  rmmmgCentimes: 223_361,
}