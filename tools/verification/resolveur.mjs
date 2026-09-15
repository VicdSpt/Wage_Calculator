// Chargé par `node --import` : ajoute « .ts » ou « /index.ts » aux imports relatifs sans extension.
// Les worker_threads héritent de l'option --import, donc de ce résolveur.
import { registerHooks } from 'node:module'

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (erreur) {
      if (!specifier.startsWith('.')) {
        throw erreur
      }
      try {
        return nextResolve(`${specifier}.ts`, context)
      } catch {
        return nextResolve(`${specifier}/index.ts`, context)
      }
    }
  },
})
