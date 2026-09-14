import { useId, useState, type ReactNode } from 'react'
import { fr } from '../i18n/fr'

interface Props {
  libelle: string
  children: ReactNode
}

/** Bouton ⓘ qui déplie une explication. Échap la referme. */
export function InfoBulle({ libelle, children }: Props) {
  const [ouvert, setOuvert] = useState(false)
  const idPanneau = useId()

  return (
    <>
      <button
        type="button"
        aria-expanded={ouvert}
        aria-controls={idPanneau}
        aria-label={fr.detail.explicationDe(libelle)}
        onClick={() => setOuvert((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOuvert(false)
        }}
        className="inline-flex size-6 items-center justify-center rounded-full text-sm text-slate-500 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-slate-400 dark:hover:bg-slate-700"
      >
        ⓘ
      </button>
      <div
        id={idPanneau}
        hidden={!ouvert}
        className="basis-full rounded-md bg-slate-100 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        {children}
      </div>
    </>
  )
}