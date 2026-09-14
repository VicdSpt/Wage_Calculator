import { describe, expect, it } from 'vitest'
import { calculerCotisationSpeciale, categorieCotisation } from './cotisationSpeciale'
import { P2026_09 } from './parametres/p2026-09'
import type { RevenusConjoint, Situation } from './types'

const ISOLE: Situation = { brutMensuelCentimes: 0, etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false }

function marie(revenusConjoint: RevenusConjoint): Situation {
  return { ...ISOLE, etatCivil: 'marieOuCohabitant', revenusConjoint }
}

describe('categorieCotisation', () => {
  it('isolé → imposition individuelle', () => {
    expect(categorieCotisation(ISOLE)).toBe('individuelle')
  })

  it.each(['aucun', 'pensionMax174', 'pensionMax579', 'autresMax290'] as const)(
    'conjoint %s → commune, conjoint sans revenus',
    (revenus) => {
      expect(categorieCotisation(marie(revenus))).toBe('communeConjointSansRevenus')
    },
  )

  it('conjoint superieurs → commune, conjoint avec revenus', () => {
    expect(categorieCotisation(marie('superieurs'))).toBe('communeConjointAvecRevenus')
  })
})

describe('cotisation spéciale — imposition individuelle', () => {
  it.each([
    [194_538, 0],
    [194_539, 0], // 4,22 % × 0,01 → 0
    [219_018, 1_033], // 4,22 % × 244,80 = 10,33
    [219_019, 1_033],
    [300_000, 1_924], // 10,33 + 1,10 % × 809,82
    [373_700, 2_735], // 10,33 + 17,02
    [373_800, 2_738], // 27,35 + 3,38 % × 1,00
    [410_000, 3_962], // 27,35 + 12,27
    [410_001, 3_961], // 39,61 : saut d'un centime entre tranches, conforme au barème
    [603_882, 6_094],
    [603_883, 6_094],
    [1_000_000, 6_094],
  ])('brut %i → %i centimes', (brut, attendu) => {
    expect(calculerCotisationSpeciale(brut, ISOLE, P2026_09)).toBe(attendu)
  })
})

describe('cotisation spéciale — commune, conjoint avec revenus', () => {
  const s = marie('superieurs')
  it.each([
    [109_509, 0],
    [109_510, 515],
    [194_537, 515],
    [194_538, 515], // minimum de la tranche à 5,90 %
    [219_018, 1_444], // 5,90 % × 244,80
    [300_000, 2_335], // 14,44 + 8,91
    [1_000_000, 5_164], // maximum
  ])('brut %i → %i centimes', (brut, attendu) => {
    expect(calculerCotisationSpeciale(brut, s, P2026_09)).toBe(attendu)
  })
})

describe('cotisation spéciale — commune, conjoint sans revenus', () => {
  const s = marie('aucun')
  it.each([
    [194_538, 0],
    [200_000, 322], // 5,90 % × 54,62
    [219_018, 1_444],
    [450_000, 3_985], // 14,44 + 25,41
    [1_000_000, 6_094], // maximum
  ])('brut %i → %i centimes', (brut, attendu) => {
    expect(calculerCotisationSpeciale(brut, s, P2026_09)).toBe(attendu)
  })
})