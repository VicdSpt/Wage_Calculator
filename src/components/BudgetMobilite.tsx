import type { ResultatBudgetMobilite } from '../engine/budgetMobilite'
import { fr } from '../i18n/fr'
import { formatEuro } from '../utils/format'
import { LigneCalcul } from './LigneCalcul'

/** Le pilier 3 du budget mobilité, s'il est choisi et non nul (spec budget mobilité § 6). */
export function BudgetMobilite({ budget }: { budget: ResultatBudgetMobilite | null }) {
  const t = fr.budgetMobilite
  const resultat = budget && (budget.pilier3MensuelBrutCentimes !== 0 || budget.piliers1Et2AnnuelCentimes !== 0) ? budget : null
  return (
    <section aria-labelledby="titre-budget-mobilite" className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
      <h2 id="titre-budget-mobilite" className="mb-2 text-lg font-semibold">
        {t.titre}
      </h2>
      {resultat ? (
        <>
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            <LigneCalcul {...t.pilier3Brut} sens="=" montantCentimes={resultat.pilier3MensuelBrutCentimes} />
            <LigneCalcul {...t.cotisation} sens="-" montantCentimes={resultat.cotisationSpecialeCentimes} />
            <LigneCalcul {...t.net} sens="=" montantCentimes={resultat.pilier3MensuelNetCentimes} />
          </ul>
          <p className="mt-4 text-xs text-slate-600 dark:text-slate-400">
            {t.piliers1Et2(formatEuro(resultat.piliers1Et2AnnuelCentimes))}
          </p>
        </>
      ) : (
        <p className="text-slate-500">—</p>
      )}
    </section>
  )
}
