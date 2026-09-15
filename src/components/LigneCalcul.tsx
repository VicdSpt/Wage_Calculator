import type { Ligne } from '../engine/types'
import { fr } from '../i18n/fr'
import { formatEuro } from '../utils/format'
import { InfoBulle } from './InfoBulle'

const SIGNE = { '+': '+ ', '-': '− ', '=': '' } as const

/** `explication` remplace le texte par défaut de la ligne (ex. brut trouvé en net → brut). */
export function LigneCalcul({ ligne, explication: explicationRemplacee }: { ligne: Ligne; explication?: string }) {
  const { libelle, explication: explicationParDefaut } = fr.lignes[ligne.id]
  const explication = explicationRemplacee ?? explicationParDefaut
  const total = ligne.sens === '='

  return (
    <li className={`flex flex-wrap items-center gap-x-2 gap-y-2 py-2 ${total ? 'font-semibold' : ''}`}>
      <span>{libelle}</span>
      <InfoBulle libelle={libelle}>
        <p>{explication}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {fr.detail.source} : {ligne.source}
        </p>
      </InfoBulle>
      <span className="ml-auto tabular-nums">
        {SIGNE[ligne.sens]}
        {formatEuro(ligne.montantCentimes)}
      </span>
    </li>
  )
}