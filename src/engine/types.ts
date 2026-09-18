export const REVENUS_CONJOINT = [
  'aucun',
  'pensionMax174',
  'pensionMax579',
  'autresMax290',
  'superieurs',
] as const

/** Les 5 cas officiels de revenus du conjoint (spec § 4). */
export type RevenusConjoint = (typeof REVENUS_CONJOINT)[number]

export type EtatCivil = 'isole' | 'marieOuCohabitant'

/** Situation validée, prête pour le moteur. Tous les montants sont en centimes. */
export interface Situation {
  brutMensuelCentimes: number
  /** Avantage de toute nature mensuel (voiture de société), montant déjà calculé. 0 si aucun. */
  atnMensuelCentimes: number
  etatCivil: EtatCivil
  /** null si isolé. */
  revenusConjoint: RevenusConjoint | null
  enfantsACharge: number
  parentIsole: boolean
}

/** Toutes les valeurs intermédiaires du calcul, en centimes (spec § 5.2). */
export interface Intermediaires {
  onss: number
  bonusVoletA: number
  bonusVoletB: number
  bonusSocial: number
  onssNet: number
  imposableMensuel: number
  atn: number
  /** imposableMensuel + atn : la base du précompte professionnel. */
  imposablePrecompte: number
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
  cotisationSpeciale: number
  net: number
}

export type IdLigne =
  | 'brut'
  | 'onss'
  | 'bonusVoletA'
  | 'bonusVoletB'
  | 'imposableMensuel'
  | 'atn'
  | 'precompteAvantBonus'
  | 'bonusFiscal'
  | 'cotisationSpeciale'
  | 'atnRetenu'
  | 'net'

/** Une ligne du détail affiché. Le libellé vient de i18n/fr.ts via l'id. */
export interface Ligne {
  id: IdLigne
  sens: '+' | '-' | '='
  montantCentimes: number
  source: string
}

export interface Resultat {
  periode: { id: string; valideDu: string; valideAu: string }
  lignes: Ligne[]
  intermediaires: Intermediaires
  netMensuelCentimes: number
  netAnnuelCentimes: number
  /** net / brut, pour l'affichage uniquement. */
  tauxRetour: number
}

export class PeriodeNonCouverte extends Error {
  readonly dateIso: string

  constructor(dateIso: string) {
    super(`Aucune règle intégrée pour la date ${dateIso}`)
    this.name = 'PeriodeNonCouverte'
    this.dateIso = dateIso
  }
}

/** Brut mensuel maximal accepté : 100 000 €. */
export const BRUT_MAX_CENTIMES = 10_000_000

/** Le net demandé dépasse le net obtenu avec le brut maximal. */
export class NetHorsLimites extends Error {
  readonly netCibleCentimes: number
  readonly netMaxCentimes: number

  constructor(netCibleCentimes: number, netMaxCentimes: number) {
    super(`Net de ${netCibleCentimes} centimes inatteignable : au plus ${netMaxCentimes} centimes pour le brut maximal`)
    this.name = 'NetHorsLimites'
    this.netCibleCentimes = netCibleCentimes
    this.netMaxCentimes = netMaxCentimes
  }
}