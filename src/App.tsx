import { AlertesCalcul, BandeauEstimation } from './components/Avertissements'
import { BudgetMobilite } from './components/BudgetMobilite'
import { ComparaisonOffres } from './components/ComparaisonOffres'
import { DetailCalcul } from './components/DetailCalcul'
import { FormulaireSituation } from './components/FormulaireSituation'
import { OngletsResultats, type Onglet } from './components/OngletsResultats'
import { PrimesAnnuelles } from './components/PrimesAnnuelles'
import { Recapitulatif } from './components/Recapitulatif'
import { comparerOffres } from './engine/comparaison'
import { resumerOffre, useCalcul } from './hooks/useCalcul'
import { useSaisie } from './hooks/useSaisie'
import { fr } from './i18n/fr'
import { centimesEnSaisie, dateIsoLocale } from './utils/format'

interface Props {
  /** Date des règles à appliquer (AAAA-MM-JJ). Par défaut : aujourd'hui. */
  dateIso?: string
}

export default function App({ dateIso = dateIsoLocale(new Date()) }: Props) {
  const { saisie, modifier, basculerSens, basculerPeriode, offreA, offreB, offreActive, ajouterOffreB, retirerOffreB, choisirOffre } = useSaisie()
  const etatA = useCalcul(offreA, dateIso)
  const etatB = useCalcul(offreB, dateIso)
  // Le formulaire, les alertes et le détail portent sur l'offre ouverte (spec comparaison § 3.1).
  const etat = offreActive === 'B' && etatB !== null ? etatB : etatA
  const comparaison =
    offreB !== null && etatB !== null ? comparerOffres(resumerOffre(etatA, offreA.choixMobilite), resumerOffre(etatB, offreB.choixMobilite)) : null
  const ok = etat.etat === 'ok' ? etat : null
  const erreurs = etat.etat === 'saisieInvalide' ? etat.erreurs : {}
  const netMaxCentimes = etat.etat === 'netHorsLimites' ? etat.netMaxCentimes : null

  /**
   * Au changement de sens, le champ reprend le montant opposé du résultat affiché. En revenant en
   * brut → net avec la période « par an », il reprend le brut annuel, pas le mensuel : sinon le
   * brut mensuel serait lu comme un annuel (spec vue annuelle § 3).
   */
  function basculer() {
    const montantRepris = ok
      ? centimesEnSaisie(
          ok.sens === 'brutVersNet'
            ? ok.complet.netVerseCentimes
            : saisie.periode === 'annuel'
              ? ok.annuel.brutAnnuelCentimes
              : ok.brutCentimes,
        )
      : null
    // Retour en brut → net après un net → brut resté sans résultat (net hors limites ou invalide) :
    // le montant laissé tel quel doit se relire en mensuel, pas en annuel. Priorité inchangée :
    // l'aller-retour exact via montantAvantBascule garde la période annuelle.
    const repasserEnMensuel = saisie.sens === 'netVersBrut' && saisie.periode === 'annuel' && ok === null && saisie.montantAvantBascule === null
    basculerSens(montantRepris, repasserEnMensuel)
  }

  /** Au changement de période, le champ reprend l'équivalent calculé ; saisie invalide : il est gardé. */
  function basculerLaPeriode() {
    const montantConverti =
      ok && ok.sens === 'brutVersNet' ? centimesEnSaisie(saisie.periode === 'mensuel' ? ok.annuel.brutAnnuelCentimes : ok.brutCentimes) : null
    basculerPeriode(montantConverti)
  }

  // La présence d'un onglet suit la saisie, pas le résultat : une correction de saisie qui invalide
  // un instant le calcul ne doit pas faire disparaître l'onglet choisi (spec ergonomie § 3.3).
  const ongletsResultats: [Onglet, ...Onglet[]] = [
    { id: 'detail', libelle: fr.onglets.detail, contenu: <DetailCalcul sens={saisie.sens} complet={ok?.complet ?? null} /> },
  ]
  if (saisie.primes.treiziemeActif || saisie.primes.peculeActif) {
    ongletsResultats.push({
      id: 'primes',
      libelle: fr.onglets.primes,
      contenu: <PrimesAnnuelles primes={ok?.primes ?? null} />,
    })
  }
  if (saisie.choixMobilite === 'budgetMobilite') {
    ongletsResultats.push({
      id: 'budgetMobilite',
      libelle: fr.onglets.budgetMobilite,
      contenu: <BudgetMobilite budget={ok?.complet.budgetMobilite ?? null} />,
    })
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
              annuel={ok?.annuel ?? null}
              brutMensuelCentimes={ok?.brutCentimes ?? null}
              onChange={modifier}
              onBasculerSens={basculer}
              onBasculerPeriode={basculerLaPeriode}
              comparaison={
                offreB === null
                  ? null
                  : { offreActive, enErreur: { A: etatA.etat === 'saisieInvalide', B: etatB?.etat === 'saisieInvalide' } }
              }
              onComparer={ajouterOffreB}
              onRetirerOffreB={retirerOffreB}
              onChoisirOffre={choisirOffre}
            />
          </div>
          <section
            aria-label={fr.resultats}
            className="order-1 space-y-4 lg:sticky lg:top-4 lg:order-2 lg:col-span-5 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
          >
            <AlertesCalcul etat={etat} />
            {comparaison ? (
              <ComparaisonOffres comparaison={comparaison} />
            ) : (
              <Recapitulatif
                sens={saisie.sens}
                complet={ok?.complet ?? null}
                brutCentimes={ok?.brutCentimes ?? null}
                netCibleCentimes={ok?.netCibleCentimes ?? null}
                avantagesActifs={etat.avantagesActifs}
                annuel={ok?.annuel ?? null}
              />
            )}
            {comparaison && <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{fr.comparaison.detailDe(offreActive)}</p>}
            <OngletsResultats onglets={ongletsResultats} />
          </section>
        </main>
      </div>
    </div>
  )
}
