import { useRef, type KeyboardEvent } from 'react'

/**
 * Clavier des onglets, motif ARIA (spec ergonomie § 3.3) : flèches gauche et droite en boucle,
 * Début et Fin ; l'onglet atteint est choisi et reçoit le focus.
 */
export function useNavigationOnglets<T extends string>(ids: readonly T[], actif: T, choisir: (id: T) => void) {
  const boutons = useRef(new Map<T, HTMLButtonElement>())

  function refBouton(id: T) {
    return (bouton: HTMLButtonElement | null) => {
      if (bouton) {
        boutons.current.set(id, bouton)
      } else {
        boutons.current.delete(id)
      }
    }
  }

  function auClavier(e: KeyboardEvent<HTMLElement>) {
    const index = ids.indexOf(actif)
    const destinations: Partial<Record<string, number>> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: ids.length - 1,
    }
    const destination = destinations[e.key]
    if (destination === undefined) {
      return
    }
    e.preventDefault()
    const cible = ids[(destination + ids.length) % ids.length]
    choisir(cible)
    boutons.current.get(cible)?.focus()
  }

  return { refBouton, auClavier }
}
