# Comparer deux offres — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de comparer deux offres d'emploi côte à côte : deux onglets « Offre A » / « Offre B » dans le formulaire, famille commune, et un tableau de comparaison à la place du récapitulatif.

**Architecture:** L'état de saisie devient `{ offreA, offreB | null, offreActive }` dans `useSaisie`, chaque offre étant une `SaisieFormulaire` complète ; la famille est écrite dans les deux offres à un seul endroit (`modifier`). L'app calcule chaque offre avec `useCalcul`, résume chaque résultat (`resumerOffre`) et compare les résumés avec une fonction pure (`comparerOffres`). Sans offre B, rien ne change.

**Tech Stack:** React 19, TypeScript 6 strict, Tailwind 4, Vitest + Testing Library + user-event + jsdom, oxlint.

**Spec:** `docs/superpowers/specs/2026-09-29-comparaison-offres-design.md`

## Global Constraints

- **Aucun test existant ne change** (critère 1) : ni valeur attendue, ni affirmation, ni titre. On ajoute des tests, on n'en retire pas.
- Aucun fichier de `src/engine/` n'est modifié, hormis la **création** de `src/engine/comparaison.ts` (critère 5).
- L'offre A reste sauvegardée sous `CLE_STOCKAGE` (`'wage-calculator:saisie:v7'`), au format actuel. La comparaison a sa propre clé : `'wage-calculator:comparaison:v1'`, contenu `{ offreB, offreActive }`, supprimée quand il n'y a pas d'offre B (spec § 2.4).
- Montants en centimes entiers ; aucune nouvelle règle légale.
- Aucun texte en dur dans les composants : tout passe par `src/i18n/fr.ts`.
- Titres de tests **entre guillemets simples**, avec l'apostrophe typographique `’` (U+2019) quand il en faut une. Jamais de guillemets doubles ni d'apostrophe droite `'` dans un titre.
- TypeScript strict, aucun `any`, aucune dépendance nouvelle. UTF-8, LF.
- Avant chaque commit : `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` verts.
- `git add` des fichiers de la tâche par leur chemin, jamais `git add -A` ni `git add .`. Messages de commit en français.
- Aucun processus lancé en arrière-plan (pas de `npm run dev`) ; ni push ni merge.

## Valeurs de référence

Calculées une fois avec le moteur (date `2026-09-14`, isolé, réglages par défaut : 13e mois 100 % et double pécule cochés, voiture de société avec ATN `0`). L'offre « B » est A avec un brut de 3 500 € et les titres-repas cochés (20 jours, 10,00 €, part travailleur 1,09 €).

| | brut | brut annuel | net versé | net annuel tout compris | titres-repas / mois | taux de retour |
|---|---|---|---|---|---|---|
| A (3 000 €, 0 enfant) | 300 000 | 4 176 000 | 226 133 | 2 994 614 | 0 | 75,4 % |
| B (3 500 €, titres, 0 enfant) | 350 000 | 4 872 000 | 237 860 | 3 182 174 | 20 000 | 68,6 % |
| A, 2 enfants | 300 000 | 4 176 000 | 239 933 | 3 160 214 | 0 | |
| B, 2 enfants | 350 000 | 4 872 000 | 251 660 | 3 347 774 | 20 000 | |

Totaux annuels en poche : A = 2 994 614 ; B = 3 182 174 + 12 × 20 000 = 3 422 174 ; écart = + 427 560 (« 4 275,60 € »). Avec 2 enfants : 3 160 214 et 3 587 774, même écart.

## Review Focus

1. **Famille modifiée depuis l'offre B** : l'offre A doit la recevoir aussi (test dans la tâche 2 et dans la tâche 5).
2. **Bascule brut ↔ net dans l'offre B** : l'offre A ne doit pas bouger, ni son montant, ni son sens (tâche 2 et tâche 5).
3. **Rechargement de la page avec une offre B ouverte** : on retrouve l'offre B, ouverte (tâche 5).
4. **Offre B en net → brut, net hors limites** : sa colonne et l'écart montrent « — », sans plantage (tâche 5).
5. **Offre B invalide, puis retirée** : le « ⚠ » disparaît avec elle, le récapitulatif revient avec l'offre A (tâche 5).

---

### Task 1 : Résumer et comparer deux offres

**Files:**
- Create: `src/engine/comparaison.ts`
- Create: `src/engine/comparaison.test.ts`
- Modify: `src/hooks/useCalcul.ts` (ajout de `resumerOffre` et d'une surcharge de `useCalcul` acceptant `null`)
- Modify: `src/hooks/useCalcul.test.ts` (ajout de deux `describe` à la fin du fichier)

**Interfaces:**
- Consumes: `EtatCalcul`, `calculerEtat` (existants, `src/hooks/useCalcul.ts`) ; `ChoixMobilite` (`src/engine/avantages.ts`).
- Produces :
  - `interface ResumeOffre { brutMensuelCentimes: number; brutAnnuelCentimes: number; netVerseCentimes: number; netAnnuelToutComprisCentimes: number; titresRepasMensuelCentimes: number; ecochequesAnnuelCentimes: number; choixMobilite: ChoixMobilite; atnMensuelCentimes: number; tauxRetour: number }`
  - `interface Ecarts { brutMensuel: number; brutAnnuel: number; netVerse: number; netAnnuelToutCompris: number; titresRepas: number; ecocheques: number; totalAnnuelEnPoche: number }`
  - `type OffreGagnante = 'A' | 'B' | 'egalite'`
  - `interface Comparaison { a: ResumeOffre | null; b: ResumeOffre | null; totalA: number | null; totalB: number | null; ecarts: Ecarts | null; afficherTitresRepas: boolean; afficherEcocheques: boolean; gagnante: OffreGagnante | null }`
  - `totalAnnuelEnPoche(offre: ResumeOffre): number`
  - `comparerOffres(a: ResumeOffre | null, b: ResumeOffre | null): Comparaison`
  - `resumerOffre(etat: EtatCalcul, choixMobilite: ChoixMobilite): ResumeOffre | null` (dans `src/hooks/useCalcul.ts`)
  - `useCalcul(saisie: SaisieFormulaire, dateIso: string): EtatCalcul` et `useCalcul(saisie: SaisieFormulaire | null, dateIso: string): EtatCalcul | null`

- [ ] **Step 1 : Écrire les tests de `comparaison.ts`**

Créer `src/engine/comparaison.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { comparerOffres, totalAnnuelEnPoche, type ResumeOffre } from './comparaison'

const A: ResumeOffre = {
  brutMensuelCentimes: 300_000,
  brutAnnuelCentimes: 4_176_000,
  netVerseCentimes: 226_133,
  netAnnuelToutComprisCentimes: 2_994_614,
  titresRepasMensuelCentimes: 0,
  ecochequesAnnuelCentimes: 0,
  choixMobilite: 'voiture',
  atnMensuelCentimes: 0,
  tauxRetour: 0.7538,
}

const B: ResumeOffre = {
  ...A,
  brutMensuelCentimes: 350_000,
  brutAnnuelCentimes: 4_872_000,
  netVerseCentimes: 237_860,
  netAnnuelToutComprisCentimes: 3_182_174,
  titresRepasMensuelCentimes: 20_000,
  tauxRetour: 0.6858,
}

describe('totalAnnuelEnPoche', () => {
  it('additionne le net annuel tout compris, 12 mois de titres-repas et les écochèques', () => {
    expect(totalAnnuelEnPoche(A)).toBe(2_994_614)
    expect(totalAnnuelEnPoche(B)).toBe(3_182_174 + 12 * 20_000)
    expect(totalAnnuelEnPoche({ ...A, ecochequesAnnuelCentimes: 25_000 })).toBe(2_994_614 + 25_000)
  })

  it('ne compte pas la voiture de société', () => {
    expect(totalAnnuelEnPoche({ ...A, atnMensuelCentimes: 12_000 })).toBe(2_994_614)
  })
})

describe('comparerOffres', () => {
  it('calcule chaque écart B − A au centime', () => {
    expect(comparerOffres(A, B).ecarts).toEqual({
      brutMensuel: 50_000,
      brutAnnuel: 696_000,
      netVerse: 11_727,
      netAnnuelToutCompris: 187_560,
      titresRepas: 20_000,
      ecocheques: 0,
      totalAnnuelEnPoche: 427_560,
    })
  })

  it('donne des écarts négatifs quand l’offre A rapporte plus', () => {
    const comparaison = comparerOffres(B, A)
    expect(comparaison.ecarts?.totalAnnuelEnPoche).toBe(-427_560)
    expect(comparaison.gagnante).toBe('A')
  })

  it('désigne l’offre B quand elle rapporte plus', () => {
    const comparaison = comparerOffres(A, B)
    expect(comparaison.totalA).toBe(2_994_614)
    expect(comparaison.totalB).toBe(3_422_174)
    expect(comparaison.gagnante).toBe('B')
  })

  it('signale l’égalité parfaite', () => {
    const comparaison = comparerOffres(A, { ...A })
    expect(comparaison.gagnante).toBe('egalite')
    expect(comparaison.ecarts?.totalAnnuelEnPoche).toBe(0)
  })

  it('n’a ni écarts ni gagnante quand une offre n’a pas de résultat', () => {
    for (const comparaison of [comparerOffres(A, null), comparerOffres(null, B), comparerOffres(null, null)]) {
      expect(comparaison.ecarts).toBeNull()
      expect(comparaison.gagnante).toBeNull()
    }
    expect(comparerOffres(A, null).totalA).toBe(2_994_614)
    expect(comparerOffres(A, null).totalB).toBeNull()
  })

  it('n’affiche les titres-repas et les écochèques que si une offre en a', () => {
    expect(comparerOffres(A, { ...A })).toMatchObject({ afficherTitresRepas: false, afficherEcocheques: false })
    expect(comparerOffres(A, B)).toMatchObject({ afficherTitresRepas: true, afficherEcocheques: false })
    expect(comparerOffres({ ...A, ecochequesAnnuelCentimes: 25_000 }, A)).toMatchObject({ afficherEcocheques: true })
    expect(comparerOffres(null, B)).toMatchObject({ afficherTitresRepas: true })
  })
})
```

- [ ] **Step 2 : Vérifier que ces tests échouent**

Run: `npx vitest run src/engine/comparaison.test.ts`
Expected: FAIL (`Failed to resolve import "./comparaison"`).

- [ ] **Step 3 : Écrire `src/engine/comparaison.ts`**

```ts
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
```

- [ ] **Step 4 : Vérifier que ces tests passent**

Run: `npx vitest run src/engine/comparaison.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5 : Écrire les tests de `resumerOffre` et de `useCalcul(null)`**

Ajouter à la fin de `src/hooks/useCalcul.test.ts`, et compléter les imports en tête du fichier s'ils n'y sont pas déjà : `renderHook` depuis `@testing-library/react` ; `calculerEtat`, `resumerOffre` et `useCalcul` depuis `./useCalcul` ; `SAISIE_AVANTAGES_PAR_DEFAUT` et `SAISIE_PAR_DEFAUT` depuis `../engine/validation`.

```ts
describe('resumerOffre', () => {
  const DATE_RESUME = '2026-09-14'

  it('reprend du calcul les montants de la comparaison', () => {
    const saisie = { ...SAISIE_PAR_DEFAUT, montant: '3500', avantages: { ...SAISIE_AVANTAGES_PAR_DEFAUT, titresRepasActif: true } }
    expect(resumerOffre(calculerEtat(saisie, DATE_RESUME), saisie.choixMobilite)).toEqual({
      brutMensuelCentimes: 350_000,
      brutAnnuelCentimes: 4_872_000,
      netVerseCentimes: 237_860,
      netAnnuelToutComprisCentimes: 3_182_174,
      titresRepasMensuelCentimes: 20_000,
      ecochequesAnnuelCentimes: 0,
      choixMobilite: 'voiture',
      atnMensuelCentimes: 0,
      tauxRetour: expect.closeTo(0.6858, 4),
    })
  })

  it('reprend l’ATN avant contribution pour une voiture, 0 sinon', () => {
    const voiture = { ...SAISIE_PAR_DEFAUT, atn: '120' }
    expect(resumerOffre(calculerEtat(voiture, DATE_RESUME), 'voiture')?.atnMensuelCentimes).toBe(12_000)
    const aucune = { ...SAISIE_PAR_DEFAUT, choixMobilite: 'aucun' as const, atn: '120' }
    expect(resumerOffre(calculerEtat(aucune, DATE_RESUME), 'aucun')?.atnMensuelCentimes).toBe(0)
  })

  it('renvoie null quand le calcul n’aboutit pas', () => {
    const invalide = { ...SAISIE_PAR_DEFAUT, montant: '' }
    expect(resumerOffre(calculerEtat(invalide, DATE_RESUME), 'voiture')).toBeNull()
  })
})

describe('useCalcul sans saisie', () => {
  it('renvoie null pour une saisie absente', () => {
    const { result } = renderHook(() => useCalcul(null, '2026-09-14'))
    expect(result.current).toBeNull()
  })
})
```

- [ ] **Step 6 : Vérifier que ces tests échouent**

Run: `npx vitest run src/hooks/useCalcul.test.ts`
Expected: FAIL (`resumerOffre` n'est pas exporté).

- [ ] **Step 7 : Ajouter `resumerOffre` et la surcharge de `useCalcul`**

Dans `src/hooks/useCalcul.ts`, ajouter aux imports :

```ts
import type { ChoixMobilite } from '../engine/avantages'
import type { ResumeOffre } from '../engine/comparaison'
```

Remplacer la fonction `useCalcul` (fin du fichier) par :

```ts
/** Montants d'une offre pour le tableau de comparaison, ou null si son calcul n'aboutit pas. */
export function resumerOffre(etat: EtatCalcul, choixMobilite: ChoixMobilite): ResumeOffre | null {
  if (etat.etat !== 'ok') {
    return null
  }
  return {
    brutMensuelCentimes: etat.brutCentimes,
    brutAnnuelCentimes: etat.annuel.brutAnnuelCentimes,
    netVerseCentimes: etat.complet.netVerseCentimes,
    netAnnuelToutComprisCentimes: etat.annuel.netAnnuelToutComprisCentimes,
    titresRepasMensuelCentimes: etat.complet.avantages.valeurTitresCentimes,
    ecochequesAnnuelCentimes: etat.complet.avantages.ecochequesAnnuelCentimes,
    choixMobilite,
    atnMensuelCentimes: choixMobilite === 'voiture' ? etat.complet.atn.avantContributionCentimes : 0,
    tauxRetour: etat.complet.resultat.tauxRetour,
  }
}

/** Sans saisie (pas d'offre B), renvoie null : l'app appelle toujours ce hook deux fois (règle des hooks). */
export function useCalcul(saisie: SaisieFormulaire, dateIso: string): EtatCalcul
export function useCalcul(saisie: SaisieFormulaire | null, dateIso: string): EtatCalcul | null
export function useCalcul(saisie: SaisieFormulaire | null, dateIso: string): EtatCalcul | null {
  return useMemo(() => (saisie === null ? null : calculerEtat(saisie, dateIso)), [saisie, dateIso])
}
```

- [ ] **Step 8 : Vérifier que tout passe**

Run: `npm test` puis `npm run typecheck`, `npm run lint`, `npm run build`
Expected: tout vert ; les 922 tests existants inchangés, plus 12 nouveaux.

- [ ] **Step 9 : Commit**

```bash
git add src/engine/comparaison.ts src/engine/comparaison.test.ts src/hooks/useCalcul.ts src/hooks/useCalcul.test.ts
git commit -m "feat: résumer et comparer deux offres"
```

---

### Task 2 : Deux offres dans `useSaisie`, famille commune

**Files:**
- Modify: `src/hooks/useSaisie.ts`
- Modify: `src/hooks/useSaisie.test.ts` (ajout de deux `describe` à la fin du fichier ; les tests existants ne changent pas)

**Interfaces:**
- Consumes: `SaisieFormulaire`, `SAISIE_PAR_DEFAUT` (`src/engine/validation.ts`) ; les fonctions internes existantes de `useSaisie.ts` : `estObjet`, `estSaisie`, `estSaisieV2`, `completer`, `lireCle`, `lireSaisieStockee`, et le type `ChampsFamille`.
- Produces :
  - `export const CLE_COMPARAISON = 'wage-calculator:comparaison:v1'`
  - `export const OFFRES = ['A', 'B'] as const` ; `export type IdOffre = (typeof OFFRES)[number]`
  - `export const CHAMPS_FAMILLE = ['etatCivil', 'revenusConjoint', 'enfantsACharge', 'parentIsole'] as const`
  - `export interface EtatOffres { offreA: SaisieFormulaire; offreB: SaisieFormulaire | null; offreActive: IdOffre }`
  - `export function lireOffresStockees(): EtatOffres`
  - `useSaisie()` renvoie `{ saisie, modifier, basculerSens, basculerPeriode, offreA, offreB, offreActive, ajouterOffreB, retirerOffreB, choisirOffre }`, avec `ajouterOffreB: () => void`, `retirerOffreB: () => void`, `choisirOffre: (id: IdOffre) => void`. `saisie` est l'offre ouverte ; `modifier`, `basculerSens`, `basculerPeriode` gardent leur signature.

- [ ] **Step 1 : Écrire les tests**

Ajouter `CLE_COMPARAISON`, `CHAMPS_FAMILLE` et `lireOffresStockees` à l'import depuis `./useSaisie` en tête de `src/hooks/useSaisie.test.ts`, puis, à la fin du fichier :

```ts
describe('useSaisie — deux offres', () => {
  it('n’a pas d’offre B au départ', () => {
    const { result } = renderHook(() => useSaisie())
    expect(result.current.offreB).toBeNull()
    expect(result.current.offreActive).toBe('A')
    expect(result.current.saisie).toBe(result.current.offreA)
  })

  it('crée l’offre B par copie de l’offre A, sans le souvenir de la bascule, et l’ouvre', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.modifier('montant', '3200'))
    act(() => result.current.basculerSens('2400'))
    act(() => result.current.ajouterOffreB())
    expect(result.current.offreActive).toBe('B')
    expect(result.current.offreB).toEqual({ ...result.current.offreA, montantAvantBascule: null })
    expect(result.current.offreA.montantAvantBascule).toBe('3200')
    expect(result.current.saisie).toBe(result.current.offreB)
  })

  it('ne transmet pas un champ propre à l’offre ouverte à l’autre offre', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.ajouterOffreB())
    act(() => result.current.modifier('montant', '3500'))
    expect(result.current.offreB?.montant).toBe('3500')
    expect(result.current.offreA.montant).toBe(SAISIE_PAR_DEFAUT.montant)
    act(() => result.current.choisirOffre('A'))
    act(() => result.current.modifier('choixMobilite', 'aucun'))
    expect(result.current.offreA.choixMobilite).toBe('aucun')
    expect(result.current.offreB?.choixMobilite).toBe(SAISIE_PAR_DEFAUT.choixMobilite)
  })

  it('écrit la famille dans les deux offres, depuis l’une comme depuis l’autre', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.ajouterOffreB())
    act(() => result.current.modifier('enfantsACharge', '2'))
    act(() => result.current.modifier('etatCivil', 'marieOuCohabitant'))
    act(() => result.current.choisirOffre('A'))
    act(() => result.current.modifier('revenusConjoint', 'aucun'))
    act(() => result.current.modifier('parentIsole', true))
    for (const champ of CHAMPS_FAMILLE) {
      expect(result.current.offreB?.[champ]).toEqual(result.current.offreA[champ])
    }
    expect(result.current.offreA).toMatchObject({ enfantsACharge: '2', etatCivil: 'marieOuCohabitant', revenusConjoint: 'aucun', parentIsole: true })
  })

  it('bascule le sens et la période de l’offre ouverte seulement', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.ajouterOffreB())
    act(() => result.current.basculerSens('2261,33'))
    act(() => result.current.choisirOffre('A'))
    expect(result.current.offreA).toMatchObject({ sens: 'brutVersNet', montant: SAISIE_PAR_DEFAUT.montant })
    expect(result.current.offreB).toMatchObject({ sens: 'netVersBrut', montant: '2261,33' })
    act(() => result.current.basculerPeriode('41760'))
    expect(result.current.offreA).toMatchObject({ periode: 'annuel', montant: '41760' })
    expect(result.current.offreB?.periode).toBe('mensuel')
  })

  it('retire l’offre B et rouvre l’offre A', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.ajouterOffreB())
    act(() => result.current.modifier('montant', ''))
    act(() => result.current.retirerOffreB())
    expect(result.current.offreB).toBeNull()
    expect(result.current.offreActive).toBe('A')
    expect(result.current.saisie).toBe(result.current.offreA)
    expect(result.current.offreA.montant).toBe(SAISIE_PAR_DEFAUT.montant)
  })

  it('ne peut pas ouvrir une offre B qui n’existe pas', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.choisirOffre('B'))
    expect(result.current.offreActive).toBe('A')
  })

  it('sauvegarde la comparaison sous sa propre clé, et la supprime au retrait', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.ajouterOffreB())
    act(() => result.current.modifier('montant', '3500'))
    expect(JSON.parse(localStorage.getItem(CLE_COMPARAISON) ?? 'null')).toEqual({ offreB: result.current.offreB, offreActive: 'B' })
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE) ?? 'null')).toEqual(result.current.offreA)
    act(() => result.current.retirerOffreB())
    expect(localStorage.getItem(CLE_COMPARAISON)).toBeNull()
  })

  it('retrouve l’offre B et l’offre ouverte au rechargement', () => {
    const premier = renderHook(() => useSaisie())
    act(() => premier.result.current.ajouterOffreB())
    act(() => premier.result.current.modifier('montant', '3500'))
    premier.unmount()
    const { result } = renderHook(() => useSaisie())
    expect(result.current.offreActive).toBe('B')
    expect(result.current.saisie.montant).toBe('3500')
    expect(result.current.offreA.montant).toBe(SAISIE_PAR_DEFAUT.montant)
  })
})

describe('lireOffresStockees', () => {
  it('reprend l’offre A seule sans clé de comparaison', () => {
    expect(lireOffresStockees()).toEqual({ offreA: SAISIE_PAR_DEFAUT, offreB: null, offreActive: 'A' })
  })

  it('reprend une offre B complète', () => {
    const offreB = { ...SAISIE_PAR_DEFAUT, montant: '3500' }
    localStorage.setItem(CLE_COMPARAISON, JSON.stringify({ offreB, offreActive: 'B' }))
    expect(lireOffresStockees()).toEqual({ offreA: SAISIE_PAR_DEFAUT, offreB, offreActive: 'B' })
  })

  it('complète une offre B à laquelle il manque des blocs', () => {
    const incomplete: Partial<SaisieFormulaire> = { ...SAISIE_PAR_DEFAUT, montant: '3500' }
    delete incomplete.primes
    delete incomplete.periode
    localStorage.setItem(CLE_COMPARAISON, JSON.stringify({ offreB: incomplete, offreActive: 'B' }))
    expect(lireOffresStockees().offreB).toEqual({ ...SAISIE_PAR_DEFAUT, montant: '3500' })
  })

  it('reprend l’offre A seule si l’offre B est inutilisable', () => {
    localStorage.setItem(CLE_COMPARAISON, JSON.stringify({ offreB: 'abîmée', offreActive: 'B' }))
    expect(lireOffresStockees()).toEqual({ offreA: SAISIE_PAR_DEFAUT, offreB: null, offreActive: 'A' })
    localStorage.setItem(CLE_COMPARAISON, '{pas du json')
    expect(lireOffresStockees().offreB).toBeNull()
  })

  it('ouvre l’offre A si l’offre ouverte est inconnue', () => {
    localStorage.setItem(CLE_COMPARAISON, JSON.stringify({ offreB: SAISIE_PAR_DEFAUT, offreActive: 'C' }))
    expect(lireOffresStockees().offreActive).toBe('A')
  })

  it('impose la famille de l’offre A à l’offre B', () => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, enfantsACharge: '2' }))
    localStorage.setItem(CLE_COMPARAISON, JSON.stringify({ offreB: { ...SAISIE_PAR_DEFAUT, enfantsACharge: '5', montant: '3500' }, offreActive: 'B' }))
    expect(lireOffresStockees().offreB).toMatchObject({ enfantsACharge: '2', montant: '3500' })
  })
})
```

Importer `type SaisieFormulaire` depuis `../engine/validation` s'il ne l'est pas déjà.

- [ ] **Step 2 : Vérifier que ces tests échouent**

Run: `npx vitest run src/hooks/useSaisie.test.ts`
Expected: FAIL (`CLE_COMPARAISON` n'est pas exporté ; `ajouterOffreB` n'existe pas).

- [ ] **Step 3 : Ajouter les constantes, les types et la lecture**

Dans `src/hooks/useSaisie.ts`, après `CLE_STOCKAGE_V1` :

```ts
/** Comparaison de deux offres (spec comparaison § 2.4) : { offreB, offreActive }, absente sans offre B. */
export const CLE_COMPARAISON = 'wage-calculator:comparaison:v1'

export const OFFRES = ['A', 'B'] as const
export type IdOffre = (typeof OFFRES)[number]

/** Champs communs aux deux offres : c'est la même personne (spec comparaison § 2.3). */
export const CHAMPS_FAMILLE = ['etatCivil', 'revenusConjoint', 'enfantsACharge', 'parentIsole'] as const satisfies readonly (keyof SaisieFormulaire)[]

export interface EtatOffres {
  offreA: SaisieFormulaire
  offreB: SaisieFormulaire | null
  offreActive: IdOffre
}
```

Après `lireSaisieStockee` :

```ts
function familleDe(saisie: SaisieFormulaire): ChampsFamille {
  return {
    etatCivil: saisie.etatCivil,
    revenusConjoint: saisie.revenusConjoint,
    enfantsACharge: saisie.enfantsACharge,
    parentIsole: saisie.parentIsole,
  }
}

/** Offre A (clé v7 et reprises) et, s'il y en a une, l'offre B mémorisée, famille de l'offre A imposée. */
export function lireOffresStockees(): EtatOffres {
  const offreA = lireSaisieStockee()
  const comparaison = lireCle(CLE_COMPARAISON)
  if (!estObjet(comparaison)) {
    return { offreA, offreB: null, offreActive: 'A' }
  }
  const brute = comparaison.offreB
  const offreB = estSaisie(brute) ? brute : estSaisieV2(brute) ? completer(brute) : null
  if (offreB === null) {
    return { offreA, offreB: null, offreActive: 'A' }
  }
  return {
    offreA,
    offreB: { ...offreB, ...familleDe(offreA) },
    offreActive: comparaison.offreActive === 'B' ? 'B' : 'A',
  }
}
```

- [ ] **Step 4 : Réécrire le hook `useSaisie`**

Remplacer toute la fonction `useSaisie` par :

```ts
export function useSaisie() {
  const [offres, setOffres] = useState<EtatOffres>(lireOffresStockees)
  const { offreA, offreB, offreActive } = offres
  const saisie = offreActive === 'B' && offreB !== null ? offreB : offreA

  useEffect(() => {
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(offreA))
    } catch {
      // Stockage indisponible (navigation privée, quota) : l'app fonctionne sans mémoriser.
    }
  }, [offreA])

  useEffect(() => {
    try {
      if (offreB === null) {
        localStorage.removeItem(CLE_COMPARAISON)
      } else {
        localStorage.setItem(CLE_COMPARAISON, JSON.stringify({ offreB, offreActive }))
      }
    } catch {
      // Stockage indisponible : la comparaison reste en mémoire le temps de la visite.
    }
  }, [offreB, offreActive])

  /** Applique une transformation à l'offre ouverte, et à elle seule. */
  const changerOffreOuverte = useCallback((transformer: (saisie: SaisieFormulaire) => SaisieFormulaire) => {
    setOffres((precedent) =>
      precedent.offreActive === 'B' && precedent.offreB !== null
        ? { ...precedent, offreB: transformer(precedent.offreB) }
        : { ...precedent, offreA: transformer(precedent.offreA) },
    )
  }, [])

  const modifier = useCallback(<K extends keyof SaisieFormulaire>(champ: K, valeur: SaisieFormulaire[K]) => {
    const changer = (precedente: SaisieFormulaire): SaisieFormulaire => ({
      ...precedente,
      [champ]: valeur,
      // Toute modification change le résultat affiché : la bascule suivante reprendra ce résultat
      // au lieu de restaurer l'ancien montant.
      montantAvantBascule: null,
    })
    setOffres((precedent) => {
      const ouverteB = precedent.offreActive === 'B' && precedent.offreB !== null
      // La famille est commune aux deux offres (spec comparaison § 2.3) : c'est le seul endroit
      // qui écrit dans l'offre qui n'est pas ouverte.
      const commun = (CHAMPS_FAMILLE as readonly string[]).includes(champ)
      return {
        ...precedent,
        offreA: !ouverteB || commun ? changer(precedent.offreA) : precedent.offreA,
        offreB: precedent.offreB !== null && (ouverteB || commun) ? changer(precedent.offreB) : precedent.offreB,
      }
    })
  }, [])

  /**
   * Change de sens. Nouveau montant : le montant d'avant la bascule si rien n'a été modifié
   * depuis (aller-retour exact), sinon montantRepris (le résultat affiché), sinon le montant actuel.
   * repasserEnMensuel : la période repasse en mensuel (retour en brut → net sans résultat à
   * reprendre, en saisie annuelle), pour que le montant gardé se relise dans la période où il a
   * été tapé.
   */
  const basculerSens = useCallback(
    (montantRepris: string | null, repasserEnMensuel = false) => {
      changerOffreOuverte((precedente) => ({
        ...precedente,
        sens: precedente.sens === 'brutVersNet' ? 'netVersBrut' : 'brutVersNet',
        montant: precedente.montantAvantBascule ?? montantRepris ?? precedente.montant,
        montantAvantBascule: precedente.montant,
        periode: repasserEnMensuel ? 'mensuel' : precedente.periode,
      }))
    },
    [changerOffreOuverte],
  )

  /** Change de période : le champ reprend le montant converti (le résultat affiché), sinon il est gardé. */
  const basculerPeriode = useCallback(
    (montantConverti: string | null) => {
      changerOffreOuverte((precedente) => ({
        ...precedente,
        periode: precedente.periode === 'mensuel' ? 'annuel' : 'mensuel',
        montant: montantConverti ?? precedente.montant,
        montantAvantBascule: null,
      }))
    },
    [changerOffreOuverte],
  )

  /** Crée l'offre B, copie de l'offre A sans le souvenir de la dernière bascule, et l'ouvre (spec comparaison § 2.1). */
  const ajouterOffreB = useCallback(() => {
    setOffres((precedent) =>
      precedent.offreB !== null ? precedent : { ...precedent, offreB: { ...precedent.offreA, montantAvantBascule: null }, offreActive: 'B' },
    )
  }, [])

  const retirerOffreB = useCallback(() => {
    setOffres((precedent) => ({ ...precedent, offreB: null, offreActive: 'A' }))
  }, [])

  const choisirOffre = useCallback((id: IdOffre) => {
    setOffres((precedent) => ({ ...precedent, offreActive: id === 'B' && precedent.offreB !== null ? 'B' : 'A' }))
  }, [])

  return { saisie, modifier, basculerSens, basculerPeriode, offreA, offreB, offreActive, ajouterOffreB, retirerOffreB, choisirOffre }
}
```

- [ ] **Step 5 : Vérifier que tout passe**

Run: `npx vitest run src/hooks/useSaisie.test.ts`, puis `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`
Expected: tout vert. Les tests existants de `useSaisie.test.ts` et de `App.test.tsx` passent **sans modification**.

- [ ] **Step 6 : Commit**

```bash
git add src/hooks/useSaisie.ts src/hooks/useSaisie.test.ts
git commit -m "feat: deux offres dans la saisie, famille commune"
```

---

### Task 3 : Onglets des offres, clavier mis en commun

**Files:**
- Create: `src/hooks/useNavigationOnglets.ts`
- Modify: `src/components/OngletsResultats.tsx` (utilise le hook ; comportement inchangé)
- Create: `src/components/OngletsOffres.tsx`
- Create: `src/components/OngletsOffres.test.tsx`
- Modify: `src/i18n/fr.ts` (nouveau bloc racine `comparaison`)

**Interfaces:**
- Consumes: `OFFRES`, `IdOffre` (tâche 2, `src/hooks/useSaisie.ts`).
- Produces :
  - `useNavigationOnglets<T extends string>(ids: readonly T[], actif: T, choisir: (id: T) => void): { refBouton: (id: T) => (bouton: HTMLButtonElement | null) => void; auClavier: (e: KeyboardEvent<HTMLElement>) => void }`
  - `OngletsOffres({ active, enErreur, onChoisir, actions, children }: { active: IdOffre; enErreur: Record<IdOffre, boolean>; onChoisir: (id: IdOffre) => void; actions?: ReactNode; children: ReactNode })`
  - `fr.comparaison.offres`, `fr.comparaison.offre(id)`, `fr.comparaison.offreACorriger(id)`

- [ ] **Step 1 : Ajouter les textes**

Dans `src/i18n/fr.ts`, ajouter l'import `import type { IdOffre } from '../hooks/useSaisie'` et, juste après le bloc `onglets`, un bloc racine :

```ts
  comparaison: {
    offres: 'Offres comparées',
    offre: (id: IdOffre) => `Offre ${id}`,
    offreACorriger: (id: IdOffre) => `Offre ${id}, à corriger`,
  },
```

- [ ] **Step 2 : Écrire les tests de `OngletsOffres`**

Créer `src/components/OngletsOffres.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { IdOffre } from '../hooks/useSaisie'
import { OngletsOffres } from './OngletsOffres'

function Onglets({ enErreur = { A: false, B: false } }: { enErreur?: Record<IdOffre, boolean> }) {
  const [active, setActive] = useState<IdOffre>('A')
  return (
    <OngletsOffres active={active} enErreur={enErreur} onChoisir={setActive} actions={<button type="button">Action</button>}>
      <p>Contenu de l’offre {active}</p>
    </OngletsOffres>
  )
}

describe('OngletsOffres', () => {
  it('nomme la liste et sélectionne l’offre ouverte', () => {
    render(<Onglets />)
    expect(screen.getByRole('tablist', { name: 'Offres comparées' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Offre A' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Offre B' })).toHaveAttribute('aria-selected', 'false')
  })

  it('étiquette le panneau par l’onglet ouvert et y montre le contenu', () => {
    render(<Onglets />)
    expect(screen.getByRole('tabpanel', { name: 'Offre A' })).toHaveTextContent('Contenu de l’offre A')
  })

  it('change d’offre au clic', async () => {
    const user = userEvent.setup()
    render(<Onglets />)
    await user.click(screen.getByRole('tab', { name: 'Offre B' }))
    expect(screen.getByRole('tab', { name: 'Offre B' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Contenu de l’offre B')
  })

  it('ne met que l’onglet ouvert dans l’ordre de tabulation', () => {
    render(<Onglets />)
    expect(screen.getByRole('tab', { name: 'Offre A' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Offre B' })).toHaveAttribute('tabindex', '-1')
  })

  it('se parcourt aux flèches, en boucle, et avec Début et Fin', async () => {
    const user = userEvent.setup()
    render(<Onglets />)
    screen.getByRole('tab', { name: 'Offre A' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Offre B' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Offre B' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Offre A' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Offre B' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Offre A' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Offre B' })).toHaveFocus()
  })

  it('marque d’un ⚠ l’offre à corriger, et le dit au lecteur d’écran', () => {
    render(<Onglets enErreur={{ A: false, B: true }} />)
    const onglet = screen.getByRole('tab', { name: 'Offre B, à corriger' })
    expect(onglet).toHaveTextContent('⚠')
    expect(screen.getByRole('tab', { name: 'Offre A' })).not.toHaveTextContent('⚠')
  })

  it('affiche les actions hors de la liste d’onglets', () => {
    const onChoisir = vi.fn()
    render(
      <OngletsOffres active="A" enErreur={{ A: false, B: false }} onChoisir={onChoisir} actions={<button type="button">Action</button>}>
        <p>Contenu</p>
      </OngletsOffres>,
    )
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    expect(screen.getByRole('tablist')).not.toContainElement(screen.getByRole('button', { name: 'Action' }))
  })
})
```

- [ ] **Step 3 : Vérifier que ces tests échouent**

Run: `npx vitest run src/components/OngletsOffres.test.tsx`
Expected: FAIL (`Failed to resolve import "./OngletsOffres"`).

- [ ] **Step 4 : Écrire le hook de navigation**

Créer `src/hooks/useNavigationOnglets.ts` :

```ts
import { useRef, type KeyboardEvent } from 'react'

/**
 * Clavier des onglets, motif ARIA (spec ergonomie § 3.3) : flèches gauche et droite en boucle,
 * Début et Fin ; l'onglet atteint est choisi et reçoit le focus.
 */
export function useNavigationOnglets<T extends string>(ids: readonly T[], actif: T, choisir: (id: T) => void) {
  const boutons = useRef(new Map<T, HTMLButtonElement>())

  function refBouton(id: T) {
    return (bouton: HTMLButtonElement | null) => {
      if (bouton) {
        boutons.current.set(id, bouton)
      } else {
        boutons.current.delete(id)
      }
    }
  }

  function auClavier(e: KeyboardEvent<HTMLElement>) {
    const index = ids.indexOf(actif)
    const destinations: Partial<Record<string, number>> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: ids.length - 1,
    }
    const destination = destinations[e.key]
    if (destination === undefined) {
      return
    }
    e.preventDefault()
    const cible = ids[(destination + ids.length) % ids.length]
    choisir(cible)
    boutons.current.get(cible)?.focus()
  }

  return { refBouton, auClavier }
}
```

- [ ] **Step 5 : Faire utiliser ce hook par `OngletsResultats`**

Dans `src/components/OngletsResultats.tsx` : remplacer l'import `useRef, useState, type KeyboardEvent, type ReactNode` par `useState, type ReactNode` ; ajouter `import { useNavigationOnglets } from '../hooks/useNavigationOnglets'` ; supprimer `boutons`, `aller` et `auClavier` ; juste après le calcul de `actif`, écrire :

```tsx
  const { refBouton, auClavier } = useNavigationOnglets(
    onglets.map((o) => o.id),
    actif.id,
    setChoisi,
  )
```

Dans le rendu, remplacer la prop `ref={(bouton) => { … }}` du bouton par `ref={refBouton(onglet.id)}`. Rien d'autre ne change.

Run: `npx vitest run src/components/OngletsResultats.test.tsx`
Expected: PASS (7 tests, inchangés).

- [ ] **Step 6 : Écrire `OngletsOffres`**

Créer `src/components/OngletsOffres.tsx` :

```tsx
import type { ReactNode } from 'react'
import { useNavigationOnglets } from '../hooks/useNavigationOnglets'
import { OFFRES, type IdOffre } from '../hooks/useSaisie'
import { fr } from '../i18n/fr'

interface Props {
  active: IdOffre
  /** Offres dont la saisie est invalide : « ⚠ » sur leur onglet (spec comparaison § 2.2). */
  enErreur: Record<IdOffre, boolean>
  onChoisir: (id: IdOffre) => void
  /** Boutons affichés à droite des onglets, hors de la liste d'onglets. */
  actions?: ReactNode
  children: ReactNode
}

/** Onglets « Offre A » / « Offre B » du formulaire, sur le motif ARIA des onglets. */
export function OngletsOffres({ active, enErreur, onChoisir, actions, children }: Props) {
  const t = fr.comparaison
  const { refBouton, auClavier } = useNavigationOnglets(OFFRES, active, onChoisir)
  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-2 border-b border-slate-200 dark:border-slate-700">
        <div role="tablist" aria-label={t.offres} onKeyDown={auClavier} className="flex gap-1">
          {OFFRES.map((id) => {
            const selectionne = id === active
            return (
              <button
                key={id}
                ref={refBouton(id)}
                type="button"
                role="tab"
                id={`onglet-offre-${id}`}
                aria-selected={selectionne}
                aria-controls={`panneau-offre-${id}`}
                aria-label={enErreur[id] ? t.offreACorriger(id) : undefined}
                tabIndex={selectionne ? 0 : -1}
                onClick={() => onChoisir(id)}
                className={`-mb-px border-b-2 px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  selectionne
                    ? 'border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-300'
                    : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {t.offre(id)}
                {enErreur[id] && <span aria-hidden="true"> ⚠</span>}
              </button>
            )
          })}
        </div>
        {actions && <div className="pb-2">{actions}</div>}
      </div>
      <div role="tabpanel" id={`panneau-offre-${active}`} aria-labelledby={`onglet-offre-${active}`}>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 7 : Vérifier que tout passe**

Run: `npx vitest run src/components/OngletsOffres.test.tsx`, puis `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`
Expected: tout vert (7 nouveaux tests).

- [ ] **Step 8 : Commit**

```bash
git add src/hooks/useNavigationOnglets.ts src/components/OngletsResultats.tsx src/components/OngletsOffres.tsx src/components/OngletsOffres.test.tsx src/i18n/fr.ts
git commit -m "feat: onglets des offres, clavier des onglets mis en commun"
```

---

### Task 4 : Le tableau de comparaison

**Files:**
- Create: `src/components/ComparaisonOffres.tsx`
- Create: `src/components/ComparaisonOffres.test.tsx`
- Modify: `src/i18n/fr.ts` (compléter le bloc `comparaison` de la tâche 3)

**Interfaces:**
- Consumes: `Comparaison`, `ResumeOffre`, `comparerOffres` (tâche 1, `src/engine/comparaison.ts`) ; `formatEuro`, `formatPourcentage` (`src/utils/format.ts`) ; `fr.comparaison.offre` (tâche 3).
- Produces : `ComparaisonOffres({ comparaison }: { comparaison: Comparaison })` — une `section` nommée « Comparaison des offres ».

- [ ] **Step 1 : Compléter les textes**

Dans le bloc `comparaison` de `src/i18n/fr.ts`, ajouter :

```ts
    titre: 'Comparaison des offres',
    ecart: 'Écart (B − A)',
    lignes: {
      brutMensuel: 'Brut mensuel',
      brutAnnuel: 'Brut annuel',
      netVerse: 'Net versé',
      netAnnuelToutCompris: 'Net annuel tout compris',
      titresRepas: 'Titres-repas',
      ecocheques: 'Écochèques',
      mobilite: 'Mobilité',
      tauxRetour: 'Taux de retour',
      totalAnnuelEnPoche: 'Total annuel en poche',
    },
    notes: {
      titresRepas: 'par mois',
      ecocheques: 'par an',
      totalAnnuelEnPoche: 'net annuel tout compris, titres-repas et écochèques ; sans la voiture',
    },
    mobilite: {
      aucun: 'Aucune',
      voiture: (atn: string) => `Voiture · ATN ${atn}/mois`,
      budgetMobilite: 'Budget mobilité',
    },
    resume: {
      A: (ecart: string) => `L’offre A rapporte ${ecart} de plus par an`,
      B: (ecart: string) => `L’offre B rapporte ${ecart} de plus par an`,
      egalite: 'Les deux offres rapportent autant',
    },
```

- [ ] **Step 2 : Écrire les tests**

Créer `src/components/ComparaisonOffres.test.tsx` :

```tsx
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { comparerOffres, type ResumeOffre } from '../engine/comparaison'
import { formatEuro } from '../utils/format'
import { ComparaisonOffres } from './ComparaisonOffres'

/** Testing Library normalise les espaces du DOM ; Intl produit des espaces insécables. */
const euros = (centimes: number) => formatEuro(centimes).replace(/\s/g, ' ')

const A: ResumeOffre = {
  brutMensuelCentimes: 300_000,
  brutAnnuelCentimes: 4_176_000,
  netVerseCentimes: 226_133,
  netAnnuelToutComprisCentimes: 2_994_614,
  titresRepasMensuelCentimes: 0,
  ecochequesAnnuelCentimes: 0,
  choixMobilite: 'voiture',
  atnMensuelCentimes: 0,
  tauxRetour: 0.7537766666666667,
}

const B: ResumeOffre = {
  ...A,
  brutMensuelCentimes: 350_000,
  brutAnnuelCentimes: 4_872_000,
  netVerseCentimes: 237_860,
  netAnnuelToutComprisCentimes: 3_182_174,
  titresRepasMensuelCentimes: 20_000,
  choixMobilite: 'budgetMobilite',
  tauxRetour: 0.6858285714285715,
}

/** Textes des cellules d'une ligne : offre A, offre B, écart. */
function cellules(libelle: string) {
  const ligne = screen.getByRole('rowheader', { name: new RegExp(`^${libelle}`) }).closest('tr')
  if (!ligne) {
    throw new Error(`Ligne introuvable : ${libelle}`)
  }
  return within(ligne)
    .getAllByRole('cell')
    .map((cellule) => (cellule.textContent ?? '').replace(/\s/g, ' '))
}

describe('ComparaisonOffres', () => {
  it('est une région nommée, avec les colonnes des deux offres et de l’écart', () => {
    render(<ComparaisonOffres comparaison={comparerOffres(A, B)} />)
    const region = screen.getByRole('region', { name: 'Comparaison des offres' })
    expect(within(region).getByRole('columnheader', { name: 'Offre A' })).toBeInTheDocument()
    expect(within(region).getByRole('columnheader', { name: 'Offre B' })).toBeInTheDocument()
    expect(within(region).getByRole('columnheader', { name: 'Écart (B − A)' })).toBeInTheDocument()
  })

  it('montre chaque montant et son écart signé', () => {
    render(<ComparaisonOffres comparaison={comparerOffres(A, B)} />)
    expect(cellules('Brut mensuel')).toEqual([euros(300_000), euros(350_000), `+ ${euros(50_000)}`])
    expect(cellules('Brut annuel')).toEqual([euros(4_176_000), euros(4_872_000), `+ ${euros(696_000)}`])
    expect(cellules('Net versé')).toEqual([euros(226_133), euros(237_860), `+ ${euros(11_727)}`])
    expect(cellules('Net annuel tout compris')).toEqual([euros(2_994_614), euros(3_182_174), `+ ${euros(187_560)}`])
    expect(cellules('Titres-repas')).toEqual([euros(0), euros(20_000), `+ ${euros(20_000)}`])
    expect(cellules('Total annuel en poche')).toEqual([euros(2_994_614), euros(3_422_174), `+ ${euros(427_560)}`])
  })

  it('signe un écart négatif avec le vrai signe moins', () => {
    render(<ComparaisonOffres comparaison={comparerOffres(B, A)} />)
    expect(cellules('Net versé')[2]).toBe(`− ${euros(11_727)}`)
  })

  it('montre la mobilité et le taux de retour sans écart', () => {
    render(<ComparaisonOffres comparaison={comparerOffres({ ...A, atnMensuelCentimes: 12_000 }, B)} />)
    expect(cellules('Mobilité')).toEqual([`Voiture · ATN ${euros(12_000)}/mois`, 'Budget mobilité', ''])
    expect(cellules('Taux de retour')).toEqual(['75,4 %', '68,6 %', ''])
  })

  it('écrit « Aucune » sans voiture ni budget mobilité', () => {
    render(<ComparaisonOffres comparaison={comparerOffres({ ...A, choixMobilite: 'aucun' }, A)} />)
    expect(cellules('Mobilité')[0]).toBe('Aucune')
  })

  it('cache les lignes des titres-repas et des écochèques quand aucune offre n’en a', () => {
    render(<ComparaisonOffres comparaison={comparerOffres(A, { ...A })} />)
    expect(screen.queryByRole('rowheader', { name: /^Titres-repas/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('rowheader', { name: /^Écochèques/ })).not.toBeInTheDocument()
  })

  it('montre les écochèques quand une offre en a', () => {
    render(<ComparaisonOffres comparaison={comparerOffres(A, { ...A, ecochequesAnnuelCentimes: 25_000 })} />)
    expect(cellules('Écochèques')).toEqual([euros(0), euros(25_000), `+ ${euros(25_000)}`])
  })

  it('résume quelle offre rapporte le plus, ou l’égalité', () => {
    const premier = render(<ComparaisonOffres comparaison={comparerOffres(A, B)} />)
    expect(screen.getByText(`L’offre B rapporte ${euros(427_560)} de plus par an`)).toBeInTheDocument()
    premier.unmount()
    const second = render(<ComparaisonOffres comparaison={comparerOffres(B, A)} />)
    expect(screen.getByText(`L’offre A rapporte ${euros(427_560)} de plus par an`)).toBeInTheDocument()
    second.unmount()
    render(<ComparaisonOffres comparaison={comparerOffres(A, { ...A })} />)
    expect(screen.getByText('Les deux offres rapportent autant')).toBeInTheDocument()
    expect(cellules('Net versé')[2]).toBe(euros(0))
  })

  it('montre « — » pour une offre sans résultat, et dans l’écart', () => {
    render(<ComparaisonOffres comparaison={comparerOffres(A, null)} />)
    expect(cellules('Net versé')).toEqual([euros(226_133), '—', '—'])
    expect(cellules('Total annuel en poche')).toEqual([euros(2_994_614), '—', '—'])
    expect(cellules('Mobilité')).toEqual([`Voiture · ATN ${euros(0)}/mois`, '—', ''])
    expect(screen.queryByText(/rapporte/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 3 : Vérifier que ces tests échouent**

Run: `npx vitest run src/components/ComparaisonOffres.test.tsx`
Expected: FAIL (`Failed to resolve import "./ComparaisonOffres"`).

- [ ] **Step 4 : Écrire `ComparaisonOffres`**

Créer `src/components/ComparaisonOffres.tsx` :

```tsx
import type { Comparaison, ResumeOffre } from '../engine/comparaison'
import { fr } from '../i18n/fr'
import { formatEuro, formatPourcentage } from '../utils/format'

const TIRET = '—'

const euros = (centimes: number | null | undefined) => (centimes === null || centimes === undefined ? TIRET : formatEuro(centimes))

/** Écart signé : « + 1 234,56 € », « − 87,00 € » (vrai signe moins), « 0,00 € ». */
function ecartSigne(centimes: number | null | undefined): string {
  if (centimes === null || centimes === undefined) {
    return TIRET
  }
  if (centimes === 0) {
    return formatEuro(0)
  }
  return centimes > 0 ? `+ ${formatEuro(centimes)}` : `− ${formatEuro(-centimes)}`
}

function mobilite(offre: ResumeOffre | null): string {
  const t = fr.comparaison.mobilite
  if (offre === null) {
    return TIRET
  }
  switch (offre.choixMobilite) {
    case 'aucun':
      return t.aucun
    case 'voiture':
      return t.voiture(formatEuro(offre.atnMensuelCentimes))
    case 'budgetMobilite':
      return t.budgetMobilite
  }
}

interface Ligne {
  id: string
  libelle: string
  note?: string
  a: string
  b: string
  /** Chaîne vide : ligne sans écart (texte ou taux). */
  ecart: string
  total?: boolean
}

/** Tableau Offre A / Offre B / écart, à la place du récapitulatif (spec comparaison § 3). */
export function ComparaisonOffres({ comparaison }: { comparaison: Comparaison }) {
  const t = fr.comparaison
  const { a, b, ecarts } = comparaison
  const lignes: Ligne[] = [
    { id: 'brutMensuel', libelle: t.lignes.brutMensuel, a: euros(a?.brutMensuelCentimes), b: euros(b?.brutMensuelCentimes), ecart: ecartSigne(ecarts?.brutMensuel) },
    { id: 'brutAnnuel', libelle: t.lignes.brutAnnuel, a: euros(a?.brutAnnuelCentimes), b: euros(b?.brutAnnuelCentimes), ecart: ecartSigne(ecarts?.brutAnnuel) },
    { id: 'netVerse', libelle: t.lignes.netVerse, a: euros(a?.netVerseCentimes), b: euros(b?.netVerseCentimes), ecart: ecartSigne(ecarts?.netVerse) },
    {
      id: 'netAnnuelToutCompris',
      libelle: t.lignes.netAnnuelToutCompris,
      a: euros(a?.netAnnuelToutComprisCentimes),
      b: euros(b?.netAnnuelToutComprisCentimes),
      ecart: ecartSigne(ecarts?.netAnnuelToutCompris),
    },
  ]
  if (comparaison.afficherTitresRepas) {
    lignes.push({
      id: 'titresRepas',
      libelle: t.lignes.titresRepas,
      note: t.notes.titresRepas,
      a: euros(a?.titresRepasMensuelCentimes),
      b: euros(b?.titresRepasMensuelCentimes),
      ecart: ecartSigne(ecarts?.titresRepas),
    })
  }
  if (comparaison.afficherEcocheques) {
    lignes.push({
      id: 'ecocheques',
      libelle: t.lignes.ecocheques,
      note: t.notes.ecocheques,
      a: euros(a?.ecochequesAnnuelCentimes),
      b: euros(b?.ecochequesAnnuelCentimes),
      ecart: ecartSigne(ecarts?.ecocheques),
    })
  }
  lignes.push(
    { id: 'mobilite', libelle: t.lignes.mobilite, a: mobilite(a), b: mobilite(b), ecart: '' },
    {
      id: 'tauxRetour',
      libelle: t.lignes.tauxRetour,
      a: a ? formatPourcentage(a.tauxRetour) : TIRET,
      b: b ? formatPourcentage(b.tauxRetour) : TIRET,
      ecart: '',
    },
    {
      id: 'totalAnnuelEnPoche',
      libelle: t.lignes.totalAnnuelEnPoche,
      note: t.notes.totalAnnuelEnPoche,
      a: euros(comparaison.totalA),
      b: euros(comparaison.totalB),
      ecart: ecartSigne(ecarts?.totalAnnuelEnPoche),
      total: true,
    },
  )

  const ecartTotal = ecarts?.totalAnnuelEnPoche ?? 0
  const resume =
    comparaison.gagnante === 'B'
      ? t.resume.B(formatEuro(ecartTotal))
      : comparaison.gagnante === 'A'
        ? t.resume.A(formatEuro(-ecartTotal))
        : t.resume.egalite

  return (
    <section aria-labelledby="titre-comparaison" className="rounded-xl bg-blue-700 p-5 text-white shadow-sm dark:bg-blue-900">
      <h2 id="titre-comparaison" className="text-lg font-semibold">
        {t.titre}
      </h2>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="grid grid-cols-3 gap-x-2 text-blue-100 sm:table-row">
            <td className="hidden sm:table-cell" />
            <th scope="col" className="text-right font-medium sm:py-1">
              {t.offre('A')}
            </th>
            <th scope="col" className="text-right font-medium sm:py-1">
              {t.offre('B')}
            </th>
            <th scope="col" className="text-right font-medium sm:py-1">
              {t.ecart}
            </th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne) => (
            <tr
              key={ligne.id}
              className={`grid grid-cols-3 gap-x-2 border-t border-blue-500/50 py-2 sm:table-row sm:py-0 ${ligne.total ? 'text-base font-bold' : ''}`}
            >
              <th scope="row" className="col-span-3 text-left font-normal sm:py-2 sm:pr-2">
                <span className={ligne.total ? 'font-bold' : 'text-blue-100'}>{ligne.libelle}</span>
                {ligne.note && <span className="block text-xs text-blue-200">{ligne.note}</span>}
              </th>
              <td className="text-right tabular-nums sm:py-2">{ligne.a}</td>
              <td className="text-right tabular-nums sm:py-2">{ligne.b}</td>
              <td className="text-right tabular-nums sm:py-2">{ligne.ecart}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {comparaison.gagnante !== null && <p className="mt-3 font-semibold">{resume}</p>}
    </section>
  )
}
```

La phrase de résumé n'est pas affichée quand une offre n'a pas de résultat ; l'écart de la ligne du total montre alors « — », ce qui tient lieu de résumé (spec § 3.2).

- [ ] **Step 5 : Vérifier que tout passe**

Run: `npx vitest run src/components/ComparaisonOffres.test.tsx`, puis `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`
Expected: tout vert (9 nouveaux tests).

- [ ] **Step 6 : Commit**

```bash
git add src/components/ComparaisonOffres.tsx src/components/ComparaisonOffres.test.tsx src/i18n/fr.ts
git commit -m "feat: tableau de comparaison des deux offres"
```

---

### Task 5 : Brancher la comparaison dans l'app

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/FormulaireSituation.tsx`
- Modify: `src/i18n/fr.ts` (compléter le bloc `comparaison`)
- Modify: `src/App.test.tsx` (ajout d'un `describe` à la fin ; les tests existants ne changent pas)
- Modify: `docs/superpowers/specs/2026-09-29-comparaison-offres-design.md` (statut)

**Interfaces:**
- Consumes: tâche 1 (`comparerOffres`, `resumerOffre`, `useCalcul` acceptant `null`), tâche 2 (`useSaisie` et ses nouveaux retours, `IdOffre`), tâche 3 (`OngletsOffres`), tâche 4 (`ComparaisonOffres`).
- Produces : `FormulaireSituation` gagne les props `comparaison: { offreActive: IdOffre; enErreur: Record<IdOffre, boolean> } | null`, `onComparer: () => void`, `onRetirerOffreB: () => void`, `onChoisirOffre: (id: IdOffre) => void`.

- [ ] **Step 1 : Compléter les textes**

Dans le bloc `comparaison` de `src/i18n/fr.ts`, ajouter :

```ts
    comparer: 'Comparer avec une autre offre',
    retirer: 'Retirer l’offre B',
    detailDe: (id: IdOffre) => `Détail de l’offre ${id}`,
```

- [ ] **Step 2 : Écrire les tests d'interface**

Noter d'abord le nombre d'affirmations : `grep -c "expect(" src/App.test.tsx`. Puis, à la fin de `src/App.test.tsx` :

```tsx
describe('App — comparer deux offres', () => {
  function comparaison() {
    return screen.getByRole('region', { name: 'Comparaison des offres' })
  }

  /** Textes des cellules d'une ligne du tableau : offre A, offre B, écart. */
  function cellules(libelle: string) {
    const ligne = within(comparaison()).getByRole('rowheader', { name: new RegExp(`^${libelle}`) }).closest('tr')
    if (!ligne) {
      throw new Error(`Ligne introuvable : ${libelle}`)
    }
    return within(ligne)
      .getAllByRole('cell')
      .map((cellule) => (cellule.textContent ?? '').replace(/\s/g, ' '))
  }

  async function creerOffreB(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Comparer avec une autre offre' }))
  }

  /** Offre B de référence : 3 500 € brut et titres-repas (valeurs du plan). */
  async function remplirOffreB(user: ReturnType<typeof userEvent.setup>) {
    const brut = screen.getByLabelText('Salaire brut mensuel (€)')
    await user.clear(brut)
    await user.type(brut, '3500')
    ouvrirSection(/^Avantages extralégaux/)
    await user.click(screen.getByLabelText('Titres-repas'))
  }

  it('reste à une offre tant qu’on ne demande pas la comparaison', () => {
    render(<App dateIso={DATE} />)
    expect(screen.getByRole('button', { name: 'Comparer avec une autre offre' })).toBeInTheDocument()
    expect(screen.queryByRole('tablist', { name: 'Offres comparées' })).not.toBeInTheDocument()
    expect(recapitulatif()).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Comparaison des offres' })).not.toBeInTheDocument()
  })

  it('crée l’offre B par copie de l’offre A, l’ouvre et montre le tableau', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await creerOffreB(user)
    expect(screen.getByRole('tab', { name: 'Offre B' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Salaire brut mensuel (€)')).toHaveValue('3000')
    expect(screen.queryByRole('region', { name: 'Votre salaire net' })).not.toBeInTheDocument()
    expect(cellules('Net versé')).toEqual([euros(226_133), euros(226_133), euros(0)])
    expect(within(comparaison()).getByText('Les deux offres rapportent autant')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Comparer avec une autre offre' })).not.toBeInTheDocument()
  })

  it('compare l’offre B modifiée à l’offre A, qui ne bouge pas', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await creerOffreB(user)
    await remplirOffreB(user)
    expect(cellules('Brut mensuel')).toEqual([euros(300_000), euros(350_000), `+ ${euros(50_000)}`])
    expect(cellules('Brut annuel')).toEqual([euros(4_176_000), euros(4_872_000), `+ ${euros(696_000)}`])
    expect(cellules('Net versé')).toEqual([euros(226_133), euros(237_860), `+ ${euros(11_727)}`])
    expect(cellules('Net annuel tout compris')).toEqual([euros(2_994_614), euros(3_182_174), `+ ${euros(187_560)}`])
    expect(cellules('Titres-repas')).toEqual([euros(0), euros(20_000), `+ ${euros(20_000)}`])
    expect(cellules('Mobilité')).toEqual([`Voiture · ATN ${euros(0)}/mois`, `Voiture · ATN ${euros(0)}/mois`, ''])
    expect(cellules('Taux de retour')).toEqual(['75,4 %', '68,6 %', ''])
    // 3 182 174 + 12 × 20 000 = 3 422 174 ; écart 3 422 174 − 2 994 614 = 427 560.
    expect(cellules('Total annuel en poche')).toEqual([euros(2_994_614), euros(3_422_174), `+ ${euros(427_560)}`])
    expect(within(comparaison()).getByText(`L’offre B rapporte ${euros(427_560)} de plus par an`)).toBeInTheDocument()
    expect(within(comparaison()).queryByRole('rowheader', { name: /^Écochèques/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Offre A' }))
    expect(screen.getByLabelText('Salaire brut mensuel (€)')).toHaveValue('3000')
    expect(screen.getByLabelText('Titres-repas')).not.toBeChecked()
  })

  it('met la famille à jour dans les deux offres, depuis l’offre B', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await creerOffreB(user)
    await remplirOffreB(user)
    const enfants = screen.getByLabelText('Enfants à charge')
    await user.clear(enfants)
    await user.type(enfants, '2')
    expect(cellules('Net versé')).toEqual([euros(239_933), euros(251_660), `+ ${euros(11_727)}`])
    expect(cellules('Total annuel en poche')).toEqual([euros(3_160_214), euros(3_587_774), `+ ${euros(427_560)}`])
    await user.click(screen.getByRole('tab', { name: 'Offre A' }))
    expect(screen.getByLabelText('Enfants à charge')).toHaveValue(2)
  })

  it('marque l’offre à corriger et montre « — » dans sa colonne', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await creerOffreB(user)
    await user.clear(screen.getByLabelText('Salaire brut mensuel (€)'))
    expect(screen.getByRole('tab', { name: 'Offre B, à corriger' })).toBeInTheDocument()
    expect(cellules('Net versé')).toEqual([euros(226_133), '—', '—'])
    expect(within(comparaison()).queryByText(/rapporte/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Offre A' }))
    expect(screen.getByRole('tab', { name: 'Offre A' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Offre B, à corriger' })).toBeInTheDocument()
  })

  it('retire l’offre B, même à corriger, et rend le récapitulatif de l’offre A', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await creerOffreB(user)
    await user.clear(screen.getByLabelText('Salaire brut mensuel (€)'))
    await user.click(screen.getByRole('button', { name: 'Retirer l’offre B' }))
    expect(screen.queryByRole('tablist', { name: 'Offres comparées' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Salaire brut mensuel (€)')).toHaveValue('3000')
    expect(within(recapitulatif()).getByText(euros(226_133))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comparer avec une autre offre' })).toBeInTheDocument()
  })

  it('montre le détail de l’offre ouverte', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await creerOffreB(user)
    await remplirOffreB(user)
    expect(screen.getByText('Détail de l’offre B')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Détail du calcul' })).getAllByText(euros(350_000)).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('tab', { name: 'Offre A' }))
    expect(screen.getByText('Détail de l’offre A')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Détail du calcul' })).getAllByText(euros(300_000)).length).toBeGreaterThan(0)
  })

  it('se parcourt au clavier', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await creerOffreB(user)
    screen.getByRole('tab', { name: 'Offre B' }).focus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Offre A' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Offre A' })).toHaveAttribute('aria-selected', 'true')
  })

  it('bascule l’offre B en net → brut sans toucher à l’offre A', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await creerOffreB(user)
    await user.click(screen.getByLabelText('Net → brut'))
    expect(screen.getByLabelText('Salaire net mensuel souhaité (€)')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Offre A' }))
    expect(screen.getByLabelText('Brut → net')).toBeChecked()
    expect(screen.getByLabelText('Salaire brut mensuel (€)')).toHaveValue('3000')
  })

  it('montre « — » pour une offre B en net → brut hors limites', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await creerOffreB(user)
    await user.click(screen.getByLabelText('Net → brut'))
    const net = screen.getByLabelText('Salaire net mensuel souhaité (€)')
    await user.clear(net)
    await user.type(net, '80000')
    expect(cellules('Net versé')).toEqual([euros(226_133), '—', '—'])
    expect(cellules('Total annuel en poche')).toEqual([euros(2_994_614), '—', '—'])
  })

  it('retrouve la comparaison et l’offre ouverte au rechargement', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App dateIso={DATE} />)
    await creerOffreB(user)
    await remplirOffreB(user)
    unmount()
    render(<App dateIso={DATE} />)
    expect(screen.getByRole('tab', { name: 'Offre B' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Salaire brut mensuel (€)')).toHaveValue('3500')
    expect(cellules('Net versé')).toEqual([euros(226_133), euros(237_860), `+ ${euros(11_727)}`])
  })
})
```

Vérifier chaque libellé contre `src/i18n/fr.ts` et le DOM réel ; si un libellé diffère, corriger le test, pas `fr.ts`, et le signaler.

- [ ] **Step 3 : Vérifier que ces tests échouent**

Run: `npx vitest run src/App.test.tsx`
Expected: les nouveaux tests échouent (pas de bouton « Comparer avec une autre offre »), les anciens passent.

- [ ] **Step 4 : Brancher le formulaire**

Dans `src/components/FormulaireSituation.tsx` :

1. Imports : ajouter `import type { IdOffre } from '../hooks/useSaisie'` et `import { OngletsOffres } from './OngletsOffres'`.
2. Props : ajouter à l'interface

```ts
  /** Comparaison en cours (offre ouverte, offres à corriger), ou null sans offre B. */
  comparaison: { offreActive: IdOffre; enErreur: Record<IdOffre, boolean> } | null
  onComparer: () => void
  onRetirerOffreB: () => void
  onChoisirOffre: (id: IdOffre) => void
```

et les déstructurer dans la signature du composant.
3. Rendu : placer le `<form>…</form>` actuel, inchangé, dans une constante `const formulaire = (<form …>…</form>)`, puis remplacer le `return` par :

```tsx
  const bouton =
    'rounded-lg border border-blue-700 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-slate-800'
  return (
    <section aria-labelledby="titre-formulaire">
      <h2 id="titre-formulaire" className="sr-only">
        {t.titre}
      </h2>
      {comparaison === null ? (
        <>
          <div className="mb-4 flex justify-end">
            <button type="button" onClick={onComparer} className={bouton}>
              {fr.comparaison.comparer}
            </button>
          </div>
          {formulaire}
        </>
      ) : (
        <OngletsOffres
          active={comparaison.offreActive}
          enErreur={comparaison.enErreur}
          onChoisir={onChoisirOffre}
          actions={
            <button type="button" onClick={onRetirerOffreB} className={bouton}>
              {fr.comparaison.retirer}
            </button>
          }
        >
          {formulaire}
        </OngletsOffres>
      )}
    </section>
  )
```

- [ ] **Step 5 : Brancher l'app**

Dans `src/App.tsx` :

1. Imports : ajouter `import { ComparaisonOffres } from './components/ComparaisonOffres'` et `import { comparerOffres } from './engine/comparaison'` ; remplacer `import { useCalcul } from './hooks/useCalcul'` par `import { resumerOffre, useCalcul } from './hooks/useCalcul'`.
2. Remplacer les deux premières lignes du composant (`useSaisie()` et `useCalcul(saisie, dateIso)`) par :

```tsx
  const { saisie, modifier, basculerSens, basculerPeriode, offreA, offreB, offreActive, ajouterOffreB, retirerOffreB, choisirOffre } = useSaisie()
  const etatA = useCalcul(offreA, dateIso)
  const etatB = useCalcul(offreB, dateIso)
  // Le formulaire, les alertes et le détail portent sur l'offre ouverte (spec comparaison § 3.1).
  const etat = offreActive === 'B' && etatB !== null ? etatB : etatA
  const comparaison =
    offreB !== null && etatB !== null ? comparerOffres(resumerOffre(etatA, offreA.choixMobilite), resumerOffre(etatB, offreB.choixMobilite)) : null
```

Le reste du composant (`ok`, `erreurs`, `netMaxCentimes`, `basculer`, `basculerLaPeriode`, `ongletsResultats`) continue de lire `etat` et `saisie`, qui désignent désormais l'offre ouverte.
3. Passer au formulaire les nouvelles props :

```tsx
              comparaison={
                offreB === null
                  ? null
                  : { offreActive, enErreur: { A: etatA.etat === 'saisieInvalide', B: etatB?.etat === 'saisieInvalide' } }
              }
              onComparer={ajouterOffreB}
              onRetirerOffreB={retirerOffreB}
              onChoisirOffre={choisirOffre}
```

4. Dans la colonne de résultat, remplacer `<Recapitulatif … />` et `<OngletsResultats … />` par :

```tsx
            {comparaison ? (
              <ComparaisonOffres comparaison={comparaison} />
            ) : (
              <Recapitulatif
                sens={saisie.sens}
                complet={ok?.complet ?? null}
                brutCentimes={ok?.brutCentimes ?? null}
                netCibleCentimes={ok?.netCibleCentimes ?? null}
                avantagesActifs={etat.avantagesActifs}
                annuel={ok?.annuel ?? null}
              />
            )}
            {comparaison && <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{fr.comparaison.detailDe(offreActive)}</p>}
            <OngletsResultats onglets={ongletsResultats} />
```

- [ ] **Step 6 : Vérifier que tout passe**

Run: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`
Expected: tout vert ; **aucun test existant modifié** ; `grep -c "expect(" src/App.test.tsx` n'a pas baissé.

- [ ] **Step 7 : Mettre à jour la spec**

Dans `docs/superpowers/specs/2026-09-29-comparaison-offres-design.md`, passer le statut à « appliquée ».

- [ ] **Step 8 : Commit**

```bash
git add src/App.tsx src/components/FormulaireSituation.tsx src/i18n/fr.ts src/App.test.tsx docs/superpowers/specs/2026-09-29-comparaison-offres-design.md
git commit -m "feat: comparer deux offres dans l’app"
```

---

## Après les tâches

- Relecture de toute la branche (modèle le plus capable).
- Vérification visuelle réelle : `npm run dev`, à 1 440 px puis 390 px, avec une offre B remplie ; arrêter le serveur ensuite.
- Push et merge seulement à la demande de l'utilisateur.
