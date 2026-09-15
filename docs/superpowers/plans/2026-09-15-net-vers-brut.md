# Net → brut (V2.1) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** permettre de saisir un net mensuel souhaité et d'afficher le plus petit brut mensuel qui l'atteint, avec le même détail de calcul que la V1.

**Architecture :** une nouvelle fonction pure `calculerBrut` (`src/engine/calculerBrut.ts`) rappelle `calculerNet` sans le modifier. Elle fait une dichotomie, puis un balayage vers le bas qui s'arrête dès que le net passe sous `cible − G`. Elle est exacte tant que le net ne recule jamais de plus de G quand le brut monte. Un outil (`tools/verification/reculMax.ts`) mesure ce recul sur tout le domaine, et un test vérifie qu'il reste ≤ G. Dans l'interface, la saisie gagne un sens (`brutVersNet` / `netVersBrut`), un montant unique et une bascule qui garde en mémoire le montant d'origine.

**Tech Stack :** React 19, TypeScript 6 strict, Vite 8, Tailwind CSS 4, Vitest 4 + jsdom + React Testing Library, oxlint, Node 25 (suppression native des types et `worker_threads` pour l'outil).

**Spec :** `docs/superpowers/specs/2026-09-15-net-vers-brut-design.md`. La lire avant de commencer, en particulier § 3 (algorithme et preuve), § 4 (saisie et bascule) et § 7 (tests). La spec V1 (`docs/superpowers/specs/2026-09-14-salaire-net-belgique-v1-design.md`) décrit le calcul brut → net, qui ne change pas.

## Global Constraints

- Dossier : `E:\ALL DOCUMENTS\PROJECTS CODE\Wage_Calculator`. Commandes lancées depuis ce dossier, dans PowerShell.
- Branche : **`feat/net-vers-brut`** (déjà créée, la spec et ce plan y sont commités). **Ne jamais pousser ni merger** : l'utilisateur le fera à la fin.
- **Un commit par tâche**, en français (préfixe `feat:`, `test:`, `chore:` ou `docs:`), avec un message terminé par une ligne vide puis `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Chaque tâche se termine avec `npm test`, `npm run typecheck` et `npm run lint` au vert.
- Moteur : **aucun** import de React, du DOM ou du navigateur dans `src/engine/`.
- Montants en **centimes entiers**. Pas de `Math.round` sur des euros flottants.
- **Ne pas modifier** `calculerNet.ts`, `onss.ts`, `bonusEmploiSocial.ts`, `precompte.ts`, `cotisationSpeciale.ts`, `parametres/*` ni `references.json` (spec § 3.3).
- Tous les textes affichés sont dans `src/i18n/fr.ts`.
- Clés localStorage : `wage-calculator:saisie:v2` (écriture) ; `wage-calculator:saisie:v1` (lecture seule, reprise). Chaque accès est protégé par `try/catch`.
- **Aucune nouvelle dépendance npm.**
- `MARGE_RECUL_CENTIMES = 1_000` ; `BRUT_MAX_CENTIMES = 10_000_000`.
- Date de test standard : `'2026-09-14'` (période `P2026-09`) ; autre période : `'2026-08-31'` (`P2026-07`).

## Structure des fichiers

| Fichier | Responsabilité | Tâche |
|---|---|---|
| `src/engine/types.ts` | + `BRUT_MAX_CENTIMES`, `NetHorsLimites` | 1 |
| `src/engine/calculerBrut.ts` | `calculerBrut`, `SituationFamiliale`, `MARGE_RECUL_CENTIMES` | 1 |
| `src/engine/__tests__/situations.ts` | les 76 situations familiales couvertes | 1 |
| `src/engine/calculerBrut.test.ts` | tests de `calculerBrut` avec oracle | 1 |
| `src/engine/validation.ts` | importe `BRUT_MAX_CENTIMES` depuis `types.ts` (tâche 1) ; saisie à deux sens (tâche 3) | 1, 3 |
| `tools/verification/resolveur.mjs` | imports TypeScript sans extension pour Node | 2 |
| `tools/verification/reculMax.ts` | mesure du recul maximal, multi-thread | 2 |
| `src/engine/__tests__/reculMax.json` | généré par l'outil | 2 |
| `src/engine/__tests__/reculMax.test.ts` | recul ≤ marge, couverture des périodes | 2 |
| `package.json` | script `verifier:recul` | 2 |
| `src/hooks/useSaisie.ts` | clé v2 et reprise v1 (tâche 3) ; `basculerSens` (tâche 4) | 3, 4 |
| `src/hooks/useCalcul.ts` (+ `useCalcul.test.ts`) | deux sens, état `netHorsLimites` | 3 |
| `src/i18n/fr.ts` | erreurs par sens (tâche 3) ; textes de l'interface (tâche 5) | 3, 5 |
| `src/components/FormulaireSituation.tsx` | champ `montant` (tâche 3) ; bascule et message `netHorsLimites` (tâche 5) | 3, 5 |
| `src/utils/format.ts` | + `centimesEnSaisie` | 4 |
| `src/components/Recapitulatif.tsx` | affichage net → brut | 5 |
| `src/components/DetailCalcul.tsx`, `LigneCalcul.tsx` | explication du brut trouvé | 5 |
| `src/components/Avertissements.tsx` | bandeau aussi pour `netHorsLimites` | 5 |
| `src/App.tsx` (+ `App.test.tsx`) | câblage de la bascule | 3, 5 |
| `README.md` | documentation | 6 |

---

### Task 1 : Moteur `calculerBrut`

**Files:**
- Modify: `src/engine/types.ts` (ajout en fin de fichier)
- Modify: `src/engine/validation.ts:1-2` et `:23` (import de `BRUT_MAX_CENTIMES`)
- Create: `src/engine/calculerBrut.ts`
- Create: `src/engine/__tests__/situations.ts`
- Test: `src/engine/calculerBrut.test.ts`

**Interfaces:**
- Consumes : `calculerNet(situation: Situation, dateIso: string): Resultat` (`src/engine/calculerNet.ts`), `REVENUS_CONJOINT`, `PeriodeNonCouverte`, `Situation`, `Resultat` (`src/engine/types.ts`).
- Produces :
  - `types.ts` : `export const BRUT_MAX_CENTIMES = 10_000_000` ; `export class NetHorsLimites extends Error { readonly netCibleCentimes: number; readonly netMaxCentimes: number; constructor(netCibleCentimes: number, netMaxCentimes: number) }`.
  - `calculerBrut.ts` : `export type SituationFamiliale = Omit<Situation, 'brutMensuelCentimes'>` ; `export const MARGE_RECUL_CENTIMES = 1_000` ; `export interface ResultatInverse { netCibleCentimes: number; brutCentimes: number; resultat: Resultat }` ; `export function calculerBrut(famille: SituationFamiliale, netCibleCentimes: number, dateIso: string): ResultatInverse`.
  - `__tests__/situations.ts` : `export const SITUATIONS_FAMILIALES: readonly SituationFamiliale[]` (76 éléments).

- [ ] **Step 1 : Écrire la liste des situations couvertes**

Créer `src/engine/__tests__/situations.ts` :

```ts
import type { SituationFamiliale } from '../calculerBrut'
import { REVENUS_CONJOINT } from '../types'

const ENFANTS = Array.from({ length: 11 }, (_, i) => i)

/**
 * Toutes les situations familiales couvertes par la V1 (76) : isolé (0 à 10 enfants),
 * parent isolé (1 à 10 enfants), et les 5 cas de conjoint (0 à 10 enfants).
 * Utilisé par les tests de calculerBrut et par tools/verification/reculMax.ts.
 */
export const SITUATIONS_FAMILIALES: readonly SituationFamiliale[] = [
  ...ENFANTS.map((enfantsACharge): SituationFamiliale => ({
    etatCivil: 'isole',
    revenusConjoint: null,
    enfantsACharge,
    parentIsole: false,
  })),
  ...ENFANTS.slice(1).map((enfantsACharge): SituationFamiliale => ({
    etatCivil: 'isole',
    revenusConjoint: null,
    enfantsACharge,
    parentIsole: true,
  })),
  ...REVENUS_CONJOINT.flatMap((revenusConjoint) =>
    ENFANTS.map((enfantsACharge): SituationFamiliale => ({
      etatCivil: 'marieOuCohabitant',
      revenusConjoint,
      enfantsACharge,
      parentIsole: false,
    })),
  ),
]
```

- [ ] **Step 2 : Écrire les tests**

Créer `src/engine/calculerBrut.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import fichier from './__tests__/references.json'
import { SITUATIONS_FAMILIALES } from './__tests__/situations'
import { calculerBrut, MARGE_RECUL_CENTIMES, type SituationFamiliale } from './calculerBrut'
import { calculerNet } from './calculerNet'
import { BRUT_MAX_CENTIMES, NetHorsLimites, PeriodeNonCouverte, type Situation } from './types'

const SEPT = '2026-09-14'
const AOUT = '2026-08-31'
const DATES = [AOUT, SEPT] as const

const ISOLE: SituationFamiliale = { etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false }
const CONJOINT_AVEC_REVENUS: SituationFamiliale = {
  etatCivil: 'marieOuCohabitant',
  revenusConjoint: 'superieurs',
  enfantsACharge: 0,
  parentIsole: false,
}

function net(famille: SituationFamiliale, brut: number, dateIso: string): number {
  return calculerNet({ ...famille, brutMensuelCentimes: brut }, dateIso).netMensuelCentimes
}

/** Oracle : net(b) ≤ b, donc le plus petit brut qui atteint la cible est ≥ la cible. On monte centime par centime. */
function brutOracle(famille: SituationFamiliale, cible: number, dateIso: string): number {
  let brut = cible
  while (net(famille, brut, dateIso) < cible) {
    brut++
  }
  return brut
}

/** Vérification locale : le brut atteint la cible, et le centime en dessous non. */
function verifierLocalement(famille: SituationFamiliale, cible: number, dateIso: string, brut: number) {
  expect(net(famille, brut, dateIso)).toBeGreaterThanOrEqual(cible)
  if (brut > 1) {
    expect(net(famille, brut - 1, dateIso)).toBeLessThan(cible)
  }
}

/** Générateur pseudo-aléatoire à graine fixe (mulberry32), pour des tests reproductibles. */
function generateur(graine: number): () => number {
  let etat = graine
  return () => {
    etat = (etat + 0x6d2b79f5) | 0
    let t = Math.imul(etat ^ (etat >>> 15), 1 | etat)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

interface CasReference {
  id: string
  date: string
  situation: Situation
  attendu: { net: number }
}
const REFERENCES = fichier.cas as unknown as CasReference[]

function famille(situation: Situation): SituationFamiliale {
  const { brutMensuelCentimes: _brut, ...reste } = situation
  return reste
}

describe('situations couvertes', () => {
  it('liste les 76 situations familiales', () => {
    expect(SITUATIONS_FAMILIALES).toHaveLength(76)
    expect(new Set(SITUATIONS_FAMILIALES.map((s) => JSON.stringify(s))).size).toBe(76)
  })
})

describe('calculerBrut', () => {
  it('retrouve le brut de l’exemple : 2 261,33 € net → 2 999,96 € brut', () => {
    const r = calculerBrut(ISOLE, 226_133, SEPT)
    expect(r.brutCentimes).toBe(299_996)
    expect(r.netCibleCentimes).toBe(226_133)
    expect(r.resultat).toEqual(calculerNet({ ...ISOLE, brutMensuelCentimes: 299_996 }, SEPT))
  })

  it('le net ne dépasse jamais le brut (hypothèse de l’oracle)', () => {
    for (const c of REFERENCES) {
      expect(c.attendu.net).toBeLessThanOrEqual(c.situation.brutMensuelCentimes)
    }
    for (const brut of [1, 109_509, 109_510, 180_845, 234_518, 1_000_000, BRUT_MAX_CENTIMES]) {
      expect(net(CONJOINT_AVEC_REVENUS, brut, SEPT)).toBeLessThanOrEqual(brut)
      expect(net(ISOLE, brut, SEPT)).toBeLessThanOrEqual(brut)
    }
  })

  describe('cas de référence', () => {
    it.each(REFERENCES.map((c) => [c.id, c] as const))('%s : vérification locale', (_id, c) => {
      const f = famille(c.situation)
      const r = calculerBrut(f, c.attendu.net, c.date)
      verifierLocalement(f, c.attendu.net, c.date, r.brutCentimes)
      expect(r.brutCentimes).toBeLessThanOrEqual(c.situation.brutMensuelCentimes)
    })

    const petits = REFERENCES.filter((c) => c.situation.brutMensuelCentimes <= 300_000)
    it.each(petits.map((c) => [c.id, c] as const))('%s : égal à l’oracle', (_id, c) => {
      const f = famille(c.situation)
      expect(calculerBrut(f, c.attendu.net, c.date).brutCentimes).toBe(brutOracle(f, c.attendu.net, c.date))
    })
  })

  describe('zones pièges, comparées à l’oracle', () => {
    it('la marche de la cotisation spéciale à 1 095,10 € (conjoint avec revenus)', () => {
      expect(net(CONJOINT_AVEC_REVENUS, 109_509, SEPT)).toBe(109_509)
      expect(net(CONJOINT_AVEC_REVENUS, 109_510, SEPT)).toBe(108_995)
      for (const cible of [108_994, 108_995, 109_000, 109_509, 109_510, 109_600]) {
        expect(calculerBrut(CONJOINT_AVEC_REVENUS, cible, SEPT).brutCentimes).toBe(brutOracle(CONJOINT_AVEC_REVENUS, cible, SEPT))
      }
    })

    it('la baisse du net à 2 345,18 € (isolé)', () => {
      expect(net(ISOLE, 234_517, SEPT)).toBe(213_385)
      expect(net(ISOLE, 234_518, SEPT)).toBe(213_382)
      for (let cible = 213_380; cible <= 213_390; cible++) {
        expect(calculerBrut(ISOLE, cible, SEPT).brutCentimes).toBe(brutOracle(ISOLE, cible, SEPT))
      }
    })

    it('un net impossible au centime près : le net obtenu dépasse la cible d’un centime', () => {
      expect(net(ISOLE, 180_845, SEPT)).toBe(180_844)
      expect(net(ISOLE, 180_846, SEPT)).toBe(180_846)
      const r = calculerBrut(ISOLE, 180_845, SEPT)
      expect(r.brutCentimes).toBe(180_846)
      expect(r.resultat.netMensuelCentimes).toBe(180_846)
      expect(r.brutCentimes).toBe(brutOracle(ISOLE, 180_845, SEPT))
    })

    it.each(DATES)('les planchers des volets A et B (%s)', (date) => {
      for (const brut of [230_062, 293_793]) {
        const cible = net(ISOLE, brut, date)
        expect(calculerBrut(ISOLE, cible, date).brutCentimes).toBe(brutOracle(ISOLE, cible, date))
      }
    })

    const hasard = generateur(20260915)
    const cibles = Array.from({ length: 40 }, (_, i) => ({
      i,
      famille: SITUATIONS_FAMILIALES[Math.floor(hasard() * SITUATIONS_FAMILIALES.length)],
      date: DATES[Math.floor(hasard() * DATES.length)],
      cible: 1 + Math.floor(hasard() * 250_000),
    }))
    it.each(cibles)('cible pseudo-aléatoire n° $i ($cible c, $date)', ({ famille: f, date, cible }) => {
      expect(calculerBrut(f, cible, date).brutCentimes).toBe(brutOracle(f, cible, date))
    })
  })

  describe('limites', () => {
    it('accepte le net du brut maximal et refuse un centime de plus', () => {
      const netMax = net(ISOLE, BRUT_MAX_CENTIMES, SEPT)
      expect(netMax).toBe(4_146_374)
      const r = calculerBrut(ISOLE, netMax, SEPT)
      expect(r.brutCentimes).toBeLessThanOrEqual(BRUT_MAX_CENTIMES)
      verifierLocalement(ISOLE, netMax, SEPT, r.brutCentimes)

      expect(() => calculerBrut(ISOLE, netMax + 1, SEPT)).toThrow(NetHorsLimites)
      try {
        calculerBrut(ISOLE, netMax + 1, SEPT)
      } catch (erreur) {
        expect(erreur).toMatchObject({ netCibleCentimes: netMax + 1, netMaxCentimes: netMax })
      }
    })

    it('renvoie 0,01 € de brut pour 0,01 € de net', () => {
      expect(calculerBrut(ISOLE, 1, SEPT).brutCentimes).toBe(1)
    })

    it('lève PeriodeNonCouverte hors des périodes intégrées', () => {
      expect(() => calculerBrut(ISOLE, 226_133, '2027-01-15')).toThrow(PeriodeNonCouverte)
    })

    it('expose une marge de 10 €', () => {
      expect(MARGE_RECUL_CENTIMES).toBe(1_000)
    })
  })

  it('reste rapide : 200 recherches sur tout l’intervalle en moins de 2 secondes', { timeout: 20_000 }, () => {
    const hasard = generateur(15092026)
    const recherches = Array.from({ length: 200 }, () => {
      const f = SITUATIONS_FAMILIALES[Math.floor(hasard() * SITUATIONS_FAMILIALES.length)]
      const date = DATES[Math.floor(hasard() * DATES.length)]
      const cible = 1 + Math.floor(hasard() * net(f, BRUT_MAX_CENTIMES, date))
      return { f, date, cible }
    })

    const debut = performance.now()
    const bruts = recherches.map(({ f, date, cible }) => calculerBrut(f, cible, date).brutCentimes)
    const duree = performance.now() - debut

    expect(duree).toBeLessThan(2_000)
    recherches.forEach(({ f, date, cible }, i) => verifierLocalement(f, cible, date, bruts[i]))
  })
})
```

- [ ] **Step 3 : Vérifier qu'ils échouent**

Run : `npx vitest run src/engine/calculerBrut.test.ts`
Expected : FAIL, avec « Failed to resolve import "./calculerBrut" ».

- [ ] **Step 4 : Ajouter `BRUT_MAX_CENTIMES` et `NetHorsLimites` à `types.ts`**

Ajouter à la fin de `src/engine/types.ts` :

```ts
/** Brut mensuel maximal accepté : 100 000 €. */
export const BRUT_MAX_CENTIMES = 10_000_000

/** Le net demandé dépasse le net obtenu avec le brut maximal. */
export class NetHorsLimites extends Error {
  readonly netCibleCentimes: number
  readonly netMaxCentimes: number

  constructor(netCibleCentimes: number, netMaxCentimes: number) {
    super(`Net de ${netCibleCentimes} centimes inatteignable : au plus ${netMaxCentimes} centimes pour le brut maximal`)
    this.name = 'NetHorsLimites'
    this.netCibleCentimes = netCibleCentimes
    this.netMaxCentimes = netMaxCentimes
  }
}
```

- [ ] **Step 5 : Faire importer la constante par `validation.ts`**

Dans `src/engine/validation.ts`, remplacer :

```ts
import type { EtatCivil, RevenusConjoint, Situation } from './types'
```

par :

```ts
import { BRUT_MAX_CENTIMES, type EtatCivil, type RevenusConjoint, type Situation } from './types'
```

puis supprimer la ligne :

```ts
export const BRUT_MAX_CENTIMES = 10_000_000
```

- [ ] **Step 6 : Implémenter `calculerBrut`**

Créer `src/engine/calculerBrut.ts` :

```ts
import { calculerNet } from './calculerNet'
import { BRUT_MAX_CENTIMES, NetHorsLimites, type Resultat, type Situation } from './types'

/** Situation sans le brut : ce que l'on connaît quand on part du net. */
export type SituationFamiliale = Omit<Situation, 'brutMensuelCentimes'>

/**
 * Marge G de l'algorithme. Doit rester ≥ au recul maximal du net mesuré par
 * tools/verification/reculMax.ts (vérifié par src/engine/__tests__/reculMax.test.ts).
 */
export const MARGE_RECUL_CENTIMES = 1_000

export interface ResultatInverse {
  netCibleCentimes: number
  /** Plus petit brut dont le net est ≥ netCibleCentimes. */
  brutCentimes: number
  /** calculerNet pour le brut trouvé : détail identique au mode brut → net. */
  resultat: Resultat
}

/**
 * Net → brut : plus petit brut mensuel dont le net atteint la cible (spec net → brut § 3).
 *
 * Le net ne monte pas toujours avec le brut (arrondis, marche de la cotisation spéciale).
 * Une dichotomie trouve un brut qui atteint la cible, puis on redescend jusqu'à un net
 * inférieur à « cible − G ». Si le net ne recule jamais de plus de G, aucun brut plus bas
 * ne peut encore atteindre la cible : le plus petit brut vu est le bon.
 *
 * Lève NetHorsLimites si le brut maximal n'atteint pas la cible, et PeriodeNonCouverte
 * si aucune règle n'est intégrée pour dateIso.
 */
export function calculerBrut(famille: SituationFamiliale, netCibleCentimes: number, dateIso: string): ResultatInverse {
  const calculer = (brut: number) => calculerNet({ ...famille, brutMensuelCentimes: brut }, dateIso)
  const net = (brut: number) => calculer(brut).netMensuelCentimes

  const netMax = net(BRUT_MAX_CENTIMES)
  if (netMax < netCibleCentimes) {
    throw new NetHorsLimites(netCibleCentimes, netMax)
  }

  // Invariant : net(hi) ≥ cible. lo = 0 compte comme un net nul et n'est jamais évalué.
  let lo = 0
  let hi = BRUT_MAX_CENTIMES
  while (hi - lo > 1) {
    const milieu = Math.floor((lo + hi) / 2)
    if (net(milieu) >= netCibleCentimes) {
      hi = milieu
    } else {
      lo = milieu
    }
  }

  let meilleur = hi
  for (let brut = hi - 1; brut >= 1; brut--) {
    const n = net(brut)
    if (n >= netCibleCentimes) {
      meilleur = brut
    } else if (n < netCibleCentimes - MARGE_RECUL_CENTIMES) {
      break
    }
  }

  return { netCibleCentimes, brutCentimes: meilleur, resultat: calculer(meilleur) }
}
```

- [ ] **Step 7 : Vérifier qu'ils passent**

Run : `npx vitest run src/engine/calculerBrut.test.ts`
Expected : PASS pour tous les tests. La durée totale reste de l'ordre de 5 à 15 secondes, surtout à cause de l'oracle. Si le test de performance échoue au-delà de 2 s, ne pas relever le seuil : signaler la durée mesurée.

- [ ] **Step 8 : Vérifier l'ensemble**

Run : `npm test; npm run typecheck; npm run lint`
Expected : tous les tests passent (les 213 existants et les nouveaux), sans erreur TypeScript ni de lint.

- [ ] **Step 9 : Commit**

```powershell
git add src/engine/types.ts src/engine/validation.ts src/engine/calculerBrut.ts src/engine/calculerBrut.test.ts src/engine/__tests__/situations.ts
git commit -m @'
feat: calcul net → brut par dichotomie et balayage à marge garantie

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
'@
```

---

### Task 2 : Outil de mesure du recul maximal

**Files:**
- Create: `tools/verification/resolveur.mjs`
- Create: `tools/verification/reculMax.ts`
- Create (généré): `src/engine/__tests__/reculMax.json`
- Test: `src/engine/__tests__/reculMax.test.ts`
- Modify: `package.json` (bloc `scripts`)

**Interfaces:**
- Consumes : `calculerNet` ; `PERIODES: readonly Parametres[]` (`src/engine/parametres/index.ts`, chaque élément a `id` et `valideDu`) ; `SITUATIONS_FAMILIALES` (tâche 1) ; `BRUT_MAX_CENTIMES` (tâche 1) ; `MARGE_RECUL_CENTIMES` (tâche 1) ; `dateIsoLocale(date: Date): string` (`src/utils/format.ts`).
- Produces : le fichier `src/engine/__tests__/reculMax.json`, au format :
  ```ts
  {
    description: string
    genereLe: string            // AAAA-MM-JJ
    situationsCouvertes: number // 76
    brutMaxCentimes: number     // 10 000 000
    periodes: Record<string, {  // clé = id de période, ex. 'P2026-09'
      reculMaxCentimes: number
      brutCentimes: number
      situation: SituationFamiliale
    }>
  }
  ```
  et le script npm `verifier:recul`.

- [ ] **Step 1 : Écrire le test**

Créer `src/engine/__tests__/reculMax.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { MARGE_RECUL_CENTIMES } from '../calculerBrut'
import { PERIODES } from '../parametres'
import { BRUT_MAX_CENTIMES } from '../types'
import mesure from './reculMax.json'
import { SITUATIONS_FAMILIALES } from './situations'

describe('recul maximal du net (généré par npm run verifier:recul)', () => {
  it('couvre exactement les périodes intégrées', () => {
    expect(Object.keys(mesure.periodes).sort()).toEqual(PERIODES.map((p) => p.id).sort())
  })

  it('couvre toutes les situations et tout le domaine du brut', () => {
    expect(mesure.situationsCouvertes).toBe(SITUATIONS_FAMILIALES.length)
    expect(mesure.brutMaxCentimes).toBe(BRUT_MAX_CENTIMES)
  })

  it.each(Object.entries(mesure.periodes))('%s : le recul maximal reste dans la marge de calculerBrut', (_id, periode) => {
    expect(periode.reculMaxCentimes).toBeLessThanOrEqual(MARGE_RECUL_CENTIMES)
  })
})
```

- [ ] **Step 2 : Vérifier qu'il échoue**

Run : `npx vitest run src/engine/__tests__/reculMax.test.ts`
Expected : FAIL, avec « Failed to resolve import "./reculMax.json" ».

- [ ] **Step 3 : Écrire le résolveur d'imports**

Node 25 exécute le TypeScript en retirant les types, mais il exige des extensions dans les imports, alors que le moteur écrit `from './types'`. Créer `tools/verification/resolveur.mjs` :

```js
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
```

- [ ] **Step 4 : Écrire l'outil**

Créer `tools/verification/reculMax.ts` :

```ts
/**
 * Mesure le recul maximal du net quand le brut augmente, pour chaque période de paramètres,
 * sur toutes les situations couvertes et tous les bruts de 0,01 € à 100 000 €.
 * calculerBrut n'est exact que si ce recul reste ≤ MARGE_RECUL_CENTIMES (spec net → brut § 3.2).
 *
 * Usage : npm run verifier:recul   (plusieurs minutes, un thread par cœur)
 * Écrit : src/engine/__tests__/reculMax.json
 */
import { writeFileSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import { Worker, isMainThread, parentPort } from 'node:worker_threads'
import { SITUATIONS_FAMILIALES } from '../../src/engine/__tests__/situations.ts'
import { calculerNet } from '../../src/engine/calculerNet.ts'
import { PERIODES } from '../../src/engine/parametres/index.ts'
import { BRUT_MAX_CENTIMES } from '../../src/engine/types.ts'
import { dateIsoLocale } from '../../src/utils/format.ts'

interface Tache {
  periodeId: string
  dateIso: string
  indexSituation: number
}

interface Mesure extends Tache {
  reculMaxCentimes: number
  brutCentimes: number
}

/** Plus grande valeur de max(net(x) pour x < b) − net(b), et le brut b où elle se produit. */
function mesurer(tache: Tache): Mesure {
  const famille = SITUATIONS_FAMILIALES[tache.indexSituation]
  let netMaxVu = Number.NEGATIVE_INFINITY
  let reculMaxCentimes = 0
  let brutCentimes = 0
  for (let brut = 1; brut <= BRUT_MAX_CENTIMES; brut++) {
    const net = calculerNet({ ...famille, brutMensuelCentimes: brut }, tache.dateIso).netMensuelCentimes
    if (net > netMaxVu) {
      netMaxVu = net
    } else if (netMaxVu - net > reculMaxCentimes) {
      reculMaxCentimes = netMaxVu - net
      brutCentimes = brut
    }
  }
  return { ...tache, reculMaxCentimes, brutCentimes }
}

async function principal() {
  const taches: Tache[] = PERIODES.flatMap((periode) =>
    SITUATIONS_FAMILIALES.map((_, indexSituation) => ({ periodeId: periode.id, dateIso: periode.valideDu, indexSituation })),
  )
  const total = taches.length
  const mesures: Mesure[] = []
  const nbThreads = Math.min(availableParallelism(), total)
  const debut = Date.now()
  console.log(`${total} mesures (${PERIODES.length} périodes × ${SITUATIONS_FAMILIALES.length} situations) sur ${nbThreads} threads…`)

  await Promise.all(
    Array.from(
      { length: nbThreads },
      () =>
        new Promise<void>((resoudre, rejeter) => {
          const worker = new Worker(new URL(import.meta.url))
          const suivante = () => {
            const tache = taches.shift()
            if (tache) {
              worker.postMessage(tache)
            } else {
              void worker.terminate().then(() => resoudre())
            }
          }
          worker.on('online', suivante)
          worker.on('message', (mesure: Mesure) => {
            mesures.push(mesure)
            console.log(`  ${mesures.length}/${total} — ${mesure.periodeId}, situation ${mesure.indexSituation} : ${mesure.reculMaxCentimes} c`)
            suivante()
          })
          worker.on('error', rejeter)
        }),
    ),
  )

  const periodes: Record<string, { reculMaxCentimes: number; brutCentimes: number; situation: (typeof SITUATIONS_FAMILIALES)[number] }> = {}
  for (const periode of PERIODES) {
    const pire = mesures
      .filter((m) => m.periodeId === periode.id)
      .reduce((a, b) => (b.reculMaxCentimes > a.reculMaxCentimes ? b : a))
    periodes[periode.id] = {
      reculMaxCentimes: pire.reculMaxCentimes,
      brutCentimes: pire.brutCentimes,
      situation: SITUATIONS_FAMILIALES[pire.indexSituation],
    }
  }

  const sortie = new URL('../../src/engine/__tests__/reculMax.json', import.meta.url)
  const contenu = {
    description: 'Généré par tools/verification/reculMax.ts (npm run verifier:recul) — ne pas modifier à la main',
    genereLe: dateIsoLocale(new Date()),
    situationsCouvertes: SITUATIONS_FAMILIALES.length,
    brutMaxCentimes: BRUT_MAX_CENTIMES,
    periodes,
  }
  writeFileSync(sortie, `${JSON.stringify(contenu, null, 2)}\n`)
  console.log(`Terminé en ${Math.round((Date.now() - debut) / 1000)} s.`)
  console.log(JSON.stringify(periodes, null, 2))
}

if (isMainThread) {
  await principal()
} else {
  parentPort?.on('message', (tache: Tache) => parentPort?.postMessage(mesurer(tache)))
}
```

- [ ] **Step 5 : Déclarer le script npm**

Dans `package.json`, ajouter dans `"scripts"`, après `"typecheck": "tsc -b"` (penser à la virgule sur la ligne précédente) :

```json
    "verifier:recul": "node --import ./tools/verification/resolveur.mjs tools/verification/reculMax.ts"
```

- [ ] **Step 6 : Lancer l'outil**

Run : `npm run verifier:recul`
Expected : 152 mesures, puis « Terminé en … s ». Cela prend environ 2 minutes sur 16 cœurs, et jusqu'à 20 minutes sur un seul. Le fichier `src/engine/__tests__/reculMax.json` est écrit.

Valeur attendue pour les deux périodes : `reculMaxCentimes: 514` à `brutCentimes: 109510`, pour un conjoint `superieurs` : c'est la marche de la cotisation spéciale. Le nombre d'enfants de la situation citée peut varier, car la marche est la même avec ou sans enfants.

**Si une période dépasse 1 000 centimes : s'arrêter et signaler la valeur, sans modifier la marge.**

- [ ] **Step 7 : Vérifier que le test passe**

Run : `npx vitest run src/engine/__tests__/reculMax.test.ts`
Expected : PASS (4 tests : les périodes, la couverture, et une ligne par période).

- [ ] **Step 8 : Vérifier l'ensemble**

Run : `npm test; npm run typecheck; npm run lint`
Expected : tout au vert (oxlint analyse aussi `tools/`).

- [ ] **Step 9 : Commit**

```powershell
git add tools/verification/resolveur.mjs tools/verification/reculMax.ts src/engine/__tests__/reculMax.json src/engine/__tests__/reculMax.test.ts package.json
git commit -m @'
test: outil de mesure du recul maximal du net et garde-fou de la marge

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
'@
```

---

### Task 3 : Saisie à deux sens, mémorisation v2 et états du calcul

Cette tâche change la forme de la saisie. L'interface ne montre encore aucune bascule, mais tout doit compiler et les tests existants doivent rester verts.

**Files:**
- Modify: `src/engine/validation.ts` (réécriture complète)
- Test: `src/engine/validation.test.ts` (réécriture complète)
- Modify: `src/hooks/useSaisie.ts` (réécriture complète)
- Test: `src/hooks/useSaisie.test.ts` (réécriture complète)
- Modify: `src/hooks/useCalcul.ts` (réécriture complète)
- Create: `src/hooks/useCalcul.test.ts`
- Modify: `src/i18n/fr.ts` (blocs `formulaire.brut` et `erreurs`, + `texteErreur`)
- Modify: `src/components/FormulaireSituation.tsx` (champ montant et erreurs)
- Test: `src/App.test.tsx:69-73` (test « restaure la saisie mémorisée »)

**Interfaces:**
- Consumes : `calculerBrut`, `SituationFamiliale` (tâche 1) ; `NetHorsLimites`, `BRUT_MAX_CENTIMES` (tâche 1) ; `calculerNet`, `getParametres(dateIso).rmmmgCentimes`.
- Produces :
  - `validation.ts` : `export const SENS_CALCUL = ['brutVersNet', 'netVersBrut'] as const` ; `export type SensCalcul = (typeof SENS_CALCUL)[number]` ; `SaisieFormulaire { sens: SensCalcul; montant: string; montantAvantBascule: string | null; etatCivil: EtatCivil; revenusConjoint: RevenusConjoint; enfantsACharge: string; parentIsole: boolean }` ; `export type CodeErreur = 'montantVide' | 'montantFormat' | 'montantHorsLimites' | 'enfantsInvalide'` ; `ErreursSaisie { montant?: CodeErreur; enfantsACharge?: CodeErreur }` ; `ResultatValidation` (3 variantes, spec § 4.2) ; `SAISIE_PAR_DEFAUT` ; `ENFANTS_MAX` ; `validerSaisie(saisie: SaisieFormulaire): ResultatValidation`.
  - `useSaisie.ts` : `export const CLE_STOCKAGE = 'wage-calculator:saisie:v2'` ; `export const CLE_STOCKAGE_V1 = 'wage-calculator:saisie:v1'` ; `lireSaisieStockee(): SaisieFormulaire` ; `useSaisie(): { saisie: SaisieFormulaire; modifier: <K extends keyof SaisieFormulaire>(champ: K, valeur: SaisieFormulaire[K]) => void }`.
  - `useCalcul.ts` : `EtatCalcul` (4 variantes, spec § 5.1) ; `calculerEtat(saisie: SaisieFormulaire, dateIso: string): EtatCalcul` ; `useCalcul(saisie, dateIso): EtatCalcul`.
  - `fr.ts` : `fr.formulaire.montant: Record<SensCalcul, string>` ; `fr.erreurs` ; `export function texteErreur(code: CodeErreur, sens: SensCalcul): string`.

- [ ] **Step 1 : Réécrire les tests de validation**

Remplacer tout le contenu de `src/engine/validation.test.ts` par :

```ts
import { describe, expect, it } from 'vitest'
import { SAISIE_PAR_DEFAUT, validerSaisie, type SaisieFormulaire } from './validation'

function saisie(modif: Partial<SaisieFormulaire>): SaisieFormulaire {
  return { ...SAISIE_PAR_DEFAUT, ...modif }
}

const ISOLE_SANS_ENFANT = { etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false }

describe('validerSaisie', () => {
  it('a une saisie par défaut en brut → net, sans montant de bascule', () => {
    expect(SAISIE_PAR_DEFAUT).toMatchObject({ sens: 'brutVersNet', montant: '3000', montantAvantBascule: null })
  })

  it('accepte la saisie par défaut (brut → net)', () => {
    expect(validerSaisie(SAISIE_PAR_DEFAUT)).toEqual({
      ok: true,
      sens: 'brutVersNet',
      situation: { brutMensuelCentimes: 300_000, ...ISOLE_SANS_ENFANT },
    })
  })

  it('en net → brut, renvoie la situation familiale et le net cible', () => {
    expect(validerSaisie(saisie({ sens: 'netVersBrut', montant: '2261,33' }))).toEqual({
      ok: true,
      sens: 'netVersBrut',
      famille: ISOLE_SANS_ENFANT,
      netCibleCentimes: 226_133,
    })
  })

  describe.each(['brutVersNet', 'netVersBrut'] as const)('montant en %s', (sens) => {
    it.each([
      ['', 'montantVide'],
      ['   ', 'montantVide'],
      ['abc', 'montantFormat'],
      ['3000,123', 'montantFormat'],
      ['0', 'montantHorsLimites'],
      ['100000,01', 'montantHorsLimites'],
    ])('« %s » → erreur %s', (montant, code) => {
      expect(validerSaisie(saisie({ sens, montant }))).toEqual({ ok: false, erreurs: { montant: code } })
    })

    it('accepte 100 000 € pile', () => {
      expect(validerSaisie(saisie({ sens, montant: '100000' })).ok).toBe(true)
    })
  })

  it.each(['', '-1', '11', '1,5', 'deux'])('enfants « %s » → erreur', (enfantsACharge) => {
    expect(validerSaisie(saisie({ enfantsACharge }))).toEqual({ ok: false, erreurs: { enfantsACharge: 'enfantsInvalide' } })
  })

  it('signale les deux champs en même temps', () => {
    expect(validerSaisie(saisie({ montant: '', enfantsACharge: '' }))).toEqual({
      ok: false,
      erreurs: { montant: 'montantVide', enfantsACharge: 'enfantsInvalide' },
    })
  })

  it('ignore le montant de bascule pour la validation', () => {
    expect(validerSaisie(saisie({ montantAvantBascule: 'n’importe quoi' })).ok).toBe(true)
  })

  it('ignore les revenus du conjoint pour un isolé', () => {
    const r = validerSaisie(saisie({ revenusConjoint: 'superieurs' }))
    expect(r.ok && r.sens === 'brutVersNet' && r.situation.revenusConjoint).toBeNull()
  })

  it('garde les revenus du conjoint pour un marié et désactive parent isolé', () => {
    const r = validerSaisie(saisie({ etatCivil: 'marieOuCohabitant', revenusConjoint: 'autresMax290', enfantsACharge: '2', parentIsole: true }))
    expect(r.ok && r.sens === 'brutVersNet' && r.situation).toMatchObject({ revenusConjoint: 'autresMax290', parentIsole: false })
  })

  it('normalise aussi la situation familiale en net → brut', () => {
    const r = validerSaisie(saisie({ sens: 'netVersBrut', revenusConjoint: 'superieurs', parentIsole: true, enfantsACharge: '0' }))
    expect(r.ok && r.sens === 'netVersBrut' && r.famille).toEqual(ISOLE_SANS_ENFANT)
  })

  it('désactive parent isolé sans enfant', () => {
    const r = validerSaisie(saisie({ parentIsole: true, enfantsACharge: '0' }))
    expect(r.ok && r.sens === 'brutVersNet' && r.situation.parentIsole).toBe(false)
  })

  it('garde parent isolé pour un isolé avec enfant', () => {
    const r = validerSaisie(saisie({ parentIsole: true, enfantsACharge: '1' }))
    expect(r.ok && r.sens === 'brutVersNet' && r.situation.parentIsole).toBe(true)
  })
})
```

- [ ] **Step 2 : Réécrire les tests de mémorisation**

Remplacer tout le contenu de `src/hooks/useSaisie.test.ts` par :

```ts
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SAISIE_PAR_DEFAUT } from '../engine/validation'
import { CLE_STOCKAGE, CLE_STOCKAGE_V1, lireSaisieStockee, useSaisie } from './useSaisie'

const V1 = { brut: '2500', etatCivil: 'marieOuCohabitant', revenusConjoint: 'superieurs', enfantsACharge: '2', parentIsole: false }

describe('lireSaisieStockee', () => {
  it('utilise les clés v2 (écriture) et v1 (reprise)', () => {
    expect(CLE_STOCKAGE).toBe('wage-calculator:saisie:v2')
    expect(CLE_STOCKAGE_V1).toBe('wage-calculator:saisie:v1')
  })

  it('renvoie la saisie par défaut si rien n’est stocké', () => {
    expect(lireSaisieStockee()).toEqual(SAISIE_PAR_DEFAUT)
  })

  it('restaure une saisie v2 valide', () => {
    const stockee = { ...SAISIE_PAR_DEFAUT, sens: 'netVersBrut', montant: '2500', montantAvantBascule: '3000' }
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(stockee))
    expect(lireSaisieStockee()).toEqual(stockee)
  })

  it('reprend une saisie v1 en brut → net', () => {
    localStorage.setItem(CLE_STOCKAGE_V1, JSON.stringify(V1))
    expect(lireSaisieStockee()).toEqual({
      sens: 'brutVersNet',
      montant: '2500',
      montantAvantBascule: null,
      etatCivil: 'marieOuCohabitant',
      revenusConjoint: 'superieurs',
      enfantsACharge: '2',
      parentIsole: false,
    })
  })

  it('préfère la clé v2 à la clé v1', () => {
    localStorage.setItem(CLE_STOCKAGE_V1, JSON.stringify(V1))
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, montant: '4200' }))
    expect(lireSaisieStockee().montant).toBe('4200')
  })

  it('se rabat sur la clé v1 si la clé v2 est corrompue', () => {
    localStorage.setItem(CLE_STOCKAGE, '{corrompu')
    localStorage.setItem(CLE_STOCKAGE_V1, JSON.stringify(V1))
    expect(lireSaisieStockee().montant).toBe('2500')
  })

  it.each([
    'pas du json',
    '{"montant":2500}',
    JSON.stringify({ ...SAISIE_PAR_DEFAUT, revenusConjoint: 'inconnu' }),
    JSON.stringify({ ...SAISIE_PAR_DEFAUT, sens: 'autre' }),
    JSON.stringify({ ...SAISIE_PAR_DEFAUT, montantAvantBascule: 3000 }),
  ])('ignore un contenu v2 invalide : %s', (contenu) => {
    localStorage.setItem(CLE_STOCKAGE, contenu)
    expect(lireSaisieStockee()).toEqual(SAISIE_PAR_DEFAUT)
  })

  it.each(['pas du json', '{"brut":2500}', JSON.stringify({ ...V1, etatCivil: 'inconnu' })])('ignore un contenu v1 invalide : %s', (contenu) => {
    localStorage.setItem(CLE_STOCKAGE_V1, contenu)
    expect(lireSaisieStockee()).toEqual(SAISIE_PAR_DEFAUT)
  })

  it('résiste à un localStorage inaccessible', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqué')
    })
    expect(lireSaisieStockee()).toEqual(SAISIE_PAR_DEFAUT)
  })
})

describe('useSaisie', () => {
  it('mémorise chaque modification dans la clé v2', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.modifier('montant', '4200'))
    expect(result.current.saisie.montant).toBe('4200')
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE) ?? '{}')).toMatchObject({ montant: '4200', sens: 'brutVersNet' })
  })

  it('ne réécrit pas la clé v1', () => {
    localStorage.setItem(CLE_STOCKAGE_V1, JSON.stringify(V1))
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.modifier('montant', '4200'))
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE_V1) ?? '{}')).toEqual(V1)
  })

  it('continue de fonctionner si l’écriture échoue', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.modifier('montant', '4200'))
    expect(result.current.saisie.montant).toBe('4200')
  })
})
```

- [ ] **Step 3 : Écrire les tests des états du calcul**

Créer `src/hooks/useCalcul.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { calculerNet } from '../engine/calculerNet'
import { SAISIE_PAR_DEFAUT, type SaisieFormulaire } from '../engine/validation'
import { calculerEtat } from './useCalcul'

const DATE = '2026-09-14'
const RMMMG = 223_361

function saisie(modif: Partial<SaisieFormulaire>): SaisieFormulaire {
  return { ...SAISIE_PAR_DEFAUT, ...modif }
}

describe('calculerEtat', () => {
  it('brut → net : calcule le net du brut saisi', () => {
    const etat = calculerEtat(SAISIE_PAR_DEFAUT, DATE)
    expect(etat).toMatchObject({ etat: 'ok', sens: 'brutVersNet', brutCentimes: 300_000, netCibleCentimes: null, rmmmgCentimes: RMMMG })
    expect(etat.etat === 'ok' && etat.resultat.netMensuelCentimes).toBe(226_133)
  })

  it('net → brut : trouve le plus petit brut et garde la cible', () => {
    const etat = calculerEtat(saisie({ sens: 'netVersBrut', montant: '2261,33' }), DATE)
    expect(etat).toMatchObject({ etat: 'ok', sens: 'netVersBrut', brutCentimes: 299_996, netCibleCentimes: 226_133, rmmmgCentimes: RMMMG })
    expect(etat.etat === 'ok' && etat.resultat).toEqual(
      calculerNet({ brutMensuelCentimes: 299_996, etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false }, DATE),
    )
  })

  it('net → brut : signale un net au-delà du maximum atteignable', () => {
    expect(calculerEtat(saisie({ sens: 'netVersBrut', montant: '50000' }), DATE)).toEqual({ etat: 'netHorsLimites', netMaxCentimes: 4_146_374 })
  })

  it.each(['brutVersNet', 'netVersBrut'] as const)('%s : renvoie les erreurs de saisie', (sens) => {
    expect(calculerEtat(saisie({ sens, montant: '' }), DATE)).toEqual({ etat: 'saisieInvalide', erreurs: { montant: 'montantVide' } })
  })

  it.each(['brutVersNet', 'netVersBrut'] as const)('%s : signale une période non couverte', (sens) => {
    expect(calculerEtat(saisie({ sens }), '2027-01-15')).toEqual({ etat: 'periodeNonCouverte', dateIso: '2027-01-15' })
  })
})
```

- [ ] **Step 4 : Adapter le test d'interface sur la saisie mémorisée**

Dans `src/App.test.tsx`, remplacer :

```ts
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, brut: '2500' }))
```

par :

```ts
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, montant: '2500' }))
```

- [ ] **Step 5 : Vérifier qu'ils échouent**

Run : `npx vitest run src/engine/validation.test.ts src/hooks/useSaisie.test.ts src/hooks/useCalcul.test.ts`
Expected : FAIL. Par exemple, `CLE_STOCKAGE_V1` n'est pas exporté, `sens` est absent du résultat de validation, et `netHorsLimites` n'est jamais renvoyé.

- [ ] **Step 6 : Réécrire la validation**

Remplacer tout le contenu de `src/engine/validation.ts` par :

```ts
import { eurosTexteEnCentimes } from './argent'
import type { SituationFamiliale } from './calculerBrut'
import { BRUT_MAX_CENTIMES, type EtatCivil, type RevenusConjoint, type Situation } from './types'

export const SENS_CALCUL = ['brutVersNet', 'netVersBrut'] as const

/** Sens du calcul : du brut saisi vers le net, ou du net souhaité vers le brut. */
export type SensCalcul = (typeof SENS_CALCUL)[number]

/** Valeurs brutes du formulaire, telles que tapées. */
export interface SaisieFormulaire {
  sens: SensCalcul
  /** Brut ou net mensuel selon le sens. */
  montant: string
  /** Montant quitté lors de la dernière bascule, tant qu'il n'a pas été modifié (spec net → brut § 4.3). */
  montantAvantBascule: string | null
  etatCivil: EtatCivil
  /** Conservé même si isolé, pour retrouver le choix si on rebascule. */
  revenusConjoint: RevenusConjoint
  enfantsACharge: string
  parentIsole: boolean
}

export type CodeErreur = 'montantVide' | 'montantFormat' | 'montantHorsLimites' | 'enfantsInvalide'

export interface ErreursSaisie {
  montant?: CodeErreur
  enfantsACharge?: CodeErreur
}

export type ResultatValidation =
  | { ok: true; sens: 'brutVersNet'; situation: Situation }
  | { ok: true; sens: 'netVersBrut'; famille: SituationFamiliale; netCibleCentimes: number }
  | { ok: false; erreurs: ErreursSaisie }

export const ENFANTS_MAX = 10

export const SAISIE_PAR_DEFAUT: SaisieFormulaire = {
  sens: 'brutVersNet',
  montant: '3000',
  montantAvantBascule: null,
  etatCivil: 'isole',
  revenusConjoint: 'aucun',
  enfantsACharge: '0',
  parentIsole: false,
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

  if (montant === null || erreurs.montant || erreurs.enfantsACharge) {
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
    return { ok: true, sens: 'netVersBrut', famille, netCibleCentimes: montant }
  }
  return { ok: true, sens: 'brutVersNet', situation: { brutMensuelCentimes: montant, ...famille } }
}
```

- [ ] **Step 7 : Réécrire la mémorisation**

Remplacer tout le contenu de `src/hooks/useSaisie.ts` par :

```ts
import { useCallback, useEffect, useState } from 'react'
import { REVENUS_CONJOINT } from '../engine/types'
import { SAISIE_PAR_DEFAUT, SENS_CALCUL, type SaisieFormulaire } from '../engine/validation'

export const CLE_STOCKAGE = 'wage-calculator:saisie:v2'
/** Format de la V1 (brut → net uniquement) : lu une fois pour reprendre la saisie, jamais réécrit. */
export const CLE_STOCKAGE_V1 = 'wage-calculator:saisie:v1'

type Objet = Record<string, unknown>
type ChampsFamille = Pick<SaisieFormulaire, 'etatCivil' | 'revenusConjoint' | 'enfantsACharge' | 'parentIsole'>

function estObjet(valeur: unknown): valeur is Objet {
  return typeof valeur === 'object' && valeur !== null
}

function aSituationFamiliale(v: Objet): boolean {
  return (
    (v.etatCivil === 'isole' || v.etatCivil === 'marieOuCohabitant') &&
    typeof v.revenusConjoint === 'string' &&
    (REVENUS_CONJOINT as readonly string[]).includes(v.revenusConjoint) &&
    typeof v.enfantsACharge === 'string' &&
    typeof v.parentIsole === 'boolean'
  )
}

function estSaisie(valeur: unknown): valeur is SaisieFormulaire {
  return (
    estObjet(valeur) &&
    aSituationFamiliale(valeur) &&
    typeof valeur.sens === 'string' &&
    (SENS_CALCUL as readonly string[]).includes(valeur.sens) &&
    typeof valeur.montant === 'string' &&
    (valeur.montantAvantBascule === null || typeof valeur.montantAvantBascule === 'string')
  )
}

/** Saisie V1 ({ brut, etatCivil, … }) → saisie V2 en brut → net, ou null si invalide. */
function repriseV1(valeur: unknown): SaisieFormulaire | null {
  if (!estObjet(valeur) || !aSituationFamiliale(valeur) || typeof valeur.brut !== 'string') {
    return null
  }
  const v1 = valeur as ChampsFamille & { brut: string }
  return {
    sens: 'brutVersNet',
    montant: v1.brut,
    montantAvantBascule: null,
    etatCivil: v1.etatCivil,
    revenusConjoint: v1.revenusConjoint,
    enfantsACharge: v1.enfantsACharge,
    parentIsole: v1.parentIsole,
  }
}

/** Contenu JSON d'une clé, ou null si absente, illisible ou inaccessible. */
function lireCle(cle: string): unknown {
  try {
    const texte = localStorage.getItem(cle)
    return texte === null ? null : JSON.parse(texte)
  } catch {
    return null
  }
}

/** Saisie mémorisée (v2, sinon reprise v1), ou saisie par défaut. */
export function lireSaisieStockee(): SaisieFormulaire {
  const v2 = lireCle(CLE_STOCKAGE)
  if (estSaisie(v2)) {
    return v2
  }
  return repriseV1(lireCle(CLE_STOCKAGE_V1)) ?? SAISIE_PAR_DEFAUT
}

export function useSaisie() {
  const [saisie, setSaisie] = useState<SaisieFormulaire>(lireSaisieStockee)

  useEffect(() => {
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(saisie))
    } catch {
      // Stockage indisponible (navigation privée, quota) : l'app fonctionne sans mémoriser.
    }
  }, [saisie])

  const modifier = useCallback(<K extends keyof SaisieFormulaire>(champ: K, valeur: SaisieFormulaire[K]) => {
    setSaisie((precedente) => ({ ...precedente, [champ]: valeur }))
  }, [])

  return { saisie, modifier }
}
```

- [ ] **Step 8 : Réécrire les états du calcul**

Remplacer tout le contenu de `src/hooks/useCalcul.ts` par :

```ts
import { useMemo } from 'react'
import { calculerBrut } from '../engine/calculerBrut'
import { calculerNet } from '../engine/calculerNet'
import { getParametres } from '../engine/parametres'
import { NetHorsLimites, PeriodeNonCouverte, type Resultat } from '../engine/types'
import { validerSaisie, type ErreursSaisie, type SaisieFormulaire, type SensCalcul } from '../engine/validation'

export type EtatCalcul =
  | {
      etat: 'ok'
      sens: SensCalcul
      resultat: Resultat
      brutCentimes: number
      /** null en brut → net. */
      netCibleCentimes: number | null
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
  try {
    if (validation.sens === 'netVersBrut') {
      const inverse = calculerBrut(validation.famille, validation.netCibleCentimes, dateIso)
      return {
        etat: 'ok',
        sens: 'netVersBrut',
        resultat: inverse.resultat,
        brutCentimes: inverse.brutCentimes,
        netCibleCentimes: inverse.netCibleCentimes,
        rmmmgCentimes: getParametres(dateIso).rmmmgCentimes,
      }
    }
    return {
      etat: 'ok',
      sens: 'brutVersNet',
      resultat: calculerNet(validation.situation, dateIso),
      brutCentimes: validation.situation.brutMensuelCentimes,
      netCibleCentimes: null,
      rmmmgCentimes: getParametres(dateIso).rmmmgCentimes,
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

- [ ] **Step 9 : Adapter les textes d'erreur**

Dans `src/i18n/fr.ts` :

1. Remplacer la ligne d'import :

```ts
import type { CodeErreur } from '../engine/validation'
```

par :

```ts
import type { CodeErreur, SensCalcul } from '../engine/validation'
```

2. Dans `formulaire`, remplacer :

```ts
    brut: 'Salaire brut mensuel (€)',
```

par :

```ts
    montant: {
      brutVersNet: 'Salaire brut mensuel (€)',
      netVersBrut: 'Salaire net mensuel souhaité (€)',
    } satisfies Record<SensCalcul, string>,
```

3. Remplacer tout le bloc `erreurs: { … } satisfies Record<CodeErreur, string>,` par :

```ts
  erreurs: {
    montantVide: {
      brutVersNet: 'Indiquez votre salaire brut mensuel.',
      netVersBrut: 'Indiquez le salaire net mensuel souhaité.',
    },
    montantFormat: 'Montant invalide : utilisez des chiffres, avec au maximum 2 décimales (ex. 3000,50).',
    montantHorsLimites: 'Le montant doit être compris entre 0,01 € et 100 000 €.',
    enfantsInvalide: 'Indiquez un nombre entier entre 0 et 10.',
  } satisfies Record<CodeErreur, string | Record<SensCalcul, string>>,
```

4. Ajouter à la fin du fichier, après l'objet `fr` :

```ts
/** Message d'une erreur de saisie, adapté au sens du calcul quand il le faut. */
export function texteErreur(code: CodeErreur, sens: SensCalcul): string {
  const texte = fr.erreurs[code]
  return typeof texte === 'string' ? texte : texte[sens]
}
```

- [ ] **Step 10 : Renommer le champ dans le formulaire**

Dans `src/components/FormulaireSituation.tsx` :

1. Remplacer la ligne d'import :

```ts
import { fr } from '../i18n/fr'
```

par :

```ts
import { fr, texteErreur } from '../i18n/fr'
```

2. Remplacer le premier bloc `<div>` du formulaire (le champ brut, de `<label htmlFor="brut"` jusqu'à la ligne `{erreurs.brut && …}` incluse, avec le `<div>` qui l'entoure) par :

```tsx
        <div>
          <label htmlFor="montant" className="font-medium">
            {t.montant[saisie.sens]}
          </label>
          <input
            id="montant"
            inputMode="decimal"
            autoComplete="off"
            value={saisie.montant}
            onChange={(e) => onChange('montant', e.target.value)}
            aria-invalid={erreurs.montant ? true : undefined}
            aria-describedby={erreurs.montant ? 'montant-erreur' : undefined}
            className={CHAMP}
          />
          {erreurs.montant && <Erreur id="montant-erreur">{texteErreur(erreurs.montant, saisie.sens)}</Erreur>}
        </div>
```

3. Remplacer :

```tsx
          {erreurs.enfantsACharge && <Erreur id="enfants-erreur">{fr.erreurs[erreurs.enfantsACharge]}</Erreur>}
```

par :

```tsx
          {erreurs.enfantsACharge && <Erreur id="enfants-erreur">{texteErreur(erreurs.enfantsACharge, saisie.sens)}</Erreur>}
```

- [ ] **Step 11 : Vérifier qu'ils passent**

Run : `npm test; npm run typecheck; npm run lint`
Expected : tout au vert. Les tests `App.test.tsx` existants passent sans autre modification : le libellé « Salaire brut mensuel (€) » et le message « Indiquez votre salaire brut mensuel. » sont inchangés en brut → net.

- [ ] **Step 12 : Commit**

```powershell
git add src/engine/validation.ts src/engine/validation.test.ts src/hooks/useSaisie.ts src/hooks/useSaisie.test.ts src/hooks/useCalcul.ts src/hooks/useCalcul.test.ts src/i18n/fr.ts src/components/FormulaireSituation.tsx src/App.test.tsx
git commit -m @'
feat: saisie à deux sens, reprise de la saisie v1 et état netHorsLimites

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
'@
```

---

### Task 4 : Bascule de sens mémorisée

**Files:**
- Modify: `src/utils/format.ts` (ajout de `centimesEnSaisie`)
- Test: `src/utils/format.test.ts`
- Modify: `src/hooks/useSaisie.ts` (fonction `useSaisie`)
- Test: `src/hooks/useSaisie.test.ts` (ajout d'un bloc `describe`)

**Interfaces:**
- Consumes : `useSaisie` et `SaisieFormulaire` (tâche 3) ; `eurosTexteEnCentimes` (`src/engine/argent.ts`).
- Produces :
  - `format.ts` : `export function centimesEnSaisie(centimes: number): string`.
  - `useSaisie()` renvoie en plus `basculerSens: (montantRepris: string | null) => void`, et `modifier('montant', …)` remet `montantAvantBascule` à `null`.

- [ ] **Step 1 : Écrire les tests de format**

Dans `src/utils/format.test.ts`, remplacer la ligne d'import de `./format` par :

```ts
import { eurosTexteEnCentimes } from '../engine/argent'
import { centimesEnSaisie, dateIsoLocale, formatDateFr, formatEuro, formatPourcentage } from './format'
```

et ajouter à la fin du bloc `describe('format', …)`, avant la dernière accolade `})` :

```ts
  it.each([
    [226_133, '2261,33'],
    [300_000, '3000'],
    [5, '0,05'],
    [50, '0,50'],
    [1_234_510, '12345,10'],
    [10_000_000, '100000'],
  ])('écrit %i centimes comme une saisie : « %s »', (centimes, texte) => {
    expect(centimesEnSaisie(centimes)).toBe(texte)
  })

  it('produit un texte que le formulaire relit à l’identique', () => {
    for (const centimes of [1, 99, 100, 101, 226_133, 299_996, 10_000_000]) {
      expect(eurosTexteEnCentimes(centimesEnSaisie(centimes))).toBe(centimes)
    }
  })
```

- [ ] **Step 2 : Écrire les tests de bascule**

Ajouter à la fin de `src/hooks/useSaisie.test.ts` :

```ts
describe('useSaisie — bascule de sens', () => {
  it('reprend le montant fourni et garde le montant quitté', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.basculerSens('2261,33'))
    expect(result.current.saisie).toMatchObject({ sens: 'netVersBrut', montant: '2261,33', montantAvantBascule: '3000' })
  })

  it('restaure exactement le montant d’origine au retour, sans modification', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.basculerSens('2261,33'))
    act(() => result.current.basculerSens('2999,96'))
    expect(result.current.saisie).toMatchObject({ sens: 'brutVersNet', montant: '3000', montantAvantBascule: '2261,33' })
    act(() => result.current.basculerSens('2261,33'))
    expect(result.current.saisie).toMatchObject({ sens: 'netVersBrut', montant: '2261,33', montantAvantBascule: '3000' })
  })

  it('reprend le résultat si le montant a été modifié après la bascule', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.basculerSens('2261,33'))
    act(() => result.current.modifier('montant', '2500'))
    expect(result.current.saisie.montantAvantBascule).toBeNull()
    act(() => result.current.basculerSens('3322,15'))
    expect(result.current.saisie).toMatchObject({ sens: 'brutVersNet', montant: '3322,15', montantAvantBascule: '2500' })
  })

  it('garde le montant quitté si un autre champ change', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.basculerSens('2261,33'))
    act(() => result.current.modifier('enfantsACharge', '2'))
    expect(result.current.saisie.montantAvantBascule).toBe('3000')
  })

  it('garde le montant tapé si aucun résultat n’est disponible', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.modifier('montant', 'abc'))
    act(() => result.current.basculerSens(null))
    expect(result.current.saisie).toMatchObject({ sens: 'netVersBrut', montant: 'abc', montantAvantBascule: 'abc' })
  })

  it('mémorise le sens et le montant quitté', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.basculerSens('2261,33'))
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE) ?? '{}')).toMatchObject({
      sens: 'netVersBrut',
      montant: '2261,33',
      montantAvantBascule: '3000',
    })
  })
})
```

- [ ] **Step 3 : Vérifier qu'ils échouent**

Run : `npx vitest run src/utils/format.test.ts src/hooks/useSaisie.test.ts`
Expected : FAIL, avec « centimesEnSaisie is not a function » et « result.current.basculerSens is not a function ».

- [ ] **Step 4 : Implémenter `centimesEnSaisie`**

Ajouter à la fin de `src/utils/format.ts` :

```ts
/** 226133 → « 2261,33 » ; 300000 → « 3000 ». Montant réinjectable dans un champ de saisie. */
export function centimesEnSaisie(centimes: number): string {
  const reste = centimes % 100
  const euros = (centimes - reste) / 100
  return reste === 0 ? String(euros) : `${euros},${String(reste).padStart(2, '0')}`
}
```

- [ ] **Step 5 : Implémenter la bascule**

Dans `src/hooks/useSaisie.ts`, remplacer le bloc de la fonction `modifier` et le `return` de `useSaisie` :

```ts
  const modifier = useCallback(<K extends keyof SaisieFormulaire>(champ: K, valeur: SaisieFormulaire[K]) => {
    setSaisie((precedente) => ({ ...precedente, [champ]: valeur }))
  }, [])

  return { saisie, modifier }
```

par :

```ts
  const modifier = useCallback(<K extends keyof SaisieFormulaire>(champ: K, valeur: SaisieFormulaire[K]) => {
    setSaisie((precedente) => ({
      ...precedente,
      [champ]: valeur,
      // Un montant retapé n'est plus « celui d'avant la bascule » : la bascule suivante reprendra le résultat.
      ...(champ === 'montant' ? { montantAvantBascule: null } : {}),
    }))
  }, [])

  /**
   * Change de sens. Nouveau montant : le montant d'avant la bascule s'il n'a pas été modifié
   * (aller-retour exact), sinon montantRepris (le résultat affiché), sinon le montant actuel.
   */
  const basculerSens = useCallback((montantRepris: string | null) => {
    setSaisie((precedente) => ({
      ...precedente,
      sens: precedente.sens === 'brutVersNet' ? 'netVersBrut' : 'brutVersNet',
      montant: precedente.montantAvantBascule ?? montantRepris ?? precedente.montant,
      montantAvantBascule: precedente.montant,
    }))
  }, [])

  return { saisie, modifier, basculerSens }
```

- [ ] **Step 6 : Vérifier qu'ils passent**

Run : `npm test; npm run typecheck; npm run lint`
Expected : tout au vert.

- [ ] **Step 7 : Commit**

```powershell
git add src/utils/format.ts src/utils/format.test.ts src/hooks/useSaisie.ts src/hooks/useSaisie.test.ts
git commit -m @'
feat: bascule de sens avec retour exact au montant d'origine

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
'@
```

---

### Task 5 : Interface net → brut

**Files:**
- Modify: `src/i18n/fr.ts` (sous-titre, `formulaire`, `recapitulatif`, `detail`)
- Modify: `src/components/FormulaireSituation.tsx`
- Modify: `src/components/Recapitulatif.tsx` (réécriture complète)
- Modify: `src/components/LigneCalcul.tsx`
- Modify: `src/components/DetailCalcul.tsx` (réécriture complète)
- Modify: `src/components/Avertissements.tsx`
- Modify: `src/App.tsx` (réécriture complète)
- Test: `src/App.test.tsx` (ajout d'un bloc `describe`)

**Interfaces:**
- Consumes : `useSaisie(): { saisie; modifier; basculerSens }` (tâche 4) ; `EtatCalcul` (tâche 3) ; `centimesEnSaisie` (tâche 4) ; `calculerBrut` (tâche 1) ; `SENS_CALCUL`, `SensCalcul` (tâche 3) ; `texteErreur` (tâche 3).
- Produces :
  - `FormulaireSituation` props : `{ saisie; erreurs; netMaxCentimes: number | null; onChange; onBasculerSens: () => void }`.
  - `Recapitulatif` props : `{ sens: SensCalcul; resultat: Resultat | null; brutCentimes: number | null; netCibleCentimes: number | null }`.
  - `DetailCalcul` props : `{ sens: SensCalcul; resultat: Resultat | null }`.
  - `LigneCalcul` props : `{ ligne: Ligne; explication?: string }`.

- [ ] **Step 1 : Écrire les tests d'interface**

Dans `src/App.test.tsx`, remplacer les imports du haut du fichier par :

```ts
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { calculerBrut } from './engine/calculerBrut'
import { calculerNet } from './engine/calculerNet'
import { SAISIE_PAR_DEFAUT } from './engine/validation'
import { CLE_STOCKAGE } from './hooks/useSaisie'
import { centimesEnSaisie, formatEuro } from './utils/format'
```

puis ajouter à la fin du fichier :

```ts
describe('App — net → brut', () => {
  const ISOLE = { etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false } as const
  const LIBELLE_BRUT = 'Salaire brut mensuel (€)'
  const LIBELLE_NET = 'Salaire net mensuel souhaité (€)'
  const recapBrut = () => screen.getByRole('region', { name: 'Votre salaire brut' })

  it('bascule en net → brut en reprenant le net affiché, puis revient au brut d’origine', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)

    await user.click(screen.getByRole('radio', { name: 'Net → brut' }))
    expect(screen.getByLabelText(LIBELLE_NET)).toHaveValue('2261,33')
    expect(within(recapBrut()).getByText(euros(299_996))).toBeInTheDocument()
    expect(within(recapBrut()).getByText(euros(226_133))).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Brut → net' }))
    expect(screen.getByLabelText(LIBELLE_BRUT)).toHaveValue('3000')
    expect(within(recapitulatif()).getByText(euros(226_133))).toBeInTheDocument()
  })

  it('reprend le brut trouvé si le net a été modifié après la bascule', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByRole('radio', { name: 'Net → brut' }))
    const net = screen.getByLabelText(LIBELLE_NET)
    await user.clear(net)
    await user.type(net, '2500')
    const brutTrouve = calculerBrut(ISOLE, 250_000, DATE).brutCentimes
    expect(within(recapBrut()).getByText(euros(brutTrouve))).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Brut → net' }))
    expect(screen.getByLabelText(LIBELLE_BRUT)).toHaveValue(centimesEnSaisie(brutTrouve))
  })

  it('signale un net impossible au centime près', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByRole('radio', { name: 'Net → brut' }))
    const net = screen.getByLabelText(LIBELLE_NET)
    await user.clear(net)
    await user.type(net, '1808,45')
    expect(within(recapBrut()).getByText(euros(180_846))).toBeInTheDocument()
    expect(within(recapBrut()).getByText(`${euros(1)} de plus que demandé : aucun brut ne donne exactement ce net`)).toBeInTheDocument()
  })

  it('refuse un net au-delà du maximum atteignable', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByRole('radio', { name: 'Net → brut' }))
    const net = screen.getByLabelText(LIBELLE_NET)
    await user.clear(net)
    await user.type(net, '50000')
    expect(screen.getByText(`Au-delà de ${euros(4_146_374)} net, le brut nécessaire dépasse 100 000 €.`)).toBeInTheDocument()
    expect(net).toHaveAttribute('aria-invalid', 'true')
    expect(within(screen.getByRole('region', { name: 'Détail du calcul' })).getByText('—')).toBeInTheDocument()
    expect(screen.getByText('Corrigez la saisie pour voir le calcul.')).toBeInTheDocument()
  })

  it('demande le net souhaité quand le champ est vide', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByRole('radio', { name: 'Net → brut' }))
    await user.clear(screen.getByLabelText(LIBELLE_NET))
    expect(screen.getByText('Indiquez le salaire net mensuel souhaité.')).toBeInTheDocument()
  })

  it('explique que le brut affiché est le plus petit qui atteint le net', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByRole('radio', { name: 'Net → brut' }))
    await user.click(screen.getByRole('button', { name: 'Explication : Salaire brut' }))
    expect(screen.getByText('Le plus petit brut mensuel qui donne au moins le net demandé.')).toBeVisible()
  })

  it('avertit quand le brut trouvé est sous le salaire minimum', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByRole('radio', { name: 'Net → brut' }))
    const net = screen.getByLabelText(LIBELLE_NET)
    await user.clear(net)
    await user.type(net, '1800')
    expect(screen.getByText(/inférieur au salaire minimum légal/)).toBeInTheDocument()
  })

  it('restaure le sens mémorisé', () => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, sens: 'netVersBrut', montant: '2500' }))
    render(<App dateIso={DATE} />)
    expect(screen.getByRole('radio', { name: 'Net → brut' })).toBeChecked()
    expect(screen.getByLabelText(LIBELLE_NET)).toHaveValue('2500')
  })

  it('vérifie l’exemple par le moteur : le brut trouvé redonne le net demandé', () => {
    expect(calculerNet({ ...ISOLE, brutMensuelCentimes: 299_996 }, DATE).netMensuelCentimes).toBe(226_133)
  })
})
```

- [ ] **Step 2 : Vérifier qu'ils échouent**

Run : `npx vitest run src/App.test.tsx`
Expected : FAIL sur les nouveaux tests, avec « Unable to find an accessible element with the role "radio" and name "Net → brut" ». Les tests existants restent verts.

- [ ] **Step 3 : Ajouter les textes**

Dans `src/i18n/fr.ts` :

1. Remplacer :

```ts
  sousTitre: 'Du brut au net pour un employé à temps plein',
```

par :

```ts
  sousTitre: 'Du brut au net, ou du net au brut, pour un employé à temps plein',
```

2. Dans `formulaire`, juste après `titre: 'Votre situation',`, ajouter :

```ts
    sens: 'Sens du calcul',
    sensOptions: { brutVersNet: 'Brut → net', netVersBrut: 'Net → brut' } satisfies Record<SensCalcul, string>,
    netHorsLimites: (netMax: string) => `Au-delà de ${netMax} net, le brut nécessaire dépasse 100 000 €.`,
```

3. Remplacer tout le bloc `recapitulatif: { … },` par :

```ts
  recapitulatif: {
    titre: { brutVersNet: 'Votre salaire net', netVersBrut: 'Votre salaire brut' } satisfies Record<SensCalcul, string>,
    netMensuel: 'Net mensuel',
    netAnnuel: 'Net annuel (× 12)',
    brutNecessaire: 'Brut mensuel nécessaire',
    netObtenu: 'Net obtenu',
    ecart: (montant: string) => `${montant} de plus que demandé : aucun brut ne donne exactement ce net`,
    brutAnnuel: 'Brut annuel (× 12)',
    horsExtras: 'Hors 13e mois et pécule de vacances',
    tauxRetour: 'Taux de retour',
    periode: (du: string, au: string) => `Règles en vigueur du ${du} au ${au}`,
  },
```

4. Dans `detail`, après `source: 'Source',`, ajouter :

```ts
    explicationBrutTrouve: 'Le plus petit brut mensuel qui donne au moins le net demandé.',
```

- [ ] **Step 4 : Ajouter la bascule et le message au formulaire**

Dans `src/components/FormulaireSituation.tsx` :

1. Remplacer les lignes d'import et l'interface `Props` :

```ts
import type { ReactNode } from 'react'
import { REVENUS_CONJOINT, type RevenusConjoint } from '../engine/types'
import type { ErreursSaisie, SaisieFormulaire } from '../engine/validation'
import { fr, texteErreur } from '../i18n/fr'

interface Props {
  saisie: SaisieFormulaire
  erreurs: ErreursSaisie
  onChange: <K extends keyof SaisieFormulaire>(champ: K, valeur: SaisieFormulaire[K]) => void
}
```

par :

```ts
import type { ReactNode } from 'react'
import { REVENUS_CONJOINT, type RevenusConjoint } from '../engine/types'
import { SENS_CALCUL, type ErreursSaisie, type SaisieFormulaire } from '../engine/validation'
import { fr, texteErreur } from '../i18n/fr'
import { formatEuro } from '../utils/format'

interface Props {
  saisie: SaisieFormulaire
  erreurs: ErreursSaisie
  /** Net maximal atteignable si le net demandé le dépasse, sinon null. */
  netMaxCentimes: number | null
  onChange: <K extends keyof SaisieFormulaire>(champ: K, valeur: SaisieFormulaire[K]) => void
  onBasculerSens: () => void
}
```

2. Remplacer la signature :

```tsx
export function FormulaireSituation({ saisie, erreurs, onChange }: Props) {
```

par :

```tsx
export function FormulaireSituation({ saisie, erreurs, netMaxCentimes, onChange, onBasculerSens }: Props) {
```

et, juste après la ligne `const afficherParentIsole = …`, ajouter :

```tsx
  const erreurMontant = erreurs.montant
    ? texteErreur(erreurs.montant, saisie.sens)
    : netMaxCentimes !== null
      ? t.netHorsLimites(formatEuro(netMaxCentimes))
      : null
```

3. Remplacer le bloc du champ montant (le premier `<div>` dans `<form>`, écrit à la tâche 3) par la bascule suivie du champ :

```tsx
        <fieldset>
          <legend className="font-medium">{t.sens}</legend>
          <div className="mt-2 inline-flex rounded-lg border border-slate-300 p-1 dark:border-slate-600">
            {SENS_CALCUL.map((valeur) => (
              <label
                key={valeur}
                className="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium has-checked:bg-blue-700 has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-blue-600"
              >
                <input
                  type="radio"
                  name="sens"
                  value={valeur}
                  checked={saisie.sens === valeur}
                  onChange={onBasculerSens}
                  className="sr-only"
                />
                {t.sensOptions[valeur]}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="montant" className="font-medium">
            {t.montant[saisie.sens]}
          </label>
          <input
            id="montant"
            inputMode="decimal"
            autoComplete="off"
            value={saisie.montant}
            onChange={(e) => onChange('montant', e.target.value)}
            aria-invalid={erreurMontant ? true : undefined}
            aria-describedby={erreurMontant ? 'montant-erreur' : undefined}
            className={CHAMP}
          />
          {erreurMontant && <Erreur id="montant-erreur">{erreurMontant}</Erreur>}
        </div>
```

- [ ] **Step 5 : Réécrire le récapitulatif**

Remplacer tout le contenu de `src/components/Recapitulatif.tsx` par :

```tsx
import type { Resultat } from '../engine/types'
import type { SensCalcul } from '../engine/validation'
import { fr } from '../i18n/fr'
import { formatDateFr, formatEuro, formatPourcentage } from '../utils/format'

interface Props {
  sens: SensCalcul
  resultat: Resultat | null
  brutCentimes: number | null
  /** Net demandé en net → brut, sinon null. */
  netCibleCentimes: number | null
}

const euros = (centimes: number | null) => (centimes === null ? '—' : formatEuro(centimes))

export function Recapitulatif({ sens, resultat, brutCentimes, netCibleCentimes }: Props) {
  const t = fr.recapitulatif
  const brut = resultat ? brutCentimes : null
  const ecart = resultat && netCibleCentimes !== null ? resultat.netMensuelCentimes - netCibleCentimes : 0

  return (
    <section aria-labelledby="titre-recap" className="rounded-xl bg-blue-700 p-5 text-white shadow-sm dark:bg-blue-900">
      <h2 id="titre-recap" className="text-lg font-semibold">
        {t.titre[sens]}
      </h2>
      {sens === 'brutVersNet' ? (
        <dl className="mt-3 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <dt className="text-sm text-blue-100">{t.netMensuel}</dt>
            <dd className="text-4xl font-bold tabular-nums">{euros(resultat ? resultat.netMensuelCentimes : null)}</dd>
          </div>
          <div>
            <dt className="text-sm text-blue-100">{t.netAnnuel}</dt>
            <dd className="text-xl font-semibold tabular-nums">{euros(resultat ? resultat.netAnnuelCentimes : null)}</dd>
            <dd className="text-xs text-blue-100">{t.horsExtras}</dd>
          </div>
          <div>
            <dt className="text-sm text-blue-100">{t.tauxRetour}</dt>
            <dd className="text-xl font-semibold tabular-nums">{resultat ? formatPourcentage(resultat.tauxRetour) : '—'}</dd>
          </div>
        </dl>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <dt className="text-sm text-blue-100">{t.brutNecessaire}</dt>
            <dd className="text-4xl font-bold tabular-nums">{euros(brut)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-sm text-blue-100">{t.netObtenu}</dt>
            <dd className="text-xl font-semibold tabular-nums">{euros(resultat ? resultat.netMensuelCentimes : null)}</dd>
            {ecart > 0 && <dd className="text-xs text-blue-100">{t.ecart(formatEuro(ecart))}</dd>}
          </div>
          <div>
            <dt className="text-sm text-blue-100">{t.brutAnnuel}</dt>
            <dd className="text-xl font-semibold tabular-nums">{euros(brut === null ? null : brut * 12)}</dd>
            <dd className="text-xs text-blue-100">{t.horsExtras}</dd>
          </div>
          <div>
            <dt className="text-sm text-blue-100">{t.tauxRetour}</dt>
            <dd className="text-xl font-semibold tabular-nums">{resultat ? formatPourcentage(resultat.tauxRetour) : '—'}</dd>
          </div>
        </dl>
      )}
      {resultat && (
        <p className="mt-4 text-xs text-blue-100">
          {t.periode(formatDateFr(resultat.periode.valideDu), formatDateFr(resultat.periode.valideAu))}
        </p>
      )}
    </section>
  )
}
```

- [ ] **Step 6 : Rendre l'explication d'une ligne remplaçable**

Dans `src/components/LigneCalcul.tsx`, remplacer :

```tsx
export function LigneCalcul({ ligne }: { ligne: Ligne }) {
  const { libelle, explication } = fr.lignes[ligne.id]
```

par :

```tsx
/** `explication` remplace le texte par défaut de la ligne (ex. brut trouvé en net → brut). */
export function LigneCalcul({ ligne, explication: explicationRemplacee }: { ligne: Ligne; explication?: string }) {
  const { libelle, explication: explicationParDefaut } = fr.lignes[ligne.id]
  const explication = explicationRemplacee ?? explicationParDefaut
```

- [ ] **Step 7 : Réécrire le détail**

Remplacer tout le contenu de `src/components/DetailCalcul.tsx` par :

```tsx
import type { Resultat } from '../engine/types'
import type { SensCalcul } from '../engine/validation'
import { fr } from '../i18n/fr'
import { LigneCalcul } from './LigneCalcul'

export function DetailCalcul({ sens, resultat }: { sens: SensCalcul; resultat: Resultat | null }) {
  return (
    <section aria-labelledby="titre-detail" className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
      <h2 id="titre-detail" className="mb-2 text-lg font-semibold">
        {fr.detail.titre}
      </h2>
      {resultat ? (
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {resultat.lignes.map((ligne) => (
            <LigneCalcul
              key={ligne.id}
              ligne={ligne}
              explication={sens === 'netVersBrut' && ligne.id === 'brut' ? fr.detail.explicationBrutTrouve : undefined}
            />
          ))}
        </ul>
      ) : (
        <p className="text-slate-500">—</p>
      )}
    </section>
  )
}
```

- [ ] **Step 8 : Afficher le bandeau aussi pour `netHorsLimites`**

Dans `src/components/Avertissements.tsx`, remplacer :

```tsx
      {etat.etat === 'saisieInvalide' && (
```

par :

```tsx
      {(etat.etat === 'saisieInvalide' || etat.etat === 'netHorsLimites') && (
```

- [ ] **Step 9 : Câbler la page**

Remplacer tout le contenu de `src/App.tsx` par :

```tsx
import { Avertissements } from './components/Avertissements'
import { DetailCalcul } from './components/DetailCalcul'
import { FormulaireSituation } from './components/FormulaireSituation'
import { Recapitulatif } from './components/Recapitulatif'
import { useCalcul } from './hooks/useCalcul'
import { useSaisie } from './hooks/useSaisie'
import { fr } from './i18n/fr'
import { centimesEnSaisie, dateIsoLocale } from './utils/format'

interface Props {
  /** Date des règles à appliquer (AAAA-MM-JJ). Par défaut : aujourd'hui. */
  dateIso?: string
}

export default function App({ dateIso = dateIsoLocale(new Date()) }: Props) {
  const { saisie, modifier, basculerSens } = useSaisie()
  const etat = useCalcul(saisie, dateIso)
  const ok = etat.etat === 'ok' ? etat : null
  const erreurs = etat.etat === 'saisieInvalide' ? etat.erreurs : {}
  const netMaxCentimes = etat.etat === 'netHorsLimites' ? etat.netMaxCentimes : null

  /** Au changement de sens, le champ reprend le montant opposé du résultat affiché. */
  function basculer() {
    const montantRepris = ok ? centimesEnSaisie(ok.sens === 'brutVersNet' ? ok.resultat.netMensuelCentimes : ok.brutCentimes) : null
    basculerSens(montantRepris)
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold">{fr.titre}</h1>
          <p className="text-slate-600 dark:text-slate-400">{fr.sousTitre}</p>
        </header>

        <Avertissements etat={etat} />

        <main className="grid gap-6 lg:grid-cols-2">
          <div className="order-2 lg:order-1 lg:row-span-2">
            <FormulaireSituation
              saisie={saisie}
              erreurs={erreurs}
              netMaxCentimes={netMaxCentimes}
              onChange={modifier}
              onBasculerSens={basculer}
            />
          </div>
          <div className="order-1 lg:order-2">
            <Recapitulatif
              sens={saisie.sens}
              resultat={ok?.resultat ?? null}
              brutCentimes={ok?.brutCentimes ?? null}
              netCibleCentimes={ok?.netCibleCentimes ?? null}
            />
          </div>
          <div className="order-3">
            <DetailCalcul sens={saisie.sens} resultat={ok?.resultat ?? null} />
          </div>
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 10 : Vérifier qu'ils passent**

Run : `npm test; npm run typecheck; npm run lint`
Expected : tout au vert, y compris les tests `App` existants (titre « Votre salaire net » en brut → net, erreurs, période non couverte, RMMMG, info-bulle).

- [ ] **Step 11 : Vérifier dans le navigateur**

Run : `npm run dev`, puis ouvrir l'URL affichée.

Vérifier :
- la bascule, à la souris et au clavier (Tab jusqu'au groupe, puis les flèches) ;
- 3000 → Net → brut : le champ affiche 2261,33 et le brut 2 999,96 € ; retour : 3000 ;
- les thèmes clair et sombre (réglage du système) ;
- l'affichage sur mobile, à 400 px de large.

Arrêter le serveur avec Ctrl+C.

- [ ] **Step 12 : Commit**

```powershell
git add src/i18n/fr.ts src/components/FormulaireSituation.tsx src/components/Recapitulatif.tsx src/components/LigneCalcul.tsx src/components/DetailCalcul.tsx src/components/Avertissements.tsx src/App.tsx src/App.test.tsx
git commit -m @'
feat: interface du calcul net → brut (bascule, récapitulatif, messages)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
'@
```

---

### Task 6 : README et vérification finale

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes : le script `verifier:recul` (tâche 2) et toutes les fonctions livrées.
- Produces : la documentation à jour ; la branche `feat/net-vers-brut` prête à être poussée.

- [ ] **Step 1 : Mettre à jour le README**

Dans `README.md` :

1. Remplacer la première phrase :

```markdown
Calculateur brut → net mensuel pour un employé à temps plein en Belgique, exact au centime selon les règles officielles en vigueur du 1er juillet au 31 décembre 2026.
```

par :

```markdown
Calculateur de salaire mensuel pour un employé à temps plein en Belgique, dans les deux sens : du brut au net, ou du net souhaité au brut nécessaire. Exact au centime selon les règles officielles en vigueur du 1er juillet au 31 décembre 2026.
```

2. Dans le tableau des scripts, après la ligne `python tools/reference/reference.py`, ajouter :

```markdown
| `npm run verifier:recul` | mesure le recul maximal du net (à relancer après tout changement de paramètres) |
```

3. À la fin de la section « Comment l'exactitude est vérifiée », ajouter :

```markdown
- Net → brut : `calculerBrut` renvoie le plus petit brut dont le net atteint la cible. Le net ne monte pas toujours avec le brut (arrondis, marche de la cotisation spéciale). La recherche redescend donc jusqu'à ce que le net passe sous « cible − 10 € ». C'est exact tant que le net ne recule jamais de plus de 10 €. `npm run verifier:recul` le mesure sur toutes les situations et tous les bruts au centime, et un test échoue si la mesure manque ou dépasse la marge.
```

4. Dans « Limites de la V1 », remplacer :

```markdown
Employé à temps plein uniquement ; pas d'ouvriers,
```

par :

```markdown
Employé à temps plein uniquement ; le calcul net → brut couvre les mêmes situations que le brut → net. Pas d'ouvriers,
```

- [ ] **Step 2 : Vérification complète**

Run : `npm test; npm run typecheck; npm run lint; npm run build`
Expected : tous les tests passent, sans erreur TypeScript ni de lint, et le build se termine avec « built in ».

- [ ] **Step 3 : Vérifier l'état de la branche**

Run : `git status -sb; git log --oneline main..HEAD`
Expected : la branche `feat/net-vers-brut` est propre, avec le commit de la spec, celui du plan, puis un commit par tâche (tâches 1 à 5) avant ce dernier.

- [ ] **Step 4 : Commit**

```powershell
git add README.md
git commit -m @'
docs: README du calcul net → brut et de l'outil de vérification

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
'@
```

**Ne pas pousser.** Signaler à l'utilisateur que la branche est prête pour le push et le merge.
