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

  // Voiture de société, revenus 2025 : émissions de référence 71 g/km (essence, LPG, gaz naturel)
  // et 59 g/km (diesel) ; ATN minimum 1 650 €/an. Confirmé : SPF Finances, FAQ « Avantage de toute
  // nature résultant de l'utilisation à des fins personnelles d'un véhicule mis gratuitement à
  // disposition » (finances.belgium.be/sites/default/files/downloads/121-faq-voitures-de-societe-2026.pdf,
  // tableaux p. 1-2 : émissions de référence 2025 = 71/59 g/km ; minimum indexé, exercice d'imposition
  // 2026 = 1 650 €, soit les revenus 2025) ; émissions fixées par arrêté royal, selon Securex
  // et Partena (source secondaire) du 08/12/2024 (Moniteur belge du 12/12/2024), non vérifié
  // sur ejustice.just.fgov.be.
  voiture: { emissionReferenceEssenceGrammesKm: 71, emissionReferenceDieselGrammesKm: 59, atnMinimumAnnuelCentimes: 165_000 },

  // Salaire minimum : non vérifié pour 2025, ne sert qu'à l'alerte de l'interface,
  // qui ne calcule jamais à une date de 2025.
  rmmmgCentimes: P2026_07.rmmmgCentimes,
}
