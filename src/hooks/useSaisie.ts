import { useCallback, useEffect, useState } from 'react'
import { REVENUS_CONJOINT } from '../engine/types'
import { SAISIE_AVANTAGES_PAR_DEFAUT, SAISIE_PAR_DEFAUT, SENS_CALCUL, type SaisieAvantages, type SaisieFormulaire } from '../engine/validation'

export const CLE_STOCKAGE = 'wage-calculator:saisie:v3'
/** Format V2 (sans avantages) : lu pour reprendre la saisie, jamais réécrit. */
export const CLE_STOCKAGE_V2 = 'wage-calculator:saisie:v2'
/** Format V1 (brut → net uniquement) : lu pour reprendre la saisie, jamais réécrit. */
export const CLE_STOCKAGE_V1 = 'wage-calculator:saisie:v1'

type Objet = Record<string, unknown>
type ChampsFamille = Pick<SaisieFormulaire, 'etatCivil' | 'revenusConjoint' | 'enfantsACharge' | 'parentIsole'>

function estObjet(valeur: unknown): valeur is Objet {
  return typeof valeur === 'object' && valeur !== null
}

function aSituationFamiliale(v: Objet): boolean {
  return (
    (v.etatCivil === 'isole' || v.etatCivil === 'marieOuCohabitant') &&
    typeof v.revenusConjoint === 'string' &&
    (REVENUS_CONJOINT as readonly string[]).includes(v.revenusConjoint) &&
    typeof v.enfantsACharge === 'string' &&
    typeof v.parentIsole === 'boolean'
  )
}

function estSaisieAvantages(valeur: unknown): valeur is SaisieAvantages {
  if (!estObjet(valeur)) {
    return false
  }
  const booleens = ['titresRepasActif', 'teletravailActif', 'ecochequesActif'] as const
  const chaines = ['joursPrestes', 'valeurFaciale', 'partTravailleur', 'teletravail', 'ecocheques'] as const
  return booleens.every((champ) => typeof valeur[champ] === 'boolean') && chaines.every((champ) => typeof valeur[champ] === 'string')
}

/** Saisie V2 (sans avantages) : les champs communs à V2 et V3. */
function estSaisieV2(valeur: unknown): valeur is Omit<SaisieFormulaire, 'avantages'> {
  return (
    estObjet(valeur) &&
    aSituationFamiliale(valeur) &&
    typeof valeur.sens === 'string' &&
    (SENS_CALCUL as readonly string[]).includes(valeur.sens) &&
    typeof valeur.montant === 'string' &&
    (valeur.montantAvantBascule === null || typeof valeur.montantAvantBascule === 'string')
  )
}

function estSaisie(valeur: unknown): valeur is SaisieFormulaire {
  return estSaisieV2(valeur) && estSaisieAvantages((valeur as Objet).avantages)
}

/** Saisie V1 ({ brut, etatCivil, … }) → saisie V2 en brut → net, ou null si invalide. */
function repriseV1(valeur: unknown): SaisieFormulaire | null {
  if (!estObjet(valeur) || !aSituationFamiliale(valeur) || typeof valeur.brut !== 'string') {
    return null
  }
  const v1 = valeur as ChampsFamille & { brut: string }
  return {
    sens: 'brutVersNet',
    montant: v1.brut,
    montantAvantBascule: null,
    etatCivil: v1.etatCivil,
    revenusConjoint: v1.revenusConjoint,
    enfantsACharge: v1.enfantsACharge,
    parentIsole: v1.parentIsole,
    avantages: SAISIE_AVANTAGES_PAR_DEFAUT,
  }
}

/** Contenu JSON d'une clé, ou null si absente, illisible ou inaccessible. */
function lireCle(cle: string): unknown {
  try {
    const texte = localStorage.getItem(cle)
    return texte === null ? null : JSON.parse(texte)
  } catch {
    return null
  }
}

/** Saisie mémorisée (v3, sinon reprise v2, sinon v1), ou saisie par défaut. */
export function lireSaisieStockee(): SaisieFormulaire {
  const v3 = lireCle(CLE_STOCKAGE)
  if (estSaisie(v3)) {
    return v3
  }
  // Bloc avantages corrompu seul : le reste de la saisie v3 (montant, sens, situation familiale)
  // reste valable, on ne le perd pas au profit d'une clé v2 que les utilisateurs de la v3 n'ont plus.
  if (estSaisieV2(v3)) {
    return { ...v3, avantages: SAISIE_AVANTAGES_PAR_DEFAUT }
  }
  const v2 = lireCle(CLE_STOCKAGE_V2)
  if (estSaisieV2(v2)) {
    return { ...v2, avantages: SAISIE_AVANTAGES_PAR_DEFAUT }
  }
  return repriseV1(lireCle(CLE_STOCKAGE_V1)) ?? SAISIE_PAR_DEFAUT
}

export function useSaisie() {
  const [saisie, setSaisie] = useState<SaisieFormulaire>(lireSaisieStockee)

  useEffect(() => {
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(saisie))
    } catch {
      // Stockage indisponible (navigation privée, quota) : l'app fonctionne sans mémoriser.
    }
  }, [saisie])

  const modifier = useCallback(<K extends keyof SaisieFormulaire>(champ: K, valeur: SaisieFormulaire[K]) => {
    setSaisie((precedente) => ({
      ...precedente,
      [champ]: valeur,
      // Toute modification change le résultat affiché : la bascule suivante reprendra ce résultat
      // au lieu de restaurer l'ancien montant.
      montantAvantBascule: null,
    }))
  }, [])

  /**
   * Change de sens. Nouveau montant : le montant d'avant la bascule si rien n'a été modifié
   * depuis (aller-retour exact), sinon montantRepris (le résultat affiché), sinon le montant actuel.
   */
  const basculerSens = useCallback((montantRepris: string | null) => {
    setSaisie((precedente) => ({
      ...precedente,
      sens: precedente.sens === 'brutVersNet' ? 'netVersBrut' : 'brutVersNet',
      montant: precedente.montantAvantBascule ?? montantRepris ?? precedente.montant,
      montantAvantBascule: precedente.montant,
    }))
  }, [])

  return { saisie, modifier, basculerSens }
}
