# Primes annuelles (V2.5) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** calculer le net du 13e mois et du double pécule de vacances, au barème des allocations exceptionnelles.

**Architecture :** deux modules purs. `allocationsExceptionnelles.ts` applique le barème à un montant qu'on lui donne (brut, retenue sociale, base annuelle) — il ne sait rien des primes. `primesAnnuelles.ts` construit les deux primes depuis la saisie et appelle le barème. `calculerNet`, `calculerBrut` et `remuneration.ts` ne changent pas : le calcul mensuel est intact, et les tests des fiches de paie réelles doivent le prouver.

**Tech Stack :** React 19, TypeScript 6 strict, Vite 8, Tailwind CSS 4, Vitest 4 + jsdom + React Testing Library, oxlint, Node 25, Python 3 (script de référence).

**Spec :** `docs/superpowers/specs/2026-09-23-primes-annuelles-design.md`. La lire avant de commencer, surtout § 1 (règle d'or), § 2 (sources), § 3 (moteur) et § 9 (points ouverts).

## Global Constraints

- Montants en **centimes entiers**, taux en **dix-millièmes entiers**. Aucune virgule flottante dans un calcul d'argent.
- Arrondi : moitié exacte vers l'extérieur de zéro, via `diviserArrondi` et `appliquerTaux` de `src/engine/argent.ts`.
- **Un seul arrondi** pour le précompte d'une allocation : `precompte = arrondi(basePrecompte × taux × (10 000 − réduction) / 10⁸)`.
- Barème 2026 (rémunération annuelle → pourcentage pécule / autres) : 0–0 jusqu'à 10 675,00 € ; 19,17–23,22 jusqu'à 13 660,00 ; 21,20–25,23 jusqu'à 17 375,00 ; 26,25–30,28 jusqu'à 20 840,00 ; 31,30–35,33 jusqu'à 23 580,00 ; 34,33–38,36 jusqu'à 26 340,00 ; 36,34–40,38 jusqu'à 31 830,00 ; 39,37–43,41 jusqu'à 34 640,00 ; 42,39–46,44 jusqu'à 45 860,00 ; 47,44–51,48 jusqu'à 59 900,00 ; 53,50–57,53 au-delà.
- Double pécule = **92 %** de la rémunération mensuelle brute. Retenue de **13,07 %**, sur la part fixée par l'ONSS (paramètre relevé en tâche 1). 13e mois : cotisations ONSS ordinaires, **13,07 %** sur la totalité.
- Les **tests TypeScript vérifient l'arithmétique avec des paramètres explicites ou surchargés** ; les **valeurs réelles du barème** sont vérifiées par le test des paramètres (tâche 1) et par l'oracle Python (tâche 3). Aucun test ne compare un paramètre à lui-même.
- Tous les textes affichés vivent dans `src/i18n/fr.ts`, en français, avec l'apostrophe typographique (’). Le README garde ses apostrophes droites.
- Fichiers en UTF-8, fins de ligne **LF** (`git ls-files --eol` → `w/lf`).
- Aucune nouvelle dépendance npm ou Python.
- Un commit par tâche, message en français, terminé par une ligne vide puis `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Jamais de push ni de merge.
- Avant chaque commit : `npm test`, `npm run typecheck`, `npm run lint` verts.
- Règle d'or : aucune valeur ajustée pour faire tomber un exemple juste. Un écart se documente.
- **Dépendance à la tâche 1.** Toutes les valeurs de test des tâches 4, 5 et 6 supposent que la tranche se choisit sur la **rémunération imposable mensuelle × 12** (pour un brut de 3 000,00 € : base 32 621,28 €, taux 43,41 %). Si la tâche 1 relève une autre base, le contrôleur recalcule ces attendus et les fournit dans les missions concernées : ne les recalcule pas toi-même.

---

## Carte des fichiers

| Fichier | Responsabilité | Tâche |
|---|---|---|
| `src/engine/parametres/types.ts`, `p2025.ts`, `p2026-07.ts` | bloc `allocationsExceptionnelles` (barème, réductions, part du pécule soumise à retenue) | 1 |
| `src/engine/__tests__/reculMax.json` | régénéré : l'empreinte des paramètres change | 1 |
| `src/engine/allocationsExceptionnelles.ts` (+ test) | le barème seul : tranche, taux, précompte, net | 2 |
| `tools/reference/reference.py`, `src/engine/__tests__/referencesAllocations.json` (+ test) | oracle indépendant du barème | 3 |
| `src/engine/primesAnnuelles.ts` (+ test) | les deux primes : brut, prorata, retenue sociale, appel du barème | 4 |
| `src/engine/validation.ts`, `src/hooks/useSaisie.ts`, `src/hooks/useCalcul.ts` | saisie, bornes, sauvegarde v5, base annuelle | 5 |
| `src/components/PrimesAnnuelles.tsx` (nouveau), `FormulaireSituation.tsx`, `src/App.tsx`, `src/i18n/fr.ts` | le panneau, les champs et leurs textes | 6 |
| `README.md`, spec | documentation | 6 |

---

### Task 1 : sources, paramètres du barème et empreinte du recul

**Files:**
- Modify: `src/engine/parametres/types.ts`, `src/engine/parametres/p2025.ts`, `src/engine/parametres/p2026-07.ts`
- Modify: `src/engine/parametres/parametres.test.ts`
- Regenerate: `src/engine/__tests__/reculMax.json` (par l'outil, jamais à la main)
- Modify: `docs/superpowers/specs/2026-09-23-primes-annuelles-design.md` (§ 2, colonne « Statut » ; § 9, points 1 à 4)

**Interfaces:**
- Produces :
```ts
export interface TrancheAllocationExceptionnelle {
  /** Borne supérieure incluse de la base annuelle ; null pour la dernière tranche. */
  jusquaAnnuelCentimes: number | null
  peculeDixMilliemes: number
  autreDixMilliemes: number
}

export interface ParametresAllocationsExceptionnelles {
  tranches: readonly TrancheAllocationExceptionnelle[]
  /** Réduction du précompte, index = nombre d'enfants à charge (0 à 8). */
  reductionEnfantsDixMilliemes: readonly number[]
  /** Par enfant au-delà du dernier index. */
  reductionEnfantSupplementaireDixMilliemes: number
  /** Part du double pécule brut soumise à la retenue de 13,07 % (10 000 = la totalité). */
  partPeculeSoumiseRetenueDixMilliemes: number
}
```
et `Parametres.allocationsExceptionnelles: ParametresAllocationsExceptionnelles`.

- [ ] **Step 1 : relever les sources officielles**

Cherche, cite et note la référence exacte (URL, numéro, date) de chacun des cinq points suivants. Sources à privilégier : SPF Finances (formule-clé du précompte professionnel et ses annexes), Fisconetplus, instructions administratives de l'ONSS sur socialsecurity.be.

1. **Le barème des allocations exceptionnelles 2026** : les onze tranches et les deux colonnes (pécule / autres allocations), telles que listées dans les Global Constraints.
2. **La base qui choisit la tranche.** C'est le point le plus important de la tâche. Le texte parle de « rémunération annuelle brute » ; un calculateur concurrent choisit sa tranche après application des frais professionnels forfaitaires, ce qui déplace le taux de plusieurs tranches (pour un brut de 2 232,88 € : 30,28 % chez lui contre 40,38 % avec la base que ce plan retient). Relève la définition exacte, et un exemple chiffré officiel s'il en existe un.
3. **La table des réductions pour enfants à charge** applicables à ces allocations (pourcentage par nombre d'enfants).
4. **La part du double pécule soumise à la retenue de 13,07 %** : instruction ONSS « La retenue sur le double pécule de vacances du secteur privé ». Une source secondaire évoque 7,38 % ; confirme ou infirme.
5. **Le barème 2025**, nécessaire à la période `P2025`, et le taux de 92 % du double pécule (AR du 30/03/1967).

Règles de décision :
- valeur trouvée et **égale** à ce que prévoit le plan → la citer dans le commentaire du paramètre et dans le § 2 de la spec (« confirmé : <référence> ») ;
- valeur **introuvable** → garder la valeur du plan, écrire « source secondaire : Securex, barème au 05/01/2026 ; texte officiel non trouvé » dans le commentaire et le § 2 ;
- valeur **différente**, ou définition de la base annuelle **autre** que « rémunération imposable mensuelle × 12 », ou barème 2025 introuvable → **ne rien écrire dans le code**, t'arrêter et renvoyer BLOCKED avec la citation. Le contrôleur tranchera.

Écris dans ton rapport, pour chacun des cinq points : la citation, la référence, et ta conclusion.

- [ ] **Step 2 : écrire le test des paramètres (il doit échouer)**

Ajoute à la fin de `src/engine/parametres/parametres.test.ts` :

```ts
describe('barème des allocations exceptionnelles', () => {
  it.each([['2026-07-01'], ['2026-09-14']])('le %s : onze tranches, de 0 %% à 53,50 / 57,53 %%', (date) => {
    const a = getParametres(date).allocationsExceptionnelles
    expect(a.tranches).toHaveLength(11)
    expect(a.tranches[0]).toEqual({ jusquaAnnuelCentimes: 1_067_500, peculeDixMilliemes: 0, autreDixMilliemes: 0 })
    expect(a.tranches[6]).toEqual({ jusquaAnnuelCentimes: 3_183_000, peculeDixMilliemes: 3634, autreDixMilliemes: 4038 })
    expect(a.tranches[10]).toEqual({ jusquaAnnuelCentimes: null, peculeDixMilliemes: 5350, autreDixMilliemes: 5753 })
  })

  it('les tranches sont triées et la dernière est sans borne', () => {
    for (const periode of PERIODES) {
      const t = periode.allocationsExceptionnelles.tranches
      expect(t[t.length - 1].jusquaAnnuelCentimes).toBeNull()
      for (let i = 1; i < t.length - 1; i++) {
        expect(t[i].jusquaAnnuelCentimes!).toBeGreaterThan(t[i - 1].jusquaAnnuelCentimes!)
      }
    }
  })

  it('la réduction pour enfants croît avec le nombre d’enfants et reste un pourcentage', () => {
    for (const periode of PERIODES) {
      const r = periode.allocationsExceptionnelles.reductionEnfantsDixMilliemes
      expect(r[0]).toBe(0)
      for (let i = 1; i < r.length; i++) {
        expect(r[i]).toBeGreaterThanOrEqual(r[i - 1])
        expect(r[i]).toBeLessThanOrEqual(10_000)
      }
    }
  })

  it('la part du double pécule soumise à retenue est un pourcentage', () => {
    for (const periode of PERIODES) {
      const part = periode.allocationsExceptionnelles.partPeculeSoumiseRetenueDixMilliemes
      expect(part).toBeGreaterThan(0)
      expect(part).toBeLessThanOrEqual(10_000)
    }
  })
})
```

Run : `npx vitest run src/engine/parametres/parametres.test.ts`
Expected : FAIL (`allocationsExceptionnelles` est `undefined`).

- [ ] **Step 3 : ajouter le type et les valeurs**

Dans `src/engine/parametres/types.ts`, avant `export interface Parametres`, ajoute les deux interfaces du bloc **Interfaces** ci-dessus, puis dans `interface Parametres`, juste après `avantages: ParametresAvantages`, ajoute :

```ts
  allocationsExceptionnelles: ParametresAllocationsExceptionnelles
```

Dans `src/engine/parametres/p2026-07.ts`, avant le commentaire `// Voiture de société` :

```ts
  // Allocations exceptionnelles 2026 (pécule de vacances, prime de fin d'année) : onze tranches
  // de rémunération annuelle, colonne « pécule » et colonne « autres allocations ».
  // <référence relevée à l'étape 1>
  allocationsExceptionnelles: {
    tranches: [
      { jusquaAnnuelCentimes: 1_067_500, peculeDixMilliemes: 0, autreDixMilliemes: 0 },
      { jusquaAnnuelCentimes: 1_366_000, peculeDixMilliemes: 1917, autreDixMilliemes: 2322 },
      { jusquaAnnuelCentimes: 1_737_500, peculeDixMilliemes: 2120, autreDixMilliemes: 2523 },
      { jusquaAnnuelCentimes: 2_084_000, peculeDixMilliemes: 2625, autreDixMilliemes: 3028 },
      { jusquaAnnuelCentimes: 2_358_000, peculeDixMilliemes: 3130, autreDixMilliemes: 3533 },
      { jusquaAnnuelCentimes: 2_634_000, peculeDixMilliemes: 3433, autreDixMilliemes: 3836 },
      { jusquaAnnuelCentimes: 3_183_000, peculeDixMilliemes: 3634, autreDixMilliemes: 4038 },
      { jusquaAnnuelCentimes: 3_464_000, peculeDixMilliemes: 3937, autreDixMilliemes: 4341 },
      { jusquaAnnuelCentimes: 4_586_000, peculeDixMilliemes: 4239, autreDixMilliemes: 4644 },
      { jusquaAnnuelCentimes: 5_990_000, peculeDixMilliemes: 4744, autreDixMilliemes: 5148 },
      { jusquaAnnuelCentimes: null, peculeDixMilliemes: 5350, autreDixMilliemes: 5753 },
    ],
    // <table relevée à l'étape 1, index = nombre d'enfants à charge, en dix-millièmes>
    reductionEnfantsDixMilliemes: [],
    reductionEnfantSupplementaireDixMilliemes: 0,
    // <part relevée à l'étape 1 : 10 000 si la retenue porte sur la totalité du double pécule>
    partPeculeSoumiseRetenueDixMilliemes: 10_000,
  },
```

Remplace chaque commentaire `<…>` par la valeur et la référence relevées à l'étape 1. Le tableau `reductionEnfantsDixMilliemes` doit commencer par `0` (aucun enfant, aucune réduction) et compter au moins neuf entrées (0 à 8 enfants) : un tableau vide fait échouer le test de l'étape 2.

Dans `src/engine/parametres/p2025.ts`, ajoute le même bloc avec le **barème 2025** relevé à l'étape 1, avant le commentaire `// Voiture de société`. `p2026-09.ts` n'a rien à changer : il reprend `...P2026_07`.

Run : `npx vitest run src/engine/parametres/parametres.test.ts`
Expected : PASS.

- [ ] **Step 4 : vérifier que la garde du recul échoue**

Run : `npx vitest run src/engine/__tests__/reculMax.test.ts`
Expected : FAIL sur les empreintes des trois périodes — les paramètres ont changé. C'est attendu.

- [ ] **Step 5 : relancer la mesure**

Run, **en arrière-plan** (paramètre `run_in_background` de l'outil Bash ; la mesure dure une vingtaine de minutes) : `npm run verifier:recul`

Attends la notification, puis lis la fin de la sortie.
Expected : `reculMaxCentimes` **exactement 514** pour les trois périodes. `calculerNet` n'a pas changé : toute autre valeur signale une erreur ailleurs. Si le nombre diffère, **ne commite pas** : renvoie BLOCKED avec la sortie.

- [ ] **Step 6 : mettre la spec à jour**

Dans `docs/superpowers/specs/2026-09-23-primes-annuelles-design.md` : remplace chaque cellule « Statut » du § 2 par le résultat de l'étape 1, et au § 9, remplace les points 1 à 4 par ce qui a été tranché, en gardant ceux qui restent ouverts.

- [ ] **Step 7 : vérifier et commiter**

Run : `npm test`, `npm run typecheck`, `npm run lint`
Expected : tout vert.

```bash
git add src/engine/parametres src/engine/__tests__/reculMax.json docs/superpowers/specs/2026-09-23-primes-annuelles-design.md
git commit -F - <<'EOF'
feat: barème des allocations exceptionnelles dans les paramètres

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 2 : le module du barème

**Files:**
- Create: `src/engine/allocationsExceptionnelles.ts`
- Test: `src/engine/allocationsExceptionnelles.test.ts`

**Interfaces:**
- Consumes : `Parametres.allocationsExceptionnelles` (tâche 1) ; `diviserArrondi` de `./argent` ; `type SituationFamiliale` de `./calculerBrut`.
- Produces :
```ts
export const TYPES_ALLOCATION = ['pecule', 'autre'] as const
export type TypeAllocation = (typeof TYPES_ALLOCATION)[number]

export interface ResultatAllocation {
  type: TypeAllocation
  brutCentimes: number
  retenueSocialeCentimes: number
  baseAnnuelleCentimes: number
  trancheJusquaCentimes: number | null
  tauxPrecompteDixMilliemes: number
  reductionEnfantsDixMilliemes: number
  precompteCentimes: number
  netCentimes: number
}

export function reductionEnfantsAllocation(enfants: number, p: ParametresAllocationsExceptionnelles): number
export function calculerAllocationExceptionnelle(
  brutCentimes: number,
  retenueSocialeCentimes: number,
  baseAnnuelleCentimes: number,
  type: TypeAllocation,
  famille: SituationFamiliale,
  parametres: Parametres,
): ResultatAllocation
```

Le module ne sait rien des primes : il reçoit un brut, sa retenue sociale déjà calculée et la base annuelle qui choisit la tranche. C'est ce qui rend ses tests indépendants de ce que la tâche 1 aura relevé.

- [ ] **Step 1 : écrire les tests (ils doivent échouer)**

Crée `src/engine/allocationsExceptionnelles.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { calculerAllocationExceptionnelle, reductionEnfantsAllocation } from './allocationsExceptionnelles'
import type { SituationFamiliale } from './calculerBrut'
import { getParametres } from './parametres'
import type { Parametres, ParametresAllocationsExceptionnelles } from './parametres/types'

const SEPT = '2026-09-14'
const P = getParametres(SEPT)

const ISOLE: SituationFamiliale = { etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false, atnMensuelCentimes: 0 }

/** Barème réel, réductions maîtrisées : on vérifie l'arithmétique, pas les valeurs officielles. */
function avecReductions(reductions: number[], supplementaire = 0): Parametres {
  const a: ParametresAllocationsExceptionnelles = {
    ...P.allocationsExceptionnelles,
    reductionEnfantsDixMilliemes: reductions,
    reductionEnfantSupplementaireDixMilliemes: supplementaire,
  }
  return { ...P, allocationsExceptionnelles: a }
}

describe('choix de la tranche', () => {
  it.each([
    [960_000, 0, 0],
    [1_067_500, 0, 0],
    [1_067_501, 1917, 2322],
    [1_366_000, 1917, 2322],
    [1_366_001, 2120, 2523],
    [2_679_456, 3634, 4038],
    [3_262_128, 3937, 4341],
    [5_990_000, 4744, 5148],
    [5_990_001, 5350, 5753],
    [99_999_999, 5350, 5753],
  ])('base annuelle %i → pécule %i, autre %i', (base, pecule, autre) => {
    expect(calculerAllocationExceptionnelle(100_000, 0, base, 'pecule', ISOLE, P).tauxPrecompteDixMilliemes).toBe(pecule)
    expect(calculerAllocationExceptionnelle(100_000, 0, base, 'autre', ISOLE, P).tauxPrecompteDixMilliemes).toBe(autre)
  })
})

describe('calculerAllocationExceptionnelle', () => {
  it('13e mois de 3 000,00 € : 43,41 % sur le brut moins l’ONSS', () => {
    expect(calculerAllocationExceptionnelle(300_000, 39_210, 3_262_128, 'autre', ISOLE, P)).toEqual({
      type: 'autre',
      brutCentimes: 300_000,
      retenueSocialeCentimes: 39_210,
      baseAnnuelleCentimes: 3_262_128,
      trancheJusquaCentimes: 3_464_000,
      tauxPrecompteDixMilliemes: 4341,
      reductionEnfantsDixMilliemes: 0,
      precompteCentimes: 113_209,
      netCentimes: 147_581,
    })
  })

  it('pécule de 2 760,00 € : colonne pécule, 39,37 %', () => {
    const r = calculerAllocationExceptionnelle(276_000, 36_073, 3_262_128, 'pecule', ISOLE, P)
    expect(r).toMatchObject({ tauxPrecompteDixMilliemes: 3937, precompteCentimes: 94_459, netCentimes: 145_468 })
  })

  it('la première tranche ne prélève aucun précompte', () => {
    const r = calculerAllocationExceptionnelle(80_000, 10_456, 960_000, 'autre', ISOLE, P)
    expect(r).toMatchObject({ tauxPrecompteDixMilliemes: 0, precompteCentimes: 0, netCentimes: 69_544 })
  })

  it('la réduction pour enfants s’applique au précompte', () => {
    const parametres = avecReductions([0, 1500])
    const r = calculerAllocationExceptionnelle(300_000, 39_210, 3_262_128, 'autre', { ...ISOLE, enfantsACharge: 1 }, parametres)
    expect(r).toMatchObject({ reductionEnfantsDixMilliemes: 1500, precompteCentimes: 96_228, netCentimes: 164_562 })
  })

  it('une réduction de 100 % annule le précompte', () => {
    const parametres = avecReductions([0, 10_000])
    const r = calculerAllocationExceptionnelle(300_000, 39_210, 3_262_128, 'autre', { ...ISOLE, enfantsACharge: 1 }, parametres)
    expect(r).toMatchObject({ precompteCentimes: 0, netCentimes: 260_790 })
  })

  it('un brut nul ne produit aucune retenue', () => {
    const r = calculerAllocationExceptionnelle(0, 0, 3_262_128, 'autre', ISOLE, P)
    expect(r).toMatchObject({ precompteCentimes: 0, netCentimes: 0 })
  })

  it.each([-1, 1.5])('refuse un brut invalide (%p)', (brut) => {
    expect(() => calculerAllocationExceptionnelle(brut, 0, 3_262_128, 'autre', ISOLE, P)).toThrow(RangeError)
  })

  it('refuse une retenue sociale supérieure au brut', () => {
    expect(() => calculerAllocationExceptionnelle(100_000, 100_001, 3_262_128, 'autre', ISOLE, P)).toThrow(RangeError)
  })
})

describe('reductionEnfantsAllocation', () => {
  it('prend la valeur de la table', () => {
    const a = avecReductions([0, 1500, 3000], 500).allocationsExceptionnelles
    expect(reductionEnfantsAllocation(0, a)).toBe(0)
    expect(reductionEnfantsAllocation(2, a)).toBe(3000)
  })

  it('ajoute le supplément au-delà du dernier index, sans dépasser 100 %', () => {
    const a = avecReductions([0, 1500, 3000], 500).allocationsExceptionnelles
    expect(reductionEnfantsAllocation(4, a)).toBe(4000)
    const b = avecReductions([0, 9800], 500).allocationsExceptionnelles
    expect(reductionEnfantsAllocation(6, b)).toBe(10_000)
  })
})
```

Run : `npx vitest run src/engine/allocationsExceptionnelles.test.ts`
Expected : FAIL (module introuvable).

- [ ] **Step 2 : écrire le module**

Crée `src/engine/allocationsExceptionnelles.ts` :

```ts
import { diviserArrondi } from './argent'
import type { SituationFamiliale } from './calculerBrut'
import type { Parametres, ParametresAllocationsExceptionnelles } from './parametres/types'

/**
 * Colonne du barème. Le pécule de vacances a ses propres pourcentages, plus bas d'environ
 * quatre points que ceux des autres allocations exceptionnelles (prime de fin d'année,
 * gratifications, commissions occasionnelles).
 */
export const TYPES_ALLOCATION = ['pecule', 'autre'] as const
export type TypeAllocation = (typeof TYPES_ALLOCATION)[number]

export interface ResultatAllocation {
  type: TypeAllocation
  brutCentimes: number
  /** ONSS ordinaire ou retenue propre au pécule : calculée par l'appelant. */
  retenueSocialeCentimes: number
  /** Rémunération annuelle qui a choisi la tranche. */
  baseAnnuelleCentimes: number
  /** Borne supérieure de la tranche retenue ; null pour la dernière. */
  trancheJusquaCentimes: number | null
  tauxPrecompteDixMilliemes: number
  reductionEnfantsDixMilliemes: number
  precompteCentimes: number
  netCentimes: number
}

/** Réduction du précompte pour enfants à charge, bornée à 100 %. */
export function reductionEnfantsAllocation(enfants: number, p: ParametresAllocationsExceptionnelles): number {
  const table = p.reductionEnfantsDixMilliemes
  const dernier = table.length - 1
  const brute = enfants <= dernier ? table[enfants] : table[dernier] + (enfants - dernier) * p.reductionEnfantSupplementaireDixMilliemes
  return Math.min(10_000, brute)
}

/**
 * Précompte d'une allocation exceptionnelle (pécule de vacances, prime de fin d'année) : un
 * pourcentage unique choisi selon la rémunération annuelle, et non la formule mensuelle
 * (spec primes annuelles § 3.1). Le brut, sa retenue sociale et la base annuelle viennent de
 * l'appelant : ce module ne connaît que le barème.
 */
export function calculerAllocationExceptionnelle(
  brutCentimes: number,
  retenueSocialeCentimes: number,
  baseAnnuelleCentimes: number,
  type: TypeAllocation,
  famille: SituationFamiliale,
  parametres: Parametres,
): ResultatAllocation {
  if (!Number.isSafeInteger(brutCentimes) || brutCentimes < 0) {
    throw new RangeError(`Brut d'allocation invalide : ${brutCentimes}`)
  }
  if (!Number.isSafeInteger(retenueSocialeCentimes) || retenueSocialeCentimes < 0 || retenueSocialeCentimes > brutCentimes) {
    throw new RangeError(`Retenue sociale invalide : ${retenueSocialeCentimes} pour un brut de ${brutCentimes}`)
  }
  const p = parametres.allocationsExceptionnelles
  const tranche = p.tranches.find((t) => t.jusquaAnnuelCentimes === null || baseAnnuelleCentimes <= t.jusquaAnnuelCentimes)
  if (!tranche) {
    throw new RangeError('Barème des allocations exceptionnelles sans tranche finale')
  }
  const tauxPrecompteDixMilliemes = type === 'pecule' ? tranche.peculeDixMilliemes : tranche.autreDixMilliemes
  const reductionEnfantsDixMilliemes = reductionEnfantsAllocation(famille.enfantsACharge, p)
  const basePrecompte = brutCentimes - retenueSocialeCentimes
  // Un seul arrondi : le taux et la réduction s'appliquent ensemble.
  const precompteCentimes = diviserArrondi(basePrecompte * tauxPrecompteDixMilliemes * (10_000 - reductionEnfantsDixMilliemes), 100_000_000)
  return {
    type,
    brutCentimes,
    retenueSocialeCentimes,
    baseAnnuelleCentimes,
    trancheJusquaCentimes: tranche.jusquaAnnuelCentimes,
    tauxPrecompteDixMilliemes,
    reductionEnfantsDixMilliemes,
    precompteCentimes,
    netCentimes: basePrecompte - precompteCentimes,
  }
}
```

Le produit `basePrecompte × taux × (10 000 − réduction)` reste un entier sûr tant que le brut ne dépasse pas environ 9 millions d'euros ; au-delà, `diviserArrondi` lève une `RangeError`, ce qui est le comportement voulu.

Run : `npx vitest run src/engine/allocationsExceptionnelles.test.ts`
Expected : PASS.

- [ ] **Step 3 : vérifier et commiter**

Run : `npm test`, `npm run typecheck`, `npm run lint`
Expected : tout vert.

```bash
git add src/engine/allocationsExceptionnelles.ts src/engine/allocationsExceptionnelles.test.ts
git commit -F - <<'EOF'
feat: barème des allocations exceptionnelles

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 3 : oracle Python du barème

**Files:**
- Modify: `tools/reference/reference.py`
- Create (généré) : `src/engine/__tests__/referencesAllocations.json`
- Test: `src/engine/__tests__/referencesAllocations.test.ts`
- Create, **seulement si au moins un exemple publié complet existe** : `src/engine/__tests__/exemplesAllocationsPublies.json` et son test

**Interfaces:**
- Consumes : `calculerAllocationExceptionnelle`, `type ResultatAllocation`, `type TypeAllocation` (tâche 2) ; `getParametres`.

Le script Python **ne lit pas** le code TypeScript : il réimplémente le barème depuis le texte, avec `fractions.Fraction`, et choisit sa tranche par une boucle sur une table écrite en euros.

- [ ] **Step 1 : écrire le test (il doit échouer)**

Crée `src/engine/__tests__/referencesAllocations.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { calculerAllocationExceptionnelle, type ResultatAllocation, type TypeAllocation } from '../allocationsExceptionnelles'
import type { SituationFamiliale } from '../calculerBrut'
import { getParametres } from '../parametres'
import fichier from './referencesAllocations.json'

interface CasAllocation {
  id: string
  date: string
  brutCentimes: number
  retenueSocialeCentimes: number
  baseAnnuelleCentimes: number
  type: TypeAllocation
  enfantsACharge: number
  attendu: ResultatAllocation
  source: string
  verifie: boolean
}

const cas = fichier.cas as unknown as CasAllocation[]

describe(`allocations exceptionnelles — ${cas.length} cas du script de référence`, () => {
  it('contient des cas', () => {
    expect(cas.length).toBeGreaterThanOrEqual(12)
  })

  it.each(cas.map((c) => [c.id, c] as const))('%s', (_id, c) => {
    const famille: SituationFamiliale = {
      etatCivil: 'isole',
      revenusConjoint: null,
      enfantsACharge: c.enfantsACharge,
      parentIsole: false,
      atnMensuelCentimes: 0,
    }
    expect(
      calculerAllocationExceptionnelle(c.brutCentimes, c.retenueSocialeCentimes, c.baseAnnuelleCentimes, c.type, famille, getParametres(c.date)),
    ).toEqual(c.attendu)
  })
})
```

Run : `npx vitest run src/engine/__tests__/referencesAllocations.test.ts`
Expected : FAIL (fichier JSON introuvable).

- [ ] **Step 2 : ajouter le barème au script**

Dans `tools/reference/reference.py`, après la constante `SORTIE_VOITURE`, ajoute :

```python
SORTIE_ALLOCATIONS = SORTIE.parent / "referencesAllocations.json"
```

et, après la fonction `atn_voiture`, ajoute :

```python
# Allocations exceptionnelles — barème du précompte professionnel (spec primes annuelles § 2).
# (borne supérieure annuelle en euros ou None, % pécule, % autres allocations)
BAREME_ALLOCATIONS = {
    "2026": [
        (D("10675"), D("0"), D("0")),
        (D("13660"), D("19.17"), D("23.22")),
        (D("17375"), D("21.20"), D("25.23")),
        (D("20840"), D("26.25"), D("30.28")),
        (D("23580"), D("31.30"), D("35.33")),
        (D("26340"), D("34.33"), D("38.36")),
        (D("31830"), D("36.34"), D("40.38")),
        (D("34640"), D("39.37"), D("43.41")),
        (D("45860"), D("42.39"), D("46.44")),
        (D("59900"), D("47.44"), D("51.48")),
        (None, D("53.50"), D("57.53")),
    ],
}

# Réduction du précompte par nombre d'enfants à charge, en pourcentage (table relevée en tâche 1).
REDUCTIONS_ENFANTS_ALLOCATIONS = []


def allocation_exceptionnelle(brut_c: int, retenue_c: int, base_annuelle_c: int, type_: str, enfants: int, date: str) -> dict:
    annee = "2026" if date >= "2026-01-01" else "2025"
    base_euros = Fr(base_annuelle_c, 100)
    taux = None
    borne_retenue = None
    for borne, pct_pecule, pct_autre in BAREME_ALLOCATIONS[annee]:
        if borne is None or base_euros <= Fr(borne):
            taux = Fr(pct_pecule if type_ == "pecule" else pct_autre)
            borne_retenue = None if borne is None else int(borne * 100)
            break
    reduction = Fr(REDUCTIONS_ENFANTS_ALLOCATIONS[min(enfants, len(REDUCTIONS_ENFANTS_ALLOCATIONS) - 1)])
    base_precompte = brut_c - retenue_c
    precompte = arrondi_centime(Fr(base_precompte) * taux / 100 * (Fr(100) - reduction) / 100)
    return {
        "type": type_,
        "brutCentimes": brut_c,
        "retenueSocialeCentimes": retenue_c,
        "baseAnnuelleCentimes": base_annuelle_c,
        "trancheJusquaCentimes": borne_retenue,
        "tauxPrecompteDixMilliemes": int(taux * 100),
        "reductionEnfantsDixMilliemes": int(reduction * 100),
        "precompteCentimes": precompte,
        "netCentimes": base_precompte - precompte,
    }


CAS_ALLOCATIONS = [
    ("13e-3000-2026-09-14", "2026-09-14", 300000, 39210, 3262128, "autre", 0),
    ("pecule-2760-2026-09-14", "2026-09-14", 276000, 36073, 3262128, "pecule", 0),
    ("13e-800-tranche0-2026-09-14", "2026-09-14", 80000, 10456, 960000, "autre", 0),
    ("13e-3000-1enfant-2026-09-14", "2026-09-14", 300000, 39210, 3262128, "autre", 1),
    ("13e-3000-3enfants-2026-09-14", "2026-09-14", 300000, 39210, 3262128, "autre", 3),
    ("pecule-2054-2026-09-14", "2026-09-14", 205425, 26849, 2679456, "pecule", 0),
    ("13e-2232-2026-09-14", "2026-09-14", 223288, 29184, 2679456, "autre", 0),
    ("13e-5000-2026-09-14", "2026-09-14", 500000, 65350, 5215800, "autre", 0),
    ("pecule-4600-2026-09-14", "2026-09-14", 460000, 60122, 5215800, "pecule", 0),
    ("13e-borne-1067500-2026-09-14", "2026-09-14", 100000, 13070, 1067500, "autre", 0),
    ("13e-borne-1067501-2026-09-14", "2026-09-14", 100000, 13070, 1067501, "autre", 0),
    ("13e-derniere-tranche-2026-09-14", "2026-09-14", 100000, 13070, 6000000, "autre", 0),
]
```

Remplis `REDUCTIONS_ENFANTS_ALLOCATIONS` en recopiant la table de `src/engine/parametres/p2026-07.ts`, reconvertie en pourcentages (`1500` dix-millièmes s'écrit `D("15")`). Ajoute l'entrée `"2025"` de `BAREME_ALLOCATIONS` depuis `p2025.ts`, puis deux cas de 2025 à `CAS_ALLOCATIONS` (date `2025-09-14`), sur le modèle des deux premiers.

À la fin de `main()`, après le bloc voiture, ajoute :

```python
    contenu_allocations = {
        "description": "Généré par tools/reference/reference.py — ne pas modifier à la main",
        "cas": [
            {
                "id": identifiant,
                "date": date,
                "brutCentimes": brut_c,
                "retenueSocialeCentimes": retenue_c,
                "baseAnnuelleCentimes": base_c,
                "type": type_,
                "enfantsACharge": enfants,
                "attendu": allocation_exceptionnelle(brut_c, retenue_c, base_c, type_, enfants, date),
                "source": "tools/reference/reference.py (barème des allocations exceptionnelles)",
                "verifie": False,
            }
            for identifiant, date, brut_c, retenue_c, base_c, type_, enfants in CAS_ALLOCATIONS
        ],
    }
    SORTIE_ALLOCATIONS.write_text(json.dumps(contenu_allocations, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"{len(CAS_ALLOCATIONS)} cas d'allocations écrits dans {SORTIE_ALLOCATIONS}")
```

- [ ] **Step 3 : générer et vérifier**

Run : `python tools/reference/reference.py`
Expected : trois lignes de sortie, dont « 14 cas d'allocations écrits … » (12 du plan + 2 de 2025).

Run : `git diff --ignore-cr-at-eol --stat src/engine/__tests__/references.json src/engine/__tests__/referencesVoiture.json`
Expected : aucune ligne — les deux fichiers existants ne changent pas.

Run : `npx vitest run src/engine/__tests__/referencesAllocations.test.ts`
Expected : PASS. Contrôle croisé : le cas `13e-3000-2026-09-14` doit donner `precompteCentimes: 113209` et `netCentimes: 147581`.

- [ ] **Step 4 : chercher des exemples publiés**

Cherche des exemples chiffrés de calcul d'un double pécule ou d'une prime de fin d'année, publiés par un secrétariat social ou le SPF (Securex, Acerta, Partena, SD Worx, Liantis, Attentia).

Un exemple n'est **utilisable** que s'il donne : le brut de la prime, l'année de revenus, la situation familiale (au moins le nombre d'enfants), le résultat (précompte ou net), et la base annuelle qui a choisi la tranche — ou de quoi la reconstituer sans supposition.

- **Au moins un exemple utilisable** : crée `src/engine/__tests__/exemplesAllocationsPublies.json` sur le modèle de `exemplesVoiturePublies.json` (champs `id`, `date`, les entrées du calcul, `publie`, `source` avec la date de consultation, `note`, `verifie: true`), et un test qui compare le résultat du moteur aux valeurs publiées.
- **Un exemple utilisable non reproduit au centime** : règle d'or — ne change rien au module, renvoie DONE_WITH_CONCERNS avec l'exemple, sa source et l'écart chiffré.
- **Aucun exemple utilisable** : ne crée aucun fichier, et liste dans ton rapport les pages consultées et ce qui manquait à chacune.

- [ ] **Step 5 : vérifier et commiter**

Run : `npm test`, `npm run typecheck`, `npm run lint`
Expected : tout vert.

```bash
git add tools/reference/reference.py src/engine/__tests__/referencesAllocations.json src/engine/__tests__/referencesAllocations.test.ts
git add src/engine/__tests__/exemplesAllocationsPublies.json src/engine/__tests__/exemplesAllocationsPublies.test.ts 2>/dev/null || true
git commit -F - <<'EOF'
test: oracle Python du barème des allocations exceptionnelles

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 4 : les deux primes

**Files:**
- Create: `src/engine/primesAnnuelles.ts`
- Test: `src/engine/primesAnnuelles.test.ts`

**Interfaces:**
- Consumes : `calculerAllocationExceptionnelle`, `type ResultatAllocation` (tâche 2) ; `appliquerTaux` et `diviserArrondi` de `./argent`.
- Produces :
```ts
export const TAUX_DOUBLE_PECULE_DIX_MILLIEMES = 9_200

export interface PrimesSaisies {
  treiziemeActif: boolean
  treiziemePourcentageDixMilliemes: number
  treiziemeMoisPrestes: number
  peculeActif: boolean
  peculeMoisPrestes: number
}

export const PRIMES_AUCUNE: PrimesSaisies

export interface ResultatPrimes {
  treizieme: ResultatAllocation | null
  pecule: ResultatAllocation | null
}

export function calculerPrimesAnnuelles(
  brutMensuelCentimes: number,
  baseAnnuelleCentimes: number,
  primes: PrimesSaisies,
  famille: SituationFamiliale,
  parametres: Parametres,
): ResultatPrimes
```

- [ ] **Step 1 : écrire les tests (ils doivent échouer)**

Crée `src/engine/primesAnnuelles.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import type { SituationFamiliale } from './calculerBrut'
import { getParametres } from './parametres'
import type { Parametres } from './parametres/types'
import { calculerPrimesAnnuelles, PRIMES_AUCUNE, TAUX_DOUBLE_PECULE_DIX_MILLIEMES, type PrimesSaisies } from './primesAnnuelles'

const SEPT = '2026-09-14'
const P = getParametres(SEPT)
const BASE = 3_262_128

const ISOLE: SituationFamiliale = { etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false, atnMensuelCentimes: 0 }

const TOUT: PrimesSaisies = {
  treiziemeActif: true,
  treiziemePourcentageDixMilliemes: 10_000,
  treiziemeMoisPrestes: 12,
  peculeActif: true,
  peculeMoisPrestes: 12,
}

/** La part du pécule soumise à retenue est relevée en tâche 1 : ici on la fixe, pour tester l'arithmétique. */
function avecPartPecule(partDixMilliemes: number): Parametres {
  return {
    ...P,
    allocationsExceptionnelles: { ...P.allocationsExceptionnelles, partPeculeSoumiseRetenueDixMilliemes: partDixMilliemes },
  }
}

describe('calculerPrimesAnnuelles', () => {
  it('sans prime active, ne calcule rien', () => {
    expect(calculerPrimesAnnuelles(300_000, BASE, PRIMES_AUCUNE, ISOLE, P)).toEqual({ treizieme: null, pecule: null })
  })

  it('13e mois : un mois de brut, ONSS ordinaire de 13,07 %', () => {
    const r = calculerPrimesAnnuelles(300_000, BASE, { ...TOUT, peculeActif: false }, ISOLE, P)
    expect(r.pecule).toBeNull()
    expect(r.treizieme).toMatchObject({
      type: 'autre',
      brutCentimes: 300_000,
      retenueSocialeCentimes: 39_210,
      precompteCentimes: 113_209,
      netCentimes: 147_581,
    })
  })

  it('13e mois à 150 %', () => {
    const primes = { ...TOUT, peculeActif: false, treiziemePourcentageDixMilliemes: 15_000 }
    expect(calculerPrimesAnnuelles(300_000, BASE, primes, ISOLE, P).treizieme).toMatchObject({
      brutCentimes: 450_000,
      retenueSocialeCentimes: 58_815,
      precompteCentimes: 169_813,
      netCentimes: 221_372,
    })
  })

  it('13e mois proratisé à 6 mois prestés', () => {
    const primes = { ...TOUT, peculeActif: false, treiziemeMoisPrestes: 6 }
    expect(calculerPrimesAnnuelles(300_000, BASE, primes, ISOLE, P).treizieme).toMatchObject({
      brutCentimes: 150_000,
      retenueSocialeCentimes: 19_605,
      precompteCentimes: 56_604,
      netCentimes: 73_791,
    })
  })

  it('13e mois à 0 mois presté : aucun montant, mais la prime reste calculée', () => {
    const primes = { ...TOUT, peculeActif: false, treiziemeMoisPrestes: 0 }
    expect(calculerPrimesAnnuelles(300_000, BASE, primes, ISOLE, P).treizieme).toMatchObject({
      brutCentimes: 0,
      retenueSocialeCentimes: 0,
      precompteCentimes: 0,
      netCentimes: 0,
    })
  })

  it('double pécule : 92 % du brut mensuel, colonne pécule', () => {
    const r = calculerPrimesAnnuelles(300_000, BASE, { ...TOUT, treiziemeActif: false }, ISOLE, avecPartPecule(10_000))
    expect(r.treizieme).toBeNull()
    expect(r.pecule).toMatchObject({
      type: 'pecule',
      brutCentimes: 276_000,
      retenueSocialeCentimes: 36_073,
      precompteCentimes: 94_459,
      netCentimes: 145_468,
    })
  })

  it('la retenue du pécule ne porte que sur la part prévue par les paramètres', () => {
    const r = calculerPrimesAnnuelles(300_000, BASE, { ...TOUT, treiziemeActif: false }, ISOLE, avecPartPecule(7_380))
    expect(r.pecule).toMatchObject({ brutCentimes: 276_000, retenueSocialeCentimes: 26_622, precompteCentimes: 98_180, netCentimes: 151_198 })
  })

  it('pécule proratisé à 6 mois prestés l’année précédente', () => {
    const primes = { ...TOUT, treiziemeActif: false, peculeMoisPrestes: 6 }
    expect(calculerPrimesAnnuelles(300_000, BASE, primes, ISOLE, avecPartPecule(10_000)).pecule).toMatchObject({ brutCentimes: 138_000 })
  })

  it('le taux du double pécule est celui de la loi', () => {
    expect(TAUX_DOUBLE_PECULE_DIX_MILLIEMES).toBe(9_200)
  })

  it.each([
    ['pourcentage négatif', { treiziemePourcentageDixMilliemes: -1 }],
    ['pourcentage au-delà de 200 %', { treiziemePourcentageDixMilliemes: 20_001 }],
    ['13 mois prestés', { treiziemeMoisPrestes: 13 }],
    ['mois de pécule négatif', { peculeMoisPrestes: -1 }],
  ])('refuse une saisie hors bornes (%s)', (_nom, modif) => {
    expect(() => calculerPrimesAnnuelles(300_000, BASE, { ...TOUT, ...modif }, ISOLE, P)).toThrow(RangeError)
  })
})
```

Run : `npx vitest run src/engine/primesAnnuelles.test.ts`
Expected : FAIL (module introuvable).

- [ ] **Step 2 : écrire le module**

Crée `src/engine/primesAnnuelles.ts` :

```ts
import { calculerAllocationExceptionnelle, type ResultatAllocation } from './allocationsExceptionnelles'
import { appliquerTaux, diviserArrondi } from './argent'
import type { SituationFamiliale } from './calculerBrut'
import type { Parametres } from './parametres/types'

/** Double pécule de vacances : 92 % de la rémunération mensuelle (AR du 30/03/1967). */
export const TAUX_DOUBLE_PECULE_DIX_MILLIEMES = 9_200

/** Retenue personnelle de 13,07 % : cotisations ordinaires pour le 13e mois, retenue propre pour le pécule. */
const TAUX_RETENUE_DIX_MILLIEMES = 1_307

/** Au-delà de 200 %, c'est une prime exceptionnelle, pas un 13e mois. */
const POURCENTAGE_PRIME_MAX_DIX_MILLIEMES = 20_000
const MOIS_MAX = 12

/** Primes annuelles telles que validées (spec primes annuelles § 5.1). */
export interface PrimesSaisies {
  treiziemeActif: boolean
  /** Pourcentage du brut mensuel, en dix-millièmes : 10 000 = un mois. */
  treiziemePourcentageDixMilliemes: number
  /** Mois prestés cette année, 0 à 12. */
  treiziemeMoisPrestes: number
  peculeActif: boolean
  /** Mois prestés l'année précédente, 0 à 12 : c'est elle qui ouvre le droit au pécule. */
  peculeMoisPrestes: number
}

export const PRIMES_AUCUNE: PrimesSaisies = {
  treiziemeActif: false,
  treiziemePourcentageDixMilliemes: 10_000,
  treiziemeMoisPrestes: MOIS_MAX,
  peculeActif: false,
  peculeMoisPrestes: MOIS_MAX,
}

export interface ResultatPrimes {
  /** null quand la prime n'est pas active. */
  treizieme: ResultatAllocation | null
  pecule: ResultatAllocation | null
}

function verifierBornes(primes: PrimesSaisies): void {
  const pourcentage = primes.treiziemePourcentageDixMilliemes
  if (!Number.isSafeInteger(pourcentage) || pourcentage < 0 || pourcentage > POURCENTAGE_PRIME_MAX_DIX_MILLIEMES) {
    throw new RangeError(`Pourcentage de prime hors bornes : ${pourcentage}`)
  }
  for (const mois of [primes.treiziemeMoisPrestes, primes.peculeMoisPrestes]) {
    if (!Number.isSafeInteger(mois) || mois < 0 || mois > MOIS_MAX) {
      throw new RangeError(`Mois prestés hors bornes : ${mois}`)
    }
  }
}

/** brut × pourcentage, proratisé par les mois prestés. */
function brutPrime(brutMensuelCentimes: number, pourcentageDixMilliemes: number, moisPrestes: number): number {
  const complet = appliquerTaux(brutMensuelCentimes, pourcentageDixMilliemes)
  return moisPrestes === MOIS_MAX ? complet : diviserArrondi(complet * moisPrestes, MOIS_MAX)
}

/**
 * Le 13e mois et le double pécule, chacun au barème des allocations exceptionnelles
 * (spec primes annuelles § 3.2). Ces montants ne changent pas le salaire mensuel :
 * calculerNet et calculerBrut les ignorent.
 */
export function calculerPrimesAnnuelles(
  brutMensuelCentimes: number,
  baseAnnuelleCentimes: number,
  primes: PrimesSaisies,
  famille: SituationFamiliale,
  parametres: Parametres,
): ResultatPrimes {
  verifierBornes(primes)

  let treizieme: ResultatAllocation | null = null
  if (primes.treiziemeActif) {
    const brut = brutPrime(brutMensuelCentimes, primes.treiziemePourcentageDixMilliemes, primes.treiziemeMoisPrestes)
    // Prime de fin d'année : rémunération ordinaire, donc cotisations ONSS sur la totalité.
    const retenue = appliquerTaux(brut, TAUX_RETENUE_DIX_MILLIEMES)
    treizieme = calculerAllocationExceptionnelle(brut, retenue, baseAnnuelleCentimes, 'autre', famille, parametres)
  }

  let pecule: ResultatAllocation | null = null
  if (primes.peculeActif) {
    const brut = brutPrime(brutMensuelCentimes, TAUX_DOUBLE_PECULE_DIX_MILLIEMES, primes.peculeMoisPrestes)
    // Le double pécule échappe aux cotisations ordinaires : la retenue de 13,07 % ne porte que
    // sur la part fixée par l'ONSS (paramètre de la période).
    const partSoumise = appliquerTaux(brut, parametres.allocationsExceptionnelles.partPeculeSoumiseRetenueDixMilliemes)
    const retenue = appliquerTaux(partSoumise, TAUX_RETENUE_DIX_MILLIEMES)
    pecule = calculerAllocationExceptionnelle(brut, retenue, baseAnnuelleCentimes, 'pecule', famille, parametres)
  }

  return { treizieme, pecule }
}
```

Run : `npx vitest run src/engine/primesAnnuelles.test.ts`
Expected : PASS.

- [ ] **Step 3 : vérifier et commiter**

Run : `npm test`, `npm run typecheck`, `npm run lint`
Expected : tout vert, y compris les quatre tests des fiches de paie réelles, inchangés.

```bash
git add src/engine/primesAnnuelles.ts src/engine/primesAnnuelles.test.ts
git commit -F - <<'EOF'
feat: 13e mois et double pécule de vacances

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 5 : saisie, validation, sauvegarde v5 et base annuelle

**Files:**
- Modify: `src/engine/validation.ts`, `src/hooks/useSaisie.ts`, `src/hooks/useCalcul.ts`, `src/i18n/fr.ts`
- Test: `src/engine/validation.test.ts`, `src/hooks/useSaisie.test.ts`, `src/hooks/useCalcul.test.ts`

**Interfaces:**
- Consumes : `PrimesSaisies`, `PRIMES_AUCUNE`, `calculerPrimesAnnuelles`, `type ResultatPrimes` (tâche 4).
- Produces :
  - `interface SaisiePrimes { treiziemeActif: boolean; treiziemePourcentage: string; treiziemeMoisPrestes: string; peculeActif: boolean; peculeMoisPrestes: string }` ; `SaisieFormulaire.primes: SaisiePrimes` ; `SAISIE_PRIMES_PAR_DEFAUT`.
  - codes d'erreur `pourcentagePrimeInvalide`, `moisPrestesInvalide` ; champs `ErreursSaisie.treiziemePourcentage`, `.treiziemeMoisPrestes`, `.peculeMoisPrestes`.
  - les deux variantes `ok` de `ResultatValidation` portent `primes: PrimesSaisies`.
  - `CLE_STOCKAGE = 'wage-calculator:saisie:v5'`, `CLE_STOCKAGE_V4 = 'wage-calculator:saisie:v4'`.
  - `EtatCalcul` (état `ok`) porte `primes: ResultatPrimes`.

- [ ] **Step 1 : écrire les tests de validation (ils doivent échouer)**

Dans `src/engine/validation.test.ts`, ajoute `SAISIE_PRIMES_PAR_DEFAUT` à l'import depuis `./validation`, puis à la fin du fichier :

```ts
describe('validerSaisie — primes annuelles', () => {
  const primes = (modif: Partial<SaisieFormulaire['primes']>) => saisie({ primes: { ...SAISIE_PRIMES_PAR_DEFAUT, ...modif } })

  it('a des primes par défaut : les deux cochées, 100 % et 12 mois', () => {
    expect(SAISIE_PRIMES_PAR_DEFAUT).toEqual({
      treiziemeActif: true,
      treiziemePourcentage: '100',
      treiziemeMoisPrestes: '12',
      peculeActif: true,
      peculeMoisPrestes: '12',
    })
  })

  it('convertit la saisie par défaut', () => {
    const r = valider(SAISIE_PAR_DEFAUT)
    expect(r.ok && r.primes).toEqual({
      treiziemeActif: true,
      treiziemePourcentageDixMilliemes: 10_000,
      treiziemeMoisPrestes: 12,
      peculeActif: true,
      peculeMoisPrestes: 12,
    })
  })

  it('accepte un pourcentage à virgule', () => {
    const r = valider(primes({ treiziemePourcentage: '108,5' }))
    expect(r.ok && r.primes.treiziemePourcentageDixMilliemes).toBe(10_850)
  })

  it.each(['', 'abc', '-1', '200,01'])('pourcentage « %s » → erreur', (treiziemePourcentage) => {
    expect(valider(primes({ treiziemePourcentage }))).toEqual({ ok: false, erreurs: { treiziemePourcentage: 'pourcentagePrimeInvalide' } })
  })

  it.each(['', 'abc', '-1', '13', '6,5'])('mois prestés « %s » → erreur', (treiziemeMoisPrestes) => {
    expect(valider(primes({ treiziemeMoisPrestes }))).toEqual({ ok: false, erreurs: { treiziemeMoisPrestes: 'moisPrestesInvalide' } })
  })

  it('ne valide pas les champs d’une prime décochée', () => {
    const r = valider(primes({ treiziemeActif: false, treiziemePourcentage: 'abc', treiziemeMoisPrestes: '99' }))
    expect(r.ok).toBe(true)
  })

  it('signale séparément les mois du pécule', () => {
    expect(valider(primes({ peculeMoisPrestes: '13' }))).toEqual({ ok: false, erreurs: { peculeMoisPrestes: 'moisPrestesInvalide' } })
  })
})
```

Run : `npx vitest run src/engine/validation.test.ts`
Expected : FAIL.

- [ ] **Step 2 : implémenter la saisie et la validation**

Dans `src/engine/validation.ts` :

1. ajoute l'import :
```ts
import { PRIMES_AUCUNE, type PrimesSaisies } from './primesAnnuelles'
```
2. après l'interface `SaisieVoiture`, ajoute :
```ts
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
```
3. `SaisieFormulaire` gagne, après `voiture: SaisieVoiture` :
```ts
  primes: SaisiePrimes
```
4. `CodeErreur` gagne `| 'pourcentagePrimeInvalide' | 'moisPrestesInvalide'`, et `ErreursSaisie` gagne :
```ts
  treiziemePourcentage?: CodeErreur
  treiziemeMoisPrestes?: CodeErreur
  peculeMoisPrestes?: CodeErreur
```
5. les deux variantes `ok` de `ResultatValidation` gagnent `primes: PrimesSaisies` ;
6. après `IMMATRICULATION_MIN`, ajoute :
```ts
/** 200 % : au-delà, c'est une prime exceptionnelle, pas un 13e mois. */
const POURCENTAGE_PRIME_MAX = 200
const MOIS_PRESTES_MAX = 12
```
7. avant `SAISIE_PAR_DEFAUT`, ajoute :
```ts
export const SAISIE_PRIMES_PAR_DEFAUT: SaisiePrimes = {
  treiziemeActif: true,
  treiziemePourcentage: '100',
  treiziemeMoisPrestes: '12',
  peculeActif: true,
  peculeMoisPrestes: '12',
}
```
et `SAISIE_PAR_DEFAUT` gagne `primes: SAISIE_PRIMES_PAR_DEFAUT,` après `voiture` ;
8. après `validerAtn`, ajoute :
```ts
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
```
9. dans `validerSaisie`, après la construction de `avantages`, ajoute :
```ts
  const primes = validerPrimes(saisie.primes, erreurs)
```
et les deux `return` de succès gagnent `primes` :
```ts
  if (saisie.sens === 'netVersBrut') {
    return { ok: true, sens: 'netVersBrut', famille, netCibleCentimes: montant, avantages, primes }
  }
  return { ok: true, sens: 'brutVersNet', situation: { brutMensuelCentimes: montant, ...famille }, avantages, primes }
```

Dans `src/i18n/fr.ts`, bloc `erreurs`, après `contributionInvalide` :

```ts
    pourcentagePrimeInvalide: 'Indiquez un pourcentage entre 0 et 200 (100 = un mois de salaire).',
    moisPrestesInvalide: 'Indiquez un nombre entier de mois prestés, entre 0 et 12.',
```

Run : `npx vitest run src/engine/validation.test.ts`
Expected : PASS.

- [ ] **Step 3 : écrire les tests de la sauvegarde (ils doivent échouer)**

Dans `src/hooks/useSaisie.test.ts` : ajoute `SAISIE_PRIMES_PAR_DEFAUT` à l'import depuis `../engine/validation` et `CLE_STOCKAGE_V4` à celui de `./useSaisie`, puis remplace le test des clés par :

```ts
  it('utilise la clé v5 en écriture, v4, v3, v2 et v1 en reprise', () => {
    expect(CLE_STOCKAGE).toBe('wage-calculator:saisie:v5')
    expect(CLE_STOCKAGE_V4).toBe('wage-calculator:saisie:v4')
    expect(CLE_STOCKAGE_V3).toBe('wage-calculator:saisie:v3')
    expect(CLE_STOCKAGE_V2).toBe('wage-calculator:saisie:v2')
    expect(CLE_STOCKAGE_V1).toBe('wage-calculator:saisie:v1')
  })
```

et ajoute à la fin du fichier :

```ts
describe('lireSaisieStockee — primes annuelles (v5)', () => {
  const V4 = { ...SAISIE_PAR_DEFAUT, montant: '4200', primes: undefined }

  it('reprend une saisie v4 avec les primes par défaut', () => {
    localStorage.setItem(CLE_STOCKAGE_V4, JSON.stringify(V4))
    expect(lireSaisieStockee()).toEqual({ ...V4, primes: SAISIE_PRIMES_PAR_DEFAUT })
  })

  it('préfère la clé v5 à la clé v4', () => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, montant: '5000' }))
    localStorage.setItem(CLE_STOCKAGE_V4, JSON.stringify(V4))
    expect(lireSaisieStockee().montant).toBe('5000')
  })

  it('préfère la clé v4 à la clé v3', () => {
    const v3 = { ...SAISIE_PAR_DEFAUT, montant: '1234', voiture: undefined, primes: undefined }
    localStorage.setItem(CLE_STOCKAGE_V4, JSON.stringify(V4))
    localStorage.setItem(CLE_STOCKAGE_V3, JSON.stringify(v3))
    expect(lireSaisieStockee().montant).toBe('4200')
  })

  it('garde le reste d’une saisie v5 dont le bloc primes est invalide', () => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, montant: '4000', primes: { treiziemeActif: 'oui' } }))
    expect(lireSaisieStockee()).toEqual({ ...SAISIE_PAR_DEFAUT, montant: '4000', primes: SAISIE_PRIMES_PAR_DEFAUT })
  })

  it('ne fait pas planter le calcul après reprise d’une saisie v4', () => {
    localStorage.setItem(CLE_STOCKAGE_V4, JSON.stringify(V4))
    const etat = calculerEtat(lireSaisieStockee(), '2026-09-14')
    expect(etat.etat).toBe('ok')
    expect(etat.etat === 'ok' && etat.primes.treizieme).not.toBeNull()
  })

  it('ne réécrit pas la clé v4', () => {
    localStorage.setItem(CLE_STOCKAGE_V4, JSON.stringify(V4))
    renderHook(() => useSaisie())
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE_V4) ?? 'null')).toEqual({ ...V4, primes: undefined })
  })
})
```

Adapte les tests existants selon la même règle qu'aux versions précédentes : une saisie reprise d'un format antérieur attend `primes: SAISIE_PRIMES_PAR_DEFAUT` en plus, et un test qui écrivait une saisie **sans primes** sous `CLE_STOCKAGE` pour représenter la v4 l'écrit désormais sous `CLE_STOCKAGE_V4`. Ne supprime aucun test : note dans ton rapport chaque test modifié et pourquoi.

Run : `npx vitest run src/hooks/useSaisie.test.ts`
Expected : FAIL.

- [ ] **Step 4 : implémenter la sauvegarde v5**

Dans `src/hooks/useSaisie.ts` :

1. l'import de `../engine/validation` gagne `SAISIE_PRIMES_PAR_DEFAUT` et `type SaisiePrimes` ;
2. les clés deviennent :
```ts
export const CLE_STOCKAGE = 'wage-calculator:saisie:v5'
/** Format V4 (sans primes annuelles) : lu pour reprendre la saisie, jamais réécrit. */
export const CLE_STOCKAGE_V4 = 'wage-calculator:saisie:v4'
/** Format V3 (ATN en montant seul, sans voiture) : lu pour reprendre la saisie, jamais réécrit. */
export const CLE_STOCKAGE_V3 = 'wage-calculator:saisie:v3'
```
(les clés V2 et V1 ne changent pas) ;
3. après `estSaisieVoiture`, ajoute :
```ts
function estSaisiePrimes(valeur: unknown): valeur is SaisiePrimes {
  if (!estObjet(valeur)) {
    return false
  }
  const booleens = ['treiziemeActif', 'peculeActif'] as const
  const chaines = ['treiziemePourcentage', 'treiziemeMoisPrestes', 'peculeMoisPrestes'] as const
  return booleens.every((champ) => typeof valeur[champ] === 'boolean') && chaines.every((champ) => typeof valeur[champ] === 'string')
}
```
4. `estSaisie` exige les primes :
```ts
function estSaisie(valeur: unknown): valeur is SaisieFormulaire {
  return (
    estSaisieV2(valeur) &&
    typeof (valeur as Objet).atn === 'string' &&
    estSaisieAvantages((valeur as Objet).avantages) &&
    estSaisieVoiture((valeur as Objet).voiture) &&
    estSaisiePrimes((valeur as Objet).primes)
  )
}
```
5. `completer` gagne une ligne, après celle de `voiture` :
```ts
    primes: estSaisiePrimes(v.primes) ? v.primes : SAISIE_PRIMES_PAR_DEFAUT,
```
6. `repriseV1` gagne `primes: SAISIE_PRIMES_PAR_DEFAUT,` après `voiture` ;
7. la boucle de `lireSaisieStockee` devient :
```ts
  for (const cle of [CLE_STOCKAGE, CLE_STOCKAGE_V4, CLE_STOCKAGE_V3, CLE_STOCKAGE_V2]) {
```
et son commentaire de tête devient `/** Saisie mémorisée (v5, sinon reprise v4, v3, v2, v1), ou saisie par défaut. */`.

Run : `npx vitest run src/hooks/useSaisie.test.ts`
Expected : PASS.

- [ ] **Step 5 : brancher les primes dans l'état calculé**

Dans `src/hooks/useCalcul.ts` :

1. ajoute l'import :
```ts
import { calculerPrimesAnnuelles, type ResultatPrimes } from '../engine/primesAnnuelles'
```
2. la variante `ok` de `EtatCalcul` gagne, après `rmmmgCentimes: number` :
```ts
      /** 13e mois et double pécule, chacun null s'il n'est pas coché. */
      primes: ResultatPrimes
```
3. dans la branche `netVersBrut`, juste avant son `return`, ajoute :
```ts
      const primes = calculerPrimesAnnuelles(
        inverse.brutCentimes,
        inverse.complet.resultat.intermediaires.imposableMensuel * 12,
        validation.primes,
        validation.famille,
        parametres,
      )
```
et dans la branche `brutVersNet`, juste avant son `return` :
```ts
    const primes = calculerPrimesAnnuelles(
      validation.situation.brutMensuelCentimes,
      complet.resultat.intermediaires.imposableMensuel * 12,
      validation.primes,
      validation.situation,
      parametres,
    )
```
Ajoute `primes,` à l'objet renvoyé dans les deux branches.

**La base annuelle est le seul endroit que la tâche 1 peut faire bouger.** Si son relevé dit que la tranche se choisit sur une autre base que la rémunération imposable mensuelle × 12, c'est cette expression — et elle seule — qui change, dans les deux branches.

- [ ] **Step 6 : tester l'état calculé**

Ajoute à `src/hooks/useCalcul.test.ts` (et `SAISIE_PRIMES_PAR_DEFAUT` à l'import depuis `../engine/validation`) :

```ts
describe('calculerEtat — primes annuelles', () => {
  it('calcule les deux primes pour la saisie par défaut', () => {
    const etat = calculerEtat(SAISIE_PAR_DEFAUT, DATE)
    expect(etat.etat).toBe('ok')
    if (etat.etat !== 'ok') return
    expect(etat.primes.treizieme?.brutCentimes).toBe(300_000)
    expect(etat.primes.pecule?.brutCentimes).toBe(276_000)
    expect(etat.primes.treizieme?.baseAnnuelleCentimes).toBe(etat.resultat.intermediaires.imposableMensuel * 12)
  })

  it('ne calcule pas une prime décochée', () => {
    const etat = calculerEtat(saisie({ primes: { ...SAISIE_PRIMES_PAR_DEFAUT, peculeActif: false } }), DATE)
    expect(etat.etat === 'ok' && etat.primes.pecule).toBeNull()
  })

  it('net → brut : les primes suivent le brut trouvé', () => {
    const etat = calculerEtat(saisie({ sens: 'netVersBrut', montant: '2261,33' }), DATE)
    expect(etat.etat === 'ok' && etat.primes.treizieme?.brutCentimes).toBe(299_996)
  })
})
```

Run : `npx vitest run src/hooks/useCalcul.test.ts`
Expected : PASS.

- [ ] **Step 7 : vérifier et commiter**

Run : `npm test`, `npm run typecheck`, `npm run lint`
Expected : tout vert. `src/App.test.tsx` ne change pas : le panneau n'existe pas encore, et rien de visible n'a bougé.

```bash
git add src/engine/validation.ts src/engine/validation.test.ts src/hooks/useSaisie.ts src/hooks/useSaisie.test.ts src/hooks/useCalcul.ts src/hooks/useCalcul.test.ts src/i18n/fr.ts
git commit -F - <<'EOF'
feat: saisie des primes annuelles et sauvegarde v5

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 6 : le panneau, le formulaire et la documentation

**Files:**
- Create: `src/components/PrimesAnnuelles.tsx`
- Modify: `src/components/FormulaireSituation.tsx`, `src/App.tsx`, `src/i18n/fr.ts`
- Test: `src/App.test.tsx`
- Modify: `README.md`, `docs/superpowers/specs/2026-09-23-primes-annuelles-design.md` (statut)

**Interfaces:**
- Consumes : `EtatCalcul.primes: ResultatPrimes` et `type ResultatAllocation` (tâches 2 et 5) ; `SaisiePrimes`, `ErreursSaisie` (tâche 5) ; le composant `LigneCalcul` et les fonctions `formatEuro`, `formatDixMilliemes` existants.

- [ ] **Step 1 : écrire les tests d'interface (ils doivent échouer)**

Ajoute à la fin de `src/App.test.tsx` :

```ts
describe('App — primes annuelles', () => {
  function panneauPrimes() {
    return screen.getByRole('region', { name: '13e mois et pécule de vacances' })
  }

  it('affiche les deux primes pour la saisie par défaut', () => {
    render(<App dateIso={DATE} />)
    const panneau = panneauPrimes()
    expect(within(panneau).getByText('13e mois')).toBeInTheDocument()
    expect(within(panneau).getByText('Double pécule de vacances')).toBeInTheDocument()
    expect(within(panneau).getByText(euros(147_581))).toBeInTheDocument()
    // Le brut du pécule ne dépend pas de la part soumise à retenue, relevée en tâche 1 : son net, si.
    expect(within(panneau).getByText(euros(276_000))).toBeInTheDocument()
  })

  it('explique le taux par sa tranche', () => {
    render(<App dateIso={DATE} />)
    const ligne = within(panneauPrimes()).getAllByText('Précompte professionnel')[0].closest('li')
    expect(ligne).toHaveTextContent('43,41 %')
    expect(ligne).toHaveTextContent('32 621,28 €')
  })

  it('retire une prime décochée', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Double pécule de vacances'))
    expect(within(panneauPrimes()).queryByText('Double pécule de vacances')).not.toBeInTheDocument()
  })

  it('applique le pourcentage saisi au 13e mois', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    const pourcentage = screen.getByLabelText('Pourcentage du salaire mensuel (%)')
    await user.clear(pourcentage)
    await user.type(pourcentage, '150')
    expect(within(panneauPrimes()).getByText(euros(221_372))).toBeInTheDocument()
  })

  it('proratise le pécule sur les mois prestés l’année précédente', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    const mois = screen.getByLabelText('Mois prestés l’année précédente')
    await user.clear(mois)
    await user.type(mois, '6')
    expect(within(panneauPrimes()).getByText(euros(138_000))).toBeInTheDocument()
  })

  it('refuse un pourcentage hors bornes', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    const pourcentage = screen.getByLabelText('Pourcentage du salaire mensuel (%)')
    await user.clear(pourcentage)
    await user.type(pourcentage, '250')
    expect(screen.getByText('Indiquez un pourcentage entre 0 et 200 (100 = un mois de salaire).')).toBeInTheDocument()
  })

  it('signale que la cotisation spéciale du trimestre n’est pas recalculée', () => {
    render(<App dateIso={DATE} />)
    expect(within(panneauPrimes()).getByText(/cotisation spéciale/i)).toBeInTheDocument()
  })
})
```

Si un montant apparaît plusieurs fois dans le panneau, utilise `getAllByText(...)` avec une assertion de longueur, comme ailleurs dans ce fichier ; ne relâche aucune assertion.

Run : `npx vitest run src/App.test.tsx`
Expected : FAIL (les nouveaux tests).

- [ ] **Step 2 : ajouter les textes**

Dans `src/i18n/fr.ts`, dans `formulaire`, après le bloc `voiture`, ajoute :

```ts
    primes: {
      titre: '13e mois et pécule de vacances',
      treizieme: '13e mois',
      treiziemePourcentage: 'Pourcentage du salaire mensuel (%)',
      aideTreiziemePourcentage: '100 correspond à un mois complet. Certaines conventions donnent davantage.',
      treiziemeMoisPrestes: 'Mois prestés cette année',
      pecule: 'Double pécule de vacances',
      peculeMoisPrestes: 'Mois prestés l’année précédente',
      aidePeculeMoisPrestes: 'C’est l’année précédente qui ouvre le droit au pécule.',
    },
```

et, après le bloc `atnVoiture`, ajoute :

```ts
  primes: {
    titre: '13e mois et pécule de vacances',
    treizieme: '13e mois',
    pecule: 'Double pécule de vacances',
    brut: {
      libelle: 'Brut',
      explication: 'Le montant brut de la prime, avant toute retenue.',
      source: 'Salaire mensuel × pourcentage, proratisé par les mois prestés',
    },
    retenueOnss: {
      libelle: 'Cotisations ONSS (13,07 %)',
      explication: 'Le 13e mois est de la rémunération ordinaire : il supporte les mêmes cotisations que le salaire.',
      source: 'ONSS — cotisation personnelle',
    },
    retenuePecule: {
      libelle: 'Retenue ONSS (13,07 %)',
      explication:
        'Le double pécule n’est pas soumis aux cotisations ordinaires, mais à une retenue propre, au même taux et sur la part fixée par l’ONSS.',
      source: 'ONSS — retenue sur le double pécule de vacances',
    },
    precompte: { libelle: 'Précompte professionnel', source: 'SPF Finances — barème des allocations exceptionnelles' },
    /** « 43,41 % : rémunération annuelle de 32 621,28 €, tranche jusqu’à 34 640,00 €. » */
    explicationPrecompte: (p: { taux: string; base: string; tranche: string | null; reduction: string | null }) =>
      `${p.taux} : rémunération annuelle de ${p.base}, ${p.tranche === null ? 'dernière tranche du barème' : `tranche jusqu’à ${p.tranche}`}.` +
      (p.reduction === null ? '' : ` Réduction pour enfants à charge : ${p.reduction}.`),
    net: {
      libelle: 'Net',
      explication: 'Ce qui reste de la prime après la retenue sociale et le précompte.',
      source: 'Brut − retenue − précompte',
    },
    noteCotisationSpeciale:
      'La cotisation spéciale de sécurité sociale se calcule par trimestre : elle n’est pas recalculée ici, le net d’une prime est donc un peu optimiste sur le trimestre où elle tombe.',
  },
```

- [ ] **Step 3 : le bloc du formulaire**

Dans `src/components/FormulaireSituation.tsx` :

1. l'import de `../engine/validation` gagne `type SaisiePrimes` ;
2. dans le corps du composant, après `modifierVoiture`, ajoute :
```ts
  const pr = saisie.primes
  const tp = t.primes
  const modifierPrime = <K extends keyof SaisiePrimes>(champ: K, valeur: SaisiePrimes[K]) => onChange('primes', { ...pr, [champ]: valeur })
```
3. juste **après** le `</fieldset>` du bloc voiture, insère :
```tsx
        <fieldset className="border-t border-slate-200 pt-4 dark:border-slate-700">
          <legend className="font-medium">{tp.titre}</legend>

          <label className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={pr.treiziemeActif}
              onChange={(e) => modifierPrime('treiziemeActif', e.target.checked)}
              className="size-4 accent-blue-700"
            />
            {tp.treizieme}
          </label>
          {pr.treiziemeActif && (
            <div className="mt-2 space-y-3 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
              <ChampAvantage
                id="treiziemePourcentage"
                libelle={tp.treiziemePourcentage}
                valeur={pr.treiziemePourcentage}
                aide={tp.aideTreiziemePourcentage}
                erreur={erreurTexte(erreurs.treiziemePourcentage)}
                onChange={(valeur) => modifierPrime('treiziemePourcentage', valeur)}
              />
              <ChampAvantage
                id="treiziemeMoisPrestes"
                libelle={tp.treiziemeMoisPrestes}
                valeur={pr.treiziemeMoisPrestes}
                erreur={erreurTexte(erreurs.treiziemeMoisPrestes)}
                onChange={(valeur) => modifierPrime('treiziemeMoisPrestes', valeur)}
              />
            </div>
          )}

          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={pr.peculeActif}
              onChange={(e) => modifierPrime('peculeActif', e.target.checked)}
              className="size-4 accent-blue-700"
            />
            {tp.pecule}
          </label>
          {pr.peculeActif && (
            <div className="mt-2 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
              <ChampAvantage
                id="peculeMoisPrestes"
                libelle={tp.peculeMoisPrestes}
                valeur={pr.peculeMoisPrestes}
                aide={tp.aidePeculeMoisPrestes}
                erreur={erreurTexte(erreurs.peculeMoisPrestes)}
                onChange={(valeur) => modifierPrime('peculeMoisPrestes', valeur)}
              />
            </div>
          )}
        </fieldset>
```

- [ ] **Step 4 : le panneau**

Crée `src/components/PrimesAnnuelles.tsx` :

```tsx
import type { ResultatAllocation } from '../engine/allocationsExceptionnelles'
import type { ResultatPrimes } from '../engine/primesAnnuelles'
import { fr } from '../i18n/fr'
import { formatDixMilliemes, formatEuro } from '../utils/format'
import { LigneCalcul } from './LigneCalcul'

interface TexteLigne {
  libelle: string
  explication: string
  source: string
}

function Prime({ titre, resultat, retenue }: { titre: string; resultat: ResultatAllocation; retenue: TexteLigne }) {
  const t = fr.primes
  const explicationPrecompte = t.explicationPrecompte({
    taux: formatDixMilliemes(resultat.tauxPrecompteDixMilliemes),
    base: formatEuro(resultat.baseAnnuelleCentimes),
    tranche: resultat.trancheJusquaCentimes === null ? null : formatEuro(resultat.trancheJusquaCentimes),
    reduction: resultat.reductionEnfantsDixMilliemes === 0 ? null : formatDixMilliemes(resultat.reductionEnfantsDixMilliemes),
  })
  return (
    <div>
      <h3 className="font-medium">{titre}</h3>
      <ul className="divide-y divide-slate-200 dark:divide-slate-700">
        <LigneCalcul {...t.brut} sens="=" montantCentimes={resultat.brutCentimes} />
        <LigneCalcul {...retenue} sens="-" montantCentimes={resultat.retenueSocialeCentimes} />
        <LigneCalcul
          libelle={t.precompte.libelle}
          explication={explicationPrecompte}
          source={t.precompte.source}
          sens="-"
          montantCentimes={resultat.precompteCentimes}
        />
        <LigneCalcul {...t.net} sens="=" montantCentimes={resultat.netCentimes} />
      </ul>
    </div>
  )
}

/** Le 13e mois et le double pécule, chacun avec son détail (spec primes annuelles § 5.2). */
export function PrimesAnnuelles({ primes }: { primes: ResultatPrimes | null }) {
  const t = fr.primes
  if (primes === null || (primes.treizieme === null && primes.pecule === null)) {
    return null
  }
  return (
    <section aria-labelledby="titre-primes" className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
      <h2 id="titre-primes" className="mb-2 text-lg font-semibold">
        {t.titre}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {primes.treizieme && <Prime titre={t.treizieme} resultat={primes.treizieme} retenue={t.retenueOnss} />}
        {primes.pecule && <Prime titre={t.pecule} resultat={primes.pecule} retenue={t.retenuePecule} />}
      </div>
      <p className="mt-4 text-xs text-slate-600 dark:text-slate-400">{t.noteCotisationSpeciale}</p>
    </section>
  )
}
```

Dans `src/App.tsx`, importe `PrimesAnnuelles` et ajoute, après le `<div className="order-3">` qui contient le détail :

```tsx
          <div className="order-4 lg:col-span-2">
            <PrimesAnnuelles primes={ok?.primes ?? null} />
          </div>
```

Run : `npx vitest run src/App.test.tsx`
Expected : PASS.

- [ ] **Step 5 : README et statut de la spec**

Dans `README.md` :

1. le deuxième paragraphe gagne, à la fin : « Le 13e mois et le double pécule de vacances sont calculés à part, au barème des allocations exceptionnelles. » ;
2. dans « Comment l'exactitude est vérifiée », ajoute une puce après celle de l'avantage de toute nature :
```
- 13e mois et double pécule de vacances : ces montants ne suivent pas la formule mensuelle. Le précompte est un pourcentage unique, choisi selon la rémunération annuelle (onze tranches, une colonne pour le pécule et une pour les autres allocations), avec une réduction pour enfants à charge. Le 13e mois supporte les cotisations ONSS ordinaires ; le double pécule, une retenue propre de 13,07 %. La cotisation spéciale de sécurité sociale, qui se calcule par trimestre, n'est pas recalculée : le net d'une prime est donc un peu optimiste sur le trimestre où elle tombe. `tools/reference/reference.py` recalcule le barème indépendamment du moteur.
```
3. dans « Sources », ajoute les références relevées en tâche 1 pour le barème des allocations exceptionnelles et pour la retenue sur le double pécule ;
4. dans « Limites de la V1 », la phrase « Pas d'ouvriers, de temps partiel, de 13e mois ni de pécule de vacances. » devient :
```
Pas d'ouvriers ni de temps partiel. Le 13e mois et le double pécule sont calculés, mais pas le simple pécule, ni le pécule de sortie, ni les primes sectorielles à montant forfaitaire.
```

Dans la spec, la ligne `- **Statut :** …` devient `- **Statut :** appliquée`.

- [ ] **Step 6 : vérifier et commiter**

Run : `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`
Expected : tout vert.

```bash
git add src/components/PrimesAnnuelles.tsx src/components/FormulaireSituation.tsx src/App.tsx src/App.test.tsx src/i18n/fr.ts README.md docs/superpowers/specs/2026-09-23-primes-annuelles-design.md
git commit -F - <<'EOF'
feat: panneau du 13e mois et du pécule de vacances

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```
