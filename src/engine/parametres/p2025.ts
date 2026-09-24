import { P2026_07 } from './p2026-07'
import type { Parametres } from './types'

/**
 * Règles du 01/02/2025 au 31/12/2025.
 * Cette période sert aux cas de référence issus de fiches de paie réelles (spec V2.3) ;
 * l'interface calcule toujours à la date du jour.
 *
 * Sources : ONSS-BE-2025/3 (bonus à l'emploi, à partir du 01/02/2025), SPF-FC-2025
 * (formule-clé du précompte 2025, ESS-SR/2024-0015), ONSS-CSSS-2025, ONSS-TR-2025.
 */
export const P2025: Parametres = {
  id: 'P2025',
  valideDu: '2025-02-01',
  valideAu: '2025-12-31',
  onssTauxPersonnelDixMilliemes: 1307,

  // ONSS-BE-2025/3, colonne employés, à partir du 01/02/2025 (CCT n° 43-17).
  bonusEmploi: {
    voletA: { maxCentimes: 12_059, plancherCentimes: 277_783, plafondCentimes: 327_148, coefDixMilliemes: 2443 },
    voletB: { maxCentimes: 16_262, plancherCentimes: 217_525, plafondCentimes: 277_783, coefDixMilliemes: 2699 },
  },

  // SPF-FC-2025 (ESS-SR/2024-0015, arrêté royal du 12/12/2024, Moniteur belge du 18/12/2024) :
  // « Formule-clé pour le calcul du précompte professionnel (…) payées à partir du 1er janvier 2025 ».
  // Ces valeurs viennent du document officiel ESS-SR/2024-0015. Elles ne reproduisent pas le
  // précompte des deux fiches de référence : écart constant de 17,85 €/mois, documenté dans
  // fichesReelles.json et dans le README.
  precompte: {
    // n° 8, 1° : 30 %, maximum 5 930 €
    fraisForfaitairesTauxDixMilliemes: 3000,
    fraisForfaitairesMaxCentimes: 593_000,
    // Annexe 1 : barème de base
    bareme: [
      { auDelaDeCentimes: 0, fixeCentimes: 0, tauxDixMilliemes: 2675 },
      { auDelaDeCentimes: 1_631_000, fixeCentimes: 436_293, tauxDixMilliemes: 4280 },
      { auDelaDeCentimes: 2_879_000, fixeCentimes: 970_437, tauxDixMilliemes: 4815 },
      { auDelaDeCentimes: 4_982_000, fixeCentimes: 1_983_032, tauxDixMilliemes: 5350 },
    ],
    // n° 11, a : impôt sur la quotité exemptée de 10 900 €
    impotQuotiteExempteeCentimes: 291_575,
    // n° 11, b : 30 % imputés au conjoint, maximum 13 460 €
    quotientConjugalTauxDixMilliemes: 3000,
    quotientConjugalMaxCentimes: 1_346_000,
    // Annexe 3
    reductionEnfantsCentimes: [0, 61_200, 160_800, 429_600, 742_800, 1_083_600, 1_423_200, 1_767_600, 2_144_400],
    reductionEnfantSupplementaireCentimes: 378_000,
    // Annexe 4, point 1
    reductionParentIsoleCentimes: 61_200,
    // Annexe 4, point 5
    reductionConjointAutresMax290Centimes: 169_800,
    // Annexe 4, point 6
    reductionConjointPensionMax579Centimes: 339_000,
    // n° 20
    bonusFiscalVoletADixMilliemes: 3314,
    bonusFiscalVoletBDixMilliemes: 5254,
  },

  // ONSS-CSSS-2025 : mêmes tranches qu'en 2026 selon les fiches de paie (16,30 € à 2 732,94 €
  // de brut, imposition individuelle) ; à confirmer sur la page ONSS 2025.
  cotisationSpeciale: P2026_07.cotisationSpeciale,

  // ONSS-TR-2025 : part minimale du travailleur 1,09 €, confirmée par les fiches.
  // Les autres plafonds ne servent à aucun cas de référence 2025 et reprennent les valeurs
  // 2026 : ils ne sont PAS vérifiés pour 2025.
  avantages: { ...P2026_07.avantages, titresRepasPartTravailleurMinCentimes: 109 },

  // Allocations exceptionnelles 2025 (pécule de vacances, prime de fin d'année) : onze tranches,
  // même mécanisme qu'en 2026. Confirmé : annexe III à l'arrêté royal d'exécution du CIR 92
  // (AR du 12/12/2024, Moniteur belge), n° 53 à 55. Dernière tranche : même taux dans les deux
  // colonnes (53,50 %).
  allocationsExceptionnelles: {
    tranches: [
      { jusquaAnnuelCentimes: 1_041_500, peculeDixMilliemes: 0, autreDixMilliemes: 0 },
      { jusquaAnnuelCentimes: 1_333_000, peculeDixMilliemes: 1917, autreDixMilliemes: 2322 },
      { jusquaAnnuelCentimes: 1_696_000, peculeDixMilliemes: 2120, autreDixMilliemes: 2523 },
      { jusquaAnnuelCentimes: 2_034_000, peculeDixMilliemes: 2625, autreDixMilliemes: 3028 },
      { jusquaAnnuelCentimes: 2_302_000, peculeDixMilliemes: 3130, autreDixMilliemes: 3533 },
      { jusquaAnnuelCentimes: 2_571_000, peculeDixMilliemes: 3433, autreDixMilliemes: 3836 },
      { jusquaAnnuelCentimes: 3_107_000, peculeDixMilliemes: 3634, autreDixMilliemes: 4038 },
      { jusquaAnnuelCentimes: 3_381_000, peculeDixMilliemes: 3937, autreDixMilliemes: 4341 },
      { jusquaAnnuelCentimes: 4_477_000, peculeDixMilliemes: 4239, autreDixMilliemes: 4644 },
      { jusquaAnnuelCentimes: 5_846_000, peculeDixMilliemes: 4744, autreDixMilliemes: 5148 },
      { jusquaAnnuelCentimes: null, peculeDixMilliemes: 5350, autreDixMilliemes: 5350 },
    ],
    // Annexe III n° 54 — exonération totale, index = nombre d'enfants (1 à 12). Confirmé : même
    // référence, n° 54 (18 400 € à 91 810 €).
    exonerationEnfantsPlafondsCentimes: [
      0,
      1_840_000,
      2_193_000,
      2_827_000,
      3_533_000,
      4_239_000,
      4_945_000,
      5_651_000,
      6_357_000,
      7_063_000,
      7_769_000,
      8_475_000,
      9_181_000,
    ],
    // Annexe III n° 55 — réduction, index = nombre d'enfants (1 à 5). Confirmé : même référence,
    // n° 55.
    reductionsEnfants: [
      { plafondAnnuelCentimes: 0, reductionDixMilliemes: 0 },
      { plafondAnnuelCentimes: 2_824_500, reductionDixMilliemes: 750 },
      { plafondAnnuelCentimes: 2_824_500, reductionDixMilliemes: 2000 },
      { plafondAnnuelCentimes: 3_107_000, reductionDixMilliemes: 3500 },
      { plafondAnnuelCentimes: 3_672_000, reductionDixMilliemes: 5500 },
      { plafondAnnuelCentimes: 3_955_000, reductionDixMilliemes: 7500 },
    ],
    // ONSS, « La retenue sur le double pécule de vacances du secteur privé » : la retenue de
    // 13,07 % ne porte pas sur la part correspondant à la rémunération à partir du 3e jour de la
    // 4e semaine. Dans le cas standard (droits complets, 20 jours de vacances légales), cela exclut
    // 3 jours sur 20, donc 85 % du double pécule y reste soumis (même instruction qu'en 2026).
    partPeculeSoumiseRetenueDixMilliemes: 8_500,
  },

  // Voiture de société, revenus 2025 : émissions de référence 71 g/km (essence, LPG, gaz naturel)
  // et 59 g/km (diesel) ; ATN minimum 1 650 €/an. Confirmé : SPF Finances, FAQ « Avantage de toute
  // nature résultant de l'utilisation à des fins personnelles d'un véhicule mis gratuitement à
  // disposition » (finances.belgium.be/sites/default/files/downloads/121-faq-voitures-de-societe-2026.pdf,
  // tableaux p. 1-2 : émissions de référence 2025 = 71/59 g/km ; minimum indexé, exercice d'imposition
  // 2026 = 1 650 €, soit les revenus 2025) ; émissions fixées par arrêté royal, selon Securex
  // et Partena (source secondaire) du 08/12/2024 (Moniteur belge du 12/12/2024), non vérifié
  // sur ejustice.just.fgov.be.
  voiture: { emissionReferenceEssenceGrammesKm: 71, emissionReferenceDieselGrammesKm: 59, atnMinimumAnnuelCentimes: 165_000 },

  // Budget mobilité, loi du 17/03/2019 : cotisation spéciale de sécurité sociale de 38,07 % due par
  // le travailleur sur le solde versé en espèces (art. 22 de la loi, insérant l'art. 38 § 3novodecies
  // dans la loi du 29/06/1981 sur les principes généraux de la sécurité sociale des travailleurs
  // salariés). Bornes du budget annuel indexées chaque année (art. 12 § 4) : 3 164,00 € à 16 875,00 € en 2025,
  // confirmées sur lebudgetmobilite.be (portail interfédéral) et les instructions ONSS.
  budgetMobilite: {
    tauxCotisationSpecialeDixMilliemes: 3_807,
    budgetAnnuelMinCentimes: 316_400,
    budgetAnnuelMaxCentimes: 1_687_500,
  },

  // Salaire minimum : non vérifié pour 2025, ne sert qu'à l'alerte de l'interface,
  // qui ne calcule jamais à une date de 2025.
  rmmmgCentimes: P2026_07.rmmmgCentimes,
}
