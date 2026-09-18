# Vérification par fiches de paie 2025 (V2.3) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** reproduire au centime deux fiches de paie réelles de 2025, pour confronter enfin le moteur à un document officiel.

**Architecture :** une période de paramètres 2025 s'ajoute aux deux périodes 2026. `calculerNet` apprend l'avantage de toute nature (montant donné) : il entre dans la base du précompte et sort du net. Les avantages gagnent un champ « frais propres à l'employeur », qui s'ajoute au net versé. Les deux fiches deviennent des cas de référence `verifie: true`, dans un fichier écrit à la main et sans aucune donnée personnelle.

**Tech Stack :** React 19, TypeScript 6 strict, Vite 8, Tailwind CSS 4, Vitest 4 + jsdom + React Testing Library, oxlint, Node 25, Python 3 (script de référence).

**Spec :** `docs/superpowers/specs/2026-09-18-verification-fiches-2025-design.md`. La lire avant de commencer, surtout § 1 (la règle d'or), § 2 (sources), § 3 (moteur) et § 5 (cas de référence).

## Global Constraints

- Dossier : `E:\ALL DOCUMENTS\PROJECTS CODE\Wage_Calculator`. Commandes lancées depuis ce dossier, dans PowerShell.
- Branche : **`feat/verification-fiches-2025`** (déjà créée, la spec y est commitée). **Ne jamais pousser ni merger.**
- **Un commit par tâche**, en français (`feat:`, `test:`, `chore:` ou `docs:`), message terminé par une ligne vide puis exactement `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Copier ce trailer mot pour mot, sans y mettre son propre nom de modèle.
- Chaque tâche se termine avec `npm test`, `npm run typecheck` et `npm run lint` au vert.
- **Fichiers en UTF-8 avec accents intacts (é, à, ’, « », →, —) et fins de ligne LF.** Avant chaque commit : `git ls-files --eol` en `w/lf` sur les fichiers touchés, et `git diff` des fichiers existants limité aux hunks voulus.
- Moteur : **aucun** import de React, du DOM ou du navigateur dans `src/engine/`.
- Montants en **centimes entiers**, arrondis par `diviserArrondi` / `appliquerTaux` uniquement.
- **LA RÈGLE D'OR (spec § 1) : on n'ajuste jamais un paramètre pour faire coller un résultat.** Les valeurs viennent du texte officiel. Si un écart persiste, s'arrêter et signaler BLOCKED avec les chiffres.
- **Aucune donnée personnelle** dans le dépôt : ni nom, ni adresse, ni NISS, ni IBAN, ni employeur. Uniquement des montants et des dates.
- `src/engine/__tests__/references.json` est généré par `python tools/reference/reference.py` ; `reculMax.json` par `npm run verifier:recul`. Jamais modifiés à la main.
- **Aucune nouvelle dépendance npm.**
- Valeurs de référence des fiches (spec § 5) : brut 273 294 ; ONSS 35 720 ; bonus A 12 059 et B 1 210 ; imposable 250 843 ; ATN 27 017 (juillet) et 26 145 (septembre) ; précompte avant bonus 49 876 et 49 503 ; bonus fiscal 4 632 ; cotisation spéciale 1 630 ; titres 19 et 22 × 109 ; frais propres 10 084 et 11 677 ; net versé 211 982 et 213 621.

## Structure des fichiers

| Fichier | Responsabilité | Tâche |
|---|---|---|
| `src/engine/parametres/p2025.ts` | période 01/02/2025 → 31/12/2025 | 1 |
| `src/engine/parametres/index.ts` | + P2025 dans `PERIODES` | 1 |
| `src/engine/parametres/parametres.test.ts` | chevauchement, trou de 2026, valeurs 2025 | 1 |
| `src/engine/__tests__/reculMax.json` | regénéré (3 périodes) | 1 |
| `src/engine/types.ts` | `atnMensuelCentimes`, `atn`, `imposablePrecompte`, 2 `IdLigne` | 2 |
| `src/engine/calculerNet.ts` | ATN dans la base du précompte et hors du net | 2 |
| `src/engine/__tests__/situations.ts`, `validation.ts`, tests moteur | champ ATN à 0 | 2 |
| `tools/reference/reference.py` + `references.json` | `atnMensuelCentimes: 0` dans les 74 cas | 2 |
| `src/i18n/fr.ts` | libellés des deux lignes ATN | 2 |
| `src/engine/avantages.ts`, `remuneration.ts` | frais propres à l'employeur | 3 |
| `src/engine/__tests__/fichesReelles.json` (+ test) | les deux fiches, `verifie: true` | 4 |
| `src/engine/validation.ts`, `src/components/`, `fr.ts` | saisie ATN et frais propres | 5 |
| `README.md` | documentation | 6 |

---

### Task 1 : Période de paramètres 2025

**Files:**
- Create: `src/engine/parametres/p2025.ts`
- Modify: `src/engine/parametres/index.ts`
- Test: `src/engine/parametres/parametres.test.ts`
- Regenerate: `src/engine/__tests__/reculMax.json`

**Interfaces:**
- Consumes : `Parametres` et `ParametresAvantages` (`src/engine/parametres/types.ts`) ; `P2026_07` pour les blocs repris ; `PERIODES` et `getParametres` (`index.ts`).
- Produces : `export const P2025: Parametres` avec `id: 'P2025'`, `valideDu: '2025-02-01'`, `valideAu: '2025-12-31'` ; `PERIODES` devient `[P2025, P2026_07, P2026_09]`.

- [ ] **Step 1 : Trouver la formule-clé 2025 officielle**

C'est l'étape qui porte tout le risque du projet. Chercher le document du SPF Finances : *Formule-clé pour le calcul du précompte professionnel sur les rémunérations payées à partir du 1er janvier 2025* (arrêté royal du 12 décembre 2024, publié au Moniteur belge ; la page https://finance.belgium.be/fr/entreprises/personnel_et_remuneration/precompte_professionnel héberge habituellement le PDF).

Relever **exactement** :
- les bornes et les taux des quatre tranches du barème annuel ;
- la réduction pour quotité exemptée d'impôt (montant annuel soustrait à l'impôt de base) ;
- le taux des frais professionnels forfaitaires et leur plafond annuel ;
- les pourcentages du bonus fiscal à l'emploi pour les volets A et B.

Noter pour chaque valeur le numéro de section du document. Ces références iront en commentaire dans `p2025.ts`.

**Repères de contrôle, à ne pas confondre avec des cibles à atteindre :** des sources secondaires annoncent des tranches de 16 310 / 28 790 / 49 820 €, une quotité exemptée de 10 900 € et des frais plafonnés à 5 930 €. Avec ces valeurs, le précompte de la fiche de juillet vaut 516,61 € au lieu de 498,76 €. Elles sont donc soit fausses, soit incomplètes : ne pas s'en servir sans confirmation officielle.

Si le document officiel reste introuvable : **s'arrêter et signaler BLOCKED**, en listant les sources consultées. Ne pas inventer de valeurs, ne pas les déduire des fiches.

- [ ] **Step 2 : Vérifier les valeurs trouvées contre la fiche de juillet**

Avant d'écrire quoi que ce soit dans le dépôt, faire le calcul à la main (ou dans un script jetable, dans le dossier temporaire de la session) :

```
base mensuelle   = 250 843 + 27 017 = 277 860 centimes
base annuelle    = base mensuelle × 12
frais            = min(taux × base annuelle, plafond)
net imposable    = base annuelle − frais
impôt de base    = barème(net imposable) − réduction pour quotité exemptée
précompte mensuel avant bonus = arrondi(impôt de base / 12)
```

Attendu : **49 876 centimes** (498,76 €). Refaire avec l'ATN de septembre (26 145) : attendu **49 503**.

- Si les deux tombent juste : continuer à l'étape 3.
- **Si ça ne tombe pas juste : s'arrêter et signaler BLOCKED** avec les valeurs officielles relevées, le résultat obtenu et l'écart. Ne jamais modifier une valeur pour réduire l'écart (règle d'or, spec § 1).

- [ ] **Step 3 : Écrire les tests de la période 2025**

Dans `src/engine/parametres/parametres.test.ts` :

1. Remplacer le test de contiguïté :

```ts
  it('a des périodes contiguës, sans chevauchement', () => {
    for (let i = 1; i < PERIODES.length; i++) {
      const finPrecedente = new Date(`${PERIODES[i - 1].valideAu}T00:00:00Z`)
      const debut = new Date(`${PERIODES[i].valideDu}T00:00:00Z`)
      expect(debut.getTime() - finPrecedente.getTime()).toBe(24 * 60 * 60 * 1000)
    }
  })
```

par :

```ts
  it('a des périodes triées et sans chevauchement (des trous sont permis)', () => {
    for (let i = 1; i < PERIODES.length; i++) {
      expect(PERIODES[i].valideDu > PERIODES[i - 1].valideAu).toBe(true)
    }
  })

  it('chaque période commence avant sa propre fin', () => {
    for (const periode of PERIODES) {
      expect(periode.valideDu < periode.valideAu).toBe(true)
    }
  })
```

2. Ajouter dans le bloc `describe('getParametres', …)`, à la suite des cas existants :

```ts
  it.each([
    ['2025-02-01', 'P2025'],
    ['2025-07-25', 'P2025'],
    ['2025-09-26', 'P2025'],
    ['2025-12-31', 'P2025'],
  ])('le %s utilise %s', (date, id) => {
    expect(getParametres(date).id).toBe(id)
  })

  it.each(['2025-01-31', '2026-03-15'])('lève PeriodeNonCouverte pour le %s (hors périodes intégrées)', (date) => {
    expect(() => getParametres(date)).toThrow(PeriodeNonCouverte)
  })
```

3. Ajouter à la fin du fichier :

```ts
describe('paramètres 2025', () => {
  const P2025 = getParametres('2025-07-25')

  it('reprend les volets du bonus à l’emploi ONSS 2025/3 (employés, à partir du 01/02/2025)', () => {
    expect(P2025.bonusEmploi.voletA).toEqual({
      maxCentimes: 12_059,
      plancherCentimes: 277_783,
      plafondCentimes: 327_148,
      coefDixMilliemes: 2443,
    })
    expect(P2025.bonusEmploi.voletB).toEqual({
      maxCentimes: 16_262,
      plancherCentimes: 217_525,
      plafondCentimes: 277_783,
      coefDixMilliemes: 2699,
    })
  })

  it('garde le taux ONSS personnel et la part minimale des titres-repas', () => {
    expect(P2025.onssTauxPersonnelDixMilliemes).toBe(1307)
    expect(P2025.avantages.titresRepasPartTravailleurMinCentimes).toBe(109)
  })
})
```

- [ ] **Step 4 : Vérifier qu'ils échouent**

Run : `npx vitest run src/engine/parametres/parametres.test.ts`
Expected : FAIL — `getParametres('2025-07-25')` lève `PeriodeNonCouverte`, la période 2025 n'existe pas encore.

- [ ] **Step 5 : Écrire la période 2025**

Créer `src/engine/parametres/p2025.ts`. Le bloc `precompte` est rempli avec les valeurs officielles relevées à l'étape 1, chacune suivie d'un commentaire citant sa section :

```ts
import { P2026_07 } from './p2026-07'
import type { Parametres } from './types'

/**
 * Règles du 01/02/2025 au 31/12/2025.
 * Cette période sert aux cas de référence issus de fiches de paie réelles (spec V2.3) ;
 * l'interface calcule toujours à la date du jour.
 *
 * Sources : ONSS-BE-2025/3 (bonus à l'emploi, à partir du 01/02/2025), SPF-FC-2025
 * (formule-clé du précompte 2025), ONSS-CSSS-2025, ONSS-TR-2025.
 */
export const P2025: Parametres = {
  id: 'P2025',
  valideDu: '2025-02-01',
  valideAu: '2025-12-31',
  onssTauxPersonnelDixMilliemes: 1307,

  // ONSS-BE-2025/3, colonne employés, à partir du 01/02/2025 (CCT n° 43-17).
  bonusEmploi: {
    voletA: { maxCentimes: 12_059, plancherCentimes: 277_783, plafondCentimes: 327_148, coefDixMilliemes: 2443 },
    voletB: { maxCentimes: 16_262, plancherCentimes: 217_525, plafondCentimes: 277_783, coefDixMilliemes: 2699 },
  },

  // SPF-FC-2025 : valeurs relevées dans le document officiel (étape 1 du plan),
  // chacune commentée avec le numéro de section dont elle provient.
  precompte: {
    // … à remplir avec les valeurs officielles 2025 …
  },

  // ONSS-CSSS-2025 : mêmes tranches qu'en 2026 selon les fiches de paie (16,30 € à 2 732,94 €
  // de brut, imposition individuelle) ; à confirmer sur la page ONSS 2025.
  cotisationSpeciale: P2026_07.cotisationSpeciale,

  // ONSS-TR-2025 : part minimale du travailleur 1,09 €, confirmée par les fiches.
  // Les autres plafonds ne servent à aucun cas de référence 2025 et reprennent les valeurs
  // 2026 : ils ne sont PAS vérifiés pour 2025.
  avantages: { ...P2026_07.avantages, titresRepasPartTravailleurMinCentimes: 109 },

  // Salaire minimum : non vérifié pour 2025, ne sert qu'à l'alerte de l'interface,
  // qui ne calcule jamais à une date de 2025.
  rmmmgCentimes: P2026_07.rmmmgCentimes,
}
```

- [ ] **Step 6 : Déclarer la période**

Dans `src/engine/parametres/index.ts` :

```ts
import { P2026_07 } from './p2026-07'
```

devient :

```ts
import { P2025 } from './p2025'
import { P2026_07 } from './p2026-07'
```

et :

```ts
export const PERIODES: readonly Parametres[] = [P2026_07, P2026_09]
```

devient :

```ts
export const PERIODES: readonly Parametres[] = [P2025, P2026_07, P2026_09]
```

- [ ] **Step 7 : Vérifier les tests de paramètres**

Run : `npx vitest run src/engine/parametres/parametres.test.ts`
Expected : PASS.

- [ ] **Step 8 : Regénérer la mesure du recul**

Run : `npx vitest run src/engine/__tests__/reculMax.test.ts`
Expected : FAIL — la liste des périodes a changé, le garde-fou réclame une nouvelle mesure.

Run : `npm run verifier:recul`
Expected : 228 mesures (3 périodes × 76 situations), environ 3 à 7 minutes ; lancer en arrière-plan si l'outil shell plafonne. Les deux périodes 2026 doivent garder `reculMaxCentimes: 514` à `brutCentimes: 109510`. La période 2025 reçoit sa propre mesure, qui doit rester **sous 1 000** : sinon, s'arrêter et signaler.

- [ ] **Step 9 : Vérifier l'ensemble**

Run : `npm test; npm run typecheck; npm run lint`
Expected : tout au vert (520 tests existants + les nouveaux).

- [ ] **Step 10 : Commit**

```powershell
git add src/engine/parametres/p2025.ts src/engine/parametres/index.ts src/engine/parametres/parametres.test.ts src/engine/__tests__/reculMax.json
git commit -m @'
feat: période de paramètres 2025 pour la vérification par fiches de paie

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
'@
```

---

### Task 2 : Avantage de toute nature dans le calcul

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/calculerNet.ts`
- Modify: `src/engine/__tests__/situations.ts`, `src/engine/validation.ts`
- Modify: `src/engine/calculerNet.test.ts`, `src/engine/calculerBrut.test.ts`, `src/engine/remuneration.test.ts`
- Modify: `tools/reference/reference.py`, puis regénérer `src/engine/__tests__/references.json`
- Modify: `src/i18n/fr.ts`

**Interfaces:**
- Consumes : `Situation`, `Intermediaires`, `Ligne`, `IdLigne` (`types.ts`) ; `calculerNet(situation, dateIso)`.
- Produces : `Situation.atnMensuelCentimes: number` (donc `SituationFamiliale` le porte aussi, puisqu'il n'ôte que `brutMensuelCentimes`) ; `Intermediaires.atn` et `Intermediaires.imposablePrecompte` ; `IdLigne` gagne `'atn'` et `'atnRetenu'`.

- [ ] **Step 1 : Écrire les tests**

Dans `src/engine/calculerNet.test.ts`, ajouter `atnMensuelCentimes: 0,` à la constante `ISOLE_3000`, puis ajouter à la fin du fichier :

```ts
describe('calculerNet — avantage de toute nature', () => {
  const ISOLE_3000_ATN: Situation = { ...ISOLE_3000, atnMensuelCentimes: 20_000 }

  it('un ATN nul ne change rien', () => {
    expect(calculerNet({ ...ISOLE_3000, atnMensuelCentimes: 0 }, '2026-09-14')).toEqual(calculerNet(ISOLE_3000, '2026-09-14'))
  })

  it('ajoute l’ATN à la base du précompte', () => {
    const sans = calculerNet(ISOLE_3000, '2026-09-14')
    const avec = calculerNet(ISOLE_3000_ATN, '2026-09-14')
    expect(avec.intermediaires.imposableMensuel).toBe(sans.intermediaires.imposableMensuel)
    expect(avec.intermediaires.imposablePrecompte).toBe(sans.intermediaires.imposableMensuel + 20_000)
    expect(avec.intermediaires.precompteAvantBonus).toBeGreaterThan(sans.intermediaires.precompteAvantBonus)
  })

  it('ne coûte au net que l’impôt qu’il fait naître (l’ATN n’est pas retiré du net)', () => {
    const sans = calculerNet(ISOLE_3000, '2026-09-14')
    const avec = calculerNet(ISOLE_3000_ATN, '2026-09-14')
    const impotSupplementaire = avec.intermediaires.precompte - sans.intermediaires.precompte
    expect(avec.netMensuelCentimes).toBe(sans.netMensuelCentimes - impotSupplementaire)
    expect(avec.intermediaires.atn).toBe(20_000)
  })

  it('ajoute les deux lignes d’ATN au détail, et leur somme signée redonne le net', () => {
    const r = calculerNet(ISOLE_3000_ATN, '2026-09-14')
    expect(r.lignes.map((l) => l.id)).toEqual([
      'brut', 'onss', 'bonusVoletA', 'bonusVoletB', 'imposableMensuel', 'atn',
      'precompteAvantBonus', 'bonusFiscal', 'cotisationSpeciale', 'atnRetenu', 'net',
    ])
    let somme = 0
    for (const ligne of r.lignes) {
      if (ligne.id === 'brut') somme = ligne.montantCentimes
      else if (ligne.sens === '+') somme += ligne.montantCentimes
      else if (ligne.sens === '-') somme -= ligne.montantCentimes
    }
    expect(somme).toBe(r.netMensuelCentimes)
  })

  it('n’ajoute aucune ligne d’ATN quand il est nul', () => {
    const r = calculerNet(ISOLE_3000, '2026-09-14')
    expect(r.lignes.some((l) => l.id === 'atn' || l.id === 'atnRetenu')).toBe(false)
  })

  it('ne touche ni à l’ONSS, ni au bonus, ni à la cotisation spéciale', () => {
    const sans = calculerNet(ISOLE_3000, '2026-09-14').intermediaires
    const avec = calculerNet(ISOLE_3000_ATN, '2026-09-14').intermediaires
    expect(avec.onss).toBe(sans.onss)
    expect(avec.bonusSocial).toBe(sans.bonusSocial)
    expect(avec.cotisationSpeciale).toBe(sans.cotisationSpeciale)
  })
})
```

- [ ] **Step 2 : Vérifier qu'ils échouent**

Run : `npx vitest run src/engine/calculerNet.test.ts`
Expected : FAIL — `atnMensuelCentimes` n'existe pas sur `Situation`.

- [ ] **Step 3 : Étendre les types**

Dans `src/engine/types.ts` :

1. Dans `Situation`, ajouter après `brutMensuelCentimes: number` :

```ts
  /** Avantage de toute nature mensuel (voiture de société), montant déjà calculé. 0 si aucun. */
  atnMensuelCentimes: number
```

2. Dans `Intermediaires`, ajouter après `imposableMensuel: number` :

```ts
  atn: number
  /** imposableMensuel + atn : la base du précompte professionnel. */
  imposablePrecompte: number
```

3. Dans `IdLigne`, ajouter `'atn'` après `'imposableMensuel'` et `'atnRetenu'` après `'cotisationSpeciale'`.

- [ ] **Step 4 : Faire entrer l'ATN dans le calcul**

Dans `src/engine/calculerNet.ts` :

1. Remplacer :

```ts
  const imposableMensuel = brut - onssNet
  const precompte = calculerPrecompte(imposableMensuel, bonus, situation, parametres)
  const cotisationSpeciale = calculerCotisationSpeciale(brut, situation, parametres)
  const net = brut - onssNet - precompte.precompte - cotisationSpeciale
```

par :

```ts
  const imposableMensuel = brut - onssNet
  // L'avantage de toute nature est imposable mais pas soumis à l'ONSS du travailleur :
  // il entre dans la base du précompte, puis se retire du net puisqu'il n'est pas versé.
  const atn = situation.atnMensuelCentimes
  const imposablePrecompte = imposableMensuel + atn
  const precompte = calculerPrecompte(imposablePrecompte, bonus, situation, parametres)
  const cotisationSpeciale = calculerCotisationSpeciale(brut, situation, parametres)
  // Le net ne perd pas l'ATN : le brut ne le contenait pas. L'avantage ne coûte que l'impôt
  // qu'il fait naître. Les deux lignes du détail (+ puis −) s'annulent, comme sur une fiche.
  const net = brut - onssNet - precompte.precompte - cotisationSpeciale
```

2. Dans l'objet `intermediaires`, ajouter après `imposableMensuel,` :

```ts
    atn,
    imposablePrecompte,
```

3. Remplacer le tableau `lignes` par :

```ts
  const lignes: Ligne[] = [
    { id: 'brut', sens: '=', montantCentimes: brut, source: 'Saisie' },
    { id: 'onss', sens: '-', montantCentimes: onss, source: 'ONSS — cotisation personnelle' },
    { id: 'bonusVoletA', sens: '+', montantCentimes: bonus.voletA, source: 'ONSS-BE-2026/3, volet A' },
    { id: 'bonusVoletB', sens: '+', montantCentimes: bonus.voletB, source: 'ONSS-BE-2026/3, volet B' },
    { id: 'imposableMensuel', sens: '=', montantCentimes: imposableMensuel, source: 'SPF-FC-2026 n° 7' },
    ...(atn > 0
      ? [{ id: 'atn' as const, sens: '+' as const, montantCentimes: atn, source: 'Avantage de toute nature imposable' }]
      : []),
    { id: 'precompteAvantBonus', sens: '-', montantCentimes: precompte.precompteAvantBonus, source: 'SPF-FC-2026 n° 7 à 16, annexes 1 à 5' },
    { id: 'bonusFiscal', sens: '+', montantCentimes: precompte.bonusFiscal, source: 'SPF-FC-2026 n° 20 et 21' },
    { id: 'cotisationSpeciale', sens: '-', montantCentimes: cotisationSpeciale, source: 'ONSS-CSSS-2026/3' },
    ...(atn > 0
      ? [{ id: 'atnRetenu' as const, sens: '-' as const, montantCentimes: atn, source: 'Avantage non versé en argent' }]
      : []),
    { id: 'net', sens: '=', montantCentimes: net, source: 'Brut − ONSS net − précompte − cotisation spéciale' },
  ]
```

Les deux lignes d'ATN s'annulent dans la somme signée : le net reste le brut moins les retenues, et l'avantage ne coûte que l'impôt qu'il fait naître.

- [ ] **Step 5 : Ajouter les libellés**

Dans `src/i18n/fr.ts`, bloc `lignes`, ajouter après l'entrée `imposableMensuel` :

```ts
    atn: {
      libelle: 'Avantage de toute nature',
      explication:
        'Valeur imposable d’un avantage reçu en nature, par exemple une voiture de société. Il n’est pas versé en argent, mais il augmente la base du précompte professionnel.',
    },
```

et après l'entrée `cotisationSpeciale` :

```ts
    atnRetenu: {
      libelle: 'Avantage de toute nature (retenu)',
      explication: 'Le même montant est retiré du net : l’avantage a déjà été reçu en nature, il n’arrive pas sur le compte.',
    },
```

- [ ] **Step 6 : Mettre les appelants à zéro**

Le champ est obligatoire : chaque littéral `Situation` ou `SituationFamiliale` doit le porter.

1. `src/engine/__tests__/situations.ts` : ajouter `atnMensuelCentimes: 0,` dans les trois fabriques d'objets (isolé, parent isolé, conjoint).
2. `src/engine/validation.ts`, dans `validerSaisie`, objet `famille` : ajouter `atnMensuelCentimes: 0,` après `etatCivil: saisie.etatCivil,` (la saisie viendra à la tâche 5).
3. `src/engine/calculerBrut.test.ts` : ajouter `atnMensuelCentimes: 0,` aux constantes `ISOLE` et `CONJOINT_AVEC_REVENUS`.
4. `src/engine/remuneration.test.ts` : ajouter `atnMensuelCentimes: 0,` à la constante `ISOLE` et à la situation familiale « marié 2 enfants » de `COMBINAISONS`.

- [ ] **Step 7 : Regénérer les 74 cas de référence**

Dans `tools/reference/reference.py`, remplacer :

```python
def situation(etat, conjoint=None, enfants=0, parent_isole=False):
    return {"etatCivil": etat, "revenusConjoint": conjoint, "enfantsACharge": enfants, "parentIsole": parent_isole}
```

par :

```python
def situation(etat, conjoint=None, enfants=0, parent_isole=False):
    # atnMensuelCentimes : les 74 cas de référence sont tous sans avantage de toute nature.
    return {
        "etatCivil": etat,
        "revenusConjoint": conjoint,
        "enfantsACharge": enfants,
        "parentIsole": parent_isole,
        "atnMensuelCentimes": 0,
    }
```

Run : `python tools/reference/reference.py`
Expected : `references.json` regénéré. **Vérification décisive de non-régression** : `git diff src/engine/__tests__/references.json` ne doit montrer que l'ajout du champ `atnMensuelCentimes` dans les 74 situations. Aucune valeur de `attendu` ne doit changer. Si une valeur attendue bouge, s'arrêter et signaler.

- [ ] **Step 8 : Vérifier qu'ils passent**

Run : `npm test; npm run typecheck; npm run lint`
Expected : tout au vert, dont les 74 cas de référence inchangés.

- [ ] **Step 9 : Commit**

```powershell
git add src/engine/types.ts src/engine/calculerNet.ts src/engine/calculerNet.test.ts src/engine/calculerBrut.test.ts src/engine/remuneration.test.ts src/engine/__tests__/situations.ts src/engine/validation.ts src/i18n/fr.ts tools/reference/reference.py src/engine/__tests__/references.json
git commit -m @'
feat: avantage de toute nature dans la base du précompte et hors du net

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
'@
```

---

### Task 3 : Frais propres à l'employeur

**Files:**
- Modify: `src/engine/avantages.ts`
- Test: `src/engine/avantages.test.ts`
- Modify: `src/engine/remuneration.ts`
- Test: `src/engine/remuneration.test.ts`
- Modify: `src/engine/validation.ts`

**Interfaces:**
- Consumes : `Avantages`, `ResultatAvantages`, `AVANTAGES_AUCUN`, `calculerAvantages` (`avantages.ts`) ; `calculerRemuneration` et `calculerBrutDepuisNetVerse` (`remuneration.ts`).
- Produces : `Avantages.fraisPropresEmployeur: { actif: boolean; montantMensuelCentimes: number }` ; `ResultatAvantages.fraisPropresCentimes: number` ; `netVerse = net légal − retenue titres + télétravail + frais propres`.

- [ ] **Step 1 : Écrire les tests**

Ajouter à la fin de `src/engine/avantages.test.ts` :

```ts
describe('calculerAvantages — frais propres à l’employeur', () => {
  it('reprend le montant tel quel, sans plafond ni alerte', () => {
    const r = calculerAvantages(avantages({ fraisPropresEmployeur: { actif: true, montantMensuelCentimes: 50_000 } }), SEPT)
    expect(r.fraisPropresCentimes).toBe(50_000)
    expect(r.alertes).toEqual([])
  })

  it('ignore des frais inactifs', () => {
    const r = calculerAvantages(avantages({ fraisPropresEmployeur: { actif: false, montantMensuelCentimes: 50_000 } }), SEPT)
    expect(r.fraisPropresCentimes).toBe(0)
  })
})
```

Ajouter à la fin de `src/engine/remuneration.test.ts` :

```ts
describe('calculerRemuneration — frais propres à l’employeur', () => {
  const AVEC_FRAIS: Avantages = {
    ...AVANTAGES_AUCUN,
    fraisPropresEmployeur: { actif: true, montantMensuelCentimes: 10_084 },
  }

  it('ajoute les frais au net versé, sans toucher au salaire', () => {
    const complet = calculerRemuneration(ISOLE_3000, AVEC_FRAIS, SEPT)
    expect(complet.resultat).toEqual(calculerNet(ISOLE_3000, SEPT))
    expect(complet.avantages.fraisPropresCentimes).toBe(10_084)
    expect(complet.netVerseCentimes).toBe(226_133 + 10_084)
    expect(complet.totalMensuelCentimes).toBe(226_133 + 10_084)
  })

  it('les frais décalent la cible du net versé → brut', () => {
    const r = calculerBrutDepuisNetVerse(ISOLE, AVEC_FRAIS, 226_133 + 10_084, SEPT)
    expect(r.brutCentimes).toBe(299_996)
    expect(r.complet.netVerseCentimes).toBeGreaterThanOrEqual(226_133 + 10_084)
  })
})
```

- [ ] **Step 2 : Vérifier qu'ils échouent**

Run : `npx vitest run src/engine/avantages.test.ts src/engine/remuneration.test.ts`
Expected : FAIL — `fraisPropresEmployeur` n'existe pas sur `Avantages`.

- [ ] **Step 3 : Étendre les avantages**

Dans `src/engine/avantages.ts` :

1. Dans `Avantages`, ajouter après la ligne `ecocheques: …` :

```ts
  /** Frais réels remboursés par l'employeur (déplacements, matériel) : nets, sans plafond ONSS. */
  fraisPropresEmployeur: { actif: boolean; montantMensuelCentimes: number }
```

2. Dans `ResultatAvantages`, ajouter après `ecochequesAnnuelCentimes: number` :

```ts
  fraisPropresCentimes: number
```

3. Dans `AVANTAGES_AUCUN`, ajouter :

```ts
  fraisPropresEmployeur: { actif: false, montantMensuelCentimes: 0 },
```

4. Dans `calculerAvantages`, avant le `return`, ajouter :

```ts
  // Frais réels justifiés : aucun plafond ONSS, donc aucune alerte possible.
  const fraisPropresCentimes = avantages.fraisPropresEmployeur.actif
    ? avantages.fraisPropresEmployeur.montantMensuelCentimes
    : 0
```

et dans l'objet renvoyé, après `ecochequesAnnuelCentimes,` :

```ts
    fraisPropresCentimes,
```

- [ ] **Step 4 : Les faire entrer dans le net versé**

Dans `src/engine/remuneration.ts` :

1. Dans `assembler`, remplacer :

```ts
  const netVerseCentimes = resultat.netMensuelCentimes - avantages.retenueTitresCentimes + avantages.teletravailCentimes
```

par :

```ts
  const netVerseCentimes =
    resultat.netMensuelCentimes -
    avantages.retenueTitresCentimes +
    avantages.teletravailCentimes +
    avantages.fraisPropresCentimes
```

2. Dans `calculerBrutDepuisNetVerse`, remplacer :

```ts
  const decalage = resultatAvantages.retenueTitresCentimes - resultatAvantages.teletravailCentimes
```

par :

```ts
  const decalage =
    resultatAvantages.retenueTitresCentimes -
    resultatAvantages.teletravailCentimes -
    resultatAvantages.fraisPropresCentimes
```

- [ ] **Step 5 : Compléter la validation**

Dans `src/engine/validation.ts`, fonction `validerAvantages`, dans l'objet `avantages` initial, ajouter :

```ts
    fraisPropresEmployeur: { actif: false, montantMensuelCentimes: 0 },
```

(la saisie viendra à la tâche 5).

- [ ] **Step 6 : Vérifier qu'ils passent**

Run : `npm test; npm run typecheck; npm run lint`
Expected : tout au vert.

- [ ] **Step 7 : Commit**

```powershell
git add src/engine/avantages.ts src/engine/avantages.test.ts src/engine/remuneration.ts src/engine/remuneration.test.ts src/engine/validation.ts
git commit -m @'
feat: frais propres à l'employeur ajoutés au net versé

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
'@
```

---

### Task 4 : Les deux fiches de paie comme cas de référence

C'est le moment de vérité du projet.

**Files:**
- Create: `src/engine/__tests__/fichesReelles.json`
- Test: `src/engine/__tests__/fichesReelles.test.ts`

**Interfaces:**
- Consumes : `calculerRemuneration(situation, avantages, dateIso)` (tâche 3) ; `Situation` avec `atnMensuelCentimes` (tâche 2) ; la période `P2025` (tâche 1).
- Produces : le fichier de cas vérifiés et son test.

- [ ] **Step 1 : Écrire les deux cas**

Créer `src/engine/__tests__/fichesReelles.json`. **Aucune donnée personnelle** : que des montants, des dates et une source anonymisée.

```json
{
  "description": "Cas de référence issus de fiches de paie réelles, anonymisées. Écrit à la main, pas généré.",
  "cas": [
    {
      "id": "fiche-2025-07",
      "date": "2025-07-25",
      "situation": {
        "brutMensuelCentimes": 273294,
        "atnMensuelCentimes": 27017,
        "etatCivil": "isole",
        "revenusConjoint": null,
        "enfantsACharge": 0,
        "parentIsole": false
      },
      "avantages": {
        "titresRepas": { "actif": true, "joursPrestes": 19, "valeurFacialeCentimes": 800, "partTravailleurCentimes": 109 },
        "teletravail": { "actif": false, "indemniteCentimes": 0 },
        "ecocheques": { "actif": false, "montantAnnuelCentimes": 0 },
        "fraisPropresEmployeur": { "actif": true, "montantMensuelCentimes": 10084 }
      },
      "attendu": {
        "onss": 35720,
        "bonusVoletA": 12059,
        "bonusVoletB": 1210,
        "imposableMensuel": 250843,
        "imposablePrecompte": 277860,
        "precompteAvantBonus": 49876,
        "bonusFiscal": 4632,
        "cotisationSpeciale": 1630,
        "retenueTitres": 2071,
        "netVerse": 211982
      },
      "source": "Fiche de paie d'un secrétariat social belge, période 07/2025, anonymisée",
      "verifie": true
    },
    {
      "id": "fiche-2025-09",
      "date": "2025-09-26",
      "situation": {
        "brutMensuelCentimes": 273294,
        "atnMensuelCentimes": 26145,
        "etatCivil": "isole",
        "revenusConjoint": null,
        "enfantsACharge": 0,
        "parentIsole": false
      },
      "avantages": {
        "titresRepas": { "actif": true, "joursPrestes": 22, "valeurFacialeCentimes": 800, "partTravailleurCentimes": 109 },
        "teletravail": { "actif": false, "indemniteCentimes": 0 },
        "ecocheques": { "actif": false, "montantAnnuelCentimes": 0 },
        "fraisPropresEmployeur": { "actif": true, "montantMensuelCentimes": 11677 }
      },
      "attendu": {
        "onss": 35720,
        "bonusVoletA": 12059,
        "bonusVoletB": 1210,
        "imposableMensuel": 250843,
        "imposablePrecompte": 276988,
        "precompteAvantBonus": 49503,
        "bonusFiscal": 4632,
        "cotisationSpeciale": 1630,
        "retenueTitres": 2398,
        "netVerse": 213621
      },
      "source": "Fiche de paie d'un secrétariat social belge, période 09/2025, anonymisée",
      "verifie": true
    }
  ]
}
```

Note : la valeur faciale des titres-repas n'apparaît pas sur les fiches ; seule la part du travailleur entre dans le net. Elle est renseignée à 8,00 €, une valeur plausible qui n'intervient dans aucun montant attendu.

- [ ] **Step 2 : Écrire le test**

Créer `src/engine/__tests__/fichesReelles.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import type { Avantages } from '../avantages'
import { calculerRemuneration } from '../remuneration'
import type { Situation } from '../types'
import fichier from './fichesReelles.json'

interface CasFiche {
  id: string
  date: string
  situation: Situation
  avantages: Avantages
  attendu: {
    onss: number
    bonusVoletA: number
    bonusVoletB: number
    imposableMensuel: number
    imposablePrecompte: number
    precompteAvantBonus: number
    bonusFiscal: number
    cotisationSpeciale: number
    retenueTitres: number
    netVerse: number
  }
  source: string
  verifie: boolean
}

const cas = fichier.cas as unknown as CasFiche[]

describe(`fiches de paie réelles — ${cas.filter((c) => c.verifie).length} cas vérifiés`, () => {
  it.each(cas.map((c) => [c.id, c] as const))('%s : chaque ligne au centime', (_id, c) => {
    const complet = calculerRemuneration(c.situation, c.avantages, c.date)
    const i = complet.resultat.intermediaires
    expect({
      onss: i.onss,
      bonusVoletA: i.bonusVoletA,
      bonusVoletB: i.bonusVoletB,
      imposableMensuel: i.imposableMensuel,
      imposablePrecompte: i.imposablePrecompte,
      precompteAvantBonus: i.precompteAvantBonus,
      bonusFiscal: i.bonusFiscal,
      cotisationSpeciale: i.cotisationSpeciale,
      retenueTitres: complet.avantages.retenueTitresCentimes,
      netVerse: complet.netVerseCentimes,
    }).toEqual(c.attendu)
  })

  it.each(cas.map((c) => [c.id, c] as const))('%s : le net versé est la somme des lignes de la fiche', (_id, c) => {
    const complet = calculerRemuneration(c.situation, c.avantages, c.date)
    const a = c.attendu
    const somme =
      c.situation.brutMensuelCentimes -
      a.onss +
      a.bonusVoletA +
      a.bonusVoletB -
      a.precompteAvantBonus +
      a.bonusFiscal -
      a.cotisationSpeciale -
      a.retenueTitres +
      complet.avantages.fraisPropresCentimes
    expect(somme).toBe(a.netVerse)
  })

  it('tous les cas sont marqués vérifiés et citent une source anonymisée', () => {
    for (const c of cas) {
      expect(c.verifie).toBe(true)
      expect(c.source).toMatch(/anonymisée/)
    }
  })
})
```

- [ ] **Step 3 : Lancer le test — le moment de vérité**

Run : `npx vitest run src/engine/__tests__/fichesReelles.test.ts`

- **PASS** : le moteur reproduit deux fiches réelles au centime. C'est l'objectif du projet.
- **FAIL** : **ne rien ajuster.** Relever pour chaque ligne la valeur attendue et la valeur obtenue, puis chercher l'explication dans cet ordre : (1) la base du précompte (l'ATN est-il bien ajouté ?), (2) le plafond des frais forfaitaires, (3) l'arrondi du précompte mensuel, (4) les valeurs 2025 relevées à la tâche 1. Signaler BLOCKED avec le tableau des écarts. Un écart documenté vaut mieux qu'un paramètre bricolé.

- [ ] **Step 4 : Vérifier l'ensemble**

Run : `npm test; npm run typecheck; npm run lint`
Expected : tout au vert.

- [ ] **Step 5 : Commit**

```powershell
git add src/engine/__tests__/fichesReelles.json src/engine/__tests__/fichesReelles.test.ts
git commit -m @'
test: deux fiches de paie réelles reproduites au centime

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
'@
```

---

### Task 5 : Saisie et interface

**Files:**
- Modify: `src/engine/validation.ts` (+ `validation.test.ts`)
- Modify: `src/i18n/fr.ts`
- Modify: `src/components/FormulaireSituation.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes : `Situation.atnMensuelCentimes` (tâche 2) ; `Avantages.fraisPropresEmployeur` (tâche 3) ; `SaisieAvantages`, `ErreursSaisie`, `CodeErreur`, `montantBorne` (`validation.ts`) ; `ChampAvantage`, `Erreur`, `CHAMP`, `texteErreur` (composants et constantes locales de `FormulaireSituation.tsx`).
- Produces : `SaisieFormulaire.atn: string` (défaut `'0'`) ; `SaisieAvantages.fraisPropresActif: boolean` et `fraisPropres: string` ; codes d'erreur `atnInvalide` et `fraisPropresInvalide`.

- [ ] **Step 1 : Écrire les tests de validation**

Ajouter à la fin de `src/engine/validation.test.ts` :

```ts
describe('validerSaisie — avantage de toute nature et frais propres', () => {
  it('convertit l’ATN saisi en centimes', () => {
    const r = validerSaisie(saisie({ atn: '270,17' }))
    expect(r.ok && r.sens === 'brutVersNet' && r.situation.atnMensuelCentimes).toBe(27_017)
  })

  it('accepte un ATN nul par défaut', () => {
    const r = validerSaisie(SAISIE_PAR_DEFAUT)
    expect(r.ok && r.sens === 'brutVersNet' && r.situation.atnMensuelCentimes).toBe(0)
  })

  it.each(['', 'abc', '-5', '10000,01'])('ATN « %s » → erreur', (atn) => {
    expect(validerSaisie(saisie({ atn }))).toEqual({ ok: false, erreurs: { atn: 'atnInvalide' } })
  })

  it('convertit les frais propres actifs', () => {
    const r = validerSaisie(
      saisie({ avantages: { ...SAISIE_PAR_DEFAUT.avantages, fraisPropresActif: true, fraisPropres: '100,84' } }),
    )
    expect(r.ok && r.avantages.fraisPropresEmployeur).toEqual({ actif: true, montantMensuelCentimes: 10_084 })
  })

  it.each(['', 'abc', '5000,01'])('frais propres « %s » → erreur', (fraisPropres) => {
    expect(
      validerSaisie(saisie({ avantages: { ...SAISIE_PAR_DEFAUT.avantages, fraisPropresActif: true, fraisPropres } })),
    ).toEqual({ ok: false, erreurs: { fraisPropres: 'fraisPropresInvalide' } })
  })

  it('ne valide pas des frais propres décochés', () => {
    const r = validerSaisie(saisie({ avantages: { ...SAISIE_PAR_DEFAUT.avantages, fraisPropres: 'abc' } }))
    expect(r.ok && r.avantages.fraisPropresEmployeur).toEqual({ actif: false, montantMensuelCentimes: 0 })
  })
})
```

- [ ] **Step 2 : Écrire les tests d'interface**

Ajouter à la fin de `src/App.test.tsx` :

```ts
describe('App — avantage de toute nature et frais propres', () => {
  it('ajoute l’ATN à la base du précompte et le retire du net', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    const atn = screen.getByLabelText('Avantage de toute nature mensuel (€)')
    expect(atn).toHaveValue('0')
    await user.clear(atn)
    await user.type(atn, '200')

    const attendu = calculerNet(
      {
        brutMensuelCentimes: 300_000,
        atnMensuelCentimes: 20_000,
        etatCivil: 'isole',
        revenusConjoint: null,
        enfantsACharge: 0,
        parentIsole: false,
      },
      DATE,
    )
    expect(
      within(screen.getByRole('region', { name: 'Votre salaire net' })).getByText(euros(attendu.netMensuelCentimes)),
    ).toBeInTheDocument()

    const detail = screen.getByRole('region', { name: 'Détail du calcul' })
    expect(within(detail).getByText('Avantage de toute nature')).toBeInTheDocument()
    expect(within(detail).getByText('Avantage de toute nature (retenu)')).toBeInTheDocument()
  })

  it('n’affiche aucune ligne d’ATN quand il vaut zéro', () => {
    render(<App dateIso={DATE} />)
    expect(
      within(screen.getByRole('region', { name: 'Détail du calcul' })).queryByText('Avantage de toute nature'),
    ).not.toBeInTheDocument()
  })

  it('ajoute les frais propres au net versé', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    await user.click(screen.getByLabelText('Frais propres à l’employeur'))
    const montant = screen.getByLabelText('Montant mensuel remboursé (€)')
    await user.clear(montant)
    await user.type(montant, '100,84')
    expect(
      within(screen.getByRole('region', { name: 'Votre salaire net' })).getByText(euros(226_133 + 10_084)),
    ).toBeInTheDocument()
  })

  it('refuse un ATN invalide', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    const atn = screen.getByLabelText('Avantage de toute nature mensuel (€)')
    await user.clear(atn)
    await user.type(atn, 'abc')
    expect(screen.getByText('Indiquez un montant entre 0,00 € et 10 000,00 €.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3 : Vérifier qu'ils échouent**

Run : `npx vitest run src/engine/validation.test.ts src/App.test.tsx`
Expected : FAIL — le champ `atn` et le champ des frais propres n'existent pas.

- [ ] **Step 4 : Étendre la saisie et la validation**

Dans `src/engine/validation.ts` :

1. Dans `SaisieAvantages`, ajouter :

```ts
  fraisPropresActif: boolean
  fraisPropres: string
```

2. Dans `SaisieFormulaire`, ajouter après `montantAvantBascule: string | null` :

```ts
  /** Avantage de toute nature mensuel, tel que tapé. '0' si aucun. */
  atn: string
```

3. Dans `CodeErreur`, ajouter `| 'atnInvalide'` et `| 'fraisPropresInvalide'`.

4. Dans `ErreursSaisie`, ajouter `atn?: CodeErreur` et `fraisPropres?: CodeErreur`.

5. Ajouter aux constantes de bornes :

```ts
const ATN_MAX_CENTIMES = 1_000_000
const FRAIS_PROPRES_MAX_CENTIMES = 500_000
```

6. Dans `SAISIE_AVANTAGES_PAR_DEFAUT`, ajouter `fraisPropresActif: false,` et `fraisPropres: '100,00',`.

7. Dans `SAISIE_PAR_DEFAUT`, ajouter `atn: '0',`.

8. Dans `validerAvantages`, remplacer la ligne des frais propres de l'objet initial par :

```ts
    fraisPropresEmployeur: { actif: saisie.fraisPropresActif, montantMensuelCentimes: 0 },
```

et ajouter, après le bloc `if (saisie.ecochequesActif) { … }` :

```ts
  if (saisie.fraisPropresActif) {
    const frais = montantBorne(saisie.fraisPropres, 0, FRAIS_PROPRES_MAX_CENTIMES)
    if (frais === null) {
      erreurs.fraisPropres = 'fraisPropresInvalide'
    } else {
      avantages.fraisPropresEmployeur.montantMensuelCentimes = frais
    }
  }
```

9. Dans `validerSaisie`, après la validation des enfants, ajouter :

```ts
  const atn = montantBorne(saisie.atn, 0, ATN_MAX_CENTIMES)
  if (atn === null) {
    erreurs.atn = 'atnInvalide'
  }
```

10. Dans le même `validerSaisie`, remplacer `atnMensuelCentimes: 0,` (posé à la tâche 2) par `atnMensuelCentimes: atn ?? 0,`.

- [ ] **Step 5 : Ajouter les textes**

Dans `src/i18n/fr.ts` :

1. Dans `formulaire`, après la ligne `enfants: …`, ajouter :

```ts
    atn: 'Avantage de toute nature mensuel (€)',
    aideAtn: 'Voiture de société par exemple. Montant imposable repris sur votre fiche de paie. 0 si vous n’en avez pas.',
```

2. Dans `formulaire.avantages`, ajouter :

```ts
      fraisPropres: 'Frais propres à l’employeur',
      fraisPropresMontant: 'Montant mensuel remboursé (€)',
      aideFraisPropres: 'Remboursements de frais réels (déplacements, matériel). Ni imposés ni soumis à l’ONSS, sans plafond.',
```

3. Dans `erreurs`, ajouter :

```ts
    atnInvalide: 'Indiquez un montant entre 0,00 € et 10 000,00 €.',
    fraisPropresInvalide: 'Indiquez un montant entre 0,00 € et 5 000,00 €.',
```

- [ ] **Step 6 : Ajouter les champs au formulaire**

Dans `src/components/FormulaireSituation.tsx` :

1. Juste après le bloc du champ « Enfants à charge » (le `</div>` qui suit `{erreurs.enfantsACharge && …}`), ajouter le champ ATN :

```tsx
        <div>
          <label htmlFor="atn" className="font-medium">
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
```

2. Dans la section « Avantages extralégaux », après le bloc des écochèques et avant la balise fermante `</fieldset>`, ajouter :

```tsx
          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={a.fraisPropresActif}
              onChange={(e) => modifierAvantage('fraisPropresActif', e.target.checked)}
              className="size-4 accent-blue-700"
            />
            {ta.fraisPropres}
          </label>
          {a.fraisPropresActif && (
            <div className="mt-2 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
              <ChampAvantage
                id="fraisPropres"
                libelle={ta.fraisPropresMontant}
                valeur={a.fraisPropres}
                aide={ta.aideFraisPropres}
                erreur={erreurTexte(erreurs.fraisPropres)}
                onChange={(valeur) => modifierAvantage('fraisPropres', valeur)}
              />
            </div>
          )}
```

- [ ] **Step 7 : Vérifier qu'ils passent**

Run : `npm test; npm run typecheck; npm run lint`
Expected : tout au vert. Les tests de mémorisation restent valables : `SAISIE_PAR_DEFAUT` gagne des champs, mais la clé de stockage ne change pas — une saisie v3 sans `atn` est rejetée par `estSaisie` et retombe sur les valeurs par défaut, ce qui est le comportement voulu.

- [ ] **Step 8 : Vérifier le build**

Run : `npm run build`
Expected : « built in … ». La vérification visuelle reste au contrôleur.

- [ ] **Step 9 : Commit**

```powershell
git add src/engine/validation.ts src/engine/validation.test.ts src/i18n/fr.ts src/components/FormulaireSituation.tsx src/App.test.tsx
git commit -m @'
feat: saisie de l'avantage de toute nature et des frais propres

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

1. Dans « Comment l'exactitude est vérifiée », remplacer :

```markdown
- Un cas n'est marqué `verifie: true` qu'après comparaison avec une source externe (fiche de paie réelle, simulateur officiel).
```

par :

```markdown
- Un cas n'est marqué `verifie: true` qu'après comparaison avec une source externe. `src/engine/__tests__/fichesReelles.json` contient deux fiches de paie réelles de 2025 (anonymisées : uniquement des montants), reproduites ligne par ligne au centime — ONSS, bonus à l'emploi, précompte, cotisation spéciale, chèques-repas et net versé.
- Avantage de toute nature (voiture de société) : le montant est saisi tel qu'il figure sur la fiche. Il entre dans la base du précompte, puis se retire du net, comme sur une fiche réelle. La formule officielle (valeur catalogue, CO2, âge du véhicule) n'est pas encore intégrée.
```

2. Dans « Limites de la V1 », remplacer :

```markdown
Les avantages extralégaux couverts sont supposés conformes à leurs conditions d'exonération (convention collective, un titre par jour presté, télétravail structurel).
```

par :

```markdown
Les avantages extralégaux couverts sont supposés conformes à leurs conditions d'exonération (convention collective, télétravail structurel). Le nombre de titres-repas est saisi librement : les fiches réelles montrent que les employeurs ne suivent pas tous la règle « un titre par jour presté ».
```

3. Dans « Sources », ajouter à la fin de la liste :

```markdown
- ONSS, instructions administratives 2025/3 (bonus à l'emploi) et SPF Finances, formule-clé 2025 : période de référence des fiches de paie vérifiées
```

- [ ] **Step 2 : Vérification complète**

Run : `npm test; npm run typecheck; npm run lint; npm run build`
Expected : tout au vert.

- [ ] **Step 3 : Vérifier l'état de la branche**

Run : `git status -sb; git log --oneline main..HEAD`
Expected : branche `feat/verification-fiches-2025` propre, avec le commit de la spec, celui du plan, puis un commit par tâche (tâches 1 à 5).

- [ ] **Step 4 : Commit**

```powershell
git add README.md
git commit -m @'
docs: README des fiches de paie vérifiées et de l'avantage de toute nature

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
'@
```

**Ne pas pousser.** Signaler à l'utilisateur que la branche est prête, et lui rapporter le résultat de la tâche 4 : les deux fiches sont-elles reproduites au centime, ou quel écart subsiste ?
