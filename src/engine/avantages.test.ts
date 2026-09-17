import { describe, expect, it } from 'vitest'
import { AVANTAGES_AUCUN, calculerAvantages, type Avantages } from './avantages'
import { getParametres } from './parametres'

const AOUT = getParametres('2026-08-31')   // télétravail plafonné à 160,99 €
const SEPT = getParametres('2026-09-14')   // télétravail plafonné à 164,21 €

function avantages(modif: Partial<Avantages>): Avantages {
  return { ...AVANTAGES_AUCUN, ...modif }
}

const TITRES_CONFORMES = {
  actif: true,
  joursPrestes: 20,
  valeurFacialeCentimes: 1_000,
  partTravailleurCentimes: 109,
}

describe('calculerAvantages — titres-repas', () => {
  it('calcule la retenue, la valeur et la part patronale', () => {
    const r = calculerAvantages(avantages({ titresRepas: TITRES_CONFORMES }), SEPT)
    expect(r).toMatchObject({
      retenueTitresCentimes: 2_180,
      valeurTitresCentimes: 20_000,
      partPatronaleTitresCentimes: 17_820,
      valeurFacialeParTitreCentimes: 1_000,
      partTravailleurParTitreCentimes: 109,
      partPatronaleParTitreCentimes: 891,
      alertes: [],
    })
  })

  it('donne zéro pour 0 jour presté', () => {
    const r = calculerAvantages(avantages({ titresRepas: { ...TITRES_CONFORMES, joursPrestes: 0 } }), SEPT)
    expect(r).toMatchObject({ retenueTitresCentimes: 0, valeurTitresCentimes: 0, partPatronaleTitresCentimes: 0, alertes: [] })
  })

  it('ignore complètement des titres-repas inactifs', () => {
    const r = calculerAvantages(avantages({ titresRepas: { ...TITRES_CONFORMES, actif: false } }), SEPT)
    expect(r).toMatchObject({
      retenueTitresCentimes: 0,
      valeurTitresCentimes: 0,
      partPatronaleTitresCentimes: 0,
      valeurFacialeParTitreCentimes: 0,
      partTravailleurParTitreCentimes: 0,
      partPatronaleParTitreCentimes: 0,
      alertes: [],
    })
  })

  it('accepte les valeurs limites exactes (8,91 € patronal, 1,09 € travailleur, 10,00 € faciaux)', () => {
    expect(calculerAvantages(avantages({ titresRepas: TITRES_CONFORMES }), SEPT).alertes).toEqual([])
  })

  it('alerte quand la part patronale dépasse et que la part du travailleur est trop faible', () => {
    const r = calculerAvantages(avantages({ titresRepas: { ...TITRES_CONFORMES, partTravailleurCentimes: 108 } }), SEPT)
    expect(r.partPatronaleParTitreCentimes).toBe(892)
    expect(r.alertes).toEqual(['partPatronaleTitres', 'partTravailleurTitres'])
  })

  it('alerte sur la valeur faciale au-delà de 10,00 €', () => {
    const r = calculerAvantages(
      avantages({ titresRepas: { ...TITRES_CONFORMES, valeurFacialeCentimes: 1_001, partTravailleurCentimes: 110 } }),
      SEPT,
    )
    expect(r.alertes).toEqual(['valeurFacialeTitres'])
  })
})

describe('calculerAvantages — télétravail', () => {
  it.each([
    [AOUT, 16_099, []],
    [AOUT, 16_100, ['teletravail']],
    [SEPT, 16_421, []],
    [SEPT, 16_422, ['teletravail']],
  ])('plafond de période : %#', (parametres, indemniteCentimes, attendues) => {
    const r = calculerAvantages(avantages({ teletravail: { actif: true, indemniteCentimes } }), parametres)
    expect(r.teletravailCentimes).toBe(indemniteCentimes)
    expect(r.alertes).toEqual(attendues)
  })

  it('16 100 centimes passent en septembre mais alertent en août', () => {
    expect(calculerAvantages(avantages({ teletravail: { actif: true, indemniteCentimes: 16_100 } }), SEPT).alertes).toEqual([])
  })

  it('ignore une indemnité inactive', () => {
    const r = calculerAvantages(avantages({ teletravail: { actif: false, indemniteCentimes: 99_999 } }), AOUT)
    expect(r.teletravailCentimes).toBe(0)
    expect(r.alertes).toEqual([])
  })
})

describe('calculerAvantages — écochèques', () => {
  it.each([
    [25_000, []],
    [25_001, ['ecocheques']],
  ])('%i centimes par an → %j', (montantAnnuelCentimes, attendues) => {
    const r = calculerAvantages(avantages({ ecocheques: { actif: true, montantAnnuelCentimes } }), SEPT)
    expect(r.ecochequesAnnuelCentimes).toBe(montantAnnuelCentimes)
    expect(r.alertes).toEqual(attendues)
  })

  it('ignore des écochèques inactifs', () => {
    const r = calculerAvantages(avantages({ ecocheques: { actif: false, montantAnnuelCentimes: 99_999 } }), SEPT)
    expect(r.ecochequesAnnuelCentimes).toBe(0)
    expect(r.alertes).toEqual([])
  })
})

describe('calculerAvantages — sans aucun avantage', () => {
  it('renvoie des zéros et aucune alerte', () => {
    expect(calculerAvantages(AVANTAGES_AUCUN, SEPT)).toEqual({
      retenueTitresCentimes: 0,
      valeurTitresCentimes: 0,
      partPatronaleTitresCentimes: 0,
      valeurFacialeParTitreCentimes: 0,
      partTravailleurParTitreCentimes: 0,
      partPatronaleParTitreCentimes: 0,
      teletravailCentimes: 0,
      ecochequesAnnuelCentimes: 0,
      alertes: [],
    })
  })

  it('donne les alertes dans un ordre stable', () => {
    const r = calculerAvantages(
      {
        titresRepas: { actif: true, joursPrestes: 20, valeurFacialeCentimes: 1_500, partTravailleurCentimes: 100 },
        teletravail: { actif: true, indemniteCentimes: 20_000 },
        ecocheques: { actif: true, montantAnnuelCentimes: 30_000 },
      },
      SEPT,
    )
    expect(r.alertes).toEqual(['partPatronaleTitres', 'partTravailleurTitres', 'valeurFacialeTitres', 'teletravail', 'ecocheques'])
  })
})
