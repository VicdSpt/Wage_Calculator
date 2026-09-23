import type { ResultatAllocation } from '../engine/allocationsExceptionnelles'
import type { ResultatPrimes } from '../engine/primesAnnuelles'
import { fr } from '../i18n/fr'
import { formatDixMilliemes, formatEuro } from '../utils/format'
import { LigneCalcul } from './LigneCalcul'

interface TexteLigne {
  libelle: string
  explication: string
  source: string
}

function Prime({ titre, resultat, retenue }: { titre: string; resultat: ResultatAllocation; retenue: TexteLigne }) {
  const t = fr.primes
  const explicationPrecompte = t.explicationPrecompte({
    taux: formatDixMilliemes(resultat.tauxPrecompteDixMilliemes),
    base: formatEuro(resultat.baseAnnuelleCentimes),
    tranche: resultat.trancheJusquaCentimes === null ? null : formatEuro(resultat.trancheJusquaCentimes),
    reduction: resultat.reductionEnfantsDixMilliemes === 0 ? null : formatDixMilliemes(resultat.reductionEnfantsDixMilliemes),
  })
  return (
    <div>
      <h3 className="font-medium">{titre}</h3>
      <ul className="divide-y divide-slate-200 dark:divide-slate-700">
        <LigneCalcul {...t.brut} sens="=" montantCentimes={resultat.brutCentimes} />
        <LigneCalcul {...retenue} sens="-" montantCentimes={resultat.retenueSocialeCentimes} />
        <LigneCalcul
          libelle={t.precompte.libelle}
          explication={explicationPrecompte}
          source={t.precompte.source}
          sens="-"
          montantCentimes={resultat.precompteCentimes}
        />
        <LigneCalcul {...t.net} sens="=" montantCentimes={resultat.netCentimes} />
      </ul>
    </div>
  )
}

/** Le 13e mois et le double pécule, chacun avec son détail (spec primes annuelles § 5.2). */
export function PrimesAnnuelles({ primes }: { primes: ResultatPrimes | null }) {
  const t = fr.primes
  if (primes === null || (primes.treizieme === null && primes.pecule === null)) {
    return null
  }
  return (
    <section aria-labelledby="titre-primes" className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
      <h2 id="titre-primes" className="mb-2 text-lg font-semibold">
        {t.titre}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {primes.treizieme && <Prime titre={t.treizieme} resultat={primes.treizieme} retenue={t.retenueOnss} />}
        {primes.pecule && <Prime titre={t.pecule} resultat={primes.pecule} retenue={t.retenuePecule} />}
      </div>
      <p className="mt-4 text-xs text-slate-600 dark:text-slate-400">{t.noteCotisationSpeciale}</p>
    </section>
  )
}
