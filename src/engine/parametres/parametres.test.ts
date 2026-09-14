import { describe, expect, it } from 'vitest'
import { PeriodeNonCouverte } from '../types'
import { getParametres, PERIODES } from './index'

describe('getParametres', () => {
  it.each([
    ['2026-07-01', 'P2026-07'],
    ['2026-08-31', 'P2026-07'],
    ['2026-09-01', 'P2026-09'],
    ['2026-12-31', 'P2026-09'],
  ])('le %s utilise %s', (date, id) => {
    expect(getParametres(date).id).toBe(id)
  })

  it.each(['2026-06-30', '2027-01-01'])('lève PeriodeNonCouverte pour le %s', (date) => {
    expect(() => getParametres(date)).toThrow(PeriodeNonCouverte)
  })

  it('refuse une date mal formée', () => {
    expect(() => getParametres('14/09/2026')).toThrow(RangeError)
  })

  it('a des périodes contiguës, sans chevauchement', () => {
    for (let i = 1; i < PERIODES.length; i++) {
      const finPrecedente = new Date(`${PERIODES[i - 1].valideAu}T00:00:00Z`)
      const debut = new Date(`${PERIODES[i].valideDu}T00:00:00Z`)
      expect(debut.getTime() - finPrecedente.getTime()).toBe(24 * 60 * 60 * 1000)
    }
  })

  it('termine chaque barème de cotisation spéciale par une tranche ouverte', () => {
    for (const periode of PERIODES) {
      for (const tranches of Object.values(periode.cotisationSpeciale)) {
        expect(tranches.at(-1)?.jusquaCentimes).toBeNull()
      }
    }
  })
})