# Salaire net Belgique — V2.6 : budget mobilité

- **Date :** 2026-09-24
- **Statut :** en cours de rédaction
- **Branche :** à créer (`feat/budget-mobilite`)
- **S'appuie sur :** [spec V1](2026-09-14-salaire-net-belgique-v1-design.md), [spec avantages](2026-09-16-avantages-extralegaux-design.md), [spec voiture](2026-09-22-voiture-societe-design.md), [spec primes annuelles](2026-09-23-primes-annuelles-design.md)

---

## 1. Objectif

Modéliser le **budget mobilité** (loi du 17/03/2019, modifiée à plusieurs reprises depuis), une alternative à la voiture de société que l'employeur peut proposer et que l'employé peut choisir à la place de son véhicule — ou du droit à en avoir un. Son adoption devient plus fréquente en Belgique à mesure que la fiscalité des voitures thermiques se durcit ; c'est ce qui motive ce sous-projet.

Le budget se répartit en trois piliers :
- **pilier 1** : une voiture de société, obligatoirement zéro émission depuis le 1er janvier 2026 ;
- **pilier 2** : des moyens de transport durables et des frais de logement ;
- **pilier 3** : le solde non utilisé, versé en cash.

Piliers 1 et 2 sont exonérés d'impôt et de cotisations sociales. Le pilier 3 est exonéré d'impôt, mais soumis dans le chef de l'employé à une **cotisation spéciale de sécurité sociale** (taux à confirmer, section 2).

Choix de l'utilisateur, 2026-09-24 :
- **seul le pilier 3 est calculé** : c'est le seul qui modifie le net versé de façon simulable sans données côté employeur (assurance, entretien, frais réels engagés). Les piliers 1 et 2 sont affichés comme un montant restant, exonéré, sans détailler leur contenu ;
- le budget annuel est **saisi directement** par l'utilisateur (communiqué par son employeur), pas recalculé depuis une voiture de référence — cette formule dépend de coûts que l'employeur connaît seul (TCO) ;
- le pilier 3 est **mensualisé** : l'utilisateur saisit un montant annuel, l'app le divise par douze et l'ajoute chaque mois au net versé, comme le télétravail ou les écochèques ;
- **exclusivité stricte** avec la voiture de société : un sélecteur à trois branches (aucun / voiture de société / budget mobilité) remplace la case à cocher voiture actuelle.

### Critères de réussite

1. Le pilier 3 mensuel est calculé au centime, retenue de cotisation spéciale comprise.
2. Un budget annuel hors des bornes légales déclenche une alerte visible, sans bloquer le calcul.
3. Le choix voiture / budget mobilité / aucun est mutuellement exclusif par construction — aucune combinaison invalide n'est représentable dans l'état de l'application.
4. Une saisie enregistrée par une version antérieure (jusqu'à v5) se recharge sans erreur.
5. Les tests déjà verts ne changent aucune valeur attendue : ni le calcul mensuel de base, ni la voiture de société, ni les primes annuelles ne sont affectés par ce sous-projet.

### La règle d'or

Aucune valeur n'est ajustée pour faire tomber un exemple juste. Un écart se documente.

### Hors périmètre

- le **détail du pilier 1** (sous-formulaire voiture zéro émission avec sa propre formule ATN) et le **détail du pilier 2** (frais de mobilité et de logement, plafonnés par catégorie) : affichés comme un montant global exonéré, non décomposés ;
- le **calcul du budget annuel depuis la voiture remplacée** (formule basée sur le coût total pour l'employeur — assurance, entretien, carburant — que l'employé ne connaît généralement pas) ;
- la **cotisation spéciale de sécurité sociale trimestrielle** classique (celle qui porte sur l'ensemble de la rémunération d'un trimestre) : déjà hors périmètre depuis la V2.5, sans lien avec la cotisation spéciale propre au pilier 3 ;
- la **régularisation de fin d'année** du budget mobilité (le solde réellement dépensé en piliers 1 et 2 diffère souvent du budget alloué, avec un ajustement en fin d'année ou à la sortie) ;
- le **plan cafétéria** au sens large, dont le budget mobilité n'est qu'une composante possible chez certains employeurs.

---

## 2. Sources officielles

Valeurs relevées lors de la comparaison du 2026-09-22 (sources secondaires : Securex, lebudgetmobilite.be, Lizy — voir `docs/idees-fonctionnalites.md`). **Aucune n'est encore confirmée sur le texte légal** ; c'est le travail de la tâche 1 du plan.

| Élément | Valeur de travail | Statut |
|---|---|---|
| Cotisation spéciale de sécurité sociale sur le pilier 3 | 38,07 % | à confirmer sur le texte (loi du 17/03/2019, art. 8, ou AR d'exécution) |
| Borne basse du budget annuel, 2026 | 3 233 € | à confirmer, et à vérifier si indexée chaque année (donc potentiellement différente en 2025) |
| Borne haute du budget annuel, 2026 | 17 244 € | idem |
| Bornes du budget annuel, 2025 | inconnues | à relever si le texte les distingue de 2026 ; sinon, documenter l'absence de distinction |
| Base de la cotisation spéciale (le pilier 3 brut, ou un autre montant) | le pilier 3 brut annuel | à confirmer |
| La cotisation spéciale est-elle une retenue employé ou une charge employeur | retenue employé (réduit le net) | à confirmer — c'est ce qui justifie qu'elle entre dans notre calcul de net versé |

Règle de décision, identique aux sous-projets précédents : si le texte officiel **contredit** une valeur ci-dessus, le travail s'arrête et le contrôleur tranche ; si le texte reste **introuvable**, la valeur est conservée et marquée « source secondaire » dans le code, la spec et le README.

---

## 3. Moteur

### 3.1 Nouveau module `src/engine/budgetMobilite.ts`

```ts
/** Budget mobilité tel que saisi (spec budget mobilité § 3.1). */
export interface BudgetMobiliteSaisi {
  /** Budget annuel total accordé par l'employeur. */
  budgetAnnuelCentimes: number
  /** Part prise en cash (pilier 3). ≤ budgetAnnuelCentimes ; le reste est piliers 1 + 2. */
  pilier3AnnuelCentimes: number
}

export const BUDGET_MOBILITE_AUCUN: BudgetMobiliteSaisi = {
  budgetAnnuelCentimes: 0,
  pilier3AnnuelCentimes: 0,
}

export interface ResultatBudgetMobilite {
  pilier3MensuelBrutCentimes: number
  cotisationSpecialeCentimes: number
  pilier3MensuelNetCentimes: number
  /** budgetAnnuelCentimes − pilier3AnnuelCentimes, informatif, jamais dans un calcul de net. */
  piliers1Et2AnnuelCentimes: number
  /** true si budgetAnnuelCentimes sort des bornes légales de la période. */
  horsBornes: boolean
}

export function calculerBudgetMobilite(
  budget: BudgetMobiliteSaisi,
  parametres: Parametres,
): ResultatBudgetMobilite
```

Calcul (arrondi une seule fois par étape, `diviserArrondi` / `appliquerTaux`) :

```
pilier3MensuelBrutCentimes = diviserArrondi(pilier3AnnuelCentimes, 12)
cotisationSpecialeCentimes = appliquerTaux(pilier3MensuelBrutCentimes, tauxCotisationSpecialeDixMilliemes)
pilier3MensuelNetCentimes  = pilier3MensuelBrutCentimes − cotisationSpecialeCentimes
piliers1Et2AnnuelCentimes  = budgetAnnuelCentimes − pilier3AnnuelCentimes
horsBornes = budgetAnnuelCentimes > 0 et (budgetAnnuelCentimes < min ou > max de la période)
```

`pilier3MensuelNetCentimes` s'ajoute au net versé dans `remuneration.ts`, au même endroit que le télétravail et les frais propres. `piliers1Et2AnnuelCentimes` et `horsBornes` sont purement informatifs — ils n'entrent dans aucun calcul de net ou de brut.

### 3.2 Exclusivité avec la voiture

`SituationSansAtn` / `FamilleSansAtn` (aujourd'hui porteurs d'un `AtnSaisi`) gagnent un `choixMobilite: 'aucun' | 'voiture' | 'budgetMobilite'`. `resoudreAtn` (dans `atnVoiture.ts`) ne s'appelle que si `choixMobilite === 'voiture'` ; `calculerBudgetMobilite` ne s'appelle que si `choixMobilite === 'budgetMobilite'`. Le troisième cas (`'aucun'`) n'appelle ni l'un ni l'autre — c'est l'état actuel sans voiture.

---

## 4. Paramètres

```ts
export interface ParametresBudgetMobilite {
  tauxCotisationSpecialeDixMilliemes: number
  budgetAnnuelMinCentimes: number
  budgetAnnuelMaxCentimes: number
}
```

Ajouté à `Parametres` (`src/engine/parametres/types.ts`), rempli dans `p2025.ts` et `p2026-07.ts` par la tâche 1 avec les valeurs confirmées. `P2026_09` hérite de `P2026_07` comme pour tous les autres blocs de paramètres.

---

## 5. Modèle de saisie et migration de stockage (v6)

`aideAtn: boolean` disparaît de `SaisieSituation`, remplacé par `choixMobilite: 'aucun' | 'voiture' | 'budgetMobilite'`. Nouveau bloc `saisieBudgetMobilite` (texte, comme les autres montants saisis) :

```ts
interface SaisieBudgetMobilite {
  budgetAnnuel: string
  pilier3Annuel: string
}
```

Chaîne de reprise, dans `useSaisie.ts` :
- **v6** (nouveau format) : lu tel quel ;
- **v5 et antérieur** : `aideAtn: true` → `choixMobilite: 'voiture'` ; `aideAtn: false` ou absent → `choixMobilite: 'aucun'` ; `saisieBudgetMobilite` absent → valeurs par défaut (`BUDGET_MOBILITE_AUCUN` converti en texte) ; la clé v5 (et antérieures) n'est **jamais réécrite**, comme pour tous les formats précédents.
- La clé de stockage passe de `v5` à `v6` ; la lecture retombe en cascade v6 → v5 → v4 → v3 → v2 → v1.

---

## 6. Interface

Le formulaire remplace la case à cocher "voiture de société" par un sélecteur à trois options (radio ou équivalent accessible) : Aucun / Voiture de société / Budget mobilité. Choisir "Budget mobilité" ouvre un mini-formulaire à deux champs (budget annuel, part en cash), avec les mêmes mécanismes d'erreur par champ que le reste du formulaire (`aria-invalid` / `aria-describedby`).

Une sortie de bornes légales (`horsBornes`) affiche une **alerte non bloquante**, sur le modèle du dépassement de plafond des avantages extralégaux déjà présent dans l'app — le calcul continue, l'utilisateur est prévenu.

Le panneau de résultat ajoute une ligne "Budget mobilité (pilier 3)" au détail du net versé, avec le montant brut, la cotisation spéciale retenue, et le net qui en résulte ; une ligne secondaire informative rappelle le montant restant en piliers 1+2 (exonéré, non détaillé).

---

## 7. Architecture (fichiers touchés)

- Créer `src/engine/budgetMobilite.ts` (module + tests)
- Modifier `src/engine/parametres/types.ts`, `p2025.ts`, `p2026-07.ts` (nouveau bloc de paramètres)
- Modifier `src/engine/calculerBrut.ts` (le type `SituationFamiliale` / `SituationSansAtn` gagne `choixMobilite`)
- Modifier `src/engine/remuneration.ts` (branchement du net du pilier 3)
- Modifier `src/engine/validation.ts` (validation du budget annuel, de la part en cash, du sélecteur à 3 branches)
- Modifier `src/hooks/useSaisie.ts` (migration v6, chaîne de reprise)
- Modifier `src/hooks/useCalcul.ts` (appel conditionnel du bon module selon `choixMobilite`)
- Modifier `src/components/FormulaireSituation.tsx` (sélecteur à 3 branches, mini-formulaire)
- Créer ou modifier un composant de panneau (ligne budget mobilité dans le détail du calcul)
- Modifier `src/i18n/fr.ts` (nouveaux libellés)
- Modifier `README.md` (nouvelle fonctionnalité, limites)
- Modifier `tools/reference/reference.py` si un oracle indépendant est jugé utile pour ce calcul (un taux et deux bornes : à évaluer en tâche de plan, probablement un test direct suffit vu la simplicité du calcul)

---

## 8. Tests

- Le module `budgetMobilite.ts` : calcul du pilier 3 net à plusieurs montants, arrondi correct, `horsBornes` vrai/faux aux deux bornes exactes et juste au-delà.
- L'exclusivité : impossible de représenter `choixMobilite: 'voiture'` avec un `saisieBudgetMobilite` actif en même temps dans le calcul (par construction du type, pas seulement par validation).
- La migration : chaque maillon de la chaîne de reprise v6 → v5 → v4 → v3 → v2 → v1, y compris la préférence d'une clé sur la suivante, sur le modèle des tests de reprise de la V2.5.
- `verifier:recul` : à relancer si l'ajout du bloc de paramètres ou du champ `choixMobilite` a pu affecter l'empreinte du calcul du net mensuel de base (probable simple mise à jour d'empreinte, comme en V2.5, plutôt qu'un vrai changement de recul — à confirmer en fin de plan).

---

## 9. Risques et points ouverts

1. **Les bornes légales sont-elles vraiment fixes, ou dépendent-elles d'autre chose** (catégorie de fonction, ancienneté, secteur) ? Les sources secondaires citent un montant fixe pour 2026 ; si le texte dit autre chose, cette section se corrige en tâche 1.
2. **La cotisation spéciale de 38,07 % a-t-elle des règles de calcul propres** (base réduite, exonération partielle en début de dispositif) que les sources secondaires ne mentionnent pas ? À vérifier sur le texte.
3. **Interaction avec la cotisation spéciale de sécurité sociale trimestrielle classique** (hors périmètre général du calculateur, § 1) : le pilier 3 fait-il partie de son assiette ? Si oui, le net affiché est légèrement optimiste sur le trimestre concerné, comme documenté pour les primes annuelles — à signaler dans l'interface si confirmé.
4. **Le champ `aideAtn` renommé en `choixMobilite`** est un changement de type, pas seulement l'ajout d'un champ : toute intégration externe ou test qui référence encore `aideAtn` doit être mise à jour (recherche exhaustive nécessaire en début de plan).
