import type { ReactNode } from 'react'
import { CHAMP } from './champs.ts'

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
