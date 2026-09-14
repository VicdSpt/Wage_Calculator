/** Un volet du bonus à l'emploi (ONSS-BE-2026/3, colonne employés). */
export interface VoletBonus {
  maxCentimes: number
  plancherCentimes: number
  plafondCentimes: number
  coefDixMilliemes: number
}

/** Tranche du barème de base : impôt = fixe + taux × (revenu − auDelaDe). */
export interface TrancheBareme {
  auDelaDeCentimes: number
  fixeCentimes: number
  tauxDixMilliemes: number
}

/**
 * Tranche mensuelle de cotisation spéciale, pour un brut ≤ jusqua (null = sans limite) :
 * montant = fixe + taux × (brut − seuil), borné par min et max.
 */
export interface TrancheCotisation {
  jusquaCentimes: number | null
  fixeCentimes: number
  tauxDixMilliemes: number
  seuilCentimes: number
  minCentimes: number
  maxCentimes: number | null
}

export type CategorieCotisation =
  | 'individuelle'
  | 'communeConjointAvecRevenus'
  | 'communeConjointSansRevenus'

export interface ParametresPrecompte {
  fraisForfaitairesTauxDixMilliemes: number
  fraisForfaitairesMaxCentimes: number
  bareme: readonly TrancheBareme[]
  impotQuotiteExempteeCentimes: number
  quotientConjugalTauxDixMilliemes: number
  quotientConjugalMaxCentimes: number
  /** Index = nombre d'enfants (0 à 8). */
  reductionEnfantsCentimes: readonly number[]
  /** Par enfant au-delà du dernier index du tableau. */
  reductionEnfantSupplementaireCentimes: number
  reductionParentIsoleCentimes: number
  reductionConjointAutresMax290Centimes: number
  reductionConjointPensionMax579Centimes: number
  bonusFiscalVoletADixMilliemes: number
  bonusFiscalVoletBDixMilliemes: number
}

export interface Parametres {
  id: string
  /** AAAA-MM-JJ, inclus. */
  valideDu: string
  /** AAAA-MM-JJ, inclus. */
  valideAu: string
  onssTauxPersonnelDixMilliemes: number
  bonusEmploi: { voletA: VoletBonus; voletB: VoletBonus }
  precompte: ParametresPrecompte
  cotisationSpeciale: Record<CategorieCotisation, readonly TrancheCotisation[]>
  rmmmgCentimes: number
}