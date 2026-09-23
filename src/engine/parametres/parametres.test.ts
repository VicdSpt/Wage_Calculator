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

describe('barème des allocations exceptionnelles', () => {
  it.each([['2026-07-01'], ['2026-09-14']])('le %s : onze tranches, de 0 %% à 53,50 / 57,53 %%', (date) => {
    const a = getParametres(date).allocationsExceptionnelles
    expect(a.tranches).toHaveLength(11)
    expect(a.tranches[0]).toEqual({ jusquaAnnuelCentimes: 1_067_500, peculeDixMilliemes: 0, autreDixMilliemes: 0 })
    expect(a.tranches[6]).toEqual({ jusquaAnnuelCentimes: 3_183_000, peculeDixMilliemes: 3634, autreDixMilliemes: 4038 })
    // Dernière tranche : même taux dans les deux colonnes (annexe III n° 53).
    expect(a.tranches[10]).toEqual({ jusquaAnnuelCentimes: null, peculeDixMilliemes: 5350, autreDixMilliemes: 5350 })
  })

  it('les tranches sont triées et la dernière est sans borne', () => {
    for (const periode of PERIODES) {
      const t = periode.allocationsExceptionnelles.tranches
      expect(t[t.length - 1].jusquaAnnuelCentimes).toBeNull()
      for (let i = 1; i < t.length - 1; i++) {
        expect(t[i].jusquaAnnuelCentimes!).toBeGreaterThan(t[i - 1].jusquaAnnuelCentimes!)
      }
    }
  })

  it('les plafonds d’exonération couvrent 1 à 12 enfants et croissent', () => {
    for (const periode of PERIODES) {
      const plafonds = periode.allocationsExceptionnelles.exonerationEnfantsPlafondsCentimes
      expect(plafonds).toHaveLength(13)
      expect(plafonds[0]).toBe(0)
      for (let i = 2; i < plafonds.length; i++) {
        expect(plafonds[i]).toBeGreaterThan(plafonds[i - 1])
      }
    }
  })

  it('les réductions couvrent 1 à 5 enfants, croissent et restent des pourcentages', () => {
    for (const periode of PERIODES) {
      const reductions = periode.allocationsExceptionnelles.reductionsEnfants
      expect(reductions).toHaveLength(6)
      expect(reductions[0]).toEqual({ plafondAnnuelCentimes: 0, reductionDixMilliemes: 0 })
      for (let i = 2; i < reductions.length; i++) {
        expect(reductions[i].reductionDixMilliemes).toBeGreaterThan(reductions[i - 1].reductionDixMilliemes)
        expect(reductions[i].reductionDixMilliemes).toBeLessThanOrEqual(10_000)
        expect(reductions[i].plafondAnnuelCentimes).toBeGreaterThan(0)
      }
    }
  })

  it('la part du double pécule soumise à retenue est un pourcentage', () => {
    for (const periode of PERIODES) {
      const part = periode.allocationsExceptionnelles.partPeculeSoumiseRetenueDixMilliemes
      expect(part).toBeGreaterThan(0)
      expect(part).toBeLessThanOrEqual(10_000)
    }
  })
})

describe('paramètres de la voiture de société', () => {
  it.each([
    ['2025-09-14', 71, 59, 165_000],
    ['2026-07-01', 70, 58, 169_000],
    ['2026-09-14', 70, 58, 169_000],
  ])('le %s : références %i g (essence) et %i g (diesel), minimum %i centimes', (date, essence, diesel, minimum) => {
    expect(getParametres(date).voiture).toEqual({
      emissionReferenceEssenceGrammesKm: essence,
      emissionReferenceDieselGrammesKm: diesel,
      atnMinimumAnnuelCentimes: minimum,
    })
  })
})