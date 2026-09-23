import { describe, expect, it } from 'vitest'
import type { SituationFamiliale } from './calculerBrut'
import { getParametres } from './parametres'
import type { Parametres } from './parametres/types'
import { calculerPrimesAnnuelles, PRIMES_AUCUNE, TAUX_DOUBLE_PECULE_DIX_MILLIEMES, type PrimesSaisies } from './primesAnnuelles'

const SEPT = '2026-09-14'
const P = getParametres(SEPT)
/** Base annuelle d'un brut mensuel de 3 000,00 € : brut × 12, sans déduction. */
const BASE = 3_600_000

const ISOLE: SituationFamiliale = { etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false, atnMensuelCentimes: 0 }

const TOUT: PrimesSaisies = {
  treiziemeActif: true,
  treiziemePourcentageDixMilliemes: 10_000,
  treiziemeMoisPrestes: 12,
  peculeActif: true,
  peculeMoisPrestes: 12,
}

/** La part du pécule soumise à retenue est relevée en tâche 1 : ici on la fixe, pour tester l'arithmétique. */
function avecPartPecule(partDixMilliemes: number): Parametres {
  return {
    ...P,
    allocationsExceptionnelles: { ...P.allocationsExceptionnelles, partPeculeSoumiseRetenueDixMilliemes: partDixMilliemes },
  }
}

describe('calculerPrimesAnnuelles', () => {
  it('sans prime active, ne calcule rien', () => {
    expect(calculerPrimesAnnuelles(300_000, BASE, PRIMES_AUCUNE, ISOLE, P)).toEqual({ treizieme: null, pecule: null })
  })

  it('13e mois : un mois de brut, ONSS ordinaire de 13,07 %', () => {
    const r = calculerPrimesAnnuelles(300_000, BASE, { ...TOUT, peculeActif: false }, ISOLE, P)
    expect(r.pecule).toBeNull()
    expect(r.treizieme).toMatchObject({
      type: 'autre',
      brutCentimes: 300_000,
      retenueSocialeCentimes: 39_210,
      precompteCentimes: 121_111,
      netCentimes: 139_679,
    })
  })

  it('13e mois à 150 %', () => {
    const primes = { ...TOUT, peculeActif: false, treiziemePourcentageDixMilliemes: 15_000 }
    expect(calculerPrimesAnnuelles(300_000, BASE, primes, ISOLE, P).treizieme).toMatchObject({
      brutCentimes: 450_000,
      retenueSocialeCentimes: 58_815,
      precompteCentimes: 181_666,
      netCentimes: 209_519,
    })
  })

  it('13e mois proratisé à 6 mois prestés', () => {
    const primes = { ...TOUT, peculeActif: false, treiziemeMoisPrestes: 6 }
    expect(calculerPrimesAnnuelles(300_000, BASE, primes, ISOLE, P).treizieme).toMatchObject({
      brutCentimes: 150_000,
      retenueSocialeCentimes: 19_605,
      precompteCentimes: 60_555,
      netCentimes: 69_840,
    })
  })

  it('13e mois à 0 mois presté : aucun montant, mais la prime reste calculée', () => {
    const primes = { ...TOUT, peculeActif: false, treiziemeMoisPrestes: 0 }
    expect(calculerPrimesAnnuelles(300_000, BASE, primes, ISOLE, P).treizieme).toMatchObject({
      brutCentimes: 0,
      retenueSocialeCentimes: 0,
      precompteCentimes: 0,
      netCentimes: 0,
    })
  })

  it('double pécule : 92 % du brut mensuel, colonne pécule', () => {
    const r = calculerPrimesAnnuelles(300_000, BASE, { ...TOUT, treiziemeActif: false }, ISOLE, avecPartPecule(10_000))
    expect(r.treizieme).toBeNull()
    expect(r.pecule).toMatchObject({
      type: 'pecule',
      brutCentimes: 276_000,
      retenueSocialeCentimes: 36_073,
      precompteCentimes: 101_705,
      netCentimes: 138_222,
    })
  })

  it('la retenue du pécule ne porte que sur la part prévue par les paramètres', () => {
    // Le paramètre réel vaut 8 500 (85 %) ; ce test vérifie seulement que le paramètre est bien appliqué.
    const r = calculerPrimesAnnuelles(300_000, BASE, { ...TOUT, treiziemeActif: false }, ISOLE, avecPartPecule(5_000))
    expect(r.pecule).toMatchObject({ brutCentimes: 276_000, retenueSocialeCentimes: 18_037, precompteCentimes: 109_351, netCentimes: 148_612 })
  })

  it('pécule proratisé à 6 mois prestés l’année précédente', () => {
    const primes = { ...TOUT, treiziemeActif: false, peculeMoisPrestes: 6 }
    expect(calculerPrimesAnnuelles(300_000, BASE, primes, ISOLE, avecPartPecule(10_000)).pecule).toMatchObject({ brutCentimes: 138_000 })
  })

  it('le taux du double pécule est celui de la loi', () => {
    expect(TAUX_DOUBLE_PECULE_DIX_MILLIEMES).toBe(9_200)
  })

  it.each([
    ['pourcentage négatif', { treiziemePourcentageDixMilliemes: -1 }],
    ['pourcentage au-delà de 200 %', { treiziemePourcentageDixMilliemes: 20_001 }],
    ['13 mois prestés', { treiziemeMoisPrestes: 13 }],
    ['mois de pécule négatif', { peculeMoisPrestes: -1 }],
  ])('refuse une saisie hors bornes (%s)', (_nom, modif) => {
    expect(() => calculerPrimesAnnuelles(300_000, BASE, { ...TOUT, ...modif }, ISOLE, P)).toThrow(RangeError)
  })
})
