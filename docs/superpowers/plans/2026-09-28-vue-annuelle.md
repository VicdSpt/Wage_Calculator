# La vue annuelle (V2.8) — plan d'implémentation

> **Pour les travailleurs agentiques :** SOUS-COMPÉTENCE REQUISE : utiliser superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`).

**Objectif :** pouvoir taper un brut annuel au sens belge (12 mois, 13e mois, double pécule, selon les primes), voir son équivalent mensuel, et afficher un net annuel tout compris.

**Architecture :** un module moteur pur `annuel.ts` fait la conversion et agrège la vue annuelle, en réutilisant le calcul du brut des primes ; la validation convertit un brut annuel en brut mensuel avant tout calcul ; la sauvegarde passe en v7 ; le récapitulatif puis le formulaire affichent le résultat.

**Pile technique :** React 19, TypeScript 6 strict, Tailwind 4, Vitest + Testing Library + user-event + jsdom, oxlint. Aucune dépendance nouvelle.

**Spec :** `docs/superpowers/specs/2026-09-28-vue-annuelle-design.md`

**Branche :** `feat/vue-annuelle`, déjà créée (spec commitée en `2c6786f`). Un commit par tâche. **Ni push ni merge** avant la fin, et seulement sur demande explicite de l'utilisateur.

## Contraintes globales

- **Arithmétique en centimes entiers**, taux en dix-millièmes ; arrondis par `diviserArrondi` / `appliquerTaux` (`src/engine/argent.ts`). Aucun flottant dans un calcul monétaire.
- **Le calcul du salaire ne change pas** : `calculerNet`, `calculerBrut`, `remuneration.ts` et `calculerPrimesAnnuelles` gardent leur comportement ; la seule modification de `primesAnnuelles.ts` est l'export de `brutPrime`. `npm run verifier:recul` n'a pas à être relancé.
- **Aucune valeur attendue d'un test existant ne change**, sauf les quatre montants de la ligne annuelle du récapitulatif que la tâche 3 remplace délibérément (spec § 7, risque 1), chacun listé.
- **Aucun texte en dur** dans un composant : tout libellé passe par `src/i18n/fr.ts`, apostrophes typographiques `’`, guillemets simples dans les titres de tests.
- Accessibilité : boutons radio natifs groupés dans un `fieldset` avec sa `legend`, erreurs et aides reliées par `aria-describedby`.
- **TypeScript strict**, aucun `any`. UTF-8, LF.
- `npm test`, `npm run typecheck`, `npm run lint` verts avant chaque commit ; `npm run build` aussi à la dernière tâche.
- Message de commit en français, sujet impératif court, ligne vide, puis la ligne `Co-Authored-By` que le rappel système de l'implémenteur lui indique.

## Points de vigilance pour la relecture

1. **L'aller-retour de sens en saisie annuelle.** Brut annuel tapé, bascule en net → brut, retour en brut → net : le champ doit redevenir un brut **annuel** cohérent avec la période « par an » toujours sélectionnée. Si l'app reprenait le brut *mensuel* du résultat dans un champ lu comme annuel, le salaire serait divisé par 13,92. → test en tâche 4.
2. **Changer les primes en saisie annuelle.** Le même annuel tapé donne un autre brut mensuel quand on décoche le 13e mois (× 12,92 au lieu de × 13,92) ; le net, la ligne d'équivalence et le facteur doivent suivre. → test en tâche 4.
3. **Un annuel invalide** (vide, « abc », 0) : erreur sur le champ du montant, aucune conversion, aucune ligne d'équivalence. → tests en tâches 2 et 4.
4. **Un annuel démesuré** : « montant hors limites », sans plantage ni débordement arithmétique. → tests en tâches 1 et 2.
5. **Une saisie v6 restaurée** se recharge en mensuel, avec exactement le même résultat. → test en tâche 2.

---

## Task 1 : le module `annuel.ts`

**Fichiers :**
- Créer : `src/engine/annuel.ts`
- Créer : `src/engine/annuel.test.ts`
- Modifier : `src/engine/primesAnnuelles.ts` (export de `brutPrime`, rien d'autre)

**Interfaces :**
- Consomme : `brutPrime(brutMensuelCentimes, pourcentageDixMilliemes, moisPrestes)`, `TAUX_DOUBLE_PECULE_DIX_MILLIEMES`, `PrimesSaisies`, `ResultatPrimes` (`primesAnnuelles.ts`) ; `BRUT_MAX_CENTIMES` (`types.ts`) ; `diviserArrondi` (`argent.ts`).
- Produit :
  - `brutAnnuelDepuisMensuel(brutMensuelCentimes: number, primes: PrimesSaisies): number`
  - `brutMensuelDepuisAnnuel(brutAnnuelCentimes: number, primes: PrimesSaisies): number`
  - `facteurAnnuelDixMilliemes(primes: PrimesSaisies): number`
  - `netAnnuelToutCompris(netVerseMensuelCentimes: number, primes: ResultatPrimes): number`
  - `interface VueAnnuelle { brutAnnuelCentimes: number; netAnnuelToutComprisCentimes: number; facteurDixMilliemes: number; treizieme: boolean; pecule: boolean }`
  - `calculerVueAnnuelle(brutMensuelCentimes: number, netVerseMensuelCentimes: number, primesSaisies: PrimesSaisies, resultatPrimes: ResultatPrimes): VueAnnuelle`

- [ ] **Étape 1 : écrire les tests qui échouent**

Crée `src/engine/annuel.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import {
  brutAnnuelDepuisMensuel,
  brutMensuelDepuisAnnuel,
  calculerVueAnnuelle,
  facteurAnnuelDixMilliemes,
  netAnnuelToutCompris,
} from './annuel'
import { getParametres } from './parametres'
import { calculerPrimesAnnuelles, PRIMES_AUCUNE, type PrimesSaisies } from './primesAnnuelles'
import { BRUT_MAX_CENTIMES } from './types'

/** Les deux primes cochées, année complète, 13e mois à 100 % : les réglages par défaut. */
const DEFAUT: PrimesSaisies = {
  treiziemeActif: true,
  treiziemePourcentageDixMilliemes: 10_000,
  treiziemeMoisPrestes: 12,
  peculeActif: true,
  peculeMoisPrestes: 12,
}
const SANS_TREIZIEME: PrimesSaisies = { ...DEFAUT, treiziemeActif: false }
const SANS_PECULE: PrimesSaisies = { ...DEFAUT, peculeActif: false }
const AUCUNE: PrimesSaisies = { ...PRIMES_AUCUNE }

describe('facteurAnnuelDixMilliemes', () => {
  it('vaut 13,92 avec le 13e mois et le double pécule', () => {
    expect(facteurAnnuelDixMilliemes(DEFAUT)).toBe(139_200)
  })

  it('suit les primes cochées', () => {
    expect(facteurAnnuelDixMilliemes(SANS_TREIZIEME)).toBe(129_200)
    expect(facteurAnnuelDixMilliemes(SANS_PECULE)).toBe(130_000)
    expect(facteurAnnuelDixMilliemes(AUCUNE)).toBe(120_000)
  })

  it('tient compte du pourcentage et des mois prestés', () => {
    expect(facteurAnnuelDixMilliemes({ ...DEFAUT, treiziemePourcentageDixMilliemes: 10_850 })).toBe(140_050)
    expect(facteurAnnuelDixMilliemes({ ...DEFAUT, treiziemeMoisPrestes: 6 })).toBe(134_200)
  })
})

describe('brutAnnuelDepuisMensuel', () => {
  it('additionne 12 mois, le 13e mois et le double pécule', () => {
    // 12 × 3 000 € + 3 000 € + 92 % de 3 000 €.
    expect(brutAnnuelDepuisMensuel(300_000, DEFAUT)).toBe(4_176_000)
  })

  it('ne compte que les primes cochées', () => {
    expect(brutAnnuelDepuisMensuel(300_000, SANS_PECULE)).toBe(3_900_000)
    expect(brutAnnuelDepuisMensuel(300_000, AUCUNE)).toBe(3_600_000)
  })

  it('applique le pourcentage du 13e mois et les mois prestés', () => {
    expect(brutAnnuelDepuisMensuel(300_000, { ...DEFAUT, treiziemePourcentageDixMilliemes: 10_850 })).toBe(4_201_500)
    expect(brutAnnuelDepuisMensuel(300_000, { ...DEFAUT, treiziemeMoisPrestes: 6 })).toBe(4_026_000)
    expect(brutAnnuelDepuisMensuel(300_000, { ...DEFAUT, peculeMoisPrestes: 7 })).toBe(4_061_000)
  })

  it('arrondit chaque prime comme le fait le panneau des primes', () => {
    // 92 % de 3 735,63 € = 3 436,7796 €, arrondi à 3 436,78 €.
    expect(brutAnnuelDepuisMensuel(373_563, DEFAUT)).toBe(5_199_997)
    expect(brutAnnuelDepuisMensuel(373_564, DEFAUT)).toBe(5_200_011)
  })

  it('tombe pile sur la somme des bruts du panneau des primes', () => {
    const primes = calculerPrimesAnnuelles(373_563, 373_563 * 12, DEFAUT, { enfantsACharge: 0 }, getParametres('2026-09-15'))
    const sommePrimes = (primes.treizieme?.brutCentimes ?? 0) + (primes.pecule?.brutCentimes ?? 0)
    expect(brutAnnuelDepuisMensuel(373_563, DEFAUT)).toBe(373_563 * 12 + sommePrimes)
  })
})

describe('brutMensuelDepuisAnnuel', () => {
  it('retrouve le mensuel exact quand l’annuel en provient', () => {
    expect(brutMensuelDepuisAnnuel(4_176_000, DEFAUT)).toBe(300_000)
    expect(brutMensuelDepuisAnnuel(3_600_000, AUCUNE)).toBe(300_000)
  })

  it('retient le mensuel dont l’annuel est le plus proche', () => {
    // 52 000 € : 3 735,63 € donne 51 999,97 € (3 centimes), 3 735,64 € donne 52 000,11 € (11 centimes).
    expect(brutMensuelDepuisAnnuel(5_200_000, DEFAUT)).toBe(373_563)
    // Sans 13e mois : 4 024,77 € donne 52 000,03 €, 4 024,76 € donne 51 999,90 €.
    expect(brutMensuelDepuisAnnuel(5_200_000, SANS_TREIZIEME)).toBe(402_477)
  })

  it('retient le plus petit à égale distance', () => {
    // 3 000,00 € donne 41 760,00 € et 3 000,01 € donne 41 760,14 € : 41 760,07 € est à mi-chemin.
    expect(brutMensuelDepuisAnnuel(4_176_007, DEFAUT)).toBe(300_000)
  })

  it('refait l’aller-retour au centime sur toute une plage de salaires', () => {
    for (const primes of [DEFAUT, SANS_TREIZIEME, { ...DEFAUT, treiziemePourcentageDixMilliemes: 10_850, peculeMoisPrestes: 7 }]) {
      for (let mensuel = 1_000; mensuel < 1_000_000; mensuel += 997) {
        expect(brutMensuelDepuisAnnuel(brutAnnuelDepuisMensuel(mensuel, primes), primes)).toBe(mensuel)
      }
    }
  })

  it('renvoie 0 pour un annuel nul', () => {
    expect(brutMensuelDepuisAnnuel(0, DEFAUT)).toBe(0)
  })

  it('reste au-dessus du maximum, sans plantage, pour un annuel démesuré', () => {
    expect(brutMensuelDepuisAnnuel(9_000_000_000_000_000, DEFAUT)).toBeGreaterThan(BRUT_MAX_CENTIMES)
  })

  it('refuse un annuel négatif ou non entier', () => {
    expect(() => brutMensuelDepuisAnnuel(-1, DEFAUT)).toThrow(RangeError)
    expect(() => brutMensuelDepuisAnnuel(100.5, DEFAUT)).toThrow(RangeError)
  })
})

describe('netAnnuelToutCompris et calculerVueAnnuelle', () => {
  const parametres = getParametres('2026-09-15')
  const primes = calculerPrimesAnnuelles(300_000, 3_600_000, DEFAUT, { enfantsACharge: 0 }, parametres)

  it('additionne 12 nets versés et les nets des primes', () => {
    const nets = (primes.treizieme?.netCentimes ?? 0) + (primes.pecule?.netCentimes ?? 0)
    expect(netAnnuelToutCompris(226_133, primes)).toBe(226_133 * 12 + nets)
  })

  it('ne compte que 12 mois sans prime', () => {
    expect(netAnnuelToutCompris(226_133, { treizieme: null, pecule: null })).toBe(226_133 * 12)
  })

  it('réunit la vue annuelle', () => {
    const vue = calculerVueAnnuelle(300_000, 226_133, DEFAUT, primes)
    expect(vue.brutAnnuelCentimes).toBe(4_176_000)
    expect(vue.facteurDixMilliemes).toBe(139_200)
    expect(vue.netAnnuelToutComprisCentimes).toBe(netAnnuelToutCompris(226_133, primes))
    expect(vue.treizieme).toBe(true)
    expect(vue.pecule).toBe(true)
  })
})
```

- [ ] **Étape 2 : lancer les tests et constater l'échec**

Commande : `npx vitest run src/engine/annuel.test.ts`
Attendu : ÉCHEC — le module `./annuel` n'existe pas.

- [ ] **Étape 3 : exporter `brutPrime`**

Dans `src/engine/primesAnnuelles.ts`, ajoute seulement `export` devant `function brutPrime`. Ne change ni sa signature ni son corps.

- [ ] **Étape 4 : écrire le module**

Crée `src/engine/annuel.ts` :

```ts
import { diviserArrondi } from './argent'
import { brutPrime, TAUX_DOUBLE_PECULE_DIX_MILLIEMES, type PrimesSaisies, type ResultatPrimes } from './primesAnnuelles'
import { BRUT_MAX_CENTIMES } from './types'

const MOIS_PAR_AN = 12
const DIX_MILLE = 10_000
/** Au-delà, le brut mensuel est de toute façon hors limites : inutile de chercher plus haut. */
const MENSUEL_MAX_RECHERCHE = BRUT_MAX_CENTIMES + 1

/**
 * Brut annuel au sens belge : 12 mois, plus le 13e mois et le double pécule cochés, calculés et
 * arrondis exactement comme dans le panneau des primes (spec vue annuelle § 2.1).
 */
export function brutAnnuelDepuisMensuel(brutMensuelCentimes: number, primes: PrimesSaisies): number {
  const treizieme = primes.treiziemeActif
    ? brutPrime(brutMensuelCentimes, primes.treiziemePourcentageDixMilliemes, primes.treiziemeMoisPrestes)
    : 0
  const pecule = primes.peculeActif ? brutPrime(brutMensuelCentimes, TAUX_DOUBLE_PECULE_DIX_MILLIEMES, primes.peculeMoisPrestes) : 0
  return MOIS_PAR_AN * brutMensuelCentimes + treizieme + pecule
}

/**
 * Brut mensuel dont le brut annuel est le plus proche de l'annuel donné ; le plus petit à égale
 * distance (spec vue annuelle § 2.2). brutAnnuelDepuisMensuel est croissante et avance d'au moins
 * 12 centimes par centime mensuel : une dichotomie puis l'examen du voisin inférieur suffisent.
 */
export function brutMensuelDepuisAnnuel(brutAnnuelCentimes: number, primes: PrimesSaisies): number {
  if (!Number.isSafeInteger(brutAnnuelCentimes) || brutAnnuelCentimes < 0) {
    throw new RangeError(`Brut annuel invalide : ${brutAnnuelCentimes}`)
  }
  // Plus petit mensuel dont l'annuel atteint la cible ; brutAnnuel(M) ≥ 12 × M borne la recherche.
  let bas = 0
  let haut = Math.min(Math.ceil(brutAnnuelCentimes / MOIS_PAR_AN), MENSUEL_MAX_RECHERCHE)
  while (bas < haut) {
    const milieu = Math.floor((bas + haut) / 2)
    if (brutAnnuelDepuisMensuel(milieu, primes) >= brutAnnuelCentimes) {
      haut = milieu
    } else {
      bas = milieu + 1
    }
  }
  if (bas > 0) {
    const ecartInferieur = brutAnnuelCentimes - brutAnnuelDepuisMensuel(bas - 1, primes)
    const ecart = Math.abs(brutAnnuelDepuisMensuel(bas, primes) - brutAnnuelCentimes)
    if (ecartInferieur <= ecart) {
      return bas - 1
    }
  }
  return bas
}

/** Facteur annuel à afficher, en dix-millièmes : 139 200 pour « × 13,92 ». */
export function facteurAnnuelDixMilliemes(primes: PrimesSaisies): number {
  const treizieme = primes.treiziemeActif ? primes.treiziemePourcentageDixMilliemes * primes.treiziemeMoisPrestes : 0
  const pecule = primes.peculeActif ? TAUX_DOUBLE_PECULE_DIX_MILLIEMES * primes.peculeMoisPrestes : 0
  return diviserArrondi(MOIS_PAR_AN * DIX_MILLE * MOIS_PAR_AN + treizieme + pecule, MOIS_PAR_AN)
}

/** 12 nets versés, plus les nets des primes cochées (spec vue annuelle § 2.4). */
export function netAnnuelToutCompris(netVerseMensuelCentimes: number, primes: ResultatPrimes): number {
  return MOIS_PAR_AN * netVerseMensuelCentimes + (primes.treizieme?.netCentimes ?? 0) + (primes.pecule?.netCentimes ?? 0)
}

/** Ce que le récapitulatif et le formulaire affichent sur l'année. */
export interface VueAnnuelle {
  brutAnnuelCentimes: number
  netAnnuelToutComprisCentimes: number
  facteurDixMilliemes: number
  /** Primes cochées : elles composent le brut et le net annuels. */
  treizieme: boolean
  pecule: boolean
}

export function calculerVueAnnuelle(
  brutMensuelCentimes: number,
  netVerseMensuelCentimes: number,
  primesSaisies: PrimesSaisies,
  resultatPrimes: ResultatPrimes,
): VueAnnuelle {
  return {
    brutAnnuelCentimes: brutAnnuelDepuisMensuel(brutMensuelCentimes, primesSaisies),
    netAnnuelToutComprisCentimes: netAnnuelToutCompris(netVerseMensuelCentimes, resultatPrimes),
    facteurDixMilliemes: facteurAnnuelDixMilliemes(primesSaisies),
    treizieme: primesSaisies.treiziemeActif,
    pecule: primesSaisies.peculeActif,
  }
}
```

- [ ] **Étape 5 : lancer les tests et constater le succès**

Commande : `npx vitest run src/engine/annuel.test.ts`
Attendu : SUCCÈS. Si une valeur chiffrée du test diffère, **ne corrige pas le test pour qu'il passe** : recalcule-la à la main avec `appliquerTaux` et `diviserArrondi`, et rapporte l'écart.

- [ ] **Étape 6 : vérifier et commiter**

```bash
npm test && npm run typecheck && npm run lint
git add src/engine/annuel.ts src/engine/annuel.test.ts src/engine/primesAnnuelles.ts
git commit -m "$(cat <<'EOF'
feat: conversion entre brut mensuel et brut annuel belge

<ligne Co-Authored-By de ton rappel système>
EOF
)"
```

---

## Task 2 : la saisie annuelle, sa validation et la sauvegarde v7

**Fichiers :**
- Modifier : `src/engine/validation.ts`
- Modifier : `src/hooks/useSaisie.ts`
- Test : `src/engine/validation.test.ts`, `src/hooks/useSaisie.test.ts`

**Interfaces :**
- Consomme : `brutMensuelDepuisAnnuel` (tâche 1).
- Produit :
  - `const PERIODES_MONTANT = ['mensuel', 'annuel'] as const` et `type PeriodeMontant`, exportés de `validation.ts`
  - `SaisieFormulaire` gagne `periode: PeriodeMontant` ; `SAISIE_PAR_DEFAUT.periode = 'mensuel'`
  - clé de stockage `wage-calculator:saisie:v7`, `CLE_STOCKAGE_V6` conservée en lecture
  - `useSaisie()` renvoie aussi `basculerPeriode(montantConverti: string | null): void`

- [ ] **Étape 1 : écrire les tests de validation qui échouent**

Dans `src/engine/validation.test.ts`, ajoute :

```ts
describe('saisie annuelle', () => {
  const annuel = (montant: string, surcharge: Partial<SaisieFormulaire> = {}): SaisieFormulaire => ({
    ...SAISIE_PAR_DEFAUT,
    periode: 'annuel',
    montant,
    ...surcharge,
  })

  it('convertit un brut annuel en brut mensuel selon les primes', () => {
    const r = validerSaisie(annuel('52000'), '2026-09-15')
    expect(r.ok && r.sens === 'brutVersNet' && r.situation.brutMensuelCentimes).toBe(373_563)
  })

  it('retrouve exactement 3 000 € par mois pour 41 760 € par an', () => {
    const r = validerSaisie(annuel('41760'), '2026-09-15')
    expect(r.ok && r.sens === 'brutVersNet' && r.situation.brutMensuelCentimes).toBe(300_000)
  })

  it('suit les primes cochées', () => {
    const sansTreizieme = annuel('52000', { primes: { ...SAISIE_PAR_DEFAUT.primes, treiziemeActif: false } })
    const r = validerSaisie(sansTreizieme, '2026-09-15')
    expect(r.ok && r.sens === 'brutVersNet' && r.situation.brutMensuelCentimes).toBe(402_477)
  })

  it.each([
    ['', 'montantVide'],
    ['abc', 'montantFormat'],
    ['0', 'montantHorsLimites'],
    ['99999999999', 'montantHorsLimites'],
  ])('refuse l’annuel « %s » sur le champ du montant (%s)', (montant, code) => {
    const r = validerSaisie(annuel(montant), '2026-09-15')
    expect(!r.ok && r.erreurs.montant).toBe(code)
  })

  it('ignore la période en net → brut', () => {
    const r = validerSaisie(annuel('2261,33', { sens: 'netVersBrut' }), '2026-09-15')
    expect(r.ok && r.sens === 'netVersBrut' && r.netCibleCentimes).toBe(226_133)
  })

  it('ne convertit pas quand les primes sont en erreur, sans ajouter d’erreur au montant', () => {
    const r = validerSaisie(annuel('52000', { primes: { ...SAISIE_PAR_DEFAUT.primes, treiziemePourcentage: 'abc' } }), '2026-09-15')
    expect(r.ok).toBe(false)
    expect(!r.ok && r.erreurs.montant).toBeUndefined()
    expect(!r.ok && r.erreurs.treiziemePourcentage).toBe('pourcentagePrimeInvalide')
  })
})
```

Complète les imports si besoin (`type SaisieFormulaire`).

- [ ] **Étape 2 : lancer les tests et constater l'échec**

Commande : `npx vitest run src/engine/validation.test.ts`
Attendu : ÉCHEC à la compilation — `periode` n'existe pas sur `SaisieFormulaire`.

- [ ] **Étape 3 : écrire la validation**

Dans `src/engine/validation.ts` :

Ajoute, près de `SENS_CALCUL` :

```ts
export const PERIODES_MONTANT = ['mensuel', 'annuel'] as const

/** Le brut se saisit par mois ou par an ; le net, toujours par mois (spec vue annuelle § 3). */
export type PeriodeMontant = (typeof PERIODES_MONTANT)[number]
```

Dans `SaisieFormulaire`, après `montant` :

```ts
  /** Période du montant en brut → net ; ignorée en net → brut. */
  periode: PeriodeMontant
```

Dans `SAISIE_PAR_DEFAUT`, après `montant: '3000',` : `periode: 'mensuel',`.

Importe `brutMensuelDepuisAnnuel` depuis `./annuel`.

Dans `validerSaisie`, remplace la lecture du montant par une lecture sans bornes :

```ts
  let montantSaisi: number | null = null
  if (saisie.montant.trim() === '') {
    erreurs.montant = 'montantVide'
  } else {
    montantSaisi = eurosTexteEnCentimes(saisie.montant)
    if (montantSaisi === null) {
      erreurs.montant = 'montantFormat'
    }
  }
```

Puis, **juste après** `const primes = validerPrimes(saisie.primes, erreurs)`, convertis et borne :

```ts
  // Un brut annuel se convertit en brut mensuel selon les primes validées (spec vue annuelle § 2.2) ;
  // en net → brut, la période est ignorée. Si les primes sont en erreur, la saisie est déjà
  // invalide : on ne convertit pas, et on n'ajoute pas d'erreur au montant.
  const primesEnErreur =
    erreurs.treiziemePourcentage !== undefined || erreurs.treiziemeMoisPrestes !== undefined || erreurs.peculeMoisPrestes !== undefined
  const annuel = saisie.sens === 'brutVersNet' && saisie.periode === 'annuel'
  let montant: number | null = null
  if (montantSaisi !== null && !(annuel && primesEnErreur)) {
    montant = annuel ? brutMensuelDepuisAnnuel(montantSaisi, primes) : montantSaisi
    if (montant <= 0 || montant > BRUT_MAX_CENTIMES) {
      erreurs.montant = 'montantHorsLimites'
      montant = null
    }
  }
```

Le reste de `validerSaisie` (le test `montant === null || Object.keys(erreurs).length > 0`, les deux `return`) ne change pas.

- [ ] **Étape 4 : lancer les tests de validation et constater le succès**

Commande : `npx vitest run src/engine/validation.test.ts`
Attendu : SUCCÈS, y compris tous les tests existants du fichier.

- [ ] **Étape 5 : écrire les tests de sauvegarde qui échouent**

Dans `src/hooks/useSaisie.test.ts`, en suivant le style des `describe` de reprise existants (repère celui de la v6) :

```ts
describe('reprise d’une saisie antérieure (v7)', () => {
  const V6 = (() => {
    const { periode: _periode, ...reste } = SAISIE_PAR_DEFAUT
    return reste
  })()

  it('lit la clé v7 en priorité', () => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, periode: 'annuel', montant: '52000' }))
    localStorage.setItem(CLE_STOCKAGE_V6, JSON.stringify({ ...V6, montant: '1000' }))
    expect(lireSaisieStockee()).toMatchObject({ periode: 'annuel', montant: '52000' })
  })

  it('reprend une saisie v6 en mensuel', () => {
    localStorage.setItem(CLE_STOCKAGE_V6, JSON.stringify({ ...V6, montant: '4000' }))
    expect(lireSaisieStockee()).toMatchObject({ periode: 'mensuel', montant: '4000' })
  })

  it('remplace une période inconnue par « mensuel »', () => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, periode: 'trimestriel' }))
    expect(lireSaisieStockee().periode).toBe('mensuel')
  })

  it('ne réécrit jamais la clé v6', () => {
    localStorage.setItem(CLE_STOCKAGE_V6, JSON.stringify({ ...V6, montant: '4000' }))
    lireSaisieStockee()
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE_V6) as string).montant).toBe('4000')
  })
})
```

Et, à côté des tests existants de `basculerSens` (repère comment ils utilisent `renderHook` et `act`), ajoute :

```ts
  it('bascule la période et reprend le montant converti', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.basculerPeriode('41760,00'))
    expect(result.current.saisie).toMatchObject({ periode: 'annuel', montant: '41760,00' })
    act(() => result.current.basculerPeriode('3000,00'))
    expect(result.current.saisie).toMatchObject({ periode: 'mensuel', montant: '3000,00' })
  })

  it('garde le montant tapé quand aucun montant converti n’est fourni', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.basculerPeriode(null))
    expect(result.current.saisie).toMatchObject({ periode: 'annuel', montant: SAISIE_PAR_DEFAUT.montant })
  })
```

**Adapte les tests de reprise existants selon la règle des sous-projets précédents** : partout où un test construit une saisie « d'une version précédente » à partir de `SAISIE_PAR_DEFAUT`, il doit maintenant en retirer aussi `periode`. Ne supprime aucun test ; renomme `v6` en `v7` dans les titres uniquement là où le nombre désigne le format de stockage courant. Liste dans ton rapport chaque test modifié et pourquoi.

- [ ] **Étape 6 : lancer les tests et constater l'échec**

Commande : `npx vitest run src/hooks/useSaisie.test.ts`
Attendu : ÉCHEC — `CLE_STOCKAGE_V6` et `basculerPeriode` n'existent pas.

- [ ] **Étape 7 : écrire la sauvegarde v7 et la bascule**

Dans `src/hooks/useSaisie.ts` :

```ts
export const CLE_STOCKAGE = 'wage-calculator:saisie:v7'
/** Format V6 (sans période du montant) : lu pour reprendre la saisie, jamais réécrit. */
export const CLE_STOCKAGE_V6 = 'wage-calculator:saisie:v6'
```

(les clés V5 à V1 et leurs commentaires ne changent pas).

Ajoute la garde, à côté des autres :

```ts
function estPeriode(valeur: unknown): valeur is PeriodeMontant {
  return typeof valeur === 'string' && (PERIODES_MONTANT as readonly string[]).includes(valeur)
}
```

Ajoute `estPeriode((valeur as Objet).periode)` aux vérifications de `estSaisie` ; dans `completer`, `periode: estPeriode(v.periode) ? v.periode : SAISIE_PAR_DEFAUT.periode,` ; dans `repriseV1`, `periode: SAISIE_PAR_DEFAUT.periode,`. Ajoute `CLE_STOCKAGE_V6` en tête de la cascade de `lireSaisieStockee`, juste après `CLE_STOCKAGE`. Importe `PERIODES_MONTANT` et `type PeriodeMontant` depuis `../engine/validation`.

Ajoute la bascule, à côté de `basculerSens`, et renvoie-la :

```ts
  /** Change de période : le champ reprend le montant converti (le résultat affiché), sinon il est gardé. */
  const basculerPeriode = useCallback((montantConverti: string | null) => {
    setSaisie((precedente) => ({
      ...precedente,
      periode: precedente.periode === 'mensuel' ? 'annuel' : 'mensuel',
      montant: montantConverti ?? precedente.montant,
      montantAvantBascule: null,
    }))
  }, [])

  return { saisie, modifier, basculerSens, basculerPeriode }
```

- [ ] **Étape 8 : lancer les tests et constater le succès**

Commande : `npx vitest run src/hooks/useSaisie.test.ts src/engine/validation.test.ts`
Attendu : SUCCÈS.

- [ ] **Étape 9 : vérifier et commiter**

```bash
npm test && npm run typecheck && npm run lint
git add src/engine/validation.ts src/engine/validation.test.ts src/hooks/useSaisie.ts src/hooks/useSaisie.test.ts
git commit -m "$(cat <<'EOF'
feat: saisie du brut annuel et sauvegarde v7

<ligne Co-Authored-By de ton rappel système>
EOF
)"
```

`src/App.test.tsx` ne doit pas changer dans cette tâche et doit rester vert.

---

## Task 3 : le récapitulatif annuel

**Fichiers :**
- Modifier : `src/hooks/useCalcul.ts`
- Modifier : `src/components/Recapitulatif.tsx`
- Modifier : `src/App.tsx` (transmettre la vue annuelle au récapitulatif)
- Modifier : `src/i18n/fr.ts`
- Modifier : `src/utils/format.ts`
- Test : `src/utils/format.test.ts` (existe déjà ; crée-le s'il n'existe pas), `src/App.test.tsx`

**Interfaces :**
- Consomme : `calculerVueAnnuelle`, `VueAnnuelle` (tâche 1) ; `validation.primes` (déjà dans `useCalcul`).
- Produit :
  - l'état `ok` de `useCalcul` gagne `annuel: VueAnnuelle`
  - `formatFacteur(dixMilliemes: number): string` dans `src/utils/format.ts`
  - dans `fr.ts`, le bloc racine `annuel` : `parties(treizieme, pecule)`, `facteur(facteur, parties)`, `netToutCompris`, `compositionNet(parties)`, `brutAnnuel`
  - `Recapitulatif` reçoit une prop `annuel: VueAnnuelle | null`

- [ ] **Étape 1 : écrire les tests qui échouent**

Dans `src/utils/format.test.ts` :

```ts
describe('formatFacteur', () => {
  it('affiche un facteur annuel avec au plus deux décimales', () => {
    expect(formatFacteur(139_200)).toBe('13,92')
    expect(formatFacteur(129_200)).toBe('12,92')
    expect(formatFacteur(120_000)).toBe('12')
  })
})
```

Dans `src/App.test.tsx`, ajoute en haut, après les autres constantes :

```ts
/** 13e mois et double pécule nets de la saisie par défaut (3 000 € brut, isolé), affirmés au test des primes. */
const NETS_PRIMES_DEFAUT = 139_679 + 141_339
```

Puis ce `describe`, à la fin du fichier :

```ts
describe('App — net annuel tout compris', () => {
  it('additionne 12 nets et les primes nettes', () => {
    render(<App dateIso={DATE} />)
    const recap = recapitulatif()
    expect(within(recap).getByText('Net annuel tout compris')).toBeInTheDocument()
    expect(within(recap).getByText(euros(226_133 * 12 + NETS_PRIMES_DEFAUT))).toBeInTheDocument()
    expect(within(recap).getByText('12 mois, 13e mois, double pécule, nets')).toBeInTheDocument()
  })

  it('ne compte que 12 mois quand aucune prime n’est cochée', () => {
    render(<App dateIso={DATE} />)
    ouvrirSection(/^13e mois et pécule de vacances/)
    fireEvent.click(screen.getByLabelText('13e mois'))
    fireEvent.click(screen.getByLabelText('Double pécule de vacances'))
    const recap = recapitulatif()
    expect(within(recap).getByText(euros(226_133 * 12))).toBeInTheDocument()
    expect(within(recap).getByText('12 mois, nets')).toBeInTheDocument()
  })

  it('affiche le brut annuel belge en net → brut', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Net → brut'))
    const recap = screen.getByRole('region', { name: 'Votre salaire brut' })
    expect(within(recap).getByText('Brut annuel')).toBeInTheDocument()
    expect(within(recap).getByText(euros(4_176_000))).toBeInTheDocument()
    expect(within(recap).getByText('× 13,92 : 12 mois, 13e mois, double pécule')).toBeInTheDocument()
    expect(within(recap).getByText(euros(226_133 * 12 + NETS_PRIMES_DEFAUT))).toBeInTheDocument()
  })
})
```

Vérifie les libellés exacts (« Net → brut », cases des primes) contre `src/i18n/fr.ts` et contre les tests existants qui basculent le sens : suis la façon dont ils le font. Le passage en net → brut reprend le net affiché (2 261,33 €), dont le brut nécessaire est 3 000,00 € : c'est ce qui donne 41 760,00 € par an.

- [ ] **Étape 2 : lancer les tests et constater l'échec**

Commandes : `npx vitest run src/utils/format.test.ts src/App.test.tsx`
Attendu : ÉCHEC — `formatFacteur` et « Net annuel tout compris » n'existent pas.

- [ ] **Étape 3 : les textes et le format**

Dans `src/utils/format.ts` :

```ts
const NOMBRE_FACTEUR = new Intl.NumberFormat('fr-BE', { maximumFractionDigits: 2 })

/** Facteur en dix-millièmes → « 13,92 », « 12 ». */
export function formatFacteur(dixMilliemes: number): string {
  return NOMBRE_FACTEUR.format(dixMilliemes / 10_000)
}
```

(si le fichier fixe déjà une locale pour ses autres formats, reprends la même.)

Dans `src/i18n/fr.ts`, à la racine de `fr`, ajoute :

```ts
  annuel: {
    /** Ce qui compose une année : « 12 mois, 13e mois, double pécule », selon les primes cochées. */
    parties: (treizieme: boolean, pecule: boolean) =>
      ['12 mois', ...(treizieme ? ['13e mois'] : []), ...(pecule ? ['double pécule'] : [])].join(', '),
    facteur: (facteur: string, parties: string) => `× ${facteur} : ${parties}`,
    netToutCompris: 'Net annuel tout compris',
    compositionNet: (parties: string) => `${parties}, nets`,
    brutAnnuel: 'Brut annuel',
  },
```

Dans le bloc `recapitulatif`, **retire** `netAnnuel`, `brutAnnuel` et `horsExtras`, qui ne serviront plus ; vérifie avec une recherche qu'aucun autre fichier ne les utilise.

- [ ] **Étape 4 : exposer la vue annuelle dans `useCalcul`**

Dans `src/hooks/useCalcul.ts`, ajoute à l'état `ok`, à côté de `primes` :

```ts
      /** Brut et net sur l'année, et ce qui les compose (spec vue annuelle § 2). */
      annuel: VueAnnuelle
```

et renseigne-le dans **les deux** branches de retour, avec le brut mensuel de la branche (`inverse.brutCentimes` ou `validation.situation.brutMensuelCentimes`), le net versé du résultat (`inverse.complet.netVerseCentimes` ou `complet.netVerseCentimes`), `validation.primes` et le résultat des primes déjà calculé :

```ts
        annuel: calculerVueAnnuelle(brutMensuel, netVerse, validation.primes, primes),
```

Importe `calculerVueAnnuelle` et `type VueAnnuelle` depuis `../engine/annuel`.

- [ ] **Étape 5 : le récapitulatif**

Dans `src/components/Recapitulatif.tsx`, ajoute la prop `annuel: VueAnnuelle | null` et remplace le bloc de la ligne annuelle (le `<div>` dont le `<dt>` affiche aujourd'hui `t.netAnnuel` ou `t.brutAnnuel`) par :

```tsx
        {sens === 'netVersBrut' && (
          <div>
            <dt className="text-sm text-blue-100">{fr.annuel.brutAnnuel}</dt>
            <dd className="text-xl font-semibold tabular-nums">{euros(complet && annuel ? annuel.brutAnnuelCentimes : null)}</dd>
            {annuel && (
              <dd className="text-xs text-blue-100">
                {fr.annuel.facteur(formatFacteur(annuel.facteurDixMilliemes), fr.annuel.parties(annuel.treizieme, annuel.pecule))}
              </dd>
            )}
          </div>
        )}
        <div>
          <dt className="text-sm text-blue-100">{fr.annuel.netToutCompris}</dt>
          <dd className="text-xl font-semibold tabular-nums">{euros(complet && annuel ? annuel.netAnnuelToutComprisCentimes : null)}</dd>
          {annuel && <dd className="text-xs text-blue-100">{fr.annuel.compositionNet(fr.annuel.parties(annuel.treizieme, annuel.pecule))}</dd>}
        </div>
```

Importe `type VueAnnuelle` depuis `../engine/annuel` et `formatFacteur` depuis `../utils/format`. Le bloc du taux de retour, qui suit, ne change pas. Retire du composant ce qui ne sert plus (le calcul `complet.netVerseCentimes * 12`, les références à `t.horsExtras`) ; `effetSurArgentVerse` reste utilisé ailleurs dans le composant, garde-le.

Dans `src/App.tsx`, passe `annuel={ok?.annuel ?? null}` à `<Recapitulatif>`.

- [ ] **Étape 6 : mettre à jour les quatre montants annuels existants**

La ligne annuelle valait 12 × le net versé ; elle vaut maintenant 12 × le net versé plus les primes nettes. Dans `src/App.test.tsx`, **quatre** affirmations existantes portent sur ce montant (repère-les par `* 12` : titres-repas, frais propres, contribution voiture, budget mobilité). Toutes concernent la saisie par défaut, 3 000 € brut, isolé, primes par défaut : leurs primes nettes valent donc `NETS_PRIMES_DEFAUT`. Pour chacune, ajoute `+ NETS_PRIMES_DEFAUT` à l'expression attendue, **et rien d'autre** :

```ts
// avant
expect(within(recapNet()).getByText(euros((226_133 - 2_180) * 12))).toBeInTheDocument()
// après
expect(within(recapNet()).getByText(euros((226_133 - 2_180) * 12 + NETS_PRIMES_DEFAUT))).toBeInTheDocument()
```

Ce sont les **seules** valeurs attendues de tests existants autorisées à changer dans tout ce sous-projet. Liste-les dans ton rapport, avec le titre de chaque test. Si un autre test existant échoue, c'est un défaut à comprendre, pas une valeur à ajuster.

- [ ] **Étape 7 : lancer les tests et constater le succès**

Commandes : `npx vitest run src/utils/format.test.ts src/App.test.tsx`, puis `npm test`.
Attendu : SUCCÈS.

- [ ] **Étape 8 : vérifier et commiter**

```bash
npm test && npm run typecheck && npm run lint
git add src/hooks/useCalcul.ts src/components/Recapitulatif.tsx src/App.tsx src/i18n/fr.ts src/utils/format.ts src/utils/format.test.ts src/App.test.tsx
git commit -m "$(cat <<'EOF'
feat: net annuel tout compris et brut annuel belge au récapitulatif

<ligne Co-Authored-By de ton rappel système>
EOF
)"
```

---

## Task 4 : saisir le brut par mois ou par an

**Fichiers :**
- Modifier : `src/components/formulaire/SectionSalaireFamille.tsx`
- Modifier : `src/components/FormulaireSituation.tsx`
- Modifier : `src/App.tsx`
- Modifier : `src/i18n/fr.ts`
- Modifier : `docs/superpowers/specs/2026-09-28-vue-annuelle-design.md` (statut)
- Test : `src/App.test.tsx`

**Interfaces :**
- Consomme : `PERIODES_MONTANT`, `SaisieFormulaire.periode`, `basculerPeriode` (tâche 2) ; `VueAnnuelle`, `ok.annuel`, `formatFacteur`, `fr.annuel.parties`, `fr.annuel.facteur` (tâches 1 et 3).
- Produit : l'interface complète. Aucune tâche ultérieure n'en dépend.

- [ ] **Étape 1 : écrire les tests d'interface qui échouent**

En haut de `src/App.test.tsx`, après les autres aides :

```ts
/** Passe le brut en saisie annuelle. */
function passerEnAnnuel() {
  fireEvent.click(screen.getByRole('radio', { name: 'par an' }))
}
```

Puis ce `describe`, à la fin du fichier :

```ts
describe('App — brut par mois ou par an', () => {
  it('propose la période en brut → net, pas en net → brut', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    expect(screen.getByRole('radio', { name: 'par mois' })).toBeChecked()
    await user.click(screen.getByLabelText('Net → brut'))
    expect(screen.queryByRole('radio', { name: 'par an' })).not.toBeInTheDocument()
  })

  it('convertit le montant tapé en changeant de période', () => {
    render(<App dateIso={DATE} />)
    expect(screen.getByText(/soit 41 760,00 € brut par an/)).toBeInTheDocument()
    passerEnAnnuel()
    expect(screen.getByLabelText('Salaire brut annuel (€)')).toHaveValue(centimesEnSaisie(4_176_000))
    fireEvent.click(screen.getByRole('radio', { name: 'par mois' }))
    expect(screen.getByLabelText('Salaire brut mensuel (€)')).toHaveValue(centimesEnSaisie(300_000))
  })

  it('donne le même net pour 41 760 € par an que pour 3 000 € par mois', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    passerEnAnnuel()
    const brut = screen.getByLabelText('Salaire brut annuel (€)')
    await user.clear(brut)
    await user.type(brut, '41760')
    expect(within(recapitulatif()).getByText(euros(226_133))).toBeInTheDocument()
  })

  it('annonce le brut mensuel retenu et l’écart d’arrondi', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    passerEnAnnuel()
    const brut = screen.getByLabelText('Salaire brut annuel (€)')
    await user.clear(brut)
    await user.type(brut, '52000')
    const aide = screen.getByText(/soit .* brut par mois/)
    expect(aide).toHaveTextContent(euros(373_563))
    expect(aide).toHaveTextContent('× 13,92 : 12 mois, 13e mois, double pécule')
    expect(aide).toHaveTextContent(`annuel recalculé : ${euros(5_199_997)}`)
  })

  it('suit les primes : sans 13e mois, 52 000 € par an font 4 024,77 € par mois', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    passerEnAnnuel()
    const brut = screen.getByLabelText('Salaire brut annuel (€)')
    await user.clear(brut)
    await user.type(brut, '52000')
    ouvrirSection(/^13e mois et pécule de vacances/)
    fireEvent.click(screen.getByLabelText('13e mois'))
    const aide = screen.getByText(/soit .* brut par mois/)
    expect(aide).toHaveTextContent(euros(402_477))
    expect(aide).toHaveTextContent('× 12,92 : 12 mois, double pécule')
  })

  it('refait l’aller-retour de sens sans confondre annuel et mensuel', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    passerEnAnnuel()
    const brut = screen.getByLabelText('Salaire brut annuel (€)')
    await user.clear(brut)
    await user.type(brut, '52000')
    const net = within(recapitulatif()).getByText(/€/).textContent
    await user.click(screen.getByLabelText('Net → brut'))
    await user.click(screen.getByLabelText('Brut → net'))
    // Sans modification entre-temps, le montant d'avant la bascule est restauré tel quel.
    expect(screen.getByRole('radio', { name: 'par an' })).toBeChecked()
    expect(screen.getByLabelText('Salaire brut annuel (€)')).toHaveValue('52000')
    expect(within(recapitulatif()).getByText(/€/).textContent).toBe(net)
  })

  it('reprend un brut annuel, pas le mensuel, après une modification en net → brut', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    passerEnAnnuel()
    const brut = screen.getByLabelText('Salaire brut annuel (€)')
    await user.clear(brut)
    await user.type(brut, '52000')
    await user.click(screen.getByLabelText('Net → brut'))
    // Toute modification fait reprendre le résultat affiché au retour, au lieu du montant d'avant.
    const enfants = screen.getByLabelText('Enfants à charge')
    await user.clear(enfants)
    await user.type(enfants, '0')
    await user.click(screen.getByLabelText('Brut → net'))
    expect(screen.getByRole('radio', { name: 'par an' })).toBeChecked()
    const repris = eurosTexteEnCentimes((screen.getByLabelText('Salaire brut annuel (€)') as HTMLInputElement).value)
    // Un brut annuel de l'ordre de 52 000 €, et non le brut mensuel de l'ordre de 3 736 €.
    expect(repris).toBeGreaterThan(5_000_000)
  })

  it('refuse un annuel vide sur son champ, sans ligne d’équivalence', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    passerEnAnnuel()
    const brut = screen.getByLabelText('Salaire brut annuel (€)')
    await user.clear(brut)
    expect(brut).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByText(/brut par mois/)).not.toBeInTheDocument()
  })
})
```

Importe `centimesEnSaisie` depuis `./utils/format` et `eurosTexteEnCentimes` depuis `./engine/argent` s'ils ne le sont pas déjà. Le second test de l'aller-retour est celui qui prouve le correctif de l'étape 5 : il doit échouer tant que `basculer` reprend `ok.brutCentimes` en revenant vers une saisie annuelle. Le test de l'aller-retour compare le premier montant en euros du récapitulatif avant et après : si la structure du récapitulatif rend cette requête ambiguë, cible le montant mis en avant autrement, mais garde l'intention — le net doit être le même au retour.

- [ ] **Étape 2 : lancer les tests et constater l'échec**

Commande : `npx vitest run src/App.test.tsx`
Attendu : ÉCHEC — aucun bouton radio « par an ».

- [ ] **Étape 3 : les textes**

Dans `src/i18n/fr.ts`, dans le bloc racine `annuel` créé à la tâche 3, ajoute :

```ts
    periode: 'Période du salaire brut',
    periodes: { mensuel: 'par mois', annuel: 'par an' } satisfies Record<PeriodeMontant, string>,
    equivalentAnnuel: (montant: string, facteur: string) => `soit ${montant} brut par an (${facteur})`,
    equivalentMensuel: (montant: string, facteur: string) => `soit ${montant} brut par mois (${facteur})`,
    recalcule: (montant: string) => ` — annuel recalculé : ${montant}`,
```

Dans le bloc `formulaire`, ajoute `montantAnnuel: 'Salaire brut annuel (€)',`. Importe `type PeriodeMontant` depuis `../engine/validation`.

- [ ] **Étape 4 : le sélecteur et la ligne d'équivalence**

Dans `src/components/formulaire/SectionSalaireFamille.tsx`, ajoute trois props :

```ts
  /** Vue annuelle du calcul abouti, sinon null (spec vue annuelle § 4.1). */
  annuel: VueAnnuelle | null
  /** Brut mensuel retenu par le calcul abouti, sinon null. */
  brutMensuelCentimes: number | null
  onBasculerPeriode: () => void
```

Dans le bloc du montant (le `<div>` qui contient `<label htmlFor="montant">`) :

1. Le libellé devient `saisie.sens === 'brutVersNet' && saisie.periode === 'annuel' ? t.montantAnnuel : t.montant[saisie.sens]`.
2. En brut → net seulement, sous le libellé, un sélecteur de période, construit **exactement** comme celui du sens du calcul plus haut dans ce fichier (même conteneur `inline-flex`, mêmes classes de `label`, bouton radio `sr-only`), dans un `fieldset` dont la `legend` vaut `fr.annuel.periode` avec la classe `sr-only` ; `name="periode"`, une option par valeur de `PERIODES_MONTANT`, libellé `fr.annuel.periodes[valeur]`, `checked={saisie.periode === valeur}`, `onChange={onBasculerPeriode}`.
3. Sous le champ, en brut → net, quand il n'y a pas d'erreur de montant et que `annuel` et `brutMensuelCentimes` sont connus, une ligne d'aide `<p id="montant-equivalence" className="mt-1 text-sm text-slate-600 dark:text-slate-400">` :

```tsx
  const facteurTexte = annuel ? fr.annuel.facteur(formatFacteur(annuel.facteurDixMilliemes), fr.annuel.parties(annuel.treizieme, annuel.pecule)) : ''
  const montantTape = eurosTexteEnCentimes(saisie.montant.trim())
  const equivalence =
    saisie.sens !== 'brutVersNet' || annuel === null || brutMensuelCentimes === null
      ? null
      : saisie.periode === 'mensuel'
        ? fr.annuel.equivalentAnnuel(formatEuro(annuel.brutAnnuelCentimes), facteurTexte)
        : fr.annuel.equivalentMensuel(formatEuro(brutMensuelCentimes), facteurTexte) +
          (montantTape !== null && montantTape !== annuel.brutAnnuelCentimes ? fr.annuel.recalcule(formatEuro(annuel.brutAnnuelCentimes)) : '')
```

Le champ du montant la désigne : `aria-describedby={erreurMontant ? 'montant-erreur' : equivalence ? 'montant-equivalence' : undefined}`.

Importe ce qu'il faut : `PERIODES_MONTANT` depuis `../../engine/validation`, `type VueAnnuelle` depuis `../../engine/annuel`, `eurosTexteEnCentimes` depuis `../../engine/argent`, `formatFacteur` depuis `../../utils/format`.

Dans `src/components/FormulaireSituation.tsx`, ajoute les trois mêmes props à son interface et transmets-les à `SectionSalaireFamille`.

- [ ] **Étape 5 : le câblage dans `App.tsx`**

Récupère `basculerPeriode` de `useSaisie()`. Remplace `basculer` et ajoute la bascule de période :

```tsx
  /**
   * Au changement de sens, le champ reprend le montant opposé du résultat affiché. En revenant en
   * brut → net avec la période « par an », il reprend le brut annuel, pas le mensuel : sinon le
   * brut mensuel serait lu comme un annuel (spec vue annuelle § 3).
   */
  function basculer() {
    const montantRepris = ok
      ? centimesEnSaisie(
          ok.sens === 'brutVersNet'
            ? ok.complet.netVerseCentimes
            : saisie.periode === 'annuel'
              ? ok.annuel.brutAnnuelCentimes
              : ok.brutCentimes,
        )
      : null
    basculerSens(montantRepris)
  }

  /** Au changement de période, le champ reprend l'équivalent calculé ; saisie invalide : il est gardé. */
  function basculerLaPeriode() {
    const montantConverti =
      ok && ok.sens === 'brutVersNet' ? centimesEnSaisie(saisie.periode === 'mensuel' ? ok.annuel.brutAnnuelCentimes : ok.brutCentimes) : null
    basculerPeriode(montantConverti)
  }
```

Passe à `<FormulaireSituation>` : `annuel={ok?.annuel ?? null}`, `brutMensuelCentimes={ok?.brutCentimes ?? null}`, `onBasculerPeriode={basculerLaPeriode}`.

- [ ] **Étape 6 : lancer les tests et constater le succès**

Commandes : `npx vitest run src/App.test.tsx`, puis `npm test`.
Attendu : SUCCÈS. Aucun test existant ne doit changer dans cette tâche.

- [ ] **Étape 7 : le statut de la spec**

Dans `docs/superpowers/specs/2026-09-28-vue-annuelle-design.md`, passe le statut de `en cours de rédaction` à `appliquée`. Le § 4.2 donne la composition du net comme « 12 mois, 13e mois et double pécule, nets » : aligne cet exemple sur le texte réellement affiché (« 12 mois, 13e mois, double pécule, nets »). Corrige toute autre phrase que l'implémentation aurait rendue inexacte, sans changer le fond.

- [ ] **Étape 8 : vérifier et commiter**

```bash
npm test && npm run typecheck && npm run lint && npm run build
git add src/components/formulaire/SectionSalaireFamille.tsx src/components/FormulaireSituation.tsx src/App.tsx src/i18n/fr.ts src/App.test.tsx docs/superpowers/specs/2026-09-28-vue-annuelle-design.md
git commit -m "$(cat <<'EOF'
feat: saisir le brut par mois ou par an

<ligne Co-Authored-By de ton rappel système>
EOF
)"
```

---

## Après la dernière tâche

- Relecture finale de toute la branche.
- Vérification visuelle par le contrôleur : le sélecteur « par mois / par an », la ligne d'équivalence, le récapitulatif, sur ordinateur et sur téléphone.
- **Ni push ni merge** sans demande explicite de l'utilisateur.
