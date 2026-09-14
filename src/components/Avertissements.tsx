import type { EtatCalcul } from '../hooks/useCalcul'
import { fr } from '../i18n/fr'
import { formatDateFr, formatEuro } from '../utils/format'

export function Avertissements({ etat }: { etat: EtatCalcul }) {
  return (
    <div className="space-y-3">
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
        {fr.bandeauEstimation}
      </p>
      {etat.etat === 'periodeNonCouverte' && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-100">
          {fr.alertes.periodeNonCouverte(formatDateFr(etat.dateIso))}
        </p>
      )}
      {etat.etat === 'saisieInvalide' && (
        <p role="status" className="text-sm text-slate-600 dark:text-slate-300">
          {fr.alertes.saisieInvalide}
        </p>
      )}
      {etat.etat === 'ok' && etat.brutCentimes < etat.rmmmgCentimes && (
        <p role="status" className="rounded-lg bg-slate-100 p-3 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-100">
          {fr.alertes.sousRmmmg(formatEuro(etat.rmmmgCentimes))}
        </p>
      )}
    </div>
  )
}