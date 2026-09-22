import { resoudreAtn, type ResolutionAtn } from './atnVoiture'
import { calculerAvantages, type Avantages, type ResultatAvantages } from './avantages'
import { calculerBrut, type SituationFamiliale } from './calculerBrut'
import { calculerNet } from './calculerNet'
import { getParametres } from './parametres'
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
  /** Net légal − retenue des titres-repas + indemnité de télétravail + frais propres − contribution voiture. */
  netVerseCentimes: number
  /** Net versé + valeur des titres-repas reçus. */
  totalMensuelCentimes: number
}

export interface ResultatInverseComplet {
  complet: ResultatComplet
  brutCentimes: number
  netVerseCibleCentimes: number
}

function assembler(resultat: Resultat, avantages: ResultatAvantages, atn: ResolutionAtn): ResultatComplet {
  const netVerseCentimes =
    resultat.netMensuelCentimes -
    avantages.retenueTitresCentimes +
    avantages.teletravailCentimes +
    avantages.fraisPropresCentimes -
    atn.contributionCentimes
  return {
    resultat,
    avantages,
    atn,
    netVerseCentimes,
    totalMensuelCentimes: netVerseCentimes + avantages.valeurTitresCentimes,
  }
}

/** Brut → net, avantages et ATN compris. Lève PeriodeNonCouverte si la date n'est pas couverte. */
export function calculerRemuneration(situation: SituationSansAtn, avantages: Avantages, dateIso: string): ResultatComplet {
  const parametres = getParametres(dateIso)
  const atn = resoudreAtn(avantages.atn, dateIso, parametres)
  const resultat = calculerNet({ ...situation, atnMensuelCentimes: atn.imposableCentimes }, dateIso)
  return assembler(resultat, calculerAvantages(avantages, parametres), atn)
}

/**
 * Net versé → brut. L'ATN, la retenue des titres-repas, l'indemnité de télétravail, les frais
 * propres et la contribution voiture ne dépendent pas du brut : l'ATN est résolu une fois, et la
 * cible est décalée avant la recherche, qui reste celle de calculerBrut, avec sa marge et sa
 * preuve (spec net → brut § 3.2, spec voiture § 3.3).
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
  const atn = resoudreAtn(avantages.atn, dateIso, parametres)
  const decalage =
    resultatAvantages.retenueTitresCentimes -
    resultatAvantages.teletravailCentimes -
    resultatAvantages.fraisPropresCentimes +
    atn.contributionCentimes
  const cibleNetLegal = Math.max(1, netVerseCibleCentimes + decalage)
  try {
    const inverse = calculerBrut({ ...famille, atnMensuelCentimes: atn.imposableCentimes }, cibleNetLegal, dateIso)
    return {
      complet: assembler(inverse.resultat, resultatAvantages, atn),
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
