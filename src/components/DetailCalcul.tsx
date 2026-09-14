import type { Resultat } from '../engine/types'
import { fr } from '../i18n/fr'
import { LigneCalcul } from './LigneCalcul'

export function DetailCalcul({ resultat }: { resultat: Resultat | null }) {
  return (
    <section aria-labelledby="titre-detail" className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
      <h2 id="titre-detail" className="mb-2 text-lg font-semibold">
        {fr.detail.titre}
      </h2>
      {resultat ? (
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {resultat.lignes.map((ligne) => (
            <LigneCalcul key={ligne.id} ligne={ligne} />
          ))}
        </ul>
      ) : (
        <p className="text-slate-500">—</p>
      )}
    </section>
  )
}