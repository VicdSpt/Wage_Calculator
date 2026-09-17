import { fr } from '../i18n/fr'
import { formatEuro } from '../utils/format'
import { InfoBulle } from './InfoBulle'

const SIGNE = { '+': '+ ', '-': '− ', '=': '' } as const

interface Props {
  libelle: string
  explication: string
  sens: '+' | '-' | '='
  montantCentimes: number
  source: string
}

export function LigneCalcul({ libelle, explication, sens, montantCentimes, source }: Props) {
  const total = sens === '='

  return (
    <li className={`flex flex-wrap items-center gap-x-2 gap-y-2 py-2 ${total ? 'font-semibold' : ''}`}>
      <span>{libelle}</span>
      <InfoBulle libelle={libelle}>
        <p>{explication}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {fr.detail.source} : {source}
        </p>
      </InfoBulle>
      <span className="ml-auto tabular-nums">
        {SIGNE[sens]}
        {formatEuro(montantCentimes)}
      </span>
    </li>
  )
}
