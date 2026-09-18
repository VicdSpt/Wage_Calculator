import { describe, expect, it } from 'vitest'
import { AVANTAGES_AUCUN } from './avantages'
import { SAISIE_PAR_DEFAUT, validerSaisie, type SaisieFormulaire } from './validation'

function saisie(modif: Partial<SaisieFormulaire>): SaisieFormulaire {
  return { ...SAISIE_PAR_DEFAUT, ...modif }
}

const ISOLE_SANS_ENFANT = { etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false, atnMensuelCentimes: 0 }

describe('validerSaisie', () => {
  it('a une saisie par défaut en brut → net, sans montant de bascule', () => {
    expect(SAISIE_PAR_DEFAUT).toMatchObject({ sens: 'brutVersNet', montant: '3000', montantAvantBascule: null })
  })

  it('accepte la saisie par défaut (brut → net), sans aucun avantage', () => {
    expect(validerSaisie(SAISIE_PAR_DEFAUT)).toEqual({
      ok: true,
      sens: 'brutVersNet',
      situation: { brutMensuelCentimes: 300_000, ...ISOLE_SANS_ENFANT },
      avantages: AVANTAGES_AUCUN,
    })
  })

  it('en net → brut, renvoie la situation familiale, le net cible et les avantages', () => {
    expect(validerSaisie(saisie({ sens: 'netVersBrut', montant: '2261,33' }))).toEqual({
      ok: true,
      sens: 'netVersBrut',
      famille: ISOLE_SANS_ENFANT,
      netCibleCentimes: 226_133,
      avantages: AVANTAGES_AUCUN,
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
      expect(validerSaisie(saisie({ sens, montant }))).toEqual({ ok: false, erreurs: { montant: code } })
    })

    it('accepte 100 000 € pile', () => {
      expect(validerSaisie(saisie({ sens, montant: '100000' })).ok).toBe(true)
    })
  })

  it.each(['', '-1', '11', '1,5', 'deux'])('enfants « %s » → erreur', (enfantsACharge) => {
    expect(validerSaisie(saisie({ enfantsACharge }))).toEqual({ ok: false, erreurs: { enfantsACharge: 'enfantsInvalide' } })
  })

  it('signale les deux champs en même temps', () => {
    expect(validerSaisie(saisie({ montant: '', enfantsACharge: '' }))).toEqual({
      ok: false,
      erreurs: { montant: 'montantVide', enfantsACharge: 'enfantsInvalide' },
    })
  })

  it('ignore le montant de bascule pour la validation', () => {
    expect(validerSaisie(saisie({ montantAvantBascule: 'n’importe quoi' })).ok).toBe(true)
  })

  it('ignore les revenus du conjoint pour un isolé', () => {
    const r = validerSaisie(saisie({ revenusConjoint: 'superieurs' }))
    expect(r.ok && r.sens === 'brutVersNet' && r.situation.revenusConjoint).toBeNull()
  })

  it('garde les revenus du conjoint pour un marié et désactive parent isolé', () => {
    const r = validerSaisie(saisie({ etatCivil: 'marieOuCohabitant', revenusConjoint: 'autresMax290', enfantsACharge: '2', parentIsole: true }))
    expect(r.ok && r.sens === 'brutVersNet' && r.situation).toMatchObject({ revenusConjoint: 'autresMax290', parentIsole: false })
  })

  it('normalise aussi la situation familiale en net → brut', () => {
    const r = validerSaisie(saisie({ sens: 'netVersBrut', revenusConjoint: 'superieurs', parentIsole: true, enfantsACharge: '0' }))
    expect(r.ok && r.sens === 'netVersBrut' && r.famille).toEqual(ISOLE_SANS_ENFANT)
  })

  it('désactive parent isolé sans enfant', () => {
    const r = validerSaisie(saisie({ parentIsole: true, enfantsACharge: '0' }))
    expect(r.ok && r.sens === 'brutVersNet' && r.situation.parentIsole).toBe(false)
  })

  it('garde parent isolé pour un isolé avec enfant', () => {
    const r = validerSaisie(saisie({ parentIsole: true, enfantsACharge: '1' }))
    expect(r.ok && r.sens === 'brutVersNet' && r.situation.parentIsole).toBe(true)
  })
})

describe('validerSaisie — avantages extralégaux', () => {
  const TITRES_ACTIFS = { titresRepasActif: true, joursPrestes: '20', valeurFaciale: '10,00', partTravailleur: '1,09' }

  function avecAvantages(modif: Partial<SaisieFormulaire['avantages']>): SaisieFormulaire {
    return saisie({ avantages: { ...SAISIE_PAR_DEFAUT.avantages, ...modif } })
  }

  it('convertit les titres-repas actifs en centimes', () => {
    const r = validerSaisie(avecAvantages(TITRES_ACTIFS))
    expect(r.ok && r.avantages.titresRepas).toEqual({
      actif: true,
      joursPrestes: 20,
      valeurFacialeCentimes: 1_000,
      partTravailleurCentimes: 109,
    })
  })

  it('convertit le télétravail et les écochèques actifs', () => {
    const r = validerSaisie(avecAvantages({ teletravailActif: true, ecochequesActif: true }))
    expect(r.ok && r.avantages.teletravail).toEqual({ actif: true, indemniteCentimes: 16_099 })
    expect(r.ok && r.avantages.ecocheques).toEqual({ actif: true, montantAnnuelCentimes: 25_000 })
  })

  it('ne valide pas un avantage décoché, même avec des valeurs absurdes', () => {
    const r = validerSaisie(avecAvantages({ joursPrestes: 'abc', valeurFaciale: '', teletravail: '99999', ecocheques: 'x' }))
    expect(r.ok).toBe(true)
    expect(r.ok && r.avantages).toEqual(AVANTAGES_AUCUN)
  })

  it.each(['', '  ', 'abc', '-1', '24', '1,5'])('jours prestés « %s » → erreur', (joursPrestes) => {
    expect(validerSaisie(avecAvantages({ ...TITRES_ACTIFS, joursPrestes }))).toEqual({
      ok: false,
      erreurs: { joursPrestes: 'joursInvalide' },
    })
  })

  it.each(['0', '23'])('jours prestés « %s » acceptés', (joursPrestes) => {
    expect(validerSaisie(avecAvantages({ ...TITRES_ACTIFS, joursPrestes })).ok).toBe(true)
  })

  it.each(['', 'abc', '0', '20,01'])('valeur faciale « %s » → erreur', (valeurFaciale) => {
    expect(validerSaisie(avecAvantages({ ...TITRES_ACTIFS, valeurFaciale }))).toEqual({
      ok: false,
      erreurs: { valeurFaciale: 'valeurFacialeInvalide' },
    })
  })

  it.each(['', 'abc', '20,01'])('part du travailleur « %s » → erreur de format', (partTravailleur) => {
    expect(validerSaisie(avecAvantages({ ...TITRES_ACTIFS, partTravailleur }))).toEqual({
      ok: false,
      erreurs: { partTravailleur: 'partTravailleurInvalide' },
    })
  })

  it('refuse une part du travailleur supérieure à la valeur faciale', () => {
    expect(validerSaisie(avecAvantages({ ...TITRES_ACTIFS, valeurFaciale: '5,00', partTravailleur: '5,01' }))).toEqual({
      ok: false,
      erreurs: { partTravailleur: 'partTravailleurSuperieure' },
    })
  })

  it('accepte une part du travailleur nulle ou égale à la valeur faciale', () => {
    expect(validerSaisie(avecAvantages({ ...TITRES_ACTIFS, partTravailleur: '0' })).ok).toBe(true)
    expect(validerSaisie(avecAvantages({ ...TITRES_ACTIFS, valeurFaciale: '5,00', partTravailleur: '5,00' })).ok).toBe(true)
  })

  it.each(['', 'abc', '1000,01'])('indemnité de télétravail « %s » → erreur', (teletravail) => {
    expect(validerSaisie(avecAvantages({ teletravailActif: true, teletravail }))).toEqual({
      ok: false,
      erreurs: { teletravail: 'teletravailInvalide' },
    })
  })

  it.each(['', 'abc', '2000,01'])('écochèques « %s » → erreur', (ecocheques) => {
    expect(validerSaisie(avecAvantages({ ecochequesActif: true, ecocheques }))).toEqual({
      ok: false,
      erreurs: { ecocheques: 'ecochequesInvalide' },
    })
  })

  it('accepte un dépassement de plafond officiel : c’est une alerte, pas une erreur', () => {
    const r = validerSaisie(avecAvantages({ teletravailActif: true, teletravail: '500,00' }))
    expect(r.ok && r.avantages.teletravail.indemniteCentimes).toBe(50_000)
  })

  it('signale une erreur de montant et une erreur d’avantage en même temps', () => {
    expect(validerSaisie({ ...avecAvantages({ ...TITRES_ACTIFS, joursPrestes: '99' }), montant: '' })).toEqual({
      ok: false,
      erreurs: { montant: 'montantVide', joursPrestes: 'joursInvalide' },
    })
  })
})
