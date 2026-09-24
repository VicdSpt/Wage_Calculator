import { ATN_AUCUN, resoudreAtn, type ResolutionAtn } from './atnVoiture'
import { calculerAvantages, type Avantages, type ResultatAvantages } from './avantages'
import { BUDGET_MOBILITE_AUCUN, calculerBudgetMobilite, type ResultatBudgetMobilite } from './budgetMobilite'
import { calculerBrut, type SituationFamiliale } from './calculerBrut'
import { calculerNet } from './calculerNet'
import { getParametres } from './parametres'
import type { Parametres } from './parametres/types'
import { NetHorsLimites, type Resultat, type Situation } from './types'

/** Situation sans l'ATN : il vient de avantages.atn, résolu à la date du calcul. */
export type SituationSansAtn = Omit<Situation, 'atnMensuelCentimes'>
export type FamilleSansAtn = Omit<SituationFamiliale, 'atnMensuelCentimes'>

export interface ResultatComplet {
  /** Le calcul du salaire, inchangé. */
  resultat: Resultat
  avantages: ResultatAvantages
  /** ATN retenu : montant saisi ou calcul de la voiture, contribution déduite (spec voiture § 3). */
  atn: ResolutionAtn
  /** Pilier 3 du budget mobilité ; tout à zéro si ce n'est pas le choix retenu. */
  budgetMobilite: ResultatBudgetMobilite
  /** Net légal − retenue des titres-repas + indemnité de télétravail + frais propres − contribution voiture + pilier 3 net du budget mobilité. */
  netVerseCentimes: number
  /** Net versé + valeur des titres-repas reçus. */
  totalMensuelCentimes: number
}

export interface ResultatInverseComplet {
  complet: ResultatComplet
  brutCentimes: number
  netVerseCibleCentimes: number
}

function assembler(
  resultat: Resultat,
  avantages: ResultatAvantages,
  atn: ResolutionAtn,
  budgetMobilite: ResultatBudgetMobilite,
): ResultatComplet {
  const netVerseCentimes =
    resultat.netMensuelCentimes -
    avantages.retenueTitresCentimes +
    avantages.teletravailCentimes +
    avantages.fraisPropresCentimes -
    atn.contributionCentimes +
    budgetMobilite.pilier3MensuelNetCentimes
  return {
    resultat,
    avantages,
    atn,
    budgetMobilite,
    netVerseCentimes,
    totalMensuelCentimes: netVerseCentimes + avantages.valeurTitresCentimes,
  }
}

/**
 * Applique le choix de mobilité : l'ATN n'est résolu que pour 'voiture', le budget mobilité n'est
 * calculé que pour 'budgetMobilite' (spec budget mobilité § 3.2).
 */
function resoudreMobilite(avantages: Avantages, dateIso: string, parametres: Parametres) {
  const atn = resoudreAtn(avantages.choixMobilite === 'voiture' ? avantages.atn : ATN_AUCUN, dateIso, parametres)
  const budgetMobilite = calculerBudgetMobilite(
    avantages.choixMobilite === 'budgetMobilite' ? avantages.budgetMobilite : BUDGET_MOBILITE_AUCUN,
    parametres,
  )
  return { atn, budgetMobilite }
}

/** Brut → net, avantages et ATN compris. Lève PeriodeNonCouverte si la date n'est pas couverte. */
export function calculerRemuneration(situation: SituationSansAtn, avantages: Avantages, dateIso: string): ResultatComplet {
  const parametres = getParametres(dateIso)
  const { atn, budgetMobilite } = resoudreMobilite(avantages, dateIso, parametres)
  const resultat = calculerNet({ ...situation, atnMensuelCentimes: atn.imposableCentimes }, dateIso)
  return assembler(resultat, calculerAvantages(avantages, parametres), atn, budgetMobilite)
}

/**
 * Net versé → brut. L'ATN, la retenue des titres-repas, l'indemnité de télétravail, les frais
 * propres, le pilier 3 du budget mobilité et la contribution voiture ne dépendent pas du brut :
 * l'ATN est résolu une fois, et la cible est décalée avant la recherche, qui reste celle de
 * calculerBrut, avec sa marge et sa preuve (spec net → brut § 3.2, spec voiture § 3.3).
 *
 * Lève NetHorsLimites si le brut maximal n'atteint pas la cible, PeriodeNonCouverte si la date
 * n'est pas couverte.
 */
export function calculerBrutDepuisNetVerse(
  famille: FamilleSansAtn,
  avantages: Avantages,
  netVerseCibleCentimes: number,
  dateIso: string,
): ResultatInverseComplet {
  const parametres = getParametres(dateIso)
  const resultatAvantages = calculerAvantages(avantages, parametres)
  const { atn, budgetMobilite } = resoudreMobilite(avantages, dateIso, parametres)
  const decalage =
    resultatAvantages.retenueTitresCentimes -
    resultatAvantages.teletravailCentimes -
    resultatAvantages.fraisPropresCentimes +
    atn.contributionCentimes -
    budgetMobilite.pilier3MensuelNetCentimes
  const cibleNetLegal = Math.max(1, netVerseCibleCentimes + decalage)
  try {
    const inverse = calculerBrut({ ...famille, atnMensuelCentimes: atn.imposableCentimes }, cibleNetLegal, dateIso)
    return {
      complet: assembler(inverse.resultat, resultatAvantages, atn, budgetMobilite),
      brutCentimes: inverse.brutCentimes,
      netVerseCibleCentimes,
    }
  } catch (erreur) {
    // calculerBrut lève en net légal ; le champ et le message affiché parlent du net versé, donc
    // l'erreur remontée doit exprimer le même plafond, décalé comme la cible l'a été.
    if (erreur instanceof NetHorsLimites) {
      throw new NetHorsLimites(netVerseCibleCentimes, erreur.netMaxCentimes - decalage)
    }
    throw erreur
  }
}
