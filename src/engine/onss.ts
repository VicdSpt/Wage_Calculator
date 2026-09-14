import { appliquerTaux } from './argent'
import type { Parametres } from './parametres/types'

/** Étape 1 : cotisation ONSS personnelle, avant bonus à l'emploi. */
export function cotisationOnssPersonnelle(brutCentimes: number, parametres: Parametres): number {
  return appliquerTaux(brutCentimes, parametres.onssTauxPersonnelDixMilliemes)
}