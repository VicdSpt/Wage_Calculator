import { describe, expect, it } from 'vitest'
import { AVANTAGES_AUCUN, calculerAvantages, type Avantages } from './avantages'
import type { SituationFamiliale } from './calculerBrut'
import { calculerNet } from './calculerNet'
import { getParametres } from './parametres'
import { calculerBrutDepuisNetVerse, calculerRemuneration } from './remuneration'
import { NetHorsLimites, PeriodeNonCouverte, type Situation } from './types'

const SEPT = '2026-09-14'
const AOUT = '2026-08-31'

const ISOLE: SituationFamiliale = { etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false }
const ISOLE_3000: Situation = { ...ISOLE, brutMensuelCentimes: 300_000 }

const TITRES_ET_TELETRAVAIL: Avantages = {
  titresRepas: { actif: true, joursPrestes: 20, valeurFacialeCentimes: 1_000, partTravailleurCentimes: 109 },
  teletravail: { actif: true, indemniteCentimes: 16_099 },
  ecocheques: { actif: true, montantAnnuelCentimes: 25_000 },
}

/** net versé pour un brut donné : le net légal, moins la retenue des titres, plus l'indemnité. */
function netVerse(famille: SituationFamiliale, avantages: Avantages, brut: number, dateIso: string): number {
  const r = calculerAvantages(avantages, getParametres(dateIso))
  return calculerNet({ ...famille, brutMensuelCentimes: brut }, dateIso).netMensuelCentimes - r.retenueTitresCentimes + r.teletravailCentimes
}

/**
 * Oracle : on monte centime par centime depuis la plus petite valeur possible.
 * net(b) ≤ b, donc netVerse(b) ≤ b − retenue + télétravail : tout brut qui atteint la cible
 * est ≥ cible + retenue − télétravail.
 */
function brutOracleNetVerse(famille: SituationFamiliale, avantages: Avantages, cible: number, dateIso: string): number {
  const r = calculerAvantages(avantages, getParametres(dateIso))
  let brut = Math.max(1, cible + r.retenueTitresCentimes - r.teletravailCentimes)
  while (netVerse(famille, avantages, brut, dateIso) < cible) {
    brut++
  }
  return brut
}

describe('calculerRemuneration', () => {
  it('sans avantage, le net versé et le total valent le net légal', () => {
    const complet = calculerRemuneration(ISOLE_3000, AVANTAGES_AUCUN, SEPT)
    expect(complet.resultat).toEqual(calculerNet(ISOLE_3000, SEPT))
    expect(complet.netVerseCentimes).toBe(226_133)
    expect(complet.totalMensuelCentimes).toBe(226_133)
  })

  it('retire la retenue des titres et ajoute l\'indemnité de télétravail', () => {
    const complet = calculerRemuneration(ISOLE_3000, TITRES_ET_TELETRAVAIL, SEPT)
    expect(complet.avantages.retenueTitresCentimes).toBe(2_180)
    expect(complet.netVerseCentimes).toBe(226_133 - 2_180 + 16_099)
    expect(complet.totalMensuelCentimes).toBe(226_133 - 2_180 + 16_099 + 20_000)
    expect(complet.avantages.ecochequesAnnuelCentimes).toBe(25_000)
  })

  it('ne touche pas au calcul du salaire', () => {
    expect(calculerRemuneration(ISOLE_3000, TITRES_ET_TELETRAVAIL, SEPT).resultat).toEqual(calculerNet(ISOLE_3000, SEPT))
  })

  it('lève PeriodeNonCouverte hors des périodes intégrées', () => {
    expect(() => calculerRemuneration(ISOLE_3000, AVANTAGES_AUCUN, '2027-01-15')).toThrow(PeriodeNonCouverte)
  })
})

describe('calculerBrutDepuisNetVerse', () => {
  const COMBINAISONS: ReadonlyArray<readonly [string, SituationFamiliale, Avantages]> = [
    ['isolé sans avantage', ISOLE, AVANTAGES_AUCUN],
    ['isolé avec titres et télétravail', ISOLE, TITRES_ET_TELETRAVAIL],
    [
      'marié 2 enfants, titres seuls',
      { etatCivil: 'marieOuCohabitant', revenusConjoint: 'superieurs', enfantsACharge: 2, parentIsole: false },
      { ...AVANTAGES_AUCUN, titresRepas: { actif: true, joursPrestes: 22, valeurFacialeCentimes: 800, partTravailleurCentimes: 109 } },
    ],
  ]

  it.each(COMBINAISONS.flatMap(([nom, famille, avantages]) => [AOUT, SEPT].map((date) => [`${nom} (${date})`, famille, avantages, date] as const)))(
    '%s : donne le plus petit brut dont le net versé atteint la cible',
    (_nom, famille, avantages, date) => {
      for (const cible of [150_000, 200_000, 226_133]) {
        const r = calculerBrutDepuisNetVerse(famille, avantages, cible, date)
        expect(r.brutCentimes).toBe(brutOracleNetVerse(famille, avantages, cible, date))
        expect(r.complet.netVerseCentimes).toBeGreaterThanOrEqual(cible)
        expect(r.netVerseCibleCentimes).toBe(cible)
      }
    },
  )

  it('ramène la cible à 1 centime quand l\'indemnité dépasse à elle seule le net souhaité', () => {
    const teletravailSeul: Avantages = { ...AVANTAGES_AUCUN, teletravail: { actif: true, indemniteCentimes: 16_099 } }
    const r = calculerBrutDepuisNetVerse(ISOLE, teletravailSeul, 10_000, SEPT)
    expect(r.brutCentimes).toBe(1)
    expect(r.complet.netVerseCentimes).toBeGreaterThanOrEqual(10_000)
  })

  it('le résultat complet correspond au brut trouvé', () => {
    const r = calculerBrutDepuisNetVerse(ISOLE, TITRES_ET_TELETRAVAIL, 220_000, SEPT)
    expect(r.complet.resultat).toEqual(calculerNet({ ...ISOLE, brutMensuelCentimes: r.brutCentimes }, SEPT))
  })

  it('lève NetHorsLimites pour un net versé inatteignable', () => {
    expect(() => calculerBrutDepuisNetVerse(ISOLE, AVANTAGES_AUCUN, 5_000_000, SEPT)).toThrow(NetHorsLimites)
  })

  it('lève PeriodeNonCouverte hors des périodes intégrées', () => {
    expect(() => calculerBrutDepuisNetVerse(ISOLE, AVANTAGES_AUCUN, 200_000, '2027-01-15')).toThrow(PeriodeNonCouverte)
  })
})
