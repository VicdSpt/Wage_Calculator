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

  // SECUREX-RMMMG (source secondaire), 18 ans et plus, à partir de juillet 2026
  rmmmgCentimes: 223_361,
}