import { diviserArrondi } from './argent'
import type { Parametres } from './parametres/types'

/** Carburants distingués par la loi : l'essence, le LPG et le gaz naturel partagent la même référence. */
export const CARBURANTS = ['essence', 'diesel', 'electrique'] as const
export type Carburant = (typeof CARBURANTS)[number]

/** Voiture de société, déjà validée (spec voiture § 3.1). */
export interface Voiture {
  carburant: Carburant
  /** Prix catalogue à l'état neuf, options et TVA réellement payée comprises, remises exclues. */
  valeurCatalogueCentimes: number
  /** Ignoré pour l'électrique. Hybride : valeur de la fiche de conformité. */
  co2GrammesKm: number
  /** AAAA-MM de la première immatriculation. */
  premiereImmatriculation: string
}

/** D'où vient l'ATN : un montant repris d'une fiche de paie, ou le calcul depuis la voiture. */
export type SourceAtn = { mode: 'montant'; montantMensuelCentimes: number } | { mode: 'voiture'; voiture: Voiture }

/** ATN et contribution personnelle, tels que validés (spec voiture § 3.2). */
export interface AtnSaisi {
  source: SourceAtn
  /** Retenue de l'employeur pour l'usage privé : réduit l'ATN, se retire du net versé. */
  contributionMensuelleCentimes: number
}

export const ATN_AUCUN: AtnSaisi = {
  source: { mode: 'montant', montantMensuelCentimes: 0 },
  contributionMensuelleCentimes: 0,
}

export interface ResultatAtnVoiture {
  /** Rappel de la valeur saisie, pour l'explication. */
  valeurCatalogueCentimes: number
  pourcentageCo2DixMilliemes: number
  coefficientAgeDixMilliemes: number
  moisEcoules: number
  /** valeur × âge × 6/7 × pourcentage, arrondi une seule fois. */
  annuelFormuleCentimes: number
  /** Le minimum légal quand il dépasse la formule, sinon null. */
  minimumAppliqueCentimes: number | null
  annuelCentimes: number
  mensuelCentimes: number
}

export interface ResolutionAtn {
  mode: SourceAtn['mode']
  /** Montant saisi, ou mensuel de la formule. */
  avantContributionCentimes: number
  contributionCentimes: number
  /** max(0, avant − contribution) : ce qui entre dans la base du précompte. */
  imposableCentimes: number
  /** Détail de la formule ; null en mode montant. */
  voiture: ResultatAtnVoiture | null
}

/**
 * Valeur catalogue maximale. Au pire (18 %, coefficient d'âge 100 %), 770 000 € donnent 9 900 €/mois,
 * sous le plafond de saisie manuelle de 10 000 €/mois. Le produit du calcul reste alors sous 2^53
 * (77 000 000 × 10 000 × 6 × 1 800 = 8,316 × 10^15) : l'arithmétique entière est exacte.
 */
export const VALEUR_CATALOGUE_MAX_CENTIMES = 77_000_000

// Art. 36 § 2 CIR 92 : 5,5 % aux émissions de référence, ± 0,1 % par gramme, entre 4 % et 18 %.
const POURCENTAGE_REFERENCE = 550
const POURCENTAGE_PAR_GRAMME = 10
const POURCENTAGE_MIN = 400
const POURCENTAGE_MAX = 1_800

// Art. 36 § 2 CIR 92 : la valeur catalogue perd 6 % par période de 12 mois, jusqu'à 70 %.
const TRANCHES_AGE: readonly (readonly [moisMax: number, coefficient: number])[] = [
  [12, 10_000],
  [24, 9_400],
  [36, 8_800],
  [48, 8_200],
  [60, 7_600],
]
const COEFFICIENT_AGE_MIN = 7_000

const MOIS_ISO = /^(\d{4})-(0[1-9]|1[0-2])$/

function indexMois(mois: string): number {
  const correspondance = MOIS_ISO.exec(mois)
  if (!correspondance) {
    throw new RangeError(`Mois attendu au format AAAA-MM : « ${mois} »`)
  }
  return Number(correspondance[1]) * 12 + Number(correspondance[2]) - 1
}

/**
 * Mois écoulés depuis la première immatriculation, pour le coefficient d'âge. Tout mois commencé
 * compte : le mois de l'immatriculation est le mois 1 (spec voiture § 3.1).
 */
export function moisEcoulesDepuis(premiereImmatriculation: string, dateIso: string): number {
  const ecart = indexMois(dateIso.slice(0, 7)) - indexMois(premiereImmatriculation)
  if (ecart < 0) {
    throw new RangeError(`Première immatriculation ${premiereImmatriculation} postérieure au mois calculé ${dateIso.slice(0, 7)}`)
  }
  return ecart + 1
}

/** Coefficient d'âge en dix-millièmes. */
export function coefficientAge(moisEcoules: number): number {
  return TRANCHES_AGE.find(([moisMax]) => moisEcoules <= moisMax)?.[1] ?? COEFFICIENT_AGE_MIN
}

function pourcentageCo2(voiture: Voiture, parametres: Parametres): number {
  if (voiture.carburant === 'electrique') {
    return POURCENTAGE_MIN
  }
  if (!Number.isSafeInteger(voiture.co2GrammesKm) || voiture.co2GrammesKm < 0) {
    throw new RangeError(`Émissions de CO₂ invalides : ${voiture.co2GrammesKm}`)
  }
  const reference =
    voiture.carburant === 'diesel'
      ? parametres.voiture.emissionReferenceDieselGrammesKm
      : parametres.voiture.emissionReferenceEssenceGrammesKm
  const pourcentage = POURCENTAGE_REFERENCE + POURCENTAGE_PAR_GRAMME * (voiture.co2GrammesKm - reference)
  return Math.min(POURCENTAGE_MAX, Math.max(POURCENTAGE_MIN, pourcentage))
}

/** ATN d'une voiture de société au mois de dateIso (art. 36 § 2 CIR 92, spec voiture § 3.1). */
export function calculerAtnVoiture(voiture: Voiture, dateIso: string, parametres: Parametres): ResultatAtnVoiture {
  const valeur = voiture.valeurCatalogueCentimes
  if (!Number.isSafeInteger(valeur) || valeur <= 0 || valeur > VALEUR_CATALOGUE_MAX_CENTIMES) {
    throw new RangeError(`Valeur catalogue hors du domaine : ${valeur}`)
  }
  const pourcentageCo2DixMilliemes = pourcentageCo2(voiture, parametres)
  const moisEcoules = moisEcoulesDepuis(voiture.premiereImmatriculation, dateIso)
  const coefficientAgeDixMilliemes = coefficientAge(moisEcoules)
  // Un seul arrondi : la loi n'en prescrit aucun intermédiaire.
  const annuelFormuleCentimes = diviserArrondi(
    valeur * coefficientAgeDixMilliemes * 6 * pourcentageCo2DixMilliemes,
    7 * 10_000 * 10_000,
  )
  const minimum = parametres.voiture.atnMinimumAnnuelCentimes
  const annuelCentimes = Math.max(annuelFormuleCentimes, minimum)
  return {
    valeurCatalogueCentimes: valeur,
    pourcentageCo2DixMilliemes,
    coefficientAgeDixMilliemes,
    moisEcoules,
    annuelFormuleCentimes,
    minimumAppliqueCentimes: annuelFormuleCentimes < minimum ? minimum : null,
    annuelCentimes,
    mensuelCentimes: diviserArrondi(annuelCentimes, 12),
  }
}

/** ATN imposable du mois : montant saisi ou formule, moins la contribution, jamais négatif. */
export function resoudreAtn(atn: AtnSaisi, dateIso: string, parametres: Parametres): ResolutionAtn {
  const contributionCentimes = atn.contributionMensuelleCentimes
  let voiture: ResultatAtnVoiture | null = null
  let avantContributionCentimes: number
  if (atn.source.mode === 'voiture') {
    voiture = calculerAtnVoiture(atn.source.voiture, dateIso, parametres)
    avantContributionCentimes = voiture.mensuelCentimes
  } else {
    avantContributionCentimes = atn.source.montantMensuelCentimes
  }
  return {
    mode: atn.source.mode,
    avantContributionCentimes,
    contributionCentimes,
    imposableCentimes: Math.max(0, avantContributionCentimes - contributionCentimes),
    voiture,
  }
}
