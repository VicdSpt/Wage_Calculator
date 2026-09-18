import { describe, expect, it } from 'vitest'
import { P2026_09 } from './parametres/p2026-09'
import { calculerPrecompte, impotBareme, reductionEnfants } from './precompte'
import type { Situation } from './types'

const p = P2026_09.precompte
const SANS_BONUS = { voletA: 0, voletB: 0, total: 0 }

function situation(modif: Partial<Situation> = {}): Situation {
  return { brutMensuelCentimes: 0, atnMensuelCentimes: 0, etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false, ...modif }
}

describe('impotBareme', () => {
  it.each([
    [0, 0],
    [1, 0], // 26,75 % de 0,01 € = 0,002675 → 0
    [1_117_000, 298_798], // quotité exemptée 11 170 € → 2 987,975 → 2 987,98
    [1_671_000, 446_993], // fin de la 1re tranche → 4 469,925 → 4 469,93
    [1_671_001, 446_993], // 4 469,93 + 42,80 % × 0,01 = 0,00428 → 0
    [2_950_000, 994_405], // fin de la 2e tranche
    [2_950_001, 994_405],
    [5_105_000, 2_032_038],
    [5_105_100, 2_032_092], // 20 320,38 + 53,50 % × 1,00 = 0,535 → 0,54
  ])('impôt sur %i centimes = %i centimes', (revenu, attendu) => {
    expect(impotBareme(revenu, p.bareme)).toBe(attendu)
  })
})

describe('reductionEnfants', () => {
  it.each([
    [0, 0],
    [1, 62_400],
    [2, 165_600],
    [3, 440_400],
    [8, 2_199_600],
    [9, 2_586_000],
    [10, 2_972_400],
  ])('%i enfant(s) → %i centimes', (enfants, attendu) => {
    expect(reductionEnfants(enfants, p)).toBe(attendu)
  })
})

describe('calculerPrecompte', () => {
  it('reproduit l’exemple de la spec (isolé, brut 3 000 €)', () => {
    const detail = calculerPrecompte(271_844, { voletA: 11_054, voletB: 0, total: 11_054 }, situation(), P2026_09)
    expect(detail).toEqual({
      annuelBrut: 3_262_128,
      fraisForfaitaires: 607_000,
      netImposable: 2_655_128,
      revenuImpute: 0,
      impotBase: 569_402,
      reductionsAccordees: 0,
      impotAnnuel: 569_402,
      precompteAvantBonus: 47_450,
      bonusFiscal: 3_663,
      precompte: 43_787,
    })
  })

  it('applique 30 % de frais forfaitaires sous le plafond', () => {
    // 1 500 € × 12 = 18 000 € → frais 5 400 €
    expect(calculerPrecompte(150_000, SANS_BONUS, situation(), P2026_09).fraisForfaitaires).toBe(540_000)
  })

  it('utilise le quotient conjugal et le plafonne à 13 790 €', () => {
    const detail = calculerPrecompte(600_000, SANS_BONUS, situation({ etatCivil: 'marieOuCohabitant', revenusConjoint: 'aucun' }), P2026_09)
    expect(detail.netImposable).toBe(6_593_000)
    expect(detail.revenuImpute).toBe(1_379_000)
  })

  it('traite une pension du conjoint ≤ 174 € comme une absence de revenus', () => {
    const sansRevenus = calculerPrecompte(300_000, SANS_BONUS, situation({ etatCivil: 'marieOuCohabitant', revenusConjoint: 'aucun' }), P2026_09)
    const petitePension = calculerPrecompte(300_000, SANS_BONUS, situation({ etatCivil: 'marieOuCohabitant', revenusConjoint: 'pensionMax174' }), P2026_09)
    expect(petitePension).toEqual(sansRevenus)
  })

  it.each([
    ['autresMax290', 174_000],
    ['pensionMax579', 347_400],
  ] as const)('ajoute la réduction pour un conjoint %s', (revenusConjoint, reduction) => {
    const detail = calculerPrecompte(400_000, SANS_BONUS, situation({ etatCivil: 'marieOuCohabitant', revenusConjoint }), P2026_09)
    expect(detail.revenuImpute).toBe(0)
    expect(detail.reductionsAccordees).toBe(reduction)
  })

  it('cumule enfants et parent isolé', () => {
    const detail = calculerPrecompte(400_000, SANS_BONUS, situation({ enfantsACharge: 1, parentIsole: true }), P2026_09)
    expect(detail.reductionsAccordees).toBe(62_400 + 62_400)
  })

  it('limite les réductions à l’impôt de base', () => {
    const detail = calculerPrecompte(150_000, SANS_BONUS, situation({ enfantsACharge: 3 }), P2026_09)
    expect(detail.reductionsAccordees).toBe(detail.impotBase)
    expect(detail.impotAnnuel).toBe(0)
  })

  it('ne rend jamais le précompte négatif et affiche le bonus fiscal réellement utilisé', () => {
    const detail = calculerPrecompte(150_000, { voletA: 12_754, voletB: 17_199, total: 29_953 }, situation({ enfantsACharge: 1 }), P2026_09)
    expect(detail.precompte).toBe(0)
    expect(detail.bonusFiscal).toBe(detail.precompteAvantBonus)
  })
})