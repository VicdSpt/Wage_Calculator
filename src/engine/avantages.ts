import { ATN_AUCUN, type AtnSaisi } from './atnVoiture'
import type { Parametres } from './parametres/types'

/** Titres-repas : un titre par jour effectivement presté (ONSS-TR). */
export interface AvantageTitresRepas {
  actif: boolean
  joursPrestes: number
  valeurFacialeCentimes: number
  partTravailleurCentimes: number
}

/** Avantages extralégaux saisis, déjà normalisés (spec avantages § 3.2). */
export interface Avantages {
  titresRepas: AvantageTitresRepas
  teletravail: { actif: boolean; indemniteCentimes: number }
  ecocheques: { actif: boolean; montantAnnuelCentimes: number }
  /** Frais réels remboursés par l'employeur (déplacements, matériel) : nets, sans plafond ONSS. */
  fraisPropresEmployeur: { actif: boolean; montantMensuelCentimes: number }
  /** Avantage de toute nature et contribution personnelle (spec voiture § 3.2). */
  atn: AtnSaisi
}

/** Ordre d'affichage des alertes. */
export const CODES_ALERTE_AVANTAGE = [
  'partPatronaleTitres',
  'partTravailleurTitres',
  'valeurFacialeTitres',
  'teletravail',
  'ecocheques',
] as const

export type CodeAlerteAvantage = (typeof CODES_ALERTE_AVANTAGE)[number]

export interface ResultatAvantages {
  /** joursPrestes × part du travailleur : retenu sur le net. */
  retenueTitresCentimes: number
  /** joursPrestes × valeur faciale. */
  valeurTitresCentimes: number
  partPatronaleTitresCentimes: number
  /** Montants par titre, pour les messages d'alerte. 0 si les titres-repas sont inactifs. */
  valeurFacialeParTitreCentimes: number
  partTravailleurParTitreCentimes: number
  partPatronaleParTitreCentimes: number
  teletravailCentimes: number
  ecochequesAnnuelCentimes: number
  fraisPropresCentimes: number
  alertes: readonly CodeAlerteAvantage[]
}

export const AVANTAGES_AUCUN: Avantages = {
  titresRepas: { actif: false, joursPrestes: 0, valeurFacialeCentimes: 0, partTravailleurCentimes: 0 },
  teletravail: { actif: false, indemniteCentimes: 0 },
  ecocheques: { actif: false, montantAnnuelCentimes: 0 },
  fraisPropresEmployeur: { actif: false, montantMensuelCentimes: 0 },
  atn: ATN_AUCUN,
}

/**
 * Avantages exonérés d'ONSS et de précompte tant que les plafonds sont respectés.
 * Que des multiplications entières : aucun arrondi. Un dépassement produit une alerte,
 * jamais un recalcul : l'app ne modélise pas le basculement en salaire (spec § 1).
 */
export function calculerAvantages(avantages: Avantages, parametres: Parametres): ResultatAvantages {
  const plafonds = parametres.avantages
  const alertes: CodeAlerteAvantage[] = []

  const titres = avantages.titresRepas
  const valeurFacialeParTitreCentimes = titres.actif ? titres.valeurFacialeCentimes : 0
  const partTravailleurParTitreCentimes = titres.actif ? titres.partTravailleurCentimes : 0
  const partPatronaleParTitreCentimes = valeurFacialeParTitreCentimes - partTravailleurParTitreCentimes
  const valeurTitresCentimes = titres.actif ? titres.joursPrestes * valeurFacialeParTitreCentimes : 0
  const retenueTitresCentimes = titres.actif ? titres.joursPrestes * partTravailleurParTitreCentimes : 0

  if (titres.actif) {
    if (partPatronaleParTitreCentimes > plafonds.titresRepasPartPatronaleMaxCentimes) {
      alertes.push('partPatronaleTitres')
    }
    if (partTravailleurParTitreCentimes < plafonds.titresRepasPartTravailleurMinCentimes) {
      alertes.push('partTravailleurTitres')
    }
    if (valeurFacialeParTitreCentimes > plafonds.titresRepasValeurFacialeMaxCentimes) {
      alertes.push('valeurFacialeTitres')
    }
  }

  const teletravailCentimes = avantages.teletravail.actif ? avantages.teletravail.indemniteCentimes : 0
  if (teletravailCentimes > plafonds.teletravailMaxCentimes) {
    alertes.push('teletravail')
  }

  const ecochequesAnnuelCentimes = avantages.ecocheques.actif ? avantages.ecocheques.montantAnnuelCentimes : 0
  if (ecochequesAnnuelCentimes > plafonds.ecochequesMaxAnnuelCentimes) {
    alertes.push('ecocheques')
  }

  // Frais réels justifiés : aucun plafond ONSS, donc aucune alerte possible.
  const fraisPropresCentimes = avantages.fraisPropresEmployeur.actif
    ? avantages.fraisPropresEmployeur.montantMensuelCentimes
    : 0

  return {
    retenueTitresCentimes,
    valeurTitresCentimes,
    partPatronaleTitresCentimes: valeurTitresCentimes - retenueTitresCentimes,
    valeurFacialeParTitreCentimes,
    partTravailleurParTitreCentimes,
    partPatronaleParTitreCentimes: titres.actif ? partPatronaleParTitreCentimes : 0,
    teletravailCentimes,
    ecochequesAnnuelCentimes,
    fraisPropresCentimes,
    alertes,
  }
}
