import { diviserArrondi } from './argent'
import type { SituationFamiliale } from './calculerBrut'
import type { Parametres, ParametresAllocationsExceptionnelles } from './parametres/types'

/**
 * Colonne du barème. Le pécule de vacances a ses propres pourcentages, plus bas d'environ
 * quatre points que ceux des autres allocations exceptionnelles (prime de fin d'année,
 * gratifications, commissions occasionnelles).
 */
export const TYPES_ALLOCATION = ['pecule', 'autre'] as const
export type TypeAllocation = (typeof TYPES_ALLOCATION)[number]

export interface ResultatAllocation {
  type: TypeAllocation
  brutCentimes: number
  /** ONSS ordinaire ou retenue propre au pécule : calculée par l'appelant. */
  retenueSocialeCentimes: number
  /** Rémunération annuelle qui a choisi la tranche. */
  baseAnnuelleCentimes: number
  /** Borne supérieure de la tranche retenue ; null pour la dernière. */
  trancheJusquaCentimes: number | null
  tauxPrecompteDixMilliemes: number
  reductionEnfantsDixMilliemes: number
  precompteCentimes: number
  netCentimes: number
}

/**
 * Enfants à charge, à deux étages (annexe III n° 54 et 55) : sous le plafond d'exonération, le
 * précompte est nul — exprimé ici par une réduction de 100 % ; sinon, sous le plafond de
 * réduction, le pourcentage prévu ; au-delà, rien. Un nombre d'enfants au-delà d'une table prend
 * sa dernière entrée.
 */
export function reductionEnfantsAllocation(
  baseAnnuelleCentimes: number,
  enfants: number,
  p: ParametresAllocationsExceptionnelles,
): number {
  if (enfants <= 0) {
    return 0
  }
  const plafondExoneration = p.exonerationEnfantsPlafondsCentimes[Math.min(enfants, p.exonerationEnfantsPlafondsCentimes.length - 1)]
  if (baseAnnuelleCentimes <= plafondExoneration) {
    return 10_000
  }
  const reduction = p.reductionsEnfants[Math.min(enfants, p.reductionsEnfants.length - 1)]
  return baseAnnuelleCentimes <= reduction.plafondAnnuelCentimes ? reduction.reductionDixMilliemes : 0
}

/**
 * Précompte d'une allocation exceptionnelle (pécule de vacances, prime de fin d'année) : un
 * pourcentage unique choisi selon la rémunération annuelle, et non la formule mensuelle
 * (spec primes annuelles § 3.1). Le brut, sa retenue sociale et la base annuelle viennent de
 * l'appelant : ce module ne connaît que le barème.
 */
export function calculerAllocationExceptionnelle(
  brutCentimes: number,
  retenueSocialeCentimes: number,
  baseAnnuelleCentimes: number,
  type: TypeAllocation,
  famille: Pick<SituationFamiliale, 'enfantsACharge'>,
  parametres: Parametres,
): ResultatAllocation {
  if (!Number.isSafeInteger(brutCentimes) || brutCentimes < 0) {
    throw new RangeError(`Brut d'allocation invalide : ${brutCentimes}`)
  }
  if (!Number.isSafeInteger(retenueSocialeCentimes) || retenueSocialeCentimes < 0 || retenueSocialeCentimes > brutCentimes) {
    throw new RangeError(`Retenue sociale invalide : ${retenueSocialeCentimes} pour un brut de ${brutCentimes}`)
  }
  const p = parametres.allocationsExceptionnelles
  const tranche = p.tranches.find((t) => t.jusquaAnnuelCentimes === null || baseAnnuelleCentimes <= t.jusquaAnnuelCentimes)
  if (!tranche) {
    throw new RangeError('Barème des allocations exceptionnelles sans tranche finale')
  }
  const tauxPrecompteDixMilliemes = type === 'pecule' ? tranche.peculeDixMilliemes : tranche.autreDixMilliemes
  const reductionEnfantsDixMilliemes = reductionEnfantsAllocation(baseAnnuelleCentimes, famille.enfantsACharge, p)
  const basePrecompte = brutCentimes - retenueSocialeCentimes
  // Un seul arrondi : le taux et la réduction s'appliquent ensemble.
  const precompteCentimes = diviserArrondi(basePrecompte * tauxPrecompteDixMilliemes * (10_000 - reductionEnfantsDixMilliemes), 100_000_000)
  return {
    type,
    brutCentimes,
    retenueSocialeCentimes,
    baseAnnuelleCentimes,
    trancheJusquaCentimes: tranche.jusquaAnnuelCentimes,
    tauxPrecompteDixMilliemes,
    reductionEnfantsDixMilliemes,
    precompteCentimes,
    netCentimes: basePrecompte - precompteCentimes,
  }
}
