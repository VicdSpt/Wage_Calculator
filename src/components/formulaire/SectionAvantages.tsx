import type { CodeErreur, ErreursSaisie, SaisieAvantages, SaisieFormulaire } from '../../engine/validation'
import { fr } from '../../i18n/fr'
import { formatEuro } from '../../utils/format'
import { ChampAvantage, messageErreur, type ModifierSaisie } from './champs'

interface Props {
  saisie: SaisieFormulaire
  erreurs: ErreursSaisie
  /** Plafonds ONSS de la période, pour les aides sous les champs. null si le calcul n'aboutit pas. */
  plafondTeletravailCentimes: number | null
  plafondEcochequesCentimes: number | null
  onChange: ModifierSaisie
}

/** Avantages extralégaux : titres-repas, télétravail, éco-chèques, frais propres (spec ergonomie § 2). */
export function SectionAvantages({ saisie, erreurs, plafondTeletravailCentimes, plafondEcochequesCentimes, onChange }: Props) {
  const t = fr.formulaire
  const a = saisie.avantages
  const ta = t.avantages
  const modifierAvantage = <K extends keyof SaisieAvantages>(champ: K, valeur: SaisieAvantages[K]) =>
    onChange('avantages', { ...a, [champ]: valeur })
  const erreurTexte = (code: CodeErreur | undefined) => messageErreur(code, saisie.sens)

  return (
    <>
      <fieldset>
        <legend className="sr-only">{ta.titre}</legend>

        <label className="mt-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={a.titresRepasActif}
            onChange={(e) => modifierAvantage('titresRepasActif', e.target.checked)}
            className="size-4 accent-blue-700"
          />
          {ta.titresRepas}
        </label>
        {a.titresRepasActif && (
          <div className="mt-2 grid gap-3 border-l-2 border-slate-200 pl-3 sm:grid-cols-3 dark:border-slate-700">
            <ChampAvantage
              id="joursPrestes"
              libelle={ta.joursPrestes}
              valeur={a.joursPrestes}
              erreur={erreurTexte(erreurs.joursPrestes)}
              onChange={(valeur) => modifierAvantage('joursPrestes', valeur)}
            />
            <ChampAvantage
              id="valeurFaciale"
              libelle={ta.valeurFaciale}
              valeur={a.valeurFaciale}
              erreur={erreurTexte(erreurs.valeurFaciale)}
              onChange={(valeur) => modifierAvantage('valeurFaciale', valeur)}
            />
            <ChampAvantage
              id="partTravailleur"
              libelle={ta.partTravailleur}
              valeur={a.partTravailleur}
              erreur={erreurTexte(erreurs.partTravailleur)}
              onChange={(valeur) => modifierAvantage('partTravailleur', valeur)}
            />
          </div>
        )}

        <label className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={a.teletravailActif}
            onChange={(e) => modifierAvantage('teletravailActif', e.target.checked)}
            className="size-4 accent-blue-700"
          />
          {ta.teletravail}
        </label>
        {a.teletravailActif && (
          <div className="mt-2 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
            <ChampAvantage
              id="teletravail"
              libelle={ta.teletravailMontant}
              valeur={a.teletravail}
              aide={plafondTeletravailCentimes === null ? undefined : ta.plafond(formatEuro(plafondTeletravailCentimes))}
              erreur={erreurTexte(erreurs.teletravail)}
              onChange={(valeur) => modifierAvantage('teletravail', valeur)}
            />
          </div>
        )}

        <label className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={a.ecochequesActif}
            onChange={(e) => modifierAvantage('ecochequesActif', e.target.checked)}
            className="size-4 accent-blue-700"
          />
          {ta.ecocheques}
        </label>
        {a.ecochequesActif && (
          <div className="mt-2 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
            <ChampAvantage
              id="ecocheques"
              libelle={ta.ecochequesMontant}
              valeur={a.ecocheques}
              aide={plafondEcochequesCentimes === null ? undefined : ta.plafondAnnuel(formatEuro(plafondEcochequesCentimes))}
              erreur={erreurTexte(erreurs.ecocheques)}
              onChange={(valeur) => modifierAvantage('ecocheques', valeur)}
            />
          </div>
        )}

        <label className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={a.fraisPropresActif}
            onChange={(e) => modifierAvantage('fraisPropresActif', e.target.checked)}
            className="size-4 accent-blue-700"
          />
          {ta.fraisPropres}
        </label>
        {a.fraisPropresActif && (
          <div className="mt-2 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
            <ChampAvantage
              id="fraisPropres"
              libelle={ta.fraisPropresMontant}
              valeur={a.fraisPropres}
              aide={ta.aideFraisPropres}
              erreur={erreurTexte(erreurs.fraisPropres)}
              onChange={(valeur) => modifierAvantage('fraisPropres', valeur)}
            />
          </div>
        )}
      </fieldset>
    </>
  )
}
