import type { Comparaison, ResumeOffre } from '../engine/comparaison'
import { fr } from '../i18n/fr'
import { formatEuro, formatPourcentage } from '../utils/format'

const TIRET = '—'

const euros = (centimes: number | null | undefined) => (centimes === null || centimes === undefined ? TIRET : formatEuro(centimes))

/** Écart signé : « + 1 234,56 € », « − 87,00 € » (vrai signe moins), « 0,00 € ». */
function ecartSigne(centimes: number | null | undefined): string {
  if (centimes === null || centimes === undefined) {
    return TIRET
  }
  if (centimes === 0) {
    return formatEuro(0)
  }
  return centimes > 0 ? `+ ${formatEuro(centimes)}` : `− ${formatEuro(-centimes)}`
}

function mobilite(offre: ResumeOffre | null): string {
  const t = fr.comparaison.mobilite
  if (offre === null) {
    return TIRET
  }
  switch (offre.choixMobilite) {
    case 'aucun':
      return t.aucun
    case 'voiture':
      return t.voiture(formatEuro(offre.atnMensuelCentimes))
    case 'budgetMobilite':
      return t.budgetMobilite
  }
}

interface Ligne {
  id: string
  libelle: string
  note?: string
  a: string
  b: string
  /** Chaîne vide : ligne sans écart (texte ou taux). */
  ecart: string
  total?: boolean
}

/** Tableau Offre A / Offre B / écart, à la place du récapitulatif (spec comparaison § 3). */
export function ComparaisonOffres({ comparaison }: { comparaison: Comparaison }) {
  const t = fr.comparaison
  const { a, b, ecarts } = comparaison
  const lignes: Ligne[] = [
    { id: 'brutMensuel', libelle: t.lignes.brutMensuel, a: euros(a?.brutMensuelCentimes), b: euros(b?.brutMensuelCentimes), ecart: ecartSigne(ecarts?.brutMensuel) },
    { id: 'brutAnnuel', libelle: t.lignes.brutAnnuel, a: euros(a?.brutAnnuelCentimes), b: euros(b?.brutAnnuelCentimes), ecart: ecartSigne(ecarts?.brutAnnuel) },
    { id: 'netVerse', libelle: t.lignes.netVerse, a: euros(a?.netVerseCentimes), b: euros(b?.netVerseCentimes), ecart: ecartSigne(ecarts?.netVerse) },
    {
      id: 'netAnnuelToutCompris',
      libelle: t.lignes.netAnnuelToutCompris,
      a: euros(a?.netAnnuelToutComprisCentimes),
      b: euros(b?.netAnnuelToutComprisCentimes),
      ecart: ecartSigne(ecarts?.netAnnuelToutCompris),
    },
  ]
  if (comparaison.afficherTitresRepas) {
    lignes.push({
      id: 'titresRepas',
      libelle: t.lignes.titresRepas,
      note: t.notes.titresRepas,
      a: euros(a?.titresRepasMensuelCentimes),
      b: euros(b?.titresRepasMensuelCentimes),
      ecart: ecartSigne(ecarts?.titresRepas),
    })
  }
  if (comparaison.afficherEcocheques) {
    lignes.push({
      id: 'ecocheques',
      libelle: t.lignes.ecocheques,
      note: t.notes.ecocheques,
      a: euros(a?.ecochequesAnnuelCentimes),
      b: euros(b?.ecochequesAnnuelCentimes),
      ecart: ecartSigne(ecarts?.ecocheques),
    })
  }
  lignes.push(
    { id: 'mobilite', libelle: t.lignes.mobilite, a: mobilite(a), b: mobilite(b), ecart: '' },
    {
      id: 'tauxRetour',
      libelle: t.lignes.tauxRetour,
      a: a ? formatPourcentage(a.tauxRetour) : TIRET,
      b: b ? formatPourcentage(b.tauxRetour) : TIRET,
      ecart: '',
    },
    {
      id: 'totalAnnuelEnPoche',
      libelle: t.lignes.totalAnnuelEnPoche,
      note: t.notes.totalAnnuelEnPoche,
      a: euros(comparaison.totalA),
      b: euros(comparaison.totalB),
      ecart: ecartSigne(ecarts?.totalAnnuelEnPoche),
      total: true,
    },
  )

  const ecartTotal = ecarts?.totalAnnuelEnPoche ?? 0
  const resume =
    comparaison.gagnante === 'B'
      ? t.resume.B(formatEuro(ecartTotal))
      : comparaison.gagnante === 'A'
        ? t.resume.A(formatEuro(-ecartTotal))
        : t.resume.egalite

  return (
    <section aria-labelledby="titre-comparaison" className="rounded-xl bg-blue-700 p-5 text-white shadow-sm dark:bg-blue-900">
      <h2 id="titre-comparaison" className="text-lg font-semibold">
        {t.titre}
      </h2>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="grid grid-cols-3 gap-x-2 text-blue-100 sm:table-row">
            <td className="hidden sm:table-cell" />
            <th scope="col" className="text-right font-medium sm:py-1">
              {t.offre('A')}
            </th>
            <th scope="col" className="text-right font-medium sm:py-1">
              {t.offre('B')}
            </th>
            <th scope="col" className="text-right font-medium sm:py-1">
              {t.ecart}
            </th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne) => (
            <tr
              key={ligne.id}
              className={`grid grid-cols-3 gap-x-2 border-t border-blue-500/50 py-2 sm:table-row sm:py-0 ${ligne.total ? 'text-base font-bold' : ''}`}
            >
              <th scope="row" className="col-span-3 text-left font-normal sm:py-2 sm:pr-2">
                <span className={ligne.total ? 'font-bold' : 'text-blue-100'}>{ligne.libelle}</span>
                {ligne.note && <span className="block text-xs text-blue-200">{ligne.note}</span>}
              </th>
              <td className="text-right tabular-nums sm:py-2">{ligne.a}</td>
              <td className="text-right tabular-nums sm:py-2">{ligne.b}</td>
              <td className="text-right tabular-nums sm:py-2">{ligne.ecart}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {comparaison.gagnante !== null && <p className="mt-3 font-semibold">{resume}</p>}
    </section>
  )
}
