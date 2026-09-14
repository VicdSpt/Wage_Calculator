# Salaire net Belgique V1 — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** construire le calculateur brut → net mensuel d'un employé belge à temps plein, exact au centime selon les règles officielles de juillet à décembre 2026.

**Architecture :** une application React sans serveur. Toute la logique vit dans `src/engine/`, en TypeScript pur : fonctions sans effet de bord, montants en centimes entiers, paramètres officiels rangés par période de validité. L'interface valide la saisie, appelle le moteur et affiche le détail ligne par ligne. Un script Python indépendant (`tools/reference/reference.py`) recalcule 74 cas depuis les textes officiels ; le moteur doit les reproduire au centime.

**Tech Stack :** Vite 8 (modèle `react-ts`), React 19, TypeScript 6 strict, Tailwind CSS 4 (`@tailwindcss/vite`), Vitest 4 + jsdom + React Testing Library, oxlint, Python 3 (script de référence uniquement).

**Spec :** `docs/superpowers/specs/2026-09-14-salaire-net-belgique-v1-design.md`. Le lire avant de commencer, en particulier § 4 (saisies), § 5 (algorithme) et § 8 (tests).

## Global Constraints

- Dossier du projet : `E:\ALL DOCUMENTS\PROJECTS CODE\Wage_Calculator` ; dépôt `https://github.com/VicdSpt/Wage_Calculator`, branche `main`. Toutes les commandes se lancent depuis ce dossier, dans PowerShell.
- Node ≥ 25 (testé avec 25.2.1), npm ≥ 11, Python ≥ 3.10.
- Moteur : **aucun** import de React, du DOM ou du navigateur dans `src/engine/`.
- Montants en **centimes entiers**, taux en **dix-millièmes entiers**. Jamais de `Math.round` sur des euros flottants : toujours `diviserArrondi` / `appliquerTaux` (`src/engine/argent.ts`).
- Arrondi : au centime le plus proche à chaque étape, une moitié exacte arrondie en s'éloignant de zéro (SPF-FC-2026 n° 3).
- Dates : chaînes `AAAA-MM-JJ`. Périodes couvertes : du `2026-07-01` au `2026-12-31`.
- Interface en français ; tous les textes affichés sont dans `src/i18n/fr.ts`.
- Clé localStorage : `wage-calculator:saisie:v1`. Chaque accès au stockage est protégé par `try/catch`.
- Aucune dépendance en plus de celles installées à la tâche 1.
- Chaque tâche se termine par des tests verts, un commit en français (préfixe `feat:`, `test:`, `chore:` ou `docs:`) terminé par la ligne `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`, puis `git push`.
- Ne jamais modifier `src/engine/__tests__/references.json` à la main : il est généré par `python tools/reference/reference.py`.

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `vite.config.ts` | Vite + Tailwind + configuration Vitest |
| `src/test/setup.ts` | matchers jest-dom, nettoyage du DOM et du localStorage après chaque test |
| `src/engine/argent.ts` | arithmétique entière : `diviserArrondi`, `appliquerTaux`, `eurosTexteEnCentimes` |
| `src/engine/types.ts` | `Situation`, `Intermediaires`, `Ligne`, `Resultat`, `PeriodeNonCouverte` |
| `src/engine/parametres/types.ts` | forme d'un jeu de paramètres |
| `src/engine/parametres/p2026-07.ts`, `p2026-09.ts` | valeurs officielles par période, source en commentaire |
| `src/engine/parametres/index.ts` | `getParametres(dateIso)` |
| `src/engine/onss.ts` | étape 1 |
| `src/engine/bonusEmploiSocial.ts` | étape 2 |
| `src/engine/precompte.ts` | étapes 4 à 10 |
| `src/engine/cotisationSpeciale.ts` | étape 11 |
| `src/engine/validation.ts` | saisie du formulaire → `Situation` ou erreurs |
| `src/engine/calculerNet.ts` | orchestration → `Resultat` |
| `tools/reference/reference.py` | script de référence indépendant → `src/engine/__tests__/references.json` |
| `src/utils/format.ts` | formats euro, pourcentage et dates |
| `src/i18n/fr.ts` | tous les textes |
| `src/hooks/useSaisie.ts` | état du formulaire + localStorage |
| `src/hooks/useCalcul.ts` | saisie → état du calcul |
| `src/components/*.tsx` | formulaire, récapitulatif, détail, lignes, info-bulles, avertissements |
| `src/App.tsx` | mise en page |

---

### Task 1 : Initialiser le projet

**Files :**
- Create (via le modèle Vite) : `package.json`, `index.html`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `.oxlintrc.json`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Delete : `README.md` du modèle, `src/App.css`, `src/assets/`, `public/`
- Create : `src/test/setup.ts`

**Interfaces :**
- Consumes : rien.
- Produces : les scripts `npm run dev`, `npm run build`, `npm run lint`, `npm test`, `npm run typecheck` ; un environnement Vitest jsdom dans lequel `localStorage` fonctionne.

- [ ] **Step 1 : Générer le modèle Vite dans un sous-dossier et le remonter à la racine**

Le dossier contient déjà `.git` et `docs/`, et le générateur refuse un dossier non vide sans question interactive. On génère donc à côté, puis on déplace.

```powershell
npm create vite@latest _scaffold -- --template react-ts --no-interactive
Get-ChildItem -Force _scaffold | Move-Item -Destination .
Remove-Item _scaffold
Remove-Item README.md, src/App.css
Remove-Item -Recurse src/assets, public
```

Attendu : `git status` montre les nouveaux fichiers du modèle, `docs/` est intact.

- [ ] **Step 2 : Installer les dépendances et déclarer les scripts**

```powershell
npm install
npm install -D tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm pkg set name=wage-calculator
npm pkg set scripts.test="vitest run" scripts.test:watch="vitest" scripts.typecheck="tsc -b"
```

Attendu : `found 0 vulnerabilities` ; `package.json` contient les scripts `dev`, `build`, `lint`, `preview`, `test`, `test:watch`, `typecheck`.

- [ ] **Step 3 : Configurer Vite, Tailwind et Vitest**

Remplacer `vite.config.ts` :

```ts
﻿import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    // Node 25+ expose un localStorage natif qui masque celui de jsdom
    execArgv: ['--no-experimental-webstorage'],
  },
})
```

Pourquoi `execArgv` : Node 25 active par défaut un `localStorage` natif expérimental. Il masque celui de jsdom et fait échouer `localStorage.clear()` avec « is not a function ».

- [ ] **Step 4 : Activer TypeScript strict et l'import de fichiers JSON**

Remplacer `tsconfig.app.json` :

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client"],
    "allowArbitraryExtensions": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 5 : Écrire les fichiers d'entrée et le setup des tests**

`index.html` :

```html
<!doctype html>
<html lang="fr-BE">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Calculez votre salaire net belge à partir du brut, avec le détail officiel de chaque retenue." />
    <title>Salaire net Belgique</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/index.css` :

```css
@import 'tailwindcss';
```

`src/main.tsx` :

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/App.tsx` (version provisoire, remplacée à la tâche 11) :

```tsx
export default function App() {
  return <h1 className="p-8 text-2xl font-bold">Salaire net Belgique</h1>
}
```

`src/test/setup.ts` :

```ts
﻿import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  localStorage.clear()
})
```

- [ ] **Step 6 : Vérifier que tout démarre**

```powershell
npm run build
npm run lint
npx vitest run --passWithNoTests
```

Attendu : `✓ built in …` ; oxlint sans erreur ; `No test files found, exiting with code 0`.

- [ ] **Step 7 : Commit**

```powershell
git add -A
git commit -m "chore: initialise le projet Vite React TypeScript avec Tailwind et Vitest" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 2 : Arithmétique en centimes

**Files :**
- Create : `src/engine/argent.ts`
- Test : `src/engine/argent.test.ts`

**Interfaces :**
- Consumes : rien.
- Produces :
  - `DIX_MILLE: 10000`
  - `diviserArrondi(numerateur: number, diviseur: number): number` — entiers sûrs uniquement, diviseur > 0, sinon `RangeError`
  - `appliquerTaux(centimes: number, tauxDixMilliemes: number): number`
  - `eurosTexteEnCentimes(texte: string): number | null`

- [ ] **Step 1 : Écrire les tests**

`src/engine/argent.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { appliquerTaux, diviserArrondi, eurosTexteEnCentimes } from './argent'

describe('diviserArrondi', () => {
  it('arrondit une moitié exacte vers le haut', () => {
    expect(diviserArrondi(5, 10)).toBe(1)
    expect(diviserArrondi(15, 10)).toBe(2)
  })

  it('arrondit sous la moitié vers le bas et au-dessus vers le haut', () => {
    expect(diviserArrondi(4, 10)).toBe(0)
    expect(diviserArrondi(6, 10)).toBe(1)
  })

  it('éloigne de zéro une moitié négative', () => {
    expect(diviserArrondi(-5, 10)).toBe(-1)
    expect(diviserArrondi(-4, 10)).toBe(0)
  })

  it('reste exact sur de grands montants', () => {
    // 1 200 000 000 × 5 350 + 5 000 = 6 420 000 005 000 → ÷ 10 000 = 642 000 000,5 → 642 000 001
    expect(diviserArrondi(1_200_000_000 * 5350 + 5000, 10_000)).toBe(642_000_001)
  })

  it('refuse les non-entiers et un diviseur nul ou négatif', () => {
    expect(() => diviserArrondi(1.5, 10)).toThrow(RangeError)
    expect(() => diviserArrondi(10, 0)).toThrow(RangeError)
    expect(() => diviserArrondi(10, -2)).toThrow(RangeError)
  })
})

describe('appliquerTaux', () => {
  it('calcule 13,07 % de 3 000,00 €', () => {
    expect(appliquerTaux(300_000, 1307)).toBe(39_210)
  })

  it('arrondit 0,5 centime vers le haut', () => {
    // 1 centime × 50 % = 0,5 centime → 1 centime
    expect(appliquerTaux(1, 5000)).toBe(1)
    // 3 centimes × 16,67 % = 0,5001 → 1 centime ; 2 centimes × 12,5 % = 0,25 → 0
    expect(appliquerTaux(3, 1667)).toBe(1)
    expect(appliquerTaux(2, 1250)).toBe(0)
  })
})

describe('eurosTexteEnCentimes', () => {
  it.each([
    ['3000', 300_000],
    ['3000,5', 300_050],
    ['3000.50', 300_050],
    ['3 000,50', 300_050],
    ['3\u202f000,50', 300_050],
    ['0,01', 1],
  ])('convertit « %s » en %i centimes', (texte, attendu) => {
    expect(eurosTexteEnCentimes(texte)).toBe(attendu)
  })

  it.each(['', 'abc', '3000,501', '-5', '3,000.50', '1e3'])('refuse « %s »', (texte) => {
    expect(eurosTexteEnCentimes(texte)).toBeNull()
  })
})
```

- [ ] **Step 2 : Vérifier qu'ils échouent**

Run : `npx vitest run src/engine/argent.test.ts`
Attendu : FAIL, `Failed to resolve import "./argent"`.

- [ ] **Step 3 : Implémenter**

`src/engine/argent.ts` :

```ts
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
```

Pourquoi `%` puis `(numerateur - reste) / diviseur` : ces deux opérations restent exactes sur des entiers, alors que `Math.trunc(numerateur / diviseur)` passe par un flottant.

- [ ] **Step 4 : Vérifier qu'ils passent**

Run : `npx vitest run src/engine/argent.test.ts`
Attendu : PASS, 19 tests.

- [ ] **Step 5 : Commit**

```powershell
git add src/engine/argent.ts src/engine/argent.test.ts
git commit -m "feat: arithmétique entière en centimes avec arrondi officiel" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 3 : Types du moteur et paramètres par période

**Files :**
- Create : `src/engine/types.ts`, `src/engine/parametres/types.ts`, `src/engine/parametres/p2026-07.ts`, `src/engine/parametres/p2026-09.ts`, `src/engine/parametres/index.ts`
- Test : `src/engine/parametres/parametres.test.ts`

**Interfaces :**
- Consumes : rien.
- Produces :
  - `REVENUS_CONJOINT` (tuple), `RevenusConjoint`, `EtatCivil`, `Situation`, `Intermediaires`, `IdLigne`, `Ligne`, `Resultat`, `class PeriodeNonCouverte extends Error { dateIso: string }` (`src/engine/types.ts`)
  - `VoletBonus`, `TrancheBareme`, `TrancheCotisation`, `CategorieCotisation`, `ParametresPrecompte`, `Parametres` (`src/engine/parametres/types.ts`)
  - `P2026_07: Parametres`, `P2026_09: Parametres`
  - `PERIODES: readonly Parametres[]`, `getParametres(dateIso: string): Parametres` — `RangeError` si le format est faux, `PeriodeNonCouverte` hors période

- [ ] **Step 1 : Écrire les tests**

`src/engine/parametres/parametres.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { PeriodeNonCouverte } from '../types'
import { getParametres, PERIODES } from './index'

describe('getParametres', () => {
  it.each([
    ['2026-07-01', 'P2026-07'],
    ['2026-08-31', 'P2026-07'],
    ['2026-09-01', 'P2026-09'],
    ['2026-12-31', 'P2026-09'],
  ])('le %s utilise %s', (date, id) => {
    expect(getParametres(date).id).toBe(id)
  })

  it.each(['2026-06-30', '2027-01-01'])('lève PeriodeNonCouverte pour le %s', (date) => {
    expect(() => getParametres(date)).toThrow(PeriodeNonCouverte)
  })

  it('refuse une date mal formée', () => {
    expect(() => getParametres('14/09/2026')).toThrow(RangeError)
  })

  it('a des périodes contiguës, sans chevauchement', () => {
    for (let i = 1; i < PERIODES.length; i++) {
      const finPrecedente = new Date(`${PERIODES[i - 1].valideAu}T00:00:00Z`)
      const debut = new Date(`${PERIODES[i].valideDu}T00:00:00Z`)
      expect(debut.getTime() - finPrecedente.getTime()).toBe(24 * 60 * 60 * 1000)
    }
  })

  it('termine chaque barème de cotisation spéciale par une tranche ouverte', () => {
    for (const periode of PERIODES) {
      for (const tranches of Object.values(periode.cotisationSpeciale)) {
        expect(tranches.at(-1)?.jusquaCentimes).toBeNull()
      }
    }
  })
})
```

- [ ] **Step 2 : Vérifier qu'ils échouent**

Run : `npx vitest run src/engine/parametres`
Attendu : FAIL, `Failed to resolve import "../types"`.

- [ ] **Step 3 : Écrire les types du moteur**

`src/engine/types.ts` :

```ts
export const REVENUS_CONJOINT = [
  'aucun',
  'pensionMax174',
  'pensionMax579',
  'autresMax290',
  'superieurs',
] as const

/** Les 5 cas officiels de revenus du conjoint (spec § 4). */
export type RevenusConjoint = (typeof REVENUS_CONJOINT)[number]

export type EtatCivil = 'isole' | 'marieOuCohabitant'

/** Situation validée, prête pour le moteur. Tous les montants sont en centimes. */
export interface Situation {
  brutMensuelCentimes: number
  etatCivil: EtatCivil
  /** null si isolé. */
  revenusConjoint: RevenusConjoint | null
  enfantsACharge: number
  parentIsole: boolean
}

/** Toutes les valeurs intermédiaires du calcul, en centimes (spec § 5.2). */
export interface Intermediaires {
  onss: number
  bonusVoletA: number
  bonusVoletB: number
  bonusSocial: number
  onssNet: number
  imposableMensuel: number
  annuelBrut: number
  fraisForfaitaires: number
  netImposable: number
  revenuImpute: number
  impotBase: number
  reductionsAccordees: number
  impotAnnuel: number
  precompteAvantBonus: number
  bonusFiscal: number
  precompte: number
  cotisationSpeciale: number
  net: number
}

export type IdLigne =
  | 'brut'
  | 'onss'
  | 'bonusVoletA'
  | 'bonusVoletB'
  | 'imposableMensuel'
  | 'precompteAvantBonus'
  | 'bonusFiscal'
  | 'cotisationSpeciale'
  | 'net'

/** Une ligne du détail affiché. Le libellé vient de i18n/fr.ts via l'id. */
export interface Ligne {
  id: IdLigne
  sens: '+' | '-' | '='
  montantCentimes: number
  source: string
}

export interface Resultat {
  periode: { id: string; valideDu: string; valideAu: string }
  lignes: Ligne[]
  intermediaires: Intermediaires
  netMensuelCentimes: number
  netAnnuelCentimes: number
  /** net / brut, pour l'affichage uniquement. */
  tauxRetour: number
}

export class PeriodeNonCouverte extends Error {
  readonly dateIso: string

  constructor(dateIso: string) {
    super(`Aucune règle intégrée pour la date ${dateIso}`)
    this.name = 'PeriodeNonCouverte'
    this.dateIso = dateIso
  }
}
```

`src/engine/parametres/types.ts` :

```ts
/** Un volet du bonus à l'emploi (ONSS-BE-2026/3, colonne employés). */
export interface VoletBonus {
  maxCentimes: number
  plancherCentimes: number
  plafondCentimes: number
  coefDixMilliemes: number
}

/** Tranche du barème de base : impôt = fixe + taux × (revenu − auDelaDe). */
export interface TrancheBareme {
  auDelaDeCentimes: number
  fixeCentimes: number
  tauxDixMilliemes: number
}

/**
 * Tranche mensuelle de cotisation spéciale, pour un brut ≤ jusqua (null = sans limite) :
 * montant = fixe + taux × (brut − seuil), borné par min et max.
 */
export interface TrancheCotisation {
  jusquaCentimes: number | null
  fixeCentimes: number
  tauxDixMilliemes: number
  seuilCentimes: number
  minCentimes: number
  maxCentimes: number | null
}

export type CategorieCotisation =
  | 'individuelle'
  | 'communeConjointAvecRevenus'
  | 'communeConjointSansRevenus'

export interface ParametresPrecompte {
  fraisForfaitairesTauxDixMilliemes: number
  fraisForfaitairesMaxCentimes: number
  bareme: readonly TrancheBareme[]
  impotQuotiteExempteeCentimes: number
  quotientConjugalTauxDixMilliemes: number
  quotientConjugalMaxCentimes: number
  /** Index = nombre d'enfants (0 à 8). */
  reductionEnfantsCentimes: readonly number[]
  /** Par enfant au-delà du dernier index du tableau. */
  reductionEnfantSupplementaireCentimes: number
  reductionParentIsoleCentimes: number
  reductionConjointAutresMax290Centimes: number
  reductionConjointPensionMax579Centimes: number
  bonusFiscalVoletADixMilliemes: number
  bonusFiscalVoletBDixMilliemes: number
}

export interface Parametres {
  id: string
  /** AAAA-MM-JJ, inclus. */
  valideDu: string
  /** AAAA-MM-JJ, inclus. */
  valideAu: string
  onssTauxPersonnelDixMilliemes: number
  bonusEmploi: { voletA: VoletBonus; voletB: VoletBonus }
  precompte: ParametresPrecompte
  cotisationSpeciale: Record<CategorieCotisation, readonly TrancheCotisation[]>
  rmmmgCentimes: number
}
```

- [ ] **Step 4 : Écrire les paramètres officiels**

Chaque valeur vient de la spec § 5.2 et § 5.3. Les seuils mensuels de la cotisation spéciale sont les seuils trimestriels ÷ 3 ; une borne « < X » devient « ≤ X − 1 centime ».

`src/engine/parametres/p2026-07.ts` :

```ts
import type { Parametres } from './types'

/**
 * Règles du 01/07/2026 au 31/08/2026.
 * Sources (spec § 3) : SPF-FC-2026, ONSS-BE-2026/3, ONSS-CSSS-2026/3, SECUREX-RMMMG.
 */
export const P2026_07: Parametres = {
  id: 'P2026-07',
  valideDu: '2026-07-01',
  valideAu: '2026-08-31',

  // ONSS : cotisation personnelle des travailleurs salariés
  onssTauxPersonnelDixMilliemes: 1307,

  // ONSS-BE-2026/3 « Tranches et montants d'application pour juillet et août 2026 », employés
  bonusEmploi: {
    voletA: { maxCentimes: 12_754, plancherCentimes: 293_793, plafondCentimes: 333_698, coefDixMilliemes: 3196 },
    voletB: { maxCentimes: 17_199, plancherCentimes: 230_062, plafondCentimes: 293_793, coefDixMilliemes: 2699 },
  },

  precompte: {
    // SPF-FC-2026 n° 8, 1° : 30 %, maximum 6 070 €
    fraisForfaitairesTauxDixMilliemes: 3000,
    fraisForfaitairesMaxCentimes: 607_000,
    // SPF-FC-2026 annexe 1 : barème de base
    bareme: [
      { auDelaDeCentimes: 0, fixeCentimes: 0, tauxDixMilliemes: 2675 },
      { auDelaDeCentimes: 1_671_000, fixeCentimes: 446_993, tauxDixMilliemes: 4280 },
      { auDelaDeCentimes: 2_950_000, fixeCentimes: 994_405, tauxDixMilliemes: 4815 },
      { auDelaDeCentimes: 5_105_000, fixeCentimes: 2_032_038, tauxDixMilliemes: 5350 },
    ],
    // SPF-FC-2026 n° 11, a : impôt sur la quotité exemptée de 11 170 €
    impotQuotiteExempteeCentimes: 298_798,
    // SPF-FC-2026 n° 11, b : 30 % imputés au conjoint, maximum 13 790 €
    quotientConjugalTauxDixMilliemes: 3000,
    quotientConjugalMaxCentimes: 1_379_000,
    // SPF-FC-2026 annexe 3
    reductionEnfantsCentimes: [0, 62_400, 165_600, 440_400, 762_000, 1_110_000, 1_459_200, 1_812_000, 2_199_600],
    reductionEnfantSupplementaireCentimes: 386_400,
    // SPF-FC-2026 annexe 4, 1
    reductionParentIsoleCentimes: 62_400,
    // SPF-FC-2026 annexe 4, 5
    reductionConjointAutresMax290Centimes: 174_000,
    // SPF-FC-2026 annexe 4, 6
    reductionConjointPensionMax579Centimes: 347_400,
    // SPF-FC-2026 n° 20
    bonusFiscalVoletADixMilliemes: 3314,
    bonusFiscalVoletBDixMilliemes: 5254,
  },

  // ONSS-CSSS-2026/3, montants trimestriels ÷ 3 (spec § 5.2, étape 11)
  cotisationSpeciale: {
    individuelle: [
      { jusquaCentimes: 194_538, fixeCentimes: 0, tauxDixMilliemes: 0, seuilCentimes: 0, minCentimes: 0, maxCentimes: null },
      { jusquaCentimes: 219_018, fixeCentimes: 0, tauxDixMilliemes: 422, seuilCentimes: 194_538, minCentimes: 0, maxCentimes: null },
      { jusquaCentimes: 373_700, fixeCentimes: 1_033, tauxDixMilliemes: 110, seuilCentimes: 219_018, minCentimes: 0, maxCentimes: null },
      { jusquaCentimes: 410_000, fixeCentimes: 2_735, tauxDixMilliemes: 338, seuilCentimes: 373_700, minCentimes: 0, maxCentimes: null },
      { jusquaCentimes: 603_882, fixeCentimes: 3_961, tauxDixMilliemes: 110, seuilCentimes: 410_000, minCentimes: 0, maxCentimes: null },
      { jusquaCentimes: null, fixeCentimes: 6_094, tauxDixMilliemes: 0, seuilCentimes: 0, minCentimes: 0, maxCentimes: null },
    ],
    communeConjointAvecRevenus: [
      // trimestre < 3 285,29 € ⇔ mois ≤ 1 095,09 €
      { jusquaCentimes: 109_509, fixeCentimes: 0, tauxDixMilliemes: 0, seuilCentimes: 0, minCentimes: 0, maxCentimes: null },
      // trimestre < 5 836,14 € ⇔ mois ≤ 1 945,37 €
      { jusquaCentimes: 194_537, fixeCentimes: 515, tauxDixMilliemes: 0, seuilCentimes: 0, minCentimes: 0, maxCentimes: null },
      { jusquaCentimes: 219_018, fixeCentimes: 0, tauxDixMilliemes: 590, seuilCentimes: 194_538, minCentimes: 515, maxCentimes: null },
      { jusquaCentimes: null, fixeCentimes: 1_444, tauxDixMilliemes: 110, seuilCentimes: 219_018, minCentimes: 0, maxCentimes: 5_164 },
    ],
    communeConjointSansRevenus: [
      { jusquaCentimes: 194_538, fixeCentimes: 0, tauxDixMilliemes: 0, seuilCentimes: 0, minCentimes: 0, maxCentimes: null },
      { jusquaCentimes: 219_018, fixeCentimes: 0, tauxDixMilliemes: 590, seuilCentimes: 194_538, minCentimes: 0, maxCentimes: null },
      { jusquaCentimes: null, fixeCentimes: 1_444, tauxDixMilliemes: 110, seuilCentimes: 219_018, minCentimes: 0, maxCentimes: 6_094 },
    ],
  },

  // SECUREX-RMMMG (source secondaire), 18 ans et plus, à partir de juillet 2026
  rmmmgCentimes: 223_361,
}
```

`src/engine/parametres/p2026-09.ts` :

```ts
import { P2026_07 } from './p2026-07'
import type { Parametres } from './types'

/**
 * Règles du 01/09/2026 au 31/12/2026.
 * Seul le volet A du bonus à l'emploi change (ONSS-BE-2026/3 « à partir du 1er septembre 2026 »).
 */
export const P2026_09: Parametres = {
  ...P2026_07,
  id: 'P2026-09',
  valideDu: '2026-09-01',
  valideAu: '2026-12-31',
  bonusEmploi: {
    voletA: { maxCentimes: 12_754, plancherCentimes: 293_793, plafondCentimes: 340_362, coefDixMilliemes: 2739 },
    voletB: P2026_07.bonusEmploi.voletB,
  },
}
```

`src/engine/parametres/index.ts` :

```ts
import { PeriodeNonCouverte } from '../types'
import { P2026_07 } from './p2026-07'
import { P2026_09 } from './p2026-09'
import type { Parametres } from './types'

export const PERIODES: readonly Parametres[] = [P2026_07, P2026_09]

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/

/** Jeu de paramètres en vigueur à la date donnée (AAAA-MM-JJ). */
export function getParametres(dateIso: string): Parametres {
  if (!DATE_ISO.test(dateIso)) {
    throw new RangeError(`Date attendue au format AAAA-MM-JJ : « ${dateIso} »`)
  }
  const periode = PERIODES.find((p) => p.valideDu <= dateIso && dateIso <= p.valideAu)
  if (!periode) {
    throw new PeriodeNonCouverte(dateIso)
  }
  return periode
}
```

- [ ] **Step 5 : Vérifier qu'ils passent**

Run : `npx vitest run src/engine/parametres`
Attendu : PASS, 9 tests.

- [ ] **Step 6 : Commit**

```powershell
git add src/engine/types.ts src/engine/parametres
git commit -m "feat: types du moteur et paramètres officiels par période (juillet et septembre 2026)" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 4 : Bonus à l'emploi social

**Files :**
- Create : `src/engine/bonusEmploiSocial.ts`
- Test : `src/engine/bonusEmploiSocial.test.ts`

**Interfaces :**
- Consumes : `DIX_MILLE`, `diviserArrondi` (tâche 2) ; `Parametres`, `VoletBonus`, `P2026_07`, `P2026_09` (tâche 3).
- Produces :
  - `interface BonusEmploiSocial { voletA: number; voletB: number; total: number }`
  - `montantVolet(salaireCentimes: number, volet: VoletBonus): number`
  - `calculerBonusEmploiSocial(brutCentimes: number, onssCentimes: number, parametres: Parametres): BonusEmploiSocial`

- [ ] **Step 1 : Écrire les tests**

`src/engine/bonusEmploiSocial.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { calculerBonusEmploiSocial, montantVolet } from './bonusEmploiSocial'
import { P2026_07 } from './parametres/p2026-07'
import { P2026_09 } from './parametres/p2026-09'

const voletA = P2026_09.bonusEmploi.voletA
const voletB = P2026_09.bonusEmploi.voletB

describe('montantVolet — volet A (septembre 2026)', () => {
  it('donne le maximum jusqu’au plancher inclus', () => {
    expect(montantVolet(293_793, voletA)).toBe(12_754)
  })

  it('diminue au-dessus du plancher', () => {
    // 127,54 − 0,2739 × 0,01 = 127,537261 → 127,54
    expect(montantVolet(293_794, voletA)).toBe(12_754)
    // 127,54 − 0,2739 × 62,07 = 110,539027 → 110,54
    expect(montantVolet(300_000, voletA)).toBe(11_054)
  })

  it('arrondit R et non la partie soustraite (cas de la moitié exacte)', () => {
    // 127,54 − 0,2739 × 50,00 = 113,845 → 113,85 (arrondir la soustraction donnerait 113,84)
    expect(montantVolet(298_793, voletA)).toBe(11_385)
  })

  it('ne devient jamais négatif au plafond', () => {
    // 127,54 − 0,2739 × 465,69 = −0,013… → 0
    expect(montantVolet(340_362, voletA)).toBe(0)
  })

  it('vaut 0 au-dessus du plafond', () => {
    expect(montantVolet(340_363, voletA)).toBe(0)
  })

  it('utilise le plafond de juillet-août pendant cette période', () => {
    expect(montantVolet(335_000, P2026_07.bonusEmploi.voletA)).toBe(0)
    expect(montantVolet(335_000, voletA)).toBe(1_467)
  })
})

describe('montantVolet — volet B', () => {
  it('donne le maximum jusqu’au plancher inclus', () => {
    expect(montantVolet(230_062, voletB)).toBe(17_199)
  })

  it('diminue entre plancher et plafond', () => {
    // 171,99 − 0,2699 × 300,00 = 91,02
    expect(montantVolet(260_062, voletB)).toBe(9_102)
  })

  it('vaut 0 au-dessus du plafond', () => {
    expect(montantVolet(293_794, voletB)).toBe(0)
  })
})

describe('calculerBonusEmploiSocial', () => {
  it('additionne les volets quand l’ONSS suffit', () => {
    expect(calculerBonusEmploiSocial(300_000, 39_210, P2026_09)).toEqual({ voletA: 11_054, voletB: 0, total: 11_054 })
  })

  it('écrête d’abord le volet B', () => {
    // RMMMG : ONSS 291,93 < 127,54 + 171,99
    expect(calculerBonusEmploiSocial(223_361, 29_193, P2026_09)).toEqual({ voletA: 12_754, voletB: 16_439, total: 29_193 })
  })

  it('écrête ensuite le volet A si l’ONSS est inférieur au volet A', () => {
    expect(calculerBonusEmploiSocial(100_000, 10_000, P2026_09)).toEqual({ voletA: 10_000, voletB: 0, total: 10_000 })
  })
})
```

- [ ] **Step 2 : Vérifier qu'ils échouent**

Run : `npx vitest run src/engine/bonusEmploiSocial.test.ts`
Attendu : FAIL, `Failed to resolve import "./bonusEmploiSocial"`.

- [ ] **Step 3 : Implémenter**

`src/engine/bonusEmploiSocial.ts` :

```ts
import { DIX_MILLE, diviserArrondi } from './argent'
import type { Parametres, VoletBonus } from './parametres/types'

export interface BonusEmploiSocial {
  voletA: number
  voletB: number
  total: number
}

/**
 * Montant de base R d'un volet. L'ONSS arrondit R lui-même :
 * R = max − coef × (S − plancher), arrondi au centime, jamais négatif.
 */
export function montantVolet(salaireCentimes: number, volet: VoletBonus): number {
  if (salaireCentimes <= volet.plancherCentimes) {
    return volet.maxCentimes
  }
  if (salaireCentimes > volet.plafondCentimes) {
    return 0
  }
  const enDixMilliemesDeCentime =
    volet.maxCentimes * DIX_MILLE - volet.coefDixMilliemes * (salaireCentimes - volet.plancherCentimes)
  return Math.max(0, diviserArrondi(enDixMilliemesDeCentime, DIX_MILLE))
}

/** Étape 2 : volets A et B, écrêtés d'abord sur B puis sur A pour ne pas dépasser l'ONSS dû. */
export function calculerBonusEmploiSocial(
  brutCentimes: number,
  onssCentimes: number,
  parametres: Parametres,
): BonusEmploiSocial {
  let voletA = montantVolet(brutCentimes, parametres.bonusEmploi.voletA)
  let voletB = montantVolet(brutCentimes, parametres.bonusEmploi.voletB)
  if (voletA + voletB > onssCentimes) {
    voletB = Math.max(0, onssCentimes - voletA)
    voletA = Math.min(voletA, onssCentimes)
  }
  return { voletA, voletB, total: voletA + voletB }
}
```

Point clé : on calcule `max × 10 000 − coef × (S − plancher)` en dix-millièmes de centime, puis on arrondit **une seule fois**. C'est R que l'ONSS arrondit, pas la partie soustraite (le test « moitié exacte » le vérifie).

- [ ] **Step 4 : Vérifier qu'ils passent**

Run : `npx vitest run src/engine/bonusEmploiSocial.test.ts`
Attendu : PASS, 12 tests.

- [ ] **Step 5 : Commit**

```powershell
git add src/engine/bonusEmploiSocial.ts src/engine/bonusEmploiSocial.test.ts
git commit -m "feat: bonus à l'emploi social (volets A et B, écrêtement)" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 5 : Précompte professionnel

**Files :**
- Create : `src/engine/precompte.ts`
- Test : `src/engine/precompte.test.ts`

**Interfaces :**
- Consumes : `appliquerTaux`, `diviserArrondi` (tâche 2) ; `Situation`, `Parametres`, `ParametresPrecompte`, `TrancheBareme`, `P2026_09` (tâche 3) ; `BonusEmploiSocial` (tâche 4).
- Produces :
  - `interface DetailPrecompte { annuelBrut; fraisForfaitaires; netImposable; revenuImpute; impotBase; reductionsAccordees; impotAnnuel; precompteAvantBonus; bonusFiscal; precompte }` (tous des `number` en centimes)
  - `impotBareme(revenuCentimes: number, bareme: readonly TrancheBareme[]): number`
  - `reductionEnfants(enfants: number, p: ParametresPrecompte): number`
  - `utiliseQuotientConjugal(situation: Situation): boolean`
  - `calculerPrecompte(imposableMensuelCentimes: number, bonus: BonusEmploiSocial, situation: Situation, parametres: Parametres): DetailPrecompte`

- [ ] **Step 1 : Écrire les tests**

`src/engine/precompte.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { P2026_09 } from './parametres/p2026-09'
import { calculerPrecompte, impotBareme, reductionEnfants } from './precompte'
import type { Situation } from './types'

const p = P2026_09.precompte
const SANS_BONUS = { voletA: 0, voletB: 0, total: 0 }

function situation(modif: Partial<Situation> = {}): Situation {
  return { brutMensuelCentimes: 0, etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false, ...modif }
}

describe('impotBareme', () => {
  it.each([
    [0, 0],
    [1, 0], // 26,75 % de 0,01 € = 0,002675 → 0
    [1_117_000, 298_798], // quotité exemptée 11 170 € → 2 987,975 → 2 987,98
    [1_671_000, 446_993], // fin de la 1re tranche → 4 469,925 → 4 469,93
    [1_671_001, 446_993], // 4 469,93 + 42,80 % × 0,01 = 0,00428 → 0
    [2_950_000, 994_405], // fin de la 2e tranche
    [2_950_001, 994_405],
    [5_105_000, 2_032_038],
    [5_105_100, 2_032_092], // 20 320,38 + 53,50 % × 1,00 = 0,535 → 0,54
  ])('impôt sur %i centimes = %i centimes', (revenu, attendu) => {
    expect(impotBareme(revenu, p.bareme)).toBe(attendu)
  })
})

describe('reductionEnfants', () => {
  it.each([
    [0, 0],
    [1, 62_400],
    [2, 165_600],
    [3, 440_400],
    [8, 2_199_600],
    [9, 2_586_000],
    [10, 2_972_400],
  ])('%i enfant(s) → %i centimes', (enfants, attendu) => {
    expect(reductionEnfants(enfants, p)).toBe(attendu)
  })
})

describe('calculerPrecompte', () => {
  it('reproduit l’exemple de la spec (isolé, brut 3 000 €)', () => {
    const detail = calculerPrecompte(271_844, { voletA: 11_054, voletB: 0, total: 11_054 }, situation(), P2026_09)
    expect(detail).toEqual({
      annuelBrut: 3_262_128,
      fraisForfaitaires: 607_000,
      netImposable: 2_655_128,
      revenuImpute: 0,
      impotBase: 569_402,
      reductionsAccordees: 0,
      impotAnnuel: 569_402,
      precompteAvantBonus: 47_450,
      bonusFiscal: 3_663,
      precompte: 43_787,
    })
  })

  it('applique 30 % de frais forfaitaires sous le plafond', () => {
    // 1 500 € × 12 = 18 000 € → frais 5 400 €
    expect(calculerPrecompte(150_000, SANS_BONUS, situation(), P2026_09).fraisForfaitaires).toBe(540_000)
  })

  it('utilise le quotient conjugal et le plafonne à 13 790 €', () => {
    const detail = calculerPrecompte(600_000, SANS_BONUS, situation({ etatCivil: 'marieOuCohabitant', revenusConjoint: 'aucun' }), P2026_09)
    expect(detail.netImposable).toBe(6_593_000)
    expect(detail.revenuImpute).toBe(1_379_000)
  })

  it('traite une pension du conjoint ≤ 174 € comme une absence de revenus', () => {
    const sansRevenus = calculerPrecompte(300_000, SANS_BONUS, situation({ etatCivil: 'marieOuCohabitant', revenusConjoint: 'aucun' }), P2026_09)
    const petitePension = calculerPrecompte(300_000, SANS_BONUS, situation({ etatCivil: 'marieOuCohabitant', revenusConjoint: 'pensionMax174' }), P2026_09)
    expect(petitePension).toEqual(sansRevenus)
  })

  it.each([
    ['autresMax290', 174_000],
    ['pensionMax579', 347_400],
  ] as const)('ajoute la réduction pour un conjoint %s', (revenusConjoint, reduction) => {
    const detail = calculerPrecompte(400_000, SANS_BONUS, situation({ etatCivil: 'marieOuCohabitant', revenusConjoint }), P2026_09)
    expect(detail.revenuImpute).toBe(0)
    expect(detail.reductionsAccordees).toBe(reduction)
  })

  it('cumule enfants et parent isolé', () => {
    const detail = calculerPrecompte(400_000, SANS_BONUS, situation({ enfantsACharge: 1, parentIsole: true }), P2026_09)
    expect(detail.reductionsAccordees).toBe(62_400 + 62_400)
  })

  it('limite les réductions à l’impôt de base', () => {
    const detail = calculerPrecompte(150_000, SANS_BONUS, situation({ enfantsACharge: 3 }), P2026_09)
    expect(detail.reductionsAccordees).toBe(detail.impotBase)
    expect(detail.impotAnnuel).toBe(0)
  })

  it('ne rend jamais le précompte négatif et affiche le bonus fiscal réellement utilisé', () => {
    const detail = calculerPrecompte(150_000, { voletA: 12_754, voletB: 17_199, total: 29_953 }, situation({ enfantsACharge: 1 }), P2026_09)
    expect(detail.precompte).toBe(0)
    expect(detail.bonusFiscal).toBe(detail.precompteAvantBonus)
  })
})
```

- [ ] **Step 2 : Vérifier qu'ils échouent**

Run : `npx vitest run src/engine/precompte.test.ts`
Attendu : FAIL, `Failed to resolve import "./precompte"`.

- [ ] **Step 3 : Implémenter**

`src/engine/precompte.ts` :

```ts
import { appliquerTaux, diviserArrondi } from './argent'
import type { BonusEmploiSocial } from './bonusEmploiSocial'
import type { Parametres, ParametresPrecompte, TrancheBareme } from './parametres/types'
import type { Situation } from './types'

export interface DetailPrecompte {
  annuelBrut: number
  fraisForfaitaires: number
  netImposable: number
  revenuImpute: number
  impotBase: number
  reductionsAccordees: number
  impotAnnuel: number
  precompteAvantBonus: number
  bonusFiscal: number
  precompte: number
}

/** Barème de base (SPF-FC-2026 annexe 1). */
export function impotBareme(revenuCentimes: number, bareme: readonly TrancheBareme[]): number {
  if (revenuCentimes <= 0) {
    return 0
  }
  let tranche = bareme[0]
  for (const t of bareme) {
    if (revenuCentimes > t.auDelaDeCentimes) {
      tranche = t
    }
  }
  return tranche.fixeCentimes + appliquerTaux(revenuCentimes - tranche.auDelaDeCentimes, tranche.tauxDixMilliemes)
}

/** SPF-FC-2026 annexe 3. */
export function reductionEnfants(enfants: number, p: ParametresPrecompte): number {
  const table = p.reductionEnfantsCentimes
  const dernier = table.length - 1
  if (enfants <= dernier) {
    return table[enfants]
  }
  return table[dernier] + (enfants - dernier) * p.reductionEnfantSupplementaireCentimes
}

/** Barème II (quotient conjugal) : conjoint sans revenus ou pension ≤ 174 € nets (SPF-FC-2026 n° 11). */
export function utiliseQuotientConjugal(situation: Situation): boolean {
  return situation.revenusConjoint === 'aucun' || situation.revenusConjoint === 'pensionMax174'
}

function reductionsFamiliales(situation: Situation, p: ParametresPrecompte): number {
  let total = reductionEnfants(situation.enfantsACharge, p)
  if (situation.parentIsole) {
    total += p.reductionParentIsoleCentimes
  }
  if (situation.revenusConjoint === 'autresMax290') {
    total += p.reductionConjointAutresMax290Centimes
  }
  if (situation.revenusConjoint === 'pensionMax579') {
    total += p.reductionConjointPensionMax579Centimes
  }
  return total
}

/** Étapes 4 à 10 : du revenu imposable mensuel au précompte dû. */
export function calculerPrecompte(
  imposableMensuelCentimes: number,
  bonus: BonusEmploiSocial,
  situation: Situation,
  parametres: Parametres,
): DetailPrecompte {
  const p = parametres.precompte

  const annuelBrut = imposableMensuelCentimes * 12
  const fraisForfaitaires = Math.min(
    appliquerTaux(annuelBrut, p.fraisForfaitairesTauxDixMilliemes),
    p.fraisForfaitairesMaxCentimes,
  )
  const netImposable = annuelBrut - fraisForfaitaires

  let revenuImpute = 0
  let impotAvantPlancher: number
  if (utiliseQuotientConjugal(situation)) {
    revenuImpute = Math.min(appliquerTaux(netImposable, p.quotientConjugalTauxDixMilliemes), p.quotientConjugalMaxCentimes)
    impotAvantPlancher =
      impotBareme(revenuImpute, p.bareme) +
      impotBareme(netImposable - revenuImpute, p.bareme) -
      2 * p.impotQuotiteExempteeCentimes
  } else {
    impotAvantPlancher = impotBareme(netImposable, p.bareme) - p.impotQuotiteExempteeCentimes
  }
  const impotBase = Math.max(0, impotAvantPlancher)

  const reductionsAccordees = Math.min(reductionsFamiliales(situation, p), impotBase)
  const impotAnnuel = impotBase - reductionsAccordees

  const precompteAvantBonus = diviserArrondi(impotAnnuel, 12)
  const bonusFiscalTheorique =
    appliquerTaux(bonus.voletA, p.bonusFiscalVoletADixMilliemes) +
    appliquerTaux(bonus.voletB, p.bonusFiscalVoletBDixMilliemes)
  const precompte = Math.max(0, precompteAvantBonus - bonusFiscalTheorique)

  return {
    annuelBrut,
    fraisForfaitaires,
    netImposable,
    revenuImpute,
    impotBase,
    reductionsAccordees,
    impotAnnuel,
    precompteAvantBonus,
    bonusFiscal: precompteAvantBonus - precompte,
    precompte,
  }
}
```

- [ ] **Step 4 : Vérifier qu'ils passent**

Run : `npx vitest run src/engine/precompte.test.ts`
Attendu : PASS, 25 tests.

- [ ] **Step 5 : Commit**

```powershell
git add src/engine/precompte.ts src/engine/precompte.test.ts
git commit -m "feat: précompte professionnel selon la formule-clé 2026" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 6 : Cotisation spéciale de sécurité sociale

**Files :**
- Create : `src/engine/cotisationSpeciale.ts`
- Test : `src/engine/cotisationSpeciale.test.ts`

**Interfaces :**
- Consumes : `appliquerTaux` (tâche 2) ; `Situation`, `RevenusConjoint`, `Parametres`, `CategorieCotisation`, `P2026_09` (tâche 3).
- Produces :
  - `categorieCotisation(situation: Situation): CategorieCotisation`
  - `calculerCotisationSpeciale(brutCentimes: number, situation: Situation, parametres: Parametres): number`

- [ ] **Step 1 : Écrire les tests**

`src/engine/cotisationSpeciale.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { calculerCotisationSpeciale, categorieCotisation } from './cotisationSpeciale'
import { P2026_09 } from './parametres/p2026-09'
import type { RevenusConjoint, Situation } from './types'

const ISOLE: Situation = { brutMensuelCentimes: 0, etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false }

function marie(revenusConjoint: RevenusConjoint): Situation {
  return { ...ISOLE, etatCivil: 'marieOuCohabitant', revenusConjoint }
}

describe('categorieCotisation', () => {
  it('isolé → imposition individuelle', () => {
    expect(categorieCotisation(ISOLE)).toBe('individuelle')
  })

  it.each(['aucun', 'pensionMax174', 'pensionMax579', 'autresMax290'] as const)(
    'conjoint %s → commune, conjoint sans revenus',
    (revenus) => {
      expect(categorieCotisation(marie(revenus))).toBe('communeConjointSansRevenus')
    },
  )

  it('conjoint superieurs → commune, conjoint avec revenus', () => {
    expect(categorieCotisation(marie('superieurs'))).toBe('communeConjointAvecRevenus')
  })
})

describe('cotisation spéciale — imposition individuelle', () => {
  it.each([
    [194_538, 0],
    [194_539, 0], // 4,22 % × 0,01 → 0
    [219_018, 1_033], // 4,22 % × 244,80 = 10,33
    [219_019, 1_033],
    [300_000, 1_924], // 10,33 + 1,10 % × 809,82
    [373_700, 2_735], // 10,33 + 17,02
    [373_800, 2_738], // 27,35 + 3,38 % × 1,00
    [410_000, 3_962], // 27,35 + 12,27
    [410_001, 3_961], // 39,61 : saut d'un centime entre tranches, conforme au barème
    [603_882, 6_094],
    [603_883, 6_094],
    [1_000_000, 6_094],
  ])('brut %i → %i centimes', (brut, attendu) => {
    expect(calculerCotisationSpeciale(brut, ISOLE, P2026_09)).toBe(attendu)
  })
})

describe('cotisation spéciale — commune, conjoint avec revenus', () => {
  const s = marie('superieurs')
  it.each([
    [109_509, 0],
    [109_510, 515],
    [194_537, 515],
    [194_538, 515], // minimum de la tranche à 5,90 %
    [219_018, 1_444], // 5,90 % × 244,80
    [300_000, 2_335], // 14,44 + 8,91
    [1_000_000, 5_164], // maximum
  ])('brut %i → %i centimes', (brut, attendu) => {
    expect(calculerCotisationSpeciale(brut, s, P2026_09)).toBe(attendu)
  })
})

describe('cotisation spéciale — commune, conjoint sans revenus', () => {
  const s = marie('aucun')
  it.each([
    [194_538, 0],
    [200_000, 322], // 5,90 % × 54,62
    [219_018, 1_444],
    [450_000, 3_985], // 14,44 + 25,41
    [1_000_000, 6_094], // maximum
  ])('brut %i → %i centimes', (brut, attendu) => {
    expect(calculerCotisationSpeciale(brut, s, P2026_09)).toBe(attendu)
  })
})
```

- [ ] **Step 2 : Vérifier qu'ils échouent**

Run : `npx vitest run src/engine/cotisationSpeciale.test.ts`
Attendu : FAIL, `Failed to resolve import "./cotisationSpeciale"`.

- [ ] **Step 3 : Implémenter**

`src/engine/cotisationSpeciale.ts` :

```ts
import { appliquerTaux } from './argent'
import type { CategorieCotisation, Parametres } from './parametres/types'
import type { Situation } from './types'

/** Catégorie ONSS-CSSS selon la situation (spec § 4, dernière colonne). */
export function categorieCotisation(situation: Situation): CategorieCotisation {
  if (situation.etatCivil === 'isole') {
    return 'individuelle'
  }
  return situation.revenusConjoint === 'superieurs' ? 'communeConjointAvecRevenus' : 'communeConjointSansRevenus'
}

/** Étape 11 : retenue mensuelle de cotisation spéciale de sécurité sociale. */
export function calculerCotisationSpeciale(brutCentimes: number, situation: Situation, parametres: Parametres): number {
  const tranches = parametres.cotisationSpeciale[categorieCotisation(situation)]
  const tranche = tranches.find((t) => t.jusquaCentimes === null || brutCentimes <= t.jusquaCentimes)
  if (!tranche) {
    throw new Error('Barème de cotisation spéciale incomplet : la dernière tranche doit être ouverte')
  }
  const montant =
    tranche.fixeCentimes + appliquerTaux(Math.max(0, brutCentimes - tranche.seuilCentimes), tranche.tauxDixMilliemes)
  const avecMinimum = Math.max(tranche.minCentimes, montant)
  return tranche.maxCentimes === null ? avecMinimum : Math.min(tranche.maxCentimes, avecMinimum)
}
```

- [ ] **Step 4 : Vérifier qu'ils passent**

Run : `npx vitest run src/engine/cotisationSpeciale.test.ts`
Attendu : PASS, 30 tests.

- [ ] **Step 5 : Commit**

```powershell
git add src/engine/cotisationSpeciale.ts src/engine/cotisationSpeciale.test.ts
git commit -m "feat: cotisation spéciale de sécurité sociale (3 barèmes)" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 7 : Validation de la saisie

**Files :**
- Create : `src/engine/validation.ts`
- Test : `src/engine/validation.test.ts`

**Interfaces :**
- Consumes : `eurosTexteEnCentimes` (tâche 2) ; `EtatCivil`, `RevenusConjoint`, `Situation` (tâche 3).
- Produces :
  - `interface SaisieFormulaire { brut: string; etatCivil: EtatCivil; revenusConjoint: RevenusConjoint; enfantsACharge: string; parentIsole: boolean }`
  - `type CodeErreur = 'brutVide' | 'brutFormat' | 'brutHorsLimites' | 'enfantsInvalide'`
  - `interface ErreursSaisie { brut?: CodeErreur; enfantsACharge?: CodeErreur }`
  - `type ResultatValidation = { ok: true; situation: Situation } | { ok: false; erreurs: ErreursSaisie }`
  - `BRUT_MAX_CENTIMES = 10_000_000`, `ENFANTS_MAX = 10`, `SAISIE_PAR_DEFAUT: SaisieFormulaire`
  - `validerSaisie(saisie: SaisieFormulaire): ResultatValidation`

- [ ] **Step 1 : Écrire les tests**

`src/engine/validation.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { SAISIE_PAR_DEFAUT, validerSaisie, type SaisieFormulaire } from './validation'

function saisie(modif: Partial<SaisieFormulaire>): SaisieFormulaire {
  return { ...SAISIE_PAR_DEFAUT, ...modif }
}

describe('validerSaisie', () => {
  it('accepte la saisie par défaut', () => {
    expect(validerSaisie(SAISIE_PAR_DEFAUT)).toEqual({
      ok: true,
      situation: { brutMensuelCentimes: 300_000, etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false },
    })
  })

  it.each([
    ['', 'brutVide'],
    ['   ', 'brutVide'],
    ['abc', 'brutFormat'],
    ['3000,123', 'brutFormat'],
    ['0', 'brutHorsLimites'],
    ['100000,01', 'brutHorsLimites'],
  ])('brut « %s » → erreur %s', (brut, code) => {
    expect(validerSaisie(saisie({ brut }))).toEqual({ ok: false, erreurs: { brut: code } })
  })

  it('accepte 100 000 € pile', () => {
    expect(validerSaisie(saisie({ brut: '100000' })).ok).toBe(true)
  })

  it.each(['', '-1', '11', '1,5', 'deux'])('enfants « %s » → erreur', (enfantsACharge) => {
    expect(validerSaisie(saisie({ enfantsACharge }))).toEqual({ ok: false, erreurs: { enfantsACharge: 'enfantsInvalide' } })
  })

  it('signale les deux champs en même temps', () => {
    expect(validerSaisie(saisie({ brut: '', enfantsACharge: '' }))).toEqual({
      ok: false,
      erreurs: { brut: 'brutVide', enfantsACharge: 'enfantsInvalide' },
    })
  })

  it('ignore les revenus du conjoint pour un isolé', () => {
    const r = validerSaisie(saisie({ revenusConjoint: 'superieurs' }))
    expect(r.ok && r.situation.revenusConjoint).toBeNull()
  })

  it('garde les revenus du conjoint pour un marié et désactive parent isolé', () => {
    const r = validerSaisie(saisie({ etatCivil: 'marieOuCohabitant', revenusConjoint: 'autresMax290', enfantsACharge: '2', parentIsole: true }))
    expect(r.ok && r.situation).toMatchObject({ revenusConjoint: 'autresMax290', parentIsole: false })
  })

  it('désactive parent isolé sans enfant', () => {
    const r = validerSaisie(saisie({ parentIsole: true, enfantsACharge: '0' }))
    expect(r.ok && r.situation.parentIsole).toBe(false)
  })

  it('garde parent isolé pour un isolé avec enfant', () => {
    const r = validerSaisie(saisie({ parentIsole: true, enfantsACharge: '1' }))
    expect(r.ok && r.situation.parentIsole).toBe(true)
  })
})
```

- [ ] **Step 2 : Vérifier qu'ils échouent**

Run : `npx vitest run src/engine/validation.test.ts`
Attendu : FAIL, `Failed to resolve import "./validation"`.

- [ ] **Step 3 : Implémenter**

`src/engine/validation.ts` :

```ts
import { eurosTexteEnCentimes } from './argent'
import type { EtatCivil, RevenusConjoint, Situation } from './types'

/** Valeurs brutes du formulaire, telles que tapées. */
export interface SaisieFormulaire {
  brut: string
  etatCivil: EtatCivil
  /** Conservé même si isolé, pour retrouver le choix si on rebascule. */
  revenusConjoint: RevenusConjoint
  enfantsACharge: string
  parentIsole: boolean
}

export type CodeErreur = 'brutVide' | 'brutFormat' | 'brutHorsLimites' | 'enfantsInvalide'

export interface ErreursSaisie {
  brut?: CodeErreur
  enfantsACharge?: CodeErreur
}

export type ResultatValidation = { ok: true; situation: Situation } | { ok: false; erreurs: ErreursSaisie }

export const BRUT_MAX_CENTIMES = 10_000_000
export const ENFANTS_MAX = 10

export const SAISIE_PAR_DEFAUT: SaisieFormulaire = {
  brut: '3000',
  etatCivil: 'isole',
  revenusConjoint: 'aucun',
  enfantsACharge: '0',
  parentIsole: false,
}

/** Transforme la saisie en Situation normalisée, ou renvoie les erreurs par champ. */
export function validerSaisie(saisie: SaisieFormulaire): ResultatValidation {
  const erreurs: ErreursSaisie = {}

  let brut: number | null = null
  if (saisie.brut.trim() === '') {
    erreurs.brut = 'brutVide'
  } else {
    brut = eurosTexteEnCentimes(saisie.brut)
    if (brut === null) {
      erreurs.brut = 'brutFormat'
    } else if (brut <= 0 || brut > BRUT_MAX_CENTIMES) {
      erreurs.brut = 'brutHorsLimites'
    }
  }

  const enfantsTexte = saisie.enfantsACharge.trim()
  const enfants = /^\d+$/.test(enfantsTexte) ? Number(enfantsTexte) : Number.NaN
  if (!(enfants >= 0 && enfants <= ENFANTS_MAX)) {
    erreurs.enfantsACharge = 'enfantsInvalide'
  }

  if (brut === null || erreurs.brut || erreurs.enfantsACharge) {
    return { ok: false, erreurs }
  }

  const isole = saisie.etatCivil === 'isole'
  return {
    ok: true,
    situation: {
      brutMensuelCentimes: brut,
      etatCivil: saisie.etatCivil,
      revenusConjoint: isole ? null : saisie.revenusConjoint,
      enfantsACharge: enfants,
      parentIsole: isole && enfants > 0 && saisie.parentIsole,
    },
  }
}
```

- [ ] **Step 4 : Vérifier qu'ils passent**

Run : `npx vitest run src/engine/validation.test.ts`
Attendu : PASS, 18 tests.

- [ ] **Step 5 : Commit**

```powershell
git add src/engine/validation.ts src/engine/validation.test.ts
git commit -m "feat: validation et normalisation de la saisie du formulaire" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 8 : Calcul complet et cas de référence

**Files :**
- Create : `src/engine/onss.ts`, `src/engine/calculerNet.ts`, `tools/reference/reference.py`
- Generate : `src/engine/__tests__/references.json`
- Test : `src/engine/calculerNet.test.ts`, `src/engine/__tests__/references.test.ts`

**Interfaces :**
- Consumes : `appliquerTaux` (tâche 2) ; `getParametres`, `Parametres`, `Situation`, `Intermediaires`, `Ligne`, `Resultat`, `PeriodeNonCouverte` (tâche 3) ; `calculerBonusEmploiSocial` (tâche 4) ; `calculerPrecompte` (tâche 5) ; `calculerCotisationSpeciale` (tâche 6).
- Produces :
  - `cotisationOnssPersonnelle(brutCentimes: number, parametres: Parametres): number`
  - `calculerNet(situation: Situation, dateIso: string): Resultat` — lève `PeriodeNonCouverte` hors période

- [ ] **Step 1 : Écrire le script de référence indépendant**

Ce script ne réutilise **aucun** code TypeScript : il repart des textes officiels, en euros avec `decimal`. S'il est d'accord avec le moteur sur 74 cas, une erreur de traduction des règles dans un seul des deux devient très peu probable.

`tools/reference/reference.py` :

```python
"""Script de référence indépendant du moteur TypeScript.

Il recalcule les cas de référence directement depuis les textes officiels
(SPF-FC-2026, ONSS-BE-2026/3, ONSS-CSSS-2026/3), en euros avec le module
decimal, et écrit src/engine/__tests__/references.json (montants en centimes).

Usage : python tools/reference/reference.py
"""

import json
from decimal import ROUND_HALF_UP, Decimal as D
from pathlib import Path

SORTIE = Path(__file__).resolve().parents[2] / "src" / "engine" / "__tests__" / "references.json"


def r(x: D) -> D:
    """Arrondi au centime, 0,005 vers le haut (SPF-FC-2026 n° 3)."""
    return x.quantize(D("0.01"), rounding=ROUND_HALF_UP)


def cents(x: D) -> int:
    return int((x * 100).to_integral_value())


# (max, plancher, plafond, coefficient) — ONSS-BE-2026/3, employés
VOLET_B = (D("171.99"), D("2300.62"), D("2937.93"), D("0.2699"))
PERIODES = [
    ("P2026-07", "2026-07-01", "2026-08-31", (D("127.54"), D("2937.93"), D("3336.98"), D("0.3196")), VOLET_B),
    ("P2026-09", "2026-09-01", "2026-12-31", (D("127.54"), D("2937.93"), D("3403.62"), D("0.2739")), VOLET_B),
]


def periode(date: str):
    for p in PERIODES:
        if p[1] <= date <= p[2]:
            return p
    raise ValueError(f"période non couverte : {date}")


def volet(s: D, v) -> D:
    maximum, plancher, plafond, coef = v
    if s <= plancher:
        return maximum
    if s <= plafond:
        return max(D("0"), r(maximum - coef * (s - plancher)))
    return D("0")


def bareme(x: D) -> D:
    if x <= 0:
        return D("0")
    tranches = [
        (D("0"), D("0"), D("0.2675")),
        (D("16710"), D("4469.93"), D("0.4280")),
        (D("29500"), D("9944.05"), D("0.4815")),
        (D("51050"), D("20320.38"), D("0.5350")),
    ]
    de, fixe, taux = [t for t in tranches if x > t[0]][-1]
    return fixe + r((x - de) * taux)


ENFANTS = [0, 624, 1656, 4404, 7620, 11100, 14592, 18120, 21996]


def reduction_enfants(n: int) -> D:
    return D(ENFANTS[n]) if n <= 8 else D(21996 + 3864 * (n - 8))


def csss(m: D, categorie: str) -> D:
    if categorie == "individuelle":
        if m <= D("1945.38"):
            return D("0")
        if m <= D("2190.18"):
            return r((m - D("1945.38")) * D("0.0422"))
        if m <= D("3737.00"):
            return D("10.33") + r((m - D("2190.18")) * D("0.011"))
        if m <= D("4100.00"):
            return D("27.35") + r((m - D("3737.00")) * D("0.0338"))
        if m <= D("6038.82"):
            return D("39.61") + r((m - D("4100.00")) * D("0.011"))
        return D("60.94")
    if categorie == "communeConjointAvecRevenus":
        if m < D("1095.10"):
            return D("0")
        if m < D("1945.38"):
            return D("5.15")
        if m <= D("2190.18"):
            return max(D("5.15"), r((m - D("1945.38")) * D("0.059")))
        return min(D("51.64"), D("14.44") + r((m - D("2190.18")) * D("0.011")))
    if m <= D("1945.38"):
        return D("0")
    if m <= D("2190.18"):
        return r((m - D("1945.38")) * D("0.059"))
    return min(D("60.94"), D("14.44") + r((m - D("2190.18")) * D("0.011")))


def calculer(sit: dict, date: str) -> dict:
    _, _, _, volet_a, volet_b = periode(date)
    brut = D(sit["brutMensuelCentimes"]) / 100
    conjoint = sit["revenusConjoint"]

    onss = r(brut * D("0.1307"))
    a, b = volet(brut, volet_a), volet(brut, volet_b)
    if a + b > onss:
        b = max(D("0"), onss - a)
        a = min(a, onss)
    bonus = a + b
    onss_net = onss - bonus
    imposable = brut - onss_net
    annuel = imposable * 12
    frais = min(r(annuel * D("0.30")), D("6070"))
    net_imposable = annuel - frais

    if conjoint in ("aucun", "pensionMax174"):
        impute = min(r(net_imposable * D("0.30")), D("13790"))
        impot_base = bareme(impute) + bareme(net_imposable - impute) - D("5975.96")
    else:
        impute = D("0")
        impot_base = bareme(net_imposable) - D("2987.98")
    impot_base = max(D("0"), impot_base)

    reductions = reduction_enfants(sit["enfantsACharge"])
    if sit["parentIsole"]:
        reductions += D("624")
    if conjoint == "autresMax290":
        reductions += D("1740")
    if conjoint == "pensionMax579":
        reductions += D("3474")
    reductions_accordees = min(reductions, impot_base)
    impot_annuel = impot_base - reductions_accordees

    precompte_avant = r(impot_annuel / 12)
    bonus_fiscal = r(a * D("0.3314")) + r(b * D("0.5254"))
    precompte = max(D("0"), precompte_avant - bonus_fiscal)

    if sit["etatCivil"] == "isole":
        categorie = "individuelle"
    elif conjoint == "superieurs":
        categorie = "communeConjointAvecRevenus"
    else:
        categorie = "communeConjointSansRevenus"
    cotisation = csss(brut, categorie)
    net = brut - onss_net - precompte - cotisation

    valeurs = {
        "onss": onss, "bonusVoletA": a, "bonusVoletB": b, "bonusSocial": bonus,
        "onssNet": onss_net, "imposableMensuel": imposable, "annuelBrut": annuel,
        "fraisForfaitaires": frais, "netImposable": net_imposable, "revenuImpute": impute,
        "impotBase": impot_base, "reductionsAccordees": reductions_accordees,
        "impotAnnuel": impot_annuel, "precompteAvantBonus": precompte_avant,
        "bonusFiscal": precompte_avant - precompte, "precompte": precompte,
        "cotisationSpeciale": cotisation, "net": net,
    }
    return {k: cents(v) for k, v in valeurs.items()}


def situation(etat, conjoint=None, enfants=0, parent_isole=False):
    return {"etatCivil": etat, "revenusConjoint": conjoint, "enfantsACharge": enfants, "parentIsole": parent_isole}


SITUATIONS = {
    "isole": situation("isole"),
    "isole-2enfants": situation("isole", enfants=2),
    "parentIsole-1enfant": situation("isole", enfants=1, parent_isole=True),
    "conjoint-aucun": situation("marieOuCohabitant", "aucun"),
    "conjoint-pensionMax174": situation("marieOuCohabitant", "pensionMax174"),
    "conjoint-pensionMax579": situation("marieOuCohabitant", "pensionMax579"),
    "conjoint-autresMax290": situation("marieOuCohabitant", "autresMax290"),
    "conjoint-superieurs": situation("marieOuCohabitant", "superieurs"),
    "conjoint-aucun-3enfants": situation("marieOuCohabitant", "aucun", enfants=3),
}
BRUTS = [223361, 230062, 293793, 300000, 340362, 450000, 650000, 1000000]
DATE_PRINCIPALE = "2026-09-14"


def main() -> None:
    cas = []
    for nom, base in SITUATIONS.items():
        for brut in BRUTS:
            cas.append((f"{nom}-{brut}-{DATE_PRINCIPALE}", {"brutMensuelCentimes": brut, **base}, DATE_PRINCIPALE))
    for date in ("2026-08-31", "2026-09-01"):
        cas.append((f"isole-335000-{date}", {"brutMensuelCentimes": 335000, **SITUATIONS["isole"]}, date))

    contenu = {
        "description": "Généré par tools/reference/reference.py — ne pas modifier à la main",
        "cas": [
            {
                "id": identifiant,
                "date": date,
                "situation": sit,
                "attendu": calculer(sit, date),
                "source": "tools/reference/reference.py (SPF-FC-2026, ONSS-BE-2026/3, ONSS-CSSS-2026/3)",
                "verifie": False,
            }
            for identifiant, sit, date in cas
        ],
    }
    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    SORTIE.write_text(json.dumps(contenu, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(cas)} cas écrits dans {SORTIE}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2 : Générer les cas de référence**

Run : `python tools/reference/reference.py`
Attendu : `74 cas écrits dans …\src\engine\__tests__\references.json`.

Contrôle rapide : dans le JSON, le cas `isole-300000-2026-09-14` doit avoir `"net": 226133` (exemple de la spec § 8.2).

- [ ] **Step 3 : Écrire les tests**

`src/engine/calculerNet.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { calculerNet } from './calculerNet'
import { PeriodeNonCouverte, type Situation } from './types'

const ISOLE_3000: Situation = { brutMensuelCentimes: 300_000, etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false }

describe('calculerNet', () => {
  it('donne le net de l’exemple de la spec', () => {
    const r = calculerNet(ISOLE_3000, '2026-09-14')
    expect(r.netMensuelCentimes).toBe(226_133)
    expect(r.netAnnuelCentimes).toBe(226_133 * 12)
    expect(r.tauxRetour).toBeCloseTo(0.7538, 4)
    expect(r.periode).toEqual({ id: 'P2026-09', valideDu: '2026-09-01', valideAu: '2026-12-31' })
  })

  it('produit les lignes dans l’ordre des étapes, et leur somme signée redonne le net', () => {
    const r = calculerNet(ISOLE_3000, '2026-09-14')
    expect(r.lignes.map((l) => l.id)).toEqual([
      'brut', 'onss', 'bonusVoletA', 'bonusVoletB', 'imposableMensuel', 'precompteAvantBonus', 'bonusFiscal', 'cotisationSpeciale', 'net',
    ])
    let somme = 0
    for (const ligne of r.lignes) {
      if (ligne.id === 'brut') somme = ligne.montantCentimes
      else if (ligne.sens === '+') somme += ligne.montantCentimes
      else if (ligne.sens === '-') somme -= ligne.montantCentimes
    }
    expect(somme).toBe(r.netMensuelCentimes)
  })

  it('cite une source pour chaque ligne', () => {
    for (const ligne of calculerNet(ISOLE_3000, '2026-09-14').lignes) {
      expect(ligne.source.length).toBeGreaterThan(0)
    }
  })

  it('lève PeriodeNonCouverte hors des périodes intégrées', () => {
    expect(() => calculerNet(ISOLE_3000, '2027-01-15')).toThrow(PeriodeNonCouverte)
  })
})
```

`src/engine/__tests__/references.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { calculerNet } from '../calculerNet'
import type { Intermediaires, Situation } from '../types'
import fichier from './references.json'

interface CasReference {
  id: string
  date: string
  situation: Situation
  attendu: Intermediaires
  source: string
  verifie: boolean
}

const cas = fichier.cas as unknown as CasReference[]
const verifies = cas.filter((c) => c.verifie).length

describe(`cas de référence — ${verifies} vérifié(s) externement sur ${cas.length}`, () => {
  it.each(cas.map((c) => [c.id, c] as const))('%s', (_id, c) => {
    expect(calculerNet(c.situation, c.date).intermediaires).toEqual(c.attendu)
  })
})
```

- [ ] **Step 4 : Vérifier qu'ils échouent**

Run : `npx vitest run src/engine/calculerNet.test.ts src/engine/__tests__`
Attendu : FAIL, `Failed to resolve import "./calculerNet"` et `"../calculerNet"`.

- [ ] **Step 5 : Implémenter**

`src/engine/onss.ts` :

```ts
import { appliquerTaux } from './argent'
import type { Parametres } from './parametres/types'

/** Étape 1 : cotisation ONSS personnelle, avant bonus à l'emploi. */
export function cotisationOnssPersonnelle(brutCentimes: number, parametres: Parametres): number {
  return appliquerTaux(brutCentimes, parametres.onssTauxPersonnelDixMilliemes)
}
```

`src/engine/calculerNet.ts` :

```ts
import { calculerBonusEmploiSocial } from './bonusEmploiSocial'
import { calculerCotisationSpeciale } from './cotisationSpeciale'
import { cotisationOnssPersonnelle } from './onss'
import { getParametres } from './parametres'
import { calculerPrecompte } from './precompte'
import type { Intermediaires, Ligne, Resultat, Situation } from './types'

/**
 * Brut → net mensuel pour une situation valide, avec les règles en vigueur à dateIso (AAAA-MM-JJ).
 * Lève PeriodeNonCouverte si aucune règle n'est intégrée pour cette date.
 */
export function calculerNet(situation: Situation, dateIso: string): Resultat {
  const parametres = getParametres(dateIso)
  const brut = situation.brutMensuelCentimes

  const onss = cotisationOnssPersonnelle(brut, parametres)
  const bonus = calculerBonusEmploiSocial(brut, onss, parametres)
  const onssNet = onss - bonus.total
  const imposableMensuel = brut - onssNet
  const precompte = calculerPrecompte(imposableMensuel, bonus, situation, parametres)
  const cotisationSpeciale = calculerCotisationSpeciale(brut, situation, parametres)
  const net = brut - onssNet - precompte.precompte - cotisationSpeciale

  const intermediaires: Intermediaires = {
    onss,
    bonusVoletA: bonus.voletA,
    bonusVoletB: bonus.voletB,
    bonusSocial: bonus.total,
    onssNet,
    imposableMensuel,
    ...precompte,
    cotisationSpeciale,
    net,
  }

  const lignes: Ligne[] = [
    { id: 'brut', sens: '=', montantCentimes: brut, source: 'Saisie' },
    { id: 'onss', sens: '-', montantCentimes: onss, source: 'ONSS — cotisation personnelle' },
    { id: 'bonusVoletA', sens: '+', montantCentimes: bonus.voletA, source: 'ONSS-BE-2026/3, volet A' },
    { id: 'bonusVoletB', sens: '+', montantCentimes: bonus.voletB, source: 'ONSS-BE-2026/3, volet B' },
    { id: 'imposableMensuel', sens: '=', montantCentimes: imposableMensuel, source: 'SPF-FC-2026 n° 7' },
    { id: 'precompteAvantBonus', sens: '-', montantCentimes: precompte.precompteAvantBonus, source: 'SPF-FC-2026 n° 7 à 16, annexes 1 à 5' },
    { id: 'bonusFiscal', sens: '+', montantCentimes: precompte.bonusFiscal, source: 'SPF-FC-2026 n° 20 et 21' },
    { id: 'cotisationSpeciale', sens: '-', montantCentimes: cotisationSpeciale, source: 'ONSS-CSSS-2026/3' },
    { id: 'net', sens: '=', montantCentimes: net, source: 'Brut − ONSS net − précompte − cotisation spéciale' },
  ]

  return {
    periode: { id: parametres.id, valideDu: parametres.valideDu, valideAu: parametres.valideAu },
    lignes,
    intermediaires,
    netMensuelCentimes: net,
    netAnnuelCentimes: net * 12,
    tauxRetour: net / brut,
  }
}
```

- [ ] **Step 6 : Vérifier qu'ils passent**

Run : `npx vitest run src/engine`
Attendu : PASS, 8 fichiers et 191 tests, dont `cas de référence — 0 vérifié(s) externement sur 74`.

Si un cas de référence échoue, **ne pas modifier le JSON** : comparer la première clé qui diffère dans `intermediaires`, retrouver l'étape correspondante de la spec § 5.2, et corriger le moteur ou le script selon ce que dit le texte officiel.

- [ ] **Step 7 : Commit**

```powershell
git add src/engine/onss.ts src/engine/calculerNet.ts src/engine/calculerNet.test.ts src/engine/__tests__ tools/reference
git commit -m "feat: calcul brut-net complet validé par 74 cas de référence" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 9 : Formats et textes français

**Files :**
- Create : `src/utils/format.ts`, `src/i18n/fr.ts`
- Test : `src/utils/format.test.ts`

**Interfaces :**
- Consumes : `IdLigne`, `RevenusConjoint` (tâche 3) ; `CodeErreur` (tâche 7).
- Produces :
  - `formatEuro(centimes: number): string`, `formatPourcentage(ratio: number): string`, `dateIsoLocale(date: Date): string`, `formatDateFr(dateIso: string): string`
  - `fr` : objet de textes avec `titre`, `sousTitre`, `bandeauEstimation`, `formulaire.*`, `revenusConjoint[RevenusConjoint]`, `erreurs[CodeErreur]`, `lignes[IdLigne].{libelle, explication}`, `recapitulatif.*` (dont `periode(du, au)`), `detail.*` (dont `explicationDe(libelle)`), `alertes.*` (dont `periodeNonCouverte(date)` et `sousRmmmg(montant)`)

- [ ] **Step 1 : Écrire les tests**

`src/utils/format.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { dateIsoLocale, formatDateFr, formatEuro, formatPourcentage } from './format'

/** Intl utilise des espaces insécables : on les normalise pour comparer. */
const normaliser = (texte: string) => texte.replace(/\s/g, ' ')

describe('format', () => {
  it('formate les centimes en euros belges', () => {
    expect(normaliser(formatEuro(226_133))).toBe('2 261,33 €')
    expect(normaliser(formatEuro(0))).toBe('0,00 €')
  })

  it('formate un ratio en pourcentage à une décimale', () => {
    expect(normaliser(formatPourcentage(0.75378))).toBe('75,4 %')
  })

  it('produit une date ISO locale', () => {
    expect(dateIsoLocale(new Date(2026, 8, 4))).toBe('2026-09-04')
  })

  it('affiche une date ISO au format belge', () => {
    expect(formatDateFr('2026-09-14')).toBe('14/09/2026')
  })
})
```

- [ ] **Step 2 : Vérifier qu'ils échouent**

Run : `npx vitest run src/utils`
Attendu : FAIL, `Failed to resolve import "./format"`.

- [ ] **Step 3 : Implémenter les formats**

`src/utils/format.ts` :

```ts
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
```

- [ ] **Step 4 : Écrire les textes**

`src/i18n/fr.ts` (le `satisfies` fait échouer la compilation si un id de ligne, un code d'erreur ou un cas de conjoint n'a pas son texte) :

```ts
import type { IdLigne, RevenusConjoint } from '../engine/types'
import type { CodeErreur } from '../engine/validation'

export const fr = {
  titre: 'Salaire net Belgique',
  sousTitre: 'Du brut au net pour un employé à temps plein',
  bandeauEstimation: 'Estimation pour un employé à temps plein. Ne remplace pas une fiche de paie.',

  formulaire: {
    titre: 'Votre situation',
    brut: 'Salaire brut mensuel (€)',
    etatCivil: 'État civil',
    isole: 'Isolé',
    marieOuCohabitant: 'Marié ou cohabitant légal',
    revenusConjoint: 'Revenus du conjoint',
    aideRevenusConjoint: 'Montants « nets » : revenus bruts, moins les cotisations sociales obligatoires, moins 20 %.',
    enfants: 'Enfants à charge',
    parentIsole: 'Je suis parent isolé (veuf, célibataire, divorcé ou séparé de fait)',
  },

  revenusConjoint: {
    aucun: 'Pas de revenus professionnels',
    pensionMax174: 'Uniquement pension ou rente, max 174 € nets/mois',
    pensionMax579: 'Uniquement pension ou rente, max 579 € nets/mois',
    autresMax290: 'Autres revenus professionnels, max 290 € nets/mois',
    superieurs: 'Revenus supérieurs à ces plafonds',
  } satisfies Record<RevenusConjoint, string>,

  erreurs: {
    brutVide: 'Indiquez votre salaire brut mensuel.',
    brutFormat: 'Montant invalide : utilisez des chiffres, avec au maximum 2 décimales (ex. 3000,50).',
    brutHorsLimites: 'Le montant doit être compris entre 0,01 € et 100 000 €.',
    enfantsInvalide: 'Indiquez un nombre entier entre 0 et 10.',
  } satisfies Record<CodeErreur, string>,

  lignes: {
    brut: { libelle: 'Salaire brut', explication: 'Le salaire brut mensuel prévu par votre contrat.' },
    onss: { libelle: 'Cotisations ONSS (13,07 %)', explication: 'Cotisation personnelle de sécurité sociale, retenue sur le brut.' },
    bonusVoletA: {
      libelle: 'Bonus à l’emploi — volet A',
      explication: 'Réduction des cotisations ONSS pour les bas salaires. Elle diminue quand le salaire augmente et disparaît au-delà d’un plafond.',
    },
    bonusVoletB: {
      libelle: 'Bonus à l’emploi — volet B',
      explication: 'Réduction supplémentaire des cotisations ONSS pour les très bas salaires.',
    },
    imposableMensuel: {
      libelle: 'Rémunération imposable',
      explication: 'Le brut moins les cotisations ONSS réellement retenues. C’est la base du précompte professionnel.',
    },
    precompteAvantBonus: {
      libelle: 'Précompte professionnel',
      explication:
        'Impôt retenu à la source. Il est calculé sur une base annuelle (frais forfaitaires, barème progressif, quotité exemptée, réductions pour enfants et situation familiale) puis divisé par 12. Il inclut un forfait de 7 % de taxe communale.',
    },
    bonusFiscal: {
      libelle: 'Bonus fiscal à l’emploi',
      explication: 'Réduction du précompte liée au bonus à l’emploi : 33,14 % du volet A et 52,54 % du volet B, sans pouvoir rendre le précompte négatif.',
    },
    cotisationSpeciale: {
      libelle: 'Cotisation spéciale de sécurité sociale',
      explication: 'Retenue dont le montant dépend du salaire et de la situation du ménage (isolé, ou conjoint avec ou sans revenus).',
    },
    net: { libelle: 'Salaire net', explication: 'Le montant versé sur votre compte chaque mois.' },
  } satisfies Record<IdLigne, { libelle: string; explication: string }>,

  recapitulatif: {
    titre: 'Votre salaire net',
    netMensuel: 'Net mensuel',
    netAnnuel: 'Net annuel (× 12)',
    horsExtras: 'Hors 13e mois et pécule de vacances',
    tauxRetour: 'Taux de retour',
    periode: (du: string, au: string) => `Règles en vigueur du ${du} au ${au}`,
  },

  detail: {
    titre: 'Détail du calcul',
    explicationDe: (libelle: string) => `Explication : ${libelle}`,
    source: 'Source',
  },

  alertes: {
    saisieInvalide: 'Corrigez la saisie pour voir le calcul.',
    periodeNonCouverte: (date: string) => `Les règles pour le ${date} ne sont pas encore intégrées.`,
    sousRmmmg: (montant: string) =>
      `Ce brut est inférieur au salaire minimum légal pour un temps plein (${montant}). Le calcul reste indicatif.`,
  },
}
```

- [ ] **Step 5 : Vérifier**

Run : `npx vitest run src/utils` puis `npm run typecheck`
Attendu : PASS, 4 tests ; `tsc -b` sans erreur.

- [ ] **Step 6 : Commit**

```powershell
git add src/utils src/i18n
git commit -m "feat: formats belges et textes français de l'interface" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 10 : Hooks de saisie et de calcul

**Files :**
- Create : `src/hooks/useSaisie.ts`, `src/hooks/useCalcul.ts`
- Test : `src/hooks/useSaisie.test.ts`

**Interfaces :**
- Consumes : `REVENUS_CONJOINT`, `PeriodeNonCouverte`, `Resultat`, `getParametres` (tâche 3) ; `SAISIE_PAR_DEFAUT`, `SaisieFormulaire`, `ErreursSaisie`, `validerSaisie` (tâche 7) ; `calculerNet` (tâche 8).
- Produces :
  - `CLE_STOCKAGE = 'wage-calculator:saisie:v1'`, `lireSaisieStockee(): SaisieFormulaire`
  - `useSaisie(): { saisie: SaisieFormulaire; modifier: <K extends keyof SaisieFormulaire>(champ: K, valeur: SaisieFormulaire[K]) => void }`
  - `type EtatCalcul = { etat: 'ok'; resultat: Resultat; brutCentimes: number; rmmmgCentimes: number } | { etat: 'saisieInvalide'; erreurs: ErreursSaisie } | { etat: 'periodeNonCouverte'; dateIso: string }`
  - `calculerEtat(saisie: SaisieFormulaire, dateIso: string): EtatCalcul`, `useCalcul(saisie: SaisieFormulaire, dateIso: string): EtatCalcul`

- [ ] **Step 1 : Écrire les tests**

`src/hooks/useSaisie.test.ts` :

```ts
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SAISIE_PAR_DEFAUT } from '../engine/validation'
import { CLE_STOCKAGE, lireSaisieStockee, useSaisie } from './useSaisie'

describe('lireSaisieStockee', () => {
  it('renvoie la saisie par défaut si rien n’est stocké', () => {
    expect(lireSaisieStockee()).toEqual(SAISIE_PAR_DEFAUT)
  })

  it('restaure une saisie valide', () => {
    const stockee = { ...SAISIE_PAR_DEFAUT, brut: '2500', etatCivil: 'marieOuCohabitant', revenusConjoint: 'superieurs' }
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(stockee))
    expect(lireSaisieStockee()).toEqual(stockee)
  })

  it.each(['pas du json', '{"brut":2500}', JSON.stringify({ ...SAISIE_PAR_DEFAUT, revenusConjoint: 'inconnu' })])(
    'ignore un contenu invalide : %s',
    (contenu) => {
      localStorage.setItem(CLE_STOCKAGE, contenu)
      expect(lireSaisieStockee()).toEqual(SAISIE_PAR_DEFAUT)
    },
  )

  it('résiste à un localStorage inaccessible', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqué')
    })
    expect(lireSaisieStockee()).toEqual(SAISIE_PAR_DEFAUT)
  })
})

describe('useSaisie', () => {
  it('mémorise chaque modification', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.modifier('brut', '4200'))
    expect(result.current.saisie.brut).toBe('4200')
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE) ?? '{}')).toMatchObject({ brut: '4200' })
  })

  it('continue de fonctionner si l’écriture échoue', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.modifier('brut', '4200'))
    expect(result.current.saisie.brut).toBe('4200')
  })
})
```

- [ ] **Step 2 : Vérifier qu'ils échouent**

Run : `npx vitest run src/hooks`
Attendu : FAIL, `Failed to resolve import "./useSaisie"`.

- [ ] **Step 3 : Implémenter**

`src/hooks/useSaisie.ts` :

```ts
import { useCallback, useEffect, useState } from 'react'
import { REVENUS_CONJOINT } from '../engine/types'
import { SAISIE_PAR_DEFAUT, type SaisieFormulaire } from '../engine/validation'

export const CLE_STOCKAGE = 'wage-calculator:saisie:v1'

function estSaisie(valeur: unknown): valeur is SaisieFormulaire {
  if (typeof valeur !== 'object' || valeur === null) {
    return false
  }
  const v = valeur as Record<string, unknown>
  return (
    typeof v.brut === 'string' &&
    (v.etatCivil === 'isole' || v.etatCivil === 'marieOuCohabitant') &&
    typeof v.revenusConjoint === 'string' &&
    (REVENUS_CONJOINT as readonly string[]).includes(v.revenusConjoint) &&
    typeof v.enfantsACharge === 'string' &&
    typeof v.parentIsole === 'boolean'
  )
}

/** Saisie mémorisée, ou saisie par défaut si le stockage est vide, invalide ou inaccessible. */
export function lireSaisieStockee(): SaisieFormulaire {
  try {
    const texte = localStorage.getItem(CLE_STOCKAGE)
    if (texte === null) {
      return SAISIE_PAR_DEFAUT
    }
    const valeur: unknown = JSON.parse(texte)
    return estSaisie(valeur) ? valeur : SAISIE_PAR_DEFAUT
  } catch {
    return SAISIE_PAR_DEFAUT
  }
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

`src/hooks/useCalcul.ts` (testé à travers l'interface à la tâche 11) :

```ts
import { useMemo } from 'react'
import { calculerNet } from '../engine/calculerNet'
import { getParametres } from '../engine/parametres'
import { PeriodeNonCouverte, type Resultat } from '../engine/types'
import { validerSaisie, type ErreursSaisie, type SaisieFormulaire } from '../engine/validation'

export type EtatCalcul =
  | { etat: 'ok'; resultat: Resultat; brutCentimes: number; rmmmgCentimes: number }
  | { etat: 'saisieInvalide'; erreurs: ErreursSaisie }
  | { etat: 'periodeNonCouverte'; dateIso: string }

export function calculerEtat(saisie: SaisieFormulaire, dateIso: string): EtatCalcul {
  const validation = validerSaisie(saisie)
  if (!validation.ok) {
    return { etat: 'saisieInvalide', erreurs: validation.erreurs }
  }
  try {
    const resultat = calculerNet(validation.situation, dateIso)
    return {
      etat: 'ok',
      resultat,
      brutCentimes: validation.situation.brutMensuelCentimes,
      rmmmgCentimes: getParametres(dateIso).rmmmgCentimes,
    }
  } catch (erreur) {
    if (erreur instanceof PeriodeNonCouverte) {
      return { etat: 'periodeNonCouverte', dateIso }
    }
    throw erreur
  }
}

export function useCalcul(saisie: SaisieFormulaire, dateIso: string): EtatCalcul {
  return useMemo(() => calculerEtat(saisie, dateIso), [saisie, dateIso])
}
```

- [ ] **Step 4 : Vérifier**

Run : `npx vitest run src/hooks` puis `npm run typecheck`
Attendu : PASS, 8 tests ; `tsc -b` sans erreur.

- [ ] **Step 5 : Commit**

```powershell
git add src/hooks
git commit -m "feat: hooks de saisie mémorisée et d'état du calcul" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 11 : Interface

**Files :**
- Create : `src/components/InfoBulle.tsx`, `src/components/LigneCalcul.tsx`, `src/components/DetailCalcul.tsx`, `src/components/Recapitulatif.tsx`, `src/components/Avertissements.tsx`, `src/components/FormulaireSituation.tsx`
- Modify : `src/App.tsx` (remplace la version provisoire de la tâche 1)
- Test : `src/App.test.tsx`

**Interfaces :**
- Consumes : `useSaisie`, `useCalcul`, `EtatCalcul`, `CLE_STOCKAGE` (tâche 10) ; `fr`, `formatEuro`, `formatPourcentage`, `formatDateFr`, `dateIsoLocale` (tâche 9) ; `REVENUS_CONJOINT`, `RevenusConjoint`, `Resultat`, `Ligne` (tâche 3) ; `ErreursSaisie`, `SaisieFormulaire`, `SAISIE_PAR_DEFAUT` (tâche 7) ; `calculerNet` (tâche 8).
- Produces :
  - `export default function App({ dateIso }: { dateIso?: string })` — `dateIso` par défaut : aujourd'hui
  - composants nommés `InfoBulle`, `LigneCalcul`, `DetailCalcul`, `Recapitulatif`, `Avertissements`, `FormulaireSituation`

- [ ] **Step 1 : Écrire les tests de l'interface**

`src/App.test.tsx` :

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { calculerNet } from './engine/calculerNet'
import { SAISIE_PAR_DEFAUT } from './engine/validation'
import { CLE_STOCKAGE } from './hooks/useSaisie'
import { formatEuro } from './utils/format'

const DATE = '2026-09-14'

/** Testing Library normalise les espaces du DOM ; Intl produit des espaces insécables. */
const euros = (centimes: number) => formatEuro(centimes).replace(/\s/g, ' ')

function recapitulatif() {
  return screen.getByRole('region', { name: 'Votre salaire net' })
}

describe('App', () => {
  it('affiche le net de la saisie par défaut', () => {
    render(<App dateIso={DATE} />)
    expect(within(recapitulatif()).getByText(euros(226_133))).toBeInTheDocument()
  })

  it('met à jour le net quand le brut change', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    const brut = screen.getByLabelText('Salaire brut mensuel (€)')
    await user.clear(brut)
    await user.type(brut, '4500')
    const attendu = calculerNet(
      { brutMensuelCentimes: 450_000, etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false },
      DATE,
    ).netMensuelCentimes
    expect(within(recapitulatif()).getByText(euros(attendu))).toBeInTheDocument()
  })

  it('n’affiche les revenus du conjoint que pour un marié ou cohabitant', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    expect(screen.queryByLabelText('Revenus du conjoint')).not.toBeInTheDocument()
    await user.click(screen.getByLabelText('Marié ou cohabitant légal'))
    expect(screen.getByLabelText('Revenus du conjoint')).toBeInTheDocument()
  })

  it('n’affiche « parent isolé » que pour un isolé avec au moins un enfant', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    const parentIsole = /parent isolé/
    expect(screen.queryByLabelText(parentIsole)).not.toBeInTheDocument()

    const enfants = screen.getByLabelText('Enfants à charge')
    await user.clear(enfants)
    await user.type(enfants, '1')
    expect(screen.getByLabelText(parentIsole)).toBeInTheDocument()

    await user.click(screen.getByLabelText('Marié ou cohabitant légal'))
    expect(screen.queryByLabelText(parentIsole)).not.toBeInTheDocument()
  })

  it('affiche l’erreur de saisie et masque les montants', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.clear(screen.getByLabelText('Salaire brut mensuel (€)'))
    expect(screen.getByText('Indiquez votre salaire brut mensuel.')).toBeInTheDocument()
    expect(screen.getByLabelText('Salaire brut mensuel (€)')).toHaveAttribute('aria-invalid', 'true')
    expect(within(recapitulatif()).getAllByText('—').length).toBeGreaterThan(0)
  })

  it('restaure la saisie mémorisée', () => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, brut: '2500' }))
    render(<App dateIso={DATE} />)
    expect(screen.getByLabelText('Salaire brut mensuel (€)')).toHaveValue('2500')
  })

  it('ignore un stockage corrompu', () => {
    localStorage.setItem(CLE_STOCKAGE, '{corrompu')
    render(<App dateIso={DATE} />)
    expect(screen.getByLabelText('Salaire brut mensuel (€)')).toHaveValue('3000')
  })

  it('signale une période non couverte', () => {
    render(<App dateIso="2027-01-15" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Les règles pour le 15/01/2027 ne sont pas encore intégrées.')
  })

  it('avertit sous le salaire minimum', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    const brut = screen.getByLabelText('Salaire brut mensuel (€)')
    await user.clear(brut)
    await user.type(brut, '2000')
    expect(screen.getByText(/inférieur au salaire minimum légal/)).toBeInTheDocument()
  })

  it('déplie et replie une explication au clavier', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    const bouton = screen.getByRole('button', { name: 'Explication : Cotisations ONSS (13,07 %)' })
    expect(bouton).toHaveAttribute('aria-expanded', 'false')
    await user.click(bouton)
    expect(bouton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/Cotisation personnelle de sécurité sociale/)).toBeVisible()
    await user.keyboard('{Escape}')
    expect(bouton).toHaveAttribute('aria-expanded', 'false')
  })
})
```

- [ ] **Step 2 : Vérifier qu'ils échouent**

Run : `npx vitest run src/App.test.tsx`
Attendu : FAIL, par exemple `Unable to find role="region" and name "Votre salaire net"` (l'App provisoire n'affiche qu'un titre).

- [ ] **Step 3 : Écrire les composants d'affichage**

`src/components/InfoBulle.tsx` :

```tsx
import { useId, useState, type ReactNode } from 'react'
import { fr } from '../i18n/fr'

interface Props {
  libelle: string
  children: ReactNode
}

/** Bouton ⓘ qui déplie une explication. Échap la referme. */
export function InfoBulle({ libelle, children }: Props) {
  const [ouvert, setOuvert] = useState(false)
  const idPanneau = useId()

  return (
    <>
      <button
        type="button"
        aria-expanded={ouvert}
        aria-controls={idPanneau}
        aria-label={fr.detail.explicationDe(libelle)}
        onClick={() => setOuvert((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOuvert(false)
        }}
        className="inline-flex size-6 items-center justify-center rounded-full text-sm text-slate-500 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-slate-400 dark:hover:bg-slate-700"
      >
        ⓘ
      </button>
      <div
        id={idPanneau}
        hidden={!ouvert}
        className="basis-full rounded-md bg-slate-100 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        {children}
      </div>
    </>
  )
}
```

`src/components/LigneCalcul.tsx` :

```tsx
import type { Ligne } from '../engine/types'
import { fr } from '../i18n/fr'
import { formatEuro } from '../utils/format'
import { InfoBulle } from './InfoBulle'

const SIGNE = { '+': '+ ', '-': '− ', '=': '' } as const

export function LigneCalcul({ ligne }: { ligne: Ligne }) {
  const { libelle, explication } = fr.lignes[ligne.id]
  const total = ligne.sens === '='

  return (
    <li className={`flex flex-wrap items-center gap-x-2 gap-y-2 py-2 ${total ? 'font-semibold' : ''}`}>
      <span>{libelle}</span>
      <InfoBulle libelle={libelle}>
        <p>{explication}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {fr.detail.source} : {ligne.source}
        </p>
      </InfoBulle>
      <span className="ml-auto tabular-nums">
        {SIGNE[ligne.sens]}
        {formatEuro(ligne.montantCentimes)}
      </span>
    </li>
  )
}
```

`src/components/DetailCalcul.tsx` :

```tsx
import type { Resultat } from '../engine/types'
import { fr } from '../i18n/fr'
import { LigneCalcul } from './LigneCalcul'

export function DetailCalcul({ resultat }: { resultat: Resultat | null }) {
  return (
    <section aria-labelledby="titre-detail" className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
      <h2 id="titre-detail" className="mb-2 text-lg font-semibold">
        {fr.detail.titre}
      </h2>
      {resultat ? (
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {resultat.lignes.map((ligne) => (
            <LigneCalcul key={ligne.id} ligne={ligne} />
          ))}
        </ul>
      ) : (
        <p className="text-slate-500">—</p>
      )}
    </section>
  )
}
```

`src/components/Recapitulatif.tsx` :

```tsx
import type { Resultat } from '../engine/types'
import { fr } from '../i18n/fr'
import { formatDateFr, formatEuro, formatPourcentage } from '../utils/format'

export function Recapitulatif({ resultat }: { resultat: Resultat | null }) {
  const t = fr.recapitulatif

  return (
    <section aria-labelledby="titre-recap" className="rounded-xl bg-blue-700 p-5 text-white shadow-sm dark:bg-blue-900">
      <h2 id="titre-recap" className="text-lg font-semibold">
        {t.titre}
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <dt className="text-sm text-blue-100">{t.netMensuel}</dt>
          <dd className="text-4xl font-bold tabular-nums">{resultat ? formatEuro(resultat.netMensuelCentimes) : '—'}</dd>
        </div>
        <div>
          <dt className="text-sm text-blue-100">{t.netAnnuel}</dt>
          <dd className="text-xl font-semibold tabular-nums">{resultat ? formatEuro(resultat.netAnnuelCentimes) : '—'}</dd>
          <dd className="text-xs text-blue-100">{t.horsExtras}</dd>
        </div>
        <div>
          <dt className="text-sm text-blue-100">{t.tauxRetour}</dt>
          <dd className="text-xl font-semibold tabular-nums">{resultat ? formatPourcentage(resultat.tauxRetour) : '—'}</dd>
        </div>
      </dl>
      {resultat && (
        <p className="mt-4 text-xs text-blue-100">
          {t.periode(formatDateFr(resultat.periode.valideDu), formatDateFr(resultat.periode.valideAu))}
        </p>
      )}
    </section>
  )
}
```

`src/components/Avertissements.tsx` :

```tsx
import type { EtatCalcul } from '../hooks/useCalcul'
import { fr } from '../i18n/fr'
import { formatDateFr, formatEuro } from '../utils/format'

export function Avertissements({ etat }: { etat: EtatCalcul }) {
  return (
    <div className="space-y-3">
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
        {fr.bandeauEstimation}
      </p>
      {etat.etat === 'periodeNonCouverte' && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-100">
          {fr.alertes.periodeNonCouverte(formatDateFr(etat.dateIso))}
        </p>
      )}
      {etat.etat === 'saisieInvalide' && (
        <p role="status" className="text-sm text-slate-600 dark:text-slate-300">
          {fr.alertes.saisieInvalide}
        </p>
      )}
      {etat.etat === 'ok' && etat.brutCentimes < etat.rmmmgCentimes && (
        <p role="status" className="rounded-lg bg-slate-100 p-3 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-100">
          {fr.alertes.sousRmmmg(formatEuro(etat.rmmmgCentimes))}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4 : Écrire le formulaire**

`src/components/FormulaireSituation.tsx` :

```tsx
import type { ReactNode } from 'react'
import { REVENUS_CONJOINT, type RevenusConjoint } from '../engine/types'
import type { ErreursSaisie, SaisieFormulaire } from '../engine/validation'
import { fr } from '../i18n/fr'

interface Props {
  saisie: SaisieFormulaire
  erreurs: ErreursSaisie
  onChange: <K extends keyof SaisieFormulaire>(champ: K, valeur: SaisieFormulaire[K]) => void
}

const CHAMP =
  'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-blue-600 aria-invalid:border-red-600 dark:border-slate-600 dark:bg-slate-800'

function Erreur({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1 text-sm text-red-700 dark:text-red-400">
      {children}
    </p>
  )
}

export function FormulaireSituation({ saisie, erreurs, onChange }: Props) {
  const t = fr.formulaire
  const isole = saisie.etatCivil === 'isole'
  const enfants = Number(saisie.enfantsACharge)
  const afficherParentIsole = isole && Number.isInteger(enfants) && enfants > 0

  return (
    <section aria-labelledby="titre-formulaire" className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
      <h2 id="titre-formulaire" className="mb-4 text-lg font-semibold">
        {t.titre}
      </h2>
      <form className="space-y-5" onSubmit={(e) => e.preventDefault()} noValidate>
        <div>
          <label htmlFor="brut" className="font-medium">
            {t.brut}
          </label>
          <input
            id="brut"
            inputMode="decimal"
            autoComplete="off"
            value={saisie.brut}
            onChange={(e) => onChange('brut', e.target.value)}
            aria-invalid={erreurs.brut ? true : undefined}
            aria-describedby={erreurs.brut ? 'brut-erreur' : undefined}
            className={CHAMP}
          />
          {erreurs.brut && <Erreur id="brut-erreur">{fr.erreurs[erreurs.brut]}</Erreur>}
        </div>

        <fieldset>
          <legend className="font-medium">{t.etatCivil}</legend>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
            {(['isole', 'marieOuCohabitant'] as const).map((valeur) => (
              <label key={valeur} className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="etatCivil"
                  value={valeur}
                  checked={saisie.etatCivil === valeur}
                  onChange={() => onChange('etatCivil', valeur)}
                  className="size-4 accent-blue-700"
                />
                {t[valeur]}
              </label>
            ))}
          </div>
        </fieldset>

        {!isole && (
          <div>
            <label htmlFor="revenusConjoint" className="font-medium">
              {t.revenusConjoint}
            </label>
            <select
              id="revenusConjoint"
              value={saisie.revenusConjoint}
              onChange={(e) => onChange('revenusConjoint', e.target.value as RevenusConjoint)}
              aria-describedby="revenusConjoint-aide"
              className={CHAMP}
            >
              {REVENUS_CONJOINT.map((valeur) => (
                <option key={valeur} value={valeur}>
                  {fr.revenusConjoint[valeur]}
                </option>
              ))}
            </select>
            <p id="revenusConjoint-aide" className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t.aideRevenusConjoint}
            </p>
          </div>
        )}

        <div>
          <label htmlFor="enfantsACharge" className="font-medium">
            {t.enfants}
          </label>
          <input
            id="enfantsACharge"
            type="number"
            inputMode="numeric"
            min={0}
            max={10}
            step={1}
            value={saisie.enfantsACharge}
            onChange={(e) => onChange('enfantsACharge', e.target.value)}
            aria-invalid={erreurs.enfantsACharge ? true : undefined}
            aria-describedby={erreurs.enfantsACharge ? 'enfants-erreur' : undefined}
            className={CHAMP}
          />
          {erreurs.enfantsACharge && <Erreur id="enfants-erreur">{fr.erreurs[erreurs.enfantsACharge]}</Erreur>}
        </div>

        {afficherParentIsole && (
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={saisie.parentIsole}
              onChange={(e) => onChange('parentIsole', e.target.checked)}
              className="mt-1 size-4 accent-blue-700"
            />
            {t.parentIsole}
          </label>
        )}
      </form>
    </section>
  )
}
```

- [ ] **Step 5 : Assembler la page**

`src/App.tsx` :

```tsx
import { Avertissements } from './components/Avertissements'
import { DetailCalcul } from './components/DetailCalcul'
import { FormulaireSituation } from './components/FormulaireSituation'
import { Recapitulatif } from './components/Recapitulatif'
import { useCalcul } from './hooks/useCalcul'
import { useSaisie } from './hooks/useSaisie'
import { fr } from './i18n/fr'
import { dateIsoLocale } from './utils/format'

interface Props {
  /** Date des règles à appliquer (AAAA-MM-JJ). Par défaut : aujourd'hui. */
  dateIso?: string
}

export default function App({ dateIso = dateIsoLocale(new Date()) }: Props) {
  const { saisie, modifier } = useSaisie()
  const etat = useCalcul(saisie, dateIso)
  const resultat = etat.etat === 'ok' ? etat.resultat : null
  const erreurs = etat.etat === 'saisieInvalide' ? etat.erreurs : {}

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
            <FormulaireSituation saisie={saisie} erreurs={erreurs} onChange={modifier} />
          </div>
          <div className="order-1 lg:order-2">
            <Recapitulatif resultat={resultat} />
          </div>
          <div className="order-3">
            <DetailCalcul resultat={resultat} />
          </div>
        </main>
      </div>
    </div>
  )
}
```

Mise en page : sur écran large, le formulaire occupe la colonne gauche sur deux rangées, le récapitulatif puis le détail la colonne droite ; sous `lg`, les classes `order-*` placent le récapitulatif en premier (spec § 7).

- [ ] **Step 6 : Vérifier**

Run : `npx vitest run src/App.test.tsx`
Attendu : PASS, 10 tests.

- [ ] **Step 7 : Commit**

```powershell
git add src/components src/App.tsx src/App.test.tsx
git commit -m "feat: interface du calculateur (formulaire, récapitulatif, détail expliqué)" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

### Task 12 : Vérification finale et README

**Files :**
- Create : `README.md`

**Interfaces :**
- Consumes : l'application complète.
- Produces : une V1 vérifiée et documentée sur `main`.

- [ ] **Step 1 : Lancer toutes les vérifications**

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

Attendu : `Test Files 11 passed (11)` et `Tests 213 passed (213)` ; `tsc -b` sans erreur ; oxlint sans erreur ; `✓ built in …`.

- [ ] **Step 2 : Vérifier à la main dans le navigateur**

Run : `npm run dev`, puis ouvrir l'URL affichée (par défaut `http://localhost:5173`).

Vérifier chaque point :
- saisie par défaut (3 000 €, isolé, 0 enfant) : net mensuel **2 261,33 €**, taux de retour **75,4 %**, « Règles en vigueur du 01/09/2026 au 31/12/2026 » (si la date du jour est dans cette période) ;
- choisir « Marié ou cohabitant légal » : la liste des 5 cas de revenus du conjoint apparaît, et le net change quand on change de cas ;
- revenir à « Isolé » et mettre 1 enfant : la case « parent isolé » apparaît ;
- vider le brut : message d'erreur sous le champ, montants remplacés par « — » ;
- brut 2 000 : message « inférieur au salaire minimum légal » ;
- chaque bouton ⓘ déplie son explication et sa source ; Échap la replie ;
- recharger la page : la saisie est conservée ;
- outils de développement en largeur 390 px : le récapitulatif est au-dessus du formulaire et rien ne déborde horizontalement ;
- thème sombre du système : textes lisibles.

Arrêter le serveur (Ctrl+C).

- [ ] **Step 3 : Écrire le README**

`README.md` :

````markdown
# Salaire net Belgique

Calculateur brut → net mensuel pour un employé à temps plein en Belgique, exact au centime selon les règles officielles en vigueur du 1er juillet au 31 décembre 2026.

Chaque ligne du détail (ONSS, bonus à l'emploi, précompte professionnel, bonus fiscal, cotisation spéciale) cite sa source officielle.

## Démarrer

```powershell
npm install
npm run dev
```

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm test` | tous les tests (Vitest) |
| `npm run typecheck` | vérification TypeScript |
| `npm run lint` | oxlint |
| `npm run build` | build de production dans `dist/` |
| `python tools/reference/reference.py` | régénère les 74 cas de référence |

## Comment l'exactitude est vérifiée

- Le moteur (`src/engine/`) calcule en centimes entiers, avec les arrondis imposés par les textes.
- `tools/reference/reference.py` recalcule 74 situations directement depuis les textes officiels, sans réutiliser le code TypeScript. Le moteur doit reproduire chaque valeur intermédiaire au centime.
- Un cas n'est marqué `verifie: true` qu'après comparaison avec une source externe (fiche de paie réelle, simulateur officiel).

## Sources

- SPF Finances, formule-clé du précompte professionnel 2026 (ESS-SR/2025-0928)
- ONSS, instructions administratives 2026/3 : bonus à l'emploi, cotisation spéciale de sécurité sociale

## Limites de la V1

Employé à temps plein uniquement ; pas d'ouvriers, de temps partiel, de 13e mois, de pécule de vacances ni d'avantages extralégaux. Estimation qui ne remplace pas une fiche de paie. Détails dans `docs/superpowers/specs/`.
````

- [ ] **Step 4 : Commit final**

```powershell
git add README.md
git commit -m "docs: README du calculateur V1" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
git status -sb
```

Attendu : `## main...origin/main`, sans fichier en attente.
