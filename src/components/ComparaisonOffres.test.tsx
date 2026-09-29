import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { comparerOffres, type ResumeOffre } from '../engine/comparaison'
import { formatEuro } from '../utils/format'
import { ComparaisonOffres } from './ComparaisonOffres'

/** Testing Library normalise les espaces du DOM ; Intl produit des espaces insécables. */
const euros = (centimes: number) => formatEuro(centimes).replace(/\s/g, ' ')

const A: ResumeOffre = {
  brutMensuelCentimes: 300_000,
  brutAnnuelCentimes: 4_176_000,
  netVerseCentimes: 226_133,
  netAnnuelToutComprisCentimes: 2_994_614,
  titresRepasMensuelCentimes: 0,
  ecochequesAnnuelCentimes: 0,
  choixMobilite: 'voiture',
  atnMensuelCentimes: 0,
  tauxRetour: 0.7537766666666667,
}

const B: ResumeOffre = {
  ...A,
  brutMensuelCentimes: 350_000,
  brutAnnuelCentimes: 4_872_000,
  netVerseCentimes: 237_860,
  netAnnuelToutComprisCentimes: 3_182_174,
  titresRepasMensuelCentimes: 20_000,
  choixMobilite: 'budgetMobilite',
  tauxRetour: 0.6858285714285715,
}

/** Textes des cellules d'une ligne : offre A, offre B, écart. */
function cellules(libelle: string) {
  const ligne = screen.getByRole('rowheader', { name: new RegExp(`^${libelle}`) }).closest('tr')
  if (!ligne) {
    throw new Error(`Ligne introuvable : ${libelle}`)
  }
  return within(ligne)
    .getAllByRole('cell')
    .map((cellule) => (cellule.textContent ?? '').replace(/\s/g, ' '))
}

describe('ComparaisonOffres', () => {
  it('est une région nommée, avec les colonnes des deux offres et de l’écart', () => {
    render(<ComparaisonOffres comparaison={comparerOffres(A, B)} />)
    const region = screen.getByRole('region', { name: 'Comparaison des offres' })
    expect(within(region).getByRole('columnheader', { name: 'Offre A' })).toBeInTheDocument()
    expect(within(region).getByRole('columnheader', { name: 'Offre B' })).toBeInTheDocument()
    expect(within(region).getByRole('columnheader', { name: 'Écart (B − A)' })).toBeInTheDocument()
  })

  it('montre chaque montant et son écart signé', () => {
    render(<ComparaisonOffres comparaison={comparerOffres(A, B)} />)
    expect(cellules('Brut mensuel')).toEqual([euros(300_000), euros(350_000), `+ ${euros(50_000)}`])
    expect(cellules('Brut annuel')).toEqual([euros(4_176_000), euros(4_872_000), `+ ${euros(696_000)}`])
    expect(cellules('Net versé')).toEqual([euros(226_133), euros(237_860), `+ ${euros(11_727)}`])
    expect(cellules('Net annuel tout compris')).toEqual([euros(2_994_614), euros(3_182_174), `+ ${euros(187_560)}`])
    expect(cellules('Titres-repas')).toEqual([euros(0), euros(20_000), `+ ${euros(20_000)}`])
    expect(cellules('Total annuel en poche')).toEqual([euros(2_994_614), euros(3_422_174), `+ ${euros(427_560)}`])
  })

  it('signe un écart négatif avec le vrai signe moins', () => {
    render(<ComparaisonOffres comparaison={comparerOffres(B, A)} />)
    expect(cellules('Net versé')[2]).toBe(`− ${euros(11_727)}`)
  })

  it('montre la mobilité et le taux de retour sans écart', () => {
    render(<ComparaisonOffres comparaison={comparerOffres({ ...A, atnMensuelCentimes: 12_000 }, B)} />)
    expect(cellules('Mobilité')).toEqual([`Voiture · ATN ${euros(12_000)}/mois`, 'Budget mobilité', ''])
    expect(cellules('Taux de retour')).toEqual(['75,4 %', '68,6 %', ''])
  })

  it('écrit « Aucune » sans voiture ni budget mobilité', () => {
    render(<ComparaisonOffres comparaison={comparerOffres({ ...A, choixMobilite: 'aucun' }, A)} />)
    expect(cellules('Mobilité')[0]).toBe('Aucune')
  })

  it('cache les lignes des titres-repas et des écochèques quand aucune offre n’en a', () => {
    render(<ComparaisonOffres comparaison={comparerOffres(A, { ...A })} />)
    expect(screen.queryByRole('rowheader', { name: /^Titres-repas/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('rowheader', { name: /^Écochèques/ })).not.toBeInTheDocument()
  })

  it('montre les écochèques quand une offre en a', () => {
    render(<ComparaisonOffres comparaison={comparerOffres(A, { ...A, ecochequesAnnuelCentimes: 25_000 })} />)
    expect(cellules('Écochèques')).toEqual([euros(0), euros(25_000), `+ ${euros(25_000)}`])
  })

  it('résume quelle offre rapporte le plus, ou l’égalité', () => {
    const premier = render(<ComparaisonOffres comparaison={comparerOffres(A, B)} />)
    expect(screen.getByText(`L’offre B rapporte ${euros(427_560)} de plus par an`)).toBeInTheDocument()
    premier.unmount()
    const second = render(<ComparaisonOffres comparaison={comparerOffres(B, A)} />)
    expect(screen.getByText(`L’offre A rapporte ${euros(427_560)} de plus par an`)).toBeInTheDocument()
    second.unmount()
    render(<ComparaisonOffres comparaison={comparerOffres(A, { ...A })} />)
    expect(screen.getByText('Les deux offres rapportent autant')).toBeInTheDocument()
    expect(cellules('Net versé')[2]).toBe(euros(0))
  })

  it('montre « — » pour une offre sans résultat, et dans l’écart', () => {
    render(<ComparaisonOffres comparaison={comparerOffres(A, null)} />)
    expect(cellules('Net versé')).toEqual([euros(226_133), '—', '—'])
    expect(cellules('Total annuel en poche')).toEqual([euros(2_994_614), '—', '—'])
    expect(cellules('Mobilité')).toEqual([`Voiture · ATN ${euros(0)}/mois`, '—', ''])
    expect(screen.queryByText(/rapporte/)).not.toBeInTheDocument()
  })
})
