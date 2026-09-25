import type { CodeErreur, ErreursSaisie, SaisieFormulaire, SaisiePrimes } from '../../engine/validation'
import { fr } from '../../i18n/fr'
import { ChampAvantage } from './champs.tsx'
import { messageErreur, type ModifierSaisie } from './champs'

interface Props {
  saisie: SaisieFormulaire
  erreurs: ErreursSaisie
  onChange: ModifierSaisie
}

/** Treizième mois et pécule de vacances (spec ergonomie § 2). */
export function SectionPrimes({ saisie, erreurs, onChange }: Props) {
  const t = fr.formulaire
  const erreurTexte = (code: CodeErreur | undefined) => messageErreur(code, saisie.sens)

  const pr = saisie.primes
  const tp = t.primes
  const modifierPrime = <K extends keyof SaisiePrimes>(champ: K, valeur: SaisiePrimes[K]) => onChange('primes', { ...pr, [champ]: valeur })

  return (
    <>
      <fieldset>
        <legend className="sr-only">{tp.titre}</legend>

        <label className="mt-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={pr.treiziemeActif}
            onChange={(e) => modifierPrime('treiziemeActif', e.target.checked)}
            className="size-4 accent-blue-700"
          />
          {tp.treizieme}
        </label>
        {pr.treiziemeActif && (
          <div className="mt-2 grid gap-3 border-l-2 border-slate-200 pl-3 sm:grid-cols-2 dark:border-slate-700">
            <ChampAvantage
              id="treiziemePourcentage"
              libelle={tp.treiziemePourcentage}
              valeur={pr.treiziemePourcentage}
              aide={tp.aideTreiziemePourcentage}
              erreur={erreurTexte(erreurs.treiziemePourcentage)}
              onChange={(valeur) => modifierPrime('treiziemePourcentage', valeur)}
            />
            <ChampAvantage
              id="treiziemeMoisPrestes"
              libelle={tp.treiziemeMoisPrestes}
              valeur={pr.treiziemeMoisPrestes}
              erreur={erreurTexte(erreurs.treiziemeMoisPrestes)}
              onChange={(valeur) => modifierPrime('treiziemeMoisPrestes', valeur)}
            />
          </div>
        )}

        <label className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={pr.peculeActif}
            onChange={(e) => modifierPrime('peculeActif', e.target.checked)}
            className="size-4 accent-blue-700"
          />
          {tp.pecule}
        </label>
        {pr.peculeActif && (
          <div className="mt-2 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
            <ChampAvantage
              id="peculeMoisPrestes"
              libelle={tp.peculeMoisPrestes}
              valeur={pr.peculeMoisPrestes}
              aide={tp.aidePeculeMoisPrestes}
              erreur={erreurTexte(erreurs.peculeMoisPrestes)}
              onChange={(valeur) => modifierPrime('peculeMoisPrestes', valeur)}
            />
          </div>
        )}
      </fieldset>
    </>
  )
}
