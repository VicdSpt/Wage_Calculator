import { describe, expect, it } from 'vitest'
import { calculerAllocationExceptionnelle, reductionEnfantsAllocation } from './allocationsExceptionnelles'
import type { SituationFamiliale } from './calculerBrut'
import { getParametres } from './parametres'
import type { Parametres, ParametresAllocationsExceptionnelles } from './parametres/types'

const SEPT = '2026-09-14'
const P = getParametres(SEPT)

const ISOLE: SituationFamiliale = { etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false, atnMensuelCentimes: 0 }

/** Barème réel, tables « enfants » maîtrisées : on vérifie l'arithmétique, pas les valeurs officielles. */
function avecEnfants(
  exonerations: number[],
  reductions: { plafondAnnuelCentimes: number; reductionDixMilliemes: number }[],
): Parametres {
  const a: ParametresAllocationsExceptionnelles = {
    ...P.allocationsExceptionnelles,
    exonerationEnfantsPlafondsCentimes: exonerations,
    reductionsEnfants: reductions,
  }
  return { ...P, allocationsExceptionnelles: a }
}

const SANS_REDUCTION = [{ plafondAnnuelCentimes: 0, reductionDixMilliemes: 0 }]

describe('choix de la tranche', () => {
  it.each([
    [960_000, 0, 0],
    [1_067_500, 0, 0],
    [1_067_501, 1917, 2322],
    [1_366_000, 1917, 2322],
    [1_366_001, 2120, 2523],
    [2_679_456, 3634, 4038],
    [3_600_000, 4239, 4644],
    [5_990_000, 4744, 5148],
    [5_990_001, 5350, 5350],
    [99_999_999, 5350, 5350],
  ])('base annuelle %i → pécule %i, autre %i', (base, pecule, autre) => {
    expect(calculerAllocationExceptionnelle(100_000, 0, base, 'pecule', ISOLE, P).tauxPrecompteDixMilliemes).toBe(pecule)
    expect(calculerAllocationExceptionnelle(100_000, 0, base, 'autre', ISOLE, P).tauxPrecompteDixMilliemes).toBe(autre)
  })
})

describe('calculerAllocationExceptionnelle', () => {
  it('13e mois de 3 000,00 € : 46,44 % sur le brut moins l’ONSS', () => {
    expect(calculerAllocationExceptionnelle(300_000, 39_210, 3_600_000, 'autre', ISOLE, P)).toEqual({
      type: 'autre',
      brutCentimes: 300_000,
      retenueSocialeCentimes: 39_210,
      baseAnnuelleCentimes: 3_600_000,
      trancheJusquaCentimes: 4_586_000,
      tauxPrecompteDixMilliemes: 4644,
      reductionEnfantsDixMilliemes: 0,
      precompteCentimes: 121_111,
      netCentimes: 139_679,
    })
  })

  it('pécule de 2 760,00 € : colonne pécule, 42,39 %', () => {
    const r = calculerAllocationExceptionnelle(276_000, 36_073, 3_600_000, 'pecule', ISOLE, P)
    expect(r).toMatchObject({ tauxPrecompteDixMilliemes: 4239, precompteCentimes: 101_705, netCentimes: 138_222 })
  })

  it('la dernière tranche a le même taux dans les deux colonnes', () => {
    const treizieme = calculerAllocationExceptionnelle(500_000, 65_350, 6_000_000, 'autre', ISOLE, P)
    const pecule = calculerAllocationExceptionnelle(460_000, 60_122, 6_000_000, 'pecule', ISOLE, P)
    expect(treizieme).toMatchObject({ tauxPrecompteDixMilliemes: 5350, precompteCentimes: 232_538, netCentimes: 202_112 })
    expect(pecule).toMatchObject({ tauxPrecompteDixMilliemes: 5350, precompteCentimes: 213_935, netCentimes: 185_943 })
  })

  it('la première tranche ne prélève aucun précompte', () => {
    const r = calculerAllocationExceptionnelle(80_000, 10_456, 960_000, 'autre', ISOLE, P)
    expect(r).toMatchObject({ tauxPrecompteDixMilliemes: 0, precompteCentimes: 0, netCentimes: 69_544 })
  })

  it('sous le plafond d’exonération, un parent ne paie aucun précompte', () => {
    const parametres = avecEnfants([0, 4_000_000], SANS_REDUCTION)
    const r = calculerAllocationExceptionnelle(300_000, 39_210, 3_600_000, 'autre', { ...ISOLE, enfantsACharge: 1 }, parametres)
    expect(r).toMatchObject({ reductionEnfantsDixMilliemes: 10_000, precompteCentimes: 0, netCentimes: 260_790 })
  })

  it('au-dessus de l’exonération mais sous le plafond de réduction, le précompte est réduit', () => {
    const parametres = avecEnfants([0, 3_000_000], [
      { plafondAnnuelCentimes: 0, reductionDixMilliemes: 0 },
      { plafondAnnuelCentimes: 4_000_000, reductionDixMilliemes: 1500 },
    ])
    const r = calculerAllocationExceptionnelle(300_000, 39_210, 3_600_000, 'autre', { ...ISOLE, enfantsACharge: 1 }, parametres)
    expect(r).toMatchObject({ reductionEnfantsDixMilliemes: 1500, precompteCentimes: 102_944, netCentimes: 157_846 })
  })

  it('au-dessus des deux plafonds, les enfants ne changent rien', () => {
    const parametres = avecEnfants([0, 3_000_000], [
      { plafondAnnuelCentimes: 0, reductionDixMilliemes: 0 },
      { plafondAnnuelCentimes: 3_000_000, reductionDixMilliemes: 1500 },
    ])
    const r = calculerAllocationExceptionnelle(300_000, 39_210, 3_600_000, 'autre', { ...ISOLE, enfantsACharge: 1 }, parametres)
    expect(r).toMatchObject({ reductionEnfantsDixMilliemes: 0, precompteCentimes: 121_111 })
  })

  it('un brut nul ne produit aucune retenue', () => {
    const r = calculerAllocationExceptionnelle(0, 0, 3_600_000, 'autre', ISOLE, P)
    expect(r).toMatchObject({ precompteCentimes: 0, netCentimes: 0 })
  })

  it.each([-1, 1.5])('refuse un brut invalide (%p)', (brut) => {
    expect(() => calculerAllocationExceptionnelle(brut, 0, 3_600_000, 'autre', ISOLE, P)).toThrow(RangeError)
  })

  it('refuse une retenue sociale supérieure au brut', () => {
    expect(() => calculerAllocationExceptionnelle(100_000, 100_001, 3_600_000, 'autre', ISOLE, P)).toThrow(RangeError)
  })
})

describe('reductionEnfantsAllocation', () => {
  const REDUCTIONS = [
    { plafondAnnuelCentimes: 0, reductionDixMilliemes: 0 },
    { plafondAnnuelCentimes: 4_000_000, reductionDixMilliemes: 750 },
    { plafondAnnuelCentimes: 4_200_000, reductionDixMilliemes: 2000 },
  ]
  const a = avecEnfants([0, 3_000_000, 3_200_000], REDUCTIONS).allocationsExceptionnelles

  it('sans enfant, aucune réduction', () => {
    expect(reductionEnfantsAllocation(3_600_000, 0, a)).toBe(0)
  })

  it('exonération totale sous le plafond du n° 54', () => {
    expect(reductionEnfantsAllocation(2_900_000, 1, a)).toBe(10_000)
  })

  it('réduction du n° 55 entre les deux plafonds', () => {
    expect(reductionEnfantsAllocation(3_600_000, 1, a)).toBe(750)
    expect(reductionEnfantsAllocation(3_600_000, 2, a)).toBe(2000)
  })

  it('rien au-dessus des deux plafonds', () => {
    expect(reductionEnfantsAllocation(9_000_000, 2, a)).toBe(0)
  })

  it('au-delà du dernier index, prend la dernière entrée de chaque table', () => {
    expect(reductionEnfantsAllocation(2_900_000, 9, a)).toBe(10_000)
    expect(reductionEnfantsAllocation(3_600_000, 9, a)).toBe(2000)
  })
})
