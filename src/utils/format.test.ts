import { eurosTexteEnCentimes } from '../engine/argent'
import { centimesEnSaisie, dateIsoLocale, formatDateFr, formatEuro, formatPourcentage } from './format'
import { describe, expect, it } from 'vitest'

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

  it.each([
    [226_133, '2261,33'],
    [300_000, '3000'],
    [5, '0,05'],
    [50, '0,50'],
    [1_234_510, '12345,10'],
    [10_000_000, '100000'],
  ])('écrit %i centimes comme une saisie : « %s »', (centimes, texte) => {
    expect(centimesEnSaisie(centimes)).toBe(texte)
  })

  it('produit un texte que le formulaire relit à l\'identique', () => {
    for (const centimes of [1, 99, 100, 101, 226_133, 299_996, 10_000_000]) {
      expect(eurosTexteEnCentimes(centimesEnSaisie(centimes))).toBe(centimes)
    }
  })
})