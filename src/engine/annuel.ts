import { diviserArrondi } from './argent'
import { brutPrime, TAUX_DOUBLE_PECULE_DIX_MILLIEMES, type PrimesSaisies, type ResultatPrimes } from './primesAnnuelles'
import { BRUT_MAX_CENTIMES } from './types'

const MOIS_PAR_AN = 12
const DIX_MILLE = 10_000
/** Au-delà, le brut mensuel est de toute façon hors limites : inutile de chercher plus haut. */
const MENSUEL_MAX_RECHERCHE = BRUT_MAX_CENTIMES + 1

/**
 * Brut annuel au sens belge : 12 mois, plus le 13e mois et le double pécule cochés, calculés et
 * arrondis exactement comme dans le panneau des primes (spec vue annuelle § 2.1).
 */
export function brutAnnuelDepuisMensuel(brutMensuelCentimes: number, primes: PrimesSaisies): number {
  const treizieme = primes.treiziemeActif
    ? brutPrime(brutMensuelCentimes, primes.treiziemePourcentageDixMilliemes, primes.treiziemeMoisPrestes)
    : 0
  const pecule = primes.peculeActif ? brutPrime(brutMensuelCentimes, TAUX_DOUBLE_PECULE_DIX_MILLIEMES, primes.peculeMoisPrestes) : 0
  return MOIS_PAR_AN * brutMensuelCentimes + treizieme + pecule
}

/**
 * Brut mensuel dont le brut annuel est le plus proche de l'annuel donné ; le plus petit à égale
 * distance (spec vue annuelle § 2.2). brutAnnuelDepuisMensuel est croissante et avance d'au moins
 * 12 centimes par centime mensuel : une dichotomie puis l'examen du voisin inférieur suffisent.
 */
export function brutMensuelDepuisAnnuel(brutAnnuelCentimes: number, primes: PrimesSaisies): number {
  if (!Number.isSafeInteger(brutAnnuelCentimes) || brutAnnuelCentimes < 0) {
    throw new RangeError(`Brut annuel invalide : ${brutAnnuelCentimes}`)
  }
  // Plus petit mensuel dont l'annuel atteint la cible ; brutAnnuel(M) ≥ 12 × M borne la recherche.
  let bas = 0
  let haut = Math.min(Math.ceil(brutAnnuelCentimes / MOIS_PAR_AN), MENSUEL_MAX_RECHERCHE)
  while (bas < haut) {
    const milieu = Math.floor((bas + haut) / 2)
    if (brutAnnuelDepuisMensuel(milieu, primes) >= brutAnnuelCentimes) {
      haut = milieu
    } else {
      bas = milieu + 1
    }
  }
  if (bas > 0) {
    const ecartInferieur = brutAnnuelCentimes - brutAnnuelDepuisMensuel(bas - 1, primes)
    const ecart = Math.abs(brutAnnuelDepuisMensuel(bas, primes) - brutAnnuelCentimes)
    if (ecartInferieur <= ecart) {
      return bas - 1
    }
  }
  return bas
}

/** Facteur annuel à afficher, en dix-millièmes : 139 200 pour « × 13,92 ». */
export function facteurAnnuelDixMilliemes(primes: PrimesSaisies): number {
  const treizieme = primes.treiziemeActif ? primes.treiziemePourcentageDixMilliemes * primes.treiziemeMoisPrestes : 0
  const pecule = primes.peculeActif ? TAUX_DOUBLE_PECULE_DIX_MILLIEMES * primes.peculeMoisPrestes : 0
  return diviserArrondi(MOIS_PAR_AN * DIX_MILLE * MOIS_PAR_AN + treizieme + pecule, MOIS_PAR_AN)
}

/** 12 nets versés, plus les nets des primes cochées (spec vue annuelle § 2.4). */
export function netAnnuelToutCompris(netVerseMensuelCentimes: number, primes: ResultatPrimes): number {
  return MOIS_PAR_AN * netVerseMensuelCentimes + (primes.treizieme?.netCentimes ?? 0) + (primes.pecule?.netCentimes ?? 0)
}

/** Ce que le récapitulatif et le formulaire affichent sur l'année. */
export interface VueAnnuelle {
  brutAnnuelCentimes: number
  netAnnuelToutComprisCentimes: number
  facteurDixMilliemes: number
  /** Primes cochées : elles composent le brut et le net annuels. */
  treizieme: boolean
  pecule: boolean
}

export function calculerVueAnnuelle(
  brutMensuelCentimes: number,
  netVerseMensuelCentimes: number,
  primesSaisies: PrimesSaisies,
  resultatPrimes: ResultatPrimes,
): VueAnnuelle {
  return {
    brutAnnuelCentimes: brutAnnuelDepuisMensuel(brutMensuelCentimes, primesSaisies),
    netAnnuelToutComprisCentimes: netAnnuelToutCompris(netVerseMensuelCentimes, resultatPrimes),
    facteurDixMilliemes: facteurAnnuelDixMilliemes(primesSaisies),
    treizieme: primesSaisies.treiziemeActif,
    pecule: primesSaisies.peculeActif,
  }
}
