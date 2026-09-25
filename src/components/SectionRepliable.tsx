import { useState, type ReactNode } from 'react'
import { fr } from '../i18n/fr'

interface Props {
  /** Préfixe des identifiants du bouton et du contenu. */
  id: string
  titre: string
  /** Une ligne qui résume le contenu, visible ouverte comme fermée. */
  resume: string
  /** Un champ de la section est en erreur : elle s'ouvre d'office et le signale. */
  aUneErreur: boolean
  children: ReactNode
}

/**
 * Bloc du formulaire qui se replie sur une ligne de résumé (spec ergonomie § 3.1). Fermé, son
 * contenu est retiré de la page ; la saisie, elle, vit plus haut et n'est pas perdue.
 */
export function SectionRepliable({ id, titre, resume, aUneErreur, children }: Props) {
  const [ouverte, setOuverte] = useState(aUneErreur)
  // Une erreur ouvre la section, et elle reste ouverte une fois l'erreur corrigée : sinon le champ
  // disparaîtrait au moment même où la saisie redevient valide.
  if (aUneErreur && !ouverte) {
    setOuverte(true)
  }
  const idContenu = `${id}-contenu`

  return (
    <div className="rounded-xl bg-white shadow-sm dark:bg-slate-900">
      <h3>
        <button
          type="button"
          aria-expanded={ouverte}
          aria-controls={idContenu}
          onClick={() => setOuverte((o) => aUneErreur || !o)}
          className="flex w-full items-center justify-between gap-4 rounded-xl p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <span className="flex items-center gap-2 font-semibold">
            <span aria-hidden="true">{ouverte ? '▾' : '▸'}</span>
            {titre}
          </span>
          <span className={aUneErreur ? 'text-sm font-medium text-red-700 dark:text-red-400' : 'text-sm text-slate-600 dark:text-slate-400'}>
            {aUneErreur ? fr.formulaire.resumes.aCorriger : resume}
          </span>
        </button>
      </h3>
      <div id={idContenu} hidden={!ouverte} className="space-y-5 px-5 pb-5">
        {ouverte && children}
      </div>
    </div>
  )
}
