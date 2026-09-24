import { appliquerTaux, diviserArrondi } from './argent'
import type { Parametres } from './parametres/types'

const MOIS_PAR_AN = 12

/** Budget mobilité, déjà validé (spec budget mobilité § 3.1). */
export interface BudgetMobiliteSaisi {
  /** Budget annuel total accordé par l'employeur. */
  budgetAnnuelCentimes: number
  /** Part prise en cash (pilier 3) ; le reste finance les piliers 1 et 2. */
  pilier3AnnuelCentimes: number
}

export const BUDGET_MOBILITE_AUCUN: BudgetMobiliteSaisi = {
  budgetAnnuelCentimes: 0,
  pilier3AnnuelCentimes: 0,
}

export interface ResultatBudgetMobilite {
  pilier3MensuelBrutCentimes: number
  cotisationSpecialeCentimes: number
  /** Ce qui s'ajoute au net versé du mois. */
  pilier3MensuelNetCentimes: number
  /** Budget non pris en cash : piliers 1 et 2, exonérés. Informatif, jamais dans un calcul. */
  piliers1Et2AnnuelCentimes: number
  /** Budget annuel hors des bornes légales de la période. Un budget nul n'est pas un dépassement. */
  horsBornes: boolean
}

function verifierBornes(budget: BudgetMobiliteSaisi): void {
  for (const montant of [budget.budgetAnnuelCentimes, budget.pilier3AnnuelCentimes]) {
    if (!Number.isSafeInteger(montant) || montant < 0) {
      throw new RangeError(`Montant de budget mobilité invalide : ${montant}`)
    }
  }
  if (budget.pilier3AnnuelCentimes > budget.budgetAnnuelCentimes) {
    throw new RangeError(
      `Part en cash (${budget.pilier3AnnuelCentimes}) supérieure au budget (${budget.budgetAnnuelCentimes})`,
    )
  }
}

/**
 * Pilier 3 du budget mobilité : le solde pris en cash, mensualisé, diminué de sa cotisation
 * spéciale de sécurité sociale (spec budget mobilité § 3.1). Exonéré d'impôt : il n'entre ni dans
 * la base du précompte ni dans celle de l'ONSS ordinaire, seulement dans le net versé.
 */
export function calculerBudgetMobilite(budget: BudgetMobiliteSaisi, parametres: Parametres): ResultatBudgetMobilite {
  verifierBornes(budget)
  const p = parametres.budgetMobilite
  const pilier3MensuelBrutCentimes = diviserArrondi(budget.pilier3AnnuelCentimes, MOIS_PAR_AN)
  const cotisationSpecialeCentimes = appliquerTaux(pilier3MensuelBrutCentimes, p.tauxCotisationSpecialeDixMilliemes)
  return {
    pilier3MensuelBrutCentimes,
    cotisationSpecialeCentimes,
    pilier3MensuelNetCentimes: pilier3MensuelBrutCentimes - cotisationSpecialeCentimes,
    piliers1Et2AnnuelCentimes: budget.budgetAnnuelCentimes - budget.pilier3AnnuelCentimes,
    horsBornes:
      budget.budgetAnnuelCentimes > 0 &&
      (budget.budgetAnnuelCentimes < p.budgetAnnuelMinCentimes || budget.budgetAnnuelCentimes > p.budgetAnnuelMaxCentimes),
  }
}
