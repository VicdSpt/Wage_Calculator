import type { ErreursSaisie, SaisieAvantages, SaisieFormulaire, SaisiePrimes } from '../../engine/validation'
import { fr } from '../../i18n/fr'

/** Les sections du formulaire qui se replient (spec ergonomie § 2). */
export const SECTIONS_REPLIABLES = ['mobilite', 'primes', 'avantages'] as const
export type IdSection = (typeof SECTIONS_REPLIABLES)[number]

/**
 * Section de chaque champ en erreur ; null pour le bloc « Salaire et famille », toujours ouvert.
 * `satisfies` oblige à rattacher toute nouvelle clé de ErreursSaisie : une erreur sans section
 * serait une erreur qu'on ne verrait pas.
 */
const SECTION_DU_CHAMP = {
  montant: null,
  enfantsACharge: null,
  atn: 'mobilite',
  valeurCatalogue: 'mobilite',
  co2: 'mobilite',
  premiereImmatriculation: 'mobilite',
  contribution: 'mobilite',
  budgetAnnuel: 'mobilite',
  pilier3Annuel: 'mobilite',
  treiziemePourcentage: 'primes',
  treiziemeMoisPrestes: 'primes',
  peculeMoisPrestes: 'primes',
  joursPrestes: 'avantages',
  valeurFaciale: 'avantages',
  partTravailleur: 'avantages',
  teletravail: 'avantages',
  ecocheques: 'avantages',
  fraisPropres: 'avantages',
} as const satisfies Record<keyof ErreursSaisie, IdSection | null>

/** Sections repliables qui contiennent au moins un champ en erreur. */
export function sectionsEnErreur(erreurs: ErreursSaisie): ReadonlySet<IdSection> {
  const sections = new Set<IdSection>()
  for (const champ of Object.keys(erreurs) as (keyof ErreursSaisie)[]) {
    const section = SECTION_DU_CHAMP[champ]
    if (erreurs[champ] !== undefined && section !== null) {
      sections.add(section)
    }
  }
  return sections
}

/** Résumé de la voiture ou du budget mobilité, à partir de ce qui est tapé (spec ergonomie § 3.2). */
export function resumeMobilite(saisie: Pick<SaisieFormulaire, 'choixMobilite' | 'atn' | 'voiture' | 'budgetMobilite'>): string {
  const t = fr.formulaire.resumes
  switch (saisie.choixMobilite) {
    case 'aucun':
      return t.aucun
    case 'budgetMobilite':
      return t.budgetMobilite(saisie.budgetMobilite.pilier3Annuel.trim())
    case 'voiture':
      return saisie.voiture.mode === 'montant' ? t.voitureMontant(saisie.atn.trim()) : t.voitureCalcul(saisie.voiture.valeurCatalogue.trim())
  }
}

/** Résumé du 13e mois et du pécule. */
export function resumePrimes(primes: SaisiePrimes): string {
  const t = fr.formulaire.resumes
  const pourcentage = primes.treiziemePourcentage.trim()
  if (primes.treiziemeActif && primes.peculeActif) {
    return t.treiziemeEtPecule(pourcentage)
  }
  if (primes.treiziemeActif) {
    return t.treizieme(pourcentage)
  }
  return primes.peculeActif ? t.pecule : t.aucunePrime
}

/** Noms des avantages cochés, dans l'ordre du formulaire. */
export function resumeAvantages(avantages: SaisieAvantages): string {
  const ta = fr.formulaire.avantages
  const noms = [
    ...(avantages.titresRepasActif ? [ta.titresRepas] : []),
    ...(avantages.teletravailActif ? [ta.teletravail] : []),
    ...(avantages.ecochequesActif ? [ta.ecocheques] : []),
    ...(avantages.fraisPropresActif ? [ta.fraisPropres] : []),
  ]
  return noms.length === 0 ? fr.formulaire.resumes.aucun : noms.join(', ')
}
