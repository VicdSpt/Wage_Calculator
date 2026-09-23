import { describe, expect, it } from 'vitest'
import { calculerAllocationExceptionnelle, type ResultatAllocation, type TypeAllocation } from '../allocationsExceptionnelles'
import type { SituationFamiliale } from '../calculerBrut'
import { getParametres } from '../parametres'
import fichier from './referencesAllocations.json'

interface CasAllocation {
  id: string
  date: string
  brutCentimes: number
  retenueSocialeCentimes: number
  baseAnnuelleCentimes: number
  type: TypeAllocation
  enfantsACharge: number
  attendu: ResultatAllocation
  source: string
  verifie: boolean
}

const cas = fichier.cas as unknown as CasAllocation[]

describe(`allocations exceptionnelles — ${cas.length} cas du script de référence`, () => {
  it('contient des cas', () => {
    expect(cas.length).toBeGreaterThanOrEqual(12)
  })

  it.each(cas.map((c) => [c.id, c] as const))('%s', (_id, c) => {
    const famille: SituationFamiliale = {
      etatCivil: 'isole',
      revenusConjoint: null,
      enfantsACharge: c.enfantsACharge,
      parentIsole: false,
      atnMensuelCentimes: 0,
    }
    expect(
      calculerAllocationExceptionnelle(c.brutCentimes, c.retenueSocialeCentimes, c.baseAnnuelleCentimes, c.type, famille, getParametres(c.date)),
    ).toEqual(c.attendu)
  })
})
