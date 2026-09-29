import { useMemo } from 'react'
import { calculerVueAnnuelle, type VueAnnuelle } from '../engine/annuel'
import type { ChoixMobilite } from '../engine/avantages'
import type { ResumeOffre } from '../engine/comparaison'
import { getParametres } from '../engine/parametres'
import type { ParametresAvantages, ParametresBudgetMobilite } from '../engine/parametres/types'
import { calculerPrimesAnnuelles, type ResultatPrimes } from '../engine/primesAnnuelles'
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
      /** Bornes légales du budget mobilité de la période, pour l'alerte. */
      parametresBudgetMobilite: ParametresBudgetMobilite
      rmmmgCentimes: number
      /** 13e mois et double pécule, chacun null s'il n'est pas coché. */
      primes: ResultatPrimes
      /** Brut et net sur l'année, et ce qui les compose (spec vue annuelle § 2). */
      annuel: VueAnnuelle
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
      const primes = calculerPrimesAnnuelles(
        inverse.brutCentimes,
        // Base annuelle : la rémunération brute normale, sans déduction (annexe III n° 53).
        inverse.brutCentimes * 12,
        validation.primes,
        validation.famille,
        parametres,
      )
      return {
        etat: 'ok',
        sens: 'netVersBrut',
        complet: inverse.complet,
        resultat: inverse.complet.resultat,
        brutCentimes: inverse.brutCentimes,
        netCibleCentimes: inverse.netVerseCibleCentimes,
        avantagesActifs,
        plafondsAvantages: parametres.avantages,
        parametresBudgetMobilite: parametres.budgetMobilite,
        rmmmgCentimes: parametres.rmmmgCentimes,
        primes,
        annuel: calculerVueAnnuelle(inverse.brutCentimes, inverse.complet.netVerseCentimes, validation.primes, primes),
      }
    }
    const complet = calculerRemuneration(validation.situation, avantages, dateIso)
    const primes = calculerPrimesAnnuelles(
      validation.situation.brutMensuelCentimes,
      // Base annuelle : la rémunération brute normale, sans déduction (annexe III n° 53).
      validation.situation.brutMensuelCentimes * 12,
      validation.primes,
      validation.situation,
      parametres,
    )
    return {
      etat: 'ok',
      sens: 'brutVersNet',
      complet,
      resultat: complet.resultat,
      brutCentimes: validation.situation.brutMensuelCentimes,
      netCibleCentimes: null,
      avantagesActifs,
      plafondsAvantages: parametres.avantages,
      parametresBudgetMobilite: parametres.budgetMobilite,
      rmmmgCentimes: parametres.rmmmgCentimes,
      primes,
      annuel: calculerVueAnnuelle(validation.situation.brutMensuelCentimes, complet.netVerseCentimes, validation.primes, primes),
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

/** Montants d'une offre pour le tableau de comparaison, ou null si son calcul n'aboutit pas. */
export function resumerOffre(etat: EtatCalcul, choixMobilite: ChoixMobilite): ResumeOffre | null {
  if (etat.etat !== 'ok') {
    return null
  }
  return {
    brutMensuelCentimes: etat.brutCentimes,
    brutAnnuelCentimes: etat.annuel.brutAnnuelCentimes,
    netVerseCentimes: etat.complet.netVerseCentimes,
    netAnnuelToutComprisCentimes: etat.annuel.netAnnuelToutComprisCentimes,
    titresRepasMensuelCentimes: etat.complet.avantages.valeurTitresCentimes,
    ecochequesAnnuelCentimes: etat.complet.avantages.ecochequesAnnuelCentimes,
    choixMobilite,
    atnMensuelCentimes: choixMobilite === 'voiture' ? etat.complet.atn.avantContributionCentimes : 0,
    tauxRetour: etat.complet.resultat.tauxRetour,
  }
}

/** Sans saisie (pas d'offre B), renvoie null : l'app appelle toujours ce hook deux fois (règle des hooks). */
export function useCalcul(saisie: SaisieFormulaire, dateIso: string): EtatCalcul
export function useCalcul(saisie: SaisieFormulaire | null, dateIso: string): EtatCalcul | null
export function useCalcul(saisie: SaisieFormulaire | null, dateIso: string): EtatCalcul | null {
  return useMemo(() => (saisie === null ? null : calculerEtat(saisie, dateIso)), [saisie, dateIso])
}
