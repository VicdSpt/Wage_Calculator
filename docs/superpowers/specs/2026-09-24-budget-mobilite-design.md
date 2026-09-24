# Salaire net Belgique — V2.6 : budget mobilité

- **Date :** 2026-09-24
- **Statut :** appliquée
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

Correction par rapport à la conception initiale : l'ATN n'est pas un booléen à retourner (`aideAtn` n'existe pas dans le code — c'est seulement une clé de texte d'aide). Il vit dans `Avantages.atn : AtnSaisi` (`avantages.ts`), une section du formulaire **toujours affichée**, dont le mode `'montant'` à 0 signifie « pas de voiture ». `Avantages` gagne un champ frère :

```ts
export const CHOIX_MOBILITE = ['aucun', 'voiture', 'budgetMobilite'] as const
export type ChoixMobilite = (typeof CHOIX_MOBILITE)[number]

export interface Avantages {
  // … champs existants inchangés …
  atn: AtnSaisi
  choixMobilite: ChoixMobilite
  budgetMobilite: BudgetMobiliteSaisi
}
```

`calculerRemuneration` et `calculerBrutDepuisNetVerse` (`remuneration.ts`) n'appellent `resoudreAtn` que si `choixMobilite === 'voiture'` (sinon `atn` vaut `ATN_AUCUN`, comme aujourd'hui par défaut), et n'appellent `calculerBudgetMobilite` que si `choixMobilite === 'budgetMobilite'` (sinon le résultat du pilier 3 est nul). `'aucun'` n'appelle ni l'un ni l'autre. C'est un changement d'interface pour `Avantages`, `AVANTAGES_AUCUN` et `calculerAvantages` — tous les appelants existants (voiture V2.4, tests) doivent fournir ce nouveau champ.

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

`SaisieFormulaire` (`validation.ts`) gagne deux champs, au même niveau que `voiture` et `primes` :

```ts
export const CHOIX_MOBILITE = ['aucun', 'voiture', 'budgetMobilite'] as const
export type ChoixMobilite = (typeof CHOIX_MOBILITE)[number]

/** Budget mobilité, tel que tapé (spec budget mobilité § 5). */
export interface SaisieBudgetMobilite {
  budgetAnnuel: string
  pilier3Annuel: string
}

export interface SaisieFormulaire {
  // … champs existants inchangés (dont atn, voiture) …
  choixMobilite: ChoixMobilite
  budgetMobilite: SaisieBudgetMobilite
}
```

`choixMobilite` piloté par défaut à `'voiture'` (`SAISIE_PAR_DEFAUT`) : c'est l'état actuel de toute saisie existante, où la section ATN est toujours affichée avec un montant qui peut valoir 0.

Chaîne de reprise, dans `useSaisie.ts` :
- **v6** (nouveau format) : lu tel quel ;
- **v5 et antérieur** : `choixMobilite` absent → `'voiture'` (comportement inchangé) ; `budgetMobilite` absent → valeurs par défaut (`SAISIE_BUDGET_MOBILITE_PAR_DEFAUT`, champs vides ou à 0) ; la clé v5 (et antérieures) n'est **jamais réécrite**, comme pour tous les formats précédents.
- La clé de stockage passe de `v5` à `v6` ; la lecture retombe en cascade v6 → v5 → v4 → v3 → v2 → v1.

---

## 6. Interface

Aujourd'hui, la section « voiture de société » est **toujours affichée** : elle contient un choix de mode (montant repris de la fiche / calcul depuis la voiture) et vaut « pas de voiture » quand le montant est à 0. Le formulaire gagne au-dessus d'elle un sélecteur à trois options (radio, groupé dans un `fieldset` avec sa `legend`, comme le choix de mode existant) : Aucun / Voiture de société / Budget mobilité.

- `'aucun'` : ni la section voiture ni le budget mobilité ne sont affichés ;
- `'voiture'` : la section voiture actuelle s'affiche, inchangée (c'est la valeur par défaut, donc rien ne bouge pour une saisie existante) ;
- `'budgetMobilite'` : un mini-formulaire à deux champs (budget annuel, part en cash) s'affiche à la place, avec les mêmes mécanismes d'erreur par champ que le reste du formulaire (`aria-invalid` / `aria-describedby`).

Une sortie de bornes légales (`horsBornes`) affiche une **alerte non bloquante**, sur le modèle du dépassement de plafond des avantages extralégaux déjà présent dans l'app — le calcul continue, l'utilisateur est prévenu.

Le panneau de résultat ajoute une ligne "Budget mobilité (pilier 3)" au détail du net versé, avec le montant brut, la cotisation spéciale retenue, et le net qui en résulte ; une ligne secondaire informative rappelle le montant restant en piliers 1+2 (exonéré, non détaillé).

---

## 7. Architecture (fichiers touchés)

- Créer `src/engine/budgetMobilite.ts` (module + tests)
- Modifier `src/engine/parametres/types.ts`, `p2025.ts`, `p2026-07.ts` (nouveau bloc de paramètres)
- Modifier `src/engine/avantages.ts` (`Avantages` gagne `choixMobilite` et `budgetMobilite` ; `AVANTAGES_AUCUN` les remplit)
- Modifier `src/engine/remuneration.ts` (appel conditionnel de `resoudreAtn` / `calculerBudgetMobilite`, branchement du net du pilier 3 dans `assembler` et dans le décalage de cible du net → brut)
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

1. **Les bornes légales sont-elles vraiment fixes, ou dépendent-elles d'autre chose** (catégorie de fonction, ancienneté, secteur) ? **Tranché par la tâche 1** (`.superpowers/sdd/2026-09-24-budget-mobilite/task-1-report.md`, point 3, sur le texte consolidé de la loi du 17/03/2019, art. 12 § 4) : les bornes légales (minimum et maximum) sont des montants fixes indexés chaque année depuis le 1er janvier 2024 (indice santé lissé), identiques pour tous les travailleurs — aucune distinction par catégorie de fonction, ancienneté ou secteur dans le texte. La loi prévoit toutefois, en plus de ces montants fixes, un plafond relatif : le budget ne peut jamais dépasser un cinquième de la rémunération totale brute annuelle du travailleur (art. 6, § 1er, alinéa 3, de la loi du 12/04/1965 concernant la protection de la rémunération des travailleurs). Seules les bornes fixes indexées du budget annuel sont contrôlées par l'application (3 233 € / 17 244 € pour 2026, 3 164 € / 16 875 € pour 2025) ; le plafond d'un cinquième de la rémunération brute totale, prévu lui aussi par la loi, n'est **pas** calculé — la définition exacte de cette rémunération n'a pas été vérifiée.
2. **La cotisation spéciale de 38,07 % a-t-elle des règles de calcul propres** (base réduite, exonération partielle en début de dispositif) que les sources secondaires ne mentionnent pas ? **Tranché par la tâche 1** (`.superpowers/sdd/2026-09-24-budget-mobilite/task-1-report.md`, point 4, même disposition — loi du 17/03/2019, art. 22, insérant l'art. 38 § 3novodecies de la loi du 29/06/1981) : le texte vise directement « le solde (...) versé en espèces », sans abattement, base forfaitaire réduite ni exonération partielle. C'est donc le montant brut intégral du solde pris en cash qui sert d'assiette, conformément à l'implémentation actuelle.
3. **Interaction avec la cotisation spéciale de sécurité sociale trimestrielle classique** (hors périmètre général du calculateur, § 1) : le pilier 3 fait-il partie de son assiette ? Si oui, le net affiché est légèrement optimiste sur le trimestre concerné, comme documenté pour les primes annuelles — à signaler dans l'interface si confirmé.
4. **`Avantages` est un type largement consommé** (moteur, validation, tests des fiches de paie réelles, tests de la voiture) : lui ajouter deux champs obligatoires casse la compilation de tous ses points de construction. Le plan doit les recenser dès sa première tâche de code et les mettre à jour d'un bloc, en gardant `AVANTAGES_AUCUN` comme socle par défaut pour que la plupart ne changent pas.
5. **Le net → brut** décale sa cible avec les montants qui ne dépendent pas du brut (`calculerBrutDepuisNetVerse`). Le pilier 3 en fait partie : il doit entrer dans ce décalage, sinon le net versé visé ne sera pas atteint. C'est le point le plus facile à oublier, et il n'a pas d'effet visible en mode brut → net.
