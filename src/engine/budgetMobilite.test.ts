import { describe, expect, it } from 'vitest'
import { BUDGET_MOBILITE_AUCUN, calculerBudgetMobilite } from './budgetMobilite'
import { getParametres } from './parametres'
import type { Parametres } from './parametres/types'

const P = getParametres('2026-09-15')

/** Paramètres de la période, avec un bloc budget mobilité imposé : teste l'application, pas la valeur. */
function avecBudget(parametres: Parametres, bloc: Partial<Parametres['budgetMobilite']>): Parametres {
  return { ...parametres, budgetMobilite: { ...parametres.budgetMobilite, ...bloc } }
}

describe('calculerBudgetMobilite', () => {
  it('mensualise le pilier 3 et en retire la cotisation spéciale', () => {
    // 2 000 €/an → 166,67 €/mois ; cotisation à 38,07 % → 63,45 € ; net → 103,22 €.
    const r = calculerBudgetMobilite({ budgetAnnuelCentimes: 600_000, pilier3AnnuelCentimes: 200_000 }, P)
    expect(r.pilier3MensuelBrutCentimes).toBe(16_667)
    expect(r.cotisationSpecialeCentimes).toBe(6_345)
    expect(r.pilier3MensuelNetCentimes).toBe(10_322)
    expect(r.piliers1Et2AnnuelCentimes).toBe(400_000)
    expect(r.budgetAnnuelCentimes).toBe(600_000)
  })

  it('distingue budgetAnnuelCentimes de pilier3AnnuelCentimes quand ils diffèrent', () => {
    const r = calculerBudgetMobilite({ budgetAnnuelCentimes: 900_000, pilier3AnnuelCentimes: 300_000 }, P)
    expect(r.budgetAnnuelCentimes).toBe(900_000)
    expect(r.piliers1Et2AnnuelCentimes).toBe(600_000)
  })

  it('applique le taux du paramètre, pas une constante en dur', () => {
    // Taux imposé à 50 % : le résultat doit suivre le paramètre.
    const parametres = avecBudget(P, { tauxCotisationSpecialeDixMilliemes: 5_000 })
    const r = calculerBudgetMobilite({ budgetAnnuelCentimes: 600_000, pilier3AnnuelCentimes: 240_000 }, parametres)
    expect(r.pilier3MensuelBrutCentimes).toBe(20_000)
    expect(r.cotisationSpecialeCentimes).toBe(10_000)
    expect(r.pilier3MensuelNetCentimes).toBe(10_000)
  })

  it('ne retient rien quand aucun budget n’est pris en cash', () => {
    const r = calculerBudgetMobilite({ budgetAnnuelCentimes: 600_000, pilier3AnnuelCentimes: 0 }, P)
    expect(r.pilier3MensuelBrutCentimes).toBe(0)
    expect(r.cotisationSpecialeCentimes).toBe(0)
    expect(r.pilier3MensuelNetCentimes).toBe(0)
    expect(r.piliers1Et2AnnuelCentimes).toBe(600_000)
  })

  it('ne calcule rien et n’alerte pas quand il n’y a pas de budget', () => {
    const r = calculerBudgetMobilite(BUDGET_MOBILITE_AUCUN, P)
    expect(r.pilier3MensuelNetCentimes).toBe(0)
    expect(r.piliers1Et2AnnuelCentimes).toBe(0)
    // Une saisie vide n'est pas un dépassement de bornes.
    expect(r.horsBornes).toBe(false)
  })

  it('signale un budget hors des bornes légales, aux bornes exactes près', () => {
    const parametres = avecBudget(P, { budgetAnnuelMinCentimes: 323_300, budgetAnnuelMaxCentimes: 1_724_400 })
    const horsBornes = (budgetAnnuelCentimes: number) =>
      calculerBudgetMobilite({ budgetAnnuelCentimes, pilier3AnnuelCentimes: 0 }, parametres).horsBornes
    expect(horsBornes(323_300)).toBe(false)
    expect(horsBornes(323_299)).toBe(true)
    expect(horsBornes(1_724_400)).toBe(false)
    expect(horsBornes(1_724_401)).toBe(true)
  })

  it('refuse une part en cash supérieure au budget', () => {
    expect(() => calculerBudgetMobilite({ budgetAnnuelCentimes: 600_000, pilier3AnnuelCentimes: 600_001 }, P)).toThrow(RangeError)
  })

  it('refuse un montant négatif ou non entier', () => {
    expect(() => calculerBudgetMobilite({ budgetAnnuelCentimes: -1, pilier3AnnuelCentimes: 0 }, P)).toThrow(RangeError)
    expect(() => calculerBudgetMobilite({ budgetAnnuelCentimes: 600_000, pilier3AnnuelCentimes: -1 }, P)).toThrow(RangeError)
    expect(() => calculerBudgetMobilite({ budgetAnnuelCentimes: 600_000.5, pilier3AnnuelCentimes: 0 }, P)).toThrow(RangeError)
  })
})
