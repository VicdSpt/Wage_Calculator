import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { IdOffre } from '../hooks/useSaisie'
import { OngletsOffres } from './OngletsOffres'

function Onglets({ enErreur = { A: false, B: false } }: { enErreur?: Record<IdOffre, boolean> }) {
  const [active, setActive] = useState<IdOffre>('A')
  return <OngletsOffres active={active} enErreur={enErreur} onChoisir={setActive} actions={<button type="button">Action</button>} />
}

describe('OngletsOffres', () => {
  it('nomme la liste et sélectionne l’offre ouverte', () => {
    render(<Onglets />)
    expect(screen.getByRole('tablist', { name: 'Offres comparées' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Offre A' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Offre B' })).toHaveAttribute('aria-selected', 'false')
  })

  it('donne à chaque onglet un identifiant stable, pour l’étiquetage du panneau rendu par l’appelant', () => {
    render(<Onglets />)
    expect(screen.getByRole('tab', { name: 'Offre A' })).toHaveAttribute('id', 'onglet-offre-A')
    expect(screen.getByRole('tab', { name: 'Offre B' })).toHaveAttribute('id', 'onglet-offre-B')
  })

  it('change d’offre au clic', async () => {
    const user = userEvent.setup()
    render(<Onglets />)
    await user.click(screen.getByRole('tab', { name: 'Offre B' }))
    expect(screen.getByRole('tab', { name: 'Offre B' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Offre A' })).toHaveAttribute('aria-selected', 'false')
  })

  it('ne met que l’onglet ouvert dans l’ordre de tabulation', () => {
    render(<Onglets />)
    expect(screen.getByRole('tab', { name: 'Offre A' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Offre B' })).toHaveAttribute('tabindex', '-1')
  })

  it('se parcourt aux flèches, en boucle, et avec Début et Fin', async () => {
    const user = userEvent.setup()
    render(<Onglets />)
    screen.getByRole('tab', { name: 'Offre A' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Offre B' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Offre B' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Offre A' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Offre B' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Offre A' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Offre B' })).toHaveFocus()
  })

  it('marque d’un ⚠ l’offre à corriger, et le dit au lecteur d’écran', () => {
    render(<Onglets enErreur={{ A: false, B: true }} />)
    const onglet = screen.getByRole('tab', { name: 'Offre B, à corriger' })
    expect(onglet).toHaveTextContent('⚠')
    expect(screen.getByRole('tab', { name: 'Offre A' })).not.toHaveTextContent('⚠')
  })

  it('affiche les actions hors de la liste d’onglets', () => {
    const onChoisir = vi.fn()
    render(<OngletsOffres active="A" enErreur={{ A: false, B: false }} onChoisir={onChoisir} actions={<button type="button">Action</button>} />)
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    expect(screen.getByRole('tablist')).not.toContainElement(screen.getByRole('button', { name: 'Action' }))
  })
})
