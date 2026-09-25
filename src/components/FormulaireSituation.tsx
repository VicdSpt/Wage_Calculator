import { fr } from '../i18n/fr'
import type { ModifierSaisie } from './formulaire/champs'
import { SectionAvantages } from './formulaire/SectionAvantages'
import { SectionMobilite } from './formulaire/SectionMobilite'
import { SectionPrimes } from './formulaire/SectionPrimes'
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
  return (
    <section aria-labelledby="titre-formulaire" className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
      <h2 id="titre-formulaire" className="mb-4 text-lg font-semibold">
        {t.titre}
      </h2>
      <form className="space-y-5" onSubmit={(e) => e.preventDefault()} noValidate>
        <SectionSalaireFamille
          saisie={saisie}
          erreurs={erreurs}
          netMaxCentimes={netMaxCentimes}
          onChange={onChange}
          onBasculerSens={onBasculerSens}
        />
        <SectionMobilite saisie={saisie} erreurs={erreurs} apercuAtnCentimes={apercuAtnCentimes} onChange={onChange} />
        <SectionPrimes saisie={saisie} erreurs={erreurs} onChange={onChange} />
        <SectionAvantages
          saisie={saisie}
          erreurs={erreurs}
          plafondTeletravailCentimes={plafondTeletravailCentimes}
          plafondEcochequesCentimes={plafondEcochequesCentimes}
          onChange={onChange}
        />
      </form>
    </section>
  )
}
