import { eurosTexteEnCentimes } from './argent'
import type { SituationFamiliale } from './calculerBrut'
import { BRUT_MAX_CENTIMES, type EtatCivil, type RevenusConjoint, type Situation } from './types'

export const SENS_CALCUL = ['brutVersNet', 'netVersBrut'] as const

/** Sens du calcul : du brut saisi vers le net, ou du net souhaité vers le brut. */
export type SensCalcul = (typeof SENS_CALCUL)[number]

/** Valeurs brutes du formulaire, telles que tapées. */
export interface SaisieFormulaire {
  sens: SensCalcul
  /** Brut ou net mensuel selon le sens. */
  montant: string
  /** Montant quitté lors de la dernière bascule, tant qu'il n'a pas été modifié (spec net → brut § 4.3). */
  montantAvantBascule: string | null
  etatCivil: EtatCivil
  /** Conservé même si isolé, pour retrouver le choix si on rebascule. */
  revenusConjoint: RevenusConjoint
  enfantsACharge: string
  parentIsole: boolean
}

export type CodeErreur = 'montantVide' | 'montantFormat' | 'montantHorsLimites' | 'enfantsInvalide'

export interface ErreursSaisie {
  montant?: CodeErreur
  enfantsACharge?: CodeErreur
}

export type ResultatValidation =
  | { ok: true; sens: 'brutVersNet'; situation: Situation }
  | { ok: true; sens: 'netVersBrut'; famille: SituationFamiliale; netCibleCentimes: number }
  | { ok: false; erreurs: ErreursSaisie }

export const ENFANTS_MAX = 10

export const SAISIE_PAR_DEFAUT: SaisieFormulaire = {
  sens: 'brutVersNet',
  montant: '3000',
  montantAvantBascule: null,
  etatCivil: 'isole',
  revenusConjoint: 'aucun',
  enfantsACharge: '0',
  parentIsole: false,
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

  if (montant === null || erreurs.montant || erreurs.enfantsACharge) {
    return { ok: false, erreurs }
  }

  const isole = saisie.etatCivil === 'isole'
  const famille: SituationFamiliale = {
    etatCivil: saisie.etatCivil,
    revenusConjoint: isole ? null : saisie.revenusConjoint,
    enfantsACharge: enfants,
    parentIsole: isole && enfants > 0 && saisie.parentIsole,
  }

  if (saisie.sens === 'netVersBrut') {
    return { ok: true, sens: 'netVersBrut', famille, netCibleCentimes: montant }
  }
  return { ok: true, sens: 'brutVersNet', situation: { brutMensuelCentimes: montant, ...famille } }
}
