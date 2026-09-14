/** Montants en centimes entiers, taux en dix-millièmes entiers (spec § 5.1). */
export const DIX_MILLE = 10_000

/**
 * Division entière arrondie au plus proche. Une moitié exacte s'éloigne de zéro
 * (0,5 centime → 1 centime), comme l'impose SPF-FC-2026 n° 3.
 */
export function diviserArrondi(numerateur: number, diviseur: number): number {
  if (!Number.isSafeInteger(numerateur) || !Number.isSafeInteger(diviseur) || diviseur <= 0) {
    throw new RangeError(`diviserArrondi : entiers sûrs attendus (${numerateur} / ${diviseur})`)
  }
  const reste = numerateur % diviseur
  const quotient = (numerateur - reste) / diviseur
  if (2 * Math.abs(reste) >= diviseur) {
    return quotient + (numerateur < 0 ? -1 : 1)
  }
  return quotient
}

/** centimes × taux / 10 000, arrondi au centime. */
export function appliquerTaux(centimes: number, tauxDixMilliemes: number): number {
  return diviserArrondi(centimes * tauxDixMilliemes, DIX_MILLE)
}

const FORMAT_MONTANT = /^\d+(?:[.,]\d{1,2})?$/

/** « 3 000,50 » → 300050. Renvoie null si le texte n'est pas un montant valide. */
export function eurosTexteEnCentimes(texte: string): number | null {
  const compact = texte.replace(/\s/g, '')
  if (!FORMAT_MONTANT.test(compact)) {
    return null
  }
  const [entier, decimales = ''] = compact.split(/[.,]/)
  const centimes = Number(entier) * 100 + Number(decimales.padEnd(2, '0'))
  return Number.isSafeInteger(centimes) ? centimes : null
}