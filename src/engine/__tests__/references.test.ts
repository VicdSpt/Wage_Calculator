import { describe, expect, it } from 'vitest'
import { calculerNet } from '../calculerNet'
import type { Intermediaires, Situation } from '../types'
import fichier from './references.json'

interface CasReference {
  id: string
  date: string
  situation: Situation
  attendu: Intermediaires
  source: string
  verifie: boolean
}

const cas = fichier.cas as unknown as CasReference[]
const verifies = cas.filter((c) => c.verifie).length

describe(`cas de référence — ${verifies} vérifié(s) externement sur ${cas.length}`, () => {
  it.each(cas.map((c) => [c.id, c] as const))('%s', (_id, c) => {
    expect(calculerNet(c.situation, c.date).intermediaires).toEqual(c.attendu)
  })
})