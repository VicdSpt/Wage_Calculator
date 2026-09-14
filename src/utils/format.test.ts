import { describe, expect, it } from 'vitest'
import { dateIsoLocale, formatDateFr, formatEuro, formatPourcentage } from './format'

/** Intl utilise des espaces insécables : on les normalise pour comparer. */
const normaliser = (texte: string) => texte.replace(/\s/g, ' ')

describe('format', () => {
  it('formate les centimes en euros belges', () => {
    expect(normaliser(formatEuro(226_133))).toBe('2 261,33 €')
    expect(normaliser(formatEuro(0))).toBe('0,00 €')
  })

  it('formate un ratio en pourcentage à une décimale', () => {
    expect(normaliser(formatPourcentage(0.75378))).toBe('75,4 %')
  })

  it('produit une date ISO locale', () => {
    expect(dateIsoLocale(new Date(2026, 8, 4))).toBe('2026-09-04')
  })

  it('affiche une date ISO au format belge', () => {
    expect(formatDateFr('2026-09-14')).toBe('14/09/2026')
  })
})