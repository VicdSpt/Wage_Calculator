import { Avertissements } from './components/Avertissements'
import { DetailCalcul } from './components/DetailCalcul'
import { FormulaireSituation } from './components/FormulaireSituation'
import { Recapitulatif } from './components/Recapitulatif'
import { useCalcul } from './hooks/useCalcul'
import { useSaisie } from './hooks/useSaisie'
import { fr } from './i18n/fr'
import { centimesEnSaisie, dateIsoLocale } from './utils/format'

interface Props {
  /** Date des règles à appliquer (AAAA-MM-JJ). Par défaut : aujourd'hui. */
  dateIso?: string
}

export default function App({ dateIso = dateIsoLocale(new Date()) }: Props) {
  const { saisie, modifier, basculerSens } = useSaisie()
  const etat = useCalcul(saisie, dateIso)
  const ok = etat.etat === 'ok' ? etat : null
  const erreurs = etat.etat === 'saisieInvalide' ? etat.erreurs : {}
  const netMaxCentimes = etat.etat === 'netHorsLimites' ? etat.netMaxCentimes : null

  /** Au changement de sens, le champ reprend le montant opposé du résultat affiché. */
  function basculer() {
    const montantRepris = ok ? centimesEnSaisie(ok.sens === 'brutVersNet' ? ok.complet.netVerseCentimes : ok.brutCentimes) : null
    basculerSens(montantRepris)
  }

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
            <FormulaireSituation
              saisie={saisie}
              erreurs={erreurs}
              netMaxCentimes={netMaxCentimes}
              plafondTeletravailCentimes={etat.plafondsAvantages?.teletravailMaxCentimes ?? null}
              plafondEcochequesCentimes={etat.plafondsAvantages?.ecochequesMaxAnnuelCentimes ?? null}
              apercuAtnCentimes={ok?.complet.atn.voiture?.mensuelCentimes ?? null}
              onChange={modifier}
              onBasculerSens={basculer}
            />
          </div>
          <div className="order-1 lg:order-2">
            <Recapitulatif
              sens={saisie.sens}
              complet={ok?.complet ?? null}
              brutCentimes={ok?.brutCentimes ?? null}
              netCibleCentimes={ok?.netCibleCentimes ?? null}
              avantagesActifs={etat.avantagesActifs}
            />
          </div>
          <div className="order-3">
            <DetailCalcul sens={saisie.sens} complet={ok?.complet ?? null} />
          </div>
        </main>
      </div>
    </div>
  )
}
