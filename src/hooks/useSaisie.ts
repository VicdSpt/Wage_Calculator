import { useCallback, useEffect, useState } from 'react'
import { REVENUS_CONJOINT } from '../engine/types'
import { SAISIE_PAR_DEFAUT, type SaisieFormulaire } from '../engine/validation'

export const CLE_STOCKAGE = 'wage-calculator:saisie:v1'

function estSaisie(valeur: unknown): valeur is SaisieFormulaire {
  if (typeof valeur !== 'object' || valeur === null) {
    return false
  }
  const v = valeur as Record<string, unknown>
  return (
    typeof v.brut === 'string' &&
    (v.etatCivil === 'isole' || v.etatCivil === 'marieOuCohabitant') &&
    typeof v.revenusConjoint === 'string' &&
    (REVENUS_CONJOINT as readonly string[]).includes(v.revenusConjoint) &&
    typeof v.enfantsACharge === 'string' &&
    typeof v.parentIsole === 'boolean'
  )
}

/** Saisie mémorisée, ou saisie par défaut si le stockage est vide, invalide ou inaccessible. */
export function lireSaisieStockee(): SaisieFormulaire {
  try {
    const texte = localStorage.getItem(CLE_STOCKAGE)
    if (texte === null) {
      return SAISIE_PAR_DEFAUT
    }
    const valeur: unknown = JSON.parse(texte)
    return estSaisie(valeur) ? valeur : SAISIE_PAR_DEFAUT
  } catch {
    return SAISIE_PAR_DEFAUT
  }
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
    setSaisie((precedente) => ({ ...precedente, [champ]: valeur }))
  }, [])

  return { saisie, modifier }
}