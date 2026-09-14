import { describe, expect, it } from 'vitest'
import { SAISIE_PAR_DEFAUT, validerSaisie, type SaisieFormulaire } from './validation'

function saisie(modif: Partial<SaisieFormulaire>): SaisieFormulaire {
  return { ...SAISIE_PAR_DEFAUT, ...modif }
}

describe('validerSaisie', () => {
  it('accepte la saisie par défaut', () => {
    expect(validerSaisie(SAISIE_PAR_DEFAUT)).toEqual({
      ok: true,
      situation: { brutMensuelCentimes: 300_000, etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false },
    })
  })

  it.each([
    ['', 'brutVide'],
    ['   ', 'brutVide'],
    ['abc', 'brutFormat'],
    ['3000,123', 'brutFormat'],
    ['0', 'brutHorsLimites'],
    ['100000,01', 'brutHorsLimites'],
  ])('brut « %s » → erreur %s', (brut, code) => {
    expect(validerSaisie(saisie({ brut }))).toEqual({ ok: false, erreurs: { brut: code } })
  })

  it('accepte 100 000 € pile', () => {
    expect(validerSaisie(saisie({ brut: '100000' })).ok).toBe(true)
  })

  it.each(['', '-1', '11', '1,5', 'deux'])('enfants « %s » → erreur', (enfantsACharge) => {
    expect(validerSaisie(saisie({ enfantsACharge }))).toEqual({ ok: false, erreurs: { enfantsACharge: 'enfantsInvalide' } })
  })

  it('signale les deux champs en même temps', () => {
    expect(validerSaisie(saisie({ brut: '', enfantsACharge: '' }))).toEqual({
      ok: false,
      erreurs: { brut: 'brutVide', enfantsACharge: 'enfantsInvalide' },
    })
  })

  it('ignore les revenus du conjoint pour un isolé', () => {
    const r = validerSaisie(saisie({ revenusConjoint: 'superieurs' }))
    expect(r.ok && r.situation.revenusConjoint).toBeNull()
  })

  it('garde les revenus du conjoint pour un marié et désactive parent isolé', () => {
    const r = validerSaisie(saisie({ etatCivil: 'marieOuCohabitant', revenusConjoint: 'autresMax290', enfantsACharge: '2', parentIsole: true }))
    expect(r.ok && r.situation).toMatchObject({ revenusConjoint: 'autresMax290', parentIsole: false })
  })

  it('désactive parent isolé sans enfant', () => {
    const r = validerSaisie(saisie({ parentIsole: true, enfantsACharge: '0' }))
    expect(r.ok && r.situation.parentIsole).toBe(false)
  })

  it('garde parent isolé pour un isolé avec enfant', () => {
    const r = validerSaisie(saisie({ parentIsole: true, enfantsACharge: '1' }))
    expect(r.ok && r.situation.parentIsole).toBe(true)
  })
})