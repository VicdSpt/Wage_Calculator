import { describe, expect, it } from 'vitest'
import type { Avantages } from '../avantages'
import { calculerRemuneration } from '../remuneration'
import type { Situation } from '../types'
import fichier from './fichesReelles.json'

interface CasFiche {
  id: string
  date: string
  situation: Situation
  avantages: Avantages
  attenduVerifie: {
    onss: number
    bonusVoletA: number
    bonusVoletB: number
    imposableMensuel: number
    imposablePrecompte: number
    bonusFiscal: number
    cotisationSpeciale: number
    retenueTitres: number
  }
  ecartConnu: {
    precompteAvantBonusFiche: number
    netVerseFiche: number
    ecartPrecompteCentimes: number
    explication: string
  }
  source: string
  verifie: boolean
}

const cas = fichier.cas as unknown as CasFiche[]

describe(`fiches de paie réelles — ${cas.filter((c) => c.verifie).length} cas vérifiés`, () => {
  it.each(cas.map((c) => [c.id, c] as const))('%s : les lignes sociales au centime', (_id, c) => {
    const complet = calculerRemuneration(c.situation, c.avantages, c.date)
    const i = complet.resultat.intermediaires
    expect({
      onss: i.onss,
      bonusVoletA: i.bonusVoletA,
      bonusVoletB: i.bonusVoletB,
      imposableMensuel: i.imposableMensuel,
      imposablePrecompte: i.imposablePrecompte,
      bonusFiscal: i.bonusFiscal,
      cotisationSpeciale: i.cotisationSpeciale,
      retenueTitres: complet.avantages.retenueTitresCentimes,
    }).toEqual(c.attenduVerifie)
  })

  // L'écart du précompte est figé volontairement : la formule-clé officielle 2025 ne reproduit
  // pas le précompte des fiches (17,85 €/mois). Ce test échouera dès qu'on aura expliqué l'écart,
  // ce qui est le signal recherché — il ne valide pas notre chiffre, il surveille la différence.
  it.each(cas.map((c) => [c.id, c] as const))('%s : écart de précompte connu et stable', (_id, c) => {
    const complet = calculerRemuneration(c.situation, c.avantages, c.date)
    const ecart = complet.resultat.intermediaires.precompteAvantBonus - c.ecartConnu.precompteAvantBonusFiche
    expect(ecart).toBe(c.ecartConnu.ecartPrecompteCentimes)
  })

  it.each(cas.map((c) => [c.id, c] as const))('%s : la somme des lignes de la fiche redonne son net versé', (_id, c) => {
    const complet = calculerRemuneration(c.situation, c.avantages, c.date)
    const a = c.attenduVerifie
    const somme =
      c.situation.brutMensuelCentimes -
      a.onss +
      a.bonusVoletA +
      a.bonusVoletB -
      c.ecartConnu.precompteAvantBonusFiche +
      a.bonusFiscal -
      a.cotisationSpeciale -
      a.retenueTitres +
      complet.avantages.fraisPropresCentimes
    expect(somme).toBe(c.ecartConnu.netVerseFiche)
  })

  it('tous les cas sont marqués vérifiés et citent une source anonymisée', () => {
    for (const c of cas) {
      expect(c.verifie).toBe(true)
      expect(c.source).toMatch(/anonymisée/)
    }
  })
})
