import { describe, expect, it } from 'vitest'
import { appliquerTaux, diviserArrondi, eurosTexteEnCentimes } from './argent'

describe('diviserArrondi', () => {
  it('arrondit une moitié exacte vers le haut', () => {
    expect(diviserArrondi(5, 10)).toBe(1)
    expect(diviserArrondi(15, 10)).toBe(2)
  })

  it('arrondit sous la moitié vers le bas et au-dessus vers le haut', () => {
    expect(diviserArrondi(4, 10)).toBe(0)
    expect(diviserArrondi(6, 10)).toBe(1)
  })

  it('éloigne de zéro une moitié négative', () => {
    expect(diviserArrondi(-5, 10)).toBe(-1)
    expect(diviserArrondi(-4, 10)).toBe(0)
  })

  it('reste exact sur de grands montants', () => {
    // 1 200 000 000 × 5 350 + 5 000 = 6 420 000 005 000 → ÷ 10 000 = 642 000 000,5 → 642 000 001
    expect(diviserArrondi(1_200_000_000 * 5350 + 5000, 10_000)).toBe(642_000_001)
  })

  it('refuse les non-entiers et un diviseur nul ou négatif', () => {
    expect(() => diviserArrondi(1.5, 10)).toThrow(RangeError)
    expect(() => diviserArrondi(10, 0)).toThrow(RangeError)
    expect(() => diviserArrondi(10, -2)).toThrow(RangeError)
  })
})

describe('appliquerTaux', () => {
  it('calcule 13,07 % de 3 000,00 €', () => {
    expect(appliquerTaux(300_000, 1307)).toBe(39_210)
  })

  it('arrondit 0,5 centime vers le haut', () => {
    // 1 centime × 50 % = 0,5 centime → 1 centime
    expect(appliquerTaux(1, 5000)).toBe(1)
    // 3 centimes × 16,67 % = 0,5001 → 1 centime ; 2 centimes × 12,5 % = 0,25 → 0
    expect(appliquerTaux(3, 1667)).toBe(1)
    expect(appliquerTaux(2, 1250)).toBe(0)
  })
})

describe('eurosTexteEnCentimes', () => {
  it.each([
    ['3000', 300_000],
    ['3000,5', 300_050],
    ['3000.50', 300_050],
    ['3 000,50', 300_050],
    ['3\u202f000,50', 300_050],
    ['0,01', 1],
  ])('convertit « %s » en %i centimes', (texte, attendu) => {
    expect(eurosTexteEnCentimes(texte)).toBe(attendu)
  })

  it.each(['', 'abc', '3000,501', '-5', '3,000.50', '1e3'])('refuse « %s »', (texte) => {
    expect(eurosTexteEnCentimes(texte)).toBeNull()
  })
})