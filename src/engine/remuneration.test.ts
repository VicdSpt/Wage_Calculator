import { describe, expect, it } from 'vitest'
import { ATN_AUCUN, type AtnSaisi } from './atnVoiture'
import { AVANTAGES_AUCUN, calculerAvantages, type Avantages } from './avantages'
import type { SituationFamiliale } from './calculerBrut'
import { calculerNet } from './calculerNet'
import { getParametres } from './parametres'
import { calculerBrutDepuisNetVerse, calculerRemuneration, type SituationSansAtn } from './remuneration'
import { BRUT_MAX_CENTIMES, NetHorsLimites, PeriodeNonCouverte, type Situation } from './types'

const SEPT = '2026-09-14'
const AOUT = '2026-08-31'

const ISOLE: SituationFamiliale = { etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false, atnMensuelCentimes: 0 }
const ISOLE_3000: Situation = { ...ISOLE, brutMensuelCentimes: 300_000 }

const TITRES_ET_TELETRAVAIL: Avantages = {
  titresRepas: { actif: true, joursPrestes: 20, valeurFacialeCentimes: 1_000, partTravailleurCentimes: 109 },
  teletravail: { actif: true, indemniteCentimes: 16_099 },
  ecocheques: { actif: true, montantAnnuelCentimes: 25_000 },
  fraisPropresEmployeur: { actif: false, montantMensuelCentimes: 0 },
  atn: ATN_AUCUN,
  choixMobilite: AVANTAGES_AUCUN.choixMobilite,
  budgetMobilite: AVANTAGES_AUCUN.budgetMobilite,
}

/** net versé pour un brut donné : le net légal, moins la retenue des titres, plus l'indemnité. */
function netVerse(famille: SituationFamiliale, avantages: Avantages, brut: number, dateIso: string): number {
  const r = calculerAvantages(avantages, getParametres(dateIso))
  return calculerNet({ ...famille, brutMensuelCentimes: brut }, dateIso).netMensuelCentimes - r.retenueTitresCentimes + r.teletravailCentimes
}

/**
 * Oracle : on monte centime par centime depuis la plus petite valeur possible.
 * net(b) ≤ b, donc netVerse(b) ≤ b − retenue + télétravail : tout brut qui atteint la cible
 * est ≥ cible + retenue − télétravail.
 */
function brutOracleNetVerse(famille: SituationFamiliale, avantages: Avantages, cible: number, dateIso: string): number {
  const r = calculerAvantages(avantages, getParametres(dateIso))
  let brut = Math.max(1, cible + r.retenueTitresCentimes - r.teletravailCentimes)
  while (netVerse(famille, avantages, brut, dateIso) < cible) {
    brut++
  }
  return brut
}

describe('calculerRemuneration', () => {
  it('sans avantage, le net versé et le total valent le net légal', () => {
    const complet = calculerRemuneration(ISOLE_3000, AVANTAGES_AUCUN, SEPT)
    expect(complet.resultat).toEqual(calculerNet(ISOLE_3000, SEPT))
    expect(complet.netVerseCentimes).toBe(226_133)
    expect(complet.totalMensuelCentimes).toBe(226_133)
  })

  it('retire la retenue des titres et ajoute l\'indemnité de télétravail', () => {
    const complet = calculerRemuneration(ISOLE_3000, TITRES_ET_TELETRAVAIL, SEPT)
    expect(complet.avantages.retenueTitresCentimes).toBe(2_180)
    expect(complet.netVerseCentimes).toBe(226_133 - 2_180 + 16_099)
    expect(complet.totalMensuelCentimes).toBe(226_133 - 2_180 + 16_099 + 20_000)
    expect(complet.avantages.ecochequesAnnuelCentimes).toBe(25_000)
  })

  it('ne touche pas au calcul du salaire', () => {
    expect(calculerRemuneration(ISOLE_3000, TITRES_ET_TELETRAVAIL, SEPT).resultat).toEqual(calculerNet(ISOLE_3000, SEPT))
  })

  it('lève PeriodeNonCouverte hors des périodes intégrées', () => {
    expect(() => calculerRemuneration(ISOLE_3000, AVANTAGES_AUCUN, '2027-01-15')).toThrow(PeriodeNonCouverte)
  })
})

describe('calculerBrutDepuisNetVerse', () => {
  const COMBINAISONS: ReadonlyArray<readonly [string, SituationFamiliale, Avantages]> = [
    ['isolé sans avantage', ISOLE, AVANTAGES_AUCUN],
    ['isolé avec titres et télétravail', ISOLE, TITRES_ET_TELETRAVAIL],
    [
      'marié 2 enfants, titres seuls',
      { etatCivil: 'marieOuCohabitant', revenusConjoint: 'superieurs', enfantsACharge: 2, parentIsole: false, atnMensuelCentimes: 0 },
      { ...AVANTAGES_AUCUN, titresRepas: { actif: true, joursPrestes: 22, valeurFacialeCentimes: 800, partTravailleurCentimes: 109 } },
    ],
  ]

  it.each(COMBINAISONS.flatMap(([nom, famille, avantages]) => [AOUT, SEPT].map((date) => [`${nom} (${date})`, famille, avantages, date] as const)))(
    '%s : donne le plus petit brut dont le net versé atteint la cible',
    (_nom, famille, avantages, date) => {
      for (const cible of [150_000, 200_000, 226_133]) {
        const r = calculerBrutDepuisNetVerse(famille, avantages, cible, date)
        expect(r.brutCentimes).toBe(brutOracleNetVerse(famille, avantages, cible, date))
        expect(r.complet.netVerseCentimes).toBeGreaterThanOrEqual(cible)
        expect(r.netVerseCibleCentimes).toBe(cible)
      }
    },
  )

  it('ramène la cible à 1 centime quand l\'indemnité dépasse à elle seule le net souhaité', () => {
    const teletravailSeul: Avantages = { ...AVANTAGES_AUCUN, teletravail: { actif: true, indemniteCentimes: 16_099 } }
    const r = calculerBrutDepuisNetVerse(ISOLE, teletravailSeul, 10_000, SEPT)
    expect(r.brutCentimes).toBe(1)
    expect(r.complet.netVerseCentimes).toBeGreaterThanOrEqual(10_000)
  })

  it('le résultat complet correspond au brut trouvé', () => {
    const r = calculerBrutDepuisNetVerse(ISOLE, TITRES_ET_TELETRAVAIL, 220_000, SEPT)
    expect(r.complet.resultat).toEqual(calculerNet({ ...ISOLE, brutMensuelCentimes: r.brutCentimes }, SEPT))
  })

  it('lève NetHorsLimites pour un net versé inatteignable', () => {
    expect(() => calculerBrutDepuisNetVerse(ISOLE, AVANTAGES_AUCUN, 5_000_000, SEPT)).toThrow(NetHorsLimites)
  })

  it('avec télétravail, NetHorsLimites porte le net maximal versé (net légal max + indemnité), pas le net légal', () => {
    const teletravailSeul: Avantages = { ...AVANTAGES_AUCUN, teletravail: { actif: true, indemniteCentimes: 16_099 } }
    const netLegalMaxCentimes = calculerNet({ ...ISOLE, brutMensuelCentimes: BRUT_MAX_CENTIMES }, SEPT).netMensuelCentimes
    expect.assertions(3)
    try {
      calculerBrutDepuisNetVerse(ISOLE, teletravailSeul, 5_000_000, SEPT)
    } catch (erreur) {
      expect(erreur).toBeInstanceOf(NetHorsLimites)
      expect((erreur as NetHorsLimites).netMaxCentimes).toBe(netLegalMaxCentimes + 16_099)
      expect((erreur as NetHorsLimites).netCibleCentimes).toBe(5_000_000)
    }
  })

  it('lève PeriodeNonCouverte hors des périodes intégrées', () => {
    expect(() => calculerBrutDepuisNetVerse(ISOLE, AVANTAGES_AUCUN, 200_000, '2027-01-15')).toThrow(PeriodeNonCouverte)
  })
})

describe('calculerRemuneration — frais propres à l’employeur', () => {
  const AVEC_FRAIS: Avantages = {
    ...AVANTAGES_AUCUN,
    fraisPropresEmployeur: { actif: true, montantMensuelCentimes: 10_084 },
    atn: ATN_AUCUN,
  }

  it('ajoute les frais au net versé, sans toucher au salaire', () => {
    const complet = calculerRemuneration(ISOLE_3000, AVEC_FRAIS, SEPT)
    expect(complet.resultat).toEqual(calculerNet(ISOLE_3000, SEPT))
    expect(complet.avantages.fraisPropresCentimes).toBe(10_084)
    expect(complet.netVerseCentimes).toBe(226_133 + 10_084)
    expect(complet.totalMensuelCentimes).toBe(226_133 + 10_084)
  })

  it('les frais décalent la cible du net versé → brut', () => {
    const r = calculerBrutDepuisNetVerse(ISOLE, AVEC_FRAIS, 226_133 + 10_084, SEPT)
    expect(r.brutCentimes).toBe(299_996)
    expect(r.complet.netVerseCentimes).toBeGreaterThanOrEqual(226_133 + 10_084)
  })
})

const ISOLE_3000_SANS_ATN: SituationSansAtn = {
  brutMensuelCentimes: 300_000,
  etatCivil: 'isole',
  revenusConjoint: null,
  enfantsACharge: 0,
  parentIsole: false,
}

/** L'exemple de contrôle de la spec (265,89 €/mois), avec 50 € de contribution. */
const VOITURE_CONTROLE: AtnSaisi = {
  source: {
    mode: 'voiture',
    voiture: { carburant: 'essence', valeurCatalogueCentimes: 4_500_000, co2GrammesKm: 103, premiereImmatriculation: '2025-02' },
  },
  contributionMensuelleCentimes: 5_000,
}

describe('calculerRemuneration — voiture de société', () => {
  it('résout l’ATN de la voiture, déduit la contribution et l’ajoute à la base du précompte', () => {
    const complet = calculerRemuneration(ISOLE_3000_SANS_ATN, { ...AVANTAGES_AUCUN, atn: VOITURE_CONTROLE }, SEPT)
    expect(complet.atn).toMatchObject({ mode: 'voiture', avantContributionCentimes: 26_589, contributionCentimes: 5_000, imposableCentimes: 21_589 })
    expect(complet.resultat).toEqual(calculerNet({ ...ISOLE_3000_SANS_ATN, atnMensuelCentimes: 21_589 }, SEPT))
  })

  it('retient la contribution sur le net versé', () => {
    const complet = calculerRemuneration(ISOLE_3000_SANS_ATN, { ...AVANTAGES_AUCUN, atn: VOITURE_CONTROLE }, SEPT)
    expect(complet.netVerseCentimes).toBe(complet.resultat.netMensuelCentimes - 5_000)
    expect(complet.totalMensuelCentimes).toBe(complet.netVerseCentimes)
  })

  it('retient toute la contribution même quand elle dépasse l’ATN', () => {
    const atn: AtnSaisi = { source: { mode: 'montant', montantMensuelCentimes: 10_000 }, contributionMensuelleCentimes: 30_000 }
    const complet = calculerRemuneration(ISOLE_3000_SANS_ATN, { ...AVANTAGES_AUCUN, atn }, SEPT)
    expect(complet.atn.imposableCentimes).toBe(0)
    expect(complet.resultat).toEqual(calculerNet({ ...ISOLE_3000_SANS_ATN, atnMensuelCentimes: 0 }, SEPT))
    expect(complet.netVerseCentimes).toBe(complet.resultat.netMensuelCentimes - 30_000)
  })

  it('mode montant sans contribution : identique à l’ATN saisi de la V2.3', () => {
    const atn: AtnSaisi = { source: { mode: 'montant', montantMensuelCentimes: 27_017 }, contributionMensuelleCentimes: 0 }
    const complet = calculerRemuneration(ISOLE_3000_SANS_ATN, { ...AVANTAGES_AUCUN, atn }, SEPT)
    expect(complet.resultat).toEqual(calculerNet({ ...ISOLE_3000_SANS_ATN, atnMensuelCentimes: 27_017 }, SEPT))
    expect(complet.netVerseCentimes).toBe(complet.resultat.netMensuelCentimes)
  })
})

describe('calculerBrutDepuisNetVerse — voiture de société', () => {
  const avantages: Avantages = { ...AVANTAGES_AUCUN, atn: VOITURE_CONTROLE }
  const netVerseVoiture = (brut: number) =>
    calculerNet({ ...ISOLE, atnMensuelCentimes: 21_589, brutMensuelCentimes: brut }, SEPT).netMensuelCentimes - 5_000

  it('trouve le plus petit brut, comparé à l’oracle', () => {
    const cible = 226_133
    // net(b) ≤ b, donc netVerse(b) ≤ b − 5 000 : tout brut qui atteint la cible est ≥ cible + 5 000.
    let oracle = cible + 5_000
    while (netVerseVoiture(oracle) < cible) {
      oracle++
    }
    const r = calculerBrutDepuisNetVerse(ISOLE, avantages, cible, SEPT)
    expect(r.brutCentimes).toBe(oracle)
    expect(r.complet.netVerseCentimes).toBe(netVerseVoiture(oracle))
    expect(r.complet.atn.imposableCentimes).toBe(21_589)
  })

  it('exprime NetHorsLimites en net versé, contribution comprise', () => {
    const netMax = netVerseVoiture(BRUT_MAX_CENTIMES)
    try {
      calculerBrutDepuisNetVerse(ISOLE, avantages, netMax + 1, SEPT)
      expect.unreachable('NetHorsLimites attendu')
    } catch (erreur) {
      expect(erreur).toBeInstanceOf(NetHorsLimites)
      expect((erreur as NetHorsLimites).netMaxCentimes).toBe(netMax)
    }
  })
})

describe('budget mobilité', () => {
  const DATE = '2026-09-15'
  const SITUATION = {
    brutMensuelCentimes: 300_000,
    etatCivil: 'isole' as const,
    revenusConjoint: null,
    enfantsACharge: 0,
    parentIsole: false,
  }
  const FAMILLE = { etatCivil: 'isole' as const, revenusConjoint: null, enfantsACharge: 0, parentIsole: false }
  const AVEC_BUDGET = {
    ...AVANTAGES_AUCUN,
    choixMobilite: 'budgetMobilite' as const,
    budgetMobilite: { budgetAnnuelCentimes: 600_000, pilier3AnnuelCentimes: 200_000 },
  }

  it('ajoute le net du pilier 3 au net versé', () => {
    const sans = calculerRemuneration(SITUATION, AVANTAGES_AUCUN, DATE)
    const avec = calculerRemuneration(SITUATION, AVEC_BUDGET, DATE)
    // Le pilier 3 net vaut 103,22 € par mois (vérifié dans budgetMobilite.test.ts).
    expect(avec.netVerseCentimes - sans.netVerseCentimes).toBe(10_322)
    // Il est exonéré d'impôt et d'ONSS : le net légal, lui, ne bouge pas.
    expect(avec.resultat.netMensuelCentimes).toBe(sans.resultat.netMensuelCentimes)
    expect(avec.budgetMobilite.pilier3MensuelNetCentimes).toBe(10_322)
  })

  it('ignore la voiture quand le budget mobilité est choisi', () => {
    const avecVoitureEtBudget = {
      ...AVEC_BUDGET,
      atn: { source: { mode: 'montant' as const, montantMensuelCentimes: 50_000 }, contributionMensuelleCentimes: 0 },
    }
    const resultat = calculerRemuneration(SITUATION, avecVoitureEtBudget, DATE)
    // L'ATN saisi ne doit ni entrer dans la base du précompte ni apparaître dans le résultat.
    expect(resultat.atn.avantContributionCentimes).toBe(0)
    expect(resultat.atn.imposableCentimes).toBe(0)
    expect(resultat.resultat.intermediaires.atn).toBe(0)
  })

  it('ignore aussi une contribution voiture quand le budget mobilité est choisi', () => {
    const avecContribution = {
      ...AVEC_BUDGET,
      atn: { source: { mode: 'montant' as const, montantMensuelCentimes: 0 }, contributionMensuelleCentimes: 5_000 },
    }
    const resultat = calculerRemuneration(SITUATION, avecContribution, DATE)
    const sansVoiture = calculerRemuneration(SITUATION, AVEC_BUDGET, DATE)
    expect(resultat.atn.contributionCentimes).toBe(0)
    expect(resultat.netVerseCentimes).toBe(sansVoiture.netVerseCentimes)
  })

  it('ignore l’un et l’autre quand le choix est « aucun »', () => {
    const aucun = {
      ...AVEC_BUDGET,
      choixMobilite: 'aucun' as const,
      atn: { source: { mode: 'montant' as const, montantMensuelCentimes: 50_000 }, contributionMensuelleCentimes: 0 },
    }
    const resultat = calculerRemuneration(SITUATION, aucun, DATE)
    expect(resultat.atn.imposableCentimes).toBe(0)
    expect(resultat.budgetMobilite.pilier3MensuelNetCentimes).toBe(0)
  })

  it('ignore aussi une contribution voiture quand le choix est « aucun »', () => {
    const sansVoiture = { ...AVEC_BUDGET, choixMobilite: 'aucun' as const }
    const avecContribution = {
      ...sansVoiture,
      atn: { source: { mode: 'montant' as const, montantMensuelCentimes: 0 }, contributionMensuelleCentimes: 5_000 },
    }
    const resultat = calculerRemuneration(SITUATION, avecContribution, DATE)
    const attendu = calculerRemuneration(SITUATION, sansVoiture, DATE)
    expect(resultat.atn.contributionCentimes).toBe(0)
    expect(resultat.netVerseCentimes).toBe(attendu.netVerseCentimes)
  })

  it('atteint la cible en net → brut, pilier 3 compris', () => {
    const cible = 250_000
    const inverse = calculerBrutDepuisNetVerse(FAMILLE, AVEC_BUDGET, cible, DATE)
    expect(inverse.complet.netVerseCentimes).toBeGreaterThanOrEqual(cible)
    // Le pilier 3 doit abaisser le brut nécessaire : sans lui, il en faudrait davantage.
    const sansBudget = calculerBrutDepuisNetVerse(FAMILLE, AVANTAGES_AUCUN, cible, DATE)
    expect(inverse.brutCentimes).toBeLessThan(sansBudget.brutCentimes)
    // Minimalité : un centime de brut en moins ne suffit plus (même forme que les autres oracles net → brut du dépôt).
    if (inverse.brutCentimes > 1) {
      const unCentimeDeMoins = calculerRemuneration({ ...FAMILLE, brutMensuelCentimes: inverse.brutCentimes - 1 }, AVEC_BUDGET, DATE)
      expect(unCentimeDeMoins.netVerseCentimes).toBeLessThan(cible)
    }
  })
})
