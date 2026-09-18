import type { SituationFamiliale } from '../calculerBrut'
import { REVENUS_CONJOINT } from '../types'

const ENFANTS = Array.from({ length: 11 }, (_, i) => i)

/**
 * Toutes les situations familiales couvertes par la V1 (76) : isolé (0 à 10 enfants),
 * parent isolé (1 à 10 enfants), et les 5 cas de conjoint (0 à 10 enfants).
 * Utilisé par les tests de calculerBrut et par tools/verification/reculMax.ts.
 */
export const SITUATIONS_FAMILIALES: readonly SituationFamiliale[] = [
  ...ENFANTS.map((enfantsACharge): SituationFamiliale => ({
    etatCivil: 'isole',
    revenusConjoint: null,
    enfantsACharge,
    parentIsole: false,
    atnMensuelCentimes: 0,
  })),
  ...ENFANTS.slice(1).map((enfantsACharge): SituationFamiliale => ({
    etatCivil: 'isole',
    revenusConjoint: null,
    enfantsACharge,
    parentIsole: true,
    atnMensuelCentimes: 0,
  })),
  ...REVENUS_CONJOINT.flatMap((revenusConjoint) =>
    ENFANTS.map((enfantsACharge): SituationFamiliale => ({
      etatCivil: 'marieOuCohabitant',
      revenusConjoint,
      enfantsACharge,
      parentIsole: false,
      atnMensuelCentimes: 0,
    })),
  ),
]
