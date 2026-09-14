const EURO = new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' })
const POURCENTAGE = new Intl.NumberFormat('fr-BE', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** 226133 → « 2 261,33 € » (espaces insécables selon Intl). */
export function formatEuro(centimes: number): string {
  return EURO.format(centimes / 100)
}

/** 0.7538 → « 75,4 % ». */
export function formatPourcentage(ratio: number): string {
  return POURCENTAGE.format(ratio)
}

/** Date locale → « AAAA-MM-JJ ». */
export function dateIsoLocale(date: Date): string {
  const annee = date.getFullYear()
  const mois = String(date.getMonth() + 1).padStart(2, '0')
  const jour = String(date.getDate()).padStart(2, '0')
  return `${annee}-${mois}-${jour}`
}

/** « 2026-09-14 » → « 14/09/2026 ». */
export function formatDateFr(dateIso: string): string {
  const [annee, mois, jour] = dateIso.split('-')
  return `${jour}/${mois}/${annee}`
}