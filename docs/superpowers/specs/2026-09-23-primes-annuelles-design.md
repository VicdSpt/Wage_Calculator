# Salaire net Belgique — V2.5 : 13e mois et double pécule de vacances

- **Date :** 2026-09-23
- **Statut :** en attente de relecture
- **Branche :** `feat/primes-annuelles`
- **S'appuie sur :** [spec V1](2026-09-14-salaire-net-belgique-v1-design.md), [spec net → brut](2026-09-15-net-vers-brut-design.md), [spec avantages](2026-09-16-avantages-extralegaux-design.md), [spec fiches 2025](2026-09-18-verification-fiches-2025-design.md), [spec voiture](2026-09-22-voiture-societe-design.md)

---

## 1. Objectif

Calculer le net de deux montants que tout employé touche une fois par an, et que le calculateur ignore aujourd'hui : le **13e mois** (prime de fin d'année) et le **double pécule de vacances**.

Ces montants ne suivent pas la formule mensuelle du précompte. Ce sont des **allocations exceptionnelles** : un pourcentage unique, choisi selon la rémunération annuelle brute. C'est ce barème qui fait tout le travail de ce sous-projet, et il sert aux deux primes.

Choix de l'utilisateur, 2026-09-23 :
- **deux montants ponctuels**, chacun avec son détail ligne par ligne (« en décembre tu touches X net »), et non un étalement sur douze mois ;
- **montants calculés**, avec des réglages : un pourcentage pour le 13e mois, le nombre de mois prestés pour la proratisation ;
- **cotisation spéciale de sécurité sociale hors périmètre**, documentée comme telle.

### Critères de réussite

1. Chaque tranche du barème et chaque réduction pour enfants sont reproduites au centime, des deux côtés de chaque frontière.
2. Le script Python indépendant reproduit les cas du barème sans lire le code TypeScript.
3. Les exemples chiffrés publiés dont les données sont complètes sont reproduits au centime et marqués `verifie: true` avec leur source.
4. Les quatre tests des fiches de paie réelles passent **sans qu'aucune valeur attendue ne bouge** : le calcul mensuel n'est pas touché.
5. Une saisie enregistrée par une version antérieure se recharge sans erreur.

### La règle d'or

Aucune valeur n'est ajustée pour faire tomber un exemple juste. Un écart se documente — comme l'écart de précompte de 17,85 €/mois de la V2.3, toujours ouvert.

### Hors périmètre

- la **cotisation spéciale de sécurité sociale**, qui se calcule par trimestre sur tout ce qui y a été payé : un 13e mois versé en décembre la fait monter, et notre moteur la calcule mois par mois. Le net affiché pour ces primes est donc légèrement optimiste sur le trimestre concerné ; l'interface le dit ;
- les **ouvriers** : leur pécule est versé par une caisse de vacances, pas par l'employeur ;
- le **simple pécule**, payé avec le salaire de mai ou juin comme de la rémunération ordinaire ;
- le **pécule de sortie**, versé au départ de l'entreprise ;
- les primes de fin d'année **sectorielles** à montant forfaitaire ou sous conditions, qu'un pourcentage du brut ne décrit pas ;
- les autres allocations exceptionnelles (commissions occasionnelles, gratifications, bonus salarial CCT 90), que le même barème couvrirait pourtant : elles viendront si le besoin se présente.

---

## 2. Sources officielles

| Élément | Source | Statut |
|---|---|---|
| Barème 2026, tranches et deux colonnes | Annexe III à l'AR/CIR 92 (AR du 11/12/2025), n° 53 | **confirmé** le 2026-09-23 ; la dernière tranche vaut 53,50 % dans les deux colonnes |
| Base qui choisit la tranche | idem, n° 53 : « eu égard au montant annuel des rémunérations brutes normales » | **confirmé** : brut annuel sans aucune déduction |
| Enfants à charge : exonération totale puis réduction | idem, n° 54 et 55 | **confirmé** le 2026-09-23, tables chiffrées 2026 et 2025 relevées (exonération jusqu'à 12 enfants sous plafond ; réduction jusqu'à 5 enfants sous un second plafond, taux 7,5 / 20 / 35 / 55 / 75 %) |
| Barème 2025 (période `P2025`) | Annexe III à l'AR/CIR 92 (AR du 12/12/2024), n° 53 à 55 | **confirmé** le 2026-09-23 ; dernière tranche au-delà de 58 460 €, même taux dans les deux colonnes (53,50 %) ; tables enfants relevées |
| Retenue de 13,07 % sur le double pécule | ONSS, « La retenue sur le double pécule de vacances du secteur privé » | **confirmé** : la retenue ne porte pas sur la part correspondant à la rémunération à partir du 3e jour de la 4e semaine ; dans le cas standard (droits complets, 20 jours), il reste **85 %** du double pécule soumis |
| Double pécule = 92 % de la rémunération mensuelle | AR du 30/03/1967 | **confirmé** dans son principe ; article exact non identifié |

**Barème, au 1er janvier 2026** (rémunération annuelle brute normale → pourcentage). Relevé sur l'annexe III à l'AR/CIR 92 (AR du 11/12/2025), n° 53, par la tâche 1 le 2026-09-23 ; la dernière tranche a le même taux dans les deux colonnes :

| Tranche annuelle | Pécule de vacances | Autres allocations |
|---|---|---|
| jusqu'à 10 675,00 € | 0,00 % | 0,00 % |
| 10 675,01 → 13 660,00 € | 19,17 % | 23,22 % |
| 13 660,01 → 17 375,00 € | 21,20 % | 25,23 % |
| 17 375,01 → 20 840,00 € | 26,25 % | 30,28 % |
| 20 840,01 → 23 580,00 € | 31,30 % | 35,33 % |
| 23 580,01 → 26 340,00 € | 34,33 % | 38,36 % |
| 26 340,01 → 31 830,00 € | 36,34 % | 40,38 % |
| 31 830,01 → 34 640,00 € | 39,37 % | 43,41 % |
| 34 640,01 → 45 860,00 € | 42,39 % | 46,44 % |
| 45 860,01 → 59 900,00 € | 47,44 % | 51,48 % |
| au-delà de 59 900,00 € | 53,50 % | 53,50 % |

**Barème, au 1er janvier 2025** (rémunération annuelle brute normale → pourcentage). Relevé sur l'annexe III à l'AR/CIR 92 (AR du 12/12/2024), n° 53, par la tâche 1 le 2026-09-23 ; même mécanisme qu'en 2026, seuils différents :

| Tranche annuelle | Pécule de vacances | Autres allocations |
|---|---|---|
| jusqu'à 10 415,00 € | 0,00 % | 0,00 % |
| 10 415,01 → 13 330,00 € | 19,17 % | 23,22 % |
| 13 330,01 → 16 960,00 € | 21,20 % | 25,23 % |
| 16 960,01 → 20 340,00 € | 26,25 % | 30,28 % |
| 20 340,01 → 23 020,00 € | 31,30 % | 35,33 % |
| 23 020,01 → 25 710,00 € | 34,33 % | 38,36 % |
| 25 710,01 → 31 070,00 € | 36,34 % | 40,38 % |
| 31 070,01 → 33 810,00 € | 39,37 % | 43,41 % |
| 33 810,01 → 44 770,00 € | 42,39 % | 46,44 % |
| 44 770,01 → 58 460,00 € | 47,44 % | 51,48 % |
| au-delà de 58 460,00 € | 53,50 % | 53,50 % |

**Enfants à charge — exonération totale (annexe III n° 54)**, montant limite de rémunération annuelle brute normale en dessous duquel l'allocation est intégralement exonérée, par nombre d'enfants :

| Enfants | 2026 | 2025 |
|---|---|---|
| 1 | 18 858,00 € | 18 400,00 € |
| 2 | 22 470,00 € | 21 930,00 € |
| 3 | 28 960,00 € | 28 270,00 € |
| 4 | 36 200,00 € | 35 330,00 € |
| 5 | 43 440,00 € | 42 390,00 € |
| 6 | 50 680,00 € | 49 450,00 € |
| 7 | 57 920,00 € | 56 510,00 € |
| 8 | 65 160,00 € | 63 570,00 € |
| 9 | 72 400,00 € | 70 630,00 € |
| 10 | 79 640,00 € | 77 690,00 € |
| 11 | 86 880,00 € | 84 750,00 € |
| 12 | 94 120,00 € | 91 810,00 € |

**Enfants à charge — réduction (annexe III n° 55)**, quand l'exonération totale ne joue pas et que le bénéficiaire a au maximum 5 enfants : pourcentage de réduction du précompte, et plafond de rémunération annuelle brute normale au-delà duquel la réduction n'est plus accordée :

| Enfants | Pourcentage | Plafond 2026 | Plafond 2025 |
|---|---|---|---|
| 1 | 7,5 % | 28 940,00 € | 28 245,00 € |
| 2 | 20 % | 28 940,00 € | 28 245,00 € |
| 3 | 35 % | 31 835,00 € | 31 070,00 € |
| 4 | 55 % | 37 625,00 € | 36 720,00 € |
| 5 | 75 % | 40 520,00 € | 39 550,00 € |

Règle de décision de la tâche 1, identique à celle qui a bien fonctionné pour la voiture : si le texte officiel **contredit** une valeur ci-dessus, le travail s'arrête et le contrôleur tranche ; si le texte reste **introuvable**, la valeur est conservée et marquée « source secondaire » dans le code, la spec et le README.

---

## 3. Moteur

### 3.1 Nouveau module `src/engine/allocationsExceptionnelles.ts`

Calcul pur, isolé. `calculerNet`, `calculerBrut` et `remuneration.ts` ne changent pas.

```ts
/** Colonne du barème : le pécule a ses propres pourcentages, plus bas d'environ 4 points. */
export type TypeAllocation = 'pecule' | 'autre'

export interface ResultatAllocation {
  type: TypeAllocation
  brutCentimes: number
  /** Rémunération annuelle brute normale qui a choisi la tranche. */
  baseAnnuelleCentimes: number
  /** Borne supérieure de la tranche retenue, null pour la dernière. */
  trancheJusquaCentimes: number | null
  tauxPrecompteDixMilliemes: number
  reductionEnfantsDixMilliemes: number
  /** ONSS ordinaire (13e mois) ou retenue propre (double pécule). */
  retenueSocialeCentimes: number
  precompteCentimes: number
  netCentimes: number
}

export function calculerAllocationExceptionnelle(
  brutCentimes: number,
  baseAnnuelleCentimes: number,
  type: TypeAllocation,
  situation: SituationFamiliale,
  parametres: Parametres,
): ResultatAllocation
```

**Calcul :**
1. La **base annuelle** choisit la tranche : c'est la **rémunération annuelle brute normale**, soit `brut mensuel × 12`, **sans aucune déduction** — ni ONSS ni frais professionnels (annexe III à l'AR/CIR 92, n° 53 : « eu égard au montant annuel des rémunérations brutes normales »). Aucun champ de saisie supplémentaire.
2. Le **taux** est celui de la tranche, colonne `pecule` ou `autre`.
3. Les **enfants à charge** jouent à deux étages (annexe III n° 54 et 55) : si la base annuelle ne dépasse pas le plafond d'exonération du nombre d'enfants, le précompte est **nul** ; sinon, si elle ne dépasse pas le plafond de réduction (jusqu'à 5 enfants), un **pourcentage de réduction** s'applique au précompte ; au-delà, rien.
4. La **retenue sociale** dépend de la prime (§ 3.2).
5. `precompte = arrondi((brut − retenue sociale) × taux × (1 − réduction))`, un seul arrondi au centime, demi vers l'extérieur. L'ordre exact — base du précompte avant ou après retenue sociale — est **à confirmer en tâche 1** sur le texte officiel ; en cas de contradiction, arrêt et arbitrage.
6. `net = brut − retenue sociale − précompte`.

### 3.2 Les deux primes

| | 13e mois | Double pécule |
|---|---|---|
| Brut | `brut mensuel × pourcentage` (100 % par défaut, jusqu'à 200 %) | `brut mensuel × 92 %` |
| Proratisation | `× mois prestés cette année / 12` | `× mois prestés l'année précédente / 12` |
| Retenue sociale | cotisations ONSS ordinaires, 13,07 % | retenue propre de 13,07 % sur 85 % du montant (l'ONSS exclut la part à partir du 3e jour de la 4e semaine) |
| Colonne du barème | `autre` | `pecule` |

Le taux de 92 % est une valeur de loi : il vit dans le module avec sa référence, pas dans un champ de saisie. Les deux « mois prestés » valent 12 par défaut.

Les deux années de référence diffèrent — le pécule dépend de l'année qui a ouvert les droits, le 13e mois de l'année en cours — d'où deux champs distincts et deux libellés explicites.

### 3.3 Ce qui ne change pas

- `calculerNet` et `calculerBrut` : aucun changement. Les primes ne modifient pas le net mensuel, donc **aucune nouvelle mesure du recul** n'est nécessaire au titre du calcul.
- Les avantages extralégaux (titres-repas, télétravail, écochèques, frais propres) et l'avantage voiture n'entrent pas dans le brut de ces primes.
- Les deux cas de fiches de paie réelles : inchangés, et leurs tests doivent rester verts au centime près.

---

## 4. Paramètres

`Parametres` gagne un bloc :

```ts
export interface TrancheAllocationExceptionnelle {
  /** Borne supérieure incluse de la rémunération annuelle imposable ; null pour la dernière tranche. */
  jusquaAnnuelCentimes: number | null
  peculeDixMilliemes: number
  autreDixMilliemes: number
}

export interface ReductionEnfantsAllocation {
  /** Plafond de rémunération annuelle brute au-delà duquel la réduction ne s'applique plus. */
  plafondAnnuelCentimes: number
  reductionDixMilliemes: number
}

export interface ParametresAllocationsExceptionnelles {
  tranches: readonly TrancheAllocationExceptionnelle[]
  /**
   * Annexe III n° 54 — exonération totale : plafond de rémunération annuelle brute,
   * index = nombre d'enfants à charge, de 1 à 12. L'index 0 vaut 0 (aucune exonération).
   */
  exonerationEnfantsPlafondsCentimes: readonly number[]
  /**
   * Annexe III n° 55 — réduction du précompte quand l'exonération ne joue pas :
   * index = nombre d'enfants à charge, de 1 à 5. L'index 0 ne réduit rien.
   */
  reductionsEnfants: readonly ReductionEnfantsAllocation[]
  /** Part du double pécule brut soumise à la retenue de 13,07 % (10 000 = la totalité). */
  partPeculeSoumiseRetenueDixMilliemes: number
}
```

Les trois périodes existantes reçoivent leur bloc : `P2026-07` et `P2026-09` prennent le barème 2026 (identique, hérité par `...P2026_07`), `P2025` prend le barème 2025 relevé en tâche 1.

L'empreinte des paramètres change. Le test de garde du recul échouera donc tant que `npm run verifier:recul` n'aura pas été relancé — mais la mesure elle-même ne peut pas bouger, puisque `calculerNet` est inchangé. La tâche qui ajoute les paramètres relance l'outil et vérifie que le recul reste à 514 centimes ; toute autre valeur est un signal d'alarme.

---

## 5. Interface

### 5.1 Saisie

Un bloc « 13e mois et pécule de vacances », avec deux cases cochées par défaut :

| Champ | Accepté | Code d'erreur |
|---|---|---|
| 13e mois : pourcentage | 0 à 200 % | `pourcentagePrimeInvalide` |
| 13e mois : mois prestés cette année | entier de 0 à 12 | `moisPrestesInvalide` |
| Double pécule : mois prestés l'année précédente | entier de 0 à 12 | `moisPrestesInvalide` |

Une prime décochée n'est pas calculée et ses champs ne sont pas validés, comme pour les avantages extralégaux.

### 5.2 Affichage

Un panneau sous le détail mensuel, deux blocs de même forme :

```
13e mois                     Double pécule de vacances
Brut                         Brut
− ONSS (13,07 %)             − Retenue (13,07 %)
− Précompte (46,44 %)        − Précompte (42,39 %)
= Net                        = Net
```

Chaque ligne porte son explication et sa source, comme le détail mensuel. L'explication du précompte dit **pourquoi ce taux** : « rémunération annuelle imposable de 32 780,00 € → tranche de 31 830,01 € à 34 640,00 € », et cite la réduction pour enfants quand elle joue.

Une note sous le panneau signale la limite assumée : la cotisation spéciale de sécurité sociale du trimestre n'est pas recalculée.

Le récapitulatif ne bouge pas. Sa mention « Hors 13e mois et pécule de vacances » reste vraie et renvoie vers ce panneau.

### 5.3 Sauvegarde locale

La saisie passe en **v5**. Une saisie v1 à v4 est reprise avec les deux primes cochées et leurs valeurs par défaut (100 %, 12 mois, 12 mois). Chaque champ absent reçoit sa valeur par défaut avant validation, et la régression est testée en passant par le vrai calcul, pas seulement par les gardes de type.

---

## 6. Vérification

- **Oracle Python** : `tools/reference/reference.py` réimplémente le barème depuis le texte — tranches, colonnes, réduction pour enfants — et écrit `referencesAllocations.json`. Le moteur doit reproduire chaque cas au centime.
- **Exemples publiés** : recherchés chez les secrétariats sociaux, retenus seulement s'ils donnent le brut, l'année de revenus, la situation familiale et le résultat. Un exemple non reproduit se documente, il ne se force pas.
- **Fiches de paie réelles** : les deux fiches existantes (juillet et septembre 2025) ne contiennent ni 13e mois ni pécule. Une fiche de mai, juin ou décembre serait la meilleure preuve ; à traiter alors comme les autres, uniquement des montants, sans donnée personnelle dans le dépôt.

---

## 7. Architecture (fichiers touchés)

| Fichier | Changement |
|---|---|
| `src/engine/allocationsExceptionnelles.ts` (+ test) | nouveau module § 3.1 |
| `src/engine/parametres/types.ts`, `p2025.ts`, `p2026-07.ts` | bloc `allocationsExceptionnelles` § 4 |
| `src/engine/__tests__/reculMax.json` | régénéré (empreinte des paramètres) |
| `src/engine/primesAnnuelles.ts` (+ test) | assemble les deux primes depuis la saisie et le résultat mensuel |
| `src/engine/validation.ts` | champs, bornes et codes d'erreur § 5.1 |
| `src/hooks/useSaisie.ts`, `useCalcul.ts` | saisie v5, primes dans l'état calculé |
| `src/components/PrimesAnnuelles.tsx` (nouveau), `App.tsx` | panneau § 5.2 |
| `src/i18n/fr.ts` | libellés, aides, explications, sources |
| `tools/reference/reference.py`, `referencesAllocations.json` (+ test) | oracle § 6 |
| `README.md` | ce que le calculateur couvre, sources, limites |

---

## 8. Tests

- **Barème** : les deux côtés de chaque frontière des onze tranches, dans les deux colonnes ; la tranche à 0 % ; un brut nul ; la dernière tranche sans borne.
- **Réductions pour enfants** : au moins deux valeurs de la table, avec des attendus calculés à la main en tâche 1 (et non dérivés du paramètre lui-même, ce qui ne testerait rien).
- **Les deux primes** : pourcentage à 100 % et à 150 % ; proratisation à 12, 6 et 0 mois ; la retenue sociale propre au pécule.
- **Non-régression** : les quatre tests des fiches réelles, inchangés ; le recul mesuré toujours à 514 centimes.
- **Interface** : cases cochées et décochées, montants affichés, explication du taux et de sa tranche, reprise d'une saisie v4.

---

## 9. Risques et points ouverts

1. ~~La part du double pécule soumise à la retenue~~ — **tranché le 2026-09-23** : l'ONSS exclut la part correspondant à la rémunération à partir du 3e jour de la 4e semaine de vacances. Le paramètre vaut donc **85 %**, valable pour des droits complets en régime de 5 jours ; les droits incomplets et le pécule de sortie (assiette de 6,80 % sur 7,67 %) restent hors périmètre.
2. **L'ordre de calcul du précompte** (avant ou après la retenue sociale) change le résultat de quelques euros. À trancher sur le texte, pas par déduction.
3. ~~Les deux tables chiffrées des enfants à charge~~ — **tranché le 2026-09-23** : plafonds d'exonération (n° 54, 1 à 12 enfants) et plafonds/pourcentages de réduction (n° 55, 1 à 5 enfants) relevés pour 2025 et 2026, dans `p2025.ts` et `p2026-07.ts` (§ 2 ci-dessus).
4. ~~Le barème 2025~~ — **tranché le 2026-09-23** : les onze tranches relevées dans `p2025.ts` (§ 2 ci-dessus), même dernière tranche convergente (53,50 % dans les deux colonnes) qu'en 2026.
5. **La cotisation spéciale trimestrielle** reste hors périmètre : le net des primes est optimiste sur le trimestre où elles tombent. C'est écrit dans l'interface et dans le README.
6. **L'écart de précompte de la V2.3** (17,85 €/mois) et **l'écart de bonus fiscal** relevé le 2026-09-22 restent ouverts et indépendants de ce sous-projet.
