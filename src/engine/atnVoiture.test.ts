import { describe, expect, it } from 'vitest'
import {
  ATN_AUCUN,
  calculerAtnVoiture,
  coefficientAge,
  moisEcoulesDepuis,
  resoudreAtn,
  VALEUR_CATALOGUE_MAX_CENTIMES,
  type Voiture,
} from './atnVoiture'
import { getParametres } from './parametres'

const SEPT_2026 = '2026-09-14'
const SEPT_2025 = '2025-09-14'
const P2026 = getParametres(SEPT_2026)
const P2025 = getParametres(SEPT_2025)

/** L'exemple de contrôle de la spec § 3.1 : 20 mois en septembre 2026. */
const ESSENCE_CONTROLE: Voiture = {
  carburant: 'essence',
  valeurCatalogueCentimes: 4_500_000,
  co2GrammesKm: 103,
  premiereImmatriculation: '2025-02',
}

const ELECTRIQUE_ANCIENNE: Voiture = {
  carburant: 'electrique',
  valeurCatalogueCentimes: 6_000_000,
  co2GrammesKm: 150,
  premiereImmatriculation: '2020-01',
}

describe('moisEcoulesDepuis', () => {
  it('compte le mois de la première immatriculation comme le mois 1', () => {
    expect(moisEcoulesDepuis('2026-09', SEPT_2026)).toBe(1)
    expect(moisEcoulesDepuis('2025-10', SEPT_2026)).toBe(12)
    expect(moisEcoulesDepuis('2025-09', SEPT_2026)).toBe(13)
    expect(moisEcoulesDepuis('2025-02', SEPT_2026)).toBe(20)
  })

  it('refuse une immatriculation postérieure au mois calculé', () => {
    expect(() => moisEcoulesDepuis('2026-10', SEPT_2026)).toThrow(RangeError)
  })

  it.each(['2026-13', '2026-00', '26-09', '2026-9', ''])('refuse le mois mal formé « %s »', (mois) => {
    expect(() => moisEcoulesDepuis(mois, SEPT_2026)).toThrow(RangeError)
  })
})

describe('coefficientAge', () => {
  it.each([
    [1, 10_000],
    [12, 10_000],
    [13, 9_400],
    [24, 9_400],
    [25, 8_800],
    [36, 8_800],
    [37, 8_200],
    [48, 8_200],
    [49, 7_600],
    [60, 7_600],
    [61, 7_000],
    [200, 7_000],
  ])('%i mois → %i dix-millièmes', (mois, coefficient) => {
    expect(coefficientAge(mois)).toBe(coefficient)
  })
})

describe('calculerAtnVoiture', () => {
  it('reproduit l’exemple de contrôle de la spec : 3 190,63 €/an, 265,89 €/mois', () => {
    expect(calculerAtnVoiture(ESSENCE_CONTROLE, SEPT_2026, P2026)).toEqual({
      valeurCatalogueCentimes: 4_500_000,
      pourcentageCo2DixMilliemes: 880,
      coefficientAgeDixMilliemes: 9_400,
      moisEcoules: 20,
      annuelFormuleCentimes: 319_063,
      minimumAppliqueCentimes: null,
      annuelCentimes: 319_063,
      mensuelCentimes: 26_589,
    })
  })

  it('diesel : utilise la référence diesel (58 g en 2026)', () => {
    const r = calculerAtnVoiture(
      { carburant: 'diesel', valeurCatalogueCentimes: 3_500_000, co2GrammesKm: 120, premiereImmatriculation: '2026-09' },
      SEPT_2026,
      P2026,
    )
    expect(r).toMatchObject({ pourcentageCo2DixMilliemes: 1_170, coefficientAgeDixMilliemes: 10_000, annuelCentimes: 351_000, mensuelCentimes: 29_250 })
  })

  it('aux émissions de référence : 5,5 %', () => {
    const r = calculerAtnVoiture(
      { carburant: 'diesel', valeurCatalogueCentimes: 4_500_000, co2GrammesKm: 58, premiereImmatriculation: '2026-09' },
      SEPT_2026,
      P2026,
    )
    expect(r).toMatchObject({ pourcentageCo2DixMilliemes: 550, annuelCentimes: 212_143, mensuelCentimes: 17_679 })
  })

  it('borne le pourcentage à 18 %', () => {
    const r = calculerAtnVoiture({ ...ESSENCE_CONTROLE, co2GrammesKm: 250, premiereImmatriculation: '2026-09' }, SEPT_2026, P2026)
    expect(r).toMatchObject({ pourcentageCo2DixMilliemes: 1_800, annuelCentimes: 694_286, mensuelCentimes: 57_857 })
  })

  it('borne le pourcentage à 4 %, et le minimum annuel prend alors le relais', () => {
    const r = calculerAtnVoiture({ ...ESSENCE_CONTROLE, co2GrammesKm: 20, premiereImmatriculation: '2026-09' }, SEPT_2026, P2026)
    expect(r).toEqual({
      valeurCatalogueCentimes: 4_500_000,
      pourcentageCo2DixMilliemes: 400,
      coefficientAgeDixMilliemes: 10_000,
      moisEcoules: 1,
      annuelFormuleCentimes: 154_286,
      minimumAppliqueCentimes: 169_000,
      annuelCentimes: 169_000,
      mensuelCentimes: 14_083,
    })
  })

  it('électrique : 4 % quel que soit le CO₂ saisi', () => {
    expect(calculerAtnVoiture(ELECTRIQUE_ANCIENNE, SEPT_2026, P2026)).toEqual({
      valeurCatalogueCentimes: 6_000_000,
      pourcentageCo2DixMilliemes: 400,
      coefficientAgeDixMilliemes: 7_000,
      moisEcoules: 81,
      annuelFormuleCentimes: 144_000,
      minimumAppliqueCentimes: 169_000,
      annuelCentimes: 169_000,
      mensuelCentimes: 14_083,
    })
  })

  it('le minimum suit la période : 1 650 € en 2025', () => {
    expect(calculerAtnVoiture(ELECTRIQUE_ANCIENNE, SEPT_2025, P2025)).toMatchObject({
      moisEcoules: 69,
      minimumAppliqueCentimes: 165_000,
      annuelCentimes: 165_000,
      mensuelCentimes: 13_750,
    })
  })

  it('la même voiture neuve coûte un peu plus en 2026 qu’en 2025 : la référence a baissé d’un gramme', () => {
    const neuve2026 = calculerAtnVoiture({ ...ESSENCE_CONTROLE, premiereImmatriculation: '2026-09' }, SEPT_2026, P2026)
    const neuve2025 = calculerAtnVoiture({ ...ESSENCE_CONTROLE, premiereImmatriculation: '2025-09' }, SEPT_2025, P2025)
    expect(neuve2026).toMatchObject({ pourcentageCo2DixMilliemes: 880, annuelCentimes: 339_429, mensuelCentimes: 28_286 })
    expect(neuve2025).toMatchObject({ pourcentageCo2DixMilliemes: 870, annuelCentimes: 335_571, mensuelCentimes: 27_964 })
  })

  it.each([
    ['2025-10', 10_000],
    ['2025-09', 9_400],
    ['2024-10', 9_400],
    ['2024-09', 8_800],
    ['2023-10', 8_800],
    ['2023-09', 8_200],
    ['2022-10', 8_200],
    ['2022-09', 7_600],
    ['2021-10', 7_600],
    ['2021-09', 7_000],
  ])('immatriculée en %s, calculée en septembre 2026 → coefficient %i', (premiereImmatriculation, coefficient) => {
    const r = calculerAtnVoiture({ ...ESSENCE_CONTROLE, premiereImmatriculation }, SEPT_2026, P2026)
    expect(r.coefficientAgeDixMilliemes).toBe(coefficient)
  })

  it('reste exacte à la valeur catalogue maximale', () => {
    const r = calculerAtnVoiture(
      { carburant: 'essence', valeurCatalogueCentimes: VALEUR_CATALOGUE_MAX_CENTIMES, co2GrammesKm: 250, premiereImmatriculation: '2026-09' },
      SEPT_2026,
      P2026,
    )
    expect(r).toMatchObject({ annuelFormuleCentimes: 11_880_000, mensuelCentimes: 990_000 })
  })

  it.each([0, -1, VALEUR_CATALOGUE_MAX_CENTIMES + 1, 1.5])('refuse la valeur catalogue %d', (valeurCatalogueCentimes) => {
    expect(() => calculerAtnVoiture({ ...ESSENCE_CONTROLE, valeurCatalogueCentimes }, SEPT_2026, P2026)).toThrow(RangeError)
  })

  it.each([-1, 10.5])('refuse les émissions %d pour une voiture thermique', (co2GrammesKm) => {
    expect(() => calculerAtnVoiture({ ...ESSENCE_CONTROLE, co2GrammesKm }, SEPT_2026, P2026)).toThrow(RangeError)
  })
})

describe('resoudreAtn', () => {
  it('sans voiture ni montant : tout vaut zéro', () => {
    expect(resoudreAtn(ATN_AUCUN, SEPT_2026, P2026)).toEqual({
      mode: 'montant',
      avantContributionCentimes: 0,
      contributionCentimes: 0,
      imposableCentimes: 0,
      voiture: null,
    })
  })

  it('montant saisi : la contribution le réduit', () => {
    const r = resoudreAtn({ source: { mode: 'montant', montantMensuelCentimes: 27_017 }, contributionMensuelleCentimes: 5_000 }, SEPT_2026, P2026)
    expect(r).toEqual({ mode: 'montant', avantContributionCentimes: 27_017, contributionCentimes: 5_000, imposableCentimes: 22_017, voiture: null })
  })

  it('voiture : l’ATN de la formule, moins la contribution', () => {
    const r = resoudreAtn({ source: { mode: 'voiture', voiture: ESSENCE_CONTROLE }, contributionMensuelleCentimes: 6_589 }, SEPT_2026, P2026)
    expect(r).toMatchObject({ mode: 'voiture', avantContributionCentimes: 26_589, contributionCentimes: 6_589, imposableCentimes: 20_000 })
    expect(r.voiture?.mensuelCentimes).toBe(26_589)
  })

  it('une contribution supérieure à l’ATN ramène l’imposable à zéro, sans négatif', () => {
    const r = resoudreAtn({ source: { mode: 'montant', montantMensuelCentimes: 10_000 }, contributionMensuelleCentimes: 30_000 }, SEPT_2026, P2026)
    expect(r).toMatchObject({ avantContributionCentimes: 10_000, contributionCentimes: 30_000, imposableCentimes: 0 })
  })
})
