import type { ResolutionAtn } from '../engine/atnVoiture'
import type { ResultatComplet } from '../engine/remuneration'
import type { SensCalcul } from '../engine/validation'
import { fr } from '../i18n/fr'
import { formatDixMilliemes, formatEuro } from '../utils/format'
import { LigneCalcul } from './LigneCalcul'

/** Explication et source de la ligne ATN quand elle vient de la voiture ou d'une contribution ; sinon null. */
function surchargeAtn(atn: ResolutionAtn): { explication: string; source: string } | null {
  const t = fr.atnVoiture
  const contribution = atn.contributionCentimes > 0 ? t.contribution(formatEuro(atn.contributionCentimes)) : ''
  if (atn.voiture === null) {
    return contribution === '' ? null : { explication: `${fr.lignes.atn.explication}${contribution}`, source: 'Saisie' }
  }
  const v = atn.voiture
  return {
    explication:
      t.explication({
        valeur: formatEuro(v.valeurCatalogueCentimes),
        age: formatDixMilliemes(v.coefficientAgeDixMilliemes),
        pourcentage: formatDixMilliemes(v.pourcentageCo2DixMilliemes),
        annuelFormule: formatEuro(v.annuelFormuleCentimes),
        minimum: v.minimumAppliqueCentimes === null ? null : formatEuro(v.minimumAppliqueCentimes),
        mensuel: formatEuro(v.mensuelCentimes),
      }) + contribution,
    source: t.source,
  }
}

/** Lignes des avantages, ajoutées après le net légal quand il y en a. */
function lignesAvantages(complet: ResultatComplet) {
  const { retenueTitresCentimes, teletravailCentimes, fraisPropresCentimes } = complet.avantages
  const contributionCentimes = complet.atn.contributionCentimes
  if (retenueTitresCentimes === 0 && teletravailCentimes === 0 && fraisPropresCentimes === 0 && contributionCentimes === 0) {
    return []
  }
  const l = fr.lignesAvantages
  return [
    ...(retenueTitresCentimes > 0
      ? [{ cle: 'retenueTitres', ...l.retenueTitres, sens: '-' as const, montantCentimes: retenueTitresCentimes }]
      : []),
    ...(teletravailCentimes > 0
      ? [{ cle: 'teletravail', ...l.teletravail, sens: '+' as const, montantCentimes: teletravailCentimes }]
      : []),
    ...(fraisPropresCentimes > 0
      ? [{ cle: 'fraisPropres', ...l.fraisPropres, sens: '+' as const, montantCentimes: fraisPropresCentimes }]
      : []),
    ...(contributionCentimes > 0
      ? [{ cle: 'contributionVoiture', ...l.contributionVoiture, sens: '-' as const, montantCentimes: contributionCentimes }]
      : []),
    { cle: 'netVerse', ...l.netVerse, sens: '=' as const, montantCentimes: complet.netVerseCentimes },
  ]
}

export function DetailCalcul({ sens, complet }: { sens: SensCalcul; complet: ResultatComplet | null }) {
  return (
    <section aria-labelledby="titre-detail" className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
      <h2 id="titre-detail" className="mb-2 text-lg font-semibold">
        {fr.detail.titre}
      </h2>
      {complet ? (
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {complet.resultat.lignes.map((ligne) => {
            const surcharge = ligne.id === 'atn' ? surchargeAtn(complet.atn) : null
            return (
              <LigneCalcul
                key={ligne.id}
                libelle={fr.lignes[ligne.id].libelle}
                explication={
                  surcharge?.explication ??
                  (sens === 'netVersBrut' && ligne.id === 'brut' ? fr.detail.explicationBrutTrouve : fr.lignes[ligne.id].explication)
                }
                sens={ligne.sens}
                montantCentimes={ligne.montantCentimes}
                source={surcharge?.source ?? ligne.source}
              />
            )
          })}
          {lignesAvantages(complet).map(({ cle, ...ligne }) => (
            <LigneCalcul key={cle} {...ligne} />
          ))}
        </ul>
      ) : (
        <p className="text-slate-500">—</p>
      )}
    </section>
  )
}
