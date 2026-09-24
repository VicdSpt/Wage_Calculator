import type { ResultatBudgetMobilite } from '../engine/budgetMobilite'
import { fr } from '../i18n/fr'
import { formatEuro } from '../utils/format'
import { LigneCalcul } from './LigneCalcul'

/** Le pilier 3 du budget mobilité, s'il est choisi et non nul (spec budget mobilité § 6). */
export function BudgetMobilite({ budget }: { budget: ResultatBudgetMobilite | null }) {
  const t = fr.budgetMobilite
  if (budget === null || (budget.pilier3MensuelBrutCentimes === 0 && budget.piliers1Et2AnnuelCentimes === 0)) {
    return null
  }
  return (
    <section aria-labelledby="titre-budget-mobilite" className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
      <h2 id="titre-budget-mobilite" className="mb-2 text-lg font-semibold">
        {t.titre}
      </h2>
      <ul className="divide-y divide-slate-200 dark:divide-slate-700">
        <LigneCalcul {...t.pilier3Brut} sens="=" montantCentimes={budget.pilier3MensuelBrutCentimes} />
        <LigneCalcul {...t.cotisation} sens="-" montantCentimes={budget.cotisationSpecialeCentimes} />
        <LigneCalcul {...t.net} sens="=" montantCentimes={budget.pilier3MensuelNetCentimes} />
      </ul>
      <p className="mt-4 text-xs text-slate-600 dark:text-slate-400">
        {t.piliers1Et2(formatEuro(budget.piliers1Et2AnnuelCentimes))}
      </p>
    </section>
  )
}
