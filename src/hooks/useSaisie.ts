import { useCallback, useEffect, useState } from 'react'
import { REVENUS_CONJOINT } from '../engine/types'
import { SAISIE_PAR_DEFAUT, SENS_CALCUL, type SaisieFormulaire } from '../engine/validation'

export const CLE_STOCKAGE = 'wage-calculator:saisie:v2'
/** Format de la V1 (brut → net uniquement) : lu une fois pour reprendre la saisie, jamais réécrit. */
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

function estSaisie(valeur: unknown): valeur is SaisieFormulaire {
  return (
    estObjet(valeur) &&
    aSituationFamiliale(valeur) &&
    typeof valeur.sens === 'string' &&
    (SENS_CALCUL as readonly string[]).includes(valeur.sens) &&
    typeof valeur.montant === 'string' &&
    (valeur.montantAvantBascule === null || typeof valeur.montantAvantBascule === 'string')
  )
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

/** Saisie mémorisée (v2, sinon reprise v1), ou saisie par défaut. */
export function lireSaisieStockee(): SaisieFormulaire {
  const v2 = lireCle(CLE_STOCKAGE)
  if (estSaisie(v2)) {
    return v2
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
      // Un montant retape n'est plus « celui d'avant la bascule » : la bascule suivante reprendra le resultat.
      ...(champ === 'montant' ? { montantAvantBascule: null } : {}),
    }))
  }, [])

  /**
   * Change de sens. Nouveau montant : le montant d'avant la bascule s'il n'a pas ete modifie
   * (aller-retour exact), sinon montantRepris (le resultat affiche), sinon le montant actuel.
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
