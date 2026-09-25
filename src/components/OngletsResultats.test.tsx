import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { OngletsResultats, type Onglet } from './OngletsResultats'

const DETAIL: Onglet = { id: 'detail', libelle: 'Détail', contenu: <p>contenu détail</p> }
const PRIMES: Onglet = { id: 'primes', libelle: 'Primes', contenu: <p>contenu primes</p> }
const BUDGET: Onglet = { id: 'budget', libelle: 'Budget', contenu: <p>contenu budget</p> }

const onglet = (nom: string) => screen.getByRole('tab', { name: nom })

describe('OngletsResultats', () => {
  it('sélectionne le premier onglet par défaut et n’affiche que son panneau', () => {
    render(<OngletsResultats onglets={[DETAIL, PRIMES, BUDGET]} />)
    expect(onglet('Détail')).toHaveAttribute('aria-selected', 'true')
    expect(onglet('Primes')).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('contenu détail')
    expect(screen.queryByText('contenu primes')).not.toBeInTheDocument()
  })

  it('étiquette le panneau par son onglet', () => {
    render(<OngletsResultats onglets={[DETAIL, PRIMES]} />)
    expect(screen.getByRole('tabpanel', { name: 'Détail' })).toBeInTheDocument()
  })

  it('nomme la liste d’onglets', () => {
    render(<OngletsResultats onglets={[DETAIL, PRIMES]} />)
    expect(screen.getByRole('tablist', { name: 'Résultats détaillés' })).toBeInTheDocument()
  })

  it('change de panneau au clic', async () => {
    const user = userEvent.setup()
    render(<OngletsResultats onglets={[DETAIL, PRIMES, BUDGET]} />)
    await user.click(onglet('Primes'))
    expect(onglet('Primes')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Primes' })).toHaveTextContent('contenu primes')
  })

  it('ne met que l’onglet actif dans l’ordre de tabulation', () => {
    render(<OngletsResultats onglets={[DETAIL, PRIMES, BUDGET]} />)
    expect(onglet('Détail')).toHaveAttribute('tabindex', '0')
    expect(onglet('Primes')).toHaveAttribute('tabindex', '-1')
    expect(onglet('Budget')).toHaveAttribute('tabindex', '-1')
  })

  it('se parcourt aux flèches, en boucle, et va au premier ou au dernier avec Début et Fin', async () => {
    const user = userEvent.setup()
    render(<OngletsResultats onglets={[DETAIL, PRIMES, BUDGET]} />)
    await user.tab()
    expect(onglet('Détail')).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(onglet('Primes')).toHaveFocus()
    expect(onglet('Primes')).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(onglet('Budget')).toHaveFocus()
    await user.keyboard('{Home}')
    expect(onglet('Détail')).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{End}')
    expect(onglet('Budget')).toHaveAttribute('aria-selected', 'true')
  })

  it('revient au premier onglet quand l’onglet actif disparaît, et n’y retourne pas s’il réapparaît', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<OngletsResultats onglets={[DETAIL, PRIMES]} />)
    await user.click(onglet('Primes'))
    rerender(<OngletsResultats onglets={[DETAIL]} />)
    expect(onglet('Détail')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('contenu détail')
    rerender(<OngletsResultats onglets={[DETAIL, PRIMES]} />)
    expect(onglet('Détail')).toHaveAttribute('aria-selected', 'true')
  })
})
