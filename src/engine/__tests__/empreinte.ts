/**
 * Empreinte courte (FNV-1a 32 bits, hexadécimal) de la sérialisation JSON d'une valeur.
 * Sert à détecter qu'un jeu de paramètres ou la liste des situations a changé depuis la
 * dernière mesure de tools/verification/reculMax.ts. Pas cryptographique.
 */
export function empreinte(valeur: unknown): string {
  const texte = JSON.stringify(valeur)
  let hash = 0x811c9dc5
  for (let i = 0; i < texte.length; i++) {
    hash ^= texte.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
