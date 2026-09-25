import type { CodeAlerteAvantage } from '../engine/avantages'
import type { EtatCalcul } from '../hooks/useCalcul'
import { fr } from '../i18n/fr'
import { formatDateFr, formatEuro } from '../utils/format'

/** Montant saisi et plafond officiel à citer dans le message d'une alerte. */
function montantsAlerte(code: CodeAlerteAvantage, etat: Extract<EtatCalcul, { etat: 'ok' }>): [number, number] {
  const a = etat.complet.avantages
  const p = etat.plafondsAvantages
  switch (code) {
    case 'partPatronaleTitres':
      return [a.partPatronaleParTitreCentimes, p.titresRepasPartPatronaleMaxCentimes]
    case 'partTravailleurTitres':
      return [a.partTravailleurParTitreCentimes, p.titresRepasPartTravailleurMinCentimes]
    case 'valeurFacialeTitres':
      return [a.valeurFacialeParTitreCentimes, p.titresRepasValeurFacialeMaxCentimes]
    case 'teletravail':
      return [a.teletravailCentimes, p.teletravailMaxCentimes]
    case 'ecocheques':
      return [a.ecochequesAnnuelCentimes, p.ecochequesMaxAnnuelCentimes]
  }
}

/** Bandeau fixe, en haut de page (spec ergonomie § 2). */
export function BandeauEstimation({ avantagesActifs }: { avantagesActifs: boolean }) {
  return (
    <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      {fr.bandeauEstimation}
      {avantagesActifs ? ` ${fr.alertes.conditionsAvantages}` : ''}
    </p>
  )
}

/** Alertes qui dépendent de la saisie, affichées au-dessus du récapitulatif (spec ergonomie § 2). */
export function AlertesCalcul({ etat }: { etat: EtatCalcul }) {
  const ok = etat.etat === 'ok' ? etat : null

  return (
    <div className="space-y-3 empty:hidden">
      {etat.etat === 'periodeNonCouverte' && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-100">
          {fr.alertes.periodeNonCouverte(formatDateFr(etat.dateIso))}
        </p>
      )}
      {(etat.etat === 'saisieInvalide' || etat.etat === 'netHorsLimites') && (
        <p role="status" className="text-sm text-slate-600 dark:text-slate-300">
          {fr.alertes.saisieInvalide}
        </p>
      )}
      {ok && ok.brutCentimes < ok.rmmmgCentimes && (
        <p role="status" className="rounded-lg bg-slate-100 p-3 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-100">
          {fr.alertes.sousRmmmg(formatEuro(ok.rmmmgCentimes))}
        </p>
      )}
      {ok?.complet.budgetMobilite.horsBornes && (
        <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {fr.alertes.budgetMobiliteHorsBornes(
            formatEuro(ok.complet.budgetMobilite.budgetAnnuelCentimes),
            formatEuro(ok.parametresBudgetMobilite.budgetAnnuelMinCentimes),
            formatEuro(ok.parametresBudgetMobilite.budgetAnnuelMaxCentimes),
          )}
        </p>
      )}
      {ok?.complet.avantages.alertes.map((code) => {
        const [montant, plafond] = montantsAlerte(code, ok)
        return (
          <p
            key={code}
            role="status"
            className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100"
          >
            {fr.alertes.avantages[code](formatEuro(montant), formatEuro(plafond))}
          </p>
        )
      })}
    </div>
  )
}
