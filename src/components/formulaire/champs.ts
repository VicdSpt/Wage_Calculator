import type { CodeErreur, SaisieFormulaire, SensCalcul } from '../../engine/validation'
import { texteErreur } from '../../i18n/fr'

/** Signature de la mise à jour d'un champ de la saisie, partagée par les sections. */
export type ModifierSaisie = <K extends keyof SaisieFormulaire>(champ: K, valeur: SaisieFormulaire[K]) => void

/** Message d'une erreur de champ, ou undefined quand il n'y en a pas : ce qu'attend ChampAvantage. */
export function messageErreur(code: CodeErreur | undefined, sens: SensCalcul): string | undefined {
  return code ? texteErreur(code, sens) : undefined
}

export const CHAMP =
  'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-blue-600 aria-invalid:border-red-600 dark:border-slate-600 dark:bg-slate-800'
