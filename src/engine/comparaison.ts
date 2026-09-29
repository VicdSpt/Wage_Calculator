import type { ChoixMobilite } from './avantages'

/** Ce que le tableau de comparaison montre d'une offre dont le calcul a abouti (spec comparaison § 3.2). */
export interface ResumeOffre {
  brutMensuelCentimes: number
  /** Brut annuel au sens belge (spec vue annuelle § 2.1). */
  brutAnnuelCentimes: number
  netVerseCentimes: number
  netAnnuelToutComprisCentimes: number
  /** Valeur des titres-repas reçus par mois. */
  titresRepasMensuelCentimes: number
  ecochequesAnnuelCentimes: number
  choixMobilite: ChoixMobilite
  /** ATN mensuel avant contribution, pour la ligne « Mobilité » ; 0 hors voiture. */
  atnMensuelCentimes: number
  tauxRetour: number
}

/** B − A, ligne par ligne. */
export interface Ecarts {
  brutMensuel: number
  brutAnnuel: number
  netVerse: number
  netAnnuelToutCompris: number
  titresRepas: number
  ecocheques: number
  totalAnnuelEnPoche: number
}

export type OffreGagnante = 'A' | 'B' | 'egalite'

export interface Comparaison {
  a: ResumeOffre | null
  b: ResumeOffre | null
  totalA: number | null
  totalB: number | null
  /** null si l'une des offres n'a pas de résultat. */
  ecarts: Ecarts | null
  afficherTitresRepas: boolean
  afficherEcocheques: boolean
  /** null si l'une des offres n'a pas de résultat. */
  gagnante: OffreGagnante | null
}

/** Ce qu'on touche sur un an : net annuel tout compris, titres-repas, écochèques. La voiture n'en est pas. */
export function totalAnnuelEnPoche(offre: ResumeOffre): number {
  return offre.netAnnuelToutComprisCentimes + 12 * offre.titresRepasMensuelCentimes + offre.ecochequesAnnuelCentimes
}

export function comparerOffres(a: ResumeOffre | null, b: ResumeOffre | null): Comparaison {
  const totalA = a === null ? null : totalAnnuelEnPoche(a)
  const totalB = b === null ? null : totalAnnuelEnPoche(b)
  const ecarts: Ecarts | null =
    a === null || b === null || totalA === null || totalB === null
      ? null
      : {
          brutMensuel: b.brutMensuelCentimes - a.brutMensuelCentimes,
          brutAnnuel: b.brutAnnuelCentimes - a.brutAnnuelCentimes,
          netVerse: b.netVerseCentimes - a.netVerseCentimes,
          netAnnuelToutCompris: b.netAnnuelToutComprisCentimes - a.netAnnuelToutComprisCentimes,
          titresRepas: b.titresRepasMensuelCentimes - a.titresRepasMensuelCentimes,
          ecocheques: b.ecochequesAnnuelCentimes - a.ecochequesAnnuelCentimes,
          totalAnnuelEnPoche: totalB - totalA,
        }
  const gagnante: OffreGagnante | null =
    ecarts === null ? null : ecarts.totalAnnuelEnPoche > 0 ? 'B' : ecarts.totalAnnuelEnPoche < 0 ? 'A' : 'egalite'
  return {
    a,
    b,
    totalA,
    totalB,
    ecarts,
    afficherTitresRepas: (a?.titresRepasMensuelCentimes ?? 0) > 0 || (b?.titresRepasMensuelCentimes ?? 0) > 0,
    afficherEcocheques: (a?.ecochequesAnnuelCentimes ?? 0) > 0 || (b?.ecochequesAnnuelCentimes ?? 0) > 0,
    gagnante,
  }
}
