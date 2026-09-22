import { fireEvent, render, screen, within } from '@testing-library/react'
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
describe('App — avantage de toute nature et frais propres', () => {
  it('ajoute l’ATN à la base du précompte sans le retirer du net', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    const atn = screen.getByLabelText('Avantage de toute nature mensuel (€)')
    expect(atn).toHaveValue('0')
    await user.clear(atn)
    await user.type(atn, '200')

    const attendu = calculerNet(
      {
        brutMensuelCentimes: 300_000,
        atnMensuelCentimes: 20_000,
        etatCivil: 'isole',
        revenusConjoint: null,
        enfantsACharge: 0,
        parentIsole: false,
      },
      DATE,
    )
    expect(
      within(screen.getByRole('region', { name: 'Votre salaire net' })).getByText(euros(attendu.netMensuelCentimes)),
    ).toBeInTheDocument()

    const detail = screen.getByRole('region', { name: 'Détail du calcul' })
    expect(within(detail).getByText('Avantage de toute nature')).toBeInTheDocument()
    expect(within(detail).getByText('Avantage de toute nature (retenu)')).toBeInTheDocument()
  })

  it('n’affiche aucune ligne d’ATN quand il vaut zéro', () => {
    render(<App dateIso={DATE} />)
    expect(
      within(screen.getByRole('region', { name: 'Détail du calcul' })).queryByText('Avantage de toute nature'),
    ).not.toBeInTheDocument()
  })

  it('ajoute les frais propres au net versé', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Frais propres à l’employeur'))
    const montant = screen.getByLabelText('Montant mensuel remboursé (€)')
    await user.clear(montant)
    await user.type(montant, '100,84')
    const recap = screen.getByRole('region', { name: 'Votre salaire net' })
    expect(within(recap).getByText('Net versé sur le compte')).toBeInTheDocument()
    expect(within(recap).getByText(euros(226_133 + 10_084))).toBeInTheDocument()
    expect(within(recap).getByText(euros((226_133 + 10_084) * 12))).toBeInTheDocument()
  })

  it('ajoute les lignes « Frais propres à l’employeur » et « Net versé » au détail', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Frais propres à l’employeur'))
    const montant = screen.getByLabelText('Montant mensuel remboursé (€)')
    await user.clear(montant)
    await user.type(montant, '100,84')
    const detail = screen.getByRole('region', { name: 'Détail du calcul' })
    expect(within(detail).getByText('Frais propres à l’employeur')).toBeInTheDocument()
    expect(within(detail).getByText('Net versé')).toBeInTheDocument()
  })

  it('additionne titres-repas et frais propres dans la ligne « Net versé » du détail', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Titres-repas'))
    await user.click(screen.getByLabelText('Frais propres à l’employeur'))
    const montant = screen.getByLabelText('Montant mensuel remboursé (€)')
    await user.clear(montant)
    await user.type(montant, '100,84')
    const detail = screen.getByRole('region', { name: 'Détail du calcul' })
    expect(within(detail).getByText('Net versé').closest('li')).toHaveTextContent(euros(226_133 - 2_180 + 10_084))
  })

  it('refuse un ATN invalide', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    const atn = screen.getByLabelText('Avantage de toute nature mensuel (€)')
    await user.clear(atn)
    await user.type(atn, 'abc')
    expect(screen.getByText('Indiquez un montant entre 0,00 € et 10 000,00 €.')).toBeInTheDocument()
  })
})

describe('App — voiture de société', () => {
  /** Le champ <input type="month"> ne se tape pas au clavier dans jsdom : on fixe sa valeur. */
  function choisirImmatriculation(mois: string) {
    fireEvent.change(screen.getByLabelText('Première immatriculation'), { target: { value: mois } })
  }

  it('calcule l’ATN depuis la voiture et l’affiche en aperçu', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Calculer depuis la voiture'))
    choisirImmatriculation('2025-02')
    expect(screen.getByText(`ATN : ${euros(26_589)} par mois`)).toBeInTheDocument()
    const attendu = calculerNet(
      { brutMensuelCentimes: 300_000, atnMensuelCentimes: 26_589, etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false },
      DATE,
    )
    expect(within(recapitulatif()).getByText(euros(attendu.netMensuelCentimes))).toBeInTheDocument()
  })

  it('explique le calcul de l’ATN dans le détail', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Calculer depuis la voiture'))
    choisirImmatriculation('2025-02')
    const detail = screen.getByRole('region', { name: 'Détail du calcul' })
    const ligne = within(detail).getByText('Avantage de toute nature').closest('li')
    expect(ligne).toHaveTextContent('45 000,00 € × 94 % × 6/7 × 8,8 % = 3 190,63 € par an, soit 265,89 € par mois.')
    expect(ligne).toHaveTextContent('Art. 36 § 2 CIR 92')
  })

  it('signale le minimum légal quand il s’applique', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Calculer depuis la voiture'))
    await user.selectOptions(screen.getByLabelText('Carburant'), 'electrique')
    const valeur = screen.getByLabelText('Valeur catalogue (€)')
    await user.clear(valeur)
    await user.type(valeur, '30000')
    choisirImmatriculation('2026-09')
    expect(screen.getByText(`ATN : ${euros(14_083)} par mois`)).toBeInTheDocument()
    const ligne = within(screen.getByRole('region', { name: 'Détail du calcul' })).getByText('Avantage de toute nature').closest('li')
    expect(ligne).toHaveTextContent('minimum légal')
  })

  it('désactive le CO₂ pour une voiture électrique', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Calculer depuis la voiture'))
    expect(screen.getByLabelText('Émissions de CO₂ (g/km)')).toBeEnabled()
    await user.selectOptions(screen.getByLabelText('Carburant'), 'electrique')
    expect(screen.getByLabelText('Émissions de CO₂ (g/km)')).toBeDisabled()
  })

  it('demande la première immatriculation tant qu’elle manque', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Calculer depuis la voiture'))
    expect(screen.getByText('Indiquez le mois de première immatriculation, au plus tard le mois du calcul.')).toBeInTheDocument()
  })

  it('refuse une valeur catalogue hors limites', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Calculer depuis la voiture'))
    choisirImmatriculation('2025-02')
    const valeur = screen.getByLabelText('Valeur catalogue (€)')
    await user.clear(valeur)
    await user.type(valeur, '800000')
    expect(screen.getByText('Indiquez une valeur catalogue entre 0,01 € et 770 000,00 €.')).toBeInTheDocument()
  })

  it('retient la contribution sur le net versé et bascule le libellé du récapitulatif', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    const contribution = screen.getByLabelText('Contribution personnelle mensuelle (€)')
    await user.clear(contribution)
    await user.type(contribution, '50')
    const recap = recapitulatif()
    expect(within(recap).getByText('Net versé sur le compte')).toBeInTheDocument()
    expect(within(recap).getByText(euros(226_133 - 5_000))).toBeInTheDocument()
    expect(within(recap).getByText(euros((226_133 - 5_000) * 12))).toBeInTheDocument()
  })

  it('ajoute la ligne « Contribution personnelle voiture » au détail', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    const contribution = screen.getByLabelText('Contribution personnelle mensuelle (€)')
    await user.clear(contribution)
    await user.type(contribution, '50')
    const detail = screen.getByRole('region', { name: 'Détail du calcul' })
    expect(within(detail).getByText('Contribution personnelle voiture').closest('li')).toHaveTextContent(euros(5_000))
    expect(within(detail).getByText('Net versé').closest('li')).toHaveTextContent(euros(226_133 - 5_000))
  })

  it('garde le champ du montant en mode « Je connais le montant »', () => {
    render(<App dateIso={DATE} />)
    expect(screen.getByLabelText('Je connais le montant')).toBeChecked()
    expect(screen.getByLabelText('Avantage de toute nature mensuel (€)')).toBeInTheDocument()
    expect(screen.queryByLabelText('Valeur catalogue (€)')).not.toBeInTheDocument()
  })
})
