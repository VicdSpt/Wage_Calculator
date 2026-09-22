import { describe, expect, it } from 'vitest'
import { calculerAtnVoiture, type ResultatAtnVoiture, type Voiture } from '../atnVoiture'
import { getParametres } from '../parametres'
import fichier from './referencesVoiture.json'

interface CasVoiture {
  id: string
  date: string
  voiture: Voiture
  attendu: ResultatAtnVoiture
  source: string
  verifie: boolean
}

const cas = fichier.cas as unknown as CasVoiture[]

describe(`ATN voiture — ${cas.length} cas du script de référence`, () => {
  it('contient des cas', () => {
    expect(cas.length).toBeGreaterThanOrEqual(8)
  })

  it.each(cas.map((c) => [c.id, c] as const))('%s', (_id, c) => {
    expect(calculerAtnVoiture(c.voiture, c.date, getParametres(c.date))).toEqual(c.attendu)
  })
})
