import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { calculerBrut } from './engine/calculerBrut'
import { calculerNet } from './engine/calculerNet'
import { SAISIE_PAR_DEFAUT } from './engine/validation'
import { CLE_STOCKAGE } from './hooks/useSaisie'
import { centimesEnSaisie, formatEuro } from './utils/format'

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
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, montant: '2500' }))
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

describe('App — net → brut', () => {
  const ISOLE = { etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false } as const
  const LIBELLE_BRUT = 'Salaire brut mensuel (€)'
  const LIBELLE_NET = 'Salaire net mensuel souhaité (€)'
  const recapBrut = () => screen.getByRole('region', { name: 'Votre salaire brut' })

  it('bascule en net → brut en reprenant le net affiché, puis revient au brut d’origine', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)

    await user.click(screen.getByRole('radio', { name: 'Net → brut' }))
    expect(screen.getByLabelText(LIBELLE_NET)).toHaveValue('2261,33')
    expect(within(recapBrut()).getByText(euros(299_996))).toBeInTheDocument()
    expect(within(recapBrut()).getByText(euros(226_133))).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Brut → net' }))
    expect(screen.getByLabelText(LIBELLE_BRUT)).toHaveValue('3000')
    expect(within(recapitulatif()).getByText(euros(226_133))).toBeInTheDocument()
  })

  it('reprend le brut trouvé si le net a été modifié après la bascule', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByRole('radio', { name: 'Net → brut' }))
    const net = screen.getByLabelText(LIBELLE_NET)
    await user.clear(net)
    await user.type(net, '2500')
    const brutTrouve = calculerBrut(ISOLE, 250_000, DATE).brutCentimes
    expect(within(recapBrut()).getByText(euros(brutTrouve))).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Brut → net' }))
    expect(screen.getByLabelText(LIBELLE_BRUT)).toHaveValue(centimesEnSaisie(brutTrouve))
  })

  it('signale un net impossible au centime près', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByRole('radio', { name: 'Net → brut' }))
    const net = screen.getByLabelText(LIBELLE_NET)
    await user.clear(net)
    await user.type(net, '1808,45')
    // Brut nécessaire et net obtenu valent tous deux 1 808,46 € : les deux occurrences sont attendues.
    expect(within(recapBrut()).getAllByText(euros(180_846))).toHaveLength(2)
    expect(within(recapBrut()).getByText(`${euros(1)} de plus que demandé : aucun brut ne donne exactement ce net`)).toBeInTheDocument()
  })

  it('refuse un net au-delà du maximum atteignable', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByRole('radio', { name: 'Net → brut' }))
    const net = screen.getByLabelText(LIBELLE_NET)
    await user.clear(net)
    await user.type(net, '50000')
    expect(screen.getByText(`Au-delà de ${euros(4_146_374)} net, le brut nécessaire dépasse 100 000 €.`)).toBeInTheDocument()
    expect(net).toHaveAttribute('aria-invalid', 'true')
    expect(within(screen.getByRole('region', { name: 'Détail du calcul' })).getByText('—')).toBeInTheDocument()
    expect(screen.getByText('Corrigez la saisie pour voir le calcul.')).toBeInTheDocument()
  })

  it('demande le net souhaité quand le champ est vide', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByRole('radio', { name: 'Net → brut' }))
    await user.clear(screen.getByLabelText(LIBELLE_NET))
    expect(screen.getByText('Indiquez le salaire net mensuel souhaité.')).toBeInTheDocument()
  })

  it('explique que le brut affiché est le plus petit qui atteint le net', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByRole('radio', { name: 'Net → brut' }))
    await user.click(screen.getByRole('button', { name: 'Explication : Salaire brut' }))
    expect(screen.getByText('Le plus petit brut mensuel qui donne au moins le net demandé.')).toBeVisible()
  })

  it('avertit quand le brut trouvé est sous le salaire minimum', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByRole('radio', { name: 'Net → brut' }))
    const net = screen.getByLabelText(LIBELLE_NET)
    await user.clear(net)
    await user.type(net, '1800')
    expect(screen.getByText(/inférieur au salaire minimum légal/)).toBeInTheDocument()
  })

  it('restaure le sens mémorisé', () => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, sens: 'netVersBrut', montant: '2500' }))
    render(<App dateIso={DATE} />)
    expect(screen.getByRole('radio', { name: 'Net → brut' })).toBeChecked()
    expect(screen.getByLabelText(LIBELLE_NET)).toHaveValue('2500')
  })

  it('vérifie l’exemple par le moteur : le brut trouvé redonne le net demandé', () => {
    expect(calculerNet({ ...ISOLE, brutMensuelCentimes: 299_996 }, DATE).netMensuelCentimes).toBe(226_133)
  })
})