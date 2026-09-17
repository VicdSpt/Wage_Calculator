import { useMemo } from 'react'
import { getParametres } from '../engine/parametres'
import type { ParametresAvantages } from '../engine/parametres/types'
import { calculerBrutDepuisNetVerse, calculerRemuneration, type ResultatComplet } from '../engine/remuneration'
import { NetHorsLimites, PeriodeNonCouverte, type Resultat } from '../engine/types'
import { validerSaisie, type ErreursSaisie, type SaisieFormulaire, type SensCalcul } from '../engine/validation'

export type EtatCalcul =
  | {
      etat: 'ok'
      sens: SensCalcul
      complet: ResultatComplet
      /** Raccourci vers complet.resultat, pour les composants. */
      resultat: Resultat
      brutCentimes: number
      /** Net versé souhaité en net → brut, sinon null. */
      netCibleCentimes: number | null
      avantagesActifs: boolean
      plafondsAvantages: ParametresAvantages
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
  const { avantages } = validation
  const avantagesActifs = avantages.titresRepas.actif || avantages.teletravail.actif || avantages.ecocheques.actif
  try {
    const parametres = getParametres(dateIso)
    if (validation.sens === 'netVersBrut') {
      const inverse = calculerBrutDepuisNetVerse(validation.famille, avantages, validation.netCibleCentimes, dateIso)
      return {
        etat: 'ok',
        sens: 'netVersBrut',
        complet: inverse.complet,
        resultat: inverse.complet.resultat,
        brutCentimes: inverse.brutCentimes,
        netCibleCentimes: inverse.netVerseCibleCentimes,
        avantagesActifs,
        plafondsAvantages: parametres.avantages,
        rmmmgCentimes: parametres.rmmmgCentimes,
      }
    }
    const complet = calculerRemuneration(validation.situation, avantages, dateIso)
    return {
      etat: 'ok',
      sens: 'brutVersNet',
      complet,
      resultat: complet.resultat,
      brutCentimes: validation.situation.brutMensuelCentimes,
      netCibleCentimes: null,
      avantagesActifs,
      plafondsAvantages: parametres.avantages,
      rmmmgCentimes: parametres.rmmmgCentimes,
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
