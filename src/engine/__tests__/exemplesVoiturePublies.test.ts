import { describe, expect, it } from 'vitest'
import { calculerAtnVoiture, type Voiture } from '../atnVoiture'
import { getParametres } from '../parametres'
import fichier from './exemplesVoiturePublies.json'

interface ExemplePublie {
  id: string
  date: string
  voiture: Voiture
  publie: { annuelCentimes?: number; mensuelCentimes?: number }
  source: string
  verifie: boolean
}

const cas = fichier.cas as unknown as ExemplePublie[]

describe(`ATN voiture — ${cas.length} exemples publiés`, () => {
  it.each(cas.map((c) => [c.id, c] as const))('%s', (_id, c) => {
    const r = calculerAtnVoiture(c.voiture, c.date, getParametres(c.date))
    if (c.publie.annuelCentimes !== undefined) {
      expect(r.annuelCentimes).toBe(c.publie.annuelCentimes)
    }
    if (c.publie.mensuelCentimes !== undefined) {
      expect(r.mensuelCentimes).toBe(c.publie.mensuelCentimes)
    }
  })
})
