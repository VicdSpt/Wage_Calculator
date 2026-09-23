import { calculerAllocationExceptionnelle, type ResultatAllocation } from './allocationsExceptionnelles'
import { appliquerTaux, diviserArrondi } from './argent'
import type { SituationFamiliale } from './calculerBrut'
import type { Parametres } from './parametres/types'

/** Double pécule de vacances : 92 % de la rémunération mensuelle (AR du 30/03/1967). */
export const TAUX_DOUBLE_PECULE_DIX_MILLIEMES = 9_200

/** Retenue personnelle de 13,07 % : cotisations ordinaires pour le 13e mois, retenue propre pour le pécule. */
const TAUX_RETENUE_DIX_MILLIEMES = 1_307

/** Au-delà de 200 %, c'est une prime exceptionnelle, pas un 13e mois. */
const POURCENTAGE_PRIME_MAX_DIX_MILLIEMES = 20_000
const MOIS_MAX = 12

/** Primes annuelles telles que validées (spec primes annuelles § 5.1). */
export interface PrimesSaisies {
  treiziemeActif: boolean
  /** Pourcentage du brut mensuel, en dix-millièmes : 10 000 = un mois. */
  treiziemePourcentageDixMilliemes: number
  /** Mois prestés cette année, 0 à 12. */
  treiziemeMoisPrestes: number
  peculeActif: boolean
  /** Mois prestés l'année précédente, 0 à 12 : c'est elle qui ouvre le droit au pécule. */
  peculeMoisPrestes: number
}

export const PRIMES_AUCUNE: PrimesSaisies = {
  treiziemeActif: false,
  treiziemePourcentageDixMilliemes: 10_000,
  treiziemeMoisPrestes: MOIS_MAX,
  peculeActif: false,
  peculeMoisPrestes: MOIS_MAX,
}

export interface ResultatPrimes {
  /** null quand la prime n'est pas active. */
  treizieme: ResultatAllocation | null
  pecule: ResultatAllocation | null
}

function verifierBornes(primes: PrimesSaisies): void {
  const pourcentage = primes.treiziemePourcentageDixMilliemes
  if (!Number.isSafeInteger(pourcentage) || pourcentage < 0 || pourcentage > POURCENTAGE_PRIME_MAX_DIX_MILLIEMES) {
    throw new RangeError(`Pourcentage de prime hors bornes : ${pourcentage}`)
  }
  for (const mois of [primes.treiziemeMoisPrestes, primes.peculeMoisPrestes]) {
    if (!Number.isSafeInteger(mois) || mois < 0 || mois > MOIS_MAX) {
      throw new RangeError(`Mois prestés hors bornes : ${mois}`)
    }
  }
}

/** brut × pourcentage, proratisé par les mois prestés. */
function brutPrime(brutMensuelCentimes: number, pourcentageDixMilliemes: number, moisPrestes: number): number {
  const complet = appliquerTaux(brutMensuelCentimes, pourcentageDixMilliemes)
  return moisPrestes === MOIS_MAX ? complet : diviserArrondi(complet * moisPrestes, MOIS_MAX)
}

/**
 * Le 13e mois et le double pécule, chacun au barème des allocations exceptionnelles
 * (spec primes annuelles § 3.2). Ces montants ne changent pas le salaire mensuel :
 * calculerNet et calculerBrut les ignorent.
 */
export function calculerPrimesAnnuelles(
  brutMensuelCentimes: number,
  baseAnnuelleCentimes: number,
  primes: PrimesSaisies,
  famille: Pick<SituationFamiliale, 'enfantsACharge'>,
  parametres: Parametres,
): ResultatPrimes {
  verifierBornes(primes)

  let treizieme: ResultatAllocation | null = null
  if (primes.treiziemeActif) {
    const brut = brutPrime(brutMensuelCentimes, primes.treiziemePourcentageDixMilliemes, primes.treiziemeMoisPrestes)
    // Prime de fin d'année : rémunération ordinaire, donc cotisations ONSS sur la totalité.
    const retenue = appliquerTaux(brut, TAUX_RETENUE_DIX_MILLIEMES)
    treizieme = calculerAllocationExceptionnelle(brut, retenue, baseAnnuelleCentimes, 'autre', famille, parametres)
  }

  let pecule: ResultatAllocation | null = null
  if (primes.peculeActif) {
    const brut = brutPrime(brutMensuelCentimes, TAUX_DOUBLE_PECULE_DIX_MILLIEMES, primes.peculeMoisPrestes)
    // Le double pécule échappe aux cotisations ordinaires : la retenue de 13,07 % ne porte que
    // sur la part fixée par l'ONSS (paramètre de la période).
    const partSoumise = appliquerTaux(brut, parametres.allocationsExceptionnelles.partPeculeSoumiseRetenueDixMilliemes)
    const retenue = appliquerTaux(partSoumise, TAUX_RETENUE_DIX_MILLIEMES)
    pecule = calculerAllocationExceptionnelle(brut, retenue, baseAnnuelleCentimes, 'pecule', famille, parametres)
  }

  return { treizieme, pecule }
}
