import type { ResultatComplet } from '../engine/remuneration'
import type { SensCalcul } from '../engine/validation'
import { fr } from '../i18n/fr'
import { formatDateFr, formatEuro, formatPourcentage } from '../utils/format'

interface Props {
  sens: SensCalcul
  complet: ResultatComplet | null
  brutCentimes: number | null
  /** Net versé demandé en net → brut, sinon null. */
  netCibleCentimes: number | null
  avantagesActifs: boolean
}

const euros = (centimes: number | null) => (centimes === null ? '—' : formatEuro(centimes))

function Poste({ libelle, montant, note, grand }: { libelle: string; montant: string; note?: string; grand?: boolean }) {
  return (
    <div className="col-span-2">
      <dt className="text-sm text-blue-100">{libelle}</dt>
      <dd className={`${grand ? 'text-4xl font-bold' : 'text-xl font-semibold'} tabular-nums`}>{montant}</dd>
      {note && <dd className="text-xs text-blue-100">{note}</dd>}
    </div>
  )
}

export function Recapitulatif({ sens, complet, brutCentimes, netCibleCentimes, avantagesActifs }: Props) {
  const t = fr.recapitulatif
  const brut = complet ? brutCentimes : null
  const avantages = complet?.avantages ?? null
  /** Titres-repas ou télétravail actifs : ce qui arrive sur le compte diffère du net légal. */
  const effetSurArgentVerse = avantages !== null && (avantages.retenueTitresCentimes > 0 || avantages.teletravailCentimes > 0)
  const ecart = complet && netCibleCentimes !== null ? complet.netVerseCentimes - netCibleCentimes : 0
  const detailNetVerse =
    complet && avantages && avantagesActifs
      ? t.detailNetVerse(
          formatEuro(complet.resultat.netMensuelCentimes),
          avantages.retenueTitresCentimes > 0 ? t.retenueTitres(formatEuro(avantages.retenueTitresCentimes)) : '',
          avantages.teletravailCentimes > 0 ? t.plusTeletravail(formatEuro(avantages.teletravailCentimes)) : '',
        )
      : undefined
  const titresRecus =
    complet && avantages && avantages.valeurFacialeParTitreCentimes > 0
      ? t.titresRecus(
          avantages.valeurTitresCentimes / avantages.valeurFacialeParTitreCentimes,
          formatEuro(avantages.valeurFacialeParTitreCentimes),
        )
      : undefined

  return (
    <section aria-labelledby="titre-recap" className="rounded-xl bg-blue-700 p-5 text-white shadow-sm dark:bg-blue-900">
      <h2 id="titre-recap" className="text-lg font-semibold">
        {t.titre[sens]}
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-4">
        {sens === 'brutVersNet' ? (
          <Poste
            libelle={avantagesActifs ? t.netVerse : t.netMensuel}
            montant={euros(complet ? complet.netVerseCentimes : null)}
            note={detailNetVerse}
            grand
          />
        ) : (
          <>
            <Poste libelle={t.brutNecessaire} montant={euros(brut)} grand />
            <Poste
              libelle={avantagesActifs ? t.netVerse : t.netObtenu}
              montant={euros(complet ? complet.netVerseCentimes : null)}
              note={ecart > 0 ? t.ecart(formatEuro(ecart)) : detailNetVerse}
            />
          </>
        )}

        {avantagesActifs && avantages && avantages.valeurTitresCentimes > 0 && (
          <>
            <Poste libelle={t.avantagesRecus} montant={euros(avantages.valeurTitresCentimes)} note={titresRecus} />
            <Poste libelle={t.totalMensuel} montant={euros(complet ? complet.totalMensuelCentimes : null)} />
          </>
        )}

        {avantagesActifs && avantages && avantages.ecochequesAnnuelCentimes > 0 && (
          <Poste libelle={t.ecocheques} montant={t.parAn(formatEuro(avantages.ecochequesAnnuelCentimes))} />
        )}

        <div>
          <dt className="text-sm text-blue-100">{sens === 'brutVersNet' ? t.netAnnuel : t.brutAnnuel}</dt>
          <dd className="text-xl font-semibold tabular-nums">
            {euros(
              complet === null
                ? null
                : sens === 'brutVersNet'
                  ? // La ligne annuelle suit le montant mis en avant : net versé quand un avantage
                    // modifie l'argent versé, net légal sinon (spec § 5.3).
                    effetSurArgentVerse
                    ? complet.netVerseCentimes * 12
                    : complet.resultat.netAnnuelCentimes
                  : brut === null
                    ? null
                    : brut * 12,
            )}
          </dd>
          <dd className="text-xs text-blue-100">{t.horsExtras}</dd>
        </div>
        <div>
          <dt className="text-sm text-blue-100">{t.tauxRetour}</dt>
          <dd className="text-xl font-semibold tabular-nums">{complet ? formatPourcentage(complet.resultat.tauxRetour) : '—'}</dd>
        </div>
      </dl>
      {complet && (
        <p className="mt-4 text-xs text-blue-100">
          {t.periode(formatDateFr(complet.resultat.periode.valideDu), formatDateFr(complet.resultat.periode.valideAu))}
        </p>
      )}
    </section>
  )
}
