import { useState, type ReactNode } from 'react'
import { useNavigationOnglets } from '../hooks/useNavigationOnglets'
import { fr } from '../i18n/fr'

export interface Onglet {
  id: string
  libelle: string
  contenu: ReactNode
}

/**
 * Onglets de résultats, sur le motif ARIA des onglets (spec ergonomie § 3.3). Le premier onglet est
 * toujours présent : c'est vers lui qu'on revient quand l'onglet choisi disparaît.
 */
export function OngletsResultats({ onglets }: { onglets: readonly [Onglet, ...Onglet[]] }) {
  const [choisi, setChoisi] = useState(onglets[0].id)
  // L'onglet choisi a disparu : on revient au premier, et ce choix tient s'il réapparaît.
  if (!onglets.some((o) => o.id === choisi)) {
    setChoisi(onglets[0].id)
  }
  const actif = onglets.find((o) => o.id === choisi) ?? onglets[0]

  const { refBouton, auClavier } = useNavigationOnglets(
    onglets.map((o) => o.id),
    actif.id,
    setChoisi,
  )

  return (
    <div>
      <div
        role="tablist"
        aria-label={fr.onglets.libelle}
        onKeyDown={auClavier}
        className="mb-3 flex gap-1 border-b border-slate-200 dark:border-slate-700"
      >
        {onglets.map((onglet) => {
          const selectionne = onglet.id === actif.id
          return (
            <button
              key={onglet.id}
              ref={refBouton(onglet.id)}
              type="button"
              role="tab"
              id={`onglet-${onglet.id}`}
              aria-selected={selectionne}
              aria-controls={`panneau-${onglet.id}`}
              tabIndex={selectionne ? 0 : -1}
              onClick={() => setChoisi(onglet.id)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                selectionne
                  ? 'border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-300'
                  : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              {onglet.libelle}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id={`panneau-${actif.id}`} aria-labelledby={`onglet-${actif.id}`} tabIndex={0}>
        {actif.contenu}
      </div>
    </div>
  )
}
