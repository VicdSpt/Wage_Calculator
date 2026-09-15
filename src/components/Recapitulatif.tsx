import type { Resultat } from '../engine/types'
import type { SensCalcul } from '../engine/validation'
import { fr } from '../i18n/fr'
import { formatDateFr, formatEuro, formatPourcentage } from '../utils/format'

interface Props {
  sens: SensCalcul
  resultat: Resultat | null
  brutCentimes: number | null
  /** Net demandé en net → brut, sinon null. */
  netCibleCentimes: number | null
}

const euros = (centimes: number | null) => (centimes === null ? '—' : formatEuro(centimes))

export function Recapitulatif({ sens, resultat, brutCentimes, netCibleCentimes }: Props) {
  const t = fr.recapitulatif
  const brut = resultat ? brutCentimes : null
  const ecart = resultat && netCibleCentimes !== null ? resultat.netMensuelCentimes - netCibleCentimes : 0

  return (
    <section aria-labelledby="titre-recap" className="rounded-xl bg-blue-700 p-5 text-white shadow-sm dark:bg-blue-900">
      <h2 id="titre-recap" className="text-lg font-semibold">
        {t.titre[sens]}
      </h2>
      {sens === 'brutVersNet' ? (
        <dl className="mt-3 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <dt className="text-sm text-blue-100">{t.netMensuel}</dt>
            <dd className="text-4xl font-bold tabular-nums">{euros(resultat ? resultat.netMensuelCentimes : null)}</dd>
          </div>
          <div>
            <dt className="text-sm text-blue-100">{t.netAnnuel}</dt>
            <dd className="text-xl font-semibold tabular-nums">{euros(resultat ? resultat.netAnnuelCentimes : null)}</dd>
            <dd className="text-xs text-blue-100">{t.horsExtras}</dd>
          </div>
          <div>
            <dt className="text-sm text-blue-100">{t.tauxRetour}</dt>
            <dd className="text-xl font-semibold tabular-nums">{resultat ? formatPourcentage(resultat.tauxRetour) : '—'}</dd>
          </div>
        </dl>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <dt className="text-sm text-blue-100">{t.brutNecessaire}</dt>
            <dd className="text-4xl font-bold tabular-nums">{euros(brut)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-sm text-blue-100">{t.netObtenu}</dt>
            <dd className="text-xl font-semibold tabular-nums">{euros(resultat ? resultat.netMensuelCentimes : null)}</dd>
            {ecart > 0 && <dd className="text-xs text-blue-100">{t.ecart(formatEuro(ecart))}</dd>}
          </div>
          <div>
            <dt className="text-sm text-blue-100">{t.brutAnnuel}</dt>
            <dd className="text-xl font-semibold tabular-nums">{euros(brut === null ? null : brut * 12)}</dd>
            <dd className="text-xs text-blue-100">{t.horsExtras}</dd>
          </div>
          <div>
            <dt className="text-sm text-blue-100">{t.tauxRetour}</dt>
            <dd className="text-xl font-semibold tabular-nums">{resultat ? formatPourcentage(resultat.tauxRetour) : '—'}</dd>
          </div>
        </dl>
      )}
      {resultat && (
        <p className="mt-4 text-xs text-blue-100">
          {t.periode(formatDateFr(resultat.periode.valideDu), formatDateFr(resultat.periode.valideAu))}
        </p>
      )}
    </section>
  )
}
