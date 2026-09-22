# Voiture de société (V2.4) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** calculer l'avantage de toute nature (ATN) d'une voiture de société depuis ses caractéristiques, à côté de la saisie manuelle existante, avec la contribution personnelle du travailleur.

**Architecture :** un module pur `src/engine/atnVoiture.ts` résout l'ATN (montant saisi ou formule de l'art. 36 § 2 CIR 92) et la contribution. L'ATN et la contribution voyagent dans `Avantages.atn` ; `remuneration.ts` résout l'ATN avant d'appeler `calculerNet` / `calculerBrut`, qui ne changent pas, et retire la contribution du net versé. L'ATN ne dépend pas du brut : la recherche net → brut garde sa garantie, désormais mesurée à trois niveaux d'ATN.

**Tech Stack :** React 19, TypeScript 6 strict, Vite 8, Tailwind CSS 4, Vitest 4 + jsdom + React Testing Library, oxlint, Node 25, Python 3 (script de référence).

**Spec :** `docs/superpowers/specs/2026-09-22-voiture-societe-design.md`. La lire avant de commencer, surtout § 1 (règle d'or), § 2 (sources), § 3 (moteur) et § 5 (interface).

## Global Constraints

- Montants en **centimes entiers**, taux en **dix-millièmes entiers**. Aucune virgule flottante dans un calcul d'argent.
- Arrondi : `diviserArrondi` de `src/engine/argent.ts` (moitié exacte vers l'extérieur de zéro). **Un seul arrondi** pour l'ATN annuel, puis un pour le mensuel (spec § 3.1).
- Valeurs annuelles 2026 : émissions de référence **70 g/km** (essence, LPG, gaz naturel) et **58 g/km** (diesel), minimum **1 690 €/an** ; 2025 : **71 g/km**, **59 g/km**, **1 650 €/an**.
- Constantes de loi : 5,5 % aux émissions de référence, ±0,1 % par gramme, bornes **4 %** et **18 %**, électrique **4 %**, facteur **6/7**, coefficients d'âge **100 / 94 / 88 / 82 / 76 / 70 %** par tranche de 12 mois.
- Convention d'âge : **tout mois commencé compte ; le mois de la première immatriculation est le mois 1** (spec § 3.1, confirmée ou infirmée par la tâche 1).
- Valeur catalogue : **0 < valeur ≤ 770 000,00 €** (`VALEUR_CATALOGUE_MAX_CENTIMES = 77_000_000`). Dans cette borne, le plus grand produit (77 000 000 × 10 000 × 6 × 1 800 = 8,316 × 10¹⁵) reste sous 2⁵³ : le calcul entier en `number` est exact. **Écart assumé par rapport à la spec § 3.1.4** : pas de `BigInt`, le module refuse au-delà de la borne.
- La contribution réduit l'ATN imposable (plancher 0) et est retenue **en entier** sur le net versé.
- Tous les textes affichés vivent dans `src/i18n/fr.ts`. Français, apostrophe typographique (’) dans `fr.ts`, comme le fichier existant.
- Fichiers en UTF-8, fins de ligne **LF** (`git ls-files --eol` doit montrer `w/lf`).
- Aucune nouvelle dépendance npm ou Python.
- Un commit par tâche, message en français, terminé par une ligne vide puis `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Jamais de push ni de merge.
- Avant chaque commit : `npm test`, `npm run typecheck`, `npm run lint` verts.
- Règle d'or : aucune valeur ajustée pour faire tomber un exemple juste. Un écart se documente.

---

## Carte des fichiers

| Fichier | Responsabilité | Tâche |
|---|---|---|
| `src/engine/parametres/types.ts`, `p2025.ts`, `p2026-07.ts` | bloc `voiture` (valeurs annuelles) ; `p2026-09.ts` en hérite par `...P2026_07` | 1 |
| `src/engine/__tests__/situations.ts` | `NIVEAUX_ATN_MESURES_CENTIMES` | 1 |
| `tools/verification/reculMax.ts`, `src/engine/__tests__/reculMax.json`, `reculMax.test.ts` | recul mesuré à trois niveaux d'ATN | 1 |
| `src/engine/atnVoiture.ts` (+ test) | formule de l'ATN, contribution, résolution | 2 |
| `tools/reference/reference.py`, `src/engine/__tests__/referencesVoiture.json` (+ test) | oracle Python indépendant ; `references.json` réécrit en LF | 3 |
| `src/engine/__tests__/exemplesVoiturePublies.json` (+ test) | exemples publiés, s'ils sont complets | 3 |
| `src/engine/avantages.ts`, `remuneration.ts` | `Avantages.atn`, résolution, contribution dans le net versé | 4 |
| `src/engine/validation.ts` | adaptation minimale (tâche 4), puis saisie voiture complète (tâche 5) | 4, 5 |
| `src/engine/__tests__/fichesReelles.json` (+ test) | l'ATN des fiches passe dans `avantages.atn` | 4 |
| `src/hooks/useSaisie.ts`, `useCalcul.ts` | saisie v4, reprise, date passée à la validation | 5 |
| `src/utils/format.ts` | `formatDixMilliemes` | 6 |
| `src/components/FormulaireSituation.tsx`, `DetailCalcul.tsx`, `Recapitulatif.tsx`, `App.tsx` | interface | 6 |
| `src/i18n/fr.ts` | textes | 5, 6 |
| `README.md`, spec | documentation | 1, 6 |

Écart assumé par rapport à la spec § 7 : `IdLigne` ne gagne pas `contributionVoiture`. Les lignes d'avantages du détail ne sont pas des `IdLigne` : elles viennent de `fr.lignesAvantages`, comme les frais propres.

---

### Task 1 : paramètres de la voiture, sources et recul mesuré à trois niveaux d'ATN

**Files:**
- Modify: `src/engine/parametres/types.ts`, `src/engine/parametres/p2025.ts`, `src/engine/parametres/p2026-07.ts`
- Modify: `src/engine/parametres/parametres.test.ts`
- Modify: `src/engine/__tests__/situations.ts`, `src/engine/__tests__/reculMax.test.ts`
- Modify: `tools/verification/reculMax.ts`
- Regenerate: `src/engine/__tests__/reculMax.json` (par l'outil, jamais à la main)
- Modify: `src/engine/calculerBrut.ts` (JSDoc), `README.md` (deux phrases sur le recul)
- Modify: `docs/superpowers/specs/2026-09-22-voiture-societe-design.md` (§ 2, colonne « Statut » ; § 3.1 point 2)

**Interfaces:**
- Produces : `interface ParametresVoiture { emissionReferenceEssenceGrammesKm: number; emissionReferenceDieselGrammesKm: number; atnMinimumAnnuelCentimes: number }` et `Parametres.voiture: ParametresVoiture`.
- Produces : `NIVEAUX_ATN_MESURES_CENTIMES = [0, 30_000, 100_000] as const` exporté par `src/engine/__tests__/situations.ts`.
- Produces : `reculMax.json` gagne `niveauxAtnCentimes: number[]`.

- [ ] **Step 1 : relever les sources officielles**

Cherche le texte officiel de chacun des éléments ci-dessous et note, pour chacun, la citation exacte et sa référence (URL, date de publication au Moniteur belge, numéro de circulaire). Sources à privilégier : Fisconetplus (SPF Finances), Moniteur belge (ejustice.just.fgov.be), FAQ du SPF Finances sur les voitures de société.

1. art. 36 § 2 CIR 92 : la formule (6/7, pourcentage CO₂ de 5,5 % ± 0,1 %/g, bornes 4 % et 18 %), le coefficient d'âge et la **manière de compter les mois** depuis la première immatriculation, la déduction de l'intervention du bénéficiaire ;
2. l'arrêté royal fixant les émissions de référence **2026** (attendu : 70 g et 58 g) et **2025** (attendu : 71 g et 59 g) ;
3. le montant minimum annuel **2026** (attendu : 1 690 €) et **2025** (attendu : 1 650 €).

Règles de décision :
- valeur officielle trouvée et **égale** à la valeur attendue → la citer dans le commentaire du paramètre et dans le § 2 de la spec (« confirmé : <référence> ») ;
- valeur officielle **introuvable** → garder la valeur attendue, écrire « source secondaire : Attentia, actualité ATN 2026 ; texte officiel non trouvé » dans le commentaire et le § 2 ; pour le minimum 2026, garder « sous réserve » ;
- valeur officielle **différente** de la valeur attendue, ou convention de comptage des mois **contraire** à « le mois d'immatriculation est le mois 1 » → **ne rien écrire dans le code**, t'arrêter et renvoyer le statut BLOCKED avec la citation. Le contrôleur tranchera.

- [ ] **Step 2 : écrire le test des paramètres (il doit échouer)**

Ajoute à la fin de `src/engine/parametres/parametres.test.ts` :

```ts
describe('paramètres de la voiture de société', () => {
  it.each([
    ['2025-09-14', 71, 59, 165_000],
    ['2026-07-01', 70, 58, 169_000],
    ['2026-09-14', 70, 58, 169_000],
  ])('le %s : références %i g (essence) et %i g (diesel), minimum %i centimes', (date, essence, diesel, minimum) => {
    expect(getParametres(date).voiture).toEqual({
      emissionReferenceEssenceGrammesKm: essence,
      emissionReferenceDieselGrammesKm: diesel,
      atnMinimumAnnuelCentimes: minimum,
    })
  })
})
```

Run : `npx vitest run src/engine/parametres/parametres.test.ts`
Expected : FAIL (`voiture` est `undefined`).

- [ ] **Step 3 : ajouter le type et les valeurs**

Dans `src/engine/parametres/types.ts`, avant `export interface Parametres` :

```ts
/** Voiture de société (art. 36 § 2 CIR 92) : les valeurs qui changent chaque année. */
export interface ParametresVoiture {
  /** Émissions de CO₂ de référence, essence, LPG et gaz naturel (g/km). */
  emissionReferenceEssenceGrammesKm: number
  /** Émissions de CO₂ de référence, diesel (g/km). */
  emissionReferenceDieselGrammesKm: number
  /** ATN minimum annuel, montant indexé. */
  atnMinimumAnnuelCentimes: number
}
```

et dans `interface Parametres`, juste avant `rmmmgCentimes: number` :

```ts
  voiture: ParametresVoiture
```

Dans `src/engine/parametres/p2026-07.ts`, juste avant le commentaire `// SECUREX-RMMMG` :

```ts
  // Voiture de société, revenus 2026 : émissions de référence 70 g/km (essence, LPG, gaz naturel)
  // et 58 g/km (diesel) ; ATN minimum 1 690 €/an. <référence relevée à l'étape 1>
  voiture: { emissionReferenceEssenceGrammesKm: 70, emissionReferenceDieselGrammesKm: 58, atnMinimumAnnuelCentimes: 169_000 },
```

Dans `src/engine/parametres/p2025.ts`, juste avant le commentaire `// Salaire minimum` :

```ts
  // Voiture de société, revenus 2025 : émissions de référence 71 g/km (essence, LPG, gaz naturel)
  // et 59 g/km (diesel) ; ATN minimum 1 650 €/an. <référence relevée à l'étape 1>
  voiture: { emissionReferenceEssenceGrammesKm: 71, emissionReferenceDieselGrammesKm: 59, atnMinimumAnnuelCentimes: 165_000 },
```

Remplace chaque `<référence relevée à l'étape 1>` par la référence trouvée, ou par la mention « source secondaire » prévue à l'étape 1. `p2026-09.ts` n'a rien à changer : il reprend `...P2026_07`.

Run : `npx vitest run src/engine/parametres/parametres.test.ts`
Expected : PASS.

- [ ] **Step 4 : déclarer les niveaux d'ATN mesurés et le test de garde**

À la fin de `src/engine/__tests__/situations.ts` :

```ts
/**
 * Niveaux d'ATN mensuel auxquels tools/verification/reculMax.ts mesure le recul du net
 * (spec voiture § 6) : sans avantage, une voiture moyenne, une voiture haut de gamme.
 */
export const NIVEAUX_ATN_MESURES_CENTIMES = [0, 30_000, 100_000] as const
```

Dans `src/engine/__tests__/reculMax.test.ts`, remplace l'import de `./situations` par :

```ts
import { NIVEAUX_ATN_MESURES_CENTIMES, SITUATIONS_FAMILIALES } from './situations'
```

et ajoute, après le test « couvre toutes les situations et tout le domaine du brut » :

```ts
  it('couvre chaque niveau d’ATN mesuré', () => {
    expect(mesure.niveauxAtnCentimes).toEqual([...NIVEAUX_ATN_MESURES_CENTIMES])
  })
```

- [ ] **Step 5 : faire mesurer l'outil à chaque niveau**

Dans `tools/verification/reculMax.ts` :

1. l'import de `situations.ts` devient :
```ts
import { NIVEAUX_ATN_MESURES_CENTIMES, SITUATIONS_FAMILIALES } from '../../src/engine/__tests__/situations.ts'
```
2. `interface Tache` gagne un champ :
```ts
interface Tache {
  periodeId: string
  dateIso: string
  indexSituation: number
  atnCentimes: number
}
```
3. dans `mesurer`, la première ligne devient :
```ts
  const famille = { ...SITUATIONS_FAMILIALES[tache.indexSituation], atnMensuelCentimes: tache.atnCentimes }
```
4. dans `principal`, la construction des tâches et le message deviennent :
```ts
  const taches: Tache[] = PERIODES.flatMap((periode) =>
    SITUATIONS_FAMILIALES.flatMap((_, indexSituation) =>
      NIVEAUX_ATN_MESURES_CENTIMES.map((atnCentimes) => ({ periodeId: periode.id, dateIso: periode.valideDu, indexSituation, atnCentimes })),
    ),
  )
  const total = taches.length
  const mesures: Mesure[] = []
  const nbThreads = Math.min(availableParallelism(), total)
  const debut = Date.now()
  console.log(
    `${total} mesures (${PERIODES.length} périodes × ${SITUATIONS_FAMILIALES.length} situations × ${NIVEAUX_ATN_MESURES_CENTIMES.length} niveaux d’ATN) sur ${nbThreads} threads…`,
  )
```
5. le message de progression cite le niveau :
```ts
            console.log(
              `  ${mesures.length}/${total} — ${mesure.periodeId}, situation ${mesure.indexSituation}, ATN ${mesure.atnCentimes} c : ${mesure.reculMaxCentimes} c`,
            )
```
6. dans la boucle `for (const periode of PERIODES)`, le champ `situation` garde le niveau du pire cas :
```ts
      situation: { ...SITUATIONS_FAMILIALES[pire.indexSituation], atnMensuelCentimes: pire.atnCentimes },
```
7. `contenu` gagne la liste des niveaux, juste après `empreinteSituations` :
```ts
    niveauxAtnCentimes: [...NIVEAUX_ATN_MESURES_CENTIMES],
```
8. le commentaire d'en-tête de l'outil devient :
```ts
/**
 * Mesure le recul maximal du net quand le brut augmente, pour chaque période de paramètres,
 * sur toutes les situations couvertes, trois niveaux d'ATN et tous les bruts de 0,01 € à 100 000 €.
 * calculerBrut n'est exact que si ce recul reste ≤ MARGE_RECUL_CENTIMES (spec net → brut § 3.2).
 *
 * Usage : npm run verifier:recul   (une quinzaine de minutes, un thread par cœur)
 * Écrit : src/engine/__tests__/reculMax.json
 */
```

- [ ] **Step 6 : vérifier que la garde échoue avant la mesure**

Run : `npx vitest run src/engine/__tests__/reculMax.test.ts`
Expected : FAIL sur « couvre chaque niveau d’ATN mesuré » et sur les empreintes des trois périodes (les paramètres ont changé). C'est attendu.

- [ ] **Step 7 : lancer la mesure**

Run, **en arrière-plan** (paramètre `run_in_background` de l'outil Bash : la mesure dure une quinzaine de minutes, plus que le délai maximal d'une commande) : `npm run verifier:recul`

Attends la notification de fin, puis lis la fin de la sortie.
Expected : « Terminé en … s. » et, pour chaque période, `reculMaxCentimes` ≤ 1000. Référence : 514 c à ATN nul, 515 c en ponctuel jusqu'à 10 000 €/mois. Si une période dépasse 1000, **ne commite pas** : renvoie BLOCKED avec la sortie.

- [ ] **Step 8 : mettre la documentation à jour**

Dans `src/engine/calculerBrut.ts`, remplace le paragraphe qui commence par ` * Le recul G est mesuré sans avantage de toute nature` (trois lignes) par :

```ts
 * Le recul G est mesuré à trois niveaux d'avantage de toute nature (0, 300 et 1 000 €/mois,
 * NIVEAUX_ATN_MESURES_CENTIMES) ; la dernière mesure est dans src/engine/__tests__/reculMax.json.
```

Dans `README.md`, la cellule de la ligne `npm run verifier:recul` du tableau des scripts devient :

```
mesure le recul maximal du net sur toutes les situations, tous les bruts au centime et trois niveaux d'avantage de toute nature (0, 300 et 1 000 €/mois) ; à relancer après tout changement de paramètres
```

et, dans la puce « Net → brut », la phrase « `npm run verifier:recul` le mesure sur toutes les situations et tous les bruts au centime, et un test échoue si la mesure manque ou dépasse la marge. » devient :

```
`npm run verifier:recul` le mesure sur toutes les situations, tous les bruts au centime et trois niveaux d'avantage de toute nature, et un test échoue si la mesure manque ou dépasse la marge.
```

Dans la spec, § 2, remplace chaque cellule « Statut » par le résultat de l'étape 1, et au § 3.1 point 2, remplace la phrase « La convention exacte (…) est fixée par la tâche 1 sur le texte officiel, puis figée par un test à chaque frontière. » par la convention confirmée et sa référence.

- [ ] **Step 9 : vérifier et commiter**

Run : `npm test`, `npm run typecheck`, `npm run lint`
Expected : tout vert.

```bash
git add src/engine/parametres tools/verification/reculMax.ts src/engine/__tests__/situations.ts src/engine/__tests__/reculMax.test.ts src/engine/__tests__/reculMax.json src/engine/calculerBrut.ts README.md docs/superpowers/specs/2026-09-22-voiture-societe-design.md
git commit -F - <<'EOF'
feat: paramètres de la voiture de société et recul mesuré à trois niveaux d'ATN

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 2 : module `atnVoiture` (formule, contribution, résolution)

**Files:**
- Create: `src/engine/atnVoiture.ts`
- Test: `src/engine/atnVoiture.test.ts`

**Interfaces:**
- Consumes : `Parametres.voiture` (tâche 1) ; `diviserArrondi(numerateur: number, diviseur: number): number` de `./argent`.
- Produces (utilisés par les tâches 3 à 6) :

```ts
export const CARBURANTS = ['essence', 'diesel', 'electrique'] as const
export type Carburant = (typeof CARBURANTS)[number]
export interface Voiture { carburant: Carburant; valeurCatalogueCentimes: number; co2GrammesKm: number; premiereImmatriculation: string }
export type SourceAtn = { mode: 'montant'; montantMensuelCentimes: number } | { mode: 'voiture'; voiture: Voiture }
export interface AtnSaisi { source: SourceAtn; contributionMensuelleCentimes: number }
export const ATN_AUCUN: AtnSaisi
export const VALEUR_CATALOGUE_MAX_CENTIMES = 77_000_000
export interface ResultatAtnVoiture { valeurCatalogueCentimes: number; pourcentageCo2DixMilliemes: number; coefficientAgeDixMilliemes: number; moisEcoules: number; annuelFormuleCentimes: number; minimumAppliqueCentimes: number | null; annuelCentimes: number; mensuelCentimes: number }
export interface ResolutionAtn { mode: 'montant' | 'voiture'; avantContributionCentimes: number; contributionCentimes: number; imposableCentimes: number; voiture: ResultatAtnVoiture | null }
export function moisEcoulesDepuis(premiereImmatriculation: string, dateIso: string): number
export function coefficientAge(moisEcoules: number): number
export function calculerAtnVoiture(voiture: Voiture, dateIso: string, parametres: Parametres): ResultatAtnVoiture
export function resoudreAtn(atn: AtnSaisi, dateIso: string, parametres: Parametres): ResolutionAtn
```

`ResultatAtnVoiture.valeurCatalogueCentimes` rappelle la valeur saisie : l'explication du détail (tâche 6) en a besoin.

Toutes les valeurs attendues ci-dessous ont été calculées en fractions exactes. Exemple : 4 500 000 × 9 400 × 6 × 880 / 7·10⁸ = 319 062,86 → 319 063 ; 319 063 / 12 = 26 588,58 → 26 589.

- [ ] **Step 1 : écrire les tests (ils doivent échouer)**

Crée `src/engine/atnVoiture.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import {
  ATN_AUCUN,
  calculerAtnVoiture,
  coefficientAge,
  moisEcoulesDepuis,
  resoudreAtn,
  VALEUR_CATALOGUE_MAX_CENTIMES,
  type Voiture,
} from './atnVoiture'
import { getParametres } from './parametres'

const SEPT_2026 = '2026-09-14'
const SEPT_2025 = '2025-09-14'
const P2026 = getParametres(SEPT_2026)
const P2025 = getParametres(SEPT_2025)

/** L'exemple de contrôle de la spec § 3.1 : 20 mois en septembre 2026. */
const ESSENCE_CONTROLE: Voiture = {
  carburant: 'essence',
  valeurCatalogueCentimes: 4_500_000,
  co2GrammesKm: 103,
  premiereImmatriculation: '2025-02',
}

const ELECTRIQUE_ANCIENNE: Voiture = {
  carburant: 'electrique',
  valeurCatalogueCentimes: 6_000_000,
  co2GrammesKm: 150,
  premiereImmatriculation: '2020-01',
}

describe('moisEcoulesDepuis', () => {
  it('compte le mois de la première immatriculation comme le mois 1', () => {
    expect(moisEcoulesDepuis('2026-09', SEPT_2026)).toBe(1)
    expect(moisEcoulesDepuis('2025-10', SEPT_2026)).toBe(12)
    expect(moisEcoulesDepuis('2025-09', SEPT_2026)).toBe(13)
    expect(moisEcoulesDepuis('2025-02', SEPT_2026)).toBe(20)
  })

  it('refuse une immatriculation postérieure au mois calculé', () => {
    expect(() => moisEcoulesDepuis('2026-10', SEPT_2026)).toThrow(RangeError)
  })

  it.each(['2026-13', '2026-00', '26-09', '2026-9', ''])('refuse le mois mal formé « %s »', (mois) => {
    expect(() => moisEcoulesDepuis(mois, SEPT_2026)).toThrow(RangeError)
  })
})

describe('coefficientAge', () => {
  it.each([
    [1, 10_000],
    [12, 10_000],
    [13, 9_400],
    [24, 9_400],
    [25, 8_800],
    [36, 8_800],
    [37, 8_200],
    [48, 8_200],
    [49, 7_600],
    [60, 7_600],
    [61, 7_000],
    [200, 7_000],
  ])('%i mois → %i dix-millièmes', (mois, coefficient) => {
    expect(coefficientAge(mois)).toBe(coefficient)
  })
})

describe('calculerAtnVoiture', () => {
  it('reproduit l’exemple de contrôle de la spec : 3 190,63 €/an, 265,89 €/mois', () => {
    expect(calculerAtnVoiture(ESSENCE_CONTROLE, SEPT_2026, P2026)).toEqual({
      valeurCatalogueCentimes: 4_500_000,
      pourcentageCo2DixMilliemes: 880,
      coefficientAgeDixMilliemes: 9_400,
      moisEcoules: 20,
      annuelFormuleCentimes: 319_063,
      minimumAppliqueCentimes: null,
      annuelCentimes: 319_063,
      mensuelCentimes: 26_589,
    })
  })

  it('diesel : utilise la référence diesel (58 g en 2026)', () => {
    const r = calculerAtnVoiture(
      { carburant: 'diesel', valeurCatalogueCentimes: 3_500_000, co2GrammesKm: 120, premiereImmatriculation: '2026-09' },
      SEPT_2026,
      P2026,
    )
    expect(r).toMatchObject({ pourcentageCo2DixMilliemes: 1_170, coefficientAgeDixMilliemes: 10_000, annuelCentimes: 351_000, mensuelCentimes: 29_250 })
  })

  it('aux émissions de référence : 5,5 %', () => {
    const r = calculerAtnVoiture(
      { carburant: 'diesel', valeurCatalogueCentimes: 4_500_000, co2GrammesKm: 58, premiereImmatriculation: '2026-09' },
      SEPT_2026,
      P2026,
    )
    expect(r).toMatchObject({ pourcentageCo2DixMilliemes: 550, annuelCentimes: 212_143, mensuelCentimes: 17_679 })
  })

  it('borne le pourcentage à 18 %', () => {
    const r = calculerAtnVoiture({ ...ESSENCE_CONTROLE, co2GrammesKm: 250, premiereImmatriculation: '2026-09' }, SEPT_2026, P2026)
    expect(r).toMatchObject({ pourcentageCo2DixMilliemes: 1_800, annuelCentimes: 694_286, mensuelCentimes: 57_857 })
  })

  it('borne le pourcentage à 4 %, et le minimum annuel prend alors le relais', () => {
    const r = calculerAtnVoiture({ ...ESSENCE_CONTROLE, co2GrammesKm: 20, premiereImmatriculation: '2026-09' }, SEPT_2026, P2026)
    expect(r).toEqual({
      valeurCatalogueCentimes: 4_500_000,
      pourcentageCo2DixMilliemes: 400,
      coefficientAgeDixMilliemes: 10_000,
      moisEcoules: 1,
      annuelFormuleCentimes: 154_286,
      minimumAppliqueCentimes: 169_000,
      annuelCentimes: 169_000,
      mensuelCentimes: 14_083,
    })
  })

  it('électrique : 4 % quel que soit le CO₂ saisi', () => {
    expect(calculerAtnVoiture(ELECTRIQUE_ANCIENNE, SEPT_2026, P2026)).toEqual({
      valeurCatalogueCentimes: 6_000_000,
      pourcentageCo2DixMilliemes: 400,
      coefficientAgeDixMilliemes: 7_000,
      moisEcoules: 81,
      annuelFormuleCentimes: 144_000,
      minimumAppliqueCentimes: 169_000,
      annuelCentimes: 169_000,
      mensuelCentimes: 14_083,
    })
  })

  it('le minimum suit la période : 1 650 € en 2025', () => {
    expect(calculerAtnVoiture(ELECTRIQUE_ANCIENNE, SEPT_2025, P2025)).toMatchObject({
      moisEcoules: 69,
      minimumAppliqueCentimes: 165_000,
      annuelCentimes: 165_000,
      mensuelCentimes: 13_750,
    })
  })

  it('la même voiture neuve coûte un peu plus en 2026 qu’en 2025 : la référence a baissé d’un gramme', () => {
    const neuve2026 = calculerAtnVoiture({ ...ESSENCE_CONTROLE, premiereImmatriculation: '2026-09' }, SEPT_2026, P2026)
    const neuve2025 = calculerAtnVoiture({ ...ESSENCE_CONTROLE, premiereImmatriculation: '2025-09' }, SEPT_2025, P2025)
    expect(neuve2026).toMatchObject({ pourcentageCo2DixMilliemes: 880, annuelCentimes: 339_429, mensuelCentimes: 28_286 })
    expect(neuve2025).toMatchObject({ pourcentageCo2DixMilliemes: 870, annuelCentimes: 335_571, mensuelCentimes: 27_964 })
  })

  it.each([
    ['2025-10', 10_000],
    ['2025-09', 9_400],
    ['2024-10', 9_400],
    ['2024-09', 8_800],
    ['2023-10', 8_800],
    ['2023-09', 8_200],
    ['2022-10', 8_200],
    ['2022-09', 7_600],
    ['2021-10', 7_600],
    ['2021-09', 7_000],
  ])('immatriculée en %s, calculée en septembre 2026 → coefficient %i', (premiereImmatriculation, coefficient) => {
    const r = calculerAtnVoiture({ ...ESSENCE_CONTROLE, premiereImmatriculation }, SEPT_2026, P2026)
    expect(r.coefficientAgeDixMilliemes).toBe(coefficient)
  })

  it('reste exacte à la valeur catalogue maximale', () => {
    const r = calculerAtnVoiture(
      { carburant: 'essence', valeurCatalogueCentimes: VALEUR_CATALOGUE_MAX_CENTIMES, co2GrammesKm: 250, premiereImmatriculation: '2026-09' },
      SEPT_2026,
      P2026,
    )
    expect(r).toMatchObject({ annuelFormuleCentimes: 11_880_000, mensuelCentimes: 990_000 })
  })

  it.each([0, -1, VALEUR_CATALOGUE_MAX_CENTIMES + 1, 1.5])('refuse la valeur catalogue %d', (valeurCatalogueCentimes) => {
    expect(() => calculerAtnVoiture({ ...ESSENCE_CONTROLE, valeurCatalogueCentimes }, SEPT_2026, P2026)).toThrow(RangeError)
  })

  it.each([-1, 10.5])('refuse les émissions %d pour une voiture thermique', (co2GrammesKm) => {
    expect(() => calculerAtnVoiture({ ...ESSENCE_CONTROLE, co2GrammesKm }, SEPT_2026, P2026)).toThrow(RangeError)
  })
})

describe('resoudreAtn', () => {
  it('sans voiture ni montant : tout vaut zéro', () => {
    expect(resoudreAtn(ATN_AUCUN, SEPT_2026, P2026)).toEqual({
      mode: 'montant',
      avantContributionCentimes: 0,
      contributionCentimes: 0,
      imposableCentimes: 0,
      voiture: null,
    })
  })

  it('montant saisi : la contribution le réduit', () => {
    const r = resoudreAtn({ source: { mode: 'montant', montantMensuelCentimes: 27_017 }, contributionMensuelleCentimes: 5_000 }, SEPT_2026, P2026)
    expect(r).toEqual({ mode: 'montant', avantContributionCentimes: 27_017, contributionCentimes: 5_000, imposableCentimes: 22_017, voiture: null })
  })

  it('voiture : l’ATN de la formule, moins la contribution', () => {
    const r = resoudreAtn({ source: { mode: 'voiture', voiture: ESSENCE_CONTROLE }, contributionMensuelleCentimes: 6_589 }, SEPT_2026, P2026)
    expect(r).toMatchObject({ mode: 'voiture', avantContributionCentimes: 26_589, contributionCentimes: 6_589, imposableCentimes: 20_000 })
    expect(r.voiture?.mensuelCentimes).toBe(26_589)
  })

  it('une contribution supérieure à l’ATN ramène l’imposable à zéro, sans négatif', () => {
    const r = resoudreAtn({ source: { mode: 'montant', montantMensuelCentimes: 10_000 }, contributionMensuelleCentimes: 30_000 }, SEPT_2026, P2026)
    expect(r).toMatchObject({ avantContributionCentimes: 10_000, contributionCentimes: 30_000, imposableCentimes: 0 })
  })
})
```

Run : `npx vitest run src/engine/atnVoiture.test.ts`
Expected : FAIL (module introuvable).

- [ ] **Step 2 : écrire le module**

Crée `src/engine/atnVoiture.ts` :

```ts
import { diviserArrondi } from './argent'
import type { Parametres } from './parametres/types'

/** Carburants distingués par la loi : l'essence, le LPG et le gaz naturel partagent la même référence. */
export const CARBURANTS = ['essence', 'diesel', 'electrique'] as const
export type Carburant = (typeof CARBURANTS)[number]

/** Voiture de société, déjà validée (spec voiture § 3.1). */
export interface Voiture {
  carburant: Carburant
  /** Prix catalogue à l'état neuf, options et TVA réellement payée comprises, remises exclues. */
  valeurCatalogueCentimes: number
  /** Ignoré pour l'électrique. Hybride : valeur de la fiche de conformité. */
  co2GrammesKm: number
  /** AAAA-MM de la première immatriculation. */
  premiereImmatriculation: string
}

/** D'où vient l'ATN : un montant repris d'une fiche de paie, ou le calcul depuis la voiture. */
export type SourceAtn = { mode: 'montant'; montantMensuelCentimes: number } | { mode: 'voiture'; voiture: Voiture }

/** ATN et contribution personnelle, tels que validés (spec voiture § 3.2). */
export interface AtnSaisi {
  source: SourceAtn
  /** Retenue de l'employeur pour l'usage privé : réduit l'ATN, se retire du net versé. */
  contributionMensuelleCentimes: number
}

export const ATN_AUCUN: AtnSaisi = {
  source: { mode: 'montant', montantMensuelCentimes: 0 },
  contributionMensuelleCentimes: 0,
}

export interface ResultatAtnVoiture {
  /** Rappel de la valeur saisie, pour l'explication. */
  valeurCatalogueCentimes: number
  pourcentageCo2DixMilliemes: number
  coefficientAgeDixMilliemes: number
  moisEcoules: number
  /** valeur × âge × 6/7 × pourcentage, arrondi une seule fois. */
  annuelFormuleCentimes: number
  /** Le minimum légal quand il dépasse la formule, sinon null. */
  minimumAppliqueCentimes: number | null
  annuelCentimes: number
  mensuelCentimes: number
}

export interface ResolutionAtn {
  mode: SourceAtn['mode']
  /** Montant saisi, ou mensuel de la formule. */
  avantContributionCentimes: number
  contributionCentimes: number
  /** max(0, avant − contribution) : ce qui entre dans la base du précompte. */
  imposableCentimes: number
  /** Détail de la formule ; null en mode montant. */
  voiture: ResultatAtnVoiture | null
}

/**
 * Valeur catalogue maximale. Au pire (18 %, coefficient d'âge 100 %), 770 000 € donnent 9 900 €/mois,
 * sous le plafond de saisie manuelle de 10 000 €/mois. Le produit du calcul reste alors sous 2^53
 * (77 000 000 × 10 000 × 6 × 1 800 = 8,316 × 10^15) : l'arithmétique entière est exacte.
 */
export const VALEUR_CATALOGUE_MAX_CENTIMES = 77_000_000

// Art. 36 § 2 CIR 92 : 5,5 % aux émissions de référence, ± 0,1 % par gramme, entre 4 % et 18 %.
const POURCENTAGE_REFERENCE = 550
const POURCENTAGE_PAR_GRAMME = 10
const POURCENTAGE_MIN = 400
const POURCENTAGE_MAX = 1_800

// Art. 36 § 2 CIR 92 : la valeur catalogue perd 6 % par période de 12 mois, jusqu'à 70 %.
const TRANCHES_AGE: readonly (readonly [moisMax: number, coefficient: number])[] = [
  [12, 10_000],
  [24, 9_400],
  [36, 8_800],
  [48, 8_200],
  [60, 7_600],
]
const COEFFICIENT_AGE_MIN = 7_000

const MOIS_ISO = /^(\d{4})-(0[1-9]|1[0-2])$/

function indexMois(mois: string): number {
  const correspondance = MOIS_ISO.exec(mois)
  if (!correspondance) {
    throw new RangeError(`Mois attendu au format AAAA-MM : « ${mois} »`)
  }
  return Number(correspondance[1]) * 12 + Number(correspondance[2]) - 1
}

/**
 * Mois écoulés depuis la première immatriculation, pour le coefficient d'âge. Tout mois commencé
 * compte : le mois de l'immatriculation est le mois 1 (spec voiture § 3.1).
 */
export function moisEcoulesDepuis(premiereImmatriculation: string, dateIso: string): number {
  const ecart = indexMois(dateIso.slice(0, 7)) - indexMois(premiereImmatriculation)
  if (ecart < 0) {
    throw new RangeError(`Première immatriculation ${premiereImmatriculation} postérieure au mois calculé ${dateIso.slice(0, 7)}`)
  }
  return ecart + 1
}

/** Coefficient d'âge en dix-millièmes. */
export function coefficientAge(moisEcoules: number): number {
  return TRANCHES_AGE.find(([moisMax]) => moisEcoules <= moisMax)?.[1] ?? COEFFICIENT_AGE_MIN
}

function pourcentageCo2(voiture: Voiture, parametres: Parametres): number {
  if (voiture.carburant === 'electrique') {
    return POURCENTAGE_MIN
  }
  if (!Number.isSafeInteger(voiture.co2GrammesKm) || voiture.co2GrammesKm < 0) {
    throw new RangeError(`Émissions de CO₂ invalides : ${voiture.co2GrammesKm}`)
  }
  const reference =
    voiture.carburant === 'diesel'
      ? parametres.voiture.emissionReferenceDieselGrammesKm
      : parametres.voiture.emissionReferenceEssenceGrammesKm
  const pourcentage = POURCENTAGE_REFERENCE + POURCENTAGE_PAR_GRAMME * (voiture.co2GrammesKm - reference)
  return Math.min(POURCENTAGE_MAX, Math.max(POURCENTAGE_MIN, pourcentage))
}

/** ATN d'une voiture de société au mois de dateIso (art. 36 § 2 CIR 92, spec voiture § 3.1). */
export function calculerAtnVoiture(voiture: Voiture, dateIso: string, parametres: Parametres): ResultatAtnVoiture {
  const valeur = voiture.valeurCatalogueCentimes
  if (!Number.isSafeInteger(valeur) || valeur <= 0 || valeur > VALEUR_CATALOGUE_MAX_CENTIMES) {
    throw new RangeError(`Valeur catalogue hors du domaine : ${valeur}`)
  }
  const pourcentageCo2DixMilliemes = pourcentageCo2(voiture, parametres)
  const moisEcoules = moisEcoulesDepuis(voiture.premiereImmatriculation, dateIso)
  const coefficientAgeDixMilliemes = coefficientAge(moisEcoules)
  // Un seul arrondi : la loi n'en prescrit aucun intermédiaire.
  const annuelFormuleCentimes = diviserArrondi(
    valeur * coefficientAgeDixMilliemes * 6 * pourcentageCo2DixMilliemes,
    7 * 10_000 * 10_000,
  )
  const minimum = parametres.voiture.atnMinimumAnnuelCentimes
  const annuelCentimes = Math.max(annuelFormuleCentimes, minimum)
  return {
    valeurCatalogueCentimes: valeur,
    pourcentageCo2DixMilliemes,
    coefficientAgeDixMilliemes,
    moisEcoules,
    annuelFormuleCentimes,
    minimumAppliqueCentimes: annuelFormuleCentimes < minimum ? minimum : null,
    annuelCentimes,
    mensuelCentimes: diviserArrondi(annuelCentimes, 12),
  }
}

/** ATN imposable du mois : montant saisi ou formule, moins la contribution, jamais négatif. */
export function resoudreAtn(atn: AtnSaisi, dateIso: string, parametres: Parametres): ResolutionAtn {
  const contributionCentimes = atn.contributionMensuelleCentimes
  let voiture: ResultatAtnVoiture | null = null
  let avantContributionCentimes: number
  if (atn.source.mode === 'voiture') {
    voiture = calculerAtnVoiture(atn.source.voiture, dateIso, parametres)
    avantContributionCentimes = voiture.mensuelCentimes
  } else {
    avantContributionCentimes = atn.source.montantMensuelCentimes
  }
  return {
    mode: atn.source.mode,
    avantContributionCentimes,
    contributionCentimes,
    imposableCentimes: Math.max(0, avantContributionCentimes - contributionCentimes),
    voiture,
  }
}
```

- [ ] **Step 3 : vérifier**

Run : `npx vitest run src/engine/atnVoiture.test.ts`
Expected : PASS, tous les cas.

Run : `npm test`, `npm run typecheck`, `npm run lint`
Expected : tout vert.

- [ ] **Step 4 : commiter**

```bash
git add src/engine/atnVoiture.ts src/engine/atnVoiture.test.ts
git commit -F - <<'EOF'
feat: calcul de l'avantage de toute nature d'une voiture de société

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 3 : oracle Python indépendant et exemples publiés

**Files:**
- Modify: `tools/reference/reference.py`
- Create (généré) : `src/engine/__tests__/referencesVoiture.json`
- Regenerate: `src/engine/__tests__/references.json` (contenu inchangé, fins de ligne LF)
- Test: `src/engine/__tests__/referencesVoiture.test.ts`
- Create, **seulement si au moins un exemple publié complet existe** : `src/engine/__tests__/exemplesVoiturePublies.json` et `exemplesVoiturePublies.test.ts`

**Interfaces:**
- Consumes : `calculerAtnVoiture`, `type Voiture`, `type ResultatAtnVoiture` (tâche 2) ; `getParametres`.

Le script Python **ne lit pas** le code TypeScript. Il réimplémente la règle depuis le texte, avec `fractions.Fraction` (exact), et exprime le coefficient d'âge par une formule (`100 − 6 × ⌊(mois − 1) / 12⌋`, plancher 70) plutôt que par la table du module : deux écritures différentes de la même règle.

- [ ] **Step 1 : écrire le test (il doit échouer)**

Crée `src/engine/__tests__/referencesVoiture.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { calculerAtnVoiture, type ResultatAtnVoiture, type Voiture } from '../atnVoiture'
import { getParametres } from '../parametres'
import fichier from './referencesVoiture.json'

interface CasVoiture {
  id: string
  date: string
  voiture: Voiture
  attendu: ResultatAtnVoiture
  source: string
  verifie: boolean
}

const cas = fichier.cas as unknown as CasVoiture[]

describe(`ATN voiture — ${cas.length} cas du script de référence`, () => {
  it('contient des cas', () => {
    expect(cas.length).toBeGreaterThanOrEqual(8)
  })

  it.each(cas.map((c) => [c.id, c] as const))('%s', (_id, c) => {
    expect(calculerAtnVoiture(c.voiture, c.date, getParametres(c.date))).toEqual(c.attendu)
  })
})
```

Run : `npx vitest run src/engine/__tests__/referencesVoiture.test.ts`
Expected : FAIL (fichier JSON introuvable).

- [ ] **Step 2 : ajouter le calcul voiture au script**

Dans `tools/reference/reference.py` :

1. les imports deviennent :
```python
import json
import math
from decimal import ROUND_HALF_UP, Decimal as D
from fractions import Fraction as Fr
from pathlib import Path
```
2. après la constante `SORTIE`, ajoute :
```python
SORTIE_VOITURE = SORTIE.parent / "referencesVoiture.json"
```
3. après la fonction `bareme` (avant `def situation`), ajoute :
```python
# Voiture de société — art. 36 § 2 CIR 92 (spec voiture § 3.1).
# (du, au, référence essence/LPG/gaz naturel en g/km, référence diesel en g/km, minimum annuel en centimes)
PERIODES_VOITURE = [
    ("2025-02-01", "2025-12-31", 71, 59, 165000),
    ("2026-07-01", "2026-08-31", 70, 58, 169000),
    ("2026-09-01", "2026-12-31", 70, 58, 169000),
]


def arrondi_centime(x: Fr) -> int:
    """Arrondi au centime le plus proche, 0,5 vers le haut (montants positifs)."""
    return math.floor(x + Fr(1, 2))


def atn_voiture(v: dict, date: str) -> dict:
    ess, dies, minimum = next((e, d, m) for du, au, e, d, m in PERIODES_VOITURE if du <= date <= au)
    if v["carburant"] == "electrique":
        pct = Fr(4)
    else:
        ref = dies if v["carburant"] == "diesel" else ess
        pct = min(Fr(18), max(Fr(4), Fr(55, 10) + Fr(1, 10) * (v["co2GrammesKm"] - ref)))
    annee_imm, mois_imm = (int(x) for x in v["premiereImmatriculation"].split("-"))
    mois = (int(date[:4]) - annee_imm) * 12 + (int(date[5:7]) - mois_imm) + 1  # le mois d'immatriculation est le mois 1
    age = max(Fr(70), Fr(100) - 6 * ((mois - 1) // 12))
    formule = arrondi_centime(Fr(v["valeurCatalogueCentimes"]) * age / 100 * Fr(6, 7) * pct / 100)
    annuel = max(formule, minimum)
    return {
        "valeurCatalogueCentimes": v["valeurCatalogueCentimes"],
        "pourcentageCo2DixMilliemes": int(pct * 100),
        "coefficientAgeDixMilliemes": int(age * 100),
        "moisEcoules": mois,
        "annuelFormuleCentimes": formule,
        "minimumAppliqueCentimes": minimum if formule < minimum else None,
        "annuelCentimes": annuel,
        "mensuelCentimes": arrondi_centime(Fr(annuel, 12)),
    }


def voiture(carburant, valeur_centimes, co2, immatriculation):
    return {
        "carburant": carburant,
        "valeurCatalogueCentimes": valeur_centimes,
        "co2GrammesKm": co2,
        "premiereImmatriculation": immatriculation,
    }


CAS_VOITURE = [
    ("essence-45000-103g-20mois-2026-09-14", "2026-09-14", voiture("essence", 4500000, 103, "2025-02")),
    ("diesel-35000-120g-neuve-2026-09-14", "2026-09-14", voiture("diesel", 3500000, 120, "2026-09")),
    ("essence-45000-250g-neuve-2026-08-31", "2026-08-31", voiture("essence", 4500000, 250, "2026-08")),
    ("essence-30000-95g-61mois-2026-09-14", "2026-09-14", voiture("essence", 3000000, 95, "2021-09")),
    ("electrique-60000-81mois-2026-09-14", "2026-09-14", voiture("electrique", 6000000, 0, "2020-01")),
    ("electrique-60000-69mois-2025-09-14", "2025-09-14", voiture("electrique", 6000000, 0, "2020-01")),
    ("essence-45000-103g-neuve-2025-09-14", "2025-09-14", voiture("essence", 4500000, 103, "2025-09")),
    ("diesel-770000-250g-neuve-2026-09-14", "2026-09-14", voiture("diesel", 77000000, 250, "2026-09")),
]
```
4. à la fin de `main()`, remplace la ligne `SORTIE.write_text(...)` et le `print` par :
```python
    SORTIE.write_text(json.dumps(contenu, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"{len(cas)} cas écrits dans {SORTIE}")

    contenu_voiture = {
        "description": "Généré par tools/reference/reference.py — ne pas modifier à la main",
        "cas": [
            {
                "id": identifiant,
                "date": date,
                "voiture": v,
                "attendu": atn_voiture(v, date),
                "source": "tools/reference/reference.py (art. 36 § 2 CIR 92)",
                "verifie": False,
            }
            for identifiant, date, v in CAS_VOITURE
        ],
    }
    SORTIE_VOITURE.write_text(json.dumps(contenu_voiture, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"{len(CAS_VOITURE)} cas voiture écrits dans {SORTIE_VOITURE}")
```

`newline="\n"` corrige au passage les fins de ligne CRLF de `references.json`, que Windows produisait jusqu'ici.

- [ ] **Step 3 : générer et vérifier**

Run : `python tools/reference/reference.py`
Expected : « 74 cas écrits … » puis « 8 cas voiture écrits … ».

Run : `git diff --ignore-cr-at-eol --stat src/engine/__tests__/references.json`
Expected : aucune ligne : seul le type de fin de ligne a changé.

Run, après `git add src/engine/__tests__/references.json` : `git ls-files --eol src/engine/__tests__/references.json`
Expected : `i/lf w/lf`.

Run : `npx vitest run src/engine/__tests__/referencesVoiture.test.ts src/engine/__tests__/references.test.ts`
Expected : PASS. Contrôle croisé : le cas `essence-45000-103g-20mois-2026-09-14` doit donner `mensuelCentimes: 26589`, comme l'exemple de la spec.

- [ ] **Step 4 : chercher des exemples publiés**

Cherche des exemples chiffrés d'ATN voiture publiés par des secrétariats sociaux ou le SPF Finances (Acerta, Securex, SD Worx, Partena, Attentia, Liantis, FAQ du SPF), pour 2025 ou 2026.

Un exemple n'est **utilisable** que s'il donne : la valeur catalogue, le carburant, le CO₂, l'année de revenus, le résultat (annuel ou mensuel), et soit la date de première immatriculation, soit le coefficient d'âge explicite. Avec un coefficient explicite, choisis une première immatriculation qui le produit au mois calculé, et écris-le dans le champ `note`.

- **Au moins un exemple utilisable** : crée `src/engine/__tests__/exemplesVoiturePublies.json` avec un objet par exemple dans `cas`, de cette forme (les valeurs sont celles de l'exemple, jamais recalculées ; `publie` contient `annuelCentimes`, `mensuelCentimes`, ou les deux, selon ce que l'exemple donne) :
```json
{
  "description": "Exemples chiffrés publiés, recopiés à la main — spec voiture § 8",
  "cas": [
    {
      "id": "acerta-2026-essence-neuve",
      "date": "2026-09-14",
      "voiture": { "carburant": "essence", "valeurCatalogueCentimes": 3500000, "co2GrammesKm": 110, "premiereImmatriculation": "2026-01" },
      "publie": { "annuelCentimes": 285000 },
      "source": "https://… (consultée le 2026-09-22)",
      "note": "",
      "verifie": true
    }
  ]
}
```
(la ligne ci-dessus montre la **forme** ; ses nombres ne sont pas un exemple réel et ne doivent pas être recopiés). Et `src/engine/__tests__/exemplesVoiturePublies.test.ts` :
```ts
import { describe, expect, it } from 'vitest'
import { calculerAtnVoiture, type Voiture } from '../atnVoiture'
import { getParametres } from '../parametres'
import fichier from './exemplesVoiturePublies.json'

interface ExemplePublie {
  id: string
  date: string
  voiture: Voiture
  publie: { annuelCentimes?: number; mensuelCentimes?: number }
  source: string
  verifie: boolean
}

const cas = fichier.cas as unknown as ExemplePublie[]

describe(`ATN voiture — ${cas.length} exemples publiés`, () => {
  it.each(cas.map((c) => [c.id, c] as const))('%s', (_id, c) => {
    const r = calculerAtnVoiture(c.voiture, c.date, getParametres(c.date))
    if (c.publie.annuelCentimes !== undefined) {
      expect(r.annuelCentimes).toBe(c.publie.annuelCentimes)
    }
    if (c.publie.mensuelCentimes !== undefined) {
      expect(r.mensuelCentimes).toBe(c.publie.mensuelCentimes)
    }
  })
})
```
- **Un exemple utilisable qui n'est pas reproduit au centime** : règle d'or, ne change rien au module. Garde l'exemple hors des fichiers, et renvoie DONE_WITH_CONCERNS avec l'exemple, sa source et l'écart.
- **Aucun exemple utilisable** : ne crée aucun des deux fichiers ; renvoie DONE_WITH_CONCERNS en listant les pages consultées et ce qui manquait à chacune.

- [ ] **Step 5 : vérifier et commiter**

Run : `npm test`, `npm run typecheck`, `npm run lint`
Expected : tout vert.

```bash
git add tools/reference/reference.py src/engine/__tests__/references.json src/engine/__tests__/referencesVoiture.json src/engine/__tests__/referencesVoiture.test.ts
git add src/engine/__tests__/exemplesVoiturePublies.json src/engine/__tests__/exemplesVoiturePublies.test.ts 2>/dev/null || true
git commit -F - <<'EOF'
test: oracle Python de l'ATN voiture et exemples publiés

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 4 : l'ATN et la contribution dans le calcul de la rémunération

**Files:**
- Modify: `src/engine/avantages.ts`, `src/engine/remuneration.ts`, `src/engine/validation.ts`
- Modify: `src/engine/__tests__/fichesReelles.json`, `src/engine/__tests__/fichesReelles.test.ts`
- Test: `src/engine/remuneration.test.ts`, `src/engine/validation.test.ts`, `src/engine/avantages.test.ts`

**Interfaces:**
- Consumes : `ATN_AUCUN`, `AtnSaisi`, `ResolutionAtn`, `resoudreAtn` (tâche 2).
- Produces :
  - `Avantages.atn: AtnSaisi` ; `AVANTAGES_AUCUN.atn === ATN_AUCUN`.
  - `export type SituationSansAtn = Omit<Situation, 'atnMensuelCentimes'>` et `export type FamilleSansAtn = Omit<SituationFamiliale, 'atnMensuelCentimes'>`, exportés par `remuneration.ts`.
  - `calculerRemuneration(situation: SituationSansAtn, avantages: Avantages, dateIso: string): ResultatComplet`.
  - `calculerBrutDepuisNetVerse(famille: FamilleSansAtn, avantages: Avantages, netVerseCibleCentimes: number, dateIso: string): ResultatInverseComplet`.
  - `ResultatComplet.atn: ResolutionAtn` ; `netVerseCentimes` retire `atn.contributionCentimes`.
  - `ResultatValidation` : `situation: SituationSansAtn`, `famille: FamilleSansAtn` ; l'ATN saisi passe dans `avantages.atn` en mode `'montant'`, contribution 0 (la saisie de la voiture arrive à la tâche 5).

`calculerNet` et `calculerBrut` ne changent pas : ils reçoivent toujours une `Situation` complète, dont l'ATN est déjà résolu.

- [ ] **Step 1 : écrire les tests de la rémunération (ils doivent échouer)**

Dans `src/engine/remuneration.test.ts` :

1. les imports deviennent :
```ts
import { describe, expect, it } from 'vitest'
import { ATN_AUCUN, type AtnSaisi } from './atnVoiture'
import { AVANTAGES_AUCUN, calculerAvantages, type Avantages } from './avantages'
import type { SituationFamiliale } from './calculerBrut'
import { calculerNet } from './calculerNet'
import { getParametres } from './parametres'
import { calculerBrutDepuisNetVerse, calculerRemuneration, type SituationSansAtn } from './remuneration'
import { BRUT_MAX_CENTIMES, NetHorsLimites, PeriodeNonCouverte, type Situation } from './types'
```
2. chaque littéral typé `Avantages` du fichier gagne `atn: ATN_AUCUN` (les deux littéraux qui contiennent `fraisPropresEmployeur:`, dont `TITRES_ET_TELETRAVAIL`) ;
3. ajoute à la fin du fichier :
```ts
const ISOLE_3000_SANS_ATN: SituationSansAtn = {
  brutMensuelCentimes: 300_000,
  etatCivil: 'isole',
  revenusConjoint: null,
  enfantsACharge: 0,
  parentIsole: false,
}

/** L'exemple de contrôle de la spec (265,89 €/mois), avec 50 € de contribution. */
const VOITURE_CONTROLE: AtnSaisi = {
  source: {
    mode: 'voiture',
    voiture: { carburant: 'essence', valeurCatalogueCentimes: 4_500_000, co2GrammesKm: 103, premiereImmatriculation: '2025-02' },
  },
  contributionMensuelleCentimes: 5_000,
}

describe('calculerRemuneration — voiture de société', () => {
  it('résout l’ATN de la voiture, déduit la contribution et l’ajoute à la base du précompte', () => {
    const complet = calculerRemuneration(ISOLE_3000_SANS_ATN, { ...AVANTAGES_AUCUN, atn: VOITURE_CONTROLE }, SEPT)
    expect(complet.atn).toMatchObject({ mode: 'voiture', avantContributionCentimes: 26_589, contributionCentimes: 5_000, imposableCentimes: 21_589 })
    expect(complet.resultat).toEqual(calculerNet({ ...ISOLE_3000_SANS_ATN, atnMensuelCentimes: 21_589 }, SEPT))
  })

  it('retient la contribution sur le net versé', () => {
    const complet = calculerRemuneration(ISOLE_3000_SANS_ATN, { ...AVANTAGES_AUCUN, atn: VOITURE_CONTROLE }, SEPT)
    expect(complet.netVerseCentimes).toBe(complet.resultat.netMensuelCentimes - 5_000)
    expect(complet.totalMensuelCentimes).toBe(complet.netVerseCentimes)
  })

  it('retient toute la contribution même quand elle dépasse l’ATN', () => {
    const atn: AtnSaisi = { source: { mode: 'montant', montantMensuelCentimes: 10_000 }, contributionMensuelleCentimes: 30_000 }
    const complet = calculerRemuneration(ISOLE_3000_SANS_ATN, { ...AVANTAGES_AUCUN, atn }, SEPT)
    expect(complet.atn.imposableCentimes).toBe(0)
    expect(complet.resultat).toEqual(calculerNet({ ...ISOLE_3000_SANS_ATN, atnMensuelCentimes: 0 }, SEPT))
    expect(complet.netVerseCentimes).toBe(complet.resultat.netMensuelCentimes - 30_000)
  })

  it('mode montant sans contribution : identique à l’ATN saisi de la V2.3', () => {
    const atn: AtnSaisi = { source: { mode: 'montant', montantMensuelCentimes: 27_017 }, contributionMensuelleCentimes: 0 }
    const complet = calculerRemuneration(ISOLE_3000_SANS_ATN, { ...AVANTAGES_AUCUN, atn }, SEPT)
    expect(complet.resultat).toEqual(calculerNet({ ...ISOLE_3000_SANS_ATN, atnMensuelCentimes: 27_017 }, SEPT))
    expect(complet.netVerseCentimes).toBe(complet.resultat.netMensuelCentimes)
  })
})

describe('calculerBrutDepuisNetVerse — voiture de société', () => {
  const avantages: Avantages = { ...AVANTAGES_AUCUN, atn: VOITURE_CONTROLE }
  const netVerseVoiture = (brut: number) =>
    calculerNet({ ...ISOLE, atnMensuelCentimes: 21_589, brutMensuelCentimes: brut }, SEPT).netMensuelCentimes - 5_000

  it('trouve le plus petit brut, comparé à l’oracle', () => {
    const cible = 226_133
    // net(b) ≤ b, donc netVerse(b) ≤ b − 5 000 : tout brut qui atteint la cible est ≥ cible + 5 000.
    let oracle = cible + 5_000
    while (netVerseVoiture(oracle) < cible) {
      oracle++
    }
    const r = calculerBrutDepuisNetVerse(ISOLE, avantages, cible, SEPT)
    expect(r.brutCentimes).toBe(oracle)
    expect(r.complet.netVerseCentimes).toBe(netVerseVoiture(oracle))
    expect(r.complet.atn.imposableCentimes).toBe(21_589)
  })

  it('exprime NetHorsLimites en net versé, contribution comprise', () => {
    const netMax = netVerseVoiture(BRUT_MAX_CENTIMES)
    try {
      calculerBrutDepuisNetVerse(ISOLE, avantages, netMax + 1, SEPT)
      expect.unreachable('NetHorsLimites attendu')
    } catch (erreur) {
      expect(erreur).toBeInstanceOf(NetHorsLimites)
      expect((erreur as NetHorsLimites).netMaxCentimes).toBe(netMax)
    }
  })
})
```

`ISOLE` (déclaré en haut du fichier, avec `atnMensuelCentimes: 0`) reste typé `SituationFamiliale` : passé à une fonction qui attend `FamilleSansAtn`, son champ `atnMensuelCentimes` est ignoré, et l'ATN vient de `avantages.atn`.

Run : `npx vitest run src/engine/remuneration.test.ts`
Expected : FAIL (typage et `complet.atn` absent).

- [ ] **Step 2 : ajouter l'ATN aux avantages**

Dans `src/engine/avantages.ts`, ajoute en tête :

```ts
import { ATN_AUCUN, type AtnSaisi } from './atnVoiture'
```

dans `interface Avantages`, après `fraisPropresEmployeur` :

```ts
  /** Avantage de toute nature et contribution personnelle (spec voiture § 3.2). */
  atn: AtnSaisi
```

et dans `AVANTAGES_AUCUN`, après `fraisPropresEmployeur` :

```ts
  atn: ATN_AUCUN,
```

`calculerAvantages` ne change pas : l'ATN se résout dans `remuneration.ts`, qui a la date.

- [ ] **Step 3 : résoudre l'ATN dans la rémunération**

Remplace tout le contenu de `src/engine/remuneration.ts` par :

```ts
import { resoudreAtn, type ResolutionAtn } from './atnVoiture'
import { calculerAvantages, type Avantages, type ResultatAvantages } from './avantages'
import { calculerBrut, type SituationFamiliale } from './calculerBrut'
import { calculerNet } from './calculerNet'
import { getParametres } from './parametres'
import { NetHorsLimites, type Resultat, type Situation } from './types'

/** Situation sans l'ATN : il vient de avantages.atn, résolu à la date du calcul. */
export type SituationSansAtn = Omit<Situation, 'atnMensuelCentimes'>
export type FamilleSansAtn = Omit<SituationFamiliale, 'atnMensuelCentimes'>

export interface ResultatComplet {
  /** Le calcul du salaire, inchangé. */
  resultat: Resultat
  avantages: ResultatAvantages
  /** ATN retenu : montant saisi ou calcul de la voiture, contribution déduite (spec voiture § 3). */
  atn: ResolutionAtn
  /** Net légal − retenue des titres-repas + indemnité de télétravail + frais propres − contribution voiture. */
  netVerseCentimes: number
  /** Net versé + valeur des titres-repas reçus. */
  totalMensuelCentimes: number
}

export interface ResultatInverseComplet {
  complet: ResultatComplet
  brutCentimes: number
  netVerseCibleCentimes: number
}

function assembler(resultat: Resultat, avantages: ResultatAvantages, atn: ResolutionAtn): ResultatComplet {
  const netVerseCentimes =
    resultat.netMensuelCentimes -
    avantages.retenueTitresCentimes +
    avantages.teletravailCentimes +
    avantages.fraisPropresCentimes -
    atn.contributionCentimes
  return {
    resultat,
    avantages,
    atn,
    netVerseCentimes,
    totalMensuelCentimes: netVerseCentimes + avantages.valeurTitresCentimes,
  }
}

/** Brut → net, avantages et ATN compris. Lève PeriodeNonCouverte si la date n'est pas couverte. */
export function calculerRemuneration(situation: SituationSansAtn, avantages: Avantages, dateIso: string): ResultatComplet {
  const parametres = getParametres(dateIso)
  const atn = resoudreAtn(avantages.atn, dateIso, parametres)
  const resultat = calculerNet({ ...situation, atnMensuelCentimes: atn.imposableCentimes }, dateIso)
  return assembler(resultat, calculerAvantages(avantages, parametres), atn)
}

/**
 * Net versé → brut. L'ATN, la retenue des titres-repas, l'indemnité de télétravail, les frais
 * propres et la contribution voiture ne dépendent pas du brut : l'ATN est résolu une fois, et la
 * cible est décalée avant la recherche, qui reste celle de calculerBrut, avec sa marge et sa
 * preuve (spec net → brut § 3.2, spec voiture § 3.3).
 *
 * Lève NetHorsLimites si le brut maximal n'atteint pas la cible, PeriodeNonCouverte si la date
 * n'est pas couverte.
 */
export function calculerBrutDepuisNetVerse(
  famille: FamilleSansAtn,
  avantages: Avantages,
  netVerseCibleCentimes: number,
  dateIso: string,
): ResultatInverseComplet {
  const parametres = getParametres(dateIso)
  const resultatAvantages = calculerAvantages(avantages, parametres)
  const atn = resoudreAtn(avantages.atn, dateIso, parametres)
  const decalage =
    resultatAvantages.retenueTitresCentimes -
    resultatAvantages.teletravailCentimes -
    resultatAvantages.fraisPropresCentimes +
    atn.contributionCentimes
  const cibleNetLegal = Math.max(1, netVerseCibleCentimes + decalage)
  try {
    const inverse = calculerBrut({ ...famille, atnMensuelCentimes: atn.imposableCentimes }, cibleNetLegal, dateIso)
    return {
      complet: assembler(inverse.resultat, resultatAvantages, atn),
      brutCentimes: inverse.brutCentimes,
      netVerseCibleCentimes,
    }
  } catch (erreur) {
    // calculerBrut lève en net légal ; le champ et le message affiché parlent du net versé, donc
    // l'erreur remontée doit exprimer le même plafond, décalé comme la cible l'a été.
    if (erreur instanceof NetHorsLimites) {
      throw new NetHorsLimites(netVerseCibleCentimes, erreur.netMaxCentimes - decalage)
    }
    throw erreur
  }
}
```

- [ ] **Step 4 : adapter la validation (mode montant seulement)**

Dans `src/engine/validation.ts` :

1. les imports deviennent :
```ts
import { eurosTexteEnCentimes } from './argent'
import { ATN_AUCUN } from './atnVoiture'
import { AVANTAGES_AUCUN, type Avantages } from './avantages'
import type { FamilleSansAtn, SituationSansAtn } from './remuneration'
import { BRUT_MAX_CENTIMES, type EtatCivil, type RevenusConjoint } from './types'
```
2. `ResultatValidation` devient :
```ts
export type ResultatValidation =
  | { ok: true; sens: 'brutVersNet'; situation: SituationSansAtn; avantages: Avantages }
  | { ok: true; sens: 'netVersBrut'; famille: FamilleSansAtn; netCibleCentimes: number; avantages: Avantages }
  | { ok: false; erreurs: ErreursSaisie }
```
3. dans `validerAvantages`, le littéral `avantages` gagne `atn: ATN_AUCUN,` après `fraisPropresEmployeur` ;
4. dans `validerSaisie`, la ligne `const avantages = validerAvantages(saisie.avantages, erreurs)` devient :
```ts
  const avantages: Avantages = {
    ...validerAvantages(saisie.avantages, erreurs),
    atn: { source: { mode: 'montant', montantMensuelCentimes: atn ?? 0 }, contributionMensuelleCentimes: 0 },
  }
```
5. la construction de `famille` perd son champ ATN :
```ts
  const famille: FamilleSansAtn = {
    etatCivil: saisie.etatCivil,
    revenusConjoint: isole ? null : saisie.revenusConjoint,
    enfantsACharge: enfants,
    parentIsole: isole && enfants > 0 && saisie.parentIsole,
  }
```
6. l'import de `SituationFamiliale` devient inutile : supprime-le.

`src/hooks/useCalcul.ts` ne change pas : il passe déjà `validation.situation` et `validation.famille` aux fonctions de `remuneration.ts`.

- [ ] **Step 5 : adapter les tests existants**

Dans `src/engine/validation.test.ts` :
1. `ISOLE_SANS_ENFANT` perd `atnMensuelCentimes: 0` ;
2. chaque `avantages: AVANTAGES_AUCUN` attendu reste valable (son champ `atn` vaut `ATN_AUCUN`, égal à ce que produit la validation d'un ATN à 0) ;
3. les deux premiers tests du bloc « avantage de toute nature et frais propres » deviennent (et `ATN_AUCUN` s'importe depuis `./atnVoiture`) :
```ts
  it('convertit l’ATN saisi en centimes, en mode montant et sans contribution', () => {
    const r = validerSaisie(saisie({ atn: '270,17' }))
    expect(r.ok && r.avantages.atn).toEqual({ source: { mode: 'montant', montantMensuelCentimes: 27_017 }, contributionMensuelleCentimes: 0 })
  })

  it('accepte un ATN nul par défaut', () => {
    const r = validerSaisie(SAISIE_PAR_DEFAUT)
    expect(r.ok && r.avantages.atn).toEqual(ATN_AUCUN)
  })
```

Dans `src/engine/avantages.test.ts`, le littéral qui contient `fraisPropresEmployeur: { actif: false, montantMensuelCentimes: 0 },` (vers la ligne 132) gagne `atn: ATN_AUCUN,`, importé depuis `./atnVoiture`.

Dans `src/engine/__tests__/fichesReelles.json`, pour **chacun des deux cas** : supprime `"atnMensuelCentimes": …` de `situation`, et ajoute dans `avantages` un champ `atn` avec la même valeur :
- `fiche-2025-07` : `"atn": { "source": { "mode": "montant", "montantMensuelCentimes": 27017 }, "contributionMensuelleCentimes": 0 }`
- `fiche-2025-09` : `"atn": { "source": { "mode": "montant", "montantMensuelCentimes": 26145 }, "contributionMensuelleCentimes": 0 }`

Vérifie avant de modifier que les deux valeurs du fichier sont bien 27017 et 26145 (`grep -n atnMensuelCentimes src/engine/__tests__/fichesReelles.json`) : reprends celles du fichier si elles diffèrent.

Dans `src/engine/__tests__/fichesReelles.test.ts`, `import type { Situation } from '../types'` devient `import type { SituationSansAtn } from '../remuneration'` et le champ `situation: Situation` de `CasFiche` devient `situation: SituationSansAtn`.

Les quatre tests des fiches doivent passer **sans changer une seule valeur attendue** : c'est la preuve que le déplacement de l'ATN n'a rien changé au calcul.

- [ ] **Step 6 : vérifier**

Run : `npm test`, `npm run typecheck`, `npm run lint`
Expected : tout vert, y compris les 4 tests des fiches réelles et les tests de l'interface (`App.test.tsx`), inchangés.

- [ ] **Step 7 : commiter**

```bash
git add src/engine/avantages.ts src/engine/remuneration.ts src/engine/validation.ts src/engine/remuneration.test.ts src/engine/validation.test.ts src/engine/avantages.test.ts src/engine/__tests__/fichesReelles.json src/engine/__tests__/fichesReelles.test.ts
git commit -F - <<'EOF'
feat: ATN résolu et contribution voiture retenue sur le net versé

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 5 : saisie de la voiture, validation et sauvegarde v4

**Files:**
- Modify: `src/engine/validation.ts`, `src/hooks/useCalcul.ts`, `src/hooks/useSaisie.ts`, `src/i18n/fr.ts`
- Test: `src/engine/validation.test.ts`, `src/hooks/useSaisie.test.ts`, `src/hooks/useCalcul.test.ts`

**Interfaces:**
- Consumes : `CARBURANTS`, `Carburant`, `SourceAtn`, `AtnSaisi`, `ATN_AUCUN`, `VALEUR_CATALOGUE_MAX_CENTIMES` (tâche 2) ; `Avantages.atn` (tâche 4).
- Produces :
  - `MODES_ATN = ['montant', 'voiture'] as const`, `type ModeAtn`, exportés par `validation.ts`.
  - `interface SaisieVoiture { mode: ModeAtn; carburant: Carburant; valeurCatalogue: string; co2: string; premiereImmatriculation: string; contribution: string }` ; `SaisieFormulaire.voiture: SaisieVoiture` ; `SAISIE_VOITURE_PAR_DEFAUT`.
  - `validerSaisie(saisie: SaisieFormulaire, dateIso: string): ResultatValidation`.
  - codes d'erreur `valeurCatalogueInvalide`, `co2Invalide`, `immatriculationInvalide`, `contributionInvalide` ; champs `ErreursSaisie.valeurCatalogue`, `.co2`, `.premiereImmatriculation`, `.contribution`.
  - `CLE_STOCKAGE = 'wage-calculator:saisie:v4'`, `CLE_STOCKAGE_V3 = 'wage-calculator:saisie:v3'`.

- [ ] **Step 1 : passer la date à la validation dans les tests existants**

La validation a besoin du mois calculé (l'immatriculation ne peut pas lui être postérieure). Dans `src/engine/validation.test.ts`, ajoute après la fonction `saisie` :

```ts
const DATE = '2026-09-14'
const valider = (s: SaisieFormulaire) => validerSaisie(s, DATE)
```

puis remplace tous les appels hors de la ligne d'import :

Run : `sed -i '/^import/!s/validerSaisie(/valider(/g' src/engine/validation.test.ts`

La commande a aussi remplacé l'appel dans la définition de `valider` : remets-la exactement comme ci-dessus (`const valider = (s: SaisieFormulaire) => validerSaisie(s, DATE)`).

Vérifie : `grep -c "validerSaisie(" src/engine/validation.test.ts` doit donner **1**.

- [ ] **Step 2 : écrire les tests de la voiture (ils doivent échouer)**

Ajoute `SAISIE_VOITURE_PAR_DEFAUT` à l'import depuis `./validation`, puis à la fin de `src/engine/validation.test.ts` :

```ts
describe('validerSaisie — voiture de société', () => {
  const voiture = (modif: Partial<SaisieFormulaire['voiture']>) =>
    saisie({ voiture: { ...SAISIE_VOITURE_PAR_DEFAUT, mode: 'voiture', premiereImmatriculation: '2025-02', ...modif } })

  it('a une voiture par défaut en mode « je connais le montant », sans contribution', () => {
    expect(SAISIE_VOITURE_PAR_DEFAUT).toEqual({
      mode: 'montant',
      carburant: 'essence',
      valeurCatalogue: '45000,00',
      co2: '103',
      premiereImmatriculation: '',
      contribution: '0',
    })
  })

  it('convertit la voiture saisie', () => {
    const r = valider(voiture({}))
    expect(r.ok && r.avantages.atn).toEqual({
      source: {
        mode: 'voiture',
        voiture: { carburant: 'essence', valeurCatalogueCentimes: 4_500_000, co2GrammesKm: 103, premiereImmatriculation: '2025-02' },
      },
      contributionMensuelleCentimes: 0,
    })
  })

  it('ignore le CO₂ d’une voiture électrique, même invalide', () => {
    const r = valider(voiture({ carburant: 'electrique', co2: 'abc' }))
    expect(r.ok && r.avantages.atn.source).toMatchObject({ mode: 'voiture', voiture: { carburant: 'electrique', co2GrammesKm: 0 } })
  })

  it('en mode voiture, ne valide pas le montant d’ATN', () => {
    expect(valider({ ...voiture({}), atn: 'abc' }).ok).toBe(true)
  })

  it('en mode montant, ne valide pas les champs de la voiture', () => {
    const r = valider(saisie({ voiture: { ...SAISIE_VOITURE_PAR_DEFAUT, valeurCatalogue: 'abc', co2: '', premiereImmatriculation: '' } }))
    expect(r.ok).toBe(true)
  })

  it.each(['', '0', 'abc', '770000,01'])('valeur catalogue « %s » → erreur', (valeurCatalogue) => {
    expect(valider(voiture({ valeurCatalogue }))).toEqual({ ok: false, erreurs: { valeurCatalogue: 'valeurCatalogueInvalide' } })
  })

  it('accepte la valeur catalogue maximale', () => {
    expect(valider(voiture({ valeurCatalogue: '770000' })).ok).toBe(true)
  })

  it.each(['', 'abc', '-1', '10,5', '501'])('CO₂ « %s » → erreur', (co2) => {
    expect(valider(voiture({ co2 }))).toEqual({ ok: false, erreurs: { co2: 'co2Invalide' } })
  })

  it.each(['', '2025-13', '2025', '2026-10', '1949-12'])('première immatriculation « %s » → erreur', (premiereImmatriculation) => {
    expect(valider(voiture({ premiereImmatriculation }))).toEqual({
      ok: false,
      erreurs: { premiereImmatriculation: 'immatriculationInvalide' },
    })
  })

  it('accepte une immatriculation du mois calculé', () => {
    expect(valider(voiture({ premiereImmatriculation: '2026-09' })).ok).toBe(true)
  })

  it('convertit la contribution, dans les deux modes', () => {
    const enMontant = valider(saisie({ atn: '270,17', voiture: { ...SAISIE_VOITURE_PAR_DEFAUT, contribution: '50' } }))
    expect(enMontant.ok && enMontant.avantages.atn.contributionMensuelleCentimes).toBe(5_000)
    const enVoiture = valider(voiture({ contribution: '120,50' }))
    expect(enVoiture.ok && enVoiture.avantages.atn.contributionMensuelleCentimes).toBe(12_050)
  })

  it.each(['', 'abc', '-1', '10000,01'])('contribution « %s » → erreur', (contribution) => {
    expect(valider(saisie({ voiture: { ...SAISIE_VOITURE_PAR_DEFAUT, contribution } }))).toEqual({
      ok: false,
      erreurs: { contribution: 'contributionInvalide' },
    })
  })
})
```

Run : `npx vitest run src/engine/validation.test.ts`
Expected : FAIL.

- [ ] **Step 3 : implémenter la saisie et la validation**

Dans `src/engine/validation.ts` :

1. l'import de `./atnVoiture` devient :
```ts
import { ATN_AUCUN, VALEUR_CATALOGUE_MAX_CENTIMES, type AtnSaisi, type Carburant, type SourceAtn } from './atnVoiture'
```
2. après `SensCalcul`, ajoute :
```ts
export const MODES_ATN = ['montant', 'voiture'] as const

/** L'ATN est repris d'une fiche de paie, ou calculé depuis la voiture (spec voiture § 1). */
export type ModeAtn = (typeof MODES_ATN)[number]

/** Voiture de société et contribution, telles que tapées (spec voiture § 5.1). */
export interface SaisieVoiture {
  mode: ModeAtn
  carburant: Carburant
  valeurCatalogue: string
  co2: string
  /** AAAA-MM, valeur d'un champ <input type="month">. '' tant que rien n'est choisi. */
  premiereImmatriculation: string
  /** Disponible dans les deux modes. */
  contribution: string
}
```
3. `SaisieFormulaire` gagne, juste après `atn: string` :
```ts
  voiture: SaisieVoiture
```
et le commentaire de `atn` devient `/** ATN mensuel tel que tapé, utilisé en mode « montant ». '0' si aucun. */` ;
4. `CodeErreur` gagne :
```ts
  | 'valeurCatalogueInvalide'
  | 'co2Invalide'
  | 'immatriculationInvalide'
  | 'contributionInvalide'
```
et `ErreursSaisie` gagne :
```ts
  valeurCatalogue?: CodeErreur
  co2?: CodeErreur
  premiereImmatriculation?: CodeErreur
  contribution?: CodeErreur
```
5. après `FRAIS_PROPRES_MAX_CENTIMES`, ajoute :
```ts
const CO2_MAX_GRAMMES = 500
const CONTRIBUTION_MAX_CENTIMES = 1_000_000
/** Première immatriculation : un mois AAAA-MM, pas avant 1950. */
const MOIS_IMMATRICULATION = /^\d{4}-(0[1-9]|1[0-2])$/
const IMMATRICULATION_MIN = '1950-01'
```
6. avant `SAISIE_PAR_DEFAUT`, ajoute :
```ts
export const SAISIE_VOITURE_PAR_DEFAUT: SaisieVoiture = {
  mode: 'montant',
  carburant: 'essence',
  valeurCatalogue: '45000,00',
  co2: '103',
  premiereImmatriculation: '',
  contribution: '0',
}
```
et `SAISIE_PAR_DEFAUT` gagne `voiture: SAISIE_VOITURE_PAR_DEFAUT,` juste après `atn: '0',` ;
7. après `validerAvantages`, ajoute :
```ts
/** ATN et contribution normalisés ; remplit `erreurs` pour chaque champ invalide du mode choisi. */
function validerAtn(saisie: SaisieFormulaire, dateIso: string, erreurs: ErreursSaisie): AtnSaisi {
  const v = saisie.voiture
  const contribution = montantBorne(v.contribution, 0, CONTRIBUTION_MAX_CENTIMES)
  if (contribution === null) {
    erreurs.contribution = 'contributionInvalide'
  }

  let source: SourceAtn = ATN_AUCUN.source
  if (v.mode === 'montant') {
    const atn = montantBorne(saisie.atn, 0, ATN_MAX_CENTIMES)
    if (atn === null) {
      erreurs.atn = 'atnInvalide'
    } else {
      source = { mode: 'montant', montantMensuelCentimes: atn }
    }
  } else {
    const valeur = montantBorne(v.valeurCatalogue, 1, VALEUR_CATALOGUE_MAX_CENTIMES)
    if (valeur === null) {
      erreurs.valeurCatalogue = 'valeurCatalogueInvalide'
    }
    const co2Texte = v.co2.trim()
    const co2 =
      v.carburant === 'electrique'
        ? 0
        : /^\d+$/.test(co2Texte) && Number(co2Texte) <= CO2_MAX_GRAMMES
          ? Number(co2Texte)
          : null
    if (co2 === null) {
      erreurs.co2 = 'co2Invalide'
    }
    const immatriculation = v.premiereImmatriculation
    const immatriculationValide =
      MOIS_IMMATRICULATION.test(immatriculation) &&
      immatriculation >= IMMATRICULATION_MIN &&
      immatriculation <= dateIso.slice(0, 7)
    if (!immatriculationValide) {
      erreurs.premiereImmatriculation = 'immatriculationInvalide'
    }
    if (valeur !== null && co2 !== null && immatriculationValide) {
      source = {
        mode: 'voiture',
        voiture: { carburant: v.carburant, valeurCatalogueCentimes: valeur, co2GrammesKm: co2, premiereImmatriculation: immatriculation },
      }
    }
  }

  return { source, contributionMensuelleCentimes: contribution ?? 0 }
}
```
8. `validerSaisie` prend la date et délègue l'ATN :
   - la signature devient `export function validerSaisie(saisie: SaisieFormulaire, dateIso: string): ResultatValidation` ;
   - le bloc `const atn = montantBorne(saisie.atn, 0, ATN_MAX_CENTIMES)` / `if (atn === null) { erreurs.atn = 'atnInvalide' }` est **supprimé** ;
   - la construction de `avantages` (tâche 4) devient :
```ts
  const avantages: Avantages = {
    ...validerAvantages(saisie.avantages, erreurs),
    atn: validerAtn(saisie, dateIso, erreurs),
  }
```
   - le commentaire de la fonction devient `/** Transforme la saisie en données normalisées pour le moteur, ou renvoie les erreurs par champ. dateIso borne la première immatriculation. */`.

Dans `src/hooks/useCalcul.ts`, `const validation = validerSaisie(saisie)` devient `const validation = validerSaisie(saisie, dateIso)`.

Dans `src/i18n/fr.ts`, bloc `erreurs`, après `fraisPropresInvalide` :

```ts
    valeurCatalogueInvalide: 'Indiquez une valeur catalogue entre 0,01 € et 770 000,00 €.',
    co2Invalide: 'Indiquez des émissions de CO₂ en grammes par km : un nombre entier entre 0 et 500.',
    immatriculationInvalide: 'Indiquez le mois de première immatriculation, au plus tard le mois du calcul.',
    contributionInvalide: 'Indiquez un montant entre 0,00 € et 10 000,00 €.',
```

Run : `npx vitest run src/engine/validation.test.ts src/hooks/useCalcul.test.ts`
Expected : PASS.

- [ ] **Step 4 : écrire les tests de la sauvegarde (ils doivent échouer)**

Dans `src/hooks/useSaisie.test.ts` :
1. l'import de `../engine/validation` devient `import { SAISIE_PAR_DEFAUT, SAISIE_VOITURE_PAR_DEFAUT } from '../engine/validation'` (ajoute aussi `SAISIE_AVANTAGES_PAR_DEFAUT` s'il sert déjà dans le fichier) et celui de `./useSaisie` ajoute `CLE_STOCKAGE_V3` ;
2. le test « utilise la clé v3 en écriture, v2 et v1 en reprise » devient :
```ts
  it('utilise la clé v4 en écriture, v3, v2 et v1 en reprise', () => {
    expect(CLE_STOCKAGE).toBe('wage-calculator:saisie:v4')
    expect(CLE_STOCKAGE_V3).toBe('wage-calculator:saisie:v3')
    expect(CLE_STOCKAGE_V2).toBe('wage-calculator:saisie:v2')
    expect(CLE_STOCKAGE_V1).toBe('wage-calculator:saisie:v1')
  })
```
3. dans les tests existants : **toute saisie reprise d'un format antérieur** (clé v1, clé v2, ou saisie sans `voiture`) attend désormais `voiture: SAISIE_VOITURE_PAR_DEFAUT` en plus ; les tests qui écrivaient une saisie **sans voiture** sous `CLE_STOCKAGE` pour représenter la v3 l'écrivent sous `CLE_STOCKAGE_V3`. Les tests qui écrivent `{ ...SAISIE_PAR_DEFAUT, … }` sous `CLE_STOCKAGE` restent valables tels quels : `SAISIE_PAR_DEFAUT` contient déjà la voiture ;
4. ajoute :
```ts
describe('lireSaisieStockee — voiture de société (v4)', () => {
  const V3 = { ...SAISIE_PAR_DEFAUT, montant: '3500', atn: '270,17', voiture: undefined }

  it('reprend une saisie v3 complète en mode « je connais le montant », avec la voiture par défaut', () => {
    localStorage.setItem(CLE_STOCKAGE_V3, JSON.stringify(V3))
    expect(lireSaisieStockee()).toEqual({ ...V3, voiture: SAISIE_VOITURE_PAR_DEFAUT })
  })

  it('préfère la clé v4 à la clé v3', () => {
    const v4 = { ...SAISIE_PAR_DEFAUT, montant: '4000' }
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(v4))
    localStorage.setItem(CLE_STOCKAGE_V3, JSON.stringify(V3))
    expect(lireSaisieStockee()).toEqual(v4)
  })

  it('garde le reste d’une saisie v4 dont le bloc voiture est invalide', () => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, montant: '4000', voiture: { mode: 'avion' } }))
    expect(lireSaisieStockee()).toEqual({ ...SAISIE_PAR_DEFAUT, montant: '4000', voiture: SAISIE_VOITURE_PAR_DEFAUT })
  })

  it('restaure une voiture v4 valide', () => {
    const voiture = { ...SAISIE_VOITURE_PAR_DEFAUT, mode: 'voiture', carburant: 'diesel', premiereImmatriculation: '2024-03', contribution: '75' }
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, voiture }))
    expect(lireSaisieStockee().voiture).toEqual(voiture)
  })

  it('ne fait pas planter le calcul après reprise d’une saisie v3', () => {
    localStorage.setItem(CLE_STOCKAGE_V3, JSON.stringify(V3))
    const etat = calculerEtat(lireSaisieStockee(), '2026-09-14')
    expect(etat.etat).toBe('ok')
    expect(etat.etat === 'ok' && etat.resultat.intermediaires.atn).toBe(27_017)
  })

  it('ne réécrit pas la clé v3', () => {
    localStorage.setItem(CLE_STOCKAGE_V3, JSON.stringify(V3))
    renderHook(() => useSaisie())
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE_V3) ?? 'null')).toEqual({ ...V3, voiture: undefined })
  })
})
```

`JSON.stringify` omet le champ `voiture: undefined` : `V3` sérialisé est bien une saisie v3 sans voiture, et `toEqual` traite un champ `undefined` comme absent.

Run : `npx vitest run src/hooks/useSaisie.test.ts`
Expected : FAIL.

- [ ] **Step 5 : implémenter la sauvegarde v4**

Dans `src/hooks/useSaisie.ts` :

1. imports et clés :
```ts
import { useCallback, useEffect, useState } from 'react'
import { CARBURANTS } from '../engine/atnVoiture'
import { REVENUS_CONJOINT } from '../engine/types'
import {
  MODES_ATN,
  SAISIE_AVANTAGES_PAR_DEFAUT,
  SAISIE_PAR_DEFAUT,
  SAISIE_VOITURE_PAR_DEFAUT,
  SENS_CALCUL,
  type SaisieAvantages,
  type SaisieFormulaire,
  type SaisieVoiture,
} from '../engine/validation'

export const CLE_STOCKAGE = 'wage-calculator:saisie:v4'
/** Format V3 (ATN en montant seul, sans voiture) : lu pour reprendre la saisie, jamais réécrit. */
export const CLE_STOCKAGE_V3 = 'wage-calculator:saisie:v3'
/** Format V2 (sans avantages) : lu pour reprendre la saisie, jamais réécrit. */
export const CLE_STOCKAGE_V2 = 'wage-calculator:saisie:v2'
/** Format V1 (brut → net uniquement) : lu pour reprendre la saisie, jamais réécrit. */
export const CLE_STOCKAGE_V1 = 'wage-calculator:saisie:v1'
```
2. après `estSaisieAvantages`, ajoute :
```ts
function estSaisieVoiture(valeur: unknown): valeur is SaisieVoiture {
  if (!estObjet(valeur)) {
    return false
  }
  const chaines = ['valeurCatalogue', 'co2', 'premiereImmatriculation', 'contribution'] as const
  return (
    typeof valeur.mode === 'string' &&
    (MODES_ATN as readonly string[]).includes(valeur.mode) &&
    typeof valeur.carburant === 'string' &&
    (CARBURANTS as readonly string[]).includes(valeur.carburant) &&
    chaines.every((champ) => typeof valeur[champ] === 'string')
  )
}
```
3. `estSaisie` exige la voiture :
```ts
function estSaisie(valeur: unknown): valeur is SaisieFormulaire {
  return (
    estSaisieV2(valeur) &&
    typeof (valeur as Objet).atn === 'string' &&
    estSaisieAvantages((valeur as Objet).avantages) &&
    estSaisieVoiture((valeur as Objet).voiture)
  )
}
```
4. après `estSaisie`, ajoute :
```ts
/**
 * Saisie d'une version antérieure, ou dont un bloc est corrompu : le montant, le sens et la
 * situation familiale restent valables ; chaque bloc absent ou invalide reprend sa valeur par défaut.
 */
function completer(valeur: Omit<SaisieFormulaire, 'avantages'>): SaisieFormulaire {
  const v = valeur as unknown as Objet
  return {
    ...valeur,
    atn: typeof v.atn === 'string' ? v.atn : SAISIE_PAR_DEFAUT.atn,
    avantages: estSaisieAvantages(v.avantages) ? v.avantages : SAISIE_AVANTAGES_PAR_DEFAUT,
    voiture: estSaisieVoiture(v.voiture) ? v.voiture : SAISIE_VOITURE_PAR_DEFAUT,
  }
}
```
5. dans `repriseV1`, l'objet renvoyé gagne `voiture: SAISIE_VOITURE_PAR_DEFAUT,` après `atn: '0',` ;
6. `lireSaisieStockee` devient :
```ts
/** Saisie mémorisée (v4, sinon reprise v3, v2, v1), ou saisie par défaut. */
export function lireSaisieStockee(): SaisieFormulaire {
  for (const cle of [CLE_STOCKAGE, CLE_STOCKAGE_V3, CLE_STOCKAGE_V2]) {
    const valeur = lireCle(cle)
    if (estSaisie(valeur)) {
      return valeur
    }
    // Blocs absents (version antérieure) ou corrompus : on garde le reste de la saisie plutôt que
    // de se rabattre sur une clé plus ancienne, que les utilisateurs récents n'ont plus.
    if (estSaisieV2(valeur)) {
      return completer(valeur)
    }
  }
  return repriseV1(lireCle(CLE_STOCKAGE_V1)) ?? SAISIE_PAR_DEFAUT
}
```

Run : `npx vitest run src/hooks/useSaisie.test.ts`
Expected : PASS.

- [ ] **Step 6 : vérifier et commiter**

Run : `npm test`, `npm run typecheck`, `npm run lint`
Expected : tout vert. L'interface n'affiche pas encore la voiture : la saisie par défaut reste en mode montant, et les tests de `App.test.tsx` passent sans changement.

```bash
git add src/engine/validation.ts src/engine/validation.test.ts src/hooks/useCalcul.ts src/hooks/useSaisie.ts src/hooks/useSaisie.test.ts src/i18n/fr.ts
git commit -F - <<'EOF'
feat: saisie de la voiture de société et sauvegarde v4

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 6 : interface de la voiture, détail, récapitulatif et README

**Files:**
- Modify: `src/utils/format.ts` (+ `src/utils/format.test.ts`)
- Modify: `src/components/FormulaireSituation.tsx`, `src/components/DetailCalcul.tsx`, `src/components/Recapitulatif.tsx`, `src/App.tsx`
- Modify: `src/i18n/fr.ts`
- Test: `src/App.test.tsx`
- Modify: `README.md`, `docs/superpowers/specs/2026-09-22-voiture-societe-design.md` (statut)

**Interfaces:**
- Consumes : `ResultatComplet.atn: ResolutionAtn`, dont `voiture.valeurCatalogueCentimes` (tâches 2 et 4) ; `SaisieVoiture`, `MODES_ATN`, `ErreursSaisie` (tâche 5) ; `CARBURANTS`, `Carburant` (tâche 2).
- Produces : `formatDixMilliemes(dixMilliemes: number): string` ; prop `apercuAtnCentimes: number | null` de `FormulaireSituation`.

- [ ] **Step 1 : formater un taux en dix-millièmes (test d'abord)**

Ajoute à `src/utils/format.test.ts` (et `formatDixMilliemes` à son import) :

```ts
describe('formatDixMilliemes', () => {
  it.each([
    [9_400, '94 %'],
    [880, '8,8 %'],
    [550, '5,5 %'],
    [10_000, '100 %'],
  ])('%i → %s', (dixMilliemes, texte) => {
    expect(formatDixMilliemes(dixMilliemes)).toBe(texte)
  })
})
```

Run : `npx vitest run src/utils/format.test.ts` → FAIL.

Ajoute à `src/utils/format.ts` :

```ts
const NOMBRE_TAUX = new Intl.NumberFormat('fr-BE', { maximumFractionDigits: 2 })

/** Taux en dix-millièmes → « 8,8 % ». Espace ordinaire avant %, pour rester lisible dans une phrase. */
export function formatDixMilliemes(dixMilliemes: number): string {
  return `${NOMBRE_TAUX.format(dixMilliemes / 100)} %`
}
```

Run : `npx vitest run src/utils/format.test.ts` → PASS.

- [ ] **Step 2 : écrire les tests de l'interface (ils doivent échouer)**

Dans `src/App.test.tsx`, l'import de Testing Library devient `import { fireEvent, render, screen, within } from '@testing-library/react'`. Ajoute à la fin :

```ts
describe('App — voiture de société', () => {
  /** Le champ <input type="month"> ne se tape pas au clavier dans jsdom : on fixe sa valeur. */
  function choisirImmatriculation(mois: string) {
    fireEvent.change(screen.getByLabelText('Première immatriculation'), { target: { value: mois } })
  }

  it('calcule l’ATN depuis la voiture et l’affiche en aperçu', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Calculer depuis la voiture'))
    choisirImmatriculation('2025-02')
    expect(screen.getByText(`ATN : ${euros(26_589)} par mois`)).toBeInTheDocument()
    const attendu = calculerNet(
      { brutMensuelCentimes: 300_000, atnMensuelCentimes: 26_589, etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false },
      DATE,
    )
    expect(within(recapitulatif()).getByText(euros(attendu.netMensuelCentimes))).toBeInTheDocument()
  })

  it('explique le calcul de l’ATN dans le détail', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Calculer depuis la voiture'))
    choisirImmatriculation('2025-02')
    const detail = screen.getByRole('region', { name: 'Détail du calcul' })
    const ligne = within(detail).getByText('Avantage de toute nature').closest('li')
    expect(ligne).toHaveTextContent('45 000,00 € × 94 % × 6/7 × 8,8 % = 3 190,63 € par an, soit 265,89 € par mois.')
    expect(ligne).toHaveTextContent('Art. 36 § 2 CIR 92')
  })

  it('signale le minimum légal quand il s’applique', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Calculer depuis la voiture'))
    await user.selectOptions(screen.getByLabelText('Carburant'), 'electrique')
    const valeur = screen.getByLabelText('Valeur catalogue (€)')
    await user.clear(valeur)
    await user.type(valeur, '30000')
    choisirImmatriculation('2026-09')
    expect(screen.getByText(`ATN : ${euros(14_083)} par mois`)).toBeInTheDocument()
    const ligne = within(screen.getByRole('region', { name: 'Détail du calcul' })).getByText('Avantage de toute nature').closest('li')
    expect(ligne).toHaveTextContent('minimum légal')
  })

  it('désactive le CO₂ pour une voiture électrique', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Calculer depuis la voiture'))
    expect(screen.getByLabelText('Émissions de CO₂ (g/km)')).toBeEnabled()
    await user.selectOptions(screen.getByLabelText('Carburant'), 'electrique')
    expect(screen.getByLabelText('Émissions de CO₂ (g/km)')).toBeDisabled()
  })

  it('demande la première immatriculation tant qu’elle manque', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Calculer depuis la voiture'))
    expect(screen.getByText('Indiquez le mois de première immatriculation, au plus tard le mois du calcul.')).toBeInTheDocument()
  })

  it('refuse une valeur catalogue hors limites', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Calculer depuis la voiture'))
    choisirImmatriculation('2025-02')
    const valeur = screen.getByLabelText('Valeur catalogue (€)')
    await user.clear(valeur)
    await user.type(valeur, '800000')
    expect(screen.getByText('Indiquez une valeur catalogue entre 0,01 € et 770 000,00 €.')).toBeInTheDocument()
  })

  it('retient la contribution sur le net versé et bascule le libellé du récapitulatif', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    const contribution = screen.getByLabelText('Contribution personnelle mensuelle (€)')
    await user.clear(contribution)
    await user.type(contribution, '50')
    const recap = recapitulatif()
    expect(within(recap).getByText('Net versé sur le compte')).toBeInTheDocument()
    expect(within(recap).getByText(euros(226_133 - 5_000))).toBeInTheDocument()
    expect(within(recap).getByText(euros((226_133 - 5_000) * 12))).toBeInTheDocument()
  })

  it('ajoute la ligne « Contribution personnelle voiture » au détail', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    const contribution = screen.getByLabelText('Contribution personnelle mensuelle (€)')
    await user.clear(contribution)
    await user.type(contribution, '50')
    const detail = screen.getByRole('region', { name: 'Détail du calcul' })
    expect(within(detail).getByText('Contribution personnelle voiture').closest('li')).toHaveTextContent(euros(5_000))
    expect(within(detail).getByText('Net versé').closest('li')).toHaveTextContent(euros(226_133 - 5_000))
  })

  it('garde le champ du montant en mode « Je connais le montant »', () => {
    render(<App dateIso={DATE} />)
    expect(screen.getByLabelText('Je connais le montant')).toBeChecked()
    expect(screen.getByLabelText('Avantage de toute nature mensuel (€)')).toBeInTheDocument()
    expect(screen.queryByLabelText('Valeur catalogue (€)')).not.toBeInTheDocument()
  })
})
```

Si un montant apparaît deux fois dans le récapitulatif, remplace `getByText(x)` par `getAllByText(x)` avec `toHaveLength(2)`, comme ailleurs dans ce fichier ; ne relâche jamais une assertion pour autre chose.

Run : `npx vitest run src/App.test.tsx` → FAIL (les nouveaux tests).

- [ ] **Step 3 : ajouter les textes**

Dans `src/i18n/fr.ts` :

1. ajoute aux imports :
```ts
import type { Carburant } from '../engine/atnVoiture'
```
et l'import de `../engine/validation` devient `import type { CodeErreur, ModeAtn, SensCalcul } from '../engine/validation'` ;
2. dans `formulaire`, après `aideAtn`, ajoute :
```ts
    voiture: {
      titre: 'Voiture de société / avantage de toute nature',
      modes: { montant: 'Je connais le montant', voiture: 'Calculer depuis la voiture' } satisfies Record<ModeAtn, string>,
      valeurCatalogue: 'Valeur catalogue (€)',
      aideValeurCatalogue: 'Prix catalogue à l’état neuf, options et TVA comprises, sans les remises.',
      carburant: 'Carburant',
      carburants: { essence: 'Essence, LPG ou gaz naturel', diesel: 'Diesel', electrique: 'Électrique' } satisfies Record<Carburant, string>,
      co2: 'Émissions de CO₂ (g/km)',
      aideCo2:
        'Valeur du certificat de conformité ; pour une hybride rechargeable, la valeur pondérée. Les « fausses hybrides » suivent une règle propre, non prise en compte ici.',
      premiereImmatriculation: 'Première immatriculation',
      contribution: 'Contribution personnelle mensuelle (€)',
      aideContribution:
        'Montant que votre employeur retient pour l’usage privé de la voiture. Il réduit l’avantage imposable et se retire du net versé.',
      apercu: (montant: string) => `ATN : ${montant} par mois`,
    },
```
3. dans `lignesAvantages`, avant `netVerse`, ajoute :
```ts
    contributionVoiture: {
      libelle: 'Contribution personnelle voiture',
      explication:
        'Ce que votre employeur retient pour l’usage privé de la voiture de société. Elle réduit du même montant l’avantage imposable.',
      source: 'Art. 36 § 2 CIR 92 — intervention du bénéficiaire',
    },
```
et `netVerse` devient :
```ts
    netVerse: {
      libelle: 'Net versé',
      explication:
        'Ce qui arrive réellement sur votre compte : le net du salaire, moins votre part dans les titres-repas et la contribution voiture, plus l’indemnité de télétravail et les frais propres remboursés.',
      source: 'Net − part personnelle des titres-repas + indemnité de télétravail + frais propres − contribution voiture',
    },
```
4. après le bloc `lignesAvantages`, ajoute :
```ts
  atnVoiture: {
    /** « 45 000,00 € × 94 % × 6/7 × 8,8 % = 3 190,63 € par an[ ; le minimum légal …], soit 265,89 € par mois. » */
    explication: (p: { valeur: string; age: string; pourcentage: string; annuelFormule: string; minimum: string | null; mensuel: string }) =>
      `${p.valeur} × ${p.age} × 6/7 × ${p.pourcentage} = ${p.annuelFormule} par an${p.minimum === null ? '' : ` ; le minimum légal de ${p.minimum} par an s’applique`}, soit ${p.mensuel} par mois.`,
    contribution: (montant: string) => ` Contribution personnelle déduite : ${montant}.`,
    source: 'Art. 36 § 2 CIR 92 ; émissions de CO₂ de référence fixées chaque année par arrêté royal',
  },
```
5. dans `recapitulatif`, `detailNetVerse` prend un cinquième terme :
```ts
    detailNetVerse: (net: string, retenue: string, teletravail: string, fraisPropres: string, contribution: string) =>
      [`net légal ${net}`, retenue, teletravail, fraisPropres, contribution].filter((partie) => partie !== '').join(' '),
```
et, après `plusFraisPropres` :
```ts
    moinsContribution: (montant: string) => `− ${montant} de contribution voiture`,
```

- [ ] **Step 4 : le bloc voiture du formulaire**

Dans `src/components/FormulaireSituation.tsx` :

1. imports :
```ts
import type { ReactNode } from 'react'
import { CARBURANTS, type Carburant } from '../engine/atnVoiture'
import { REVENUS_CONJOINT, type RevenusConjoint } from '../engine/types'
import { MODES_ATN, SENS_CALCUL, type ErreursSaisie, type SaisieAvantages, type SaisieFormulaire, type SaisieVoiture } from '../engine/validation'
import { fr, texteErreur } from '../i18n/fr'
import { formatEuro } from '../utils/format'
```
2. `Props` gagne :
```ts
  /** ATN mensuel calculé depuis la voiture, pour l'aperçu. null hors mode voiture ou si le calcul n'aboutit pas. */
  apercuAtnCentimes: number | null
```
et la déstructuration des props de `FormulaireSituation` l'ajoute ;
3. `ChampAvantageProps` gagne `desactive?: boolean`, la déstructuration de `ChampAvantage` l'ajoute, et son `<input>` gagne `disabled={desactive}` ;
4. dans le corps de `FormulaireSituation`, après `erreurTexte`, ajoute :
```ts
  const v = saisie.voiture
  const tv = t.voiture
  const modifierVoiture = <K extends keyof SaisieVoiture>(champ: K, valeur: SaisieVoiture[K]) =>
    onChange('voiture', { ...v, [champ]: valeur })
```
5. **supprime** le bloc `<div>` du champ `atn` (de la `<div>` qui contient `<label htmlFor="atn"` jusqu'au `</div>` qui suit le paragraphe `atn-aide`) ;
6. juste **avant** le `<fieldset>` des avantages extralégaux (celui dont la légende est `{ta.titre}`), insère :
```tsx
        <fieldset className="border-t border-slate-200 pt-4 dark:border-slate-700">
          <legend className="font-medium">{tv.titre}</legend>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {MODES_ATN.map((mode) => (
              <label key={mode} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="modeAtn"
                  value={mode}
                  checked={v.mode === mode}
                  onChange={() => modifierVoiture('mode', mode)}
                  className="size-4 accent-blue-700"
                />
                {tv.modes[mode]}
              </label>
            ))}
          </div>

          {v.mode === 'montant' ? (
            <div className="mt-2">
              <label htmlFor="atn" className="text-sm font-medium">
                {t.atn}
              </label>
              <input
                id="atn"
                inputMode="decimal"
                autoComplete="off"
                value={saisie.atn}
                onChange={(e) => onChange('atn', e.target.value)}
                aria-invalid={erreurs.atn ? true : undefined}
                aria-describedby={erreurs.atn ? 'atn-erreur' : 'atn-aide'}
                className={CHAMP}
              />
              {erreurs.atn ? (
                <Erreur id="atn-erreur">{texteErreur(erreurs.atn, saisie.sens)}</Erreur>
              ) : (
                <p id="atn-aide" className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {t.aideAtn}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-2 space-y-3 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
              <ChampAvantage
                id="valeurCatalogue"
                libelle={tv.valeurCatalogue}
                valeur={v.valeurCatalogue}
                aide={tv.aideValeurCatalogue}
                erreur={erreurTexte(erreurs.valeurCatalogue)}
                onChange={(valeur) => modifierVoiture('valeurCatalogue', valeur)}
              />
              <div>
                <label htmlFor="carburant" className="text-sm font-medium">
                  {tv.carburant}
                </label>
                <select
                  id="carburant"
                  value={v.carburant}
                  onChange={(e) => modifierVoiture('carburant', e.target.value as Carburant)}
                  className={CHAMP}
                >
                  {CARBURANTS.map((carburant) => (
                    <option key={carburant} value={carburant}>
                      {tv.carburants[carburant]}
                    </option>
                  ))}
                </select>
              </div>
              <ChampAvantage
                id="co2"
                libelle={tv.co2}
                valeur={v.co2}
                aide={tv.aideCo2}
                erreur={erreurTexte(erreurs.co2)}
                desactive={v.carburant === 'electrique'}
                onChange={(valeur) => modifierVoiture('co2', valeur)}
              />
              <div>
                <label htmlFor="premiereImmatriculation" className="text-sm font-medium">
                  {tv.premiereImmatriculation}
                </label>
                <input
                  id="premiereImmatriculation"
                  type="month"
                  value={v.premiereImmatriculation}
                  onChange={(e) => modifierVoiture('premiereImmatriculation', e.target.value)}
                  aria-invalid={erreurs.premiereImmatriculation ? true : undefined}
                  aria-describedby={erreurs.premiereImmatriculation ? 'premiereImmatriculation-erreur' : undefined}
                  className={CHAMP}
                />
                {erreurs.premiereImmatriculation && (
                  <Erreur id="premiereImmatriculation-erreur">{texteErreur(erreurs.premiereImmatriculation, saisie.sens)}</Erreur>
                )}
              </div>
              {apercuAtnCentimes !== null && <p className="text-sm font-medium">{tv.apercu(formatEuro(apercuAtnCentimes))}</p>}
            </div>
          )}

          <div className="mt-3">
            <ChampAvantage
              id="contribution"
              libelle={tv.contribution}
              valeur={v.contribution}
              aide={tv.aideContribution}
              erreur={erreurTexte(erreurs.contribution)}
              onChange={(valeur) => modifierVoiture('contribution', valeur)}
            />
          </div>
        </fieldset>
```

Dans `src/App.tsx`, `<FormulaireSituation … />` gagne :

```tsx
              apercuAtnCentimes={ok?.complet.atn.voiture?.mensuelCentimes ?? null}
```

- [ ] **Step 5 : le détail du calcul**

Dans `src/components/DetailCalcul.tsx` :

1. imports :
```ts
import type { ResolutionAtn } from '../engine/atnVoiture'
import type { ResultatComplet } from '../engine/remuneration'
import type { SensCalcul } from '../engine/validation'
import { fr } from '../i18n/fr'
import { formatDixMilliemes, formatEuro } from '../utils/format'
import { LigneCalcul } from './LigneCalcul'
```
2. avant `lignesAvantages`, ajoute :
```ts
/** Explication et source de la ligne ATN quand elle vient de la voiture ou d'une contribution ; sinon null. */
function surchargeAtn(atn: ResolutionAtn): { explication: string; source: string } | null {
  const t = fr.atnVoiture
  const contribution = atn.contributionCentimes > 0 ? t.contribution(formatEuro(atn.contributionCentimes)) : ''
  if (atn.voiture === null) {
    return contribution === '' ? null : { explication: `${fr.lignes.atn.explication}${contribution}`, source: 'Saisie' }
  }
  const v = atn.voiture
  return {
    explication:
      t.explication({
        valeur: formatEuro(v.valeurCatalogueCentimes),
        age: formatDixMilliemes(v.coefficientAgeDixMilliemes),
        pourcentage: formatDixMilliemes(v.pourcentageCo2DixMilliemes),
        annuelFormule: formatEuro(v.annuelFormuleCentimes),
        minimum: v.minimumAppliqueCentimes === null ? null : formatEuro(v.minimumAppliqueCentimes),
        mensuel: formatEuro(v.mensuelCentimes),
      }) + contribution,
    source: t.source,
  }
}
```
3. `lignesAvantages` prend en compte la contribution :
```ts
function lignesAvantages(complet: ResultatComplet) {
  const { retenueTitresCentimes, teletravailCentimes, fraisPropresCentimes } = complet.avantages
  const contributionCentimes = complet.atn.contributionCentimes
  if (retenueTitresCentimes === 0 && teletravailCentimes === 0 && fraisPropresCentimes === 0 && contributionCentimes === 0) {
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
    ...(fraisPropresCentimes > 0
      ? [{ cle: 'fraisPropres', ...l.fraisPropres, sens: '+' as const, montantCentimes: fraisPropresCentimes }]
      : []),
    ...(contributionCentimes > 0
      ? [{ cle: 'contributionVoiture', ...l.contributionVoiture, sens: '-' as const, montantCentimes: contributionCentimes }]
      : []),
    { cle: 'netVerse', ...l.netVerse, sens: '=' as const, montantCentimes: complet.netVerseCentimes },
  ]
}
```
4. dans le rendu, la boucle sur `complet.resultat.lignes` utilise la surcharge pour la ligne `atn` :
```tsx
          {complet.resultat.lignes.map((ligne) => {
            const surcharge = ligne.id === 'atn' ? surchargeAtn(complet.atn) : null
            return (
              <LigneCalcul
                key={ligne.id}
                libelle={fr.lignes[ligne.id].libelle}
                explication={
                  surcharge?.explication ??
                  (sens === 'netVersBrut' && ligne.id === 'brut' ? fr.detail.explicationBrutTrouve : fr.lignes[ligne.id].explication)
                }
                sens={ligne.sens}
                montantCentimes={ligne.montantCentimes}
                source={surcharge?.source ?? ligne.source}
              />
            )
          })}
```

- [ ] **Step 6 : le récapitulatif**

Dans `src/components/Recapitulatif.tsx`, remplace la déclaration de `effetSurArgentVerse` (et son commentaire) par :

```ts
  const contributionCentimes = complet?.atn.contributionCentimes ?? 0
  /** Titres-repas, télétravail, frais propres ou contribution voiture : ce qui arrive sur le compte diffère du net légal. */
  const effetSurArgentVerse =
    avantages !== null &&
    (avantages.retenueTitresCentimes > 0 ||
      avantages.teletravailCentimes > 0 ||
      avantages.fraisPropresCentimes > 0 ||
      contributionCentimes > 0)
```

et l'appel de `t.detailNetVerse` gagne un cinquième argument, après celui des frais propres :

```ts
          contributionCentimes > 0 ? t.moinsContribution(formatEuro(contributionCentimes)) : '',
```

La ligne annuelle suit déjà `effetSurArgentVerse` : rien d'autre à changer.

- [ ] **Step 7 : vérifier l'interface**

Run : `npx vitest run src/App.test.tsx src/utils/format.test.ts`
Expected : PASS.

- [ ] **Step 8 : README et statut de la spec**

Dans `README.md` :

1. le deuxième paragraphe devient :
```
Chaque ligne du détail (ONSS, bonus à l'emploi, précompte professionnel, bonus fiscal, cotisation spéciale) cite sa source officielle. Les avantages extralégaux exonérés — titres-repas, indemnité de télétravail, écochèques — s'ajoutent au calcul pour donner le net réellement versé sur le compte. L'avantage de toute nature d'une voiture de société se saisit tel qu'il figure sur la fiche de paie, ou se calcule depuis la voiture.
```
2. la puce « Avantage de toute nature (voiture de société) : … » devient :
```
- Avantage de toute nature (voiture de société) : saisi tel qu'il figure sur la fiche, ou calculé depuis la voiture selon l'art. 36 § 2 CIR 92 — valeur catalogue × coefficient d'âge × 6/7 × pourcentage CO₂ (5,5 % aux émissions de référence, ± 0,1 % par gramme, entre 4 % et 18 %, 4 % pour l'électrique), avec un minimum annuel. Le mois de la première immatriculation compte comme le premier mois. L'ATN entre dans la base du précompte mais ne se retire pas du net : le brut ne le contenait pas. La contribution personnelle réduit l'ATN imposable et se retire du net versé. `tools/reference/reference.py` recalcule les cas voiture indépendamment du moteur.
```
3. dans « Sources », ajoute :
```
- Art. 36 § 2 CIR 92 (avantage de toute nature des voitures de société) et arrêtés royaux fixant les émissions de CO₂ de référence 2025 et 2026 ; minimum annuel 2026 de 1 690 € (STATUT)
```
où `STATUT` est remplacé par « confirmé : <référence> » ou par « sous réserve : texte officiel non trouvé », selon le résultat de la tâche 1 que le contrôleur précise dans ta mission ;
4. dans « Limites de la V1 », « Pas d'ouvriers, de temps partiel, de 13e mois, de pécule de vacances, ni de voiture de société. » devient :
```
Pas d'ouvriers, de temps partiel, de 13e mois ni de pécule de vacances. Voiture de société : ni la règle des « fausses hybrides », ni les voitures sans donnée CO₂, ni la cotisation CO₂ patronale.
```

Dans la spec, la ligne `- **Statut :** …` devient `- **Statut :** appliquée`.

- [ ] **Step 9 : vérifier et commiter**

Run : `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`
Expected : tout vert.

```bash
git add src/utils/format.ts src/utils/format.test.ts src/components src/App.tsx src/App.test.tsx src/i18n/fr.ts README.md docs/superpowers/specs/2026-09-22-voiture-societe-design.md
git commit -F - <<'EOF'
feat: voiture de société dans le formulaire, le détail et le récapitulatif

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```
