import { describe, expect, it } from 'vitest'
import { comparerOffres, totalAnnuelEnPoche, type ResumeOffre } from './comparaison'

const A: ResumeOffre = {
  brutMensuelCentimes: 300_000,
  brutAnnuelCentimes: 4_176_000,
  netVerseCentimes: 226_133,
  netAnnuelToutComprisCentimes: 2_994_614,
  titresRepasMensuelCentimes: 0,
  ecochequesAnnuelCentimes: 0,
  choixMobilite: 'voiture',
  atnMensuelCentimes: 0,
  tauxRetour: 0.7538,
}

const B: ResumeOffre = {
  ...A,
  brutMensuelCentimes: 350_000,
  brutAnnuelCentimes: 4_872_000,
  netVerseCentimes: 237_860,
  netAnnuelToutComprisCentimes: 3_182_174,
  titresRepasMensuelCentimes: 20_000,
  tauxRetour: 0.6858,
}

describe('totalAnnuelEnPoche', () => {
  it('additionne le net annuel tout compris, 12 mois de titres-repas et les écochèques', () => {
    expect(totalAnnuelEnPoche(A)).toBe(2_994_614)
    expect(totalAnnuelEnPoche(B)).toBe(3_182_174 + 12 * 20_000)
    expect(totalAnnuelEnPoche({ ...A, ecochequesAnnuelCentimes: 25_000 })).toBe(2_994_614 + 25_000)
  })

  it('ne compte pas la voiture de société', () => {
    expect(totalAnnuelEnPoche({ ...A, atnMensuelCentimes: 12_000 })).toBe(2_994_614)
  })
})

describe('comparerOffres', () => {
  it('calcule chaque écart B − A au centime', () => {
    expect(comparerOffres(A, B).ecarts).toEqual({
      brutMensuel: 50_000,
      brutAnnuel: 696_000,
      netVerse: 11_727,
      netAnnuelToutCompris: 187_560,
      titresRepas: 20_000,
      ecocheques: 0,
      totalAnnuelEnPoche: 427_560,
    })
  })

  it('donne des écarts négatifs quand l’offre A rapporte plus', () => {
    const comparaison = comparerOffres(B, A)
    expect(comparaison.ecarts?.totalAnnuelEnPoche).toBe(-427_560)
    expect(comparaison.gagnante).toBe('A')
  })

  it('désigne l’offre B quand elle rapporte plus', () => {
    const comparaison = comparerOffres(A, B)
    expect(comparaison.totalA).toBe(2_994_614)
    expect(comparaison.totalB).toBe(3_422_174)
    expect(comparaison.gagnante).toBe('B')
  })

  it('signale l’égalité parfaite', () => {
    const comparaison = comparerOffres(A, { ...A })
    expect(comparaison.gagnante).toBe('egalite')
    expect(comparaison.ecarts?.totalAnnuelEnPoche).toBe(0)
  })

  it('n’a ni écarts ni gagnante quand une offre n’a pas de résultat', () => {
    for (const comparaison of [comparerOffres(A, null), comparerOffres(null, B), comparerOffres(null, null)]) {
      expect(comparaison.ecarts).toBeNull()
      expect(comparaison.gagnante).toBeNull()
    }
    expect(comparerOffres(A, null).totalA).toBe(2_994_614)
    expect(comparerOffres(A, null).totalB).toBeNull()
  })

  it('n’affiche les titres-repas et les écochèques que si une offre en a', () => {
    expect(comparerOffres(A, { ...A })).toMatchObject({ afficherTitresRepas: false, afficherEcocheques: false })
    expect(comparerOffres(A, B)).toMatchObject({ afficherTitresRepas: true, afficherEcocheques: false })
    expect(comparerOffres({ ...A, ecochequesAnnuelCentimes: 25_000 }, A)).toMatchObject({ afficherEcocheques: true })
    expect(comparerOffres(null, B)).toMatchObject({ afficherTitresRepas: true })
  })
})
