import { useMemo } from 'react'
import { calculerNet } from '../engine/calculerNet'
import { getParametres } from '../engine/parametres'
import { PeriodeNonCouverte, type Resultat } from '../engine/types'
import { validerSaisie, type ErreursSaisie, type SaisieFormulaire } from '../engine/validation'

export type EtatCalcul =
  | { etat: 'ok'; resultat: Resultat; brutCentimes: number; rmmmgCentimes: number }
  | { etat: 'saisieInvalide'; erreurs: ErreursSaisie }
  | { etat: 'periodeNonCouverte'; dateIso: string }

export function calculerEtat(saisie: SaisieFormulaire, dateIso: string): EtatCalcul {
  const validation = validerSaisie(saisie)
  if (!validation.ok) {
    return { etat: 'saisieInvalide', erreurs: validation.erreurs }
  }
  try {
    const resultat = calculerNet(validation.situation, dateIso)
    return {
      etat: 'ok',
      resultat,
      brutCentimes: validation.situation.brutMensuelCentimes,
      rmmmgCentimes: getParametres(dateIso).rmmmgCentimes,
    }
  } catch (erreur) {
    if (erreur instanceof PeriodeNonCouverte) {
      return { etat: 'periodeNonCouverte', dateIso }
    }
    throw erreur
  }
}

export function useCalcul(saisie: SaisieFormulaire, dateIso: string): EtatCalcul {
  return useMemo(() => calculerEtat(saisie, dateIso), [saisie, dateIso])
}