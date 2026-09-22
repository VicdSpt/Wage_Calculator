import { eurosTexteEnCentimes } from './argent'
import { ATN_AUCUN } from './atnVoiture'
import { AVANTAGES_AUCUN, type Avantages } from './avantages'
import type { FamilleSansAtn, SituationSansAtn } from './remuneration'
import { BRUT_MAX_CENTIMES, type EtatCivil, type RevenusConjoint } from './types'

export const SENS_CALCUL = ['brutVersNet', 'netVersBrut'] as const

/** Sens du calcul : du brut saisi vers le net, ou du net souhaité vers le brut. */
export type SensCalcul = (typeof SENS_CALCUL)[number]

/** Avantages extralégaux, tels que tapés (spec avantages § 4.1). */
export interface SaisieAvantages {
  titresRepasActif: boolean
  joursPrestes: string
  valeurFaciale: string
  partTravailleur: string
  teletravailActif: boolean
  teletravail: string
  ecochequesActif: boolean
  ecocheques: string
  fraisPropresActif: boolean
  fraisPropres: string
}

/** Valeurs brutes du formulaire, telles que tapées. */
export interface SaisieFormulaire {
  sens: SensCalcul
  /** Brut ou net versé mensuel selon le sens. */
  montant: string
  /** Montant quitté lors de la dernière bascule, tant que rien n'a été modifié (spec net → brut § 4.3). */
  montantAvantBascule: string | null
  /** Avantage de toute nature mensuel, tel que tapé. '0' si aucun. */
  atn: string
  etatCivil: EtatCivil
  /** Conservé même si isolé, pour retrouver le choix si on rebascule. */
  revenusConjoint: RevenusConjoint
  enfantsACharge: string
  parentIsole: boolean
  avantages: SaisieAvantages
}

export type CodeErreur =
  | 'montantVide'
  | 'montantFormat'
  | 'montantHorsLimites'
  | 'enfantsInvalide'
  | 'joursInvalide'
  | 'valeurFacialeInvalide'
  | 'partTravailleurInvalide'
  | 'partTravailleurSuperieure'
  | 'teletravailInvalide'
  | 'ecochequesInvalide'
  | 'atnInvalide'
  | 'fraisPropresInvalide'

export interface ErreursSaisie {
  montant?: CodeErreur
  enfantsACharge?: CodeErreur
  joursPrestes?: CodeErreur
  valeurFaciale?: CodeErreur
  partTravailleur?: CodeErreur
  teletravail?: CodeErreur
  ecocheques?: CodeErreur
  atn?: CodeErreur
  fraisPropres?: CodeErreur
}

export type ResultatValidation =
  | { ok: true; sens: 'brutVersNet'; situation: SituationSansAtn; avantages: Avantages }
  | { ok: true; sens: 'netVersBrut'; famille: FamilleSansAtn; netCibleCentimes: number; avantages: Avantages }
  | { ok: false; erreurs: ErreursSaisie }

export const ENFANTS_MAX = 10
export const JOURS_PRESTES_MAX = 23
/** Bornes de saisie, larges : le dépassement des plafonds officiels est une alerte, pas une erreur. */
const TITRE_MAX_CENTIMES = 2_000
const TELETRAVAIL_MAX_CENTIMES = 100_000
const ECOCHEQUES_MAX_CENTIMES = 200_000
const ATN_MAX_CENTIMES = 1_000_000
const FRAIS_PROPRES_MAX_CENTIMES = 500_000

export const SAISIE_AVANTAGES_PAR_DEFAUT: SaisieAvantages = {
  titresRepasActif: false,
  joursPrestes: '20',
  valeurFaciale: '10,00',
  partTravailleur: '1,09',
  teletravailActif: false,
  teletravail: '160,99',
  ecochequesActif: false,
  ecocheques: '250,00',
  fraisPropresActif: false,
  fraisPropres: '100,00',
}

export const SAISIE_PAR_DEFAUT: SaisieFormulaire = {
  sens: 'brutVersNet',
  montant: '3000',
  montantAvantBascule: null,
  atn: '0',
  etatCivil: 'isole',
  revenusConjoint: 'aucun',
  enfantsACharge: '0',
  parentIsole: false,
  avantages: SAISIE_AVANTAGES_PAR_DEFAUT,
}

/** Montant saisi en centimes, ou null s'il est vide, mal formé ou hors bornes. */
function montantBorne(texte: string, min: number, max: number): number | null {
  const centimes = eurosTexteEnCentimes(texte.trim())
  return centimes === null || centimes < min || centimes > max ? null : centimes
}

/** Avantages normalisés ; remplit `erreurs` pour chaque champ invalide d'un avantage actif. */
function validerAvantages(saisie: SaisieAvantages, erreurs: ErreursSaisie): Avantages {
  const avantages: Avantages = {
    titresRepas: { ...AVANTAGES_AUCUN.titresRepas, actif: saisie.titresRepasActif },
    teletravail: { actif: saisie.teletravailActif, indemniteCentimes: 0 },
    ecocheques: { actif: saisie.ecochequesActif, montantAnnuelCentimes: 0 },
    fraisPropresEmployeur: { actif: saisie.fraisPropresActif, montantMensuelCentimes: 0 },
    atn: ATN_AUCUN,
  }

  if (saisie.titresRepasActif) {
    const joursTexte = saisie.joursPrestes.trim()
    const jours = /^\d+$/.test(joursTexte) ? Number(joursTexte) : Number.NaN
    if (jours >= 0 && jours <= JOURS_PRESTES_MAX) {
      avantages.titresRepas.joursPrestes = jours
    } else {
      erreurs.joursPrestes = 'joursInvalide'
    }

    const valeur = montantBorne(saisie.valeurFaciale, 1, TITRE_MAX_CENTIMES)
    if (valeur === null) {
      erreurs.valeurFaciale = 'valeurFacialeInvalide'
    } else {
      avantages.titresRepas.valeurFacialeCentimes = valeur
    }

    const part = montantBorne(saisie.partTravailleur, 0, TITRE_MAX_CENTIMES)
    if (part === null) {
      erreurs.partTravailleur = 'partTravailleurInvalide'
    } else if (valeur !== null && part > valeur) {
      erreurs.partTravailleur = 'partTravailleurSuperieure'
    } else {
      avantages.titresRepas.partTravailleurCentimes = part
    }
  }

  if (saisie.teletravailActif) {
    const indemnite = montantBorne(saisie.teletravail, 0, TELETRAVAIL_MAX_CENTIMES)
    if (indemnite === null) {
      erreurs.teletravail = 'teletravailInvalide'
    } else {
      avantages.teletravail.indemniteCentimes = indemnite
    }
  }

  if (saisie.ecochequesActif) {
    const montant = montantBorne(saisie.ecocheques, 0, ECOCHEQUES_MAX_CENTIMES)
    if (montant === null) {
      erreurs.ecocheques = 'ecochequesInvalide'
    } else {
      avantages.ecocheques.montantAnnuelCentimes = montant
    }
  }

  if (saisie.fraisPropresActif) {
    const frais = montantBorne(saisie.fraisPropres, 0, FRAIS_PROPRES_MAX_CENTIMES)
    if (frais === null) {
      erreurs.fraisPropres = 'fraisPropresInvalide'
    } else {
      avantages.fraisPropresEmployeur.montantMensuelCentimes = frais
    }
  }

  return avantages
}

/** Transforme la saisie en données normalisées pour le moteur, ou renvoie les erreurs par champ. */
export function validerSaisie(saisie: SaisieFormulaire): ResultatValidation {
  const erreurs: ErreursSaisie = {}

  let montant: number | null = null
  if (saisie.montant.trim() === '') {
    erreurs.montant = 'montantVide'
  } else {
    montant = eurosTexteEnCentimes(saisie.montant)
    if (montant === null) {
      erreurs.montant = 'montantFormat'
    } else if (montant <= 0 || montant > BRUT_MAX_CENTIMES) {
      erreurs.montant = 'montantHorsLimites'
    }
  }

  const enfantsTexte = saisie.enfantsACharge.trim()
  const enfants = /^\d+$/.test(enfantsTexte) ? Number(enfantsTexte) : Number.NaN
  if (!(enfants >= 0 && enfants <= ENFANTS_MAX)) {
    erreurs.enfantsACharge = 'enfantsInvalide'
  }

  const atn = montantBorne(saisie.atn, 0, ATN_MAX_CENTIMES)
  if (atn === null) {
    erreurs.atn = 'atnInvalide'
  }

  const avantages: Avantages = {
    ...validerAvantages(saisie.avantages, erreurs),
    atn: { source: { mode: 'montant', montantMensuelCentimes: atn ?? 0 }, contributionMensuelleCentimes: 0 },
  }

  if (montant === null || Object.keys(erreurs).length > 0) {
    return { ok: false, erreurs }
  }

  const isole = saisie.etatCivil === 'isole'
  const famille: FamilleSansAtn = {
    etatCivil: saisie.etatCivil,
    revenusConjoint: isole ? null : saisie.revenusConjoint,
    enfantsACharge: enfants,
    parentIsole: isole && enfants > 0 && saisie.parentIsole,
  }

  if (saisie.sens === 'netVersBrut') {
    return { ok: true, sens: 'netVersBrut', famille, netCibleCentimes: montant, avantages }
  }
  return { ok: true, sens: 'brutVersNet', situation: { brutMensuelCentimes: montant, ...famille }, avantages }
}
