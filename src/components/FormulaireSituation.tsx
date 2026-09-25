import { fr } from '../i18n/fr'
import type { ModifierSaisie } from './formulaire/champs'
import { resumeAvantages, resumeMobilite, resumePrimes, sectionsEnErreur } from './formulaire/resumes'
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
  onChange: ModifierSaisie
  onBasculerSens: () => void
}

export function FormulaireSituation({
  saisie,
  erreurs,
  netMaxCentimes,
  plafondTeletravailCentimes,
  plafondEcochequesCentimes,
  apercuAtnCentimes,
  onChange,
  onBasculerSens,
}: Props) {
  const t = fr.formulaire
  const enErreur = sectionsEnErreur(erreurs)
  return (
    <section aria-labelledby="titre-formulaire">
      <h2 id="titre-formulaire" className="sr-only">
        {t.titre}
      </h2>
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()} noValidate>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
          <h3 className="mb-4 font-semibold">{t.salaireFamille}</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <SectionSalaireFamille
              saisie={saisie}
              erreurs={erreurs}
              netMaxCentimes={netMaxCentimes}
              onChange={onChange}
              onBasculerSens={onBasculerSens}
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
    </section>
  )
}
