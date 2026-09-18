import { calculerAvantages, type Avantages, type ResultatAvantages } from './avantages'
import { calculerBrut, type SituationFamiliale } from './calculerBrut'
import { calculerNet } from './calculerNet'
import { getParametres } from './parametres'
import { NetHorsLimites, type Resultat, type Situation } from './types'

export interface ResultatComplet {
  /** Le calcul du salaire, inchangé. */
  resultat: Resultat
  avantages: ResultatAvantages
  /** Net légal − retenue des titres-repas + indemnité de télétravail. */
  netVerseCentimes: number
  /** Net versé + valeur des titres-repas reçus. */
  totalMensuelCentimes: number
}

export interface ResultatInverseComplet {
  complet: ResultatComplet
  brutCentimes: number
  netVerseCibleCentimes: number
}

function assembler(resultat: Resultat, avantages: ResultatAvantages): ResultatComplet {
  const netVerseCentimes =
    resultat.netMensuelCentimes -
    avantages.retenueTitresCentimes +
    avantages.teletravailCentimes +
    avantages.fraisPropresCentimes
  return {
    resultat,
    avantages,
    netVerseCentimes,
    totalMensuelCentimes: netVerseCentimes + avantages.valeurTitresCentimes,
  }
}

/** Brut → net, avantages compris. Lève PeriodeNonCouverte si la date n'est pas couverte. */
export function calculerRemuneration(situation: Situation, avantages: Avantages, dateIso: string): ResultatComplet {
  const resultatAvantages = calculerAvantages(avantages, getParametres(dateIso))
  return assembler(calculerNet(situation, dateIso), resultatAvantages)
}

/**
 * Net versé → brut. La retenue des titres-repas et l'indemnité de télétravail ne dépendent pas
 * du brut : il suffit de décaler la cible avant la recherche, qui reste celle de calculerBrut,
 * avec sa marge et sa preuve (spec net → brut § 3.2).
 *
 * Lève NetHorsLimites si le brut maximal n'atteint pas la cible, PeriodeNonCouverte si la date
 * n'est pas couverte.
 */
export function calculerBrutDepuisNetVerse(
  famille: SituationFamiliale,
  avantages: Avantages,
  netVerseCibleCentimes: number,
  dateIso: string,
): ResultatInverseComplet {
  const resultatAvantages = calculerAvantages(avantages, getParametres(dateIso))
  const decalage =
    resultatAvantages.retenueTitresCentimes -
    resultatAvantages.teletravailCentimes -
    resultatAvantages.fraisPropresCentimes
  const cibleNetLegal = Math.max(1, netVerseCibleCentimes + decalage)
  try {
    const inverse = calculerBrut(famille, cibleNetLegal, dateIso)
    return {
      complet: assembler(inverse.resultat, resultatAvantages),
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
