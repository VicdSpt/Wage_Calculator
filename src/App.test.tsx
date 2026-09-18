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
      { brutMensuelCentimes: 450_000, etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false, atnMensuelCentimes: 0 },
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
  const ISOLE = { etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false, atnMensuelCentimes: 0 } as const
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

  it('reprend le résultat après une modification de la situation familiale, pas le montant d’origine', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByRole('radio', { name: 'Net → brut' }))
    expect(screen.getByLabelText(LIBELLE_NET)).toHaveValue('2261,33')

    const enfants = screen.getByLabelText('Enfants à charge')
    await user.clear(enfants)
    await user.type(enfants, '2')

    await user.click(screen.getByRole('radio', { name: 'Brut → net' }))
    const brutAttendu = calculerBrut({ ...ISOLE, enfantsACharge: 2 }, 226_133, DATE).brutCentimes
    expect(screen.getByLabelText(LIBELLE_BRUT)).toHaveValue(centimesEnSaisie(brutAttendu))
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

describe('App — avantages extralégaux', () => {
  const recapNet = () => screen.getByRole('region', { name: 'Votre salaire net' })
  const recapBrut = () => screen.getByRole('region', { name: 'Votre salaire brut' })
  const detail = () => screen.getByRole('region', { name: 'Détail du calcul' })

  it('n’affiche les champs d’un avantage qu’une fois coché', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    expect(screen.queryByLabelText('Jours prestés dans le mois')).not.toBeInTheDocument()
    await user.click(screen.getByLabelText('Titres-repas'))
    expect(screen.getByLabelText('Jours prestés dans le mois')).toHaveValue('20')
    expect(screen.getByLabelText('Valeur faciale du titre (€)')).toHaveValue('10,00')
    expect(screen.getByLabelText('Part du travailleur (€)')).toHaveValue('1,09')
  })

  it('déduit la part personnelle des titres-repas du net versé', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Titres-repas'))
    expect(within(recapNet()).getByText(euros(226_133 - 2_180))).toBeInTheDocument()
    expect(within(recapNet()).getByText(euros(20_000))).toBeInTheDocument()
    expect(within(recapNet()).getByText(euros(226_133 - 2_180 + 20_000))).toBeInTheDocument()
  })

  it('ajoute l’indemnité de télétravail et affiche le plafond de la période', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Indemnité de télétravail'))
    expect(screen.getByText(`Plafond ONSS : ${euros(16_421)}`)).toBeInTheDocument()
    expect(within(recapNet()).getByText(euros(226_133 + 16_099))).toBeInTheDocument()
  })

  it('le net annuel suit le net versé quand un avantage modifie l’argent versé', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Titres-repas'))
    expect(within(recapNet()).getByText(euros((226_133 - 2_180) * 12))).toBeInTheDocument()
  })

  it('garde le plafond ONSS et la phrase sur les conditions d’exonération même si le montant principal est vide', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Indemnité de télétravail'))
    await user.clear(screen.getByLabelText('Salaire brut mensuel (€)'))
    expect(screen.getByText(`Plafond ONSS : ${euros(16_421)}`)).toBeInTheDocument()
    expect(screen.getByText(/conditions d’exonération/)).toBeInTheDocument()
  })

  it('affiche les écochèques en annuel, hors du total mensuel', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Écochèques'))
    expect(within(recapNet()).getByText(`${euros(25_000)} par an`)).toBeInTheDocument()
    expect(within(recapNet()).getByText(euros(226_133))).toBeInTheDocument()
  })

  it('garde le libellé « Net mensuel » quand seuls les écochèques sont cochés, sans effet sur l’argent versé', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Écochèques'))
    expect(within(recapNet()).getByText('Net mensuel')).toBeInTheDocument()
    expect(screen.queryByText('Net versé sur le compte')).not.toBeInTheDocument()
    expect(within(recapNet()).getByText(euros(226_133))).toBeInTheDocument()
    expect(within(recapNet()).getByText(`${euros(25_000)} par an`)).toBeInTheDocument()
  })

  it('ajoute les lignes d’avantages au détail du calcul', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Titres-repas'))
    expect(within(detail()).getByText('Part personnelle des titres-repas')).toBeInTheDocument()
    expect(within(detail()).getByText('Net versé')).toBeInTheDocument()
    // Le signe et le montant sont deux nœuds de texte : on vérifie la ligne entière.
    expect(within(detail()).getByText('Part personnelle des titres-repas').closest('li')).toHaveTextContent(euros(2_180))
  })

  it('alerte quand la part patronale dépasse le plafond', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Titres-repas'))
    const part = screen.getByLabelText('Part du travailleur (€)')
    await user.clear(part)
    await user.type(part, '0,50')
    expect(screen.getByText(/Part patronale de/)).toHaveTextContent(euros(950))
  })

  it('refuse un nombre de jours invalide', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Titres-repas'))
    const jours = screen.getByLabelText('Jours prestés dans le mois')
    await user.clear(jours)
    await user.type(jours, '99')
    expect(screen.getByText('Indiquez un nombre entier de jours prestés entre 0 et 23.')).toBeInTheDocument()
    expect(within(detail()).getByText('—')).toBeInTheDocument()
  })

  it('net → brut : la cible est le net versé sur le compte', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Titres-repas'))
    await user.click(screen.getByRole('radio', { name: 'Net → brut' }))
    const net = screen.getByLabelText('Salaire net mensuel souhaité (€)')
    await user.clear(net)
    await user.type(net, '2239,53')
    expect(within(recapBrut()).getByText(euros(299_996))).toBeInTheDocument()
  })

  it('restaure les avantages mémorisés', () => {
    localStorage.setItem(
      CLE_STOCKAGE,
      JSON.stringify({ ...SAISIE_PAR_DEFAUT, avantages: { ...SAISIE_PAR_DEFAUT.avantages, titresRepasActif: true, joursPrestes: '18' } }),
    )
    render(<App dateIso={DATE} />)
    expect(screen.getByLabelText('Jours prestés dans le mois')).toHaveValue('18')
  })
})