import type { Resultat } from '../engine/types'
import { fr } from '../i18n/fr'
import { formatDateFr, formatEuro, formatPourcentage } from '../utils/format'

export function Recapitulatif({ resultat }: { resultat: Resultat | null }) {
  const t = fr.recapitulatif

  return (
    <section aria-labelledby="titre-recap" className="rounded-xl bg-blue-700 p-5 text-white shadow-sm dark:bg-blue-900">
      <h2 id="titre-recap" className="text-lg font-semibold">
        {t.titre}
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <dt className="text-sm text-blue-100">{t.netMensuel}</dt>
          <dd className="text-4xl font-bold tabular-nums">{resultat ? formatEuro(resultat.netMensuelCentimes) : '—'}</dd>
        </div>
        <div>
          <dt className="text-sm text-blue-100">{t.netAnnuel}</dt>
          <dd className="text-xl font-semibold tabular-nums">{resultat ? formatEuro(resultat.netAnnuelCentimes) : '—'}</dd>
          <dd className="text-xs text-blue-100">{t.horsExtras}</dd>
        </div>
        <div>
          <dt className="text-sm text-blue-100">{t.tauxRetour}</dt>
          <dd className="text-xl font-semibold tabular-nums">{resultat ? formatPourcentage(resultat.tauxRetour) : '—'}</dd>
        </div>
      </dl>
      {resultat && (
        <p className="mt-4 text-xs text-blue-100">
          {t.periode(formatDateFr(resultat.periode.valideDu), formatDateFr(resultat.periode.valideAu))}
        </p>
      )}
    </section>
  )
}