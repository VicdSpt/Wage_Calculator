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

  it('a des périodes triées et sans chevauchement (des trous sont permis)', () => {
    for (let i = 1; i < PERIODES.length; i++) {
      expect(PERIODES[i].valideDu > PERIODES[i - 1].valideAu).toBe(true)
    }
  })

  it('chaque période commence avant sa propre fin', () => {
    for (const periode of PERIODES) {
      expect(periode.valideDu < periode.valideAu).toBe(true)
    }
  })

  it.each([
    ['2025-02-01', 'P2025'],
    ['2025-07-25', 'P2025'],
    ['2025-09-26', 'P2025'],
    ['2025-12-31', 'P2025'],
  ])('le %s utilise %s', (date, id) => {
    expect(getParametres(date).id).toBe(id)
  })

  it.each(['2025-01-31', '2026-03-15'])('lève PeriodeNonCouverte pour le %s (hors périodes intégrées)', (date) => {
    expect(() => getParametres(date)).toThrow(PeriodeNonCouverte)
  })

  it('termine chaque barème de cotisation spéciale par une tranche ouverte', () => {
    for (const periode of PERIODES) {
      for (const tranches of Object.values(periode.cotisationSpeciale)) {
        expect(tranches.at(-1)?.jusquaCentimes).toBeNull()
      }
    }
  })
})

describe('plafonds des avantages extralégaux', () => {
  it.each([
    ['2026-08-31', 16_099],
    ['2026-09-01', 16_421],
    ['2026-12-31', 16_421],
  ])('le %s, le plafond mensuel de télétravail vaut %i centimes', (date, plafond) => {
    expect(getParametres(date).avantages.teletravailMaxCentimes).toBe(plafond)
  })

  it.each(PERIODES.map((p) => [p.id, p] as const))('%s : plafonds ONSS des titres-repas et des écochèques', (_id, periode) => {
    expect(periode.avantages).toMatchObject({
      titresRepasPartPatronaleMaxCentimes: 891,
      titresRepasPartTravailleurMinCentimes: 109,
      titresRepasValeurFacialeMaxCentimes: 1_000,
      ecochequesMaxAnnuelCentimes: 25_000,
    })
  })
})

describe('paramètres 2025', () => {
  const P2025 = getParametres('2025-07-25')

  it('reprend les volets du bonus à l’emploi ONSS 2025/3 (employés, à partir du 01/02/2025)', () => {
    expect(P2025.bonusEmploi.voletA).toEqual({
      maxCentimes: 12_059,
      plancherCentimes: 277_783,
      plafondCentimes: 327_148,
      coefDixMilliemes: 2443,
    })
    expect(P2025.bonusEmploi.voletB).toEqual({
      maxCentimes: 16_262,
      plancherCentimes: 217_525,
      plafondCentimes: 277_783,
      coefDixMilliemes: 2699,
    })
  })

  it('garde le taux ONSS personnel et la part minimale des titres-repas', () => {
    expect(P2025.onssTauxPersonnelDixMilliemes).toBe(1307)
    expect(P2025.avantages.titresRepasPartTravailleurMinCentimes).toBe(109)
  })
})