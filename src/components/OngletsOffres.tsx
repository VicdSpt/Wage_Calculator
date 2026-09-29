import type { ReactNode } from 'react'
import { useNavigationOnglets } from '../hooks/useNavigationOnglets'
import { OFFRES, type IdOffre } from '../hooks/useSaisie'
import { fr } from '../i18n/fr'

interface Props {
  active: IdOffre
  /** Offres dont la saisie est invalide : « ⚠ » sur leur onglet (spec comparaison § 2.2). */
  enErreur: Record<IdOffre, boolean>
  onChoisir: (id: IdOffre) => void
  /** Boutons affichés à droite des onglets, hors de la liste d'onglets. */
  actions?: ReactNode
}

/**
 * Barre d'onglets « Offre A » / « Offre B » du formulaire, sur le motif ARIA des onglets. Le
 * panneau qu'elle pilote est rendu par l'appelant (`FormulaireSituation`), qui garde le formulaire
 * à une place stable dans l'arbre React que l'offre B existe ou non (voir sa documentation).
 */
export function OngletsOffres({ active, enErreur, onChoisir, actions }: Props) {
  const t = fr.comparaison
  const { refBouton, auClavier } = useNavigationOnglets(OFFRES, active, onChoisir)
  return (
    <div className="mb-4 flex items-end justify-between gap-2 border-b border-slate-200 dark:border-slate-700">
      <div role="tablist" aria-label={t.offres} onKeyDown={auClavier} className="flex gap-1">
        {OFFRES.map((id) => {
          const selectionne = id === active
          return (
            <button
              key={id}
              ref={refBouton(id)}
              type="button"
              role="tab"
              id={`onglet-offre-${id}`}
              aria-selected={selectionne}
              aria-controls={`panneau-offre-${id}`}
              aria-label={enErreur[id] ? t.offreACorriger(id) : undefined}
              tabIndex={selectionne ? 0 : -1}
              onClick={() => onChoisir(id)}
              className={`-mb-px border-b-2 px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                selectionne
                  ? 'border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-300'
                  : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              {t.offre(id)}
              {enErreur[id] && <span aria-hidden="true"> ⚠</span>}
            </button>
          )
        })}
      </div>
      {actions && <div className="pb-2">{actions}</div>}
    </div>
  )
}
