import { describe, expect, it } from 'vitest'
import {
  brutAnnuelDepuisMensuel,
  brutMensuelDepuisAnnuel,
  calculerVueAnnuelle,
  facteurAnnuelDixMilliemes,
  netAnnuelToutCompris,
} from './annuel'
import { getParametres } from './parametres'
import { calculerPrimesAnnuelles, PRIMES_AUCUNE, type PrimesSaisies } from './primesAnnuelles'
import { BRUT_MAX_CENTIMES } from './types'

/** Les deux primes cochées, année complète, 13e mois à 100 % : les réglages par défaut. */
const DEFAUT: PrimesSaisies = {
  treiziemeActif: true,
  treiziemePourcentageDixMilliemes: 10_000,
  treiziemeMoisPrestes: 12,
  peculeActif: true,
  peculeMoisPrestes: 12,
}
const SANS_TREIZIEME: PrimesSaisies = { ...DEFAUT, treiziemeActif: false }
const SANS_PECULE: PrimesSaisies = { ...DEFAUT, peculeActif: false }
const AUCUNE: PrimesSaisies = { ...PRIMES_AUCUNE }

describe('facteurAnnuelDixMilliemes', () => {
  it('vaut 13,92 avec le 13e mois et le double pécule', () => {
    expect(facteurAnnuelDixMilliemes(DEFAUT)).toBe(139_200)
  })

  it('suit les primes cochées', () => {
    expect(facteurAnnuelDixMilliemes(SANS_TREIZIEME)).toBe(129_200)
    expect(facteurAnnuelDixMilliemes(SANS_PECULE)).toBe(130_000)
    expect(facteurAnnuelDixMilliemes(AUCUNE)).toBe(120_000)
  })

  it('tient compte du pourcentage et des mois prestés', () => {
    expect(facteurAnnuelDixMilliemes({ ...DEFAUT, treiziemePourcentageDixMilliemes: 10_850 })).toBe(140_050)
    expect(facteurAnnuelDixMilliemes({ ...DEFAUT, treiziemeMoisPrestes: 6 })).toBe(134_200)
  })
})

describe('brutAnnuelDepuisMensuel', () => {
  it('additionne 12 mois, le 13e mois et le double pécule', () => {
    // 12 × 3 000 € + 3 000 € + 92 % de 3 000 €.
    expect(brutAnnuelDepuisMensuel(300_000, DEFAUT)).toBe(4_176_000)
  })

  it('ne compte que les primes cochées', () => {
    expect(brutAnnuelDepuisMensuel(300_000, SANS_PECULE)).toBe(3_900_000)
    expect(brutAnnuelDepuisMensuel(300_000, AUCUNE)).toBe(3_600_000)
  })

  it('applique le pourcentage du 13e mois et les mois prestés', () => {
    expect(brutAnnuelDepuisMensuel(300_000, { ...DEFAUT, treiziemePourcentageDixMilliemes: 10_850 })).toBe(4_201_500)
    expect(brutAnnuelDepuisMensuel(300_000, { ...DEFAUT, treiziemeMoisPrestes: 6 })).toBe(4_026_000)
    expect(brutAnnuelDepuisMensuel(300_000, { ...DEFAUT, peculeMoisPrestes: 7 })).toBe(4_061_000)
  })

  it('arrondit chaque prime comme le fait le panneau des primes', () => {
    // 92 % de 3 735,63 € = 3 436,7796 €, arrondi à 3 436,78 €.
    expect(brutAnnuelDepuisMensuel(373_563, DEFAUT)).toBe(5_199_997)
    expect(brutAnnuelDepuisMensuel(373_564, DEFAUT)).toBe(5_200_011)
  })

  it('tombe pile sur la somme des bruts du panneau des primes', () => {
    const primes = calculerPrimesAnnuelles(373_563, 373_563 * 12, DEFAUT, { enfantsACharge: 0 }, getParametres('2026-09-15'))
    const sommePrimes = (primes.treizieme?.brutCentimes ?? 0) + (primes.pecule?.brutCentimes ?? 0)
    expect(brutAnnuelDepuisMensuel(373_563, DEFAUT)).toBe(373_563 * 12 + sommePrimes)
  })
})

describe('brutMensuelDepuisAnnuel', () => {
  it('retrouve le mensuel exact quand l’annuel en provient', () => {
    expect(brutMensuelDepuisAnnuel(4_176_000, DEFAUT)).toBe(300_000)
    expect(brutMensuelDepuisAnnuel(3_600_000, AUCUNE)).toBe(300_000)
  })

  it('retient le mensuel dont l’annuel est le plus proche', () => {
    // 52 000 € : 3 735,63 € donne 51 999,97 € (3 centimes), 3 735,64 € donne 52 000,11 € (11 centimes).
    expect(brutMensuelDepuisAnnuel(5_200_000, DEFAUT)).toBe(373_563)
    // Sans 13e mois : 4 024,77 € donne 52 000,03 €, 4 024,76 € donne 51 999,90 €.
    expect(brutMensuelDepuisAnnuel(5_200_000, SANS_TREIZIEME)).toBe(402_477)
  })

  it('retient le plus petit à égale distance', () => {
    // 3 000,00 € donne 41 760,00 € et 3 000,01 € donne 41 760,14 € : 41 760,07 € est à mi-chemin.
    expect(brutMensuelDepuisAnnuel(4_176_007, DEFAUT)).toBe(300_000)
  })

  it('refait l’aller-retour au centime sur toute une plage de salaires', () => {
    for (const primes of [DEFAUT, SANS_TREIZIEME, { ...DEFAUT, treiziemePourcentageDixMilliemes: 10_850, peculeMoisPrestes: 7 }]) {
      for (let mensuel = 1_000; mensuel < 1_000_000; mensuel += 997) {
        expect(brutMensuelDepuisAnnuel(brutAnnuelDepuisMensuel(mensuel, primes), primes)).toBe(mensuel)
      }
    }
  })

  it('renvoie 0 pour un annuel nul', () => {
    expect(brutMensuelDepuisAnnuel(0, DEFAUT)).toBe(0)
  })

  it('reste au-dessus du maximum, sans plantage, pour un annuel démesuré', () => {
    expect(brutMensuelDepuisAnnuel(9_000_000_000_000_000, DEFAUT)).toBeGreaterThan(BRUT_MAX_CENTIMES)
  })

  it('refuse un annuel négatif ou non entier', () => {
    expect(() => brutMensuelDepuisAnnuel(-1, DEFAUT)).toThrow(RangeError)
    expect(() => brutMensuelDepuisAnnuel(100.5, DEFAUT)).toThrow(RangeError)
  })
})

describe('netAnnuelToutCompris et calculerVueAnnuelle', () => {
  const parametres = getParametres('2026-09-15')
  const primes = calculerPrimesAnnuelles(300_000, 3_600_000, DEFAUT, { enfantsACharge: 0 }, parametres)

  it('additionne 12 nets versés et les nets des primes', () => {
    const nets = (primes.treizieme?.netCentimes ?? 0) + (primes.pecule?.netCentimes ?? 0)
    expect(netAnnuelToutCompris(226_133, primes)).toBe(226_133 * 12 + nets)
  })

  it('ne compte que 12 mois sans prime', () => {
    expect(netAnnuelToutCompris(226_133, { treizieme: null, pecule: null })).toBe(226_133 * 12)
  })

  it('réunit la vue annuelle', () => {
    const vue = calculerVueAnnuelle(300_000, 226_133, DEFAUT, primes)
    expect(vue.brutAnnuelCentimes).toBe(4_176_000)
    expect(vue.facteurDixMilliemes).toBe(139_200)
    expect(vue.netAnnuelToutComprisCentimes).toBe(netAnnuelToutCompris(226_133, primes))
    expect(vue.treizieme).toBe(true)
    expect(vue.pecule).toBe(true)
  })
})
