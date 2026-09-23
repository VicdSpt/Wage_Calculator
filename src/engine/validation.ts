import { eurosTexteEnCentimes } from './argent'
import { ATN_AUCUN, VALEUR_CATALOGUE_MAX_CENTIMES, type AtnSaisi, type Carburant, type SourceAtn } from './atnVoiture'
import { AVANTAGES_AUCUN, type Avantages } from './avantages'
import { PRIMES_AUCUNE, type PrimesSaisies } from './primesAnnuelles'
import type { FamilleSansAtn, SituationSansAtn } from './remuneration'
import { BRUT_MAX_CENTIMES, type EtatCivil, type RevenusConjoint } from './types'

export const SENS_CALCUL = ['brutVersNet', 'netVersBrut'] as const

/** Sens du calcul : du brut saisi vers le net, ou du net souhaité vers le brut. */
export type SensCalcul = (typeof SENS_CALCUL)[number]

export const MODES_ATN = ['montant', 'voiture'] as const

/** L'ATN est repris d'une fiche de paie, ou calculé depuis la voiture (spec voiture § 1). */
export type ModeAtn = (typeof MODES_ATN)[number]

/** Voiture de société et contribution, telles que tapées (spec voiture § 5.1). */
export interface SaisieVoiture {
  mode: ModeAtn
  carburant: Carburant
  valeurCatalogue: string
  co2: string
  /** AAAA-MM, valeur d'un champ <input type="month">. '' tant que rien n'est choisi. */
  premiereImmatriculation: string
  /** Disponible dans les deux modes. */
  contribution: string
}

/** Primes annuelles, telles que tapées (spec primes annuelles § 5.1). */
export interface SaisiePrimes {
  treiziemeActif: boolean
  /** Pourcentage du brut mensuel : « 100 » pour un mois. */
  treiziemePourcentage: string
  /** Mois prestés cette année. */
  treiziemeMoisPrestes: string
  peculeActif: boolean
  /** Mois prestés l'année précédente, celle qui ouvre le droit au pécule. */
  peculeMoisPrestes: string
}

/** Avantages extralégaux, tels que tapés (spec avantages § 4.1). */
export interface SaisieAvantages {
  titresRepasActif: boolean
  joursPrestes: string
  valeurFaciale: string
  partTravailleur: string
  teletravailActif: boolean
  teletravail: string
  ecochequesActif: boolean
  ecocheques: string
  fraisPropresActif: boolean
  fraisPropres: string
}

/** Valeurs brutes du formulaire, telles que tapées. */
export interface SaisieFormulaire {
  sens: SensCalcul
  /** Brut ou net versé mensuel selon le sens. */
  montant: string
  /** Montant quitté lors de la dernière bascule, tant que rien n'a été modifié (spec net → brut § 4.3). */
  montantAvantBascule: string | null
  /** ATN mensuel tel que tapé, utilisé en mode « montant ». '0' si aucun. */
  atn: string
  etatCivil: EtatCivil
  /** Conservé même si isolé, pour retrouver le choix si on rebascule. */
  revenusConjoint: RevenusConjoint
  enfantsACharge: string
  parentIsole: boolean
  avantages: SaisieAvantages
  voiture: SaisieVoiture
  primes: SaisiePrimes
}

export type CodeErreur =
  | 'montantVide'
  | 'montantFormat'
  | 'montantHorsLimites'
  | 'enfantsInvalide'
  | 'joursInvalide'
  | 'valeurFacialeInvalide'
  | 'partTravailleurInvalide'
  | 'partTravailleurSuperieure'
  | 'teletravailInvalide'
  | 'ecochequesInvalide'
  | 'atnInvalide'
  | 'fraisPropresInvalide'
  | 'valeurCatalogueInvalide'
  | 'co2Invalide'
  | 'immatriculationInvalide'
  | 'contributionInvalide'
  | 'pourcentagePrimeInvalide'
  | 'moisPrestesInvalide'

export interface ErreursSaisie {
  montant?: CodeErreur
  enfantsACharge?: CodeErreur
  joursPrestes?: CodeErreur
  valeurFaciale?: CodeErreur
  partTravailleur?: CodeErreur
  teletravail?: CodeErreur
  ecocheques?: CodeErreur
  atn?: CodeErreur
  fraisPropres?: CodeErreur
  valeurCatalogue?: CodeErreur
  co2?: CodeErreur
  premiereImmatriculation?: CodeErreur
  contribution?: CodeErreur
  treiziemePourcentage?: CodeErreur
  treiziemeMoisPrestes?: CodeErreur
  peculeMoisPrestes?: CodeErreur
}

export type ResultatValidation =
  | { ok: true; sens: 'brutVersNet'; situation: SituationSansAtn; avantages: Avantages; primes: PrimesSaisies }
  | { ok: true; sens: 'netVersBrut'; famille: FamilleSansAtn; netCibleCentimes: number; avantages: Avantages; primes: PrimesSaisies }
  | { ok: false; erreurs: ErreursSaisie }

export const ENFANTS_MAX = 10
export const JOURS_PRESTES_MAX = 23
/** Bornes de saisie, larges : le dépassement des plafonds officiels est une alerte, pas une erreur. */
const TITRE_MAX_CENTIMES = 2_000
const TELETRAVAIL_MAX_CENTIMES = 100_000
const ECOCHEQUES_MAX_CENTIMES = 200_000
const ATN_MAX_CENTIMES = 1_000_000
const FRAIS_PROPRES_MAX_CENTIMES = 500_000
const CO2_MAX_GRAMMES = 500
const CONTRIBUTION_MAX_CENTIMES = 1_000_000
/** Première immatriculation : un mois AAAA-MM, pas avant 1950. */
const MOIS_IMMATRICULATION = /^\d{4}-(0[1-9]|1[0-2])$/
const IMMATRICULATION_MIN = '1950-01'
/** 200 % : au-delà, c'est une prime exceptionnelle, pas un 13e mois. */
const POURCENTAGE_PRIME_MAX = 200
const MOIS_PRESTES_MAX = 12

export const SAISIE_AVANTAGES_PAR_DEFAUT: SaisieAvantages = {
  titresRepasActif: false,
  joursPrestes: '20',
  valeurFaciale: '10,00',
  partTravailleur: '1,09',
  teletravailActif: false,
  teletravail: '160,99',
  ecochequesActif: false,
  ecocheques: '250,00',
  fraisPropresActif: false,
  fraisPropres: '100,00',
}

export const SAISIE_VOITURE_PAR_DEFAUT: SaisieVoiture = {
  mode: 'montant',
  carburant: 'essence',
  valeurCatalogue: '45000,00',
  co2: '103',
  premiereImmatriculation: '',
  contribution: '0',
}

export const SAISIE_PRIMES_PAR_DEFAUT: SaisiePrimes = {
  treiziemeActif: true,
  treiziemePourcentage: '100',
  treiziemeMoisPrestes: '12',
  peculeActif: true,
  peculeMoisPrestes: '12',
}

export const SAISIE_PAR_DEFAUT: SaisieFormulaire = {
  sens: 'brutVersNet',
  montant: '3000',
  montantAvantBascule: null,
  atn: '0',
  etatCivil: 'isole',
  revenusConjoint: 'aucun',
  enfantsACharge: '0',
  parentIsole: false,
  avantages: SAISIE_AVANTAGES_PAR_DEFAUT,
  voiture: SAISIE_VOITURE_PAR_DEFAUT,
  primes: SAISIE_PRIMES_PAR_DEFAUT,
}

/** Montant saisi en centimes, ou null s'il est vide, mal formé ou hors bornes. */
function montantBorne(texte: string, min: number, max: number): number | null {
  const centimes = eurosTexteEnCentimes(texte.trim())
  return centimes === null || centimes < min || centimes > max ? null : centimes
}

/** Avantages normalisés ; remplit `erreurs` pour chaque champ invalide d'un avantage actif. */
function validerAvantages(saisie: SaisieAvantages, erreurs: ErreursSaisie): Avantages {
  const avantages: Avantages = {
    titresRepas: { ...AVANTAGES_AUCUN.titresRepas, actif: saisie.titresRepasActif },
    teletravail: { actif: saisie.teletravailActif, indemniteCentimes: 0 },
    ecocheques: { actif: saisie.ecochequesActif, montantAnnuelCentimes: 0 },
    fraisPropresEmployeur: { actif: saisie.fraisPropresActif, montantMensuelCentimes: 0 },
    atn: ATN_AUCUN,
  }

  if (saisie.titresRepasActif) {
    const joursTexte = saisie.joursPrestes.trim()
    const jours = /^\d+$/.test(joursTexte) ? Number(joursTexte) : Number.NaN
    if (jours >= 0 && jours <= JOURS_PRESTES_MAX) {
      avantages.titresRepas.joursPrestes = jours
    } else {
      erreurs.joursPrestes = 'joursInvalide'
    }

    const valeur = montantBorne(saisie.valeurFaciale, 1, TITRE_MAX_CENTIMES)
    if (valeur === null) {
      erreurs.valeurFaciale = 'valeurFacialeInvalide'
    } else {
      avantages.titresRepas.valeurFacialeCentimes = valeur
    }

    const part = montantBorne(saisie.partTravailleur, 0, TITRE_MAX_CENTIMES)
    if (part === null) {
      erreurs.partTravailleur = 'partTravailleurInvalide'
    } else if (valeur !== null && part > valeur) {
      erreurs.partTravailleur = 'partTravailleurSuperieure'
    } else {
      avantages.titresRepas.partTravailleurCentimes = part
    }
  }

  if (saisie.teletravailActif) {
    const indemnite = montantBorne(saisie.teletravail, 0, TELETRAVAIL_MAX_CENTIMES)
    if (indemnite === null) {
      erreurs.teletravail = 'teletravailInvalide'
    } else {
      avantages.teletravail.indemniteCentimes = indemnite
    }
  }

  if (saisie.ecochequesActif) {
    const montant = montantBorne(saisie.ecocheques, 0, ECOCHEQUES_MAX_CENTIMES)
    if (montant === null) {
      erreurs.ecocheques = 'ecochequesInvalide'
    } else {
      avantages.ecocheques.montantAnnuelCentimes = montant
    }
  }

  if (saisie.fraisPropresActif) {
    const frais = montantBorne(saisie.fraisPropres, 0, FRAIS_PROPRES_MAX_CENTIMES)
    if (frais === null) {
      erreurs.fraisPropres = 'fraisPropresInvalide'
    } else {
      avantages.fraisPropresEmployeur.montantMensuelCentimes = frais
    }
  }

  return avantages
}

/** ATN et contribution normalisés ; remplit `erreurs` pour chaque champ invalide du mode choisi. */
function validerAtn(saisie: SaisieFormulaire, dateIso: string, erreurs: ErreursSaisie): AtnSaisi {
  const v = saisie.voiture
  const contribution = montantBorne(v.contribution, 0, CONTRIBUTION_MAX_CENTIMES)
  if (contribution === null) {
    erreurs.contribution = 'contributionInvalide'
  }

  let source: SourceAtn = ATN_AUCUN.source
  if (v.mode === 'montant') {
    const atn = montantBorne(saisie.atn, 0, ATN_MAX_CENTIMES)
    if (atn === null) {
      erreurs.atn = 'atnInvalide'
    } else {
      source = { mode: 'montant', montantMensuelCentimes: atn }
    }
  } else {
    const valeur = montantBorne(v.valeurCatalogue, 1, VALEUR_CATALOGUE_MAX_CENTIMES)
    if (valeur === null) {
      erreurs.valeurCatalogue = 'valeurCatalogueInvalide'
    }
    const co2Texte = v.co2.trim()
    const co2 =
      v.carburant === 'electrique'
        ? 0
        : /^\d+$/.test(co2Texte) && Number(co2Texte) <= CO2_MAX_GRAMMES
          ? Number(co2Texte)
          : null
    if (co2 === null) {
      erreurs.co2 = 'co2Invalide'
    }
    const immatriculation = v.premiereImmatriculation
    const immatriculationValide =
      MOIS_IMMATRICULATION.test(immatriculation) &&
      immatriculation >= IMMATRICULATION_MIN &&
      immatriculation <= dateIso.slice(0, 7)
    if (!immatriculationValide) {
      erreurs.premiereImmatriculation = 'immatriculationInvalide'
    }
    if (valeur !== null && co2 !== null && immatriculationValide) {
      source = {
        mode: 'voiture',
        voiture: { carburant: v.carburant, valeurCatalogueCentimes: valeur, co2GrammesKm: co2, premiereImmatriculation: immatriculation },
      }
    }
  }

  return { source, contributionMensuelleCentimes: contribution ?? 0 }
}

/** Entier de 0 à 12, ou null. */
function moisPrestes(texte: string): number | null {
  const compact = texte.trim()
  if (!/^\d+$/.test(compact)) {
    return null
  }
  const mois = Number(compact)
  return mois <= MOIS_PRESTES_MAX ? mois : null
}

/** Primes normalisées ; ne valide que les champs d'une prime cochée. */
function validerPrimes(saisie: SaisiePrimes, erreurs: ErreursSaisie): PrimesSaisies {
  const primes: PrimesSaisies = { ...PRIMES_AUCUNE, treiziemeActif: saisie.treiziemeActif, peculeActif: saisie.peculeActif }

  if (saisie.treiziemeActif) {
    // Le pourcentage se saisit comme un montant : « 100 » donne 10 000 centièmes de pourcent,
    // soit exactement les dix-millièmes attendus par le moteur ; « 108,5 » donne 10 850.
    const pourcentage = montantBorne(saisie.treiziemePourcentage, 0, POURCENTAGE_PRIME_MAX * 100)
    if (pourcentage === null) {
      erreurs.treiziemePourcentage = 'pourcentagePrimeInvalide'
    } else {
      primes.treiziemePourcentageDixMilliemes = pourcentage
    }

    const mois = moisPrestes(saisie.treiziemeMoisPrestes)
    if (mois === null) {
      erreurs.treiziemeMoisPrestes = 'moisPrestesInvalide'
    } else {
      primes.treiziemeMoisPrestes = mois
    }
  }

  if (saisie.peculeActif) {
    const mois = moisPrestes(saisie.peculeMoisPrestes)
    if (mois === null) {
      erreurs.peculeMoisPrestes = 'moisPrestesInvalide'
    } else {
      primes.peculeMoisPrestes = mois
    }
  }

  return primes
}

/** Transforme la saisie en données normalisées pour le moteur, ou renvoie les erreurs par champ. dateIso borne la première immatriculation. */
export function validerSaisie(saisie: SaisieFormulaire, dateIso: string): ResultatValidation {
  const erreurs: ErreursSaisie = {}

  let montant: number | null = null
  if (saisie.montant.trim() === '') {
    erreurs.montant = 'montantVide'
  } else {
    montant = eurosTexteEnCentimes(saisie.montant)
    if (montant === null) {
      erreurs.montant = 'montantFormat'
    } else if (montant <= 0 || montant > BRUT_MAX_CENTIMES) {
      erreurs.montant = 'montantHorsLimites'
    }
  }

  const enfantsTexte = saisie.enfantsACharge.trim()
  const enfants = /^\d+$/.test(enfantsTexte) ? Number(enfantsTexte) : Number.NaN
  if (!(enfants >= 0 && enfants <= ENFANTS_MAX)) {
    erreurs.enfantsACharge = 'enfantsInvalide'
  }

  const avantages: Avantages = {
    ...validerAvantages(saisie.avantages, erreurs),
    atn: validerAtn(saisie, dateIso, erreurs),
  }

  const primes = validerPrimes(saisie.primes, erreurs)

  if (montant === null || Object.keys(erreurs).length > 0) {
    return { ok: false, erreurs }
  }

  const isole = saisie.etatCivil === 'isole'
  const famille: FamilleSansAtn = {
    etatCivil: saisie.etatCivil,
    revenusConjoint: isole ? null : saisie.revenusConjoint,
    enfantsACharge: enfants,
    parentIsole: isole && enfants > 0 && saisie.parentIsole,
  }

  if (saisie.sens === 'netVersBrut') {
    return { ok: true, sens: 'netVersBrut', famille, netCibleCentimes: montant, avantages, primes }
  }
  return { ok: true, sens: 'brutVersNet', situation: { brutMensuelCentimes: montant, ...famille }, avantages, primes }
}
