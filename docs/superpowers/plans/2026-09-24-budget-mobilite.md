# Budget mobilité (pilier 3) — plan d'implémentation

> **Pour les travailleurs agentiques :** SOUS-COMPÉTENCE REQUISE : utiliser superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`).

**Objectif :** calculer le pilier 3 du budget mobilité (le solde pris en cash, diminué de sa cotisation spéciale de sécurité sociale), l'ajouter au net versé mensuel, et le rendre exclusif de la voiture de société.

**Architecture :** un module moteur `budgetMobilite.ts` sur le modèle de `atnVoiture.ts` ; un champ `choixMobilite` dans `Avantages` qui aiguille `remuneration.ts` vers l'ATN, vers le budget mobilité, ou vers rien ; la saisie, la validation et le stockage suivent, puis l'interface.

**Pile technique :** React 19, TypeScript 6 strict, Vitest + Testing Library + jsdom, Tailwind, oxlint. Aucune dépendance nouvelle.

**Spec :** `docs/superpowers/specs/2026-09-24-budget-mobilite-design.md`

**Branche :** `feat/budget-mobilite`, déjà créée. La spec y est commitée (`bbdf292`, corrigée par `2958399`). Un commit par tâche. **Ni push ni merge** avant la fin, et seulement sur demande explicite de l'utilisateur.

## Contraintes globales

- **Arithmétique en centimes entiers**, taux en **dix-millièmes**. Un seul arrondi par étape légale, via `diviserArrondi` / `appliquerTaux` de `src/engine/argent.ts` (moitié à l'écart de zéro). Aucun flottant dans un calcul monétaire.
- **Aucune valeur n'est ajustée pour faire tomber un exemple juste.** Un écart se documente.
- Chaque valeur légale **cite sa source** dans un commentaire, avec la mention « source secondaire » si le texte officiel n'a pas pu être consulté.
- **TypeScript strict**, aucun `any`, aucune nouvelle dépendance.
- Fichiers **UTF-8**, fins de ligne **LF** (`git ls-files --eol` doit dire `w/lf`), interface **en français** avec apostrophes typographiques `’`.
- **Aucun texte en dur** dans un composant : tout libellé passe par `src/i18n/fr.ts`.
- Les erreurs de saisie s'affichent **champ par champ** (`aria-invalid`, `aria-describedby` vers `<p id="{id}-erreur">`), via le mécanisme existant de `FormulaireSituation.tsx`.
- **Le calcul mensuel existant ne change pas** : les tests des fiches de paie réelles 2025 (`src/App.test.tsx`, `src/engine/__tests__/`) doivent passer **sans qu'aucune valeur attendue ne bouge**.
- `npm test`, `npm run typecheck`, `npm run lint` verts avant chaque commit.
- Message de commit en français, sujet impératif court, suivi d'une ligne vide puis `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Points de vigilance pour la relecture

Cinq entrées ou situations que la spec implique et qu'un test doit épingler, la plus probable d'abord. Chacune a son test dans la tâche qui possède le code.

1. **Une saisie v5 existante doit garder exactement son comportement** : pas de `choixMobilite` enregistré → `'voiture'`, ATN inchangé. Une valeur par défaut à `'aucun'` ferait disparaître silencieusement l'ATN de tous les utilisateurs actuels. → test en tâche 5.
2. **Le net → brut doit intégrer le pilier 3 dans son décalage de cible** : sans cela, le brut trouvé est trop élevé et le net versé dépasse la cible. Invisible en brut → net. → test en tâche 4.
3. **Choisir le budget mobilité doit rendre l'ATN sans effet**, même si une voiture reste saisie dans le formulaire : sinon l'utilisateur cumule deux avantages que la loi rend exclusifs. → test en tâche 4.
4. **Une part en cash supérieure au budget total** : la validation doit la refuser avec une erreur sur son champ, et le moteur doit lever plutôt que produire un montant négatif pour les piliers 1+2. → tests en tâches 3 et 5.
5. **Un budget à 0 avec le budget mobilité choisi** : aucun montant, aucune division par zéro, et **pas** d'alerte de bornes (une saisie vide n'est pas un dépassement). → test en tâche 3.

---

## Task 1 : relever les valeurs officielles

**Fichiers :**
- Aucun fichier de code. La sortie est un rapport écrit.

**Interfaces :**
- Consomme : rien.
- Produit : les valeurs chiffrées que la tâche 2 inscrit dans les paramètres, chacune avec sa source.

Cette tâche ne modifie **aucun** fichier du dépôt. Elle cherche, cite et conclut.

- [ ] **Étape 1 : relever les quatre points ci-dessous**

Pour chacun : la citation exacte, la référence complète (URL, article, date de publication), et ta conclusion chiffrée.

1. **Le taux de la cotisation spéciale de sécurité sociale due sur le pilier 3** (le solde du budget mobilité versé en cash). Valeur de travail : **38,07 %**. Cherche dans la loi du 17/03/2019 relative à l'instauration d'un budget mobilité et ses arrêtés d'exécution, ou sur le site de l'ONSS.
2. **Qui supporte cette cotisation** : est-ce une retenue dans le chef du **travailleur** (elle réduit alors le net versé, ce que suppose tout ce sous-projet), ou une charge patronale ? Cette réponse est bloquante : si c'est une charge patronale, le pilier 3 n'a pas à être diminué et le calcul entier change.
3. **Les bornes légales du budget annuel** pour **2026** et pour **2025**. Valeurs de travail 2026 : minimum **3 233 €**, maximum **17 244 €**. Dis si elles sont indexées chaque année (donc différentes en 2025), et si elles sont des montants fixes ou dépendent d'autre chose (catégorie de fonction, coût de la voiture remplacée, plafond en pourcentage de la rémunération brute).
4. **L'assiette de la cotisation** : porte-t-elle sur le montant brut du pilier 3, ou sur une base réduite ?

- [ ] **Étape 2 : appliquer la règle de décision**

- Valeur trouvée et **égale** à la valeur de travail → la citer dans ton rapport, avec sa référence : la tâche 2 la reprendra telle quelle.
- Valeur **introuvable** sur une source primaire → conserver la valeur de travail, mais la marquer explicitement « source secondaire » dans ton rapport, avec la meilleure source trouvée.
- Valeur **différente** de la valeur de travail, ou réponse au point 2 qui contredit l'hypothèse de la retenue travailleur → **t'arrêter** et renvoyer BLOCKED avec la citation. N'écris rien dans le code : c'est le contrôleur qui tranche.

- [ ] **Étape 3 : écrire le rapport**

Pour chacun des quatre points : citation, référence, conclusion chiffrée, et le statut (confirmé sur source primaire / source secondaire / contredit). Ajoute les valeurs en centimes et en dix-millièmes, prêtes à être copiées :
`tauxCotisationSpecialeDixMilliemes`, `budgetAnnuelMinCentimes`, `budgetAnnuelMaxCentimes`, pour 2025 et pour 2026.

Aucun commit : cette tâche ne touche pas le dépôt.

---

## Task 2 : les paramètres

**Fichiers :**
- Modifier : `src/engine/parametres/types.ts`
- Modifier : `src/engine/parametres/p2025.ts`
- Modifier : `src/engine/parametres/p2026-07.ts`
- Test : `src/engine/parametres/parametres.test.ts`

**Interfaces :**
- Consomme : les valeurs chiffrées et les sources de la tâche 1.
- Produit : `ParametresBudgetMobilite { tauxCotisationSpecialeDixMilliemes, budgetAnnuelMinCentimes, budgetAnnuelMaxCentimes }`, accessible en `parametres.budgetMobilite`, présent dans toutes les périodes.

- [ ] **Étape 1 : écrire le test qui échoue**

Dans `src/engine/parametres/parametres.test.ts`, à l'intérieur du `describe` qui parcourt déjà toutes les périodes (repère la constante `PERIODES` en haut du fichier et réutilise-la telle quelle) :

```ts
  it('le budget mobilité a un taux de cotisation et des bornes cohérentes', () => {
    for (const periode of PERIODES) {
      const b = periode.budgetMobilite
      expect(b.tauxCotisationSpecialeDixMilliemes).toBeGreaterThan(0)
      expect(b.tauxCotisationSpecialeDixMilliemes).toBeLessThan(10_000)
      expect(b.budgetAnnuelMinCentimes).toBeGreaterThan(0)
      expect(b.budgetAnnuelMaxCentimes).toBeGreaterThan(b.budgetAnnuelMinCentimes)
    }
  })
```

- [ ] **Étape 2 : lancer le test et constater l'échec**

Commande : `npx vitest run src/engine/parametres/parametres.test.ts`
Attendu : ÉCHEC à la compilation — `budgetMobilite` n'existe pas sur `Parametres`.

- [ ] **Étape 3 : ajouter le type**

Dans `src/engine/parametres/types.ts`, après l'interface `ParametresVoiture` :

```ts
/** Budget mobilité (loi du 17/03/2019) : les valeurs qui changent chaque année. */
export interface ParametresBudgetMobilite {
  /** Cotisation spéciale de sécurité sociale retenue sur le pilier 3 (le solde en cash). */
  tauxCotisationSpecialeDixMilliemes: number
  /** Borne basse du budget annuel que l'employeur peut accorder. */
  budgetAnnuelMinCentimes: number
  /** Borne haute du budget annuel que l'employeur peut accorder. */
  budgetAnnuelMaxCentimes: number
}
```

Puis, dans l'interface `Parametres`, ajoute le champ juste après `voiture` :

```ts
  voiture: ParametresVoiture
  budgetMobilite: ParametresBudgetMobilite
```

- [ ] **Étape 4 : remplir les deux périodes**

Dans `src/engine/parametres/p2026-07.ts`, après le bloc `voiture`, ajoute le bloc ci-dessous en **remplaçant chaque valeur et le commentaire de source par ce que la tâche 1 a relevé**. Le commentaire doit citer la référence exacte, et dire « source secondaire » si le texte primaire n'a pas pu être consulté :

```ts
  // <référence relevée en tâche 1 : texte, article, date, URL ; « source secondaire » si le texte
  // primaire n'a pas pu être consulté>
  budgetMobilite: {
    tauxCotisationSpecialeDixMilliemes: 3_807,
    budgetAnnuelMinCentimes: 323_300,
    budgetAnnuelMaxCentimes: 1_724_400,
  },
```

Dans `src/engine/parametres/p2025.ts`, ajoute le même bloc avec les valeurs **2025** relevées en tâche 1. Si la tâche 1 a conclu que les bornes ne sont pas distinctes en 2025, reprends celles de 2026 en l'écrivant dans le commentaire, sur le modèle de ce que fait déjà `rmmmgCentimes` dans ce fichier (`rmmmgCentimes: P2026_07.rmmmgCentimes`, avec son commentaire d'explication).

`P2026_09` hérite de `P2026_07` : vérifie qu'il n'y a rien à y ajouter (ouvre `src/engine/parametres/p2026-09.ts` et confirme qu'il fait bien un `...P2026_07`).

- [ ] **Étape 5 : lancer le test et constater le succès**

Commande : `npx vitest run src/engine/parametres/parametres.test.ts`
Attendu : SUCCÈS.

- [ ] **Étape 6 : vérifier et commiter**

```bash
npm test && npm run typecheck && npm run lint
git add src/engine/parametres/
git commit -m "$(cat <<'EOF'
feat: paramètres du budget mobilité

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

Si `npm test` signale un échec dans `src/engine/__tests__/reculMax.test.ts` à cause d'une empreinte de paramètres modifiée, **ne touche pas au recul mesuré** : mets seulement l'empreinte à jour comme le fichier de test l'indique, et signale-le dans ton rapport. Le recul lui-même (514 centimes) ne doit pas changer, puisque aucun calcul de net mensuel n'est modifié par cette tâche.

---

## Task 3 : le moteur `budgetMobilite.ts`

**Fichiers :**
- Créer : `src/engine/budgetMobilite.ts`
- Créer : `src/engine/budgetMobilite.test.ts`

**Interfaces :**
- Consomme : `parametres.budgetMobilite` (tâche 2) ; `appliquerTaux` et `diviserArrondi` de `./argent`.
- Produit :
  - `interface BudgetMobiliteSaisi { budgetAnnuelCentimes: number; pilier3AnnuelCentimes: number }`
  - `const BUDGET_MOBILITE_AUCUN: BudgetMobiliteSaisi`
  - `interface ResultatBudgetMobilite { pilier3MensuelBrutCentimes, cotisationSpecialeCentimes, pilier3MensuelNetCentimes, piliers1Et2AnnuelCentimes, horsBornes }`
  - `function calculerBudgetMobilite(budget: BudgetMobiliteSaisi, parametres: Parametres): ResultatBudgetMobilite`

- [ ] **Étape 1 : écrire les tests qui échouent**

Crée `src/engine/budgetMobilite.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { BUDGET_MOBILITE_AUCUN, calculerBudgetMobilite } from './budgetMobilite'
import { getParametres } from './parametres'
import type { Parametres } from './parametres/types'

const P = getParametres('2026-09-15')

/** Paramètres de la période, avec un bloc budget mobilité imposé : teste l'application, pas la valeur. */
function avecBudget(parametres: Parametres, bloc: Partial<Parametres['budgetMobilite']>): Parametres {
  return { ...parametres, budgetMobilite: { ...parametres.budgetMobilite, ...bloc } }
}

describe('calculerBudgetMobilite', () => {
  it('mensualise le pilier 3 et en retire la cotisation spéciale', () => {
    // 2 000 €/an → 166,67 €/mois ; cotisation à 38,07 % → 63,45 € ; net → 103,22 €.
    const r = calculerBudgetMobilite({ budgetAnnuelCentimes: 600_000, pilier3AnnuelCentimes: 200_000 }, P)
    expect(r.pilier3MensuelBrutCentimes).toBe(16_667)
    expect(r.cotisationSpecialeCentimes).toBe(6_345)
    expect(r.pilier3MensuelNetCentimes).toBe(10_322)
    expect(r.piliers1Et2AnnuelCentimes).toBe(400_000)
  })

  it('applique le taux du paramètre, pas une constante en dur', () => {
    // Taux imposé à 50 % : le résultat doit suivre le paramètre.
    const parametres = avecBudget(P, { tauxCotisationSpecialeDixMilliemes: 5_000 })
    const r = calculerBudgetMobilite({ budgetAnnuelCentimes: 600_000, pilier3AnnuelCentimes: 240_000 }, parametres)
    expect(r.pilier3MensuelBrutCentimes).toBe(20_000)
    expect(r.cotisationSpecialeCentimes).toBe(10_000)
    expect(r.pilier3MensuelNetCentimes).toBe(10_000)
  })

  it('ne retient rien quand aucun budget n’est pris en cash', () => {
    const r = calculerBudgetMobilite({ budgetAnnuelCentimes: 600_000, pilier3AnnuelCentimes: 0 }, P)
    expect(r.pilier3MensuelBrutCentimes).toBe(0)
    expect(r.cotisationSpecialeCentimes).toBe(0)
    expect(r.pilier3MensuelNetCentimes).toBe(0)
    expect(r.piliers1Et2AnnuelCentimes).toBe(600_000)
  })

  it('ne calcule rien et n’alerte pas quand il n’y a pas de budget', () => {
    const r = calculerBudgetMobilite(BUDGET_MOBILITE_AUCUN, P)
    expect(r.pilier3MensuelNetCentimes).toBe(0)
    expect(r.piliers1Et2AnnuelCentimes).toBe(0)
    // Une saisie vide n'est pas un dépassement de bornes.
    expect(r.horsBornes).toBe(false)
  })

  it('signale un budget hors des bornes légales, aux bornes exactes près', () => {
    const parametres = avecBudget(P, { budgetAnnuelMinCentimes: 323_300, budgetAnnuelMaxCentimes: 1_724_400 })
    const horsBornes = (budgetAnnuelCentimes: number) =>
      calculerBudgetMobilite({ budgetAnnuelCentimes, pilier3AnnuelCentimes: 0 }, parametres).horsBornes
    expect(horsBornes(323_300)).toBe(false)
    expect(horsBornes(323_299)).toBe(true)
    expect(horsBornes(1_724_400)).toBe(false)
    expect(horsBornes(1_724_401)).toBe(true)
  })

  it('refuse une part en cash supérieure au budget', () => {
    expect(() => calculerBudgetMobilite({ budgetAnnuelCentimes: 600_000, pilier3AnnuelCentimes: 600_001 }, P)).toThrow(RangeError)
  })

  it('refuse un montant négatif ou non entier', () => {
    expect(() => calculerBudgetMobilite({ budgetAnnuelCentimes: -1, pilier3AnnuelCentimes: 0 }, P)).toThrow(RangeError)
    expect(() => calculerBudgetMobilite({ budgetAnnuelCentimes: 600_000, pilier3AnnuelCentimes: -1 }, P)).toThrow(RangeError)
    expect(() => calculerBudgetMobilite({ budgetAnnuelCentimes: 600_000.5, pilier3AnnuelCentimes: 0 }, P)).toThrow(RangeError)
  })
})
```

- [ ] **Étape 2 : lancer les tests et constater l'échec**

Commande : `npx vitest run src/engine/budgetMobilite.test.ts`
Attendu : ÉCHEC — le module `./budgetMobilite` n'existe pas.

- [ ] **Étape 3 : écrire le module**

Crée `src/engine/budgetMobilite.ts` :

```ts
import { appliquerTaux, diviserArrondi } from './argent'
import type { Parametres } from './parametres/types'

const MOIS_PAR_AN = 12

/** Budget mobilité, déjà validé (spec budget mobilité § 3.1). */
export interface BudgetMobiliteSaisi {
  /** Budget annuel total accordé par l'employeur. */
  budgetAnnuelCentimes: number
  /** Part prise en cash (pilier 3) ; le reste finance les piliers 1 et 2. */
  pilier3AnnuelCentimes: number
}

export const BUDGET_MOBILITE_AUCUN: BudgetMobiliteSaisi = {
  budgetAnnuelCentimes: 0,
  pilier3AnnuelCentimes: 0,
}

export interface ResultatBudgetMobilite {
  pilier3MensuelBrutCentimes: number
  cotisationSpecialeCentimes: number
  /** Ce qui s'ajoute au net versé du mois. */
  pilier3MensuelNetCentimes: number
  /** Budget non pris en cash : piliers 1 et 2, exonérés. Informatif, jamais dans un calcul. */
  piliers1Et2AnnuelCentimes: number
  /** Budget annuel hors des bornes légales de la période. Un budget nul n'est pas un dépassement. */
  horsBornes: boolean
}

function verifierBornes(budget: BudgetMobiliteSaisi): void {
  for (const montant of [budget.budgetAnnuelCentimes, budget.pilier3AnnuelCentimes]) {
    if (!Number.isSafeInteger(montant) || montant < 0) {
      throw new RangeError(`Montant de budget mobilité invalide : ${montant}`)
    }
  }
  if (budget.pilier3AnnuelCentimes > budget.budgetAnnuelCentimes) {
    throw new RangeError(
      `Part en cash (${budget.pilier3AnnuelCentimes}) supérieure au budget (${budget.budgetAnnuelCentimes})`,
    )
  }
}

/**
 * Pilier 3 du budget mobilité : le solde pris en cash, mensualisé, diminué de sa cotisation
 * spéciale de sécurité sociale (spec budget mobilité § 3.1). Exonéré d'impôt : il n'entre ni dans
 * la base du précompte ni dans celle de l'ONSS ordinaire, seulement dans le net versé.
 */
export function calculerBudgetMobilite(budget: BudgetMobiliteSaisi, parametres: Parametres): ResultatBudgetMobilite {
  verifierBornes(budget)
  const p = parametres.budgetMobilite
  const pilier3MensuelBrutCentimes = diviserArrondi(budget.pilier3AnnuelCentimes, MOIS_PAR_AN)
  const cotisationSpecialeCentimes = appliquerTaux(pilier3MensuelBrutCentimes, p.tauxCotisationSpecialeDixMilliemes)
  return {
    pilier3MensuelBrutCentimes,
    cotisationSpecialeCentimes,
    pilier3MensuelNetCentimes: pilier3MensuelBrutCentimes - cotisationSpecialeCentimes,
    piliers1Et2AnnuelCentimes: budget.budgetAnnuelCentimes - budget.pilier3AnnuelCentimes,
    horsBornes:
      budget.budgetAnnuelCentimes > 0 &&
      (budget.budgetAnnuelCentimes < p.budgetAnnuelMinCentimes || budget.budgetAnnuelCentimes > p.budgetAnnuelMaxCentimes),
  }
}
```

- [ ] **Étape 4 : lancer les tests et constater le succès**

Commande : `npx vitest run src/engine/budgetMobilite.test.ts`
Attendu : SUCCÈS, 7 tests.

Si le premier test ne tombe pas juste parce que la tâche 1 a relevé un taux différent de 38,07 %, **ne modifie pas le paramètre** : recalcule les trois montants attendus avec le vrai taux, corrige le test, et note l'écart dans ton rapport.

- [ ] **Étape 5 : vérifier et commiter**

```bash
npm test && npm run typecheck && npm run lint
git add src/engine/budgetMobilite.ts src/engine/budgetMobilite.test.ts
git commit -m "$(cat <<'EOF'
feat: calcul du pilier 3 du budget mobilité

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 : le choix de mobilité et le branchement dans la rémunération

**Fichiers :**
- Modifier : `src/engine/avantages.ts`
- Modifier : `src/engine/remuneration.ts`
- Test : `src/engine/remuneration.test.ts` (existe déjà)
- Modifier si la compilation l'exige : tout fichier qui construit un `Avantages` littéral

**Interfaces :**
- Consomme : `BudgetMobiliteSaisi`, `BUDGET_MOBILITE_AUCUN`, `calculerBudgetMobilite`, `ResultatBudgetMobilite` (tâche 3).
- Produit :
  - `const CHOIX_MOBILITE = ['aucun', 'voiture', 'budgetMobilite'] as const` et `type ChoixMobilite`, exportés depuis `src/engine/avantages.ts`
  - `Avantages` gagne `choixMobilite: ChoixMobilite` et `budgetMobilite: BudgetMobiliteSaisi`
  - `ResultatComplet` gagne `budgetMobilite: ResultatBudgetMobilite`

- [ ] **Étape 1 : écrire les tests qui échouent**

Dans `src/engine/remuneration.test.ts`, ajoute ce `describe` à la fin du fichier. Reprends les imports déjà présents en haut du fichier et complète-les (`AVANTAGES_AUCUN`, `calculerRemuneration`, `calculerBrutDepuisNetVerse`) ; ajoute ce qui manque.

```ts
describe('budget mobilité', () => {
  const DATE = '2026-09-15'
  const SITUATION = {
    brutMensuelCentimes: 300_000,
    etatCivil: 'isole' as const,
    revenusConjoint: null,
    enfantsACharge: 0,
    parentIsole: false,
  }
  const FAMILLE = { etatCivil: 'isole' as const, revenusConjoint: null, enfantsACharge: 0, parentIsole: false }
  const AVEC_BUDGET = {
    ...AVANTAGES_AUCUN,
    choixMobilite: 'budgetMobilite' as const,
    budgetMobilite: { budgetAnnuelCentimes: 600_000, pilier3AnnuelCentimes: 200_000 },
  }

  it('ajoute le net du pilier 3 au net versé', () => {
    const sans = calculerRemuneration(SITUATION, AVANTAGES_AUCUN, DATE)
    const avec = calculerRemuneration(SITUATION, AVEC_BUDGET, DATE)
    // Le pilier 3 net vaut 103,22 € par mois (vérifié dans budgetMobilite.test.ts).
    expect(avec.netVerseCentimes - sans.netVerseCentimes).toBe(10_322)
    // Il est exonéré d'impôt et d'ONSS : le net légal, lui, ne bouge pas.
    expect(avec.resultat.netMensuelCentimes).toBe(sans.resultat.netMensuelCentimes)
    expect(avec.budgetMobilite.pilier3MensuelNetCentimes).toBe(10_322)
  })

  it('ignore la voiture quand le budget mobilité est choisi', () => {
    const avecVoitureEtBudget = {
      ...AVEC_BUDGET,
      atn: { source: { mode: 'montant' as const, montantMensuelCentimes: 50_000 }, contributionMensuelleCentimes: 0 },
    }
    const resultat = calculerRemuneration(SITUATION, avecVoitureEtBudget, DATE)
    // L'ATN saisi ne doit ni entrer dans la base du précompte ni apparaître dans le résultat.
    expect(resultat.atn.avantContributionCentimes).toBe(0)
    expect(resultat.atn.imposableCentimes).toBe(0)
    expect(resultat.resultat.intermediaires.atn).toBe(0)
  })

  it('ignore l’un et l’autre quand le choix est « aucun »', () => {
    const aucun = {
      ...AVEC_BUDGET,
      choixMobilite: 'aucun' as const,
      atn: { source: { mode: 'montant' as const, montantMensuelCentimes: 50_000 }, contributionMensuelleCentimes: 0 },
    }
    const resultat = calculerRemuneration(SITUATION, aucun, DATE)
    expect(resultat.atn.imposableCentimes).toBe(0)
    expect(resultat.budgetMobilite.pilier3MensuelNetCentimes).toBe(0)
  })

  it('atteint la cible en net → brut, pilier 3 compris', () => {
    const cible = 250_000
    const inverse = calculerBrutDepuisNetVerse(FAMILLE, AVEC_BUDGET, cible, DATE)
    expect(inverse.complet.netVerseCentimes).toBeGreaterThanOrEqual(cible)
    // Le pilier 3 doit abaisser le brut nécessaire : sans lui, il en faudrait davantage.
    const sansBudget = calculerBrutDepuisNetVerse(FAMILLE, AVANTAGES_AUCUN, cible, DATE)
    expect(inverse.brutCentimes).toBeLessThan(sansBudget.brutCentimes)
  })
})
```

- [ ] **Étape 2 : lancer les tests et constater l'échec**

Commande : `npx vitest run src/engine/remuneration.test.ts`
Attendu : ÉCHEC à la compilation — `choixMobilite` et `budgetMobilite` n'existent pas sur `Avantages`.

- [ ] **Étape 3 : étendre `Avantages`**

Dans `src/engine/avantages.ts`, ajoute l'import et le type, puis les deux champs.

En tête du fichier, à côté de l'import de `atnVoiture` :

```ts
import { BUDGET_MOBILITE_AUCUN, type BudgetMobiliteSaisi } from './budgetMobilite'
```

Avant l'interface `Avantages` :

```ts
/**
 * Voiture de société et budget mobilité sont exclusifs : le budget s'obtient en échange de la
 * voiture, ou du droit d'en avoir une (spec budget mobilité § 3.2).
 */
export const CHOIX_MOBILITE = ['aucun', 'voiture', 'budgetMobilite'] as const
export type ChoixMobilite = (typeof CHOIX_MOBILITE)[number]
```

Dans l'interface `Avantages`, après `atn: AtnSaisi` :

```ts
  /** Aiguille le calcul : l'ATN, le budget mobilité, ou ni l'un ni l'autre. */
  choixMobilite: ChoixMobilite
  /** Budget mobilité ; ignoré si choixMobilite ne vaut pas 'budgetMobilite'. */
  budgetMobilite: BudgetMobiliteSaisi
```

Dans `AVANTAGES_AUCUN`, après `atn: ATN_AUCUN` :

```ts
  // 'voiture' et non 'aucun' : c'est l'état historique de l'app, où la section ATN est toujours
  // présente et vaut « pas de voiture » quand le montant est à 0. Tous les appelants existants
  // gardent ainsi exactement leur comportement.
  choixMobilite: 'voiture',
  budgetMobilite: BUDGET_MOBILITE_AUCUN,
```

- [ ] **Étape 4 : brancher la rémunération**

Dans `src/engine/remuneration.ts` :

Ajoute l'import :

```ts
import { BUDGET_MOBILITE_AUCUN, calculerBudgetMobilite, type ResultatBudgetMobilite } from './budgetMobilite'
```

Dans `ResultatComplet`, après `atn: ResolutionAtn` :

```ts
  /** Pilier 3 du budget mobilité ; tout à zéro si ce n'est pas le choix retenu. */
  budgetMobilite: ResultatBudgetMobilite
```

Remplace la fonction `assembler` par :

```ts
function assembler(
  resultat: Resultat,
  avantages: ResultatAvantages,
  atn: ResolutionAtn,
  budgetMobilite: ResultatBudgetMobilite,
): ResultatComplet {
  const netVerseCentimes =
    resultat.netMensuelCentimes -
    avantages.retenueTitresCentimes +
    avantages.teletravailCentimes +
    avantages.fraisPropresCentimes -
    atn.contributionCentimes +
    budgetMobilite.pilier3MensuelNetCentimes
  return {
    resultat,
    avantages,
    atn,
    budgetMobilite,
    netVerseCentimes,
    totalMensuelCentimes: netVerseCentimes + avantages.valeurTitresCentimes,
  }
}
```

Ajoute, juste après `assembler`, la fonction qui applique l'exclusivité :

```ts
/**
 * Applique le choix de mobilité : l'ATN n'est résolu que pour 'voiture', le budget mobilité n'est
 * calculé que pour 'budgetMobilite' (spec budget mobilité § 3.2).
 */
function resoudreMobilite(avantages: Avantages, dateIso: string, parametres: Parametres) {
  const atn = resoudreAtn(avantages.choixMobilite === 'voiture' ? avantages.atn : ATN_AUCUN, dateIso, parametres)
  const budgetMobilite = calculerBudgetMobilite(
    avantages.choixMobilite === 'budgetMobilite' ? avantages.budgetMobilite : BUDGET_MOBILITE_AUCUN,
    parametres,
  )
  return { atn, budgetMobilite }
}
```

Complète les imports en tête de fichier : `ATN_AUCUN` depuis `./atnVoiture`, et `import type { Parametres } from './parametres/types'`.

Dans `calculerRemuneration`, remplace le corps par :

```ts
export function calculerRemuneration(situation: SituationSansAtn, avantages: Avantages, dateIso: string): ResultatComplet {
  const parametres = getParametres(dateIso)
  const { atn, budgetMobilite } = resoudreMobilite(avantages, dateIso, parametres)
  const resultat = calculerNet({ ...situation, atnMensuelCentimes: atn.imposableCentimes }, dateIso)
  return assembler(resultat, calculerAvantages(avantages, parametres), atn, budgetMobilite)
}
```

Dans `calculerBrutDepuisNetVerse`, remplace la résolution et le décalage :

```ts
  const parametres = getParametres(dateIso)
  const resultatAvantages = calculerAvantages(avantages, parametres)
  const { atn, budgetMobilite } = resoudreMobilite(avantages, dateIso, parametres)
  const decalage =
    resultatAvantages.retenueTitresCentimes -
    resultatAvantages.teletravailCentimes -
    resultatAvantages.fraisPropresCentimes +
    atn.contributionCentimes -
    budgetMobilite.pilier3MensuelNetCentimes
```

et, dans le `try`, l'appel à `assembler` :

```ts
      complet: assembler(inverse.resultat, resultatAvantages, atn, budgetMobilite),
```

Mets aussi à jour le commentaire de doc de `calculerBrutDepuisNetVerse` : le pilier 3 rejoint la liste des montants qui ne dépendent pas du brut et entrent dans le décalage.

- [ ] **Étape 5 : réparer les points de construction de `Avantages`**

Lance `npm run typecheck` et corrige tous les endroits qui construisent un `Avantages` littéral sans les deux nouveaux champs. La plupart partent de `AVANTAGES_AUCUN` et n'ont rien à changer.

Un point à traiter avec soin : `validerAvantages` dans `src/engine/validation.ts` construit un `Avantages` littéral. Pour cette tâche, complète-le simplement avec les valeurs par défaut :

```ts
    atn: ATN_AUCUN,
    choixMobilite: AVANTAGES_AUCUN.choixMobilite,
    budgetMobilite: AVANTAGES_AUCUN.budgetMobilite,
```

C'est la tâche 5 qui y branchera la vraie saisie. **N'anticipe pas** : ne touche pas au reste de `validation.ts`.

- [ ] **Étape 6 : lancer les tests et constater le succès**

Commande : `npx vitest run src/engine/remuneration.test.ts`
Attendu : SUCCÈS.

Puis `npm test` en entier : **aucune valeur attendue d'un test existant ne doit changer**. Si un test des fiches de paie réelles échoue, c'est un vrai défaut de cette tâche, pas un test à ajuster.

- [ ] **Étape 7 : vérifier et commiter**

```bash
npm test && npm run typecheck && npm run lint
git add src/engine/
git commit -m "$(cat <<'EOF'
feat: choix exclusif entre voiture de société et budget mobilité

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 : la saisie, la validation et la sauvegarde v6

**Fichiers :**
- Modifier : `src/engine/validation.ts`
- Modifier : `src/hooks/useSaisie.ts`
- Test : `src/engine/validation.test.ts`, `src/hooks/useSaisie.test.ts`

**Interfaces :**
- Consomme : `CHOIX_MOBILITE`, `ChoixMobilite`, `Avantages`, `AVANTAGES_AUCUN` (tâche 4) ; `BUDGET_MOBILITE_AUCUN`, `BudgetMobiliteSaisi` (tâche 3).
- Produit :
  - `interface SaisieBudgetMobilite { budgetAnnuel: string; pilier3Annuel: string }`
  - `SaisieFormulaire` gagne `choixMobilite: ChoixMobilite` et `budgetMobilite: SaisieBudgetMobilite`
  - `const SAISIE_BUDGET_MOBILITE_PAR_DEFAUT: SaisieBudgetMobilite`
  - codes d'erreur `'budgetMobiliteInvalide'`, `'pilier3Invalide'`, `'pilier3SuperieurAuBudget'` ; clés d'erreur `budgetAnnuel`, `pilier3Annuel`
  - clé de stockage `wage-calculator:saisie:v6`, `CLE_STOCKAGE_V5` conservée en lecture

- [ ] **Étape 1 : écrire les tests de validation qui échouent**

Dans `src/engine/validation.test.ts`, ajoute :

```ts
describe('budget mobilité', () => {
  const saisieBudget = (budgetMobilite: Partial<SaisieBudgetMobilite>): SaisieFormulaire => ({
    ...SAISIE_PAR_DEFAUT,
    choixMobilite: 'budgetMobilite',
    budgetMobilite: { ...SAISIE_BUDGET_MOBILITE_PAR_DEFAUT, ...budgetMobilite },
  })

  it('convertit le budget et la part en cash', () => {
    const r = validerSaisie(saisieBudget({ budgetAnnuel: '6000', pilier3Annuel: '2000' }), '2026-09-15')
    expect(r.ok && r.avantages.choixMobilite).toBe('budgetMobilite')
    expect(r.ok && r.avantages.budgetMobilite).toEqual({ budgetAnnuelCentimes: 600_000, pilier3AnnuelCentimes: 200_000 })
  })

  it('refuse une part en cash supérieure au budget, sur son propre champ', () => {
    const r = validerSaisie(saisieBudget({ budgetAnnuel: '6000', pilier3Annuel: '6000,01' }), '2026-09-15')
    expect(r.ok).toBe(false)
    expect(!r.ok && r.erreurs.pilier3Annuel).toBe('pilier3SuperieurAuBudget')
  })

  it('refuse un budget mal formé', () => {
    const r = validerSaisie(saisieBudget({ budgetAnnuel: 'abc' }), '2026-09-15')
    expect(!r.ok && r.erreurs.budgetAnnuel).toBe('budgetMobiliteInvalide')
  })

  it('accepte un budget et une part en cash nuls', () => {
    const r = validerSaisie(saisieBudget({ budgetAnnuel: '0', pilier3Annuel: '0' }), '2026-09-15')
    expect(r.ok).toBe(true)
    expect(r.ok && r.avantages.budgetMobilite).toEqual({ budgetAnnuelCentimes: 0, pilier3AnnuelCentimes: 0 })
  })

  it('ne valide pas les champs du budget quand la voiture est choisie', () => {
    const saisie: SaisieFormulaire = {
      ...SAISIE_PAR_DEFAUT,
      choixMobilite: 'voiture',
      budgetMobilite: { budgetAnnuel: 'abc', pilier3Annuel: 'abc' },
    }
    const r = validerSaisie(saisie, '2026-09-15')
    expect(r.ok).toBe(true)
    expect(r.ok && r.avantages.budgetMobilite).toEqual({ budgetAnnuelCentimes: 0, pilier3AnnuelCentimes: 0 })
  })

  it('ne valide pas les champs de la voiture quand le budget mobilité est choisi', () => {
    const saisie: SaisieFormulaire = {
      ...SAISIE_PAR_DEFAUT,
      choixMobilite: 'budgetMobilite',
      atn: 'abc',
      voiture: { ...SAISIE_VOITURE_PAR_DEFAUT, mode: 'voiture', valeurCatalogue: 'abc' },
      budgetMobilite: { budgetAnnuel: '6000', pilier3Annuel: '2000' },
    }
    const r = validerSaisie(saisie, '2026-09-15')
    expect(r.ok).toBe(true)
    expect(r.ok && r.avantages.atn).toEqual(ATN_AUCUN)
  })
})
```

Complète les imports du fichier de test : `SAISIE_BUDGET_MOBILITE_PAR_DEFAUT`, `SAISIE_VOITURE_PAR_DEFAUT`, `type SaisieBudgetMobilite`, et `ATN_AUCUN` depuis `./atnVoiture`.

- [ ] **Étape 2 : lancer les tests et constater l'échec**

Commande : `npx vitest run src/engine/validation.test.ts`
Attendu : ÉCHEC à la compilation — `SAISIE_BUDGET_MOBILITE_PAR_DEFAUT` et `choixMobilite` n'existent pas.

- [ ] **Étape 3 : écrire la validation**

Dans `src/engine/validation.ts` :

Complète les imports : `AVANTAGES_AUCUN, CHOIX_MOBILITE, type Avantages, type ChoixMobilite` depuis `./avantages`, et `BUDGET_MOBILITE_AUCUN, type BudgetMobiliteSaisi` depuis `./budgetMobilite`.

Après l'interface `SaisiePrimes`, ajoute :

```ts
/** Budget mobilité, tel que tapé (spec budget mobilité § 5). */
export interface SaisieBudgetMobilite {
  budgetAnnuel: string
  pilier3Annuel: string
}
```

Dans `SaisieFormulaire`, après `primes: SaisiePrimes` :

```ts
  /** Voiture de société, budget mobilité, ou ni l'un ni l'autre : les deux sont exclusifs. */
  choixMobilite: ChoixMobilite
  budgetMobilite: SaisieBudgetMobilite
```

Ajoute les trois codes d'erreur à `CodeErreur` :

```ts
  | 'budgetMobiliteInvalide'
  | 'pilier3Invalide'
  | 'pilier3SuperieurAuBudget'
```

et les deux clés à `ErreursSaisie` :

```ts
  budgetAnnuel?: CodeErreur
  pilier3Annuel?: CodeErreur
```

Ajoute la borne de saisie, à côté des autres constantes (`CONTRIBUTION_MAX_CENTIMES` et consorts) :

```ts
/** Borne de saisie, large : le dépassement des bornes légales est une alerte, pas une erreur. */
const BUDGET_MOBILITE_MAX_CENTIMES = 5_000_000
```

Ajoute la valeur par défaut, après `SAISIE_PRIMES_PAR_DEFAUT` :

```ts
export const SAISIE_BUDGET_MOBILITE_PAR_DEFAUT: SaisieBudgetMobilite = {
  budgetAnnuel: '6000,00',
  pilier3Annuel: '0',
}
```

Dans `SAISIE_PAR_DEFAUT`, après `primes: SAISIE_PRIMES_PAR_DEFAUT` :

```ts
  // 'voiture' : l'état historique de l'app, où la section ATN est toujours affichée.
  choixMobilite: 'voiture',
  budgetMobilite: SAISIE_BUDGET_MOBILITE_PAR_DEFAUT,
```

Ajoute la fonction de validation, après `validerPrimes` :

```ts
/** Budget mobilité normalisé ; ne valide rien si ce n'est pas le choix retenu. */
function validerBudgetMobilite(saisie: SaisieFormulaire, erreurs: ErreursSaisie): BudgetMobiliteSaisi {
  if (saisie.choixMobilite !== 'budgetMobilite') {
    return BUDGET_MOBILITE_AUCUN
  }
  const b = saisie.budgetMobilite
  const budget = montantBorne(b.budgetAnnuel, 0, BUDGET_MOBILITE_MAX_CENTIMES)
  if (budget === null) {
    erreurs.budgetAnnuel = 'budgetMobiliteInvalide'
  }
  const pilier3 = montantBorne(b.pilier3Annuel, 0, BUDGET_MOBILITE_MAX_CENTIMES)
  if (pilier3 === null) {
    erreurs.pilier3Annuel = 'pilier3Invalide'
  } else if (budget !== null && pilier3 > budget) {
    erreurs.pilier3Annuel = 'pilier3SuperieurAuBudget'
  }
  return budget === null || pilier3 === null || pilier3 > budget
    ? BUDGET_MOBILITE_AUCUN
    : { budgetAnnuelCentimes: budget, pilier3AnnuelCentimes: pilier3 }
}
```

Dans `validerAtn`, ajoute en tout premier, avant la validation de la contribution :

```ts
  // Voiture et budget mobilité sont exclusifs : hors du mode voiture, rien n'est saisi ni validé.
  if (saisie.choixMobilite !== 'voiture') {
    return ATN_AUCUN
  }
```

Dans `validerSaisie`, remplace la construction des avantages par :

```ts
  const avantages: Avantages = {
    ...validerAvantages(saisie.avantages, erreurs),
    atn: validerAtn(saisie, dateIso, erreurs),
    choixMobilite: saisie.choixMobilite,
    budgetMobilite: validerBudgetMobilite(saisie, erreurs),
  }
```

Les deux lignes par défaut ajoutées dans `validerAvantages` en tâche 4 restent en place : elles satisfont le type, et `validerSaisie` les écrase toutes les deux. Vérifie avec `npm run typecheck` et n'en retire une que si le compilateur la déclare superflue.

- [ ] **Étape 4 : lancer les tests de validation et constater le succès**

Commande : `npx vitest run src/engine/validation.test.ts`
Attendu : SUCCÈS.

- [ ] **Étape 5 : écrire les tests de sauvegarde qui échouent**

Dans `src/hooks/useSaisie.test.ts`, en suivant exactement le style des `describe` de migration existants (repère celui qui teste la reprise depuis la clé v4) :

```ts
describe('reprise d’une saisie antérieure (v6)', () => {
  const V5 = (() => {
    const { choixMobilite: _choix, budgetMobilite: _budget, ...reste } = SAISIE_PAR_DEFAUT
    return reste
  })()

  it('lit la clé v6 en priorité', () => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, montant: '4000' }))
    localStorage.setItem(CLE_STOCKAGE_V5, JSON.stringify({ ...V5, montant: '1000' }))
    expect(lireSaisieStockee().montant).toBe('4000')
  })

  it('reprend une saisie v5 en gardant la voiture et sans budget mobilité', () => {
    localStorage.setItem(CLE_STOCKAGE_V5, JSON.stringify({ ...V5, montant: '4000' }))
    const saisie = lireSaisieStockee()
    expect(saisie.montant).toBe('4000')
    // Comportement inchangé pour une saisie existante : la section ATN reste celle d'avant.
    expect(saisie.choixMobilite).toBe('voiture')
    expect(saisie.budgetMobilite).toEqual(SAISIE_BUDGET_MOBILITE_PAR_DEFAUT)
  })

  it('remplace un bloc budget mobilité corrompu par la valeur par défaut', () => {
    localStorage.setItem(
      CLE_STOCKAGE,
      JSON.stringify({ ...SAISIE_PAR_DEFAUT, budgetMobilite: { budgetAnnuel: 5 }, choixMobilite: 'budgetMobilite' }),
    )
    expect(lireSaisieStockee().budgetMobilite).toEqual(SAISIE_BUDGET_MOBILITE_PAR_DEFAUT)
  })

  it('remplace un choix de mobilité inconnu par la valeur par défaut', () => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, choixMobilite: 'trottinette' }))
    expect(lireSaisieStockee().choixMobilite).toBe('voiture')
  })

  it('ne réécrit jamais la clé v5', () => {
    localStorage.setItem(CLE_STOCKAGE_V5, JSON.stringify({ ...V5, montant: '4000' }))
    lireSaisieStockee()
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE_V5) as string).montant).toBe('4000')
  })
})
```

Complète les imports du fichier de test : `CLE_STOCKAGE_V5`, `SAISIE_BUDGET_MOBILITE_PAR_DEFAUT`.

**Adapte les tests existants selon cette règle** : partout où un test de migration construit une saisie « de la version précédente » à partir de `SAISIE_PAR_DEFAUT`, il doit maintenant en retirer aussi `choixMobilite` et `budgetMobilite`, sinon il ne représente plus une vraie saisie ancienne. Ne supprime aucun test ; renomme `v5` en `v6` dans les titres uniquement là où le nombre désigne le format de stockage courant, pas là où il désigne un format historique. Note dans ton rapport chaque test modifié et pourquoi.

- [ ] **Étape 6 : lancer les tests et constater l'échec**

Commande : `npx vitest run src/hooks/useSaisie.test.ts`
Attendu : ÉCHEC — `CLE_STOCKAGE_V5` n'existe pas.

- [ ] **Étape 7 : écrire la migration**

Dans `src/hooks/useSaisie.ts` :

```ts
export const CLE_STOCKAGE = 'wage-calculator:saisie:v6'
/** Format V5 (sans budget mobilité) : lu pour reprendre la saisie, jamais réécrit. */
export const CLE_STOCKAGE_V5 = 'wage-calculator:saisie:v5'
```

(les constantes `CLE_STOCKAGE_V4` à `CLE_STOCKAGE_V1` et leurs commentaires ne changent pas).

Ajoute les deux gardes de type, à côté de `estSaisiePrimes` :

```ts
function estChoixMobilite(valeur: unknown): valeur is ChoixMobilite {
  return typeof valeur === 'string' && (CHOIX_MOBILITE as readonly string[]).includes(valeur)
}

function estSaisieBudgetMobilite(valeur: unknown): valeur is SaisieBudgetMobilite {
  return estObjet(valeur) && typeof valeur.budgetAnnuel === 'string' && typeof valeur.pilier3Annuel === 'string'
}
```

Dans `estSaisie`, ajoute les deux vérifications :

```ts
    estSaisiePrimes((valeur as Objet).primes) &&
    estChoixMobilite((valeur as Objet).choixMobilite) &&
    estSaisieBudgetMobilite((valeur as Objet).budgetMobilite)
```

Dans `completer`, ajoute les deux champs :

```ts
    choixMobilite: estChoixMobilite(v.choixMobilite) ? v.choixMobilite : SAISIE_PAR_DEFAUT.choixMobilite,
    budgetMobilite: estSaisieBudgetMobilite(v.budgetMobilite) ? v.budgetMobilite : SAISIE_BUDGET_MOBILITE_PAR_DEFAUT,
```

Dans `repriseV1`, ajoute les deux champs avec leurs valeurs par défaut :

```ts
    choixMobilite: SAISIE_PAR_DEFAUT.choixMobilite,
    budgetMobilite: SAISIE_BUDGET_MOBILITE_PAR_DEFAUT,
```

Dans `lireSaisieStockee`, ajoute la nouvelle clé en tête de la cascade :

```ts
  for (const cle of [CLE_STOCKAGE, CLE_STOCKAGE_V5, CLE_STOCKAGE_V4, CLE_STOCKAGE_V3, CLE_STOCKAGE_V2]) {
```

Complète les imports : `CHOIX_MOBILITE, type ChoixMobilite` depuis `../engine/avantages`, et `SAISIE_BUDGET_MOBILITE_PAR_DEFAUT, type SaisieBudgetMobilite` depuis `../engine/validation`.

- [ ] **Étape 8 : lancer les tests et constater le succès**

Commande : `npx vitest run src/hooks/useSaisie.test.ts src/engine/validation.test.ts`
Attendu : SUCCÈS.

- [ ] **Étape 9 : vérifier et commiter**

```bash
npm test && npm run typecheck && npm run lint
git add src/engine/validation.ts src/engine/validation.test.ts src/hooks/useSaisie.ts src/hooks/useSaisie.test.ts
git commit -m "$(cat <<'EOF'
feat: saisie du budget mobilité et sauvegarde v6

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

`src/App.test.tsx` ne doit pas changer dans cette tâche et doit rester vert : l'interface ne montre pas encore le budget mobilité. Si un test d'interface échoue, c'est un signal, pas une chose à adapter.

---

## Task 6 : l'interface, l'alerte et la documentation

**Fichiers :**
- Créer : `src/components/BudgetMobilite.tsx`
- Modifier : `src/components/FormulaireSituation.tsx`
- Modifier : `src/components/Avertissements.tsx`
- Modifier : `src/hooks/useCalcul.ts`
- Modifier : `src/App.tsx`
- Modifier : `src/i18n/fr.ts`
- Modifier : `README.md`
- Modifier : `docs/superpowers/specs/2026-09-24-budget-mobilite-design.md` (statut)
- Test : `src/App.test.tsx`

**Interfaces :**
- Consomme : `ResultatBudgetMobilite` (tâche 3) via `etat.complet.budgetMobilite` ; `CHOIX_MOBILITE`, `ChoixMobilite` (tâche 4) ; `SaisieBudgetMobilite` (tâche 5) ; `ParametresBudgetMobilite` (tâche 2).
- Produit : l'interface complète. Aucune tâche ultérieure n'en dépend.

- [ ] **Étape 1 : écrire les tests d'interface qui échouent**

Dans `src/App.test.tsx`, en suivant le style des tests existants (repère comment ils rendent `<App dateIso="…" />`, comment ils créent leur `userEvent`, et comment ils interrogent les champs par leur libellé accessible) :

```ts
describe('budget mobilité', () => {
  const choisirBudgetMobilite = async (utilisateur: ReturnType<typeof userEvent.setup>) => {
    await utilisateur.click(screen.getByRole('radio', { name: 'Budget mobilité' }))
  }

  it('affiche la section voiture par défaut et pas le budget mobilité', () => {
    render(<App dateIso="2026-09-15" />)
    expect(screen.getByRole('radio', { name: 'Voiture de société' })).toBeChecked()
    expect(screen.queryByLabelText('Budget mobilité annuel (€)')).not.toBeInTheDocument()
  })

  it('remplace la section voiture par le budget mobilité quand on le choisit', async () => {
    const utilisateur = userEvent.setup()
    render(<App dateIso="2026-09-15" />)
    await choisirBudgetMobilite(utilisateur)
    expect(screen.getByLabelText('Budget mobilité annuel (€)')).toBeInTheDocument()
    expect(screen.queryByLabelText('Avantage de toute nature mensuel (€)')).not.toBeInTheDocument()
  })

  it('ajoute le pilier 3 net au net versé', async () => {
    const utilisateur = userEvent.setup()
    render(<App dateIso="2026-09-15" />)
    await choisirBudgetMobilite(utilisateur)
    const cash = screen.getByLabelText('Part prise en cash, pilier 3 (€ par an)')
    await utilisateur.clear(cash)
    await utilisateur.type(cash, '2000')
    const panneau = screen.getByRole('region', { name: 'Budget mobilité' })
    // 2 000 €/an → 166,67 €/mois brut, 63,45 € de cotisation, 103,22 € nets.
    expect(within(panneau).getByText('166,67 €')).toBeInTheDocument()
    expect(within(panneau).getByText('63,45 €')).toBeInTheDocument()
    expect(within(panneau).getByText('103,22 €')).toBeInTheDocument()
  })

  it('alerte quand le budget sort des bornes légales, sans bloquer le calcul', async () => {
    const utilisateur = userEvent.setup()
    render(<App dateIso="2026-09-15" />)
    await choisirBudgetMobilite(utilisateur)
    const budget = screen.getByLabelText('Budget mobilité annuel (€)')
    await utilisateur.clear(budget)
    await utilisateur.type(budget, '1000')
    expect(screen.getByText(/bornes légales/i)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Budget mobilité' })).toBeInTheDocument()
  })

  it('affiche l’erreur d’une part en cash trop élevée sur son propre champ', async () => {
    const utilisateur = userEvent.setup()
    render(<App dateIso="2026-09-15" />)
    await choisirBudgetMobilite(utilisateur)
    const cash = screen.getByLabelText('Part prise en cash, pilier 3 (€ par an)')
    await utilisateur.clear(cash)
    await utilisateur.type(cash, '99999')
    expect(cash).toHaveAttribute('aria-invalid', 'true')
    expect(cash).toHaveAttribute('aria-describedby', 'pilier3Annuel-erreur')
  })
})
```

- [ ] **Étape 2 : lancer les tests et constater l'échec**

Commande : `npx vitest run src/App.test.tsx`
Attendu : ÉCHEC — le bouton radio « Budget mobilité » n'existe pas.

- [ ] **Étape 3 : ajouter les textes**

Dans `src/i18n/fr.ts`, dans le bloc `formulaire`, après le bloc `voiture` :

```ts
    mobilite: {
      titre: 'Voiture ou budget mobilité',
      aide: 'Le budget mobilité s’obtient en échange de la voiture de société, ou du droit d’en avoir une : les deux ne se cumulent pas.',
      choix: {
        aucun: 'Aucun',
        voiture: 'Voiture de société',
        budgetMobilite: 'Budget mobilité',
      } satisfies Record<ChoixMobilite, string>,
      budgetAnnuel: 'Budget mobilité annuel (€)',
      aideBudgetAnnuel: 'Montant annuel communiqué par votre employeur.',
      pilier3: 'Part prise en cash, pilier 3 (€ par an)',
      aidePilier3:
        'Le solde que vous ne dépensez pas en voiture zéro émission (pilier 1) ni en transports durables et frais de logement (pilier 2). Seule cette part est versée sur votre compte.',
    },
```

Complète l'import de type en tête de `fr.ts` : `type ChoixMobilite` depuis `../engine/avantages`.

Dans le bloc `erreurs`, ajoute les trois messages :

```ts
  budgetMobiliteInvalide: 'Budget annuel invalide.',
  pilier3Invalide: 'Part en cash invalide.',
  pilier3SuperieurAuBudget: 'La part prise en cash ne peut pas dépasser le budget annuel.',
```

À la racine de `fr`, après le bloc `primes`, ajoute les textes du panneau :

```ts
  budgetMobilite: {
    titre: 'Budget mobilité',
    pilier3Brut: {
      libelle: 'Pilier 3, part en cash',
      explication: 'Le solde du budget annuel que vous prenez en argent, ramené au mois.',
      source: 'Loi du 17/03/2019, budget mobilité',
    },
    cotisation: {
      libelle: 'Cotisation spéciale de sécurité sociale',
      explication: 'Retenue propre au pilier 3. Ce montant n’est pas imposé, mais il supporte cette cotisation.',
      source: 'Loi du 17/03/2019, budget mobilité',
    },
    net: {
      libelle: 'Net versé en plus, par mois',
      explication: 'S’ajoute à votre net mensuel : il est exonéré d’impôt.',
      source: 'Loi du 17/03/2019, budget mobilité',
    },
    piliers1Et2: (montant: string) =>
      `Reste ${montant} par an pour les piliers 1 et 2 (voiture zéro émission, transports durables, logement), exonérés et non détaillés ici.`,
  },
```

Dans le bloc `alertes`, ajoute :

```ts
    budgetMobiliteHorsBornes: (montant: string, min: string, max: string) =>
      `Budget de ${montant} par an : hors des bornes légales (${min} à ${max}). Le calcul reste indicatif.`,
```

- [ ] **Étape 4 : le sélecteur et le mini-formulaire**

Dans `src/components/FormulaireSituation.tsx`, complète les imports (`CHOIX_MOBILITE`, `type ChoixMobilite` depuis `../engine/avantages` ; `type SaisieBudgetMobilite` depuis `../engine/validation`).

À côté de `modifierVoiture`, ajoute :

```ts
  const bm = saisie.budgetMobilite
  const tm = t.mobilite
  const modifierBudget = <K extends keyof SaisieBudgetMobilite>(champ: K, valeur: SaisieBudgetMobilite[K]) =>
    onChange('budgetMobilite', { ...bm, [champ]: valeur })
```

Juste **avant** le `<fieldset>` de la voiture, insère le sélecteur, en copiant la structure du groupe de radios `modeAtn` déjà présent dans ce fichier (même `fieldset`, même `legend`, mêmes classes) :

```tsx
        <fieldset>
          <legend className="text-sm font-medium">{tm.titre}</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {CHOIX_MOBILITE.map((choix) => (
              <label key={choix} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="choixMobilite"
                  value={choix}
                  checked={saisie.choixMobilite === choix}
                  onChange={() => onChange('choixMobilite', choix as ChoixMobilite)}
                  className="h-4 w-4"
                />
                {tm.choix[choix]}
              </label>
            ))}
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{tm.aide}</p>
        </fieldset>
```

Enveloppe le `<fieldset>` existant de la voiture dans `{saisie.choixMobilite === 'voiture' && ( … )}`.

Après lui, ajoute le mini-formulaire, en utilisant le composant `ChampAvantage` déjà présent dans ce fichier (c'est lui qui pose `aria-invalid` et `aria-describedby`) :

```tsx
        {saisie.choixMobilite === 'budgetMobilite' && (
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">{tm.choix.budgetMobilite}</legend>
            <ChampAvantage
              id="budgetAnnuel"
              libelle={tm.budgetAnnuel}
              valeur={bm.budgetAnnuel}
              aide={tm.aideBudgetAnnuel}
              erreur={erreurTexte(erreurs.budgetAnnuel)}
              onChange={(valeur) => modifierBudget('budgetAnnuel', valeur)}
            />
            <ChampAvantage
              id="pilier3Annuel"
              libelle={tm.pilier3}
              valeur={bm.pilier3Annuel}
              aide={tm.aidePilier3}
              erreur={erreurTexte(erreurs.pilier3Annuel)}
              onChange={(valeur) => modifierBudget('pilier3Annuel', valeur)}
            />
          </fieldset>
        )}
```

Vérifie la signature réelle de `ChampAvantage` en haut du fichier et adapte les noms de props si elles diffèrent : ce composant est la source de vérité, pas ce plan. Vérifie de même le nom exact de l'aide aux erreurs (`erreurTexte` ou `texteErreur` selon ce que le fichier utilise déjà).

- [ ] **Étape 5 : exposer les bornes dans l'état du calcul**

Dans `src/hooks/useCalcul.ts`, ajoute à l'état `ok`, à côté de `plafondsAvantages` :

```ts
      /** Bornes légales du budget mobilité de la période, pour l'alerte. */
      parametresBudgetMobilite: ParametresBudgetMobilite
```

et renseigne-le dans **les deux** branches de retour (`netVersBrut` et `brutVersNet`) avec `parametres.budgetMobilite`. Importe `ParametresBudgetMobilite` depuis `../engine/parametres/types`, à côté de `ParametresAvantages`.

- [ ] **Étape 6 : le panneau et l'alerte**

Crée `src/components/BudgetMobilite.tsx`, sur le modèle de `PrimesAnnuelles.tsx` :

```tsx
import type { ResultatBudgetMobilite } from '../engine/budgetMobilite'
import { fr } from '../i18n/fr'
import { formatEuro } from '../utils/format'
import { LigneCalcul } from './LigneCalcul'

/** Le pilier 3 du budget mobilité, s'il est choisi et non nul (spec budget mobilité § 6). */
export function BudgetMobilite({ budget }: { budget: ResultatBudgetMobilite | null }) {
  const t = fr.budgetMobilite
  if (budget === null || (budget.pilier3MensuelBrutCentimes === 0 && budget.piliers1Et2AnnuelCentimes === 0)) {
    return null
  }
  return (
    <section aria-labelledby="titre-budget-mobilite" className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
      <h2 id="titre-budget-mobilite" className="mb-2 text-lg font-semibold">
        {t.titre}
      </h2>
      <ul className="divide-y divide-slate-200 dark:divide-slate-700">
        <LigneCalcul {...t.pilier3Brut} sens="=" montantCentimes={budget.pilier3MensuelBrutCentimes} />
        <LigneCalcul {...t.cotisation} sens="-" montantCentimes={budget.cotisationSpecialeCentimes} />
        <LigneCalcul {...t.net} sens="=" montantCentimes={budget.pilier3MensuelNetCentimes} />
      </ul>
      <p className="mt-4 text-xs text-slate-600 dark:text-slate-400">
        {t.piliers1Et2(formatEuro(budget.piliers1Et2AnnuelCentimes))}
      </p>
    </section>
  )
}
```

Le titre accessible de la région doit être exactement `Budget mobilité` : c'est ce que le test interroge.

Dans `src/components/Avertissements.tsx`, ajoute le paragraphe d'alerte après celui de `sousRmmmg`, en reprenant ses classes :

```tsx
      {ok?.complet.budgetMobilite.horsBornes && (
        <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {fr.alertes.budgetMobiliteHorsBornes(
            formatEuro(ok.complet.avantages.budgetMobilite.budgetAnnuelCentimes),
            formatEuro(ok.parametresBudgetMobilite.budgetAnnuelMinCentimes),
            formatEuro(ok.parametresBudgetMobilite.budgetAnnuelMaxCentimes),
          )}
        </p>
      )}
```

Dans `src/App.tsx`, affiche le panneau à côté de celui des primes :

```tsx
          <div className="order-5 lg:col-span-2">
            <BudgetMobilite budget={ok?.complet.budgetMobilite ?? null} />
          </div>
```

et ajoute l'import correspondant.

- [ ] **Étape 7 : lancer les tests et constater le succès**

Commande : `npx vitest run src/App.test.tsx`
Attendu : SUCCÈS, les 5 nouveaux tests compris.

- [ ] **Étape 8 : la documentation**

Dans `README.md`, ajoute le budget mobilité à la liste des fonctionnalités, en suivant la formulation des entrées existantes, et dans la section des limites :

> Budget mobilité : seul le pilier 3 (le solde pris en cash) est calculé, mensualisé et diminué de sa cotisation spéciale de sécurité sociale. Les piliers 1 (voiture zéro émission) et 2 (transports durables, frais de logement) sont affichés comme un montant exonéré, sans être détaillés. Le budget annuel est saisi tel que l'employeur le communique : il n'est pas recalculé depuis la voiture remplacée. La régularisation de fin d'année n'est pas modélisée.

Si la tâche 1 a conclu que le taux ou les bornes reposent sur une source secondaire, dis-le ici aussi, comme le README le fait déjà pour d'autres valeurs.

Dans `docs/superpowers/specs/2026-09-24-budget-mobilite-design.md`, passe le statut de `en cours de rédaction` à `appliquée`, et referme les points ouverts de la section 9 que la tâche 1 a tranchés, en citant sa source. Laisse ouverts ceux qui le restent, sans les biffer.

- [ ] **Étape 9 : vérifier et commiter**

```bash
npm test && npm run typecheck && npm run lint && npm run build
git add src/ README.md docs/superpowers/specs/2026-09-24-budget-mobilite-design.md
git commit -m "$(cat <<'EOF'
feat: panneau et saisie du budget mobilité

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Après la dernière tâche

- Relecture finale de toute la branche, sur le modèle des sous-projets précédents.
- `npm run verifier:recul` (environ 20 minutes) **seulement si** le diff donne une raison de croire que le calcul du net mensuel a bougé. Le pilier 3 n'entre ni dans la base du précompte ni dans celle de l'ONSS : a priori, seule l'empreinte des paramètres change, et le recul doit rester à 514 centimes.
- **Ni push ni merge** sans demande explicite de l'utilisateur.
