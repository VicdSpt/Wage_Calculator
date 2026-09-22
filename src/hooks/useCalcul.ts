import { useMemo } from 'react'
import { getParametres } from '../engine/parametres'
import type { ParametresAvantages } from '../engine/parametres/types'
import { calculerBrutDepuisNetVerse, calculerRemuneration, type ResultatComplet } from '../engine/remuneration'
import { NetHorsLimites, PeriodeNonCouverte, type Resultat } from '../engine/types'
import { validerSaisie, type ErreursSaisie, type SaisieFormulaire, type SensCalcul } from '../engine/validation'

/**
 * Ce qui dépend seulement des cases cochées et de la date, jamais de la validité du reste de la
 * saisie : l'aide « Plafond ONSS : … » et la phrase sur les conditions d'exonération en dépendent
 * et doivent rester affichées même si, par ailleurs, le montant est invalide.
 */
export type ContexteAvantages = {
  avantagesActifs: boolean
  plafondsAvantages: ParametresAvantages | null
}

export type EtatCalcul =
  | ({
      etat: 'ok'
      sens: SensCalcul
      complet: ResultatComplet
      /** Raccourci vers complet.resultat, pour les composants. */
      resultat: Resultat
      brutCentimes: number
      /** Net versé souhaité en net → brut, sinon null. */
      netCibleCentimes: number | null
      /** Toujours connus quand l'état est ok : la date est nécessairement couverte. */
      plafondsAvantages: ParametresAvantages
      rmmmgCentimes: number
    } & ContexteAvantages)
  | ({ etat: 'saisieInvalide'; erreurs: ErreursSaisie } & ContexteAvantages)
  | ({ etat: 'netHorsLimites'; netMaxCentimes: number } & ContexteAvantages)
  | ({ etat: 'periodeNonCouverte'; dateIso: string } & ContexteAvantages)

export function calculerEtat(saisie: SaisieFormulaire, dateIso: string): EtatCalcul {
  const a = saisie.avantages
  const avantagesActifs = a.titresRepasActif || a.teletravailActif || a.ecochequesActif
  let plafondsAvantages: ParametresAvantages | null = null
  try {
    plafondsAvantages = getParametres(dateIso).avantages
  } catch {
    plafondsAvantages = null
  }

  const validation = validerSaisie(saisie, dateIso)
  if (!validation.ok) {
    return { etat: 'saisieInvalide', erreurs: validation.erreurs, avantagesActifs, plafondsAvantages }
  }
  const { avantages } = validation
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
      return { etat: 'periodeNonCouverte', dateIso, avantagesActifs, plafondsAvantages }
    }
    if (erreur instanceof NetHorsLimites) {
      return { etat: 'netHorsLimites', netMaxCentimes: erreur.netMaxCentimes, avantagesActifs, plafondsAvantages }
    }
    throw erreur
  }
}

export function useCalcul(saisie: SaisieFormulaire, dateIso: string): EtatCalcul {
  return useMemo(() => calculerEtat(saisie, dateIso), [saisie, dateIso])
}
