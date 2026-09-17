# Salaire net Belgique — V2.2a : avantages extralégaux

- **Date :** 2026-09-16
- **Statut :** en relecture
- **Branche :** `feat/avantages-extralegaux`
- **S'appuie sur :** [spec V1](2026-09-14-salaire-net-belgique-v1-design.md) et [spec net → brut](2026-09-15-net-vers-brut-design.md), dont aucune règle de calcul ne change

---

## 1. Objectif

Ajouter les avantages extralégaux qui **ne passent ni par l'ONSS ni par le précompte** tant que les conditions d'exonération sont remplies : **titres-repas**, **indemnité de télétravail** et **écochèques**. L'utilisateur voit alors ce qui arrive réellement sur son compte, et ce qu'il reçoit en chèques.

La **voiture de société** (avantage de toute nature) fait l'objet du sous-projet suivant, V2.2b : elle augmente la base imposable et demande sa propre formule officielle.

### Critères de réussite
1. Le net versé, la valeur des titres-repas et le total mensuel sont exacts au centime, sans aucun arrondi (ce ne sont que des multiplications entières).
2. `calculerNet` et `calculerBrut` ne changent pas : les 74 cas de référence et la preuve d'exactitude du net → brut restent valables.
3. Un dépassement de plafond est signalé, sans jamais afficher un chiffre faux en silence.
4. En net → brut, la cible est **le net versé sur le compte**, avantages compris.

### Hors périmètre
- Voiture de société et autre avantage de toute nature (V2.2b).
- Assurance groupe, budget mobilité, frais de représentation, chèques sport/culture, cadeaux.
- La vérification des conditions d'octroi (convention collective, caractère structurel du télétravail) : l'app les suppose remplies et le dit.
- Le basculement en salaire d'un titre-repas non conforme : on alerte, on ne recalcule pas.

---

## 2. Sources officielles

| Code | Document | Utilisé pour |
|---|---|---|
| **ONSS-TR** | ONSS, Instructions administratives, *Titres-repas — caractère rémunératoire* — https://www.socialsecurity.be/employer/instructions/dmfa/fr/latest/instructions/salary/particularcases/lunchcheques/salaryfeatures.html | part patronale maximale, part travailleur minimale, un titre par jour presté |
| **ONSS-FR** | ONSS, Instructions administratives, *Remboursement de frais propres à l'employeur* — https://www.socialsecurity.be/employer/instructions/dmfa/fr/latest/instructions/salary/particularcases/expensesreimbursement.html | indemnité forfaitaire de bureau (télétravail) |
| **ONSS-EC** | ONSS, Instructions administratives, *Éco-chèques* — https://www.socialsecurity.be/employer/instructions/dmfa/fr/latest/instructions/salary/particularcases/ecocheques.html | valeur maximale par chèque et plafond annuel |

Montants relevés le 16/09/2026 :

| Règle | Valeur | Entrée en vigueur |
|---|---|---|
| Titres-repas, part patronale maximale | 8,91 € par titre | 01/01/2026 (auparavant 6,91 €) |
| Titres-repas, part du travailleur minimale | 1,09 € par titre | inchangée |
| Titres-repas, valeur faciale maximale | 10,00 € | 01/01/2026 |
| Indemnité de bureau, maximum ONSS | 160,99 €/mois | 01/03/2026 |
| Indemnité de bureau, maximum ONSS | 164,21 €/mois | 01/09/2026 (indexation) |
| Écochèques | 10,00 € par chèque, 250,00 €/an | inchangé |

Le changement d'indemnité de bureau au 01/09/2026 tombe exactement sur la frontière des deux périodes de paramètres existantes (P2026-07 et P2026-09).

⚠️ Comme pour la formule-clé, ces montants sont à revérifier sur les pages ONSS avant toute mise en production.

---

## 3. Moteur

### 3.1 Nouveaux paramètres par période

Dans `parametres/types.ts`, `Parametres` reçoit :

```ts
export interface ParametresAvantages {
  /** ONSS-TR : part patronale maximale par titre-repas. */
  titresRepasPartPatronaleMaxCentimes: number
  /** ONSS-TR : part minimale du travailleur par titre-repas. */
  titresRepasPartTravailleurMinCentimes: number
  /** ONSS-TR : valeur faciale maximale d'un titre-repas. */
  titresRepasValeurFacialeMaxCentimes: number
  /** ONSS-FR : indemnité forfaitaire de bureau maximale par mois. */
  teletravailMaxCentimes: number
  /** ONSS-EC : plafond annuel des écochèques. */
  ecochequesMaxAnnuelCentimes: number
}
```

| Paramètre | P2026-07 (01/07 → 31/08) | P2026-09 (01/09 → 31/12) |
|---|---|---|
| `titresRepasPartPatronaleMaxCentimes` | 891 | 891 |
| `titresRepasPartTravailleurMinCentimes` | 109 | 109 |
| `titresRepasValeurFacialeMaxCentimes` | 1 000 | 1 000 |
| `teletravailMaxCentimes` | 16 099 | 16 421 |
| `ecochequesMaxAnnuelCentimes` | 25 000 | 25 000 |

Chaque valeur porte en commentaire son code source (§ 2).

**Conséquence attendue :** l'empreinte des paramètres change, donc `src/engine/__tests__/reculMax.test.ts` échoue tant que `npm run verifier:recul` n'a pas été relancé. C'est le comportement voulu du garde-fou. Le recul mesuré ne doit pas changer, puisque `calculerNet` ne change pas.

### 3.2 `avantages.ts`

Nouveau fichier `src/engine/avantages.ts`, TypeScript pur, sans dépendance React ni navigateur.

```ts
export interface AvantageTitresRepas {
  actif: boolean
  joursPrestes: number
  valeurFacialeCentimes: number
  partTravailleurCentimes: number
}

export interface Avantages {
  titresRepas: AvantageTitresRepas
  teletravail: { actif: boolean; indemniteCentimes: number }
  ecocheques: { actif: boolean; montantAnnuelCentimes: number }
}

export type CodeAlerteAvantage =
  | 'partPatronaleTitres'      // part patronale > maximum ONSS
  | 'partTravailleurTitres'    // part du travailleur < minimum ONSS
  | 'valeurFacialeTitres'      // valeur faciale > maximum ONSS
  | 'teletravail'              // indemnité > maximum ONSS de la période
  | 'ecocheques'               // montant annuel > 250 €

export interface ResultatAvantages {
  /** joursPrestes × partTravailleur : retenu sur le net. */
  retenueTitresCentimes: number
  /** joursPrestes × valeurFaciale. */
  valeurTitresCentimes: number
  /** valeurTitres − retenueTitres. */
  partPatronaleTitresCentimes: number
  /** Montants par titre, repris dans les messages d'alerte. 0 si les titres-repas sont inactifs. */
  valeurFacialeParTitreCentimes: number
  partTravailleurParTitreCentimes: number
  partPatronaleParTitreCentimes: number
  teletravailCentimes: number
  ecochequesAnnuelCentimes: number
  alertes: readonly CodeAlerteAvantage[]
}

export const AVANTAGES_AUCUN: Avantages   // tout inactif, montants à 0

export function calculerAvantages(avantages: Avantages, parametres: Parametres): ResultatAvantages
```

Règles :
- un avantage inactif donne 0 et ne produit aucune alerte ;
- tous les calculs sont des multiplications d'entiers : **aucun arrondi** ;
- les alertes se déclenchent **strictement** au-delà du plafond (8,91 € accepté, 8,92 € alerté) et strictement en dessous du minimum (1,09 € accepté, 1,08 € alerté) ;
- l'ordre des alertes est celui de la liste `CodeAlerteAvantage`, pour un affichage stable.

### 3.3 `remuneration.ts`

Nouveau fichier `src/engine/remuneration.ts`, qui assemble sans rien recalculer :

```ts
export interface ResultatComplet {
  resultat: Resultat                 // calculerNet, inchangé
  avantages: ResultatAvantages
  /** net légal − retenue titres + télétravail. */
  netVerseCentimes: number
  /** net versé + valeur des titres-repas. */
  totalMensuelCentimes: number
}

export function calculerRemuneration(
  situation: Situation,
  avantages: Avantages,
  dateIso: string,
): ResultatComplet

/**
 * Net → brut à cible « net versé ». Comme la retenue et l'indemnité ne dépendent pas du brut,
 * on décale la cible : cibleNetLegal = max(1, netVerseCible + retenueTitres − teletravail).
 */
export function calculerBrutDepuisNetVerse(
  famille: SituationFamiliale,
  avantages: Avantages,
  netVerseCibleCentimes: number,
  dateIso: string,
): { complet: ResultatComplet; brutCentimes: number; netVerseCibleCentimes: number }
```

`calculerBrut` reste la seule recherche : sa dichotomie, sa marge de 10 € et sa preuve (§ 3.2 de la spec net → brut) ne changent pas, puisque le décalage est une constante.

### 3.4 Ce qui ne change pas
`calculerNet`, `calculerBrut`, `onss`, `bonusEmploiSocial`, `precompte`, `cotisationSpeciale`, `references.json`, et l'espace des 76 situations de `SITUATIONS_FAMILIALES` : aucun champ n'est ajouté à `Situation`.

---

## 4. Saisie, validation, mémorisation

### 4.1 Saisie

`SaisieFormulaire` reçoit un bloc `avantages`, en chaînes de caractères :

```ts
export interface SaisieAvantages {
  titresRepasActif: boolean
  joursPrestes: string
  valeurFaciale: string
  partTravailleur: string
  teletravailActif: boolean
  teletravail: string
  ecochequesActif: boolean
  ecocheques: string
}
```

Valeurs par défaut, constantes pour que la validation reste indépendante de la date :

| Champ | Défaut |
|---|---|
| `titresRepasActif`, `teletravailActif`, `ecochequesActif` | `false` |
| `joursPrestes` | `'20'` |
| `valeurFaciale` | `'10,00'` |
| `partTravailleur` | `'1,09'` |
| `teletravail` | `'160,99'` |
| `ecocheques` | `'250,00'` |

### 4.2 Validation

Un avantage décoché n'est pas validé, et ses valeurs sont conservées. Nouveaux codes d'erreur et bornes :

| Champ | Règle | Code |
|---|---|---|
| `joursPrestes` | entier de 0 à 23 | `joursInvalide` |
| `valeurFaciale` | montant de 0,01 € à 20,00 € | `valeurFacialeInvalide` |
| `partTravailleur` | montant de 0 € à 20,00 €, et ≤ valeur faciale | `partTravailleurInvalide`, `partTravailleurSuperieure` |
| `teletravail` | montant de 0 € à 1 000 € | `teletravailInvalide` |
| `ecocheques` | montant de 0 € à 2 000 € | `ecochequesInvalide` |

`ErreursSaisie` gagne une clé par champ. `ResultatValidation` porte en plus `avantages: Avantages` dans ses deux variantes `ok`.

Ces bornes larges (20 €, 1 000 €, 2 000 €) ne servent qu'à écarter les saisies absurdes : le dépassement des plafonds officiels est traité par une alerte, pas par une erreur.

### 4.3 Mémorisation

Nouvelle clé `wage-calculator:saisie:v3`. Lecture : v3 si valide, sinon v2 en ajoutant les avantages par défaut, sinon v1 (comme aujourd'hui) en ajoutant les avantages par défaut, sinon les valeurs par défaut. Écriture dans v3 seulement ; v1 et v2 ne sont jamais réécrites ni supprimées. Comme avant, tout accès au stockage est protégé par `try/catch`.

---

## 5. États du calcul et interface

### 5.1 États

L'état `ok` de `useCalcul` porte en plus :

```ts
{
  complet: ResultatComplet          // contient resultat, avantages, netVerse, totalMensuel
  avantagesActifs: boolean          // au moins un avantage actif
  plafondTeletravailCentimes: number // pour l'aide affichée sous le champ
}
```

`calculerEtat` appelle `calculerRemuneration` en brut → net, et `calculerBrutDepuisNetVerse` en net → brut. Les états `saisieInvalide`, `netHorsLimites` et `periodeNonCouverte` ne changent pas.

### 5.2 Formulaire

Nouvelle section « Avantages extralégaux », après les enfants à charge : trois cases à cocher qui déplient leurs champs.

- **Titres-repas** : jours prestés, valeur faciale (€), part du travailleur (€).
- **Indemnité de télétravail** : montant mensuel (€), avec sous le champ « Plafond ONSS : 164,21 € » (le plafond de la période, tiré de l'état du calcul).
- **Écochèques** : montant annuel (€), avec « Plafond ONSS : 250,00 €/an ».

Chaque champ suit les conventions existantes : label lié, `aria-invalid`, message d'erreur sous le champ.

### 5.3 Récapitulatif

Sans aucun avantage actif, le récapitulatif est **exactement** celui d'aujourd'hui, dans les deux sens.

Avec au moins un avantage actif, en brut → net :
- **Net versé sur le compte**, en évidence ;
- sous ce montant, le détail en une ligne : « net légal 2 261,33 € − 21,80 € de titres-repas + 160,99 € de télétravail » (les termes à zéro sont omis) ;
- **Avantages reçus** : « 200,00 € — 20 titres-repas de 10,00 € » ;
- **Total mensuel** : net versé + valeur des titres ;
- **Écochèques : 250,00 €/an**, sur une ligne à part, jamais additionnés au mensuel ;
- le taux de retour reste calculé sur le **net légal**, pour rester comparable entre situations ;
- la ligne annuelle suit le montant mis en avant : net versé × 12 quand un avantage modifie l'argent versé, net légal × 12 sinon ;

En net → brut, le brut nécessaire reste en évidence, et le net obtenu est remplacé par le **net versé obtenu**, avec la même note d'écart qu'aujourd'hui si la cible n'est pas atteinte au centime.

### 5.4 Détail du calcul

Après « Salaire net », trois lignes s'ajoutent quand elles ne sont pas nulles, chacune avec son explication et sa source :

| Ligne | Sens | Source |
|---|---|---|
| Part personnelle des titres-repas | − | ONSS-TR |
| Indemnité de télétravail | + | ONSS-FR |
| Net versé | = | — |

La valeur des titres-repas et les écochèques ne figurent **pas** dans le détail : ce n'est pas de l'argent versé.

### 5.5 Avertissements

Une alerte non bloquante par dépassement, sous le bandeau habituel :

| Code | Message |
|---|---|
| `partPatronaleTitres` | « Part patronale de X € : au-delà de Y €, le titre-repas devient du salaire soumis à l'ONSS et à l'impôt. Le calcul ne tient pas compte de ce basculement. » |
| `partTravailleurTitres` | « Part du travailleur de X € : en dessous de Y €, le titre-repas devient du salaire. » |
| `valeurFacialeTitres` | « Valeur faciale de X € : au-delà de Y €, le titre-repas devient du salaire. » |
| `teletravail` | « Indemnité de X € : au-delà de Y €/mois, l'excédent est soumis à l'ONSS et à l'impôt. » |
| `ecocheques` | « Écochèques de X €/an : au-delà de Y €/an, l'excédent devient du salaire. » |

Le bandeau permanent gagne une phrase : « Les avantages sont supposés conformes aux conditions d'exonération (convention collective, un titre par jour presté, télétravail structurel). »

---

## 6. Architecture (fichiers touchés)

```
src/engine/
  avantages.ts                 NOUVEAU — § 3.2
  avantages.test.ts            NOUVEAU
  remuneration.ts              NOUVEAU — § 3.3
  remuneration.test.ts         NOUVEAU
  parametres/types.ts          + ParametresAvantages
  parametres/p2026-07.ts       + bloc avantages (télétravail 160,99 €)
  parametres/p2026-09.ts       + bloc avantages (télétravail 164,21 €)
  parametres/parametres.test.ts + valeurs des deux périodes
  validation.ts                bloc avantages, nouveaux codes d'erreur
  __tests__/reculMax.json      REGÉNÉRÉ par npm run verifier:recul (empreintes)
src/hooks/
  useSaisie.ts                 clé v3, reprise v2 et v1
  useCalcul.ts                 calculerRemuneration / calculerBrutDepuisNetVerse
src/components/
  FormulaireSituation.tsx      section « Avantages extralégaux »
  Recapitulatif.tsx            net versé, avantages reçus, total, écochèques
  DetailCalcul.tsx             trois lignes supplémentaires
  Avertissements.tsx           alertes de dépassement
src/i18n/fr.ts                 libellés, explications, messages d'alerte
src/App.tsx                    câblage
README.md
```

---

## 7. Tests

On écrit les tests avant le code (TDD), module par module.

### 7.1 `avantages`
- Retenue, valeur et part patronale sur des cas simples (20 jours × 1,09 € = 21,80 €, etc.).
- Chaque seuil d'alerte à ±1 centime : 8,91 €, 1,09 €, 10,00 €, le plafond de télétravail de **chaque période**, 250 €.
- Un avantage inactif donne zéro et aucune alerte, même avec des montants saisis.
- 0 jour presté donne zéro.
- L'ordre des alertes est stable.

### 7.2 `remuneration`
- `netVerse = net légal − retenue + télétravail` et `total = netVerse + valeur des titres`.
- Sans avantage, `netVerse` et `total` valent le net légal, et `ResultatComplet.resultat` est identique à `calculerNet`.
- **Net → brut avec avantages, comparé à un oracle** : pour au moins 3 combinaisons (situation × avantages) et les deux périodes, on balaie les bruts au centime depuis la cible et on cherche le plus petit dont le **net versé** atteint la cible ; `calculerBrutDepuisNetVerse` doit donner exactement ce brut.
- Cible ramenée à 1 centime quand l'indemnité de télétravail dépasse à elle seule le net versé souhaité.
- `NetHorsLimites` et `PeriodeNonCouverte` remontent comme avant.

### 7.3 `parametres`
- Le bloc `avantages` des deux périodes, avec les valeurs du § 3.1, dont 160,99 € et 164,21 €.

### 7.4 `validation`, `useSaisie`, `useCalcul`
- Chaque borne et chaque code d'erreur du § 4.2, dans les deux sens de calcul.
- Un avantage décoché n'est pas validé, ses valeurs sont conservées.
- Reprise d'une clé v2 et d'une clé v1, priorité à v3, stockage corrompu.
- L'état `ok` porte `avantagesActifs` et `plafondTeletravailCentimes`.

### 7.5 Interface
- Sans avantage : le récapitulatif et le détail sont inchangés.
- Avec titres-repas : net versé, ligne d'explication, avantages reçus, total, et les deux lignes du détail.
- Écochèques affichés en annuel, jamais dans le total mensuel.
- Chaque alerte de dépassement s'affiche avec ses deux montants.
- Le plafond de télétravail affiché sous le champ suit la période (160,99 € au 31/08, 164,21 € au 01/09).
- Net → brut avec avantages : le brut trouvé redonne bien le net versé demandé.

### 7.6 Garde-fou du recul
`npm run verifier:recul` est relancé après l'ajout des paramètres, et `reculMax.json` est regénéré. Le recul mesuré doit rester **514 centimes** pour les deux périodes : `calculerNet` n'a pas changé.

---

## 8. Risques et points ouverts

1. **Conditions d'exonération non vérifiées** (convention collective, un titre par jour presté, télétravail structurel et régulier). Parade : alertes, bandeau, et section « Limites » du README.
2. **Montants relevés le 16/09/2026** sur les pages ONSS. Parade : les revérifier avant chaque mise en production, comme la formule-clé.
3. **Écochèques menacés par la réforme en cours** : aucune loi n'était votée au 16/09/2026. Parade : paramètre par période, retirable sans toucher au calcul.
4. **Indexation de l'indemnité de bureau** : elle change en cours d'année (01/03 puis 01/09/2026). Parade : c'est déjà un paramètre par période, et les dates coïncident avec les périodes existantes.
5. **Cumul avec les indemnités d'internet et d'ordinateur** (20 € + 20 €) : hors périmètre ici. Si on les ajoute plus tard, ce sera un champ de plus dans le même bloc.
