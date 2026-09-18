import { calculerNet } from './calculerNet'
import { BRUT_MAX_CENTIMES, NetHorsLimites, type Resultat, type Situation } from './types'

/** Situation sans le brut : ce que l'on connaît quand on part du net. */
export type SituationFamiliale = Omit<Situation, 'brutMensuelCentimes'>

/**
 * Marge G de l'algorithme. Doit rester ≥ au recul maximal du net mesuré par
 * tools/verification/reculMax.ts (vérifié par src/engine/__tests__/reculMax.test.ts).
 */
export const MARGE_RECUL_CENTIMES = 1_000

export interface ResultatInverse {
  netCibleCentimes: number
  /** Plus petit brut dont le net est ≥ netCibleCentimes. */
  brutCentimes: number
  /** calculerNet pour le brut trouvé : détail identique au mode brut → net. */
  resultat: Resultat
}

/**
 * Net → brut : plus petit brut mensuel dont le net atteint la cible (spec net → brut § 3).
 *
 * Le net ne monte pas toujours avec le brut (arrondis, marche de la cotisation spéciale).
 * Une dichotomie trouve un brut qui atteint la cible, puis on redescend jusqu'à un net
 * inférieur à « cible − G ». Si le net ne recule jamais de plus de G, aucun brut plus bas
 * ne peut encore atteindre la cible : le plus petit brut vu est le bon.
 *
 * Le recul G est mesuré sans avantage de toute nature ; une mesure ponctuelle avec un ATN
 * allant jusqu'à 10 000 €/mois le porte de 5,14 € à 5,15 €, sans déplacer son pire point
 * (brut 1 095,10 €), donc toujours largement sous la marge.
 *
 * Lève NetHorsLimites si le brut maximal n'atteint pas la cible, et PeriodeNonCouverte
 * si aucune règle n'est intégrée pour dateIso.
 */
export function calculerBrut(famille: SituationFamiliale, netCibleCentimes: number, dateIso: string): ResultatInverse {
  const calculer = (brut: number) => calculerNet({ ...famille, brutMensuelCentimes: brut }, dateIso)
  const net = (brut: number) => calculer(brut).netMensuelCentimes

  const netMax = net(BRUT_MAX_CENTIMES)
  if (netMax < netCibleCentimes) {
    throw new NetHorsLimites(netCibleCentimes, netMax)
  }

  // Invariant : net(hi) ≥ cible. lo = 0 compte comme un net nul et n'est jamais évalué.
  let lo = 0
  let hi = BRUT_MAX_CENTIMES
  while (hi - lo > 1) {
    const milieu = Math.floor((lo + hi) / 2)
    if (net(milieu) >= netCibleCentimes) {
      hi = milieu
    } else {
      lo = milieu
    }
  }

  let meilleur = hi
  for (let brut = hi - 1; brut >= 1; brut--) {
    const n = net(brut)
    if (n >= netCibleCentimes) {
      meilleur = brut
    } else if (n < netCibleCentimes - MARGE_RECUL_CENTIMES) {
      break
    }
  }

  return { netCibleCentimes, brutCentimes: meilleur, resultat: calculer(meilleur) }
}
