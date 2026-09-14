import { DIX_MILLE, diviserArrondi } from './argent'
import type { Parametres, VoletBonus } from './parametres/types'

export interface BonusEmploiSocial {
  voletA: number
  voletB: number
  total: number
}

/**
 * Montant de base R d'un volet. L'ONSS arrondit R lui-même :
 * R = max − coef × (S − plancher), arrondi au centime, jamais négatif.
 */
export function montantVolet(salaireCentimes: number, volet: VoletBonus): number {
  if (salaireCentimes <= volet.plancherCentimes) {
    return volet.maxCentimes
  }
  if (salaireCentimes > volet.plafondCentimes) {
    return 0
  }
  const enDixMilliemesDeCentime =
    volet.maxCentimes * DIX_MILLE - volet.coefDixMilliemes * (salaireCentimes - volet.plancherCentimes)
  return Math.max(0, diviserArrondi(enDixMilliemesDeCentime, DIX_MILLE))
}

/** Étape 2 : volets A et B, écrêtés d'abord sur B puis sur A pour ne pas dépasser l'ONSS dû. */
export function calculerBonusEmploiSocial(
  brutCentimes: number,
  onssCentimes: number,
  parametres: Parametres,
): BonusEmploiSocial {
  let voletA = montantVolet(brutCentimes, parametres.bonusEmploi.voletA)
  let voletB = montantVolet(brutCentimes, parametres.bonusEmploi.voletB)
  if (voletA + voletB > onssCentimes) {
    voletB = Math.max(0, onssCentimes - voletA)
    voletA = Math.min(voletA, onssCentimes)
  }
  return { voletA, voletB, total: voletA + voletB }
}