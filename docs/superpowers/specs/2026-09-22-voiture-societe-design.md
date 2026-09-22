# Salaire net Belgique — V2.4 : voiture de société

- **Date :** 2026-09-22
- **Statut :** appliquée
- **Branche :** `feat/voiture-societe`
- **S'appuie sur :** [spec V1](2026-09-14-salaire-net-belgique-v1-design.md), [spec net → brut](2026-09-15-net-vers-brut-design.md), [spec avantages](2026-09-16-avantages-extralegaux-design.md), [spec fiches 2025](2026-09-18-verification-fiches-2025-design.md)

---

## 1. Objectif

Calculer l'avantage de toute nature (ATN) d'une voiture de société à partir de ses caractéristiques, au lieu de demander son montant. Depuis la V2.3, le moteur sait déjà traiter un ATN mensuel donné : il l'ajoute à la base du précompte sans le retirer du net. Cette spec ajoute ce qui produit ce montant, plus la contribution personnelle que beaucoup d'employeurs retiennent au salarié.

Deux modes cohabitent (choix de l'utilisateur, 2026-09-22) :
- **« Je connais le montant »** : le champ actuel, celui qu'on recopie d'une fiche de paie. Les deux cas de fiches réelles de la V2.3 restent tels quels.
- **« Calculer depuis la voiture »** : valeur catalogue, carburant, CO₂, date de première immatriculation.

La **contribution personnelle** est disponible dans les deux modes (choix de l'utilisateur, 2026-09-22).

### Critères de réussite

1. Pour toute voiture du domaine, le moteur calcule l'ATN mensuel au centime selon l'art. 36 § 2 CIR 92 et les paramètres de la période.
2. Le script Python indépendant reproduit les cas voiture au centime, sans lire le code TypeScript.
3. Les exemples chiffrés publiés dont les données sont complètes sont reproduits au centime et marqués `verifie: true` avec leur source.
4. La garantie de `calculerBrut` est mesurée à trois niveaux d'ATN et reste sous la marge de 10 €.
5. Une saisie enregistrée par une version antérieure se recharge sans erreur.

### La règle d'or

Aucune valeur n'est ajustée pour faire tomber un exemple juste. Si un exemple publié n'est pas reproduit, l'écart est documenté, pas masqué — comme pour le précompte en V2.3.

### Hors périmètre

- les **fausses hybrides** (règle du CO₂ de la version thermique ou ×2,5) : l'utilisateur saisit la valeur CO₂ à retenir, l'aide le dit ;
- les voitures **sans donnée CO₂** (valeurs par défaut de la loi) ;
- la **cotisation CO₂ patronale** : elle relève du sous-projet « coût employeur » ;
- les camionnettes, vélos, cartes carburant et bornes de recharge ;
- le trou de paramètres de janvier à juin 2026, inchangé.

---

## 2. Sources officielles

| Élément | Source | Statut |
|---|---|---|
| Formule, 6/7, bornes 4 % et 18 %, électrique à 4 %, coefficient d'âge, mois compté dès le mois d'immatriculation, déduction de la contribution | loi du 28/12/2011 (Moniteur belge du 30/12/2011, éd. 4) modifiée par la loi-programme (I) du 29/03/2012 (Moniteur belge du 06/04/2012, 3e éd.), art. 36 § 2 CIR 92 | **confirmé** : SPF Finances, FAQ « Avantage de toute nature résultant de l'utilisation à des fins personnelles d'un véhicule mis gratuitement à disposition » (finances.belgium.be/sites/default/files/downloads/121-faq-voitures-de-societe-2026.pdf), tableau des coefficients d'âge et exemple chiffré (immatriculation le 21/06/2019 → décompte à partir du 01/06/2019) |
| Émissions de référence 2026 : diesel 58 g/km, essence/LPG/gaz naturel 70 g/km | arrêté royal modifiant l'AR/CIR 92 (date : 17/12/2025, Moniteur belge du 24/12/2025, selon Securex et Partena) | **valeurs confirmées** : FAQ SPF Finances voitures de société 2026 ; **date de l'AR : source secondaire (Securex, Partena), non vérifiée au Moniteur belge** |
| Émissions de référence 2025 : diesel 59 g/km, essence/LPG/gaz naturel 71 g/km | arrêté royal modifiant l'AR/CIR 92 (date : 08/12/2024, Moniteur belge du 12/12/2024, selon Securex et Partena) | **valeurs confirmées** : FAQ SPF Finances voitures de société 2026 ; **date de l'AR : source secondaire (Securex, Partena), non vérifiée au Moniteur belge** |
| Minimum annuel 2026 (revenus 2026 = exercice d'imposition 2027) : 1 690 € | art. 36 § 2 CIR 92, montant de base indexé | **confirmé** : FAQ SPF Finances ci-dessus, tableau des montants indexés — exercice d'imposition 2027 = 1 690 € |
| Minimum annuel 2025 (revenus 2025 = exercice d'imposition 2026) : 1 650 € | idem | **confirmé** : idem — exercice d'imposition 2026 = 1 650 € |

---

## 3. Moteur

### 3.1 Nouveau module `src/engine/atnVoiture.ts`

Calcul pur, sans état, appelé **avant** `calculerNet`. Il produit la valeur du champ existant `Situation.atnMensuelCentimes`. `calculerNet` ne change pas.

```ts
export type Carburant = 'essence' | 'diesel' | 'electrique'

export interface Voiture {
  carburant: Carburant
  /** Prix catalogue à l'état neuf, options et TVA réellement payée comprises, remises exclues. */
  valeurCatalogueCentimes: number
  /** Ignoré pour l'électrique. Hybride : valeur de la fiche de conformité. */
  co2GrammesKm: number
  /** AAAA-MM de la première immatriculation. */
  premiereImmatriculation: string
}

export interface ResultatAtnVoiture {
  /** Rappel de la valeur saisie, pour l'explication du détail. */
  valeurCatalogueCentimes: number
  pourcentageCo2DixMilliemes: number
  coefficientAgeDixMilliemes: number
  moisEcoules: number
  annuelFormuleCentimes: number
  minimumAppliqueCentimes: number | null
  annuelCentimes: number
  mensuelCentimes: number
}

export function calculerAtnVoiture(voiture: Voiture, dateIso: string, parametres: Parametres): ResultatAtnVoiture
```

**Calcul :**
1. `pourcentageCo2` (dix-millièmes) : électrique → 400 ; sinon `550 + 10 × (co2 − référence du carburant)`, borné entre 400 et 1 800. L'essence, le LPG et le gaz naturel partagent la référence « essence ».
2. `moisEcoules` : nombre de mois entre la première immatriculation et le mois de `dateIso`. Convention confirmée par la tâche 1 (FAQ SPF Finances, § 2) : « un mois commencé compte pour un mois entier » — le décompte commence le 1er jour du mois de la première immatriculation (ex. immatriculation le 21/06/2019 → la première tranche de 12 mois court du 01/06/2019 au 31/05/2020 inclus), donc le mois d'immatriculation est le mois 1. Figée par un test à chaque frontière.
3. `coefficientAge` (dix-millièmes) : 10 000 jusqu'à 12 mois, 9 400 de 13 à 24, 8 800 de 25 à 36, 8 200 de 37 à 48, 7 600 de 49 à 60, 7 000 au-delà.
4. `annuelFormule = arrondi(valeur × coefficientAge × 6 × pourcentageCo2 / (7 × 10 000 × 10 000))`, **un seul arrondi**, au centime, demi vers l'extérieur : la loi ne prescrit aucun arrondi intermédiaire. Dans la borne de 770 000 € (§ 5.1), le plus grand produit vaut 77 000 000 × 10 000 × 6 × 1 800 = 8,316 × 10¹⁵, sous 2⁵³ : le calcul entier en `number` est exact, sans `BigInt`. Le module refuse toute valeur hors de cette borne.
5. `annuel = max(annuelFormule, minimum de la période)` ; `minimumApplique` vaut le minimum quand il joue, sinon `null`.
6. `mensuel = arrondi(annuel / 12)`.

Exemple de contrôle : essence, 45 000,00 €, 103 g/km (8,8 % en 2026 : 5,5 % + 33 × 0,1 %), 20 mois (94 %) → 45 000 × 94 % × 6/7 × 8,8 % = 3 190,63 €/an → 265,89 €/mois.

Les constantes de loi (5,5 %, 0,1 %/g, 4 %, 18 %, 6/7, table d'âge) vivent dans le module avec leur référence d'article. Les valeurs annuelles vivent dans les paramètres (§ 4).

### 3.2 Contribution personnelle

- `atnImposable = max(0, atnMensuel − contribution)`. En mode « je connais le montant », `atnMensuel` est le montant saisi, **avant** contribution, tel qu'il figure sur la ligne ATN d'une fiche.
- La contribution est retenue sur le net versé : `netVerse = net légal − retenue titres + télétravail + frais propres − contribution`, et `decalage` gagne `+ contribution`. `NetHorsLimites` reste exprimé en net versé.
- Quand la contribution dépasse l'ATN, elle est quand même retenue en entier sur le net : c'est ce que l'employeur prélève. Seul l'ATN imposable est plancher à 0.

### 3.3 Net → brut

La voiture ne dépend pas du brut : l'ATN est calculé une fois, puis `calculerBrut` cherche le brut avec un `Situation.atnMensuelCentimes` fixe. L'algorithme ne change pas. La valeur catalogue est bornée pour que l'ATN reste dans le domaine mesuré (§ 5.1, § 6).

---

## 4. Paramètres

`Parametres` gagne un bloc :

```ts
export interface ParametresVoiture {
  emissionReferenceEssenceGrammesKm: number
  emissionReferenceDieselGrammesKm: number
  atnMinimumAnnuelCentimes: number
}
```

| Période | Essence | Diesel | Minimum |
|---|---|---|---|
| `p2025` | 71 | 59 | 165 000 |
| `p2026-07` | 70 | 58 | 169 000 |
| `p2026-09` | 70 | 58 | 169 000 |

L'empreinte des paramètres change : `npm run verifier:recul` doit être relancé (§ 6).

---

## 5. Interface

### 5.1 Formulaire

Le champ ATN devient un bloc « Voiture de société / avantage de toute nature » :
- un choix **« Je connais le montant »** / **« Calculer depuis la voiture »**, par défaut le premier, à 0 € ;
- mode calcul : valeur catalogue, carburant (« Essence, LPG ou gaz naturel », « Diesel », « Électrique »), CO₂ (désactivé pour l'électrique), mois et année de première immatriculation ;
- dans les deux modes : contribution personnelle mensuelle, 0 par défaut ;
- en mode calcul, un aperçu sous le bloc : « ATN : 265,89 €/mois ».

| Champ | Accepté | Code d'erreur |
|---|---|---|
| Valeur catalogue | 0 < valeur ≤ 770 000,00 € | `valeurCatalogueInvalide` |
| CO₂ | entier de 0 à 500 g/km | `co2Invalide` |
| Première immatriculation | mois valide, pas après le mois calculé | `immatriculationInvalide` |
| Contribution | 0 à 10 000,00 € | `contributionInvalide` |

La borne de 770 000 € vient du plafond existant `ATN_MAX_CENTIMES` (10 000 €/mois) : dans le pire cas (18 %, coefficient d'âge 100 %), 770 000 × 6/7 × 18 % = 118 800 €/an, soit 9 900 €/mois. L'ATN calculé reste ainsi dans le domaine du mode manuel et de la mesure du recul.

### 5.2 Détail du calcul

- La ligne **ATN** affiche l'ATN imposable. En mode calcul, son explication montre le calcul chiffré (« 45 000,00 € × 94 % × 6/7 × 8,8 % = 3 190,63 €/an → 265,89 €/mois ») et, s'il y a lieu, le minimum appliqué et la contribution déduite. Sa source cite l'art. 36 § 2 CIR 92 et l'arrêté des émissions de référence.
- Une ligne **« Contribution personnelle voiture » (−)** rejoint le bloc du net versé quand elle est non nulle.

### 5.3 Récapitulatif

`effetSurArgentVerse` inclut `contribution > 0` : le libellé passe à « Net versé sur le compte » et le montant annuel vaut 12 × le mensuel affiché. Testé explicitement — c'est le défaut des frais propres relevé en revue finale de la V2.3.

### 5.4 Sauvegarde locale

La saisie passe en **v4**. Une saisie v1 à v3 est reprise en mode « je connais le montant », avec son ATN et une contribution à 0. Chaque champ absent reçoit sa valeur par défaut avant validation. Régression testée en passant par le vrai calcul, pas seulement par les gardes.

---

## 6. Garantie net → brut

- `verifier:recul` mesure le recul maximal à **trois niveaux d'ATN : 0, 300 et 1 000 €/mois**, et retient le maximum. L'artefact `reculMax.json` enregistre les niveaux mesurés ; le test de garde échoue s'ils manquent.
- Durée attendue : environ trois fois le passage actuel.
- Le recul doit rester sous la marge `MARGE_RECUL_CENTIMES = 1000`. Mesure de référence de la V2.3 : 514 c à ATN nul, 515 c en ponctuel jusqu'à 10 000 €/mois.
- Le README et le JSDoc de `calculerBrut` remplacent « mesuré à ATN nul » par la liste des niveaux mesurés.

---

## 7. Architecture (fichiers touchés)

| Fichier | Changement |
|---|---|
| `src/engine/atnVoiture.ts` (+ test) | nouveau module § 3.1 |
| `src/engine/parametres/types.ts`, `p2025.ts`, `p2026-07.ts`, `p2026-09.ts` | bloc `voiture` § 4 |
| `src/engine/remuneration.ts` | contribution dans le net versé et le décalage § 3.2 |
| `src/engine/validation.ts` | mode ATN, champs voiture, contribution, codes d'erreur § 5.1 |
| `src/hooks/useSaisie.ts` | saisie v4 et reprise § 5.4 |
| `src/components/FormulaireSituation.tsx` | bloc voiture § 5.1 |
| `src/components/DetailCalcul.tsx`, `Recapitulatif.tsx` | § 5.2, § 5.3 |
| `src/i18n/fr.ts` | tous les libellés, aides, erreurs et sources |
| `tools/reference/reference.py`, `references.json` | cas voiture indépendants ; `references.json` régénéré en LF |
| outil `verifier:recul`, `reculMax.json` | trois niveaux d'ATN § 6 |
| `README.md` | voiture, sources, statut du minimum 2026, portée de la mesure du recul |

---

## 8. Tests

- **Module** : bornes 4 % et 18 %, électrique, chaque frontière d'âge des deux côtés, minimum qui joue et qui ne joue pas, même voiture en 2025 et 2026, valeur catalogue maximale exacte, refus au-delà, exemple de contrôle du § 3.1.
- **Contribution** : réduit l'ATN ; le ramène à 0 sans négatif ; retenue en entier sur le net même au-delà de l'ATN.
- **Oracle Python** : une poignée de cas voiture (essence, diesel, électrique, minimum, voiture de plus de 60 mois).
- **Exemples publiés** : reproduits au centime quand leurs données sont complètes, `verifie: true` avec la source ; sinon, pas de cas inventé.
- **`calculerBrut`** : un cas oracle en mode voiture avec contribution.
- **Interface** : bascule des modes, aperçu, CO₂ désactivé pour l'électrique, ligne de contribution, libellé et annuel du récapitulatif, reprise d'une saisie v3.

---

## 9. Risques et points ouverts

1. **Minimum 2026 « sous réserve ».** Si le texte officiel reste introuvable, la valeur est marquée comme telle partout. Si elle change, un paramètre et un test bougent.
2. **Convention de comptage des mois.** Une erreur d'un mois décale d'un an le changement de coefficient. Elle est tranchée sur le texte, puis sur un exemple publié qui franchit une frontière s'il en existe un.
3. **Exemples publiés incomplets.** Beaucoup omettent la date d'immatriculation ou l'arrondi. On n'en tire un cas `verifie: true` que s'ils sont complets.
4. **Durée de `verifier:recul`.** Environ trois fois plus longue ; lancée une fois, en fin de plan.
5. **L'écart de précompte de la V2.3** reste ouvert et indépendant : la voiture ne le corrige ni ne l'aggrave.
