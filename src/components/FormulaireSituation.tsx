import { useEffect, useRef, type ComponentPropsWithoutRef } from 'react'
import type { VueAnnuelle } from '../engine/annuel'
import type { IdOffre } from '../hooks/useSaisie'
import { fr } from '../i18n/fr'
import type { ModifierSaisie } from './formulaire/champs'
import { resumeAvantages, resumeMobilite, resumePrimes, sectionsEnErreur } from './formulaire/resumes'
import { OngletsOffres } from './OngletsOffres'
import { SectionAvantages } from './formulaire/SectionAvantages'
import { SectionMobilite } from './formulaire/SectionMobilite'
import { SectionPrimes } from './formulaire/SectionPrimes'
import { SectionRepliable } from './SectionRepliable'
import { SectionSalaireFamille } from './formulaire/SectionSalaireFamille'
import type { ErreursSaisie, SaisieFormulaire } from '../engine/validation'

interface Props {
  saisie: SaisieFormulaire
  erreurs: ErreursSaisie
  /** Net maximal atteignable si le net demandé le dépasse, sinon null. */
  netMaxCentimes: number | null
  /** Plafonds ONSS de la période, pour les aides sous les champs. null si le calcul n'aboutit pas. */
  plafondTeletravailCentimes: number | null
  plafondEcochequesCentimes: number | null
  /** ATN mensuel calculé depuis la voiture, pour l'aperçu. null hors mode voiture ou si le calcul n'aboutit pas. */
  apercuAtnCentimes: number | null
  /** Vue annuelle du calcul abouti, sinon null (spec vue annuelle § 4.1). */
  annuel: VueAnnuelle | null
  /** Brut mensuel retenu par le calcul abouti, sinon null. */
  brutMensuelCentimes: number | null
  onChange: ModifierSaisie
  onBasculerSens: () => void
  onBasculerPeriode: () => void
  /** Comparaison en cours (offre ouverte, offres à corriger), ou null sans offre B. */
  comparaison: { offreActive: IdOffre; enErreur: Record<IdOffre, boolean> } | null
  onComparer: () => void
  onRetirerOffreB: () => void
  onChoisirOffre: (id: IdOffre) => void
}

export function FormulaireSituation({
  saisie,
  erreurs,
  netMaxCentimes,
  plafondTeletravailCentimes,
  plafondEcochequesCentimes,
  apercuAtnCentimes,
  annuel,
  brutMensuelCentimes,
  onChange,
  onBasculerSens,
  onBasculerPeriode,
  comparaison,
  onComparer,
  onRetirerOffreB,
  onChoisirOffre,
}: Props) {
  const t = fr.formulaire
  const enErreur = sectionsEnErreur(erreurs)
  const boutonComparerRef = useRef<HTMLButtonElement>(null)
  const enComparaisonRef = useRef(comparaison !== null)

  /**
   * Le formulaire garde sa place dans l'arbre React (voir plus bas) : ni « Comparer avec une autre
   * offre » ni « Retirer l'offre B » ne le démontent, donc React ne redonne pas le focus tout seul.
   * On le fait ici, à la transition seulement : sur l'onglet « Offre B » après la création de la
   * comparaison, sur le bouton « Comparer » après son retrait (spec comparaison § 2.1).
   */
  useEffect(() => {
    const enComparaison = comparaison !== null
    if (enComparaison !== enComparaisonRef.current) {
      enComparaisonRef.current = enComparaison
      if (enComparaison) {
        document.getElementById('onglet-offre-B')?.focus()
      } else {
        boutonComparerRef.current?.focus()
      }
    }
  }, [comparaison])

  const formulaire = (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()} noValidate>
      <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h3 className="mb-4 font-semibold">{t.salaireFamille}</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <SectionSalaireFamille
            saisie={saisie}
            erreurs={erreurs}
            netMaxCentimes={netMaxCentimes}
            annuel={annuel}
            brutMensuelCentimes={brutMensuelCentimes}
            onChange={onChange}
            onBasculerSens={onBasculerSens}
            onBasculerPeriode={onBasculerPeriode}
          />
        </div>
      </div>
      <SectionRepliable id="section-mobilite" titre={t.mobilite.titre} resume={resumeMobilite(saisie)} aUneErreur={enErreur.has('mobilite')}>
        <SectionMobilite saisie={saisie} erreurs={erreurs} apercuAtnCentimes={apercuAtnCentimes} onChange={onChange} />
      </SectionRepliable>
      <SectionRepliable id="section-primes" titre={t.primes.titre} resume={resumePrimes(saisie.primes)} aUneErreur={enErreur.has('primes')}>
        <SectionPrimes saisie={saisie} erreurs={erreurs} onChange={onChange} />
      </SectionRepliable>
      <SectionRepliable
        id="section-avantages"
        titre={t.avantages.titre}
        resume={resumeAvantages(saisie.avantages)}
        aUneErreur={enErreur.has('avantages')}
      >
        <SectionAvantages
          saisie={saisie}
          erreurs={erreurs}
          plafondTeletravailCentimes={plafondTeletravailCentimes}
          plafondEcochequesCentimes={plafondEcochequesCentimes}
          onChange={onChange}
        />
      </SectionRepliable>
    </form>
  )
  const bouton =
    'rounded-lg border border-blue-700 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-slate-800'
  // Le panneau n'a le rôle et l'étiquetage d'un tabpanel que si l'offre B existe ; sans elle, c'est
  // un simple conteneur. Dans les deux cas c'est le même élément, à la même place : voir l'effet
  // de focus ci-dessus, qui compte sur cette stabilité pour ne pas être annulé par un remontage.
  const panneauFormulaire: ComponentPropsWithoutRef<'div'> =
    comparaison === null
      ? {}
      : {
          role: 'tabpanel',
          id: `panneau-offre-${comparaison.offreActive}`,
          'aria-labelledby': `onglet-offre-${comparaison.offreActive}`,
        }
  return (
    <section aria-labelledby="titre-formulaire">
      <h2 id="titre-formulaire" className="sr-only">
        {t.titre}
      </h2>
      {comparaison === null ? (
        <div className="mb-4 flex justify-end">
          <button ref={boutonComparerRef} type="button" onClick={onComparer} className={bouton}>
            {fr.comparaison.comparer}
          </button>
        </div>
      ) : (
        <OngletsOffres
          active={comparaison.offreActive}
          enErreur={comparaison.enErreur}
          onChoisir={onChoisirOffre}
          actions={
            <button type="button" onClick={onRetirerOffreB} className={bouton}>
              {fr.comparaison.retirer}
            </button>
          }
        />
      )}
      <div {...panneauFormulaire}>{formulaire}</div>
    </section>
  )
}
