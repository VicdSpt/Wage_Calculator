import { describe, expect, it } from 'vitest'
import { SAISIE_PAR_DEFAUT, validerSaisie, type SaisieFormulaire } from './validation'

function saisie(modif: Partial<SaisieFormulaire>): SaisieFormulaire {
  return { ...SAISIE_PAR_DEFAUT, ...modif }
}

const ISOLE_SANS_ENFANT = { etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false }

describe('validerSaisie', () => {
  it('a une saisie par défaut en brut → net, sans montant de bascule', () => {
    expect(SAISIE_PAR_DEFAUT).toMatchObject({ sens: 'brutVersNet', montant: '3000', montantAvantBascule: null })
  })

  it('accepte la saisie par défaut (brut → net)', () => {
    expect(validerSaisie(SAISIE_PAR_DEFAUT)).toEqual({
      ok: true,
      sens: 'brutVersNet',
      situation: { brutMensuelCentimes: 300_000, ...ISOLE_SANS_ENFANT },
    })
  })

  it('en net → brut, renvoie la situation familiale et le net cible', () => {
    expect(validerSaisie(saisie({ sens: 'netVersBrut', montant: '2261,33' }))).toEqual({
      ok: true,
      sens: 'netVersBrut',
      famille: ISOLE_SANS_ENFANT,
      netCibleCentimes: 226_133,
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
