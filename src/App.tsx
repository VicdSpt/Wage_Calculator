import { Avertissements } from './components/Avertissements'
import { DetailCalcul } from './components/DetailCalcul'
import { FormulaireSituation } from './components/FormulaireSituation'
import { Recapitulatif } from './components/Recapitulatif'
import { useCalcul } from './hooks/useCalcul'
import { useSaisie } from './hooks/useSaisie'
import { fr } from './i18n/fr'
import { dateIsoLocale } from './utils/format'

interface Props {
  /** Date des règles à appliquer (AAAA-MM-JJ). Par défaut : aujourd'hui. */
  dateIso?: string
}

export default function App({ dateIso = dateIsoLocale(new Date()) }: Props) {
  const { saisie, modifier } = useSaisie()
  const etat = useCalcul(saisie, dateIso)
  const resultat = etat.etat === 'ok' ? etat.resultat : null
  const erreurs = etat.etat === 'saisieInvalide' ? etat.erreurs : {}

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold">{fr.titre}</h1>
          <p className="text-slate-600 dark:text-slate-400">{fr.sousTitre}</p>
        </header>

        <Avertissements etat={etat} />

        <main className="grid gap-6 lg:grid-cols-2">
          <div className="order-2 lg:order-1 lg:row-span-2">
            <FormulaireSituation saisie={saisie} erreurs={erreurs} onChange={modifier} />
          </div>
          <div className="order-1 lg:order-2">
            <Recapitulatif resultat={resultat} />
          </div>
          <div className="order-3">
            <DetailCalcul resultat={resultat} />
          </div>
        </main>
      </div>
    </div>
  )
}