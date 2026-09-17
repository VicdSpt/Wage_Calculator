# Avantages extralégaux (V2.2a) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** ajouter les titres-repas, l'indemnité de télétravail et les écochèques, pour afficher ce qui arrive réellement sur le compte, sans toucher au calcul du salaire.

**Architecture :** un module pur `avantages.ts` calcule la retenue, la valeur des titres, l'indemnité et les écochèques à partir des plafonds de la période. Un module d'assemblage `remuneration.ts` combine ce résultat avec `calculerNet` (net versé, total mensuel) et, en net → brut, décale la cible d'une constante avant d'appeler `calculerBrut`. `calculerNet` et `calculerBrut` ne changent pas, donc les 74 cas de référence et la preuve d'exactitude du net → brut restent valables.

**Tech Stack :** React 19, TypeScript 6 strict, Vite 8, Tailwind CSS 4, Vitest 4 + jsdom + React Testing Library, oxlint, Node 25.

**Spec :** `docs/superpowers/specs/2026-09-16-avantages-extralegaux-design.md`. La lire avant de commencer, surtout § 2 (sources et montants), § 3 (moteur), § 4 (saisie) et § 7 (tests). Les specs V1 et net → brut décrivent le calcul du salaire, qui ne change pas.

## Global Constraints

- Dossier : `E:\ALL DOCUMENTS\PROJECTS CODE\Wage_Calculator`. Commandes lancées depuis ce dossier, dans PowerShell.
- Branche : **`feat/avantages-extralegaux`** (à créer depuis `main` avant la tâche 1 si elle n'existe pas). **Ne jamais pousser ni merger** : l'utilisateur le fera à la fin.
- **Un commit par tâche**, en français (préfixe `feat:`, `test:`, `chore:` ou `docs:`), avec un message terminé par une ligne vide puis exactement `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Copier ce trailer mot pour mot, sans y mettre son propre nom de modèle.
- Chaque tâche se termine avec `npm test`, `npm run typecheck` et `npm run lint` au vert.
- **Fichiers en UTF-8 avec accents intacts (é, à, ’, « », →, —) et fins de ligne LF.** Avant chaque commit : `git ls-files --eol` doit montrer `w/lf` sur les fichiers touchés, et `git diff` des fichiers existants ne doit contenir que les hunks voulus.
- Moteur : **aucun** import de React, du DOM ou du navigateur dans `src/engine/`.
- Montants en **centimes entiers**. Les avantages ne font que des multiplications entières : aucun arrondi, jamais de `Math.round`.
- **Ne pas modifier** `calculerNet.ts`, `calculerBrut.ts`, `onss.ts`, `bonusEmploiSocial.ts`, `precompte.ts`, `cotisationSpeciale.ts`, `references.json`, `situations.ts`.
- Tous les textes affichés sont dans `src/i18n/fr.ts`.
- Clés localStorage : `wage-calculator:saisie:v3` (écriture) ; `v2` et `v1` (lecture seule, reprise). Tout accès protégé par `try/catch`.
- **Aucune nouvelle dépendance npm.**
- Plafonds ONSS 2026 : titres-repas part patronale 891 centimes, part travailleur 109, valeur faciale 1 000 ; télétravail 16 099 centimes (P2026-07) et 16 421 (P2026-09) ; écochèques 25 000 centimes par an.
- Date de test standard : `'2026-09-14'` (P2026-09) ; autre période : `'2026-08-31'` (P2026-07).

## Structure des fichiers

| Fichier | Responsabilité | Tâche |
|---|---|---|
| `src/engine/parametres/types.ts` | `ParametresAvantages` + champ `avantages` | 1 |
| `src/engine/parametres/p2026-07.ts`, `p2026-09.ts` | valeurs des plafonds | 1 |
| `src/engine/parametres/parametres.test.ts` | plafonds par période | 1 |
| `src/engine/__tests__/reculMax.json` | regénéré (l'empreinte des paramètres change) | 1 |
| `src/engine/avantages.ts` (+ `avantages.test.ts`) | calcul des avantages et des alertes | 2 |
| `src/engine/remuneration.ts` (+ `remuneration.test.ts`) | net versé, total, net → brut décalé | 3 |
| `src/engine/validation.ts` (+ test) | saisie des avantages, nouveaux codes d'erreur | 4 |
| `src/hooks/useSaisie.ts` (+ test) | clé v3, reprise v2 et v1 | 4 |
| `src/hooks/useCalcul.ts` (+ test) | `calculerRemuneration` / `calculerBrutDepuisNetVerse` | 4 |
| `src/i18n/fr.ts` | libellés, explications, alertes | 5 |
| `src/components/FormulaireSituation.tsx` | section « Avantages extralégaux » | 5 |
| `src/components/Recapitulatif.tsx` | net versé, avantages reçus, total, écochèques | 5 |
| `src/components/LigneCalcul.tsx`, `DetailCalcul.tsx` | trois lignes supplémentaires | 5 |
| `src/components/Avertissements.tsx` | alertes de dépassement | 5 |
| `src/App.tsx` (+ `App.test.tsx`) | câblage | 5 |
| `README.md` | documentation | 6 |

---

### Task 1 : Plafonds ONSS dans les paramètres

**Files:**
- Modify: `src/engine/parametres/types.ts`
- Modify: `src/engine/parametres/p2026-07.ts` (avant `rmmmgCentimes`)
- Modify: `src/engine/parametres/p2026-09.ts`
- Test: `src/engine/parametres/parametres.test.ts`
- Regenerate: `src/engine/__tests__/reculMax.json` (via `npm run verifier:recul`)

**Interfaces:**
- Consumes : `Parametres` (`src/engine/parametres/types.ts`), `PERIODES` et `getParametres` (`src/engine/parametres/index.ts`).
- Produces : `export interface ParametresAvantages { titresRepasPartPatronaleMaxCentimes: number; titresRepasPartTravailleurMinCentimes: number; titresRepasValeurFacialeMaxCentimes: number; teletravailMaxCentimes: number; ecochequesMaxAnnuelCentimes: number }` et le champ `avantages: ParametresAvantages` de `Parametres`.

- [ ] **Step 1 : Écrire les tests**

Ajouter à la fin de `src/engine/parametres/parametres.test.ts`, après le dernier `})` du fichier :

```ts
describe('plafonds des avantages extralégaux', () => {
  it.each([
    ['2026-08-31', 16_099],
    ['2026-09-01', 16_421],
    ['2026-12-31', 16_421],
  ])('le %s, le plafond mensuel de télétravail vaut %i centimes', (date, plafond) => {
    expect(getParametres(date).avantages.teletravailMaxCentimes).toBe(plafond)
  })

  it.each(PERIODES.map((p) => [p.id, p] as const))('%s : plafonds ONSS des titres-repas et des écochèques', (_id, periode) => {
    expect(periode.avantages).toMatchObject({
      titresRepasPartPatronaleMaxCentimes: 891,
      titresRepasPartTravailleurMinCentimes: 109,
      titresRepasValeurFacialeMaxCentimes: 1_000,
      ecochequesMaxAnnuelCentimes: 25_000,
    })
  })
})
```

- [ ] **Step 2 : Vérifier qu'ils échouent**

Run : `npx vitest run src/engine/parametres/parametres.test.ts`
Expected : FAIL — `avantages` n'existe pas sur `Parametres` (erreur de compilation TypeScript signalée par Vitest).

- [ ] **Step 3 : Déclarer le type**

Dans `src/engine/parametres/types.ts`, ajouter avant `export interface Parametres {` :

```ts
/** Plafonds des avantages extralégaux exonérés (spec avantages § 3.1). */
export interface ParametresAvantages {
  /** ONSS-TR : part patronale maximale par titre-repas. */
  titresRepasPartPatronaleMaxCentimes: number
  /** ONSS-TR : part minimale du travailleur par titre-repas. */
  titresRepasPartTravailleurMinCentimes: number
  /** ONSS-TR : valeur faciale maximale d'un titre-repas. */
  titresRepasValeurFacialeMaxCentimes: number
  /** ONSS-FR : indemnité forfaitaire de bureau maximale par mois. */
  teletravailMaxCentimes: number
  /** ONSS-EC : plafond annuel des écochèques. */
  ecochequesMaxAnnuelCentimes: number
}
```

puis, dans `Parametres`, ajouter après `cotisationSpeciale: Record<CategorieCotisation, readonly TrancheCotisation[]>` :

```ts
  avantages: ParametresAvantages
```

- [ ] **Step 4 : Renseigner P2026-07**

Dans `src/engine/parametres/p2026-07.ts`, ajouter juste avant la ligne de commentaire `// SECUREX-RMMMG (source secondaire), 18 ans et plus, à partir de juillet 2026` :

```ts
  // ONSS-TR : part patronale max 8,91 € (depuis le 01/01/2026), part du travailleur min 1,09 €,
  // valeur faciale max 10,00 €. ONSS-FR : indemnité de bureau 160,99 €/mois (01/03 → 31/08/2026).
  // ONSS-EC : écochèques 250,00 €/an.
  avantages: {
    titresRepasPartPatronaleMaxCentimes: 891,
    titresRepasPartTravailleurMinCentimes: 109,
    titresRepasValeurFacialeMaxCentimes: 1_000,
    teletravailMaxCentimes: 16_099,
    ecochequesMaxAnnuelCentimes: 25_000,
  },

```

- [ ] **Step 5 : Renseigner P2026-09**

Dans `src/engine/parametres/p2026-09.ts` :

1. Remplacer le commentaire du bloc :

```ts
/**
 * Règles du 01/09/2026 au 31/12/2026.
 * Seul le volet A du bonus à l'emploi change (ONSS-BE-2026/3 « à partir du 1er septembre 2026 »).
 */
```

par :

```ts
/**
 * Règles du 01/09/2026 au 31/12/2026.
 * Changent par rapport à juillet-août : le volet A du bonus à l'emploi
 * (ONSS-BE-2026/3 « à partir du 1er septembre 2026 ») et l'indemnité de bureau,
 * indexée à 164,21 €/mois (ONSS-FR).
 */
```

2. Ajouter, après le bloc `bonusEmploi: { … },` et avant l'accolade fermante de l'objet :

```ts
  avantages: { ...P2026_07.avantages, teletravailMaxCentimes: 16_421 },
```

- [ ] **Step 6 : Vérifier les tests de paramètres**

Run : `npx vitest run src/engine/parametres/parametres.test.ts`
Expected : PASS.

- [ ] **Step 7 : Regénérer la mesure du recul**

Le garde-fou compare une empreinte des paramètres : ajouter le bloc `avantages` la change, donc `src/engine/__tests__/reculMax.test.ts` échoue tant que l'outil n'a pas été relancé. C'est voulu.

Run : `npx vitest run src/engine/__tests__/reculMax.test.ts`
Expected : FAIL sur les empreintes, avec le message « relancez npm run verifier:recul ».

Run : `npm run verifier:recul`
Expected : environ 2 à 5 minutes (lancer en arrière-plan si l'outil shell plafonne), puis un `reculMax.json` regénéré. **Le recul doit rester `reculMaxCentimes: 514` à `brutCentimes: 109510` pour les deux périodes**, puisque `calculerNet` n'a pas changé. Si une valeur diffère : s'arrêter et signaler, sans modifier la marge.

- [ ] **Step 8 : Vérifier l'ensemble**

Run : `npm test; npm run typecheck; npm run lint`
Expected : tout au vert (434 tests existants + les nouveaux).

- [ ] **Step 9 : Commit**

```powershell
git add src/engine/parametres/types.ts src/engine/parametres/p2026-07.ts src/engine/parametres/p2026-09.ts src/engine/parametres/parametres.test.ts src/engine/__tests__/reculMax.json
git commit -m @'
feat: plafonds ONSS des avantages extralégaux par période

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
'@
```

---

### Task 2 : Moteur des avantages

**Files:**
- Create: `src/engine/avantages.ts`
- Test: `src/engine/avantages.test.ts`
- Modify: `docs/superpowers/specs/2026-09-16-avantages-extralegaux-design.md` (§ 3.2 : trois champs « par titre » ajoutés à `ResultatAvantages`)

**Interfaces:**
- Consumes : `Parametres` et son champ `avantages` (tâche 1) ; `getParametres` pour les tests.
- Produces :
  - `export interface AvantageTitresRepas { actif: boolean; joursPrestes: number; valeurFacialeCentimes: number; partTravailleurCentimes: number }`
  - `export interface Avantages { titresRepas: AvantageTitresRepas; teletravail: { actif: boolean; indemniteCentimes: number }; ecocheques: { actif: boolean; montantAnnuelCentimes: number } }`
  - `export const CODES_ALERTE_AVANTAGE` et `export type CodeAlerteAvantage`
  - `export interface ResultatAvantages { retenueTitresCentimes; valeurTitresCentimes; partPatronaleTitresCentimes; valeurFacialeParTitreCentimes; partTravailleurParTitreCentimes; partPatronaleParTitreCentimes; teletravailCentimes; ecochequesAnnuelCentimes; alertes: readonly CodeAlerteAvantage[] }` (tous `number` sauf `alertes`)
  - `export const AVANTAGES_AUCUN: Avantages`
  - `export function calculerAvantages(avantages: Avantages, parametres: Parametres): ResultatAvantages`

- [ ] **Step 1 : Écrire les tests**

Créer `src/engine/avantages.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { AVANTAGES_AUCUN, calculerAvantages, type Avantages } from './avantages'
import { getParametres } from './parametres'

const AOUT = getParametres('2026-08-31')   // télétravail plafonné à 160,99 €
const SEPT = getParametres('2026-09-14')   // télétravail plafonné à 164,21 €

function avantages(modif: Partial<Avantages>): Avantages {
  return { ...AVANTAGES_AUCUN, ...modif }
}

const TITRES_CONFORMES = {
  actif: true,
  joursPrestes: 20,
  valeurFacialeCentimes: 1_000,
  partTravailleurCentimes: 109,
}

describe('calculerAvantages — titres-repas', () => {
  it('calcule la retenue, la valeur et la part patronale', () => {
    const r = calculerAvantages(avantages({ titresRepas: TITRES_CONFORMES }), SEPT)
    expect(r).toMatchObject({
      retenueTitresCentimes: 2_180,
      valeurTitresCentimes: 20_000,
      partPatronaleTitresCentimes: 17_820,
      valeurFacialeParTitreCentimes: 1_000,
      partTravailleurParTitreCentimes: 109,
      partPatronaleParTitreCentimes: 891,
      alertes: [],
    })
  })

  it('donne zéro pour 0 jour presté', () => {
    const r = calculerAvantages(avantages({ titresRepas: { ...TITRES_CONFORMES, joursPrestes: 0 } }), SEPT)
    expect(r).toMatchObject({ retenueTitresCentimes: 0, valeurTitresCentimes: 0, partPatronaleTitresCentimes: 0, alertes: [] })
  })

  it('ignore complètement des titres-repas inactifs', () => {
    const r = calculerAvantages(avantages({ titresRepas: { ...TITRES_CONFORMES, actif: false } }), SEPT)
    expect(r).toMatchObject({
      retenueTitresCentimes: 0,
      valeurTitresCentimes: 0,
      partPatronaleTitresCentimes: 0,
      valeurFacialeParTitreCentimes: 0,
      partTravailleurParTitreCentimes: 0,
      partPatronaleParTitreCentimes: 0,
      alertes: [],
    })
  })

  it('accepte les valeurs limites exactes (8,91 € patronal, 1,09 € travailleur, 10,00 € faciaux)', () => {
    expect(calculerAvantages(avantages({ titresRepas: TITRES_CONFORMES }), SEPT).alertes).toEqual([])
  })

  it('alerte quand la part patronale dépasse et que la part du travailleur est trop faible', () => {
    const r = calculerAvantages(avantages({ titresRepas: { ...TITRES_CONFORMES, partTravailleurCentimes: 108 } }), SEPT)
    expect(r.partPatronaleParTitreCentimes).toBe(892)
    expect(r.alertes).toEqual(['partPatronaleTitres', 'partTravailleurTitres'])
  })

  it('alerte sur la valeur faciale au-delà de 10,00 €', () => {
    const r = calculerAvantages(
      avantages({ titresRepas: { ...TITRES_CONFORMES, valeurFacialeCentimes: 1_001, partTravailleurCentimes: 110 } }),
      SEPT,
    )
    expect(r.alertes).toEqual(['valeurFacialeTitres'])
  })
})

describe('calculerAvantages — télétravail', () => {
  it.each([
    [AOUT, 16_099, []],
    [AOUT, 16_100, ['teletravail']],
    [SEPT, 16_421, []],
    [SEPT, 16_422, ['teletravail']],
  ])('plafond de période : %#', (parametres, indemniteCentimes, attendues) => {
    const r = calculerAvantages(avantages({ teletravail: { actif: true, indemniteCentimes } }), parametres)
    expect(r.teletravailCentimes).toBe(indemniteCentimes)
    expect(r.alertes).toEqual(attendues)
  })

  it('16 100 centimes passent en septembre mais alertent en août', () => {
    expect(calculerAvantages(avantages({ teletravail: { actif: true, indemniteCentimes: 16_100 } }), SEPT).alertes).toEqual([])
  })

  it('ignore une indemnité inactive', () => {
    const r = calculerAvantages(avantages({ teletravail: { actif: false, indemniteCentimes: 99_999 } }), AOUT)
    expect(r.teletravailCentimes).toBe(0)
    expect(r.alertes).toEqual([])
  })
})

describe('calculerAvantages — écochèques', () => {
  it.each([
    [25_000, []],
    [25_001, ['ecocheques']],
  ])('%i centimes par an → %j', (montantAnnuelCentimes, attendues) => {
    const r = calculerAvantages(avantages({ ecocheques: { actif: true, montantAnnuelCentimes } }), SEPT)
    expect(r.ecochequesAnnuelCentimes).toBe(montantAnnuelCentimes)
    expect(r.alertes).toEqual(attendues)
  })

  it('ignore des écochèques inactifs', () => {
    const r = calculerAvantages(avantages({ ecocheques: { actif: false, montantAnnuelCentimes: 99_999 } }), SEPT)
    expect(r.ecochequesAnnuelCentimes).toBe(0)
    expect(r.alertes).toEqual([])
  })
})

describe('calculerAvantages — sans aucun avantage', () => {
  it('renvoie des zéros et aucune alerte', () => {
    expect(calculerAvantages(AVANTAGES_AUCUN, SEPT)).toEqual({
      retenueTitresCentimes: 0,
      valeurTitresCentimes: 0,
      partPatronaleTitresCentimes: 0,
      valeurFacialeParTitreCentimes: 0,
      partTravailleurParTitreCentimes: 0,
      partPatronaleParTitreCentimes: 0,
      teletravailCentimes: 0,
      ecochequesAnnuelCentimes: 0,
      alertes: [],
    })
  })

  it('donne les alertes dans un ordre stable', () => {
    const r = calculerAvantages(
      {
        titresRepas: { actif: true, joursPrestes: 20, valeurFacialeCentimes: 1_500, partTravailleurCentimes: 100 },
        teletravail: { actif: true, indemniteCentimes: 20_000 },
        ecocheques: { actif: true, montantAnnuelCentimes: 30_000 },
      },
      SEPT,
    )
    expect(r.alertes).toEqual(['partPatronaleTitres', 'partTravailleurTitres', 'valeurFacialeTitres', 'teletravail', 'ecocheques'])
  })
})
```

- [ ] **Step 2 : Vérifier qu'ils échouent**

Run : `npx vitest run src/engine/avantages.test.ts`
Expected : FAIL avec « Failed to resolve import "./avantages" ».

- [ ] **Step 3 : Implémenter**

Créer `src/engine/avantages.ts` :

```ts
import type { Parametres } from './parametres/types'

/** Titres-repas : un titre par jour effectivement presté (ONSS-TR). */
export interface AvantageTitresRepas {
  actif: boolean
  joursPrestes: number
  valeurFacialeCentimes: number
  partTravailleurCentimes: number
}

/** Avantages extralégaux saisis, déjà normalisés (spec avantages § 3.2). */
export interface Avantages {
  titresRepas: AvantageTitresRepas
  teletravail: { actif: boolean; indemniteCentimes: number }
  ecocheques: { actif: boolean; montantAnnuelCentimes: number }
}

/** Ordre d'affichage des alertes. */
export const CODES_ALERTE_AVANTAGE = [
  'partPatronaleTitres',
  'partTravailleurTitres',
  'valeurFacialeTitres',
  'teletravail',
  'ecocheques',
] as const

export type CodeAlerteAvantage = (typeof CODES_ALERTE_AVANTAGE)[number]

export interface ResultatAvantages {
  /** joursPrestes × part du travailleur : retenu sur le net. */
  retenueTitresCentimes: number
  /** joursPrestes × valeur faciale. */
  valeurTitresCentimes: number
  partPatronaleTitresCentimes: number
  /** Montants par titre, pour les messages d'alerte. 0 si les titres-repas sont inactifs. */
  valeurFacialeParTitreCentimes: number
  partTravailleurParTitreCentimes: number
  partPatronaleParTitreCentimes: number
  teletravailCentimes: number
  ecochequesAnnuelCentimes: number
  alertes: readonly CodeAlerteAvantage[]
}

export const AVANTAGES_AUCUN: Avantages = {
  titresRepas: { actif: false, joursPrestes: 0, valeurFacialeCentimes: 0, partTravailleurCentimes: 0 },
  teletravail: { actif: false, indemniteCentimes: 0 },
  ecocheques: { actif: false, montantAnnuelCentimes: 0 },
}

/**
 * Avantages exonérés d'ONSS et de précompte tant que les plafonds sont respectés.
 * Que des multiplications entières : aucun arrondi. Un dépassement produit une alerte,
 * jamais un recalcul : l'app ne modélise pas le basculement en salaire (spec § 1).
 */
export function calculerAvantages(avantages: Avantages, parametres: Parametres): ResultatAvantages {
  const plafonds = parametres.avantages
  const alertes: CodeAlerteAvantage[] = []

  const titres = avantages.titresRepas
  const valeurFacialeParTitreCentimes = titres.actif ? titres.valeurFacialeCentimes : 0
  const partTravailleurParTitreCentimes = titres.actif ? titres.partTravailleurCentimes : 0
  const partPatronaleParTitreCentimes = valeurFacialeParTitreCentimes - partTravailleurParTitreCentimes
  const valeurTitresCentimes = titres.actif ? titres.joursPrestes * valeurFacialeParTitreCentimes : 0
  const retenueTitresCentimes = titres.actif ? titres.joursPrestes * partTravailleurParTitreCentimes : 0

  if (titres.actif) {
    if (partPatronaleParTitreCentimes > plafonds.titresRepasPartPatronaleMaxCentimes) {
      alertes.push('partPatronaleTitres')
    }
    if (partTravailleurParTitreCentimes < plafonds.titresRepasPartTravailleurMinCentimes) {
      alertes.push('partTravailleurTitres')
    }
    if (valeurFacialeParTitreCentimes > plafonds.titresRepasValeurFacialeMaxCentimes) {
      alertes.push('valeurFacialeTitres')
    }
  }

  const teletravailCentimes = avantages.teletravail.actif ? avantages.teletravail.indemniteCentimes : 0
  if (teletravailCentimes > plafonds.teletravailMaxCentimes) {
    alertes.push('teletravail')
  }

  const ecochequesAnnuelCentimes = avantages.ecocheques.actif ? avantages.ecocheques.montantAnnuelCentimes : 0
  if (ecochequesAnnuelCentimes > plafonds.ecochequesMaxAnnuelCentimes) {
    alertes.push('ecocheques')
  }

  return {
    retenueTitresCentimes,
    valeurTitresCentimes,
    partPatronaleTitresCentimes: valeurTitresCentimes - retenueTitresCentimes,
    valeurFacialeParTitreCentimes,
    partTravailleurParTitreCentimes,
    partPatronaleParTitreCentimes: titres.actif ? partPatronaleParTitreCentimes : 0,
    teletravailCentimes,
    ecochequesAnnuelCentimes,
    alertes,
  }
}
```

- [ ] **Step 4 : Vérifier qu'ils passent**

Run : `npx vitest run src/engine/avantages.test.ts`
Expected : PASS.

- [ ] **Step 5 : Amender la spec**

Dans `docs/superpowers/specs/2026-09-16-avantages-extralegaux-design.md`, § 3.2, remplacer dans le bloc `ResultatAvantages` :

```ts
  /** valeurTitres − retenueTitres. */
  partPatronaleTitresCentimes: number
```

par :

```ts
  /** valeurTitres − retenueTitres. */
  partPatronaleTitresCentimes: number
  /** Montants par titre, repris dans les messages d'alerte. 0 si les titres-repas sont inactifs. */
  valeurFacialeParTitreCentimes: number
  partTravailleurParTitreCentimes: number
  partPatronaleParTitreCentimes: number
```

- [ ] **Step 6 : Vérifier l'ensemble**

Run : `npm test; npm run typecheck; npm run lint`
Expected : tout au vert.

- [ ] **Step 7 : Commit**

```powershell
git add src/engine/avantages.ts src/engine/avantages.test.ts docs/superpowers/specs/2026-09-16-avantages-extralegaux-design.md
git commit -m @'
feat: calcul des avantages extralégaux et de leurs alertes de plafond

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
'@
```

---

### Task 3 : Assemblage — net versé et net → brut

**Files:**
- Create: `src/engine/remuneration.ts`
- Test: `src/engine/remuneration.test.ts`

**Interfaces:**
- Consumes : `calculerAvantages`, `Avantages`, `ResultatAvantages`, `AVANTAGES_AUCUN` (tâche 2) ; `calculerNet(situation, dateIso): Resultat` ; `calculerBrut(famille, netCibleCentimes, dateIso): { netCibleCentimes; brutCentimes; resultat }` et `SituationFamiliale` (`src/engine/calculerBrut.ts`) ; `getParametres(dateIso)`.
- Produces :
  - `export interface ResultatComplet { resultat: Resultat; avantages: ResultatAvantages; netVerseCentimes: number; totalMensuelCentimes: number }`
  - `export interface ResultatInverseComplet { complet: ResultatComplet; brutCentimes: number; netVerseCibleCentimes: number }`
  - `export function calculerRemuneration(situation: Situation, avantages: Avantages, dateIso: string): ResultatComplet`
  - `export function calculerBrutDepuisNetVerse(famille: SituationFamiliale, avantages: Avantages, netVerseCibleCentimes: number, dateIso: string): ResultatInverseComplet`

- [ ] **Step 1 : Écrire les tests**

Créer `src/engine/remuneration.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { AVANTAGES_AUCUN, calculerAvantages, type Avantages } from './avantages'
import type { SituationFamiliale } from './calculerBrut'
import { calculerNet } from './calculerNet'
import { getParametres } from './parametres'
import { calculerBrutDepuisNetVerse, calculerRemuneration } from './remuneration'
import { NetHorsLimites, PeriodeNonCouverte, type Situation } from './types'

const SEPT = '2026-09-14'
const AOUT = '2026-08-31'

const ISOLE: SituationFamiliale = { etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false }
const ISOLE_3000: Situation = { ...ISOLE, brutMensuelCentimes: 300_000 }

const TITRES_ET_TELETRAVAIL: Avantages = {
  titresRepas: { actif: true, joursPrestes: 20, valeurFacialeCentimes: 1_000, partTravailleurCentimes: 109 },
  teletravail: { actif: true, indemniteCentimes: 16_099 },
  ecocheques: { actif: true, montantAnnuelCentimes: 25_000 },
}

/** net versé pour un brut donné : le net légal, moins la retenue des titres, plus l'indemnité. */
function netVerse(famille: SituationFamiliale, avantages: Avantages, brut: number, dateIso: string): number {
  const r = calculerAvantages(avantages, getParametres(dateIso))
  return calculerNet({ ...famille, brutMensuelCentimes: brut }, dateIso).netMensuelCentimes - r.retenueTitresCentimes + r.teletravailCentimes
}

/**
 * Oracle : on monte centime par centime depuis la plus petite valeur possible.
 * net(b) ≤ b, donc netVerse(b) ≤ b − retenue + télétravail : tout brut qui atteint la cible
 * est ≥ cible + retenue − télétravail.
 */
function brutOracleNetVerse(famille: SituationFamiliale, avantages: Avantages, cible: number, dateIso: string): number {
  const r = calculerAvantages(avantages, getParametres(dateIso))
  let brut = Math.max(1, cible + r.retenueTitresCentimes - r.teletravailCentimes)
  while (netVerse(famille, avantages, brut, dateIso) < cible) {
    brut++
  }
  return brut
}

describe('calculerRemuneration', () => {
  it('sans avantage, le net versé et le total valent le net légal', () => {
    const complet = calculerRemuneration(ISOLE_3000, AVANTAGES_AUCUN, SEPT)
    expect(complet.resultat).toEqual(calculerNet(ISOLE_3000, SEPT))
    expect(complet.netVerseCentimes).toBe(226_133)
    expect(complet.totalMensuelCentimes).toBe(226_133)
  })

  it('retire la retenue des titres et ajoute l’indemnité de télétravail', () => {
    const complet = calculerRemuneration(ISOLE_3000, TITRES_ET_TELETRAVAIL, SEPT)
    expect(complet.avantages.retenueTitresCentimes).toBe(2_180)
    expect(complet.netVerseCentimes).toBe(226_133 - 2_180 + 16_099)
    expect(complet.totalMensuelCentimes).toBe(226_133 - 2_180 + 16_099 + 20_000)
    expect(complet.avantages.ecochequesAnnuelCentimes).toBe(25_000)
  })

  it('ne touche pas au calcul du salaire', () => {
    expect(calculerRemuneration(ISOLE_3000, TITRES_ET_TELETRAVAIL, SEPT).resultat).toEqual(calculerNet(ISOLE_3000, SEPT))
  })

  it('lève PeriodeNonCouverte hors des périodes intégrées', () => {
    expect(() => calculerRemuneration(ISOLE_3000, AVANTAGES_AUCUN, '2027-01-15')).toThrow(PeriodeNonCouverte)
  })
})

describe('calculerBrutDepuisNetVerse', () => {
  const COMBINAISONS: ReadonlyArray<readonly [string, SituationFamiliale, Avantages]> = [
    ['isolé sans avantage', ISOLE, AVANTAGES_AUCUN],
    ['isolé avec titres et télétravail', ISOLE, TITRES_ET_TELETRAVAIL],
    [
      'marié 2 enfants, titres seuls',
      { etatCivil: 'marieOuCohabitant', revenusConjoint: 'superieurs', enfantsACharge: 2, parentIsole: false },
      { ...AVANTAGES_AUCUN, titresRepas: { actif: true, joursPrestes: 22, valeurFacialeCentimes: 800, partTravailleurCentimes: 109 } },
    ],
  ]

  it.each(COMBINAISONS.flatMap(([nom, famille, avantages]) => [AOUT, SEPT].map((date) => [`${nom} (${date})`, famille, avantages, date] as const)))(
    '%s : donne le plus petit brut dont le net versé atteint la cible',
    (_nom, famille, avantages, date) => {
      for (const cible of [150_000, 200_000, 226_133]) {
        const r = calculerBrutDepuisNetVerse(famille, avantages, cible, date)
        expect(r.brutCentimes).toBe(brutOracleNetVerse(famille, avantages, cible, date))
        expect(r.complet.netVerseCentimes).toBeGreaterThanOrEqual(cible)
        expect(r.netVerseCibleCentimes).toBe(cible)
      }
    },
  )

  it('ramène la cible à 1 centime quand l’indemnité dépasse à elle seule le net souhaité', () => {
    const teletravailSeul: Avantages = { ...AVANTAGES_AUCUN, teletravail: { actif: true, indemniteCentimes: 16_099 } }
    const r = calculerBrutDepuisNetVerse(ISOLE, teletravailSeul, 10_000, SEPT)
    expect(r.brutCentimes).toBe(1)
    expect(r.complet.netVerseCentimes).toBeGreaterThanOrEqual(10_000)
  })

  it('le résultat complet correspond au brut trouvé', () => {
    const r = calculerBrutDepuisNetVerse(ISOLE, TITRES_ET_TELETRAVAIL, 220_000, SEPT)
    expect(r.complet.resultat).toEqual(calculerNet({ ...ISOLE, brutMensuelCentimes: r.brutCentimes }, SEPT))
  })

  it('lève NetHorsLimites pour un net versé inatteignable', () => {
    expect(() => calculerBrutDepuisNetVerse(ISOLE, AVANTAGES_AUCUN, 5_000_000, SEPT)).toThrow(NetHorsLimites)
  })

  it('lève PeriodeNonCouverte hors des périodes intégrées', () => {
    expect(() => calculerBrutDepuisNetVerse(ISOLE, AVANTAGES_AUCUN, 200_000, '2027-01-15')).toThrow(PeriodeNonCouverte)
  })
})
```

- [ ] **Step 2 : Vérifier qu'ils échouent**

Run : `npx vitest run src/engine/remuneration.test.ts`
Expected : FAIL avec « Failed to resolve import "./remuneration" ».

- [ ] **Step 3 : Implémenter**

Créer `src/engine/remuneration.ts` :

```ts
import { calculerAvantages, type Avantages, type ResultatAvantages } from './avantages'
import { calculerBrut, type SituationFamiliale } from './calculerBrut'
import { calculerNet } from './calculerNet'
import { getParametres } from './parametres'
import type { Resultat, Situation } from './types'

export interface ResultatComplet {
  /** Le calcul du salaire, inchangé. */
  resultat: Resultat
  avantages: ResultatAvantages
  /** Net légal − retenue des titres-repas + indemnité de télétravail. */
  netVerseCentimes: number
  /** Net versé + valeur des titres-repas reçus. */
  totalMensuelCentimes: number
}

export interface ResultatInverseComplet {
  complet: ResultatComplet
  brutCentimes: number
  netVerseCibleCentimes: number
}

function assembler(resultat: Resultat, avantages: ResultatAvantages): ResultatComplet {
  const netVerseCentimes = resultat.netMensuelCentimes - avantages.retenueTitresCentimes + avantages.teletravailCentimes
  return {
    resultat,
    avantages,
    netVerseCentimes,
    totalMensuelCentimes: netVerseCentimes + avantages.valeurTitresCentimes,
  }
}

/** Brut → net, avantages compris. Lève PeriodeNonCouverte si la date n'est pas couverte. */
export function calculerRemuneration(situation: Situation, avantages: Avantages, dateIso: string): ResultatComplet {
  const resultatAvantages = calculerAvantages(avantages, getParametres(dateIso))
  return assembler(calculerNet(situation, dateIso), resultatAvantages)
}

/**
 * Net versé → brut. La retenue des titres-repas et l'indemnité de télétravail ne dépendent pas
 * du brut : il suffit de décaler la cible avant la recherche, qui reste celle de calculerBrut,
 * avec sa marge et sa preuve (spec net → brut § 3.2).
 *
 * Lève NetHorsLimites si le brut maximal n'atteint pas la cible, PeriodeNonCouverte si la date
 * n'est pas couverte.
 */
export function calculerBrutDepuisNetVerse(
  famille: SituationFamiliale,
  avantages: Avantages,
  netVerseCibleCentimes: number,
  dateIso: string,
): ResultatInverseComplet {
  const resultatAvantages = calculerAvantages(avantages, getParametres(dateIso))
  const decalage = resultatAvantages.retenueTitresCentimes - resultatAvantages.teletravailCentimes
  const cibleNetLegal = Math.max(1, netVerseCibleCentimes + decalage)
  const inverse = calculerBrut(famille, cibleNetLegal, dateIso)
  return {
    complet: assembler(inverse.resultat, resultatAvantages),
    brutCentimes: inverse.brutCentimes,
    netVerseCibleCentimes,
  }
}
```

- [ ] **Step 4 : Vérifier qu'ils passent**

Run : `npx vitest run src/engine/remuneration.test.ts`
Expected : PASS. Les tests avec oracle prennent quelques secondes.

- [ ] **Step 5 : Vérifier l'ensemble**

Run : `npm test; npm run typecheck; npm run lint`
Expected : tout au vert.

- [ ] **Step 6 : Commit**

```powershell
git add src/engine/remuneration.ts src/engine/remuneration.test.ts
git commit -m @'
feat: net versé, total mensuel et net versé → brut

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
'@
```

---

### Task 4 : Saisie des avantages, mémorisation v3 et états du calcul

**Files:**
- Modify: `src/engine/validation.ts` (réécriture complète)
- Test: `src/engine/validation.test.ts` (ajout d'un bloc `describe` et adaptation de deux attentes)
- Modify: `src/hooks/useSaisie.ts` (clé v3 et reprise v2)
- Test: `src/hooks/useSaisie.test.ts` (ajout d'un bloc `describe` et adaptation)
- Modify: `src/hooks/useCalcul.ts` (réécriture complète)
- Test: `src/hooks/useCalcul.test.ts` (ajout d'un bloc `describe`)

**Interfaces:**
- Consumes : `Avantages`, `AVANTAGES_AUCUN` (tâche 2) ; `calculerRemuneration`, `calculerBrutDepuisNetVerse`, `ResultatComplet` (tâche 3) ; `ParametresAvantages` (tâche 1).
- Produces :
  - `validation.ts` : `export interface SaisieAvantages { titresRepasActif: boolean; joursPrestes: string; valeurFaciale: string; partTravailleur: string; teletravailActif: boolean; teletravail: string; ecochequesActif: boolean; ecocheques: string }` ; `SaisieFormulaire.avantages: SaisieAvantages` ; `SAISIE_AVANTAGES_PAR_DEFAUT` ; `JOURS_PRESTES_MAX = 23` ; `CodeErreur` élargi ; `ErreursSaisie` élargi ; les deux variantes `ok` de `ResultatValidation` portent `avantages: Avantages`.
  - `useSaisie.ts` : `CLE_STOCKAGE = 'wage-calculator:saisie:v3'`, `CLE_STOCKAGE_V2`, `CLE_STOCKAGE_V1`.
  - `useCalcul.ts` : état `ok` avec `complet: ResultatComplet`, `resultat`, `brutCentimes`, `netCibleCentimes`, `avantagesActifs: boolean`, `plafondsAvantages: ParametresAvantages`, `rmmmgCentimes`.

- [ ] **Step 1 : Écrire les tests de validation**

Dans `src/engine/validation.test.ts` :

1. Ajouter en haut du fichier, après la ligne `import { describe, expect, it } from 'vitest'` :

```ts
import { AVANTAGES_AUCUN } from './avantages'
```

2. Remplacer le test « accepte la saisie par défaut (brut → net) » par :

```ts
  it('accepte la saisie par défaut (brut → net), sans aucun avantage', () => {
    expect(validerSaisie(SAISIE_PAR_DEFAUT)).toEqual({
      ok: true,
      sens: 'brutVersNet',
      situation: { brutMensuelCentimes: 300_000, ...ISOLE_SANS_ENFANT },
      avantages: AVANTAGES_AUCUN,
    })
  })
```

3. Remplacer le test « en net → brut, renvoie la situation familiale et le net cible » par :

```ts
  it('en net → brut, renvoie la situation familiale, le net cible et les avantages', () => {
    expect(validerSaisie(saisie({ sens: 'netVersBrut', montant: '2261,33' }))).toEqual({
      ok: true,
      sens: 'netVersBrut',
      famille: ISOLE_SANS_ENFANT,
      netCibleCentimes: 226_133,
      avantages: AVANTAGES_AUCUN,
    })
  })
```

4. Ajouter à la fin du fichier :

```ts
describe('validerSaisie — avantages extralégaux', () => {
  const TITRES_ACTIFS = { titresRepasActif: true, joursPrestes: '20', valeurFaciale: '10,00', partTravailleur: '1,09' }

  function avecAvantages(modif: Partial<SaisieFormulaire['avantages']>): SaisieFormulaire {
    return saisie({ avantages: { ...SAISIE_PAR_DEFAUT.avantages, ...modif } })
  }

  it('convertit les titres-repas actifs en centimes', () => {
    const r = validerSaisie(avecAvantages(TITRES_ACTIFS))
    expect(r.ok && r.avantages.titresRepas).toEqual({
      actif: true,
      joursPrestes: 20,
      valeurFacialeCentimes: 1_000,
      partTravailleurCentimes: 109,
    })
  })

  it('convertit le télétravail et les écochèques actifs', () => {
    const r = validerSaisie(avecAvantages({ teletravailActif: true, ecochequesActif: true }))
    expect(r.ok && r.avantages.teletravail).toEqual({ actif: true, indemniteCentimes: 16_099 })
    expect(r.ok && r.avantages.ecocheques).toEqual({ actif: true, montantAnnuelCentimes: 25_000 })
  })

  it('ne valide pas un avantage décoché, même avec des valeurs absurdes', () => {
    const r = validerSaisie(avecAvantages({ joursPrestes: 'abc', valeurFaciale: '', teletravail: '99999', ecocheques: 'x' }))
    expect(r.ok).toBe(true)
    expect(r.ok && r.avantages).toEqual(AVANTAGES_AUCUN)
  })

  it.each(['', '  ', 'abc', '-1', '24', '1,5'])('jours prestés « %s » → erreur', (joursPrestes) => {
    expect(validerSaisie(avecAvantages({ ...TITRES_ACTIFS, joursPrestes }))).toEqual({
      ok: false,
      erreurs: { joursPrestes: 'joursInvalide' },
    })
  })

  it.each(['0', '23'])('jours prestés « %s » acceptés', (joursPrestes) => {
    expect(validerSaisie(avecAvantages({ ...TITRES_ACTIFS, joursPrestes })).ok).toBe(true)
  })

  it.each(['', 'abc', '0', '20,01'])('valeur faciale « %s » → erreur', (valeurFaciale) => {
    expect(validerSaisie(avecAvantages({ ...TITRES_ACTIFS, valeurFaciale }))).toEqual({
      ok: false,
      erreurs: { valeurFaciale: 'valeurFacialeInvalide' },
    })
  })

  it.each(['', 'abc', '20,01'])('part du travailleur « %s » → erreur de format', (partTravailleur) => {
    expect(validerSaisie(avecAvantages({ ...TITRES_ACTIFS, partTravailleur }))).toEqual({
      ok: false,
      erreurs: { partTravailleur: 'partTravailleurInvalide' },
    })
  })

  it('refuse une part du travailleur supérieure à la valeur faciale', () => {
    expect(validerSaisie(avecAvantages({ ...TITRES_ACTIFS, valeurFaciale: '5,00', partTravailleur: '5,01' }))).toEqual({
      ok: false,
      erreurs: { partTravailleur: 'partTravailleurSuperieure' },
    })
  })

  it('accepte une part du travailleur nulle ou égale à la valeur faciale', () => {
    expect(validerSaisie(avecAvantages({ ...TITRES_ACTIFS, partTravailleur: '0' })).ok).toBe(true)
    expect(validerSaisie(avecAvantages({ ...TITRES_ACTIFS, valeurFaciale: '5,00', partTravailleur: '5,00' })).ok).toBe(true)
  })

  it.each(['', 'abc', '1000,01'])('indemnité de télétravail « %s » → erreur', (teletravail) => {
    expect(validerSaisie(avecAvantages({ teletravailActif: true, teletravail }))).toEqual({
      ok: false,
      erreurs: { teletravail: 'teletravailInvalide' },
    })
  })

  it.each(['', 'abc', '2000,01'])('écochèques « %s » → erreur', (ecocheques) => {
    expect(validerSaisie(avecAvantages({ ecochequesActif: true, ecocheques }))).toEqual({
      ok: false,
      erreurs: { ecocheques: 'ecochequesInvalide' },
    })
  })

  it('accepte un dépassement de plafond officiel : c’est une alerte, pas une erreur', () => {
    const r = validerSaisie(avecAvantages({ teletravailActif: true, teletravail: '500,00' }))
    expect(r.ok && r.avantages.teletravail.indemniteCentimes).toBe(50_000)
  })

  it('signale une erreur de montant et une erreur d’avantage en même temps', () => {
    expect(validerSaisie({ ...avecAvantages({ ...TITRES_ACTIFS, joursPrestes: '99' }), montant: '' })).toEqual({
      ok: false,
      erreurs: { montant: 'montantVide', joursPrestes: 'joursInvalide' },
    })
  })
})
```

- [ ] **Step 2 : Écrire les tests de mémorisation**

Dans `src/hooks/useSaisie.test.ts` :

1. Remplacer la ligne d'import de `./useSaisie` par :

```ts
import { CLE_STOCKAGE, CLE_STOCKAGE_V1, CLE_STOCKAGE_V2, lireSaisieStockee, useSaisie } from './useSaisie'
```

2. Remplacer le test des clés par :

```ts
  it('utilise la clé v3 en écriture, v2 et v1 en reprise', () => {
    expect(CLE_STOCKAGE).toBe('wage-calculator:saisie:v3')
    expect(CLE_STOCKAGE_V2).toBe('wage-calculator:saisie:v2')
    expect(CLE_STOCKAGE_V1).toBe('wage-calculator:saisie:v1')
  })
```

3. Dans le test « reprend une saisie v1 en brut → net », ajouter dans l'objet attendu, après `montantAvantBascule: null,` :

```ts
      avantages: SAISIE_PAR_DEFAUT.avantages,
```

4. Ajouter à la fin du fichier :

```ts
describe('lireSaisieStockee — reprise de la clé v2', () => {
  const V2 = {
    sens: 'netVersBrut',
    montant: '2500',
    montantAvantBascule: '3000',
    etatCivil: 'isole',
    revenusConjoint: 'aucun',
    enfantsACharge: '1',
    parentIsole: true,
  }

  it('reprend une saisie v2 en ajoutant les avantages par défaut', () => {
    localStorage.setItem(CLE_STOCKAGE_V2, JSON.stringify(V2))
    expect(lireSaisieStockee()).toEqual({ ...V2, avantages: SAISIE_PAR_DEFAUT.avantages })
  })

  it('préfère la clé v3 à la clé v2', () => {
    localStorage.setItem(CLE_STOCKAGE_V2, JSON.stringify(V2))
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, montant: '4200' }))
    expect(lireSaisieStockee().montant).toBe('4200')
  })

  it('ignore une saisie v3 dont le bloc avantages est invalide', () => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, avantages: { titresRepasActif: 'oui' } }))
    expect(lireSaisieStockee()).toEqual(SAISIE_PAR_DEFAUT)
  })

  it('ne réécrit pas la clé v2', () => {
    localStorage.setItem(CLE_STOCKAGE_V2, JSON.stringify(V2))
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.modifier('montant', '4200'))
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE_V2) ?? '{}')).toEqual(V2)
  })
})
```

- [ ] **Step 3 : Écrire les tests des états du calcul**

Ajouter à la fin de `src/hooks/useCalcul.test.ts` :

```ts
describe('calculerEtat — avantages extralégaux', () => {
  const AVEC_TITRES = {
    ...SAISIE_PAR_DEFAUT.avantages,
    titresRepasActif: true,
    teletravailActif: true,
  }

  it('brut → net : expose le résultat complet et les plafonds de la période', () => {
    const etat = calculerEtat(saisie({ avantages: AVEC_TITRES }), DATE)
    expect(etat.etat).toBe('ok')
    if (etat.etat !== 'ok') return
    expect(etat.avantagesActifs).toBe(true)
    expect(etat.complet.netVerseCentimes).toBe(226_133 - 2_180 + 16_099)
    expect(etat.complet.totalMensuelCentimes).toBe(226_133 - 2_180 + 16_099 + 20_000)
    expect(etat.plafondsAvantages.teletravailMaxCentimes).toBe(16_421)
  })

  it('sans avantage, avantagesActifs vaut false et le net versé égale le net légal', () => {
    const etat = calculerEtat(SAISIE_PAR_DEFAUT, DATE)
    expect(etat.etat === 'ok' && etat.avantagesActifs).toBe(false)
    expect(etat.etat === 'ok' && etat.complet.netVerseCentimes).toBe(226_133)
  })

  it('net → brut : la cible est le net versé', () => {
    const etat = calculerEtat(saisie({ sens: 'netVersBrut', montant: '2400,52', avantages: AVEC_TITRES }), DATE)
    expect(etat.etat).toBe('ok')
    if (etat.etat !== 'ok') return
    expect(etat.netCibleCentimes).toBe(240_052)
    expect(etat.complet.netVerseCentimes).toBeGreaterThanOrEqual(240_052)
    expect(etat.brutCentimes).toBe(299_996)
  })

  it('renvoie les erreurs des champs d’avantage', () => {
    const etat = calculerEtat(saisie({ avantages: { ...AVEC_TITRES, joursPrestes: '99' } }), DATE)
    expect(etat).toEqual({ etat: 'saisieInvalide', erreurs: { joursPrestes: 'joursInvalide' } })
  })
})
```

- [ ] **Step 4 : Vérifier qu'ils échouent**

Run : `npx vitest run src/engine/validation.test.ts src/hooks/useSaisie.test.ts src/hooks/useCalcul.test.ts`
Expected : FAIL — `SAISIE_PAR_DEFAUT.avantages`, `CLE_STOCKAGE_V2`, `etat.complet` et `etat.plafondsAvantages` n'existent pas.

- [ ] **Step 5 : Réécrire la validation**

Remplacer tout le contenu de `src/engine/validation.ts` par :

```ts
import { eurosTexteEnCentimes } from './argent'
import { AVANTAGES_AUCUN, type Avantages } from './avantages'
import type { SituationFamiliale } from './calculerBrut'
import { BRUT_MAX_CENTIMES, type EtatCivil, type RevenusConjoint, type Situation } from './types'

export const SENS_CALCUL = ['brutVersNet', 'netVersBrut'] as const

/** Sens du calcul : du brut saisi vers le net, ou du net souhaité vers le brut. */
export type SensCalcul = (typeof SENS_CALCUL)[number]

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
}

/** Valeurs brutes du formulaire, telles que tapées. */
export interface SaisieFormulaire {
  sens: SensCalcul
  /** Brut ou net versé mensuel selon le sens. */
  montant: string
  /** Montant quitté lors de la dernière bascule, tant que rien n'a été modifié (spec net → brut § 4.3). */
  montantAvantBascule: string | null
  etatCivil: EtatCivil
  /** Conservé même si isolé, pour retrouver le choix si on rebascule. */
  revenusConjoint: RevenusConjoint
  enfantsACharge: string
  parentIsole: boolean
  avantages: SaisieAvantages
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

export interface ErreursSaisie {
  montant?: CodeErreur
  enfantsACharge?: CodeErreur
  joursPrestes?: CodeErreur
  valeurFaciale?: CodeErreur
  partTravailleur?: CodeErreur
  teletravail?: CodeErreur
  ecocheques?: CodeErreur
}

export type ResultatValidation =
  | { ok: true; sens: 'brutVersNet'; situation: Situation; avantages: Avantages }
  | { ok: true; sens: 'netVersBrut'; famille: SituationFamiliale; netCibleCentimes: number; avantages: Avantages }
  | { ok: false; erreurs: ErreursSaisie }

export const ENFANTS_MAX = 10
export const JOURS_PRESTES_MAX = 23
/** Bornes de saisie, larges : le dépassement des plafonds officiels est une alerte, pas une erreur. */
const TITRE_MAX_CENTIMES = 2_000
const TELETRAVAIL_MAX_CENTIMES = 100_000
const ECOCHEQUES_MAX_CENTIMES = 200_000

export const SAISIE_AVANTAGES_PAR_DEFAUT: SaisieAvantages = {
  titresRepasActif: false,
  joursPrestes: '20',
  valeurFaciale: '10,00',
  partTravailleur: '1,09',
  teletravailActif: false,
  teletravail: '160,99',
  ecochequesActif: false,
  ecocheques: '250,00',
}

export const SAISIE_PAR_DEFAUT: SaisieFormulaire = {
  sens: 'brutVersNet',
  montant: '3000',
  montantAvantBascule: null,
  etatCivil: 'isole',
  revenusConjoint: 'aucun',
  enfantsACharge: '0',
  parentIsole: false,
  avantages: SAISIE_AVANTAGES_PAR_DEFAUT,
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

  return avantages
}

/** Transforme la saisie en données normalisées pour le moteur, ou renvoie les erreurs par champ. */
export function validerSaisie(saisie: SaisieFormulaire): ResultatValidation {
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

  const avantages = validerAvantages(saisie.avantages, erreurs)

  if (montant === null || Object.keys(erreurs).length > 0) {
    return { ok: false, erreurs }
  }

  const isole = saisie.etatCivil === 'isole'
  const famille: SituationFamiliale = {
    etatCivil: saisie.etatCivil,
    revenusConjoint: isole ? null : saisie.revenusConjoint,
    enfantsACharge: enfants,
    parentIsole: isole && enfants > 0 && saisie.parentIsole,
  }

  if (saisie.sens === 'netVersBrut') {
    return { ok: true, sens: 'netVersBrut', famille, netCibleCentimes: montant, avantages }
  }
  return { ok: true, sens: 'brutVersNet', situation: { brutMensuelCentimes: montant, ...famille }, avantages }
}
```

- [ ] **Step 6 : Adapter la mémorisation**

Dans `src/hooks/useSaisie.ts` :

1. Remplacer la ligne d'import de `../engine/validation` par :

```ts
import { SAISIE_AVANTAGES_PAR_DEFAUT, SAISIE_PAR_DEFAUT, SENS_CALCUL, type SaisieAvantages, type SaisieFormulaire } from '../engine/validation'
```

2. Remplacer les deux constantes de clés :

```ts
export const CLE_STOCKAGE = 'wage-calculator:saisie:v2'
/** Format de la V1 (brut → net uniquement) : lu une fois pour reprendre la saisie, jamais réécrit. */
export const CLE_STOCKAGE_V1 = 'wage-calculator:saisie:v1'
```

par :

```ts
export const CLE_STOCKAGE = 'wage-calculator:saisie:v3'
/** Format V2 (sans avantages) : lu pour reprendre la saisie, jamais réécrit. */
export const CLE_STOCKAGE_V2 = 'wage-calculator:saisie:v2'
/** Format V1 (brut → net uniquement) : lu pour reprendre la saisie, jamais réécrit. */
export const CLE_STOCKAGE_V1 = 'wage-calculator:saisie:v1'
```

3. Ajouter, après la fonction `aSituationFamiliale` :

```ts
function estSaisieAvantages(valeur: unknown): valeur is SaisieAvantages {
  if (!estObjet(valeur)) {
    return false
  }
  const booleens = ['titresRepasActif', 'teletravailActif', 'ecochequesActif'] as const
  const chaines = ['joursPrestes', 'valeurFaciale', 'partTravailleur', 'teletravail', 'ecocheques'] as const
  return booleens.every((champ) => typeof valeur[champ] === 'boolean') && chaines.every((champ) => typeof valeur[champ] === 'string')
}

/** Saisie V2 (sans avantages) : les champs communs à V2 et V3. */
function estSaisieV2(valeur: unknown): valeur is Omit<SaisieFormulaire, 'avantages'> {
  return (
    estObjet(valeur) &&
    aSituationFamiliale(valeur) &&
    typeof valeur.sens === 'string' &&
    (SENS_CALCUL as readonly string[]).includes(valeur.sens) &&
    typeof valeur.montant === 'string' &&
    (valeur.montantAvantBascule === null || typeof valeur.montantAvantBascule === 'string')
  )
}
```

4. Remplacer la fonction `estSaisie` par :

```ts
function estSaisie(valeur: unknown): valeur is SaisieFormulaire {
  return estSaisieV2(valeur) && estSaisieAvantages((valeur as Objet).avantages)
}
```

5. Dans `repriseV1`, ajouter dans l'objet renvoyé, après `parentIsole: v1.parentIsole,` :

```ts
    avantages: SAISIE_AVANTAGES_PAR_DEFAUT,
```

6. Remplacer la fonction `lireSaisieStockee` par :

```ts
/** Saisie mémorisée (v3, sinon reprise v2, sinon v1), ou saisie par défaut. */
export function lireSaisieStockee(): SaisieFormulaire {
  const v3 = lireCle(CLE_STOCKAGE)
  if (estSaisie(v3)) {
    return v3
  }
  const v2 = lireCle(CLE_STOCKAGE_V2)
  if (estSaisieV2(v2)) {
    return { ...v2, avantages: SAISIE_AVANTAGES_PAR_DEFAUT }
  }
  return repriseV1(lireCle(CLE_STOCKAGE_V1)) ?? SAISIE_PAR_DEFAUT
}
```

- [ ] **Step 7 : Réécrire les états du calcul**

Remplacer tout le contenu de `src/hooks/useCalcul.ts` par :

```ts
import { useMemo } from 'react'
import { getParametres } from '../engine/parametres'
import type { ParametresAvantages } from '../engine/parametres/types'
import { calculerBrutDepuisNetVerse, calculerRemuneration, type ResultatComplet } from '../engine/remuneration'
import { NetHorsLimites, PeriodeNonCouverte, type Resultat } from '../engine/types'
import { validerSaisie, type ErreursSaisie, type SaisieFormulaire, type SensCalcul } from '../engine/validation'

export type EtatCalcul =
  | {
      etat: 'ok'
      sens: SensCalcul
      complet: ResultatComplet
      /** Raccourci vers complet.resultat, pour les composants. */
      resultat: Resultat
      brutCentimes: number
      /** Net versé souhaité en net → brut, sinon null. */
      netCibleCentimes: number | null
      avantagesActifs: boolean
      plafondsAvantages: ParametresAvantages
      rmmmgCentimes: number
    }
  | { etat: 'saisieInvalide'; erreurs: ErreursSaisie }
  | { etat: 'netHorsLimites'; netMaxCentimes: number }
  | { etat: 'periodeNonCouverte'; dateIso: string }

export function calculerEtat(saisie: SaisieFormulaire, dateIso: string): EtatCalcul {
  const validation = validerSaisie(saisie)
  if (!validation.ok) {
    return { etat: 'saisieInvalide', erreurs: validation.erreurs }
  }
  const { avantages } = validation
  const avantagesActifs = avantages.titresRepas.actif || avantages.teletravail.actif || avantages.ecocheques.actif
  try {
    const parametres = getParametres(dateIso)
    if (validation.sens === 'netVersBrut') {
      const inverse = calculerBrutDepuisNetVerse(validation.famille, avantages, validation.netCibleCentimes, dateIso)
      return {
        etat: 'ok',
        sens: 'netVersBrut',
        complet: inverse.complet,
        resultat: inverse.complet.resultat,
        brutCentimes: inverse.brutCentimes,
        netCibleCentimes: inverse.netVerseCibleCentimes,
        avantagesActifs,
        plafondsAvantages: parametres.avantages,
        rmmmgCentimes: parametres.rmmmgCentimes,
      }
    }
    const complet = calculerRemuneration(validation.situation, avantages, dateIso)
    return {
      etat: 'ok',
      sens: 'brutVersNet',
      complet,
      resultat: complet.resultat,
      brutCentimes: validation.situation.brutMensuelCentimes,
      netCibleCentimes: null,
      avantagesActifs,
      plafondsAvantages: parametres.avantages,
      rmmmgCentimes: parametres.rmmmgCentimes,
    }
  } catch (erreur) {
    if (erreur instanceof PeriodeNonCouverte) {
      return { etat: 'periodeNonCouverte', dateIso }
    }
    if (erreur instanceof NetHorsLimites) {
      return { etat: 'netHorsLimites', netMaxCentimes: erreur.netMaxCentimes }
    }
    throw erreur
  }
}

export function useCalcul(saisie: SaisieFormulaire, dateIso: string): EtatCalcul {
  return useMemo(() => calculerEtat(saisie, dateIso), [saisie, dateIso])
}
```

- [ ] **Step 8 : Vérifier qu'ils passent**

Run : `npm test; npm run typecheck; npm run lint`
Expected : tout au vert. Les tests d'interface existants passent sans modification : aucun texte visible ne change encore.

- [ ] **Step 9 : Commit**

```powershell
git add src/engine/validation.ts src/engine/validation.test.ts src/hooks/useSaisie.ts src/hooks/useSaisie.test.ts src/hooks/useCalcul.ts src/hooks/useCalcul.test.ts
git commit -m @'
feat: saisie des avantages, mémorisation v3 et états du calcul complets

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
'@
```

---

### Task 5 : Interface des avantages

**Files:**
- Modify: `src/i18n/fr.ts`
- Modify: `src/components/FormulaireSituation.tsx`
- Modify: `src/components/LigneCalcul.tsx` (réécriture complète)
- Modify: `src/components/DetailCalcul.tsx` (réécriture complète)
- Modify: `src/components/Recapitulatif.tsx` (réécriture complète)
- Modify: `src/components/Avertissements.tsx` (réécriture complète)
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx` (ajout d'un bloc `describe`)

**Interfaces:**
- Consumes : `EtatCalcul` avec `complet`, `avantagesActifs`, `plafondsAvantages` (tâche 4) ; `ResultatComplet` (tâche 3) ; `CodeAlerteAvantage` (tâche 2) ; `SaisieFormulaire.avantages` (tâche 4).
- Produces :
  - `LigneCalcul` props : `{ libelle: string; explication: string; sens: '+' | '-' | '='; montantCentimes: number; source: string }`.
  - `DetailCalcul` props : `{ sens: SensCalcul; complet: ResultatComplet | null }`.
  - `Recapitulatif` props : `{ sens: SensCalcul; complet: ResultatComplet | null; brutCentimes: number | null; netCibleCentimes: number | null; avantagesActifs: boolean }`.
  - `FormulaireSituation` props : celles d'aujourd'hui, plus `plafondTeletravailCentimes: number | null` et `plafondEcochequesCentimes: number | null`.

- [ ] **Step 1 : Écrire les tests d'interface**

Ajouter à la fin de `src/App.test.tsx` :

```ts
describe('App — avantages extralégaux', () => {
  const recapNet = () => screen.getByRole('region', { name: 'Votre salaire net' })
  const recapBrut = () => screen.getByRole('region', { name: 'Votre salaire brut' })
  const detail = () => screen.getByRole('region', { name: 'Détail du calcul' })

  it('n’affiche les champs d’un avantage qu’une fois coché', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    expect(screen.queryByLabelText('Jours prestés dans le mois')).not.toBeInTheDocument()
    await user.click(screen.getByLabelText('Titres-repas'))
    expect(screen.getByLabelText('Jours prestés dans le mois')).toHaveValue('20')
    expect(screen.getByLabelText('Valeur faciale du titre (€)')).toHaveValue('10,00')
    expect(screen.getByLabelText('Part du travailleur (€)')).toHaveValue('1,09')
  })

  it('déduit la part personnelle des titres-repas du net versé', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Titres-repas'))
    expect(within(recapNet()).getByText(euros(226_133 - 2_180))).toBeInTheDocument()
    expect(within(recapNet()).getByText(euros(20_000))).toBeInTheDocument()
    expect(within(recapNet()).getByText(euros(226_133 - 2_180 + 20_000))).toBeInTheDocument()
  })

  it('ajoute l’indemnité de télétravail et affiche le plafond de la période', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Indemnité de télétravail'))
    expect(screen.getByText(`Plafond ONSS : ${euros(16_421)}`)).toBeInTheDocument()
    expect(within(recapNet()).getByText(euros(226_133 + 16_099))).toBeInTheDocument()
  })

  it('affiche les écochèques en annuel, hors du total mensuel', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Écochèques'))
    expect(within(recapNet()).getByText(`${euros(25_000)} par an`)).toBeInTheDocument()
    expect(within(recapNet()).getByText(euros(226_133))).toBeInTheDocument()
  })

  it('ajoute les lignes d’avantages au détail du calcul', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Titres-repas'))
    expect(within(detail()).getByText('Part personnelle des titres-repas')).toBeInTheDocument()
    expect(within(detail()).getByText('Net versé')).toBeInTheDocument()
    expect(within(detail()).getByText(euros(2_180))).toBeInTheDocument()
  })

  it('alerte quand la part patronale dépasse le plafond', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Titres-repas'))
    const part = screen.getByLabelText('Part du travailleur (€)')
    await user.clear(part)
    await user.type(part, '0,50')
    expect(screen.getByText(/Part patronale de/)).toHaveTextContent(euros(950))
  })

  it('refuse un nombre de jours invalide', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Titres-repas'))
    const jours = screen.getByLabelText('Jours prestés dans le mois')
    await user.clear(jours)
    await user.type(jours, '99')
    expect(screen.getByText('Indiquez un nombre entier de jours entre 0 et 23.')).toBeInTheDocument()
    expect(within(detail()).getByText('—')).toBeInTheDocument()
  })

  it('net → brut : la cible est le net versé sur le compte', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Titres-repas'))
    await user.click(screen.getByRole('radio', { name: 'Net → brut' }))
    const net = screen.getByLabelText('Salaire net mensuel souhaité (€)')
    await user.clear(net)
    await user.type(net, '2239,53')
    expect(within(recapBrut()).getByText(euros(299_996))).toBeInTheDocument()
  })

  it('restaure les avantages mémorisés', () => {
    localStorage.setItem(
      CLE_STOCKAGE,
      JSON.stringify({ ...SAISIE_PAR_DEFAUT, avantages: { ...SAISIE_PAR_DEFAUT.avantages, titresRepasActif: true, joursPrestes: '18' } }),
    )
    render(<App dateIso={DATE} />)
    expect(screen.getByLabelText('Jours prestés dans le mois')).toHaveValue('18')
  })
})
```

- [ ] **Step 2 : Vérifier qu'ils échouent**

Run : `npx vitest run src/App.test.tsx`
Expected : FAIL sur les nouveaux tests, avec « Unable to find a label with the text of: Titres-repas ». Les tests existants restent verts.

- [ ] **Step 3 : Ajouter les textes**

Dans `src/i18n/fr.ts` :

1. Remplacer la ligne d'import :

```ts
import type { CodeErreur, SensCalcul } from '../engine/validation'
```

par :

```ts
import type { CodeAlerteAvantage } from '../engine/avantages'
import type { CodeErreur, SensCalcul } from '../engine/validation'
```

2. Dans `formulaire`, après la ligne `parentIsole: …`, ajouter :

```ts
    avantages: {
      titre: 'Avantages extralégaux',
      titresRepas: 'Titres-repas',
      joursPrestes: 'Jours prestés dans le mois',
      valeurFaciale: 'Valeur faciale du titre (€)',
      partTravailleur: 'Part du travailleur (€)',
      teletravail: 'Indemnité de télétravail',
      teletravailMontant: 'Montant mensuel (€)',
      ecocheques: 'Écochèques',
      ecochequesMontant: 'Montant annuel (€)',
      plafond: (montant: string) => `Plafond ONSS : ${montant}`,
      plafondAnnuel: (montant: string) => `Plafond ONSS : ${montant} par an`,
    },
```

3. Dans `erreurs`, avant l'accolade fermante du bloc (juste après `enfantsInvalide: …`), ajouter :

```ts
    joursInvalide: 'Indiquez un nombre entier de jours entre 0 et 23.',
    valeurFacialeInvalide: 'Indiquez un montant entre 0,01 € et 20,00 €.',
    partTravailleurInvalide: 'Indiquez un montant entre 0,00 € et 20,00 €.',
    partTravailleurSuperieure: 'La part du travailleur ne peut pas dépasser la valeur faciale du titre.',
    teletravailInvalide: 'Indiquez un montant entre 0,00 € et 1 000,00 €.',
    ecochequesInvalide: 'Indiquez un montant entre 0,00 € et 2 000,00 €.',
```

4. Après le bloc `lignes: { … } satisfies …,`, ajouter :

```ts
  lignesAvantages: {
    retenueTitres: {
      libelle: 'Part personnelle des titres-repas',
      explication: 'Votre part dans les titres-repas, retenue sur le net. Elle est d’au moins 1,09 € par titre.',
      source: 'ONSS — titres-repas',
    },
    teletravail: {
      libelle: 'Indemnité de télétravail',
      explication:
        'Forfait de frais propres à l’employeur, versé avec le salaire. Ni imposé ni soumis à l’ONSS tant qu’il reste sous le plafond mensuel.',
      source: 'ONSS — frais propres à l’employeur',
    },
    netVerse: {
      libelle: 'Net versé',
      explication:
        'Ce qui arrive réellement sur votre compte : le net du salaire, moins votre part dans les titres-repas, plus l’indemnité de télétravail.',
      source: 'Net − part personnelle des titres-repas + indemnité de télétravail',
    },
  },
```

5. Dans `recapitulatif`, avant l'accolade fermante du bloc, ajouter :

```ts
    netVerse: 'Net versé sur le compte',
    detailNetVerse: (net: string, retenue: string, teletravail: string) =>
      [`net légal ${net}`, retenue, teletravail].filter((partie) => partie !== '').join(' '),
    retenueTitres: (montant: string) => `− ${montant} de titres-repas`,
    plusTeletravail: (montant: string) => `+ ${montant} de télétravail`,
    avantagesRecus: 'Avantages reçus',
    titresRecus: (nombre: number, valeur: string) => `${nombre} titres-repas de ${valeur}`,
    totalMensuel: 'Total mensuel',
    ecocheques: 'Écochèques',
    parAn: (montant: string) => `${montant} par an`,
```

6. Dans `alertes`, avant l'accolade fermante du bloc, ajouter :

```ts
    conditionsAvantages:
      'Les avantages sont supposés conformes aux conditions d’exonération (convention collective, un titre par jour presté, télétravail structurel).',
    avantages: {
      partPatronaleTitres: (montant: string, plafond: string) =>
        `Part patronale de ${montant} : au-delà de ${plafond}, le titre-repas devient du salaire soumis à l’ONSS et à l’impôt. Le calcul ne tient pas compte de ce basculement.`,
      partTravailleurTitres: (montant: string, plancher: string) =>
        `Part du travailleur de ${montant} : en dessous de ${plancher}, le titre-repas devient du salaire.`,
      valeurFacialeTitres: (montant: string, plafond: string) =>
        `Valeur faciale de ${montant} : au-delà de ${plafond}, le titre-repas devient du salaire.`,
      teletravail: (montant: string, plafond: string) =>
        `Indemnité de ${montant} : au-delà de ${plafond} par mois, l’excédent est soumis à l’ONSS et à l’impôt.`,
      ecocheques: (montant: string, plafond: string) =>
        `Écochèques de ${montant} par an : au-delà de ${plafond} par an, l’excédent devient du salaire.`,
    } satisfies Record<CodeAlerteAvantage, (montant: string, plafond: string) => string>,
```

- [ ] **Step 4 : Ajouter la section au formulaire**

Dans `src/components/FormulaireSituation.tsx` :

1. Remplacer la ligne d'import de `../engine/validation` par :

```ts
import { SENS_CALCUL, type ErreursSaisie, type SaisieAvantages, type SaisieFormulaire } from '../engine/validation'
```

2. Dans `Props`, ajouter après `netMaxCentimes: number | null` :

```ts
  /** Plafonds ONSS de la période, pour les aides sous les champs. null si le calcul n'aboutit pas. */
  plafondTeletravailCentimes: number | null
  plafondEcochequesCentimes: number | null
```

3. Remplacer la signature du composant :

```tsx
export function FormulaireSituation({ saisie, erreurs, netMaxCentimes, onChange, onBasculerSens }: Props) {
```

par :

```tsx
export function FormulaireSituation({
  saisie,
  erreurs,
  netMaxCentimes,
  plafondTeletravailCentimes,
  plafondEcochequesCentimes,
  onChange,
  onBasculerSens,
}: Props) {
```

4. Ajouter, juste après le composant `Erreur` et avant `export function FormulaireSituation` :

```tsx
interface ChampAvantageProps {
  id: string
  libelle: string
  valeur: string
  aide?: string
  erreur?: string
  onChange: (valeur: string) => void
}

function ChampAvantage({ id, libelle, valeur, aide, erreur, onChange }: ChampAvantageProps) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {libelle}
      </label>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? `${id}-erreur` : aide ? `${id}-aide` : undefined}
        className={CHAMP}
      />
      {erreur ? (
        <Erreur id={`${id}-erreur`}>{erreur}</Erreur>
      ) : (
        aide && (
          <p id={`${id}-aide`} className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {aide}
          </p>
        )
      )}
    </div>
  )
}
```

5. Ajouter, juste après la ligne `const erreurMontant = …` (avant le `return`) :

```tsx
  const a = saisie.avantages
  const ta = t.avantages
  const modifierAvantage = <K extends keyof SaisieAvantages>(champ: K, valeur: SaisieAvantages[K]) =>
    onChange('avantages', { ...a, [champ]: valeur })
  const erreurTexte = (code: ErreursSaisie[keyof ErreursSaisie]) => (code ? texteErreur(code, saisie.sens) : undefined)
```

6. Ajouter, juste avant la balise fermante `</form>` :

```tsx
        <fieldset className="border-t border-slate-200 pt-4 dark:border-slate-700">
          <legend className="font-medium">{ta.titre}</legend>

          <label className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={a.titresRepasActif}
              onChange={(e) => modifierAvantage('titresRepasActif', e.target.checked)}
              className="size-4 accent-blue-700"
            />
            {ta.titresRepas}
          </label>
          {a.titresRepasActif && (
            <div className="mt-2 space-y-3 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
              <ChampAvantage
                id="joursPrestes"
                libelle={ta.joursPrestes}
                valeur={a.joursPrestes}
                erreur={erreurTexte(erreurs.joursPrestes)}
                onChange={(valeur) => modifierAvantage('joursPrestes', valeur)}
              />
              <ChampAvantage
                id="valeurFaciale"
                libelle={ta.valeurFaciale}
                valeur={a.valeurFaciale}
                erreur={erreurTexte(erreurs.valeurFaciale)}
                onChange={(valeur) => modifierAvantage('valeurFaciale', valeur)}
              />
              <ChampAvantage
                id="partTravailleur"
                libelle={ta.partTravailleur}
                valeur={a.partTravailleur}
                erreur={erreurTexte(erreurs.partTravailleur)}
                onChange={(valeur) => modifierAvantage('partTravailleur', valeur)}
              />
            </div>
          )}

          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={a.teletravailActif}
              onChange={(e) => modifierAvantage('teletravailActif', e.target.checked)}
              className="size-4 accent-blue-700"
            />
            {ta.teletravail}
          </label>
          {a.teletravailActif && (
            <div className="mt-2 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
              <ChampAvantage
                id="teletravail"
                libelle={ta.teletravailMontant}
                valeur={a.teletravail}
                aide={plafondTeletravailCentimes === null ? undefined : ta.plafond(formatEuro(plafondTeletravailCentimes))}
                erreur={erreurTexte(erreurs.teletravail)}
                onChange={(valeur) => modifierAvantage('teletravail', valeur)}
              />
            </div>
          )}

          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={a.ecochequesActif}
              onChange={(e) => modifierAvantage('ecochequesActif', e.target.checked)}
              className="size-4 accent-blue-700"
            />
            {ta.ecocheques}
          </label>
          {a.ecochequesActif && (
            <div className="mt-2 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
              <ChampAvantage
                id="ecocheques"
                libelle={ta.ecochequesMontant}
                valeur={a.ecocheques}
                aide={plafondEcochequesCentimes === null ? undefined : ta.plafondAnnuel(formatEuro(plafondEcochequesCentimes))}
                erreur={erreurTexte(erreurs.ecocheques)}
                onChange={(valeur) => modifierAvantage('ecocheques', valeur)}
              />
            </div>
          )}
        </fieldset>
```

- [ ] **Step 5 : Généraliser la ligne du détail**

Remplacer tout le contenu de `src/components/LigneCalcul.tsx` par :

```tsx
import { fr } from '../i18n/fr'
import { formatEuro } from '../utils/format'
import { InfoBulle } from './InfoBulle'

const SIGNE = { '+': '+ ', '-': '− ', '=': '' } as const

interface Props {
  libelle: string
  explication: string
  sens: '+' | '-' | '='
  montantCentimes: number
  source: string
}

export function LigneCalcul({ libelle, explication, sens, montantCentimes, source }: Props) {
  const total = sens === '='

  return (
    <li className={`flex flex-wrap items-center gap-x-2 gap-y-2 py-2 ${total ? 'font-semibold' : ''}`}>
      <span>{libelle}</span>
      <InfoBulle libelle={libelle}>
        <p>{explication}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {fr.detail.source} : {source}
        </p>
      </InfoBulle>
      <span className="ml-auto tabular-nums">
        {SIGNE[sens]}
        {formatEuro(montantCentimes)}
      </span>
    </li>
  )
}
```

- [ ] **Step 6 : Ajouter les lignes d'avantages au détail**

Remplacer tout le contenu de `src/components/DetailCalcul.tsx` par :

```tsx
import type { ResultatComplet } from '../engine/remuneration'
import type { SensCalcul } from '../engine/validation'
import { fr } from '../i18n/fr'
import { LigneCalcul } from './LigneCalcul'

/** Lignes des avantages, ajoutées après le net légal quand il y en a. */
function lignesAvantages(complet: ResultatComplet) {
  const { retenueTitresCentimes, teletravailCentimes } = complet.avantages
  if (retenueTitresCentimes === 0 && teletravailCentimes === 0) {
    return []
  }
  const l = fr.lignesAvantages
  return [
    ...(retenueTitresCentimes > 0
      ? [{ cle: 'retenueTitres', ...l.retenueTitres, sens: '-' as const, montantCentimes: retenueTitresCentimes }]
      : []),
    ...(teletravailCentimes > 0
      ? [{ cle: 'teletravail', ...l.teletravail, sens: '+' as const, montantCentimes: teletravailCentimes }]
      : []),
    { cle: 'netVerse', ...l.netVerse, sens: '=' as const, montantCentimes: complet.netVerseCentimes },
  ]
}

export function DetailCalcul({ sens, complet }: { sens: SensCalcul; complet: ResultatComplet | null }) {
  return (
    <section aria-labelledby="titre-detail" className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
      <h2 id="titre-detail" className="mb-2 text-lg font-semibold">
        {fr.detail.titre}
      </h2>
      {complet ? (
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {complet.resultat.lignes.map((ligne) => (
            <LigneCalcul
              key={ligne.id}
              libelle={fr.lignes[ligne.id].libelle}
              explication={
                sens === 'netVersBrut' && ligne.id === 'brut' ? fr.detail.explicationBrutTrouve : fr.lignes[ligne.id].explication
              }
              sens={ligne.sens}
              montantCentimes={ligne.montantCentimes}
              source={ligne.source}
            />
          ))}
          {lignesAvantages(complet).map(({ cle, ...ligne }) => (
            <LigneCalcul key={cle} {...ligne} />
          ))}
        </ul>
      ) : (
        <p className="text-slate-500">—</p>
      )}
    </section>
  )
}
```

- [ ] **Step 7 : Réécrire le récapitulatif**

Remplacer tout le contenu de `src/components/Recapitulatif.tsx` par :

```tsx
import type { ResultatComplet } from '../engine/remuneration'
import type { SensCalcul } from '../engine/validation'
import { fr } from '../i18n/fr'
import { formatDateFr, formatEuro, formatPourcentage } from '../utils/format'

interface Props {
  sens: SensCalcul
  complet: ResultatComplet | null
  brutCentimes: number | null
  /** Net versé demandé en net → brut, sinon null. */
  netCibleCentimes: number | null
  avantagesActifs: boolean
}

const euros = (centimes: number | null) => (centimes === null ? '—' : formatEuro(centimes))

function Poste({ libelle, montant, note, grand }: { libelle: string; montant: string; note?: string; grand?: boolean }) {
  return (
    <div className="col-span-2">
      <dt className="text-sm text-blue-100">{libelle}</dt>
      <dd className={`${grand ? 'text-4xl font-bold' : 'text-xl font-semibold'} tabular-nums`}>{montant}</dd>
      {note && <dd className="text-xs text-blue-100">{note}</dd>}
    </div>
  )
}

export function Recapitulatif({ sens, complet, brutCentimes, netCibleCentimes, avantagesActifs }: Props) {
  const t = fr.recapitulatif
  const brut = complet ? brutCentimes : null
  const avantages = complet?.avantages ?? null
  const ecart = complet && netCibleCentimes !== null ? complet.netVerseCentimes - netCibleCentimes : 0
  const detailNetVerse =
    complet && avantages && avantagesActifs
      ? t.detailNetVerse(
          formatEuro(complet.resultat.netMensuelCentimes),
          avantages.retenueTitresCentimes > 0 ? t.retenueTitres(formatEuro(avantages.retenueTitresCentimes)) : '',
          avantages.teletravailCentimes > 0 ? t.plusTeletravail(formatEuro(avantages.teletravailCentimes)) : '',
        )
      : undefined
  const titresRecus =
    complet && avantages && avantages.valeurFacialeParTitreCentimes > 0
      ? t.titresRecus(
          avantages.valeurTitresCentimes / avantages.valeurFacialeParTitreCentimes,
          formatEuro(avantages.valeurFacialeParTitreCentimes),
        )
      : undefined

  return (
    <section aria-labelledby="titre-recap" className="rounded-xl bg-blue-700 p-5 text-white shadow-sm dark:bg-blue-900">
      <h2 id="titre-recap" className="text-lg font-semibold">
        {t.titre[sens]}
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-4">
        {sens === 'brutVersNet' ? (
          <Poste
            libelle={avantagesActifs ? t.netVerse : t.netMensuel}
            montant={euros(complet ? complet.netVerseCentimes : null)}
            note={detailNetVerse}
            grand
          />
        ) : (
          <>
            <Poste libelle={t.brutNecessaire} montant={euros(brut)} grand />
            <Poste
              libelle={avantagesActifs ? t.netVerse : t.netObtenu}
              montant={euros(complet ? complet.netVerseCentimes : null)}
              note={ecart > 0 ? t.ecart(formatEuro(ecart)) : detailNetVerse}
            />
          </>
        )}

        {avantagesActifs && avantages && avantages.valeurTitresCentimes > 0 && (
          <>
            <Poste libelle={t.avantagesRecus} montant={euros(avantages.valeurTitresCentimes)} note={titresRecus} />
            <Poste libelle={t.totalMensuel} montant={euros(complet ? complet.totalMensuelCentimes : null)} />
          </>
        )}

        {avantagesActifs && avantages && avantages.ecochequesAnnuelCentimes > 0 && (
          <Poste libelle={t.ecocheques} montant={t.parAn(formatEuro(avantages.ecochequesAnnuelCentimes))} />
        )}

        <div>
          <dt className="text-sm text-blue-100">{sens === 'brutVersNet' ? t.netAnnuel : t.brutAnnuel}</dt>
          <dd className="text-xl font-semibold tabular-nums">
            {euros(
              complet === null
                ? null
                : sens === 'brutVersNet'
                  ? complet.resultat.netAnnuelCentimes
                  : brut === null
                    ? null
                    : brut * 12,
            )}
          </dd>
          <dd className="text-xs text-blue-100">{t.horsExtras}</dd>
        </div>
        <div>
          <dt className="text-sm text-blue-100">{t.tauxRetour}</dt>
          <dd className="text-xl font-semibold tabular-nums">{complet ? formatPourcentage(complet.resultat.tauxRetour) : '—'}</dd>
        </div>
      </dl>
      {complet && (
        <p className="mt-4 text-xs text-blue-100">
          {t.periode(formatDateFr(complet.resultat.periode.valideDu), formatDateFr(complet.resultat.periode.valideAu))}
        </p>
      )}
    </section>
  )
}
```

- [ ] **Step 8 : Afficher les alertes d'avantages**

Remplacer tout le contenu de `src/components/Avertissements.tsx` par :

```tsx
import type { CodeAlerteAvantage } from '../engine/avantages'
import type { EtatCalcul } from '../hooks/useCalcul'
import { fr } from '../i18n/fr'
import { formatDateFr, formatEuro } from '../utils/format'

/** Montant saisi et plafond officiel à citer dans le message d'une alerte. */
function montantsAlerte(code: CodeAlerteAvantage, etat: Extract<EtatCalcul, { etat: 'ok' }>): [number, number] {
  const a = etat.complet.avantages
  const p = etat.plafondsAvantages
  switch (code) {
    case 'partPatronaleTitres':
      return [a.partPatronaleParTitreCentimes, p.titresRepasPartPatronaleMaxCentimes]
    case 'partTravailleurTitres':
      return [a.partTravailleurParTitreCentimes, p.titresRepasPartTravailleurMinCentimes]
    case 'valeurFacialeTitres':
      return [a.valeurFacialeParTitreCentimes, p.titresRepasValeurFacialeMaxCentimes]
    case 'teletravail':
      return [a.teletravailCentimes, p.teletravailMaxCentimes]
    case 'ecocheques':
      return [a.ecochequesAnnuelCentimes, p.ecochequesMaxAnnuelCentimes]
  }
}

export function Avertissements({ etat }: { etat: EtatCalcul }) {
  const ok = etat.etat === 'ok' ? etat : null

  return (
    <div className="space-y-3">
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
        {fr.bandeauEstimation}
        {ok?.avantagesActifs ? ` ${fr.alertes.conditionsAvantages}` : ''}
      </p>
      {etat.etat === 'periodeNonCouverte' && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-100">
          {fr.alertes.periodeNonCouverte(formatDateFr(etat.dateIso))}
        </p>
      )}
      {(etat.etat === 'saisieInvalide' || etat.etat === 'netHorsLimites') && (
        <p role="status" className="text-sm text-slate-600 dark:text-slate-300">
          {fr.alertes.saisieInvalide}
        </p>
      )}
      {ok && ok.brutCentimes < ok.rmmmgCentimes && (
        <p role="status" className="rounded-lg bg-slate-100 p-3 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-100">
          {fr.alertes.sousRmmmg(formatEuro(ok.rmmmgCentimes))}
        </p>
      )}
      {ok?.complet.avantages.alertes.map((code) => {
        const [montant, plafond] = montantsAlerte(code, ok)
        return (
          <p
            key={code}
            role="status"
            className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100"
          >
            {fr.alertes.avantages[code](formatEuro(montant), formatEuro(plafond))}
          </p>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 9 : Câbler la page**

Dans `src/App.tsx` :

1. Dans la fonction `basculer`, remplacer :

```tsx
    const montantRepris = ok ? centimesEnSaisie(ok.sens === 'brutVersNet' ? ok.resultat.netMensuelCentimes : ok.brutCentimes) : null
```

par :

```tsx
    const montantRepris = ok ? centimesEnSaisie(ok.sens === 'brutVersNet' ? ok.complet.netVerseCentimes : ok.brutCentimes) : null
```

2. Remplacer tout le bloc `<main>…</main>` par :

```tsx
        <main className="grid gap-6 lg:grid-cols-2">
          <div className="order-2 lg:order-1 lg:row-span-2">
            <FormulaireSituation
              saisie={saisie}
              erreurs={erreurs}
              netMaxCentimes={netMaxCentimes}
              plafondTeletravailCentimes={ok?.plafondsAvantages.teletravailMaxCentimes ?? null}
              plafondEcochequesCentimes={ok?.plafondsAvantages.ecochequesMaxAnnuelCentimes ?? null}
              onChange={modifier}
              onBasculerSens={basculer}
            />
          </div>
          <div className="order-1 lg:order-2">
            <Recapitulatif
              sens={saisie.sens}
              complet={ok?.complet ?? null}
              brutCentimes={ok?.brutCentimes ?? null}
              netCibleCentimes={ok?.netCibleCentimes ?? null}
              avantagesActifs={ok?.avantagesActifs ?? false}
            />
          </div>
          <div className="order-3">
            <DetailCalcul sens={saisie.sens} complet={ok?.complet ?? null} />
          </div>
        </main>
```

- [ ] **Step 10 : Vérifier qu'ils passent**

Run : `npm test; npm run typecheck; npm run lint`
Expected : tout au vert, y compris les tests existants de `App` (libellés, info-bulle, bascule et messages d'erreur inchangés).

- [ ] **Step 11 : Vérifier le build**

Run : `npm run build`
Expected : « built in … ». La vérification visuelle dans le navigateur (cases à cocher, thème sombre, largeur 400 px) reste à faire par le contrôleur ou l'utilisateur.

- [ ] **Step 12 : Commit**

```powershell
git add src/i18n/fr.ts src/components/FormulaireSituation.tsx src/components/LigneCalcul.tsx src/components/DetailCalcul.tsx src/components/Recapitulatif.tsx src/components/Avertissements.tsx src/App.tsx src/App.test.tsx
git commit -m @'
feat: interface des avantages extralégaux (saisie, net versé, alertes)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
'@
```

---

### Task 6 : README et vérification finale

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes : tout ce qui précède.
- Produces : la documentation à jour ; la branche prête à être poussée.

- [ ] **Step 1 : Mettre à jour le README**

Dans `README.md` :

1. Remplacer la phrase :

```markdown
Chaque ligne du détail (ONSS, bonus à l'emploi, précompte professionnel, bonus fiscal, cotisation spéciale) cite sa source officielle.
```

par :

```markdown
Chaque ligne du détail (ONSS, bonus à l'emploi, précompte professionnel, bonus fiscal, cotisation spéciale) cite sa source officielle. Les avantages extralégaux exonérés — titres-repas, indemnité de télétravail, écochèques — s'ajoutent au calcul pour donner le net réellement versé sur le compte.
```

2. Dans la section « Sources », ajouter après la ligne qui commence par `- ONSS, instructions administratives 2026/3` :

```markdown
- ONSS, instructions administratives : titres-repas, frais propres à l'employeur (indemnité de bureau), éco-chèques
```

3. À la fin de la section « Comment l'exactitude est vérifiée », ajouter :

```markdown
- Avantages extralégaux : titres-repas, indemnité de télétravail et écochèques sont exonérés d'ONSS et d'impôt tant que les plafonds ONSS sont respectés. Le calcul ne fait que des multiplications entières, ne touche pas au salaire, et signale par une alerte tout dépassement de plafond, sans modéliser le basculement en salaire.
```

4. Dans « Limites de la V1 », remplacer :

```markdown
Pas d'ouvriers, de temps partiel, de 13e mois, de pécule de vacances ni d'avantages extralégaux.
```

par :

```markdown
Pas d'ouvriers, de temps partiel, de 13e mois, de pécule de vacances, ni de voiture de société. Les avantages extralégaux couverts sont supposés conformes à leurs conditions d'exonération (convention collective, un titre par jour presté, télétravail structurel).
```

- [ ] **Step 2 : Vérification complète**

Run : `npm test; npm run typecheck; npm run lint; npm run build`
Expected : tous les tests passent, sans erreur TypeScript ni de lint, et le build se termine avec « built in ».

- [ ] **Step 3 : Vérifier l'état de la branche**

Run : `git status -sb; git log --oneline main..HEAD`
Expected : branche `feat/avantages-extralegaux` propre, avec un commit par tâche (tâches 1 à 5) avant celui-ci.

- [ ] **Step 4 : Commit**

```powershell
git add README.md
git commit -m @'
docs: README des avantages extralégaux

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
'@
```

**Ne pas pousser.** Signaler à l'utilisateur que la branche est prête pour le push et le merge.
