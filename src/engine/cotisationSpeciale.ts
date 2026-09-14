import { appliquerTaux } from './argent'
import type { CategorieCotisation, Parametres } from './parametres/types'
import type { Situation } from './types'

/** Catégorie ONSS-CSSS selon la situation (spec § 4, dernière colonne). */
export function categorieCotisation(situation: Situation): CategorieCotisation {
  if (situation.etatCivil === 'isole') {
    return 'individuelle'
  }
  return situation.revenusConjoint === 'superieurs' ? 'communeConjointAvecRevenus' : 'communeConjointSansRevenus'
}

/** Étape 11 : retenue mensuelle de cotisation spéciale de sécurité sociale. */
export function calculerCotisationSpeciale(brutCentimes: number, situation: Situation, parametres: Parametres): number {
  const tranches = parametres.cotisationSpeciale[categorieCotisation(situation)]
  const tranche = tranches.find((t) => t.jusquaCentimes === null || brutCentimes <= t.jusquaCentimes)
  if (!tranche) {
    throw new Error('Barème de cotisation spéciale incomplet : la dernière tranche doit être ouverte')
  }
  const montant =
    tranche.fixeCentimes + appliquerTaux(Math.max(0, brutCentimes - tranche.seuilCentimes), tranche.tauxDixMilliemes)
  const avecMinimum = Math.max(tranche.minCentimes, montant)
  return tranche.maxCentimes === null ? avecMinimum : Math.min(tranche.maxCentimes, avecMinimum)
}