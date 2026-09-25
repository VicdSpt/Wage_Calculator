import type { ReactNode } from 'react'
import type { CodeErreur, SaisieFormulaire, SensCalcul } from '../../engine/validation'
import { texteErreur } from '../../i18n/fr'

/** Signature de la mise à jour d'un champ de la saisie, partagée par les sections. */
export type ModifierSaisie = <K extends keyof SaisieFormulaire>(champ: K, valeur: SaisieFormulaire[K]) => void

/** Message d'une erreur de champ, ou undefined quand il n'y en a pas : ce qu'attend ChampAvantage. */
export function messageErreur(code: CodeErreur | undefined, sens: SensCalcul): string | undefined {
  return code ? texteErreur(code, sens) : undefined
}

export const CHAMP =
  'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-blue-600 aria-invalid:border-red-600 dark:border-slate-600 dark:bg-slate-800'

export function Erreur({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1 text-sm text-red-700 dark:text-red-400">
      {children}
    </p>
  )
}

export interface ChampAvantageProps {
  id: string
  libelle: string
  valeur: string
  aide?: string
  erreur?: string
  desactive?: boolean
  onChange: (valeur: string) => void
}

export function ChampAvantage({ id, libelle, valeur, aide, erreur, desactive, onChange }: ChampAvantageProps) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {libelle}
      </label>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? `${id}-erreur` : aide ? `${id}-aide` : undefined}
        disabled={desactive}
        className={CHAMP}
      />
      {erreur ? (
        <Erreur id={`${id}-erreur`}>{erreur}</Erreur>
      ) : (
        aide && (
          <p id={`${id}-aide`} className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {aide}
          </p>
        )
      )}
    </div>
  )
}
