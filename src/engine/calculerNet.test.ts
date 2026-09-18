import { describe, expect, it } from 'vitest'
import { calculerNet } from './calculerNet'
import { PeriodeNonCouverte, type Situation } from './types'

const ISOLE_3000: Situation = { brutMensuelCentimes: 300_000, etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false, atnMensuelCentimes: 0 }

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

describe('calculerNet — avantage de toute nature', () => {
  const ISOLE_3000_ATN: Situation = { ...ISOLE_3000, atnMensuelCentimes: 20_000 }

  it('un ATN nul ne change rien', () => {
    expect(calculerNet({ ...ISOLE_3000, atnMensuelCentimes: 0 }, '2026-09-14')).toEqual(calculerNet(ISOLE_3000, '2026-09-14'))
  })

  it('ajoute l\'ATN à la base du précompte', () => {
    const sans = calculerNet(ISOLE_3000, '2026-09-14')
    const avec = calculerNet(ISOLE_3000_ATN, '2026-09-14')
    expect(avec.intermediaires.imposableMensuel).toBe(sans.intermediaires.imposableMensuel)
    expect(avec.intermediaires.imposablePrecompte).toBe(sans.intermediaires.imposableMensuel + 20_000)
    expect(avec.intermediaires.precompteAvantBonus).toBeGreaterThan(sans.intermediaires.precompteAvantBonus)
  })

  it('ne coûte au net que l\'impôt qu\'il fait naître (l\'ATN n\'est pas retiré du net)', () => {
    const sans = calculerNet(ISOLE_3000, '2026-09-14')
    const avec = calculerNet(ISOLE_3000_ATN, '2026-09-14')
    const impotSupplementaire = avec.intermediaires.precompte - sans.intermediaires.precompte
    expect(avec.netMensuelCentimes).toBe(sans.netMensuelCentimes - impotSupplementaire)
    expect(avec.intermediaires.atn).toBe(20_000)
  })

  it('ajoute les deux lignes d\'ATN au détail, et leur somme signée redonne le net', () => {
    const r = calculerNet(ISOLE_3000_ATN, '2026-09-14')
    expect(r.lignes.map((l) => l.id)).toEqual([
      'brut', 'onss', 'bonusVoletA', 'bonusVoletB', 'imposableMensuel', 'atn',
      'precompteAvantBonus', 'bonusFiscal', 'cotisationSpeciale', 'atnRetenu', 'net',
    ])
    let somme = 0
    for (const ligne of r.lignes) {
      if (ligne.id === 'brut') somme = ligne.montantCentimes
      else if (ligne.sens === '+') somme += ligne.montantCentimes
      else if (ligne.sens === '-') somme -= ligne.montantCentimes
    }
    expect(somme).toBe(r.netMensuelCentimes)
  })

  it('n\'ajoute aucune ligne d\'ATN quand il est nul', () => {
    const r = calculerNet(ISOLE_3000, '2026-09-14')
    expect(r.lignes.some((l) => l.id === 'atn' || l.id === 'atnRetenu')).toBe(false)
  })

  it('ne touche ni à l\'ONSS, ni au bonus, ni à la cotisation spéciale', () => {
    const sans = calculerNet(ISOLE_3000, '2026-09-14').intermediaires
    const avec = calculerNet(ISOLE_3000_ATN, '2026-09-14').intermediaires
    expect(avec.onss).toBe(sans.onss)
    expect(avec.bonusSocial).toBe(sans.bonusSocial)
    expect(avec.cotisationSpeciale).toBe(sans.cotisationSpeciale)
  })
})