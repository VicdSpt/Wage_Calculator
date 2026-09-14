import { PeriodeNonCouverte } from '../types'
import { P2026_07 } from './p2026-07'
import { P2026_09 } from './p2026-09'
import type { Parametres } from './types'

export const PERIODES: readonly Parametres[] = [P2026_07, P2026_09]

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/

/** Jeu de paramètres en vigueur à la date donnée (AAAA-MM-JJ). */
export function getParametres(dateIso: string): Parametres {
  if (!DATE_ISO.test(dateIso)) {
    throw new RangeError(`Date attendue au format AAAA-MM-JJ : « ${dateIso} »`)
  }
  const periode = PERIODES.find((p) => p.valideDu <= dateIso && dateIso <= p.valideAu)
  if (!periode) {
    throw new PeriodeNonCouverte(dateIso)
  }
  return periode
}