import { describe, expect, it } from 'vitest'
import { calculerNet } from './calculerNet'
import { PeriodeNonCouverte, type Situation } from './types'

const ISOLE_3000: Situation = { brutMensuelCentimes: 300_000, etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false }

describe('calculerNet', () => {
  it('donne le net de l’exemple de la spec', () => {
    const r = calculerNet(ISOLE_3000, '2026-09-14')
    expect(r.netMensuelCentimes).toBe(226_133)
    expect(r.netAnnuelCentimes).toBe(226_133 * 12)
    expect(r.tauxRetour).toBeCloseTo(0.7538, 4)
    expect(r.periode).toEqual({ id: 'P2026-09', valideDu: '2026-09-01', valideAu: '2026-12-31' })
  })

  it('produit les lignes dans l’ordre des étapes, et leur somme signée redonne le net', () => {
    const r = calculerNet(ISOLE_3000, '2026-09-14')
    expect(r.lignes.map((l) => l.id)).toEqual([
      'brut', 'onss', 'bonusVoletA', 'bonusVoletB', 'imposableMensuel', 'precompteAvantBonus', 'bonusFiscal', 'cotisationSpeciale', 'net',
    ])
    let somme = 0
    for (const ligne of r.lignes) {
      if (ligne.id === 'brut') somme = ligne.montantCentimes
      else if (ligne.sens === '+') somme += ligne.montantCentimes
      else if (ligne.sens === '-') somme -= ligne.montantCentimes
    }
    expect(somme).toBe(r.netMensuelCentimes)
  })

  it('cite une source pour chaque ligne', () => {
    for (const ligne of calculerNet(ISOLE_3000, '2026-09-14').lignes) {
      expect(ligne.source.length).toBeGreaterThan(0)
    }
  })

  it('lève PeriodeNonCouverte hors des périodes intégrées', () => {
    expect(() => calculerNet(ISOLE_3000, '2027-01-15')).toThrow(PeriodeNonCouverte)
  })
})