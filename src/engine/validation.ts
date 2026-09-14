import { eurosTexteEnCentimes } from './argent'
import type { EtatCivil, RevenusConjoint, Situation } from './types'

/** Valeurs brutes du formulaire, telles que tapées. */
export interface SaisieFormulaire {
  brut: string
  etatCivil: EtatCivil
  /** Conservé même si isolé, pour retrouver le choix si on rebascule. */
  revenusConjoint: RevenusConjoint
  enfantsACharge: string
  parentIsole: boolean
}

export type CodeErreur = 'brutVide' | 'brutFormat' | 'brutHorsLimites' | 'enfantsInvalide'

export interface ErreursSaisie {
  brut?: CodeErreur
  enfantsACharge?: CodeErreur
}

export type ResultatValidation = { ok: true; situation: Situation } | { ok: false; erreurs: ErreursSaisie }

export const BRUT_MAX_CENTIMES = 10_000_000
export const ENFANTS_MAX = 10

export const SAISIE_PAR_DEFAUT: SaisieFormulaire = {
  brut: '3000',
  etatCivil: 'isole',
  revenusConjoint: 'aucun',
  enfantsACharge: '0',
  parentIsole: false,
}

/** Transforme la saisie en Situation normalisée, ou renvoie les erreurs par champ. */
export function validerSaisie(saisie: SaisieFormulaire): ResultatValidation {
  const erreurs: ErreursSaisie = {}

  let brut: number | null = null
  if (saisie.brut.trim() === '') {
    erreurs.brut = 'brutVide'
  } else {
    brut = eurosTexteEnCentimes(saisie.brut)
    if (brut === null) {
      erreurs.brut = 'brutFormat'
    } else if (brut <= 0 || brut > BRUT_MAX_CENTIMES) {
      erreurs.brut = 'brutHorsLimites'
    }
  }

  const enfantsTexte = saisie.enfantsACharge.trim()
  const enfants = /^\d+$/.test(enfantsTexte) ? Number(enfantsTexte) : Number.NaN
  if (!(enfants >= 0 && enfants <= ENFANTS_MAX)) {
    erreurs.enfantsACharge = 'enfantsInvalide'
  }

  if (brut === null || erreurs.brut || erreurs.enfantsACharge) {
    return { ok: false, erreurs }
  }

  const isole = saisie.etatCivil === 'isole'
  return {
    ok: true,
    situation: {
      brutMensuelCentimes: brut,
      etatCivil: saisie.etatCivil,
      revenusConjoint: isole ? null : saisie.revenusConjoint,
      enfantsACharge: enfants,
      parentIsole: isole && enfants > 0 && saisie.parentIsole,
    },
  }
}