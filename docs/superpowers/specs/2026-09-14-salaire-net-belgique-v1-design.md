# Salaire net Belgique — V1 : spécification de design

- **Date :** 2026-09-14
- **Statut :** en relecture
- **Inspiration :** https://belgian-wage-calculator.vercel.app/ (on ne reprend ni son code ni ses textes)

---

## 1. Objectif

Un calculateur **brut → net mensuel** pour un **employé à temps plein en Belgique**, **exact au centime** par rapport aux règles officielles en vigueur. C'est un outil utilisable pour de vrai, pas une démo.

La fiabilité passe avant le nombre de fonctionnalités. Chaque montant affiché doit pouvoir être relié à une règle officielle précise.

### Public
Des employés (déclarés à 100 % à l'ONSS) qui veulent comprendre ou vérifier leur salaire net.

### Critères de réussite
1. Pour chaque situation couverte, le net calculé correspond au centime aux cas de référence (§ 8).
2. Chaque ligne du détail cite sa source officielle.
3. Quand une situation ou une date n'est pas couverte, l'app le dit clairement au lieu d'afficher un chiffre faux.

---

## 2. Périmètre

### Inclus en V1
- Employé, temps plein, prestations complètes, salaire mensuel fixe.
- Situation familiale :
  - isolé ;
  - marié ou cohabitant légal, avec les 5 cas officiels de revenus du conjoint (§ 4) ;
  - enfants à charge (0 à 10) ;
  - parent isolé.
- Calcul pour la **date du jour**, avec les paramètres de la période en vigueur.
- Interface en français (textes regroupés dans un fichier séparé).
- Saisies conservées dans le localStorage.

### Hors V1 (liste explicite)
- Calcul net → brut
- Ouvriers (108 %), temps partiel, prestations incomplètes
- 13e mois, pécule de vacances, coût employeur
- Décompte fiscal annuel, taxe communale réelle (le précompte inclut déjà un forfait de 7 %)
- Avantages extralégaux (chèques-repas, écochèques, budget mobilité, télétravail…)
- Handicap (enfant, bénéficiaire, conjoint), autres personnes à charge, dirigeants d'entreprise, non-résidents
- Assurance groupe, heures supplémentaires, secteur public statutaire
- Néerlandais, anglais, graphiques
- Choix d'une date passée ou future

---

## 3. Sources officielles

| Code | Document | Utilisé pour |
|---|---|---|
| **SPF-FC-2026** | SPF Finances, *Formule-clé pour le calcul du précompte professionnel sur les rémunérations payées à partir du 1er janvier 2026*, réf. ESS-SR/2025-0928 — https://finance.belgium.be/en/node/1540 | précompte, réductions, bonus fiscal à l'emploi, arrondis |
| **ONSS-BE-2026/3** | ONSS, Instructions administratives 2026/3, *Bonus à l'emploi* — https://www.socialsecurity.be/employer/instructions/dmfa/fr/latest/instructions/deductions/workers_reductions/workbonus.html | volets A et B |
| **ONSS-CSSS-2026/3** | ONSS, Instructions administratives 2026/3, *Cotisation spéciale pour la sécurité sociale* — https://www.socialsecurity.be/employer/instructions/dmfa/fr/latest/instructions/special_contributions/other_specialcontributions/specialsocialsecuritycontribution.html | cotisation spéciale |
| **SECUREX-RMMMG** | Securex, *RMMG national* (source **secondaire**) — https://www.securex.be/fr/lex4you/employeur/montants-actuels/montants-socio-juridiques/rmmg-national | salaire minimum (alerte uniquement) |

⚠️ Le SPF précise que la formule-clé « peut être adaptée dans le courant de l'année 2026 » (réforme fiscale). Avant chaque mise en production, on vérifie sur la page SPF qu'aucune nouvelle version n'a été publiée.

---

## 4. Saisies

| Champ | Type | Valeurs | Affichage |
|---|---|---|---|
| `brutMensuel` | montant € (2 décimales) | > 0 et ≤ 100 000 | toujours |
| `etatCivil` | choix | `isole`, `marieOuCohabitant` | toujours |
| `revenusConjoint` | choix | voir tableau ci-dessous | si `marieOuCohabitant` |
| `enfantsACharge` | entier | 0 à 10 | toujours |
| `parentIsole` | booléen | — | si `isole` et au moins 1 enfant |

### Les 5 cas de revenus du conjoint (SPF-FC-2026 n° 11 et annexe 4)
Les montants « nets » = revenus bruts − cotisations sociales obligatoires − 20 %, appréciés au 1er janvier 2026. L'interface l'explique dans une info-bulle.

| Valeur | Libellé affiché | Barème | Réduction annuelle | Catégorie pour la cotisation spéciale |
|---|---|---|---|---|
| `aucun` | Pas de revenus professionnels | II (quotient conjugal) | — | commune, conjoint **sans** revenus |
| `pensionMax174` | Uniquement pension ou rente, max 174 € nets/mois | II (quotient conjugal) | — | commune, conjoint **sans** revenus |
| `pensionMax579` | Uniquement pension ou rente, max 579 € nets/mois | I | 3 474 € | commune, conjoint **sans** revenus (\*) |
| `autresMax290` | Autres revenus professionnels, max 290 € nets/mois | I | 1 740 € | commune, conjoint **sans** revenus (\*) |
| `superieurs` | Revenus supérieurs à ces plafonds | I | — | commune, conjoint **avec** revenus |

(\*) **Interprétation.** ONSS-CSSS définit le « conjoint qui a des revenus professionnels » comme celui dont les revenus dépassent le plafond de la réduction pour autres charges de famille. Ce plafond est de 290 € pour les revenus professionnels et de 579 € pour les pensions. Cette interprétation est à confirmer par une fiche de paie réelle (§ 8.3).

---

## 5. Algorithme

### 5.1 Conventions
- **Montants en centimes entiers** (`number` entier). Aucun calcul en euros à virgule.
- **Taux en dix-millièmes entiers** : 13,07 % → `1307`, 0,2739 → `2739`.
- **Arrondi** (SPF-FC-2026 n° 3 et ONSS-BE) : à chaque étape, au centime le plus proche, et 0,5 centime est arrondi vers le haut.
- Opérations de base, en arithmétique entière :
  - `appliquerTaux(centimes, taux)` = arrondi de `centimes × taux / 10 000` ;
  - `diviserArrondi(centimes, n)` = arrondi de `centimes / n` ;
  - l'arrondi se fait par division entière avec reste, jamais par `Math.round` sur un flottant.

### 5.2 Étapes (mois M, paramètres P de la période qui contient la date)

**Étape 1 — ONSS personnel**
`onss = appliquerTaux(brut, 1307)`

**Étape 2 — Bonus à l'emploi social** (ONSS-BE-2026/3, colonne employés), avec `S = brut`
- Volet A :
  - si `S ≤ A.plancher` : `A = A.max` ;
  - si `S ≤ A.plafond` : `A = max(0, arrondi(A.max − A.coef × (S − A.plancher)))` ;
  - sinon `A = 0`.
  - ⚠️ L'ONSS arrondit **R lui-même** (« R est arrondi arithmétiquement »), pas la partie soustraite. Les deux diffèrent d'un centime quand le produit tombe sur une moitié exacte : 127,54 − 0,2739 × 50,00 = 113,845 → **113,85** (et non 127,54 − 13,70 = 113,84). Juste sous le plafond, le résultat peut être légèrement négatif (−0,01), d'où le `max(0, …)`.
- Volet B : même logique avec `B.plancher`, `B.plafond`, `B.max`, `B.coef`.
- Écrêtement : si `A + B > onss`, on réduit d'abord B, puis A, pour que `A + B = onss`.
- `bonusSocial = A + B`

**Étape 3 — Rémunération imposable mensuelle**
`imposable = brut − (onss − bonusSocial)`

**Étape 4 — Revenu annuel brut** (SPF-FC n° 7)
`annuelBrut = imposable × 12`

**Étape 5 — Frais professionnels forfaitaires** (SPF-FC n° 8, 1°)
- si `annuelBrut ≤ 2 023 333` centimes : `frais = appliquerTaux(annuelBrut, 3000)` ;
- sinon `frais = 607 000`.
- `netImposable = annuelBrut − frais`

**Étape 6 — Impôt de base** (SPF-FC n° 11 et annexe 1). La fonction `bareme(x)` :

| x (€) | impôt |
|---|---|
| 0,01 à 16 710 | 26,75 % de x |
| 16 710,01 à 29 500 | 4 469,93 + 42,80 % de (x − 16 710) |
| 29 500,01 à 51 050 | 9 944,05 + 48,15 % de (x − 29 500) |
| > 51 050 | 20 320,38 + 53,50 % de (x − 51 050) |

- **Barème I** (isolé, ou conjoint `pensionMax579` / `autresMax290` / `superieurs`) :
  `impotBase = bareme(netImposable) − 2 987,98`
- **Barème II** (conjoint `aucun` / `pensionMax174`) :
  - `impute = min(appliquerTaux(netImposable, 3000), 13 790,00)`
  - `impotBase = bareme(impute) + bareme(netImposable − impute) − 5 975,96`
- Si `impotBase < 0`, on le ramène à 0.

**Étape 7 — Réductions annuelles** (SPF-FC n° 13 à 15, annexes 3 à 5)
- Enfants (annexe 3) : 1 → 624 ; 2 → 1 656 ; 3 → 4 404 ; 4 → 7 620 ; 5 → 11 100 ; 6 → 14 592 ; 7 → 18 120 ; 8 → 21 996 ; au-delà de 8 : 21 996 + 3 864 par enfant supplémentaire.
- Parent isolé (annexe 4, 1) : 624.
- Conjoint `autresMax290` (annexe 4, 5) : 1 740.
- Conjoint `pensionMax579` (annexe 4, 6) : 3 474.
- `impotAnnuel = impotBase − min(somme des réductions, impotBase)`

**Étape 8 — Précompte mensuel avant bonus fiscal** (SPF-FC n° 16)
`precompteBrut = diviserArrondi(impotAnnuel, 12)`

**Étape 9 — Bonus fiscal à l'emploi** (SPF-FC n° 20), calculé sur le bonus social réellement accordé (après écrêtement)
`bonusFiscal = appliquerTaux(A, 3314) + appliquerTaux(B, 5254)`

**Étape 10 — Précompte dû** (SPF-FC n° 21)
`precompte = max(0, precompteBrut − bonusFiscal)`

La ligne affichée « bonus fiscal » vaut `precompteBrut − precompte`, pour que le détail reste cohérent quand le précompte tombe à 0.

**Étape 11 — Cotisation spéciale de sécurité sociale** (ONSS-CSSS-2026/3)
Pour un salaire fixe, le montant mensuel est un tiers du montant trimestriel. Seuils mensuels = seuils trimestriels ÷ 3. Les montants fixes mensuels sont `diviserArrondi(fixeTrimestriel, 3)`, et les pourcentages s'appliquent à la part mensuelle excédentaire. Avec `R = brut` :

*Imposition individuelle* (isolé) :

| R (€/mois) | retenue mensuelle |
|---|---|
| ≤ 1 945,38 | 0 |
| ≤ 2 190,18 | 4,22 % × (R − 1 945,38) |
| ≤ 3 737,00 | 10,33 + 1,10 % × (R − 2 190,18) |
| ≤ 4 100,00 | 27,35 + 3,38 % × (R − 3 737,00) |
| ≤ 6 038,82 | 39,61 + 1,10 % × (R − 4 100,00) |
| > 6 038,82 | 60,94 |

*Imposition commune, conjoint avec revenus* :

| R (€/mois) | retenue mensuelle |
|---|---|
| < 1 095,10 | 0 |
| < 1 945,38 | 5,15 |
| ≤ 2 190,18 | max(5,15 ; 5,90 % × (R − 1 945,38)) |
| > 2 190,18 | min(51,64 ; 14,44 + 1,10 % × (R − 2 190,18)) |

*Imposition commune, conjoint sans revenus* :

| R (€/mois) | retenue mensuelle |
|---|---|
| ≤ 1 945,38 | 0 |
| ≤ 2 190,18 | 5,90 % × (R − 1 945,38) |
| > 2 190,18 | min(60,94 ; 14,44 + 1,10 % × (R − 2 190,18)) |

Note : dans sa section « en pratique », l'ONSS indique un minimum mensuel de 5,90 € pour la tranche à 5,90 % (commune, conjoint avec revenus). Le montant trimestriel légal donne 15,45 ÷ 3 = 5,15 €. **La V1 applique le montant trimestriel ÷ 3 (5,15 €)**. L'écart est à vérifier (§ 10).

**Étape 12 — Net**
`net = brut − (onss − bonusSocial) − precompte − cotisationSpeciale`

### 5.3 Paramètres par période

Chaque jeu de paramètres porte `valideDu` et `valideAu` (inclus). `getParametres(date)` renvoie le jeu qui contient la date, ou une erreur typée `PeriodeNonCouverte`.

| Paramètre | P2026-07 (01/07 → 31/08/2026) | P2026-09 (01/09 → 31/12/2026) |
|---|---|---|
| Taux ONSS personnel | 13,07 % | 13,07 % |
| Volet A : max / plancher / plafond / coef | 127,54 / 2 937,93 / 3 336,98 / 0,3196 | 127,54 / 2 937,93 / 3 403,62 / 0,2739 |
| Volet B : max / plancher / plafond / coef | 171,99 / 2 300,62 / 2 937,93 / 0,2699 | 171,99 / 2 300,62 / 2 937,93 / 0,2699 |
| Précompte, réductions, bonus fiscal | SPF-FC-2026 | SPF-FC-2026 |
| Cotisation spéciale | ONSS-CSSS-2026/3 | ONSS-CSSS-2026/3 |
| RMMMG 18 ans et plus | 2 233,61 (secondaire) | 2 233,61 (secondaire) |

Les dates avant le 01/07/2026 ne sont pas couvertes en V1, car les paramètres de janvier à juin ne sont pas intégrés. Les dates après le 31/12/2026 ne le sont pas non plus (formule-clé 2027 pas encore intégrée).

Chaque valeur du fichier de paramètres porte en commentaire son code source (§ 3) et la section du document.

---

## 6. Architecture

**Stack :** React 19 + TypeScript 6 (strict) + Vite 8 (modèle officiel `react-ts`) + Tailwind CSS 4 + Vitest 4 + React Testing Library + oxlint (le linter fourni par le modèle Vite, qui remplace ESLint). Déploiement sur Vercel (hors V1, seulement après accord).

**Emplacement :** `E:\ALL DOCUMENTS\PROJECTS CODE\Wage_Calculator\` — dépôt https://github.com/VicdSpt/Wage_Calculator

```
src/
  engine/                      ← TypeScript pur, aucune dépendance React ou navigateur
    types.ts                   Situation, Resultat, Ligne, RevenusConjoint, erreurs typées
    argent.ts                  appliquerTaux, diviserArrondi, euros↔centimes
    parametres/
      types.ts                 interface Parametres
      p2026-07.ts
      p2026-09.ts
      index.ts                 getParametres(date)
    onss.ts                    étape 1
    bonusEmploiSocial.ts       étape 2
    precompte.ts               étapes 4 à 10
    cotisationSpeciale.ts      étape 11
    validation.ts              validerSaisie : saisie du formulaire (texte) → Situation | erreurs par champ
    calculerNet.ts             orchestration → Resultat
  hooks/
    useSaisie.ts               état des saisies + localStorage (lecture/écriture protégées par try/catch)
    useCalcul.ts               useMemo → état : ok | saisieInvalide | periodeNonCouverte
  components/
    FormulaireSituation.tsx
    DetailCalcul.tsx
    LigneCalcul.tsx
    InfoBulle.tsx
    Recapitulatif.tsx
    Avertissements.tsx
  i18n/fr.ts
  utils/format.ts              formatEuro, formatPourcentage (Intl fr-BE), dateIsoLocale, formatDateFr
tools/reference/reference.py   script de référence indépendant (§ 8.2)
  App.tsx
```

### Contrats principaux
```ts
type RevenusConjoint = 'aucun' | 'pensionMax174' | 'pensionMax579' | 'autresMax290' | 'superieurs';

interface Situation {
  brutMensuelCentimes: number;
  etatCivil: 'isole' | 'marieOuCohabitant';
  revenusConjoint: RevenusConjoint | null; // null si isolé
  enfantsACharge: number;
  parentIsole: boolean;
}

type IdLigne = 'brut' | 'onss' | 'bonusVoletA' | 'bonusVoletB' | 'imposableMensuel'
  | 'precompteAvantBonus' | 'bonusFiscal' | 'cotisationSpeciale' | 'net';

interface Ligne {
  id: IdLigne;            // le libellé et l'explication viennent de i18n/fr.ts via l'id
  montantCentimes: number;
  sens: '+' | '-' | '=';
  source: string;         // ex. 'SPF-FC-2026 n° 20 et 21'
}

interface Resultat {
  periode: { id: string; valideDu: string; valideAu: string };
  lignes: Ligne[];
  intermediaires: Intermediaires; // les 18 valeurs de § 5.2, en centimes (onss, bonusVoletA, …, net)
  netMensuelCentimes: number;
  netAnnuelCentimes: number;   // net mensuel × 12
  tauxRetour: number;          // net / brut, pour l'affichage uniquement
}

// dateIso au format AAAA-MM-JJ : une chaîne évite les pièges de fuseau horaire des objets Date
function calculerNet(situation: Situation, dateIso: string): Resultat;
```

`calculerNet` suppose une situation valide. L'interface appelle `validerSaisie` avant et n'appelle le moteur que s'il n'y a aucune erreur. Pour une date non couverte, le moteur lève `PeriodeNonCouverte`, que l'interface affiche comme un message clair.

---

## 7. Interface

- Page unique, calcul en temps réel à chaque modification.
- **Écran large :** formulaire à gauche, récapitulatif et détail à droite. **Mobile :** récapitulatif, puis formulaire, puis détail.
- Détail : les lignes du `Resultat` dans l'ordre des étapes, chacune avec un bouton ⓘ (explication simple + source).
- Récapitulatif : net mensuel en évidence, net annuel (« hors 13e mois et pécule de vacances »), taux de retour, et « Règles en vigueur du JJ/MM/AAAA au JJ/MM/AAAA ».
- Avertissements :
  - bandeau permanent « Estimation pour un employé à temps plein. Ne remplace pas une fiche de paie. » ;
  - alerte si le brut est inférieur au RMMMG ;
  - message si la période n'est pas couverte ;
  - erreurs de saisie sous les champs concernés.
- Accessibilité : labels liés aux champs, info-bulles utilisables au clavier (Échap pour fermer), contrastes WCAG AA, thème clair/sombre selon le système.

---

## 8. Tests et exactitude

On écrit les tests avant le code (TDD), module par module.

### 8.1 Tests unitaires
- `argent` : arrondis à 0,5 centime pile, au-dessus, en dessous ; grands montants.
- `bonusEmploiSocial` : sur chaque plancher et plafond, à ±1 centime ; écrêtement B puis A.
- `precompte` : chaque tranche du barème à ±1 centime ; barème I et II ; plafond de 13 790 € du quotient conjugal ; enfants 0 à 10 ; réductions limitées à l'impôt de base ; précompte jamais négatif.
- `cotisationSpeciale` : chaque seuil des 3 barèmes à ±1 centime, minimums et maximums.
- `parametres` : bornes des périodes (31/08 et 01/09), dates non couvertes.
- `validation` : chaque règle de saisie.

### 8.2 Cas de référence (`src/engine/__tests__/references.json`)
Chaque cas contient la situation, la date, **toutes les valeurs intermédiaires** attendues, le net, et les champs `source` et `verifie`.

La grille croise :
- **situations :** isolé ; isolé + 2 enfants ; parent isolé + 1 enfant ; les 5 cas de conjoint ; marié `aucun` + 3 enfants ;
- **bruts :** RMMMG, 2 300,62 (plancher B), 2 937,93 (plancher A), 3 000, 3 403,62, 4 500, 6 500, 10 000 ;
- **dates :** au moins un cas le 31/08/2026 et un le 01/09/2026 avec un brut entre 3 336,98 et 3 403,62, pour voir le changement de période.

Les valeurs attendues sont calculées **à la main depuis le texte officiel**, par un script de référence indépendant du moteur (Python avec `decimal`). Ce script est versionné dans `tools/reference/`.

`verifie: true` n'est posé qu'après une comparaison externe (§ 8.3). Le rapport de tests affiche le nombre de cas vérifiés et non vérifiés.

**Exemple de référence** (isolé, 0 enfant, brut 3 000,00 €, date 14/09/2026), calculé par script :

| Étape | Valeur |
|---|---|
| ONSS 13,07 % | 392,10 |
| Bonus A : 127,54 − 0,2739 × 62,07 | 110,54 |
| Bonus B | 0,00 |
| ONSS net | 281,56 |
| Imposable mensuel | 2 718,44 |
| Annuel brut | 32 621,28 |
| Frais forfaitaires | 6 070,00 |
| Net imposable | 26 551,28 |
| Barème : 4 469,93 + 4 212,07 | 8 682,00 |
| Impôt de base (− 2 987,98) | 5 694,02 |
| Précompte mensuel avant bonus | 474,50 |
| Bonus fiscal : 33,14 % × 110,54 | 36,63 |
| Précompte dû | 437,87 |
| Cotisation spéciale : 10,33 + 1,10 % × 809,82 | 19,24 |
| **Net** | **2 261,33** |

### 8.3 Vérification externe
1. **Fiche de paie réelle** d'un employé à temps plein en 2026 (période juillet à décembre), fournie par l'utilisateur et anonymisée : c'est la référence la plus forte.
2. **Simulateur Excel officiel du SPF Finances :** le lien était cassé (404) au 14/09/2026. On réessaie à chaque jalon.
3. **Macro de calcul du bonus à l'emploi** de la techlib ONSS, si elle est accessible.

### 8.4 Tests d'interface
- `revenusConjoint` n'apparaît que si `marieOuCohabitant`.
- `parentIsole` n'apparaît que si `isole` et au moins 1 enfant, et est remis à `false` sinon.
- Modifier le brut met à jour le net.
- Les saisies sont restaurées depuis le localStorage, et un localStorage corrompu ou indisponible ne casse pas la page.
- Une période non couverte affiche le message dédié.

---

## 9. Gestion des erreurs

| Cas | Comportement |
|---|---|
| Saisie invalide (brut vide, ≤ 0, > 100 000, enfants hors 0 à 10) | message sous le champ, pas de calcul, le détail affiche « — » |
| Date hors périodes couvertes | `PeriodeNonCouverte` → message « Les règles pour cette date ne sont pas encore intégrées » |
| localStorage indisponible ou JSON invalide | on ignore silencieusement et on repart des valeurs par défaut |
| Brut < RMMMG | calcul normal + alerte non bloquante |

---

## 10. Risques et points ouverts

1. **Formule-clé modifiée en cours d'année** (réforme). Parade : vérifier la page SPF avant chaque déploiement, et le modèle par périodes permet d'ajouter une nouvelle version sans toucher aux formules.
2. **Interprétation de la catégorie de cotisation spéciale** pour les conjoints `pensionMax579` et `autresMax290` (§ 4 \*). Parade : vérification par une fiche de paie.
3. **Minimum de 5,15 € ou 5,90 €** dans la tranche à 5,90 % (§ 5.2, étape 11). Parade : vérification externe ; on documente le choix fait.
4. **RMMMG issu d'une source secondaire.** Impact limité (alerte uniquement). Parade : confirmer via le CNT.
5. **Absence du simulateur officiel.** Parade : script de référence indépendant + fiche de paie (§ 8.3).
