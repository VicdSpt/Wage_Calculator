import { describe, expect, it } from 'vitest'
import { ATN_AUCUN } from './atnVoiture'
import { AVANTAGES_AUCUN } from './avantages'
import { getParametres } from './parametres'
import { calculerPrimesAnnuelles } from './primesAnnuelles'
import {
  SAISIE_BUDGET_MOBILITE_PAR_DEFAUT,
  SAISIE_PAR_DEFAUT,
  SAISIE_PRIMES_PAR_DEFAUT,
  SAISIE_VOITURE_PAR_DEFAUT,
  validerSaisie,
  type SaisieBudgetMobilite,
  type SaisieFormulaire,
} from './validation'

function saisie(modif: Partial<SaisieFormulaire>): SaisieFormulaire {
  return { ...SAISIE_PAR_DEFAUT, ...modif }
}

const DATE = '2026-09-14'
const valider = (s: SaisieFormulaire) => validerSaisie(s, DATE)

const ISOLE_SANS_ENFANT = { etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false }

const PRIMES_PAR_DEFAUT_CONVERTIES = {
  treiziemeActif: true,
  treiziemePourcentageDixMilliemes: 10_000,
  treiziemeMoisPrestes: 12,
  peculeActif: true,
  peculeMoisPrestes: 12,
}

describe('validerSaisie', () => {
  it('a une saisie par défaut en brut → net, sans montant de bascule', () => {
    expect(SAISIE_PAR_DEFAUT).toMatchObject({ sens: 'brutVersNet', montant: '3000', montantAvantBascule: null })
  })

  it('accepte la saisie par défaut (brut → net), sans aucun avantage', () => {
    expect(valider(SAISIE_PAR_DEFAUT)).toEqual({
      ok: true,
      sens: 'brutVersNet',
      situation: { brutMensuelCentimes: 300_000, ...ISOLE_SANS_ENFANT },
      avantages: AVANTAGES_AUCUN,
      primes: PRIMES_PAR_DEFAUT_CONVERTIES,
    })
  })

  it('en net → brut, renvoie la situation familiale, le net cible et les avantages', () => {
    expect(valider(saisie({ sens: 'netVersBrut', montant: '2261,33' }))).toEqual({
      ok: true,
      sens: 'netVersBrut',
      famille: ISOLE_SANS_ENFANT,
      netCibleCentimes: 226_133,
      avantages: AVANTAGES_AUCUN,
      primes: PRIMES_PAR_DEFAUT_CONVERTIES,
    })
  })

  describe.each(['brutVersNet', 'netVersBrut'] as const)('montant en %s', (sens) => {
    it.each([
      ['', 'montantVide'],
      ['   ', 'montantVide'],
      ['abc', 'montantFormat'],
      ['3000,123', 'montantFormat'],
      ['0', 'montantHorsLimites'],
      ['100000,01', 'montantHorsLimites'],
    ])('« %s » → erreur %s', (montant, code) => {
      expect(valider(saisie({ sens, montant }))).toEqual({ ok: false, erreurs: { montant: code } })
    })

    it('accepte 100 000 € pile', () => {
      expect(valider(saisie({ sens, montant: '100000' })).ok).toBe(true)
    })
  })

  it.each(['', '-1', '11', '1,5', 'deux'])('enfants « %s » → erreur', (enfantsACharge) => {
    expect(valider(saisie({ enfantsACharge }))).toEqual({ ok: false, erreurs: { enfantsACharge: 'enfantsInvalide' } })
  })

  it('signale les deux champs en même temps', () => {
    expect(valider(saisie({ montant: '', enfantsACharge: '' }))).toEqual({
      ok: false,
      erreurs: { montant: 'montantVide', enfantsACharge: 'enfantsInvalide' },
    })
  })

  it('ignore le montant de bascule pour la validation', () => {
    expect(valider(saisie({ montantAvantBascule: 'n’importe quoi' })).ok).toBe(true)
  })

  it('ignore les revenus du conjoint pour un isolé', () => {
    const r = valider(saisie({ revenusConjoint: 'superieurs' }))
    expect(r.ok && r.sens === 'brutVersNet' && r.situation.revenusConjoint).toBeNull()
  })

  it('garde les revenus du conjoint pour un marié et désactive parent isolé', () => {
    const r = valider(saisie({ etatCivil: 'marieOuCohabitant', revenusConjoint: 'autresMax290', enfantsACharge: '2', parentIsole: true }))
    expect(r.ok && r.sens === 'brutVersNet' && r.situation).toMatchObject({ revenusConjoint: 'autresMax290', parentIsole: false })
  })

  it('normalise aussi la situation familiale en net → brut', () => {
    const r = valider(saisie({ sens: 'netVersBrut', revenusConjoint: 'superieurs', parentIsole: true, enfantsACharge: '0' }))
    expect(r.ok && r.sens === 'netVersBrut' && r.famille).toEqual(ISOLE_SANS_ENFANT)
  })

  it('désactive parent isolé sans enfant', () => {
    const r = valider(saisie({ parentIsole: true, enfantsACharge: '0' }))
    expect(r.ok && r.sens === 'brutVersNet' && r.situation.parentIsole).toBe(false)
  })

  it('garde parent isolé pour un isolé avec enfant', () => {
    const r = valider(saisie({ parentIsole: true, enfantsACharge: '1' }))
    expect(r.ok && r.sens === 'brutVersNet' && r.situation.parentIsole).toBe(true)
  })
})

describe('validerSaisie — avantages extralégaux', () => {
  const TITRES_ACTIFS = { titresRepasActif: true, joursPrestes: '20', valeurFaciale: '10,00', partTravailleur: '1,09' }

  function avecAvantages(modif: Partial<SaisieFormulaire['avantages']>): SaisieFormulaire {
    return saisie({ avantages: { ...SAISIE_PAR_DEFAUT.avantages, ...modif } })
  }

  it('convertit les titres-repas actifs en centimes', () => {
    const r = valider(avecAvantages(TITRES_ACTIFS))
    expect(r.ok && r.avantages.titresRepas).toEqual({
      actif: true,
      joursPrestes: 20,
      valeurFacialeCentimes: 1_000,
      partTravailleurCentimes: 109,
    })
  })

  it('convertit le télétravail et les écochèques actifs', () => {
    const r = valider(avecAvantages({ teletravailActif: true, ecochequesActif: true }))
    expect(r.ok && r.avantages.teletravail).toEqual({ actif: true, indemniteCentimes: 16_099 })
    expect(r.ok && r.avantages.ecocheques).toEqual({ actif: true, montantAnnuelCentimes: 25_000 })
  })

  it('ne valide pas un avantage décoché, même avec des valeurs absurdes', () => {
    const r = valider(avecAvantages({ joursPrestes: 'abc', valeurFaciale: '', teletravail: '99999', ecocheques: 'x' }))
    expect(r.ok).toBe(true)
    expect(r.ok && r.avantages).toEqual(AVANTAGES_AUCUN)
  })

  it.each(['', '  ', 'abc', '-1', '24', '1,5'])('jours prestés « %s » → erreur', (joursPrestes) => {
    expect(valider(avecAvantages({ ...TITRES_ACTIFS, joursPrestes }))).toEqual({
      ok: false,
      erreurs: { joursPrestes: 'joursInvalide' },
    })
  })

  it.each(['0', '23'])('jours prestés « %s » acceptés', (joursPrestes) => {
    expect(valider(avecAvantages({ ...TITRES_ACTIFS, joursPrestes })).ok).toBe(true)
  })

  it.each(['', 'abc', '0', '20,01'])('valeur faciale « %s » → erreur', (valeurFaciale) => {
    expect(valider(avecAvantages({ ...TITRES_ACTIFS, valeurFaciale }))).toEqual({
      ok: false,
      erreurs: { valeurFaciale: 'valeurFacialeInvalide' },
    })
  })

  it.each(['', 'abc', '20,01'])('part du travailleur « %s » → erreur de format', (partTravailleur) => {
    expect(valider(avecAvantages({ ...TITRES_ACTIFS, partTravailleur }))).toEqual({
      ok: false,
      erreurs: { partTravailleur: 'partTravailleurInvalide' },
    })
  })

  it('refuse une part du travailleur supérieure à la valeur faciale', () => {
    expect(valider(avecAvantages({ ...TITRES_ACTIFS, valeurFaciale: '5,00', partTravailleur: '5,01' }))).toEqual({
      ok: false,
      erreurs: { partTravailleur: 'partTravailleurSuperieure' },
    })
  })

  it('accepte une part du travailleur nulle ou égale à la valeur faciale', () => {
    expect(valider(avecAvantages({ ...TITRES_ACTIFS, partTravailleur: '0' })).ok).toBe(true)
    expect(valider(avecAvantages({ ...TITRES_ACTIFS, valeurFaciale: '5,00', partTravailleur: '5,00' })).ok).toBe(true)
  })

  it.each(['', 'abc', '1000,01'])('indemnité de télétravail « %s » → erreur', (teletravail) => {
    expect(valider(avecAvantages({ teletravailActif: true, teletravail }))).toEqual({
      ok: false,
      erreurs: { teletravail: 'teletravailInvalide' },
    })
  })

  it.each(['', 'abc', '2000,01'])('écochèques « %s » → erreur', (ecocheques) => {
    expect(valider(avecAvantages({ ecochequesActif: true, ecocheques }))).toEqual({
      ok: false,
      erreurs: { ecocheques: 'ecochequesInvalide' },
    })
  })

  it('accepte un dépassement de plafond officiel : c’est une alerte, pas une erreur', () => {
    const r = valider(avecAvantages({ teletravailActif: true, teletravail: '500,00' }))
    expect(r.ok && r.avantages.teletravail.indemniteCentimes).toBe(50_000)
  })

  it('signale une erreur de montant et une erreur d’avantage en même temps', () => {
    expect(valider({ ...avecAvantages({ ...TITRES_ACTIFS, joursPrestes: '99' }), montant: '' })).toEqual({
      ok: false,
      erreurs: { montant: 'montantVide', joursPrestes: 'joursInvalide' },
    })
  })
})

describe('validerSaisie — avantage de toute nature et frais propres', () => {
  it('convertit l’ATN saisi en centimes, en mode montant et sans contribution', () => {
    const r = valider(saisie({ atn: '270,17' }))
    expect(r.ok && r.avantages.atn).toEqual({ source: { mode: 'montant', montantMensuelCentimes: 27_017 }, contributionMensuelleCentimes: 0 })
  })

  it('accepte un ATN nul par défaut', () => {
    const r = valider(SAISIE_PAR_DEFAUT)
    expect(r.ok && r.avantages.atn).toEqual(ATN_AUCUN)
  })

  it.each(['', 'abc', '-5', '10000,01'])('ATN « %s » → erreur', (atn) => {
    expect(valider(saisie({ atn }))).toEqual({ ok: false, erreurs: { atn: 'atnInvalide' } })
  })

  it('convertit les frais propres actifs', () => {
    const r = valider(
      saisie({ avantages: { ...SAISIE_PAR_DEFAUT.avantages, fraisPropresActif: true, fraisPropres: '100,84' } }),
    )
    expect(r.ok && r.avantages.fraisPropresEmployeur).toEqual({ actif: true, montantMensuelCentimes: 10_084 })
  })

  it.each(['', 'abc', '5000,01'])('frais propres « %s » → erreur', (fraisPropres) => {
    expect(
      valider(saisie({ avantages: { ...SAISIE_PAR_DEFAUT.avantages, fraisPropresActif: true, fraisPropres } })),
    ).toEqual({ ok: false, erreurs: { fraisPropres: 'fraisPropresInvalide' } })
  })

  it('ne valide pas des frais propres décochés', () => {
    const r = valider(saisie({ avantages: { ...SAISIE_PAR_DEFAUT.avantages, fraisPropres: 'abc' } }))
    expect(r.ok && r.avantages.fraisPropresEmployeur).toEqual({ actif: false, montantMensuelCentimes: 0 })
  })
})

describe('validerSaisie — voiture de société', () => {
  const voiture = (modif: Partial<SaisieFormulaire['voiture']>) =>
    saisie({ voiture: { ...SAISIE_VOITURE_PAR_DEFAUT, mode: 'voiture', premiereImmatriculation: '2025-02', ...modif } })

  it('a une voiture par défaut en mode « je connais le montant », sans contribution', () => {
    expect(SAISIE_VOITURE_PAR_DEFAUT).toEqual({
      mode: 'montant',
      carburant: 'essence',
      valeurCatalogue: '45000,00',
      co2: '103',
      premiereImmatriculation: '',
      contribution: '0',
    })
  })

  it('convertit la voiture saisie', () => {
    const r = valider(voiture({}))
    expect(r.ok && r.avantages.atn).toEqual({
      source: {
        mode: 'voiture',
        voiture: { carburant: 'essence', valeurCatalogueCentimes: 4_500_000, co2GrammesKm: 103, premiereImmatriculation: '2025-02' },
      },
      contributionMensuelleCentimes: 0,
    })
  })

  it('ignore le CO₂ d’une voiture électrique, même invalide', () => {
    const r = valider(voiture({ carburant: 'electrique', co2: 'abc' }))
    expect(r.ok && r.avantages.atn.source).toMatchObject({ mode: 'voiture', voiture: { carburant: 'electrique', co2GrammesKm: 0 } })
  })

  it('en mode voiture, ne valide pas le montant d’ATN', () => {
    expect(valider({ ...voiture({}), atn: 'abc' }).ok).toBe(true)
  })

  it('en mode montant, ne valide pas les champs de la voiture', () => {
    const r = valider(saisie({ voiture: { ...SAISIE_VOITURE_PAR_DEFAUT, valeurCatalogue: 'abc', co2: '', premiereImmatriculation: '' } }))
    expect(r.ok).toBe(true)
  })

  it.each(['', '0', 'abc', '770000,01'])('valeur catalogue « %s » → erreur', (valeurCatalogue) => {
    expect(valider(voiture({ valeurCatalogue }))).toEqual({ ok: false, erreurs: { valeurCatalogue: 'valeurCatalogueInvalide' } })
  })

  it('accepte la valeur catalogue maximale', () => {
    expect(valider(voiture({ valeurCatalogue: '770000' })).ok).toBe(true)
  })

  it.each(['', 'abc', '-1', '10,5', '501'])('CO₂ « %s » → erreur', (co2) => {
    expect(valider(voiture({ co2 }))).toEqual({ ok: false, erreurs: { co2: 'co2Invalide' } })
  })

  it.each(['', '2025-13', '2025', '2026-10', '1949-12'])('première immatriculation « %s » → erreur', (premiereImmatriculation) => {
    expect(valider(voiture({ premiereImmatriculation }))).toEqual({
      ok: false,
      erreurs: { premiereImmatriculation: 'immatriculationInvalide' },
    })
  })

  it('accepte une immatriculation du mois calculé', () => {
    expect(valider(voiture({ premiereImmatriculation: '2026-09' })).ok).toBe(true)
  })

  it('convertit la contribution, dans les deux modes', () => {
    const enMontant = valider(saisie({ atn: '270,17', voiture: { ...SAISIE_VOITURE_PAR_DEFAUT, contribution: '50' } }))
    expect(enMontant.ok && enMontant.avantages.atn.contributionMensuelleCentimes).toBe(5_000)
    const enVoiture = valider(voiture({ contribution: '120,50' }))
    expect(enVoiture.ok && enVoiture.avantages.atn.contributionMensuelleCentimes).toBe(12_050)
  })

  it.each(['', 'abc', '-1', '10000,01'])('contribution « %s » → erreur', (contribution) => {
    expect(valider(saisie({ voiture: { ...SAISIE_VOITURE_PAR_DEFAUT, contribution } }))).toEqual({
      ok: false,
      erreurs: { contribution: 'contributionInvalide' },
    })
  })
})

describe('validerSaisie — primes annuelles', () => {
  const primes = (modif: Partial<SaisieFormulaire['primes']>) => saisie({ primes: { ...SAISIE_PRIMES_PAR_DEFAUT, ...modif } })

  it('a des primes par défaut : les deux cochées, 100 % et 12 mois', () => {
    expect(SAISIE_PRIMES_PAR_DEFAUT).toEqual({
      treiziemeActif: true,
      treiziemePourcentage: '100',
      treiziemeMoisPrestes: '12',
      peculeActif: true,
      peculeMoisPrestes: '12',
    })
  })

  it('convertit la saisie par défaut', () => {
    const r = valider(SAISIE_PAR_DEFAUT)
    expect(r.ok && r.primes).toEqual({
      treiziemeActif: true,
      treiziemePourcentageDixMilliemes: 10_000,
      treiziemeMoisPrestes: 12,
      peculeActif: true,
      peculeMoisPrestes: 12,
    })
  })

  it('accepte un pourcentage à virgule', () => {
    const r = valider(primes({ treiziemePourcentage: '108,5' }))
    expect(r.ok && r.primes.treiziemePourcentageDixMilliemes).toBe(10_850)
  })

  it.each(['', 'abc', '-1', '200,01'])('pourcentage « %s » → erreur', (treiziemePourcentage) => {
    expect(valider(primes({ treiziemePourcentage }))).toEqual({ ok: false, erreurs: { treiziemePourcentage: 'pourcentagePrimeInvalide' } })
  })

  it.each([
    ['0', 0],
    ['200', 20_000],
  ])('pourcentage « %s » accepté, à la borne', (treiziemePourcentage, dixMilliemes) => {
    const r = valider(primes({ treiziemePourcentage }))
    expect(r.ok).toBe(true)
    expect(r.ok && r.primes.treiziemePourcentageDixMilliemes).toBe(dixMilliemes)
  })

  it.each(['', 'abc', '-1', '13', '6,5'])('mois prestés « %s » → erreur', (treiziemeMoisPrestes) => {
    expect(valider(primes({ treiziemeMoisPrestes }))).toEqual({ ok: false, erreurs: { treiziemeMoisPrestes: 'moisPrestesInvalide' } })
  })

  it('accepte 0 mois presté pour le 13e mois : la prime reste calculée, mais nulle', () => {
    const r = valider(primes({ treiziemeMoisPrestes: '0' }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const parametres = getParametres(DATE)
    expect(() => calculerPrimesAnnuelles(300_000, 3_600_000, r.primes, ISOLE_SANS_ENFANT, parametres)).not.toThrow()
    expect(calculerPrimesAnnuelles(300_000, 3_600_000, r.primes, ISOLE_SANS_ENFANT, parametres).treizieme?.brutCentimes).toBe(0)
  })

  it('ne valide pas les champs d’une prime décochée', () => {
    const r = valider(primes({ treiziemeActif: false, treiziemePourcentage: 'abc', treiziemeMoisPrestes: '99' }))
    expect(r.ok).toBe(true)
    expect(r.ok && r.primes).toEqual({
      treiziemeActif: false,
      treiziemePourcentageDixMilliemes: 10_000,
      treiziemeMoisPrestes: 12,
      peculeActif: true,
      peculeMoisPrestes: 12,
    })
  })

  it('signale séparément les mois du pécule', () => {
    expect(valider(primes({ peculeMoisPrestes: '13' }))).toEqual({ ok: false, erreurs: { peculeMoisPrestes: 'moisPrestesInvalide' } })
  })
})

describe('budget mobilité', () => {
  const saisieBudget = (budgetMobilite: Partial<SaisieBudgetMobilite>): SaisieFormulaire => ({
    ...SAISIE_PAR_DEFAUT,
    choixMobilite: 'budgetMobilite',
    budgetMobilite: { ...SAISIE_BUDGET_MOBILITE_PAR_DEFAUT, ...budgetMobilite },
  })

  it('convertit le budget et la part en cash', () => {
    const r = validerSaisie(saisieBudget({ budgetAnnuel: '6000', pilier3Annuel: '2000' }), '2026-09-15')
    expect(r.ok && r.avantages.choixMobilite).toBe('budgetMobilite')
    expect(r.ok && r.avantages.budgetMobilite).toEqual({ budgetAnnuelCentimes: 600_000, pilier3AnnuelCentimes: 200_000 })
  })

  it('refuse une part en cash supérieure au budget, sur son propre champ', () => {
    const r = validerSaisie(saisieBudget({ budgetAnnuel: '6000', pilier3Annuel: '6000,01' }), '2026-09-15')
    expect(r.ok).toBe(false)
    expect(!r.ok && r.erreurs.pilier3Annuel).toBe('pilier3SuperieurAuBudget')
  })

  it('refuse un budget mal formé', () => {
    const r = validerSaisie(saisieBudget({ budgetAnnuel: 'abc' }), '2026-09-15')
    expect(!r.ok && r.erreurs.budgetAnnuel).toBe('budgetMobiliteInvalide')
  })

  it('accepte un budget et une part en cash nuls', () => {
    const r = validerSaisie(saisieBudget({ budgetAnnuel: '0', pilier3Annuel: '0' }), '2026-09-15')
    expect(r.ok).toBe(true)
    expect(r.ok && r.avantages.budgetMobilite).toEqual({ budgetAnnuelCentimes: 0, pilier3AnnuelCentimes: 0 })
  })

  it('ne valide pas les champs du budget quand la voiture est choisie', () => {
    const saisie: SaisieFormulaire = {
      ...SAISIE_PAR_DEFAUT,
      choixMobilite: 'voiture',
      budgetMobilite: { budgetAnnuel: 'abc', pilier3Annuel: 'abc' },
    }
    const r = validerSaisie(saisie, '2026-09-15')
    expect(r.ok).toBe(true)
    expect(r.ok && r.avantages.budgetMobilite).toEqual({ budgetAnnuelCentimes: 0, pilier3AnnuelCentimes: 0 })
  })

  it('ne valide pas les champs de la voiture quand le budget mobilité est choisi', () => {
    const saisie: SaisieFormulaire = {
      ...SAISIE_PAR_DEFAUT,
      choixMobilite: 'budgetMobilite',
      atn: 'abc',
      voiture: { ...SAISIE_VOITURE_PAR_DEFAUT, mode: 'voiture', valeurCatalogue: 'abc' },
      budgetMobilite: { budgetAnnuel: '6000', pilier3Annuel: '2000' },
    }
    const r = validerSaisie(saisie, '2026-09-15')
    expect(r.ok).toBe(true)
    expect(r.ok && r.avantages.atn).toEqual(ATN_AUCUN)
  })
})
