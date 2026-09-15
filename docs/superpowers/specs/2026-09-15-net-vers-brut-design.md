# Salaire net Belgique — V2.1 : calcul net → brut

- **Date :** 2026-09-15
- **Statut :** en relecture
- **Branche :** `feat/net-vers-brut`
- **S'appuie sur :** [spec V1](2026-09-14-salaire-net-belgique-v1-design.md), dont toutes les règles de calcul restent inchangées

---

## 1. Objectif

Permettre de saisir le **net mensuel souhaité** et d'obtenir le **brut mensuel nécessaire**, pour les mêmes situations que la V1 (employé à temps plein, situation familiale, date du jour).

La V2 est découpée en trois sous-projets, chacun avec sa spec, son plan et sa mise en œuvre :
1. **net → brut** (ce document) ;
2. avantages extralégaux ;
3. 13e mois, pécule de vacances et coût employeur.

### Critères de réussite
1. Pour tout net demandé, le brut affiché est **le plus petit brut dont le net est au moins égal au net demandé**. C'est vérifié contre un oracle par balayage (§ 7.2).
2. Le détail du calcul affiché est exactement celui de la V1 pour le brut trouvé.
3. Aucune règle fiscale ou sociale n'est réécrite : la recherche n'utilise que `calculerNet`.
4. La recherche reste instantanée pendant la frappe (§ 7.2, test de performance).

### Hors périmètre
- Toute nouvelle règle de calcul, notamment les points 2 et 3 ci-dessus.
- Les points reportés de la V1 : vérification externe, veille réglementaire, déploiement, ménage.

---

## 2. Constats qui guident le design

Balayage exhaustif de tous les bruts de 0,01 € à 100 000 € au centime, pour 6 situations et 2 dates (31/08 et 14/09/2026), fait le 15/09/2026 :

| Constat | Mesure |
|---|---|
| **Le net ne monte pas toujours avec le brut** : petites baisses dues aux arrondis successifs | ~17 000 baisses par situation, de 3 centimes au plus (pire cas : brut 2 345,18 €) |
| **Marche légale** : cotisation spéciale « commune, conjoint avec revenus », qui passe de 0 à 5,15 € à 1 095,10 € de brut | le net baisse de **5,14 €** |
| **Certains nets au centime près sont impossibles à atteindre** | jusqu'à ~1 950 valeurs par situation, avec des trous d'1 centime |
| **Plusieurs bruts donnent le même net** | dans ~58 % des pas d'1 centime, le net ne change pas |
| **Aller-retour brut → net → brut** | 3 000,00 → 2 261,33 → **2 999,96** ; ~50 % des bruts se décalent, de 19 centimes au plus (échantillon de 1 000 à 8 000 €) |

Un appel à `calculerNet` prend environ 0,75 µs (mesuré sur le balayage).

Conséquences :
- une dichotomie seule peut se tromper, d'où l'algorithme du § 3.2 ;
- il faut une règle unique pour choisir le brut (§ 1, critère 1) ;
- il faut une note quand le net obtenu dépasse la cible (§ 5.2) ;
- il faut restaurer le montant d'origine lors d'un aller-retour de bascule (§ 4.3).

---

## 3. Moteur

### 3.1 Contrat

Nouveau fichier `src/engine/calculerBrut.ts`, en TypeScript pur, sans dépendance React ni navigateur.

```ts
/** Situation sans le brut : ce que l'on connaît quand on part du net. */
export type SituationFamiliale = Omit<Situation, 'brutMensuelCentimes'>

/**
 * Marge G de l'algorithme. Doit rester ≥ au recul maximal du net mesuré par
 * tools/verification/reculMax.ts (vérifié par test, § 7.1).
 */
export const MARGE_RECUL_CENTIMES = 1_000

export interface ResultatInverse {
  netCibleCentimes: number
  /** Plus petit brut dont le net est ≥ netCibleCentimes. */
  brutCentimes: number
  /** calculerNet pour le brut trouvé : détail identique au mode brut → net. */
  resultat: Resultat
}

/**
 * Lève NetHorsLimites si aucun brut ≤ BRUT_MAX_CENTIMES n'atteint la cible,
 * et PeriodeNonCouverte si aucune règle n'est intégrée pour dateIso.
 */
export function calculerBrut(
  famille: SituationFamiliale,
  netCibleCentimes: number,
  dateIso: string,
): ResultatInverse
```

Dans `types.ts` :
```ts
export const BRUT_MAX_CENTIMES = 10_000_000   // déplacé depuis validation.ts

export class NetHorsLimites extends Error {
  readonly netCibleCentimes: number
  readonly netMaxCentimes: number   // net pour BRUT_MAX_CENTIMES
}
```

`calculerBrut` suppose `netCibleCentimes` entier et > 0. C'est la validation qui le garantit, comme pour `calculerNet`.

### 3.2 Algorithme

Notation : `net(b)` = `calculerNet({ ...famille, brutMensuelCentimes: b }, dateIso).netMensuelCentimes`, `T` = net cible, `G` = `MARGE_RECUL_CENTIMES`.

1. **Borne haute.** Si `net(BRUT_MAX_CENTIMES) < T`, on lève `NetHorsLimites(T, net(BRUT_MAX_CENTIMES))`.
2. **Dichotomie.** On part de `lo = 0`, qui compte comme un net de 0 et n'est jamais évalué, et de `hi = BRUT_MAX_CENTIMES`. Tant que `hi − lo > 1` :
   - `mid = ⌊(lo + hi) / 2⌋` ;
   - si `net(mid) ≥ T`, alors `hi = mid`, sinon `lo = mid`.

   À la fin, `net(hi) ≥ T`, en environ 24 appels.
3. **Balayage vers le bas.** On pose `meilleur = hi`, puis pour `b = hi − 1, hi − 2, …, 1` :
   - si `net(b) ≥ T`, alors `meilleur = b` ;
   - si `net(b) < T − G`, on s'arrête.
4. On renvoie `{ netCibleCentimes: T, brutCentimes: meilleur, resultat: calculerNet(…meilleur…) }`.

**Pourquoi c'est exact.** On appelle **recul maximal** R la plus grande valeur de `net(b) − net(b')` pour `b < b'`. Si le balayage s'arrête en `b'` avec `net(b') < T − G`, alors pour tout `b < b'` :

`net(b) ≤ net(b') + R < T − G + R ≤ T`, dès que R ≤ G.

Aucun brut sous `b'` n'atteint la cible, et tous les bruts de `b'` à `hi` ont été examinés. Si un brut au-dessus de `hi` atteignait la cible, on n'en tient pas compte : on cherche le plus petit, et `hi` l'atteint déjà. `meilleur` est donc bien le plus petit brut qui atteint la cible, même si la dichotomie s'est arrêtée sur un franchissement qui n'est pas le premier. Si le balayage descend jusqu'à `b = 1` sans s'arrêter, tous les bruts ont été examinés et le résultat reste exact.

**Coût.** Le balayage ne parcourt que la zone où le net va de `T − G` à `T + R`, soit quelques milliers d'appels au plus. Le test de performance du § 7.2 le borne en pratique.

### 3.3 Ce qui ne change pas
`calculerNet`, `onss`, `bonusEmploiSocial`, `precompte`, `cotisationSpeciale`, `parametres` et `references.json`.

---

## 4. Saisie, validation, mémorisation

### 4.1 Saisie du formulaire (`validation.ts`)

```ts
export type SensCalcul = 'brutVersNet' | 'netVersBrut'

export interface SaisieFormulaire {
  sens: SensCalcul
  /** Brut ou net mensuel selon le sens, tel que tapé. Remplace `brut`. */
  montant: string
  /** Montant quitté lors de la dernière bascule, tant qu'il n'a pas été modifié (§ 4.3). */
  montantAvantBascule: string | null
  etatCivil: EtatCivil
  revenusConjoint: RevenusConjoint
  enfantsACharge: string
  parentIsole: boolean
}

export const SAISIE_PAR_DEFAUT: SaisieFormulaire = {
  sens: 'brutVersNet',
  montant: '3000',
  montantAvantBascule: null,
  etatCivil: 'isole',
  revenusConjoint: 'aucun',
  enfantsACharge: '0',
  parentIsole: false,
}
```

Codes d'erreur : `brutVide`, `brutFormat` et `brutHorsLimites` deviennent `montantVide`, `montantFormat` et `montantHorsLimites`. Le champ d'erreur `brut` devient `montant`. `enfantsInvalide` ne change pas.

Le message de `montantVide` suit le sens : « Indiquez votre salaire brut mensuel. » ou « Indiquez le salaire net mensuel souhaité. ». Les autres messages sont communs aux deux sens. `i18n/fr.ts` expose `texteErreur(code, sens)`.

### 4.2 Validation

```ts
export type ResultatValidation =
  | { ok: true; sens: 'brutVersNet'; situation: Situation }
  | { ok: true; sens: 'netVersBrut'; famille: SituationFamiliale; netCibleCentimes: number }
  | { ok: false; erreurs: ErreursSaisie }
```

- Le montant est contrôlé de la même façon dans les deux sens : non vide, au plus 2 décimales, entre 0,01 € et 100 000 €.
- Le plafond réel du net dépend de la situation et de la date. C'est le moteur qui le vérifie (`NetHorsLimites`).
- La normalisation de la situation familiale ne change pas : `revenusConjoint` vaut `null` si isolé, et `parentIsole` est ramené à `false` sans enfant ou si marié.

### 4.3 Bascule de sens et aller-retour

La fonction `basculerSens(montantRepris: string | null)` de `useSaisie` fonctionne ainsi :
1. **Nouveau montant :**
   - s'il existe, `montantAvantBascule` (restauration exacte) ;
   - sinon `montantRepris`, s'il est non `null` ;
   - sinon le `montant` actuel.
2. `montantAvantBascule` prend la valeur de l'ancien `montant`.
3. `sens` prend la valeur opposée.

La fonction `modifier('montant', …)` remet `montantAvantBascule` à `null`. Les autres champs, comme l'état civil ou les enfants, ne le touchent pas : le montant tapé reste celui d'origine.

`App` calcule `montantRepris` à partir de l'état affiché :
- `brutVersNet` et état `ok` : le net obtenu ;
- `netVersBrut` et état `ok` : le brut trouvé ;
- sinon `null`.

La conversion utilise une nouvelle fonction `centimesEnSaisie(centimes)` dans `utils/format.ts` : 226133 → `"2261,33"`, 300000 → `"3000"`, 5 → `"0,05"`. `eurosTexteEnCentimes` accepte déjà ce format.

Exemple : `3000` (brut) → bascule → `2261,33` (net, brut trouvé 2 999,96) → bascule sans modification → `3000`.

### 4.4 Mémorisation (`useSaisie`)

- Nouvelle clé : `wage-calculator:saisie:v2`.
- **Lecture :**
  - si la clé v2 est valide, on l'utilise ;
  - sinon, si la clé v1 est valide, on la reprend avec `sens: 'brutVersNet'`, `montant: brut` et `montantAvantBascule: null` ;
  - sinon on prend `SAISIE_PAR_DEFAUT`.
- **Écriture :** uniquement dans la clé v2. La clé v1 n'est pas supprimée.
- Comme en V1, un stockage indisponible ou un JSON invalide est ignoré silencieusement, avec lecture et écriture protégées par `try/catch`.

---

## 5. États du calcul et interface

### 5.1 États (`useCalcul`)

```ts
export type EtatCalcul =
  | {
      etat: 'ok'
      sens: SensCalcul
      resultat: Resultat
      brutCentimes: number
      /** null en brut → net. */
      netCibleCentimes: number | null
      rmmmgCentimes: number
    }
  | { etat: 'saisieInvalide'; erreurs: ErreursSaisie }
  | { etat: 'netHorsLimites'; netMaxCentimes: number }
  | { etat: 'periodeNonCouverte'; dateIso: string }
```

`calculerEtat` appelle `calculerNet` ou `calculerBrut` selon `validation.sens`. Il convertit `NetHorsLimites` en `netHorsLimites`, et `PeriodeNonCouverte` en `periodeNonCouverte` comme en V1.

### 5.2 Interface

**Bascule**, en haut du formulaire « Votre situation » :
- un `fieldset` avec une légende « Sens du calcul » et deux boutons radio stylés en contrôle segmenté : **Brut → net** | **Net → brut** ;
- navigation au clavier native d'un groupe radio.

**Champ montant** : l'`id` reste `montant` dans les deux sens. Le libellé suit le sens :

| Sens | Libellé |
|---|---|
| `brutVersNet` | Salaire brut mensuel (€) |
| `netVersBrut` | Salaire net mensuel souhaité (€) |

**Récapitulatif**
- En `brutVersNet`, rien ne change par rapport à la V1 (titre « Votre salaire net »).
- En `netVersBrut`, le titre devient « Votre salaire brut », avec :
  - **Brut mensuel nécessaire**, en évidence ;
  - **Net obtenu**, avec la note « X € de plus que demandé : aucun brut ne donne exactement ce net » si le net obtenu dépasse la cible ;
  - **Brut annuel (× 12)**, « hors 13e mois et pécule de vacances » ;
  - **Taux de retour** ;
  - « Règles en vigueur du JJ/MM/AAAA au JJ/MM/AAAA ».

**Détail du calcul** : identique à la V1, calculé à partir du brut trouvé. En `netVersBrut`, l'explication ⓘ de la ligne « Salaire brut » devient « Le plus petit brut mensuel qui donne au moins le net demandé ».

**Avertissements**
- L'alerte « brut inférieur au RMMMG » s'applique au brut trouvé.
- `netHorsLimites` affiche sous le champ « Au-delà de X € net, le brut nécessaire dépasse 100 000 € ». Le champ passe en `aria-invalid`, le détail affiche « — », et le bandeau « Corrigez la saisie pour voir le calcul. » s'affiche comme pour une saisie invalide.

**Textes** : tout va dans `i18n/fr.ts`. Le sous-titre devient « Du brut au net, ou du net au brut, pour un employé à temps plein ».

**README** : on ajoute le mode net → brut dans la présentation, la commande `npm run verifier:recul` dans les scripts, et une phrase sur la garantie de l'algorithme dans « Comment l'exactitude est vérifiée ».

---

## 6. Architecture (fichiers touchés)

```
src/engine/
  calculerBrut.ts              NOUVEAU — § 3
  calculerBrut.test.ts         NOUVEAU — § 7.2
  types.ts                     + BRUT_MAX_CENTIMES, NetHorsLimites
  validation.ts                sens, montant, montantAvantBascule, résultat par sens
  __tests__/situations.ts      NOUVEAU — les 76 situations familiales couvertes (tests et outil)
  __tests__/empreinte.ts       NOUVEAU — empreinte FNV-1a des paramètres et des situations
  __tests__/reculMax.json      NOUVEAU — généré par l'outil
  __tests__/reculMax.test.ts   NOUVEAU — § 7.1
src/hooks/
  useSaisie.ts                 clé v2, reprise v1, basculerSens
  useCalcul.ts                 calculerBrut, état netHorsLimites
  useCalcul.test.ts            NOUVEAU
src/utils/format.ts            + centimesEnSaisie
src/components/
  FormulaireSituation.tsx      bascule, champ montant, message netHorsLimites
  Recapitulatif.tsx            affichage net → brut
  Avertissements.tsx           bandeau « Corrigez la saisie » aussi pour netHorsLimites
  DetailCalcul.tsx             explication du brut selon le sens
  LigneCalcul.tsx              explication remplaçable (prop facultative)
src/i18n/fr.ts                 nouveaux textes
src/App.tsx                    montantRepris, câblage de la bascule
tools/verification/
  reculMax.ts                  NOUVEAU — § 7.1
  resolveur.mjs                NOUVEAU — imports TypeScript sans extension pour Node
package.json                   + script verifier:recul
README.md
```

---

## 7. Tests et vérification

On écrit les tests avant le code (TDD), module par module.

### 7.1 Garantie du recul maximal

**Outil** `tools/verification/reculMax.ts`, lancé par `npm run verifier:recul` :
- Il couvre **toutes** les situations de la V1 : isolé (0 à 10 enfants), parent isolé (1 à 10 enfants) et les 5 cas de conjoint (0 à 10 enfants), soit **76 situations**.
- Il le fait pour **chaque période** de `parametres/`, sur tous les bruts de 1 à `BRUT_MAX_CENTIMES` centimes.
- Il calcule le recul maximal R, c'est-à-dire la plus grande valeur de `max(net(x) pour x < b) − net(b)`, avec la situation et le brut où il se produit.
- Il répartit les situations sur les cœurs du processeur (`worker_threads`) et dure plusieurs minutes.
- Il écrit `src/engine/__tests__/reculMax.json`. Structure (les valeurs sont illustratives) :
  ```json
  {
    "genereLe": "2026-09-15",
    "situationsCouvertes": 76,
    "empreinteSituations": "1d9b221c",
    "periodes": {
      "P2026-07": {
        "reculMaxCentimes": 514,
        "brutCentimes": 109510,
        "situation": { "etatCivil": "marieOuCohabitant", "revenusConjoint": "superieurs", "enfantsACharge": 0, "parentIsole": false },
        "empreinteParametres": "3cc206a9"
      },
      "P2026-09": { "reculMaxCentimes": 514, "brutCentimes": 109510, "situation": { "etatCivil": "marieOuCohabitant", "revenusConjoint": "superieurs", "enfantsACharge": 0, "parentIsole": false }, "empreinteParametres": "5406c58c" }
    }
  }
  ```
- Il tourne sous Node natif (suppression des types TypeScript), avec `resolveur.mjs` pour les imports sans extension. Aucune nouvelle dépendance.

**Test rapide** `reculMax.test.ts` :
- `MARGE_RECUL_CENTIMES ≥ reculMaxCentimes` pour chaque période ;
- l'ensemble des périodes du JSON est égal à l'ensemble des périodes de `parametres/`. Ajouter une période sans relancer l'outil fait échouer le test ;
- `situationsCouvertes` vaut 76 ;
- les empreintes des paramètres de chaque période et de la liste des situations correspondent à celles enregistrées par l'outil : modifier un jeu de paramètres ou la liste sans relancer l'outil fait échouer le test ;

### 7.2 `calculerBrut`

**Oracle** : `brutOracle(T)` monte centime par centime depuis `b = T` jusqu'au premier `b` tel que `net(b) ≥ T`. Il est valable parce que `net(b) ≤ b` : toutes les retenues sont positives ou nulles, puisque le bonus est écrêté à l'ONSS et que le précompte et la cotisation spéciale sont ≥ 0. Un test le vérifie sur les 74 cas de référence et les zones pièges.

L'oracle coûte `brut − T` appels, soit environ 60 ms par cible vers 3 000 € (mesuré). On le réserve donc aux cibles où cet écart reste petit. Ailleurs, on fait une **vérification locale** : `net(brut) ≥ T` et `net(brut − 1) < T`. Sur tout l'intervalle, l'exactitude repose sur la preuve du § 3.2 et sur l'outil du § 7.1.

Cas comparés à l'oracle :
- les **cas de référence dont le brut est ≤ 3 000 €** : cible = net du cas ;
- la **marche à 1 095,10 €** (conjoint `superieurs`, net 1 095,09 € juste avant, 1 089,95 € juste après) : cibles de part et d'autre ;
- la **baisse à 2 345,18 €** (isolé, net 2 133,85 € → 2 133,82 €) : cibles de 2 133,80 à 2 133,90 € ;
- un **net impossible** : isolé, 14/09/2026, cible 1 808,45 € (net 1 808,44 € à 1 808,45 € de brut, puis 1 808,46 € à 1 808,46 €), où le brut trouvé est 1 808,46 € et le net obtenu vaut T + 1 ;
- les **planchers des volets A et B**, sur les deux périodes : cible = net au plancher ;
- **40 cibles pseudo-aléatoires** d'au plus 2 500 € net, avec une graine fixe, sur les 76 situations et les deux périodes.

Cas en vérification locale :
- les **74 cas de référence**, avec en plus `brut trouvé ≤ brut du cas` ;
- **200 cibles pseudo-aléatoires** sur tout l'intervalle `[1, net(BRUT_MAX_CENTIMES)]`, qui servent aussi au **test de performance** : moins de 2 secondes au total.

Autres cas :
- l'exemple : isolé, 2 261,33 € → brut 2 999,96 € ;
- les **limites** : `T = net(BRUT_MAX_CENTIMES)` est accepté, `T + 1` lève `NetHorsLimites` avec le bon `netMaxCentimes`, et `T = 1` renvoie un brut de 0,01 € ;
- une date non couverte lève `PeriodeNonCouverte` ;
- `resultat` est égal à `calculerNet` pour le brut trouvé.

### 7.3 Autres modules
- `validation` : les deux sens ; `montantVide`, `montantFormat` et `montantHorsLimites` ; le résultat `netVersBrut` porte `famille` et `netCibleCentimes`.
- `format` : `centimesEnSaisie`, et l'aller-retour avec `eurosTexteEnCentimes`.
- `useSaisie` :
  - reprise d'une clé v1 ;
  - clé v2 prioritaire ;
  - JSON corrompu ;
  - `basculerSens` avec restauration, avec `montantRepris`, et sans rien ;
  - `modifier('montant')` remet `montantAvantBascule` à `null` ;
  - modifier un autre champ ne le touche pas.
- `useCalcul` : l'état `netHorsLimites` et `sens` dans l'état `ok`.

### 7.4 Interface
- La bascule change le libellé du champ et le récapitulatif.
- 3000 → bascule → le champ contient `2261,33` et le brut affiché vaut 2 999,96 € → bascule → le champ contient `3000`.
- Si on modifie le montant après une bascule, la bascule suivante reprend le résultat affiché.
- Un net impossible affiche la note « de plus que demandé ».
- Un net au-delà du maximum affiche le message dédié et « — » dans le détail.
- Le sens est restauré depuis le stockage.

---

## 8. Gestion des erreurs

| Cas | Comportement |
|---|---|
| Montant vide, mal formé, ≤ 0 ou > 100 000 € (les deux sens) | message sous le champ, pas de calcul, détail « — » |
| Net supérieur au net atteignable à 100 000 € de brut | `NetHorsLimites` → « Au-delà de X € net, le brut nécessaire dépasse 100 000 € », détail « — » |
| Net impossible à atteindre au centime près | brut trouvé + note « X € de plus que demandé » |
| Date non couverte | inchangé par rapport à la V1 |
| Stockage v1, v2 ou corrompu | § 4.4 |

---

## 9. Risques et points ouverts

1. **Nouvelle période avec un recul plus grand que G.** Par exemple, une future cotisation qui crée une marche de plus de 10 €. Parade : le test du § 7.1 échoue dès qu'une période est ajoutée ou modifiée tant que l'outil n'a pas été relancé, et il échoue aussi si R dépasse G. Il suffit alors d'augmenter G, au prix d'un balayage un peu plus long.
2. **Durée de l'outil** : environ 1,5 milliard d'appels, soit de l'ordre de 20 minutes sur un seul cœur. Parade : `worker_threads`, et on ne le lance qu'à chaque changement de paramètres.
3. **Nouveaux champs dans `Situation`** (sous-projets suivants, par exemple les avantages) : l'outil et l'oracle devront couvrir les nouvelles dimensions. On le rappellera dans la spec de chaque sous-projet.
