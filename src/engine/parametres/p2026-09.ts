import { P2026_07 } from './p2026-07'
import type { Parametres } from './types'

/**
 * Règles du 01/09/2026 au 31/12/2026.
 * Changent par rapport à juillet-août : le volet A du bonus à l'emploi
 * (ONSS-BE-2026/3 « à partir du 1er septembre 2026 ») et l'indemnité de bureau,
 * indexée à 164,21 €/mois (ONSS-FR).
 */
export const P2026_09: Parametres = {
  ...P2026_07,
  id: 'P2026-09',
  valideDu: '2026-09-01',
  valideAu: '2026-12-31',
  bonusEmploi: {
    voletA: { maxCentimes: 12_754, plancherCentimes: 293_793, plafondCentimes: 340_362, coefDixMilliemes: 2739 },
    voletB: P2026_07.bonusEmploi.voletB,
  },
  avantages: { ...P2026_07.avantages, teletravailMaxCentimes: 16_421 },
}