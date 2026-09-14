import { P2026_07 } from './p2026-07'
import type { Parametres } from './types'

/**
 * Règles du 01/09/2026 au 31/12/2026.
 * Seul le volet A du bonus à l'emploi change (ONSS-BE-2026/3 « à partir du 1er septembre 2026 »).
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
}