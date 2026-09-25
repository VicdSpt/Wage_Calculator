import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SectionRepliable } from './SectionRepliable'

function section(aUneErreur = false) {
  return (
    <SectionRepliable id="essai" titre="Primes" resume="13e mois 100 %" aUneErreur={aUneErreur}>
      <label>
        Pourcentage
        <input />
      </label>
    </SectionRepliable>
  )
}

const bouton = () => screen.getByRole('button', { name: /^Primes/ })

describe('SectionRepliable', () => {
  it('est fermée par défaut et montre son résumé', () => {
    render(section())
    expect(bouton()).toHaveAttribute('aria-expanded', 'false')
    expect(bouton()).toHaveTextContent('13e mois 100 %')
    expect(screen.queryByLabelText('Pourcentage')).not.toBeInTheDocument()
  })

  it('s’ouvre et se referme au clic, résumé toujours visible', async () => {
    const user = userEvent.setup()
    render(section())
    await user.click(bouton())
    expect(bouton()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Pourcentage')).toBeInTheDocument()
    expect(bouton()).toHaveTextContent('13e mois 100 %')
    await user.click(bouton())
    expect(bouton()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('Pourcentage')).not.toBeInTheDocument()
  })

  it('s’ouvre au clavier, avec Entrée comme avec Espace', async () => {
    const user = userEvent.setup()
    render(section())
    await user.tab()
    expect(bouton()).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(bouton()).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard(' ')
    expect(bouton()).toHaveAttribute('aria-expanded', 'false')
  })

  it('désigne son contenu par aria-controls', async () => {
    const user = userEvent.setup()
    render(section())
    await user.click(bouton())
    const panneau = document.getElementById(bouton().getAttribute('aria-controls') ?? '')
    expect(panneau).toContainElement(screen.getByLabelText('Pourcentage'))
  })

  it('s’ouvre d’office sur une erreur, le signale, et ne se referme pas', async () => {
    const user = userEvent.setup()
    render(section(true))
    expect(bouton()).toHaveAttribute('aria-expanded', 'true')
    expect(bouton()).toHaveTextContent('⚠ à corriger')
    expect(bouton()).not.toHaveTextContent('13e mois 100 %')
    await user.click(bouton())
    expect(screen.getByLabelText('Pourcentage')).toBeInTheDocument()
  })

  it('reste ouverte quand l’erreur est corrigée', () => {
    const { rerender } = render(section(false))
    rerender(section(true))
    expect(bouton()).toHaveAttribute('aria-expanded', 'true')
    rerender(section(false))
    // Le champ ne doit pas disparaître au moment où la saisie redevient valide.
    expect(bouton()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Pourcentage')).toBeInTheDocument()
    expect(bouton()).toHaveTextContent('13e mois 100 %')
  })
})
