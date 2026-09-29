# Salaire net Belgique — V2.9 : comparer deux offres

- **Date :** 2026-09-29
- **Statut :** en cours de rédaction
- **Branche :** `feat/comparaison-offres`
- **S'appuie sur :** [spec ergonomie](2026-09-25-ergonomie-interface-design.md), [spec vue annuelle](2026-09-28-vue-annuelle-design.md)

---

## 1. Objectif

Une personne qui hésite entre deux offres d'emploi veut les voir côte à côte : combien chacune rapporte, par mois et sur l'année, avantages compris, et laquelle rapporte le plus.

Choix de l'utilisateur, 2026-09-29 :

- **deux onglets « Offre A » / « Offre B »** dans le formulaire, chacun avec sa propre saisie ;
- **sur demande** : sans offre B, l'app est exactement celle d'aujourd'hui ;
- **la famille est commune** aux deux offres : c'est la même personne ;
- **le tableau de comparaison remplace le récapitulatif** dans la colonne de résultat, et reste visible pendant qu'on modifie une offre ;
- **une ligne « Total annuel en poche »** est mise en avant et désigne l'offre qui rapporte le plus ;
- **architecture A** : deux saisies complètes, famille synchronisée à un seul endroit.

### Critères de réussite

1. Sans offre B, l'app est identique à la V2.8 : **aucun test existant ne change**.
2. La famille (état civil, enfants à charge, revenus du conjoint, parent isolé) est toujours identique dans les deux offres, quelle que soit l'offre dans laquelle on la modifie.
3. Aucun autre champ ne passe d'une offre à l'autre, sauf à la création de l'offre B, qui copie l'offre A.
4. Chaque montant du tableau est exactement celui que montrerait l'app avec la seule offre correspondante ; chaque écart vaut B − A au centime.
5. **Le calcul du salaire ne change pas** : aucun fichier de `src/engine/` n'est modifié hormis la création de `comparaison.ts`.

### Hors périmètre

- plus de deux offres ;
- donner un nom aux offres (nom de l'employeur) ;
- un lien partageable ;
- une famille différente par offre (« et si je me marie ») ;
- chiffrer la valeur de la voiture de société pour l'intégrer au total.

---

## 2. Comportement

### 2.1 Activer et retirer la comparaison

- Au-dessus du bloc « Salaire et famille », un bouton **« Comparer avec une autre offre »**, visible tant qu'il n'y a pas d'offre B.
- Un clic crée l'**offre B, copie exacte de l'offre A** (sens et période compris ; seul `montantAvantBascule` est remis à `null`), fait apparaître les onglets et **ouvre l'offre B**.
- Un bouton **« Retirer l'offre B »**, visible quand l'offre B existe, la supprime sans confirmation : l'app revient à l'affichage à une offre, avec l'offre A.

### 2.2 Onglets des offres

- En tête du formulaire, deux onglets « Offre A » et « Offre B », au motif ARIA des onglets (`tablist`, `tab`, `tabpanel`, tabulation mobile, flèches gauche et droite, Début et Fin), comme les onglets de résultats (spec ergonomie § 3.3).
- Le formulaire montre la saisie de l'**offre ouverte**. Sont propres à chaque offre : le sens du calcul, le montant, la période, l'ATN tapé, la voiture ou le budget mobilité, les primes, les avantages. Les bascules brut ↔ net et mois ↔ an s'appliquent à l'offre ouverte.
- Une offre dont la saisie est invalide porte **« ⚠ »** sur son onglet, avec un nom accessible qui le dit (« Offre B, à corriger »).
- Les sections repliables gardent leur état ouvert ou fermé en changeant d'offre ; une section qui contient une erreur de l'offre ouverte s'ouvre d'office, comme aujourd'hui.

### 2.3 Famille commune

Modifier `etatCivil`, `revenusConjoint`, `enfantsACharge` ou `parentIsole` écrit la même valeur dans les deux offres. C'est le seul endroit du code qui écrit dans l'offre qui n'est pas ouverte.

### 2.4 Sauvegarde

- L'**offre A reste sauvegardée sous la clé actuelle** (`wage-calculator:saisie:v7`), au même format : une sauvegarde sans comparaison ne change pas, et la chaîne de reprise des versions antérieures non plus.
- La comparaison a **sa propre clé**, `wage-calculator:comparaison:v1` : `{ offreB, offreActive }`. Elle n'existe que tant qu'il y a une offre B ; retirer l'offre B la supprime.
- Une offre B illisible se reprend comme les anciennes saisies (blocs manquants complétés par défaut) ; si elle est inutilisable, on reprend l'offre A seule. Une `offreActive` inconnue se reprend en `'A'`. La famille de l'offre A s'impose toujours à l'offre B à la lecture.

*Révision du 2026-09-29, avant le plan :* la première rédaction prévoyait une sauvegarde v8 unique `{ offreA, offreB, offreActive }`. Une trentaine de tests existants écrivent et relisent la clé v7 au format d'une saisie ; le critère 1 interdit de les changer. Une clé à part pour la comparaison tient ce critère sans rien changer à la sauvegarde existante.

---

## 3. Le tableau de comparaison

### 3.1 Place

Quand l'offre B existe, le tableau remplace le récapitulatif dans la colonne de résultat fixée. En dessous, les **alertes** et les **onglets de résultats** (détail du calcul, primes, budget mobilité) portent sur l'**offre ouverte**, sous un petit titre qui la nomme (« Offre B »).

### 3.2 Lignes

Trois colonnes de montants : **Offre A**, **Offre B**, **Écart (B − A)**.

| Ligne | Montant | Écart |
|---|---|---|
| Brut mensuel | le brut mensuel retenu : tapé (converti s'il est annuel) ou trouvé en net → brut | oui |
| Brut annuel | au sens belge, selon les primes de l'offre (spec vue annuelle § 2.1) | oui |
| Net versé | le net versé mensuel, comme le montant mis en avant du récapitulatif | oui |
| Net annuel tout compris | 12 × net versé + nets des primes cochées (spec vue annuelle § 2.4) | oui |
| Titres-repas | valeur des titres reçus par mois | oui |
| Écochèques | montant annuel | oui |
| Mobilité | « Voiture · ATN {montant}/mois », « Budget mobilité » ou « Aucune » | non |
| Taux de retour | celui du récapitulatif | non |
| **Total annuel en poche** | net annuel tout compris + 12 × titres-repas + écochèques | oui |

- Les lignes **Titres-repas** et **Écochèques** n'apparaissent que si au moins une des deux offres a un montant non nul ; l'autre offre montre alors « 0,00 € ».
- L'écart est signé : « + 1 234,56 € », « − 87,00 € », « 0,00 € ».
- La ligne **Total annuel en poche** est mise en avant. Sous elle, une phrase : « L'offre B rapporte {écart} de plus par an », « L'offre A rapporte {écart} de plus par an » ou « Les deux offres rapportent autant ».
- La voiture n'entre pas dans le total : on ne la touche pas en argent. Sa ligne reste affichée pour qu'on la prenne en compte soi-même.
- Une offre sans résultat (saisie invalide, net hors limites, période non couverte) montre « — » dans sa colonne ; l'écart et la phrase de résumé montrent « — » aussi.
- Sur téléphone, chaque ligne met son libellé au-dessus et les trois montants en dessous.

---

## 4. Architecture

- **Créer `src/engine/comparaison.ts`** : fonctions pures qui, à partir des résultats des deux offres (ou `null`), produisent les lignes du tableau, les écarts, le total annuel en poche et le sens de la phrase de résumé. Centimes entiers, aucune règle légale nouvelle.
- **Modifier `src/hooks/useSaisie.ts`** : état `{ offreA, offreB, offreActive }` ; `saisie` (l'offre ouverte), `modifier` (famille écrite dans les deux offres), `basculerSens` et `basculerPeriode` sur l'offre ouverte ; `ajouterOffreB`, `retirerOffreB`, `choisirOffre` ; la clé de la comparaison et sa reprise (§ 2.4).
- **Modifier `src/hooks/useCalcul.ts`** : accepter une saisie `null` et renvoyer alors `null`, pour que l'app l'appelle toujours deux fois (règle des hooks).
- **Créer `src/components/ComparaisonOffres.tsx`** (le tableau) et **`src/components/OngletsOffres.tsx`** (les onglets du formulaire). La gestion du clavier des onglets est mise en commun avec `OngletsResultats.tsx` plutôt que recopiée.
- **Modifier `src/App.tsx`** : deux calculs, tableau ou récapitulatif, alertes et onglets de résultats de l'offre ouverte ; **`src/components/FormulaireSituation.tsx`** : bouton de comparaison, onglets, bouton de retrait ; **`src/i18n/fr.ts`** : tous les textes.
- **Aucune fonction de calcul du salaire ne change** ; `npm run verifier:recul` n'a pas à être relancé.

---

## 5. Tests

- **`comparaison.ts`** : écarts signés au centime ; total annuel en poche ; présence et absence des lignes titres-repas et écochèques ; offre `null` ; égalité parfaite ; la ligne mobilité pour les trois choix.
- **`useSaisie`** : famille modifiée depuis A puis depuis B, identique dans les deux ; un champ non familial modifié dans une offre ne change pas l'autre ; l'offre B copie A à sa création et s'ouvre ; la retirer rouvre A ; bascules sur l'offre ouverte seulement ; clé de la comparaison écrite, puis supprimée au retrait ; reprise avec une offre B complète, incomplète, inutilisable, une `offreActive` inconnue, une famille divergente.
- **Interface** (`src/App.test.tsx`, nouveau `describe`) : créer l'offre B, changer son brut, lire le tableau avec des **valeurs attendues écrites en dur**, recalculées hors de l'app ; une erreur dans l'offre B donne « ⚠ » et « — » ; changer les enfants met à jour les deux colonnes ; retirer l'offre B rend le récapitulatif ; clavier dans les onglets des offres ; le détail du calcul suit l'offre ouverte.
- **Les tests existants ne changent pas.**
- **Vérification visuelle** réelle à 1 440 px et à 390 px.

---

## 6. Risques

1. **Une famille qui diverge** entre les deux offres fausserait la comparaison sans qu'on le voie : écriture à un seul endroit, testée dans les deux sens, et reprise d'une sauvegarde qui impose la famille de l'offre A.
2. **Se tromper d'offre en la modifiant** : onglet actif visible, petit titre « Offre B » au-dessus du détail, et le tableau reste sous les yeux.
3. **Un défaut dans l'offre qu'on ne regarde pas** : « ⚠ » sur son onglet et « — » dans sa colonne.
4. **Hauteur de la colonne de résultat** : le tableau est plus haut que le récapitulatif ; la colonne défile déjà d'elle-même quand elle dépasse l'écran.
