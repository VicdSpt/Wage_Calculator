import type { ReactNode } from 'react'
import { REVENUS_CONJOINT, type RevenusConjoint } from '../engine/types'
import { SENS_CALCUL, type ErreursSaisie, type SaisieFormulaire } from '../engine/validation'
import { fr, texteErreur } from '../i18n/fr'
import { formatEuro } from '../utils/format'

interface Props {
  saisie: SaisieFormulaire
  erreurs: ErreursSaisie
  /** Net maximal atteignable si le net demandé le dépasse, sinon null. */
  netMaxCentimes: number | null
  onChange: <K extends keyof SaisieFormulaire>(champ: K, valeur: SaisieFormulaire[K]) => void
  onBasculerSens: () => void
}

const CHAMP =
  'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-blue-600 aria-invalid:border-red-600 dark:border-slate-600 dark:bg-slate-800'

function Erreur({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1 text-sm text-red-700 dark:text-red-400">
      {children}
    </p>
  )
}

export function FormulaireSituation({ saisie, erreurs, netMaxCentimes, onChange, onBasculerSens }: Props) {
  const t = fr.formulaire
  const isole = saisie.etatCivil === 'isole'
  const enfants = Number(saisie.enfantsACharge)
  const afficherParentIsole = isole && Number.isInteger(enfants) && enfants > 0
  const erreurMontant = erreurs.montant
    ? texteErreur(erreurs.montant, saisie.sens)
    : netMaxCentimes !== null
      ? t.netHorsLimites(formatEuro(netMaxCentimes))
      : null

  return (
    <section aria-labelledby="titre-formulaire" className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
      <h2 id="titre-formulaire" className="mb-4 text-lg font-semibold">
        {t.titre}
      </h2>
      <form className="space-y-5" onSubmit={(e) => e.preventDefault()} noValidate>
        <fieldset>
          <legend className="font-medium">{t.sens}</legend>
          <div className="mt-2 inline-flex rounded-lg border border-slate-300 p-1 dark:border-slate-600">
            {SENS_CALCUL.map((valeur) => (
              <label
                key={valeur}
                className="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium has-checked:bg-blue-700 has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-blue-600"
              >
                <input
                  type="radio"
                  name="sens"
                  value={valeur}
                  checked={saisie.sens === valeur}
                  onChange={onBasculerSens}
                  className="sr-only"
                />
                {t.sensOptions[valeur]}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="montant" className="font-medium">
            {t.montant[saisie.sens]}
          </label>
          <input
            id="montant"
            inputMode="decimal"
            autoComplete="off"
            value={saisie.montant}
            onChange={(e) => onChange('montant', e.target.value)}
            aria-invalid={erreurMontant ? true : undefined}
            aria-describedby={erreurMontant ? 'montant-erreur' : undefined}
            className={CHAMP}
          />
          {erreurMontant && <Erreur id="montant-erreur">{erreurMontant}</Erreur>}
        </div>

        <fieldset>
          <legend className="font-medium">{t.etatCivil}</legend>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
            {(['isole', 'marieOuCohabitant'] as const).map((valeur) => (
              <label key={valeur} className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="etatCivil"
                  value={valeur}
                  checked={saisie.etatCivil === valeur}
                  onChange={() => onChange('etatCivil', valeur)}
                  className="size-4 accent-blue-700"
                />
                {t[valeur]}
              </label>
            ))}
          </div>
        </fieldset>

        {!isole && (
          <div>
            <label htmlFor="revenusConjoint" className="font-medium">
              {t.revenusConjoint}
            </label>
            <select
              id="revenusConjoint"
              value={saisie.revenusConjoint}
              onChange={(e) => onChange('revenusConjoint', e.target.value as RevenusConjoint)}
              aria-describedby="revenusConjoint-aide"
              className={CHAMP}
            >
              {REVENUS_CONJOINT.map((valeur) => (
                <option key={valeur} value={valeur}>
                  {fr.revenusConjoint[valeur]}
                </option>
              ))}
            </select>
            <p id="revenusConjoint-aide" className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t.aideRevenusConjoint}
            </p>
          </div>
        )}

        <div>
          <label htmlFor="enfantsACharge" className="font-medium">
            {t.enfants}
          </label>
          <input
            id="enfantsACharge"
            type="number"
            inputMode="numeric"
            min={0}
            max={10}
            step={1}
            value={saisie.enfantsACharge}
            onChange={(e) => onChange('enfantsACharge', e.target.value)}
            aria-invalid={erreurs.enfantsACharge ? true : undefined}
            aria-describedby={erreurs.enfantsACharge ? 'enfants-erreur' : undefined}
            className={CHAMP}
          />
          {erreurs.enfantsACharge && <Erreur id="enfants-erreur">{texteErreur(erreurs.enfantsACharge, saisie.sens)}</Erreur>}
        </div>

        {afficherParentIsole && (
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={saisie.parentIsole}
              onChange={(e) => onChange('parentIsole', e.target.checked)}
              className="mt-1 size-4 accent-blue-700"
            />
            {t.parentIsole}
          </label>
        )}
      </form>
    </section>
  )
}