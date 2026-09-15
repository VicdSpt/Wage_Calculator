import { describe, expect, it } from 'vitest'
import { MARGE_RECUL_CENTIMES } from '../calculerBrut'
import { PERIODES } from '../parametres'
import { BRUT_MAX_CENTIMES } from '../types'
import { empreinte } from './empreinte'
import mesure from './reculMax.json'
import { SITUATIONS_FAMILIALES } from './situations'

/** Périodes du JSON, indexées par id, sans `any` : seul le champ utilisé ici est typé. */
const periodesMesurees: Record<string, { empreinteParametres: string }> = mesure.periodes

describe('recul maximal du net (généré par npm run verifier:recul)', () => {
  it('couvre exactement les périodes intégrées', () => {
    expect(Object.keys(mesure.periodes).sort()).toEqual(PERIODES.map((p) => p.id).sort())
  })

  it('couvre toutes les situations et tout le domaine du brut', () => {
    expect(mesure.situationsCouvertes).toBe(SITUATIONS_FAMILIALES.length)
    expect(mesure.brutMaxCentimes).toBe(BRUT_MAX_CENTIMES)
  })

  it.each(Object.entries(mesure.periodes))('%s : le recul maximal reste dans la marge de calculerBrut', (_id, periode) => {
    expect(periode.reculMaxCentimes).toBeLessThanOrEqual(MARGE_RECUL_CENTIMES)
  })

  it.each(PERIODES)('$id : les paramètres de la période n’ont pas changé depuis la mesure', (p) => {
    expect(periodesMesurees[p.id]?.empreinteParametres, 'relancez npm run verifier:recul').toBe(empreinte(p))
  })

  it('la liste des situations n’a pas changé depuis la mesure', () => {
    expect(mesure.empreinteSituations, 'relancez npm run verifier:recul').toBe(empreinte(SITUATIONS_FAMILIALES))
  })
})
