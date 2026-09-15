import { useMemo } from 'react'
import { calculerBrut } from '../engine/calculerBrut'
import { calculerNet } from '../engine/calculerNet'
import { getParametres } from '../engine/parametres'
import { NetHorsLimites, PeriodeNonCouverte, type Resultat } from '../engine/types'
import { validerSaisie, type ErreursSaisie, type SaisieFormulaire, type SensCalcul } from '../engine/validation'

export type EtatCalcul =
  | {
      etat: 'ok'
      sens: SensCalcul
      resultat: Resultat
      brutCentimes: number
      /** null en brut → net. */
      netCibleCentimes: number | null
      rmmmgCentimes: number
    }
  | { etat: 'saisieInvalide'; erreurs: ErreursSaisie }
  | { etat: 'netHorsLimites'; netMaxCentimes: number }
  | { etat: 'periodeNonCouverte'; dateIso: string }

export function calculerEtat(saisie: SaisieFormulaire, dateIso: string): EtatCalcul {
  const validation = validerSaisie(saisie)
  if (!validation.ok) {
    return { etat: 'saisieInvalide', erreurs: validation.erreurs }
  }
  try {
    if (validation.sens === 'netVersBrut') {
      const inverse = calculerBrut(validation.famille, validation.netCibleCentimes, dateIso)
      return {
        etat: 'ok',
        sens: 'netVersBrut',
        resultat: inverse.resultat,
        brutCentimes: inverse.brutCentimes,
        netCibleCentimes: inverse.netCibleCentimes,
        rmmmgCentimes: getParametres(dateIso).rmmmgCentimes,
      }
    }
    return {
      etat: 'ok',
      sens: 'brutVersNet',
      resultat: calculerNet(validation.situation, dateIso),
      brutCentimes: validation.situation.brutMensuelCentimes,
      netCibleCentimes: null,
      rmmmgCentimes: getParametres(dateIso).rmmmgCentimes,
    }
  } catch (erreur) {
    if (erreur instanceof PeriodeNonCouverte) {
      return { etat: 'periodeNonCouverte', dateIso }
    }
    if (erreur instanceof NetHorsLimites) {
      return { etat: 'netHorsLimites', netMaxCentimes: erreur.netMaxCentimes }
    }
    throw erreur
  }
}

export function useCalcul(saisie: SaisieFormulaire, dateIso: string): EtatCalcul {
  return useMemo(() => calculerEtat(saisie, dateIso), [saisie, dateIso])
}
