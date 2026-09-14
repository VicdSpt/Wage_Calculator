import { describe, expect, it } from 'vitest'
import { calculerBonusEmploiSocial, montantVolet } from './bonusEmploiSocial'
import { P2026_07 } from './parametres/p2026-07'
import { P2026_09 } from './parametres/p2026-09'

const voletA = P2026_09.bonusEmploi.voletA
const voletB = P2026_09.bonusEmploi.voletB

describe('montantVolet — volet A (septembre 2026)', () => {
  it('donne le maximum jusqu’au plancher inclus', () => {
    expect(montantVolet(293_793, voletA)).toBe(12_754)
  })

  it('diminue au-dessus du plancher', () => {
    // 127,54 − 0,2739 × 0,01 = 127,537261 → 127,54
    expect(montantVolet(293_794, voletA)).toBe(12_754)
    // 127,54 − 0,2739 × 62,07 = 110,539027 → 110,54
    expect(montantVolet(300_000, voletA)).toBe(11_054)
  })

  it('arrondit R et non la partie soustraite (cas de la moitié exacte)', () => {
    // 127,54 − 0,2739 × 50,00 = 113,845 → 113,85 (arrondir la soustraction donnerait 113,84)
    expect(montantVolet(298_793, voletA)).toBe(11_385)
  })

  it('ne devient jamais négatif au plafond', () => {
    // 127,54 − 0,2739 × 465,69 = −0,013… → 0
    expect(montantVolet(340_362, voletA)).toBe(0)
  })

  it('vaut 0 au-dessus du plafond', () => {
    expect(montantVolet(340_363, voletA)).toBe(0)
  })

  it('utilise le plafond de juillet-août pendant cette période', () => {
    expect(montantVolet(335_000, P2026_07.bonusEmploi.voletA)).toBe(0)
    expect(montantVolet(335_000, voletA)).toBe(1_467)
  })
})

describe('montantVolet — volet B', () => {
  it('donne le maximum jusqu’au plancher inclus', () => {
    expect(montantVolet(230_062, voletB)).toBe(17_199)
  })

  it('diminue entre plancher et plafond', () => {
    // 171,99 − 0,2699 × 300,00 = 91,02
    expect(montantVolet(260_062, voletB)).toBe(9_102)
  })

  it('vaut 0 au-dessus du plafond', () => {
    expect(montantVolet(293_794, voletB)).toBe(0)
  })
})

describe('calculerBonusEmploiSocial', () => {
  it('additionne les volets quand l’ONSS suffit', () => {
    expect(calculerBonusEmploiSocial(300_000, 39_210, P2026_09)).toEqual({ voletA: 11_054, voletB: 0, total: 11_054 })
  })

  it('écrête d’abord le volet B', () => {
    // RMMMG : ONSS 291,93 < 127,54 + 171,99
    expect(calculerBonusEmploiSocial(223_361, 29_193, P2026_09)).toEqual({ voletA: 12_754, voletB: 16_439, total: 29_193 })
  })

  it('écrête ensuite le volet A si l’ONSS est inférieur au volet A', () => {
    expect(calculerBonusEmploiSocial(100_000, 10_000, P2026_09)).toEqual({ voletA: 10_000, voletB: 0, total: 10_000 })
  })
})