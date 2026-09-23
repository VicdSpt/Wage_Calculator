import { useCallback, useEffect, useState } from 'react'
import { CARBURANTS } from '../engine/atnVoiture'
import { REVENUS_CONJOINT } from '../engine/types'
import {
  MODES_ATN,
  SAISIE_AVANTAGES_PAR_DEFAUT,
  SAISIE_PAR_DEFAUT,
  SAISIE_PRIMES_PAR_DEFAUT,
  SAISIE_VOITURE_PAR_DEFAUT,
  SENS_CALCUL,
  type SaisieAvantages,
  type SaisieFormulaire,
  type SaisiePrimes,
  type SaisieVoiture,
} from '../engine/validation'

export const CLE_STOCKAGE = 'wage-calculator:saisie:v5'
/** Format V4 (sans primes annuelles) : lu pour reprendre la saisie, jamais réécrit. */
export const CLE_STOCKAGE_V4 = 'wage-calculator:saisie:v4'
/** Format V3 (ATN en montant seul, sans voiture) : lu pour reprendre la saisie, jamais réécrit. */
export const CLE_STOCKAGE_V3 = 'wage-calculator:saisie:v3'
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
  const booleens = ['titresRepasActif', 'teletravailActif', 'ecochequesActif', 'fraisPropresActif'] as const
  const chaines = ['joursPrestes', 'valeurFaciale', 'partTravailleur', 'teletravail', 'ecocheques', 'fraisPropres'] as const
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

function estSaisieVoiture(valeur: unknown): valeur is SaisieVoiture {
  if (!estObjet(valeur)) {
    return false
  }
  const chaines = ['valeurCatalogue', 'co2', 'premiereImmatriculation', 'contribution'] as const
  return (
    typeof valeur.mode === 'string' &&
    (MODES_ATN as readonly string[]).includes(valeur.mode) &&
    typeof valeur.carburant === 'string' &&
    (CARBURANTS as readonly string[]).includes(valeur.carburant) &&
    chaines.every((champ) => typeof valeur[champ] === 'string')
  )
}

function estSaisiePrimes(valeur: unknown): valeur is SaisiePrimes {
  if (!estObjet(valeur)) {
    return false
  }
  const booleens = ['treiziemeActif', 'peculeActif'] as const
  const chaines = ['treiziemePourcentage', 'treiziemeMoisPrestes', 'peculeMoisPrestes'] as const
  return booleens.every((champ) => typeof valeur[champ] === 'boolean') && chaines.every((champ) => typeof valeur[champ] === 'string')
}

function estSaisie(valeur: unknown): valeur is SaisieFormulaire {
  return (
    estSaisieV2(valeur) &&
    typeof (valeur as Objet).atn === 'string' &&
    estSaisieAvantages((valeur as Objet).avantages) &&
    estSaisieVoiture((valeur as Objet).voiture) &&
    estSaisiePrimes((valeur as Objet).primes)
  )
}

/**
 * Saisie d'une version antérieure, ou dont un bloc est corrompu : le montant, le sens et la
 * situation familiale restent valables ; chaque bloc absent ou invalide reprend sa valeur par défaut.
 */
function completer(valeur: Omit<SaisieFormulaire, 'avantages'>): SaisieFormulaire {
  const v = valeur as unknown as Objet
  return {
    ...valeur,
    atn: typeof v.atn === 'string' ? v.atn : SAISIE_PAR_DEFAUT.atn,
    avantages: estSaisieAvantages(v.avantages) ? v.avantages : SAISIE_AVANTAGES_PAR_DEFAUT,
    voiture: estSaisieVoiture(v.voiture) ? v.voiture : SAISIE_VOITURE_PAR_DEFAUT,
    primes: estSaisiePrimes(v.primes) ? v.primes : SAISIE_PRIMES_PAR_DEFAUT,
  }
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
    atn: '0',
    voiture: SAISIE_VOITURE_PAR_DEFAUT,
    primes: SAISIE_PRIMES_PAR_DEFAUT,
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

/** Saisie mémorisée (v5, sinon reprise v4, v3, v2, v1), ou saisie par défaut. */
export function lireSaisieStockee(): SaisieFormulaire {
  for (const cle of [CLE_STOCKAGE, CLE_STOCKAGE_V4, CLE_STOCKAGE_V3, CLE_STOCKAGE_V2]) {
    const valeur = lireCle(cle)
    if (estSaisie(valeur)) {
      return valeur
    }
    // Blocs absents (version antérieure) ou corrompus : on garde le reste de la saisie plutôt que
    // de se rabattre sur une clé plus ancienne, que les utilisateurs récents n'ont plus.
    if (estSaisieV2(valeur)) {
      return completer(valeur)
    }
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
