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

/** Plafonds des avantages extralégaux exonérés (spec avantages § 3.1). */
export interface ParametresAvantages {
  /** ONSS-TR : part patronale maximale par titre-repas. */
  titresRepasPartPatronaleMaxCentimes: number
  /** ONSS-TR : part minimale du travailleur par titre-repas. */
  titresRepasPartTravailleurMinCentimes: number
  /** ONSS-TR : valeur faciale maximale d'un titre-repas. */
  titresRepasValeurFacialeMaxCentimes: number
  /** ONSS-FR : indemnité forfaitaire de bureau maximale par mois. */
  teletravailMaxCentimes: number
  /** ONSS-EC : plafond annuel des écochèques. */
  ecochequesMaxAnnuelCentimes: number
}

/** Voiture de société (art. 36 § 2 CIR 92) : les valeurs qui changent chaque année. */
export interface ParametresVoiture {
  /** Émissions de CO₂ de référence, essence, LPG et gaz naturel (g/km). */
  emissionReferenceEssenceGrammesKm: number
  /** Émissions de CO₂ de référence, diesel (g/km). */
  emissionReferenceDieselGrammesKm: number
  /** ATN minimum annuel, montant indexé. */
  atnMinimumAnnuelCentimes: number
}

/** Budget mobilité (loi du 17/03/2019) : les valeurs qui changent chaque année. */
export interface ParametresBudgetMobilite {
  /** Cotisation spéciale de sécurité sociale retenue sur le pilier 3 (le solde en cash). */
  tauxCotisationSpecialeDixMilliemes: number
  /** Borne basse du budget annuel que l'employeur peut accorder. */
  budgetAnnuelMinCentimes: number
  /** Borne haute du budget annuel que l'employeur peut accorder. */
  budgetAnnuelMaxCentimes: number
}

/** Tranche du barème des allocations exceptionnelles (annexe III n° 53 à l'AR/CIR 92). */
export interface TrancheAllocationExceptionnelle {
  /** Borne supérieure incluse de la base annuelle ; null pour la dernière tranche. */
  jusquaAnnuelCentimes: number | null
  peculeDixMilliemes: number
  autreDixMilliemes: number
}

/** Palier de la réduction pour enfants à charge (annexe III n° 55), index = nombre d'enfants. */
export interface ReductionEnfantsAllocation {
  /** Plafond de base annuelle au-delà duquel la réduction ne s'applique plus. */
  plafondAnnuelCentimes: number
  reductionDixMilliemes: number
}

export interface ParametresAllocationsExceptionnelles {
  tranches: readonly TrancheAllocationExceptionnelle[]
  /**
   * Annexe III n° 54 — exonération totale : plafond de base annuelle,
   * index = nombre d'enfants à charge (1 à 12). L'index 0 vaut 0 : aucune exonération.
   */
  exonerationEnfantsPlafondsCentimes: readonly number[]
  /**
   * Annexe III n° 55 — réduction du précompte quand l'exonération ne joue pas,
   * index = nombre d'enfants à charge (1 à 5). L'index 0 ne réduit rien.
   */
  reductionsEnfants: readonly ReductionEnfantsAllocation[]
  /** Part du double pécule brut soumise à la retenue de 13,07 % (10 000 = la totalité). */
  partPeculeSoumiseRetenueDixMilliemes: number
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
  avantages: ParametresAvantages
  allocationsExceptionnelles: ParametresAllocationsExceptionnelles
  voiture: ParametresVoiture
  budgetMobilite: ParametresBudgetMobilite
  rmmmgCentimes: number
}