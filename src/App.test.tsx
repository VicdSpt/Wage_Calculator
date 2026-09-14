import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { calculerNet } from './engine/calculerNet'
import { SAISIE_PAR_DEFAUT } from './engine/validation'
import { CLE_STOCKAGE } from './hooks/useSaisie'
import { formatEuro } from './utils/format'

const DATE = '2026-09-14'

/** Testing Library normalise les espaces du DOM ; Intl produit des espaces insécables. */
const euros = (centimes: number) => formatEuro(centimes).replace(/\s/g, ' ')

function recapitulatif() {
  return screen.getByRole('region', { name: 'Votre salaire net' })
}

describe('App', () => {
  it('affiche le net de la saisie par défaut', () => {
    render(<App dateIso={DATE} />)
    expect(within(recapitulatif()).getByText(euros(226_133))).toBeInTheDocument()
  })

  it('met à jour le net quand le brut change', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    const brut = screen.getByLabelText('Salaire brut mensuel (€)')
    await user.clear(brut)
    await user.type(brut, '4500')
    const attendu = calculerNet(
      { brutMensuelCentimes: 450_000, etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false },
      DATE,
    ).netMensuelCentimes
    expect(within(recapitulatif()).getByText(euros(attendu))).toBeInTheDocument()
  })

  it('n’affiche les revenus du conjoint que pour un marié ou cohabitant', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    expect(screen.queryByLabelText('Revenus du conjoint')).not.toBeInTheDocument()
    await user.click(screen.getByLabelText('Marié ou cohabitant légal'))
    expect(screen.getByLabelText('Revenus du conjoint')).toBeInTheDocument()
  })

  it('n’affiche « parent isolé » que pour un isolé avec au moins un enfant', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    const parentIsole = /parent isolé/
    expect(screen.queryByLabelText(parentIsole)).not.toBeInTheDocument()

    const enfants = screen.getByLabelText('Enfants à charge')
    await user.clear(enfants)
    await user.type(enfants, '1')
    expect(screen.getByLabelText(parentIsole)).toBeInTheDocument()

    await user.click(screen.getByLabelText('Marié ou cohabitant légal'))
    expect(screen.queryByLabelText(parentIsole)).not.toBeInTheDocument()
  })

  it('affiche l’erreur de saisie et masque les montants', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.clear(screen.getByLabelText('Salaire brut mensuel (€)'))
    expect(screen.getByText('Indiquez votre salaire brut mensuel.')).toBeInTheDocument()
    expect(screen.getByLabelText('Salaire brut mensuel (€)')).toHaveAttribute('aria-invalid', 'true')
    expect(within(recapitulatif()).getAllByText('—').length).toBeGreaterThan(0)
  })

  it('restaure la saisie mémorisée', () => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, brut: '2500' }))
    render(<App dateIso={DATE} />)
    expect(screen.getByLabelText('Salaire brut mensuel (€)')).toHaveValue('2500')
  })

  it('ignore un stockage corrompu', () => {
    localStorage.setItem(CLE_STOCKAGE, '{corrompu')
    render(<App dateIso={DATE} />)
    expect(screen.getByLabelText('Salaire brut mensuel (€)')).toHaveValue('3000')
  })

  it('signale une période non couverte', () => {
    render(<App dateIso="2027-01-15" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Les règles pour le 15/01/2027 ne sont pas encore intégrées.')
  })

  it('avertit sous le salaire minimum', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    const brut = screen.getByLabelText('Salaire brut mensuel (€)')
    await user.clear(brut)
    await user.type(brut, '2000')
    expect(screen.getByText(/inférieur au salaire minimum légal/)).toBeInTheDocument()
  })

  it('déplie et replie une explication au clavier', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    const bouton = screen.getByRole('button', { name: 'Explication : Cotisations ONSS (13,07 %)' })
    expect(bouton).toHaveAttribute('aria-expanded', 'false')
    await user.click(bouton)
    expect(bouton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/Cotisation personnelle de sécurité sociale/)).toBeVisible()
    await user.keyboard('{Escape}')
    expect(bouton).toHaveAttribute('aria-expanded', 'false')
  })
})