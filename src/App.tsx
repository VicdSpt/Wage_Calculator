import { AlertesCalcul, BandeauEstimation } from './components/Avertissements'
import { BudgetMobilite } from './components/BudgetMobilite'
import { DetailCalcul } from './components/DetailCalcul'
import { FormulaireSituation } from './components/FormulaireSituation'
import { OngletsResultats, type Onglet } from './components/OngletsResultats'
import { PrimesAnnuelles } from './components/PrimesAnnuelles'
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

  const ongletsResultats: [Onglet, ...Onglet[]] = [
    { id: 'detail', libelle: fr.onglets.detail, contenu: <DetailCalcul sens={saisie.sens} complet={ok?.complet ?? null} /> },
  ]
  if (ok && (ok.primes.treizieme !== null || ok.primes.pecule !== null)) {
    ongletsResultats.push({ id: 'primes', libelle: fr.onglets.primes, contenu: <PrimesAnnuelles primes={ok.primes} /> })
  }
  const budget = ok?.complet.budgetMobilite ?? null
  if (
    saisie.choixMobilite === 'budgetMobilite' &&
    budget !== null &&
    (budget.pilier3MensuelBrutCentimes > 0 || budget.piliers1Et2AnnuelCentimes > 0)
  ) {
    ongletsResultats.push({ id: 'budgetMobilite', libelle: fr.onglets.budgetMobilite, contenu: <BudgetMobilite budget={budget} /> })
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold">{fr.titre}</h1>
          <p className="text-slate-600 dark:text-slate-400">{fr.sousTitre}</p>
        </header>

        <BandeauEstimation avantagesActifs={etat.avantagesActifs} />

        <main className="grid gap-6 lg:grid-cols-12 lg:items-start">
          <div className="order-2 lg:order-1 lg:col-span-7">
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
          <section
            aria-label={fr.resultats}
            className="order-1 space-y-4 lg:sticky lg:top-4 lg:order-2 lg:col-span-5 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
          >
            <AlertesCalcul etat={etat} />
            <Recapitulatif
              sens={saisie.sens}
              complet={ok?.complet ?? null}
              brutCentimes={ok?.brutCentimes ?? null}
              netCibleCentimes={ok?.netCibleCentimes ?? null}
              avantagesActifs={etat.avantagesActifs}
            />
            <OngletsResultats onglets={ongletsResultats} />
          </section>
        </main>
      </div>
    </div>
  )
}
