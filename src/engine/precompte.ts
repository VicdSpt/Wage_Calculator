import { appliquerTaux, diviserArrondi } from './argent'
import type { BonusEmploiSocial } from './bonusEmploiSocial'
import type { Parametres, ParametresPrecompte, TrancheBareme } from './parametres/types'
import type { Situation } from './types'

export interface DetailPrecompte {
  annuelBrut: number
  fraisForfaitaires: number
  netImposable: number
  revenuImpute: number
  impotBase: number
  reductionsAccordees: number
  impotAnnuel: number
  precompteAvantBonus: number
  bonusFiscal: number
  precompte: number
}

/** Barème de base (SPF-FC-2026 annexe 1). */
export function impotBareme(revenuCentimes: number, bareme: readonly TrancheBareme[]): number {
  if (revenuCentimes <= 0) {
    return 0
  }
  let tranche = bareme[0]
  for (const t of bareme) {
    if (revenuCentimes > t.auDelaDeCentimes) {
      tranche = t
    }
  }
  return tranche.fixeCentimes + appliquerTaux(revenuCentimes - tranche.auDelaDeCentimes, tranche.tauxDixMilliemes)
}

/** SPF-FC-2026 annexe 3. */
export function reductionEnfants(enfants: number, p: ParametresPrecompte): number {
  const table = p.reductionEnfantsCentimes
  const dernier = table.length - 1
  if (enfants <= dernier) {
    return table[enfants]
  }
  return table[dernier] + (enfants - dernier) * p.reductionEnfantSupplementaireCentimes
}

/** Barème II (quotient conjugal) : conjoint sans revenus ou pension ≤ 174 € nets (SPF-FC-2026 n° 11). */
export function utiliseQuotientConjugal(situation: Situation): boolean {
  return situation.revenusConjoint === 'aucun' || situation.revenusConjoint === 'pensionMax174'
}

function reductionsFamiliales(situation: Situation, p: ParametresPrecompte): number {
  let total = reductionEnfants(situation.enfantsACharge, p)
  if (situation.parentIsole) {
    total += p.reductionParentIsoleCentimes
  }
  if (situation.revenusConjoint === 'autresMax290') {
    total += p.reductionConjointAutresMax290Centimes
  }
  if (situation.revenusConjoint === 'pensionMax579') {
    total += p.reductionConjointPensionMax579Centimes
  }
  return total
}

/** Étapes 4 à 10 : du revenu imposable mensuel au précompte dû. */
export function calculerPrecompte(
  imposableMensuelCentimes: number,
  bonus: BonusEmploiSocial,
  situation: Situation,
  parametres: Parametres,
): DetailPrecompte {
  const p = parametres.precompte

  const annuelBrut = imposableMensuelCentimes * 12
  const fraisForfaitaires = Math.min(
    appliquerTaux(annuelBrut, p.fraisForfaitairesTauxDixMilliemes),
    p.fraisForfaitairesMaxCentimes,
  )
  const netImposable = annuelBrut - fraisForfaitaires

  let revenuImpute = 0
  let impotAvantPlancher: number
  if (utiliseQuotientConjugal(situation)) {
    revenuImpute = Math.min(appliquerTaux(netImposable, p.quotientConjugalTauxDixMilliemes), p.quotientConjugalMaxCentimes)
    impotAvantPlancher =
      impotBareme(revenuImpute, p.bareme) +
      impotBareme(netImposable - revenuImpute, p.bareme) -
      2 * p.impotQuotiteExempteeCentimes
  } else {
    impotAvantPlancher = impotBareme(netImposable, p.bareme) - p.impotQuotiteExempteeCentimes
  }
  const impotBase = Math.max(0, impotAvantPlancher)

  const reductionsAccordees = Math.min(reductionsFamiliales(situation, p), impotBase)
  const impotAnnuel = impotBase - reductionsAccordees

  const precompteAvantBonus = diviserArrondi(impotAnnuel, 12)
  const bonusFiscalTheorique =
    appliquerTaux(bonus.voletA, p.bonusFiscalVoletADixMilliemes) +
    appliquerTaux(bonus.voletB, p.bonusFiscalVoletBDixMilliemes)
  const precompte = Math.max(0, precompteAvantBonus - bonusFiscalTheorique)

  return {
    annuelBrut,
    fraisForfaitaires,
    netImposable,
    revenuImpute,
    impotBase,
    reductionsAccordees,
    impotAnnuel,
    precompteAvantBonus,
    bonusFiscal: precompteAvantBonus - precompte,
    precompte,
  }
}