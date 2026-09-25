import { CARBURANTS, type Carburant } from '../../engine/atnVoiture'
import { CHOIX_MOBILITE, type ChoixMobilite } from '../../engine/avantages'
import {
  MODES_ATN,
  type CodeErreur,
  type ErreursSaisie,
  type SaisieBudgetMobilite,
  type SaisieFormulaire,
  type SaisieVoiture,
} from '../../engine/validation'
import { fr, texteErreur } from '../../i18n/fr'
import { formatEuro } from '../../utils/format'
import { ChampAvantage, CHAMP, Erreur, messageErreur, type ModifierSaisie } from './champs'

interface Props {
  saisie: SaisieFormulaire
  erreurs: ErreursSaisie
  /** ATN mensuel calculé depuis la voiture, pour l'aperçu. null hors mode voiture ou si le calcul n'aboutit pas. */
  apercuAtnCentimes: number | null
  onChange: ModifierSaisie
}

/** Choix de mobilité, voiture de société et budget mobilité (spec ergonomie § 2). */
export function SectionMobilite({ saisie, erreurs, apercuAtnCentimes, onChange }: Props) {
  const t = fr.formulaire
  const erreurTexte = (code: CodeErreur | undefined) => messageErreur(code, saisie.sens)

  const v = saisie.voiture
  const tv = t.voiture
  const modifierVoiture = <K extends keyof SaisieVoiture>(champ: K, valeur: SaisieVoiture[K]) =>
    onChange('voiture', { ...v, [champ]: valeur })

  const bm = saisie.budgetMobilite
  const tm = t.mobilite
  const modifierBudget = <K extends keyof SaisieBudgetMobilite>(champ: K, valeur: SaisieBudgetMobilite[K]) =>
    onChange('budgetMobilite', { ...bm, [champ]: valeur })

  return (
    <>
        <fieldset className="border-t border-slate-200 pt-4 dark:border-slate-700">
          <legend className="font-medium">{tm.titre}</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {CHOIX_MOBILITE.map((choix) => (
              <label key={choix} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="choixMobilite"
                  value={choix}
                  checked={saisie.choixMobilite === choix}
                  onChange={() => onChange('choixMobilite', choix as ChoixMobilite)}
                  className="size-4 accent-blue-700"
                />
                {tm.choix[choix]}
              </label>
            ))}
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{tm.aide}</p>
        </fieldset>

        {saisie.choixMobilite === 'voiture' && (
          <fieldset>
            <legend className="font-medium">{tv.titre}</legend>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {MODES_ATN.map((mode) => (
                <label key={mode} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="modeAtn"
                    value={mode}
                    checked={v.mode === mode}
                    onChange={() => modifierVoiture('mode', mode)}
                    className="size-4 accent-blue-700"
                  />
                  {tv.modes[mode]}
                </label>
              ))}
            </div>

            {v.mode === 'montant' ? (
              <div className="mt-2">
                <label htmlFor="atn" className="text-sm font-medium">
                  {t.atn}
                </label>
                <input
                  id="atn"
                  inputMode="decimal"
                  autoComplete="off"
                  value={saisie.atn}
                  onChange={(e) => onChange('atn', e.target.value)}
                  aria-invalid={erreurs.atn ? true : undefined}
                  aria-describedby={erreurs.atn ? 'atn-erreur' : 'atn-aide'}
                  className={CHAMP}
                />
                {erreurs.atn ? (
                  <Erreur id="atn-erreur">{texteErreur(erreurs.atn, saisie.sens)}</Erreur>
                ) : (
                  <p id="atn-aide" className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {t.aideAtn}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-2 space-y-3 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
                <ChampAvantage
                  id="valeurCatalogue"
                  libelle={tv.valeurCatalogue}
                  valeur={v.valeurCatalogue}
                  aide={tv.aideValeurCatalogue}
                  erreur={erreurTexte(erreurs.valeurCatalogue)}
                  onChange={(valeur) => modifierVoiture('valeurCatalogue', valeur)}
                />
                <div>
                  <label htmlFor="carburant" className="text-sm font-medium">
                    {tv.carburant}
                  </label>
                  <select
                    id="carburant"
                    value={v.carburant}
                    onChange={(e) => modifierVoiture('carburant', e.target.value as Carburant)}
                    className={CHAMP}
                  >
                    {CARBURANTS.map((carburant) => (
                      <option key={carburant} value={carburant}>
                        {tv.carburants[carburant]}
                      </option>
                    ))}
                  </select>
                </div>
                <ChampAvantage
                  id="co2"
                  libelle={tv.co2}
                  valeur={v.co2}
                  aide={tv.aideCo2}
                  erreur={erreurTexte(erreurs.co2)}
                  desactive={v.carburant === 'electrique'}
                  onChange={(valeur) => modifierVoiture('co2', valeur)}
                />
                <div>
                  <label htmlFor="premiereImmatriculation" className="text-sm font-medium">
                    {tv.premiereImmatriculation}
                  </label>
                  <input
                    id="premiereImmatriculation"
                    type="month"
                    value={v.premiereImmatriculation}
                    onChange={(e) => modifierVoiture('premiereImmatriculation', e.target.value)}
                    aria-invalid={erreurs.premiereImmatriculation ? true : undefined}
                    aria-describedby={erreurs.premiereImmatriculation ? 'premiereImmatriculation-erreur' : undefined}
                    className={CHAMP}
                  />
                  {erreurs.premiereImmatriculation && (
                    <Erreur id="premiereImmatriculation-erreur">{texteErreur(erreurs.premiereImmatriculation, saisie.sens)}</Erreur>
                  )}
                </div>
                {apercuAtnCentimes !== null && <p className="text-sm font-medium">{tv.apercu(formatEuro(apercuAtnCentimes))}</p>}
              </div>
            )}

            <div className="mt-3">
              <ChampAvantage
                id="contribution"
                libelle={tv.contribution}
                valeur={v.contribution}
                aide={tv.aideContribution}
                erreur={erreurTexte(erreurs.contribution)}
                onChange={(valeur) => modifierVoiture('contribution', valeur)}
              />
            </div>
          </fieldset>
        )}

        {saisie.choixMobilite === 'budgetMobilite' && (
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">{tm.choix.budgetMobilite}</legend>
            <ChampAvantage
              id="budgetAnnuel"
              libelle={tm.budgetAnnuel}
              valeur={bm.budgetAnnuel}
              aide={tm.aideBudgetAnnuel}
              erreur={erreurTexte(erreurs.budgetAnnuel)}
              onChange={(valeur) => modifierBudget('budgetAnnuel', valeur)}
            />
            <ChampAvantage
              id="pilier3Annuel"
              libelle={tm.pilier3}
              valeur={bm.pilier3Annuel}
              aide={tm.aidePilier3}
              erreur={erreurTexte(erreurs.pilier3Annuel)}
              onChange={(valeur) => modifierBudget('pilier3Annuel', valeur)}
            />
          </fieldset>
        )}
    </>
  )
}
