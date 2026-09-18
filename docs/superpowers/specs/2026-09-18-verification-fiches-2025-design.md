# Salaire net Belgique — V2.3 : vérification par de vraies fiches de paie

- **Date :** 2026-09-18
- **Statut :** en relecture
- **Branche :** `feat/verification-fiches-2025`
- **S'appuie sur :** [spec V1](2026-09-14-salaire-net-belgique-v1-design.md), [spec net → brut](2026-09-15-net-vers-brut-design.md), [spec avantages](2026-09-16-avantages-extralegaux-design.md)

---

## 1. Objectif

Confronter le moteur à **deux fiches de paie réelles** (juillet et septembre 2025, employé isolé sans personne à charge, secrétariat social SD Worx) et reproduire chaque ligne au centime.

C'est le point 1 des limites de la V1 : jusqu'ici, aucun des 74 cas de référence n'avait été confronté à un document réel. Ils étaient tous calculés par un script indépendant, ce qui écarte les erreurs de code mais pas les erreurs de lecture des textes officiels.

Pour y arriver, il faut trois choses :
1. une **période de paramètres 2025** ;
2. l'**avantage de toute nature** (voiture de société), en montant donné, parce qu'il entre dans la base imposable ;
3. les **frais propres à l'employeur**, parce qu'ils s'ajoutent au net versé.

### Critères de réussite
1. Les deux fiches sont reproduites **au centime**, ligne par ligne : ONSS, bonus à l'emploi, imposable, précompte, bonus fiscaux, cotisation spéciale, part personnelle des chèques-repas, net versé.
2. Les 74 cas de référence existants restent **identiques** quand l'ATN vaut zéro.
3. Aucune donnée personnelle n'entre dans le dépôt.
4. Les deux nouveaux cas portent `verifie: true` : ce sont les premiers du projet.

### La règle d'or
**On n'ajuste jamais un paramètre pour faire coller un résultat.** Les valeurs viennent du texte officiel ; la fiche est le juge. Si un écart persiste avec les valeurs officielles, on s'arrête, on documente le désaccord au § 8 et on le signale : ce serait la découverte la plus utile du projet, puisqu'elle pointerait une règle qui manque au moteur.

### Hors périmètre
- La **formule CO₂** de l'avantage voiture (valeur catalogue, émissions, carburant, âge, intervention personnelle) : c'est la V2.2b. Ici, le montant est donné.
- Le **choix d'une date passée dans l'interface** : la période 2025 sert aux cas de référence, l'app continue de calculer à la date du jour.
- Les périodes de janvier à juin 2026, toujours absentes.
- Les ouvriers, le temps partiel, les prestations incomplètes. Les deux fiches portent un mois complet d'un employé à temps plein.

---

## 2. Sources officielles

| Code | Document | Utilisé pour | Statut |
|---|---|---|---|
| **ONSS-BE-2025/3** | ONSS, Instructions administratives 2025/3, *Bonus à l'emploi* — https://www.socialsecurity.be/employer/instructions/dmfa/fr/2025-3/instructions/deductions/workers_reductions/workbonus.html | volets A et B, à partir du 01/02/2025 | ✅ relevé le 18/09/2026, **confirmé par les deux fiches** |
| **ONSS-CSSS-2025** | ONSS, Instructions administratives 2025, *Cotisation spéciale pour la sécurité sociale* | tranches de la cotisation spéciale | ⚠️ à confirmer sur la page 2025 ; la valeur 16,30 € des fiches correspond déjà aux tranches 2026 |
| **SPF-FC-2025** | SPF Finances, *Formule-clé pour le calcul du précompte professionnel sur les rémunérations payées à partir du 1er janvier 2025* | barème, quotité exemptée, frais forfaitaires, bonus fiscal | ❌ **à extraire du PDF officiel** (voir § 8, risque n° 1) |
| **ONSS-TR-2025** | ONSS, Instructions administratives 2025, *Titres-repas* | part minimale du travailleur | ✅ 1,09 € confirmé par les fiches (19 × 1,09 et 22 × 1,09) |

Valeurs déjà établies pour 2025 (ONSS-BE-2025/3, à partir du 01/02/2025, colonne employés) :

| Volet | Plancher | Maximum R | Coefficient | Plafond |
|---|---|---|---|---|
| A | 2 777,83 € | 120,59 € | 0,2443 | 3 271,48 € |
| B | 2 175,25 € | 162,62 € | 0,2699 | 2 777,83 € |

Vérification immédiate sur un brut de 2 732,94 € : volet A = 120,59 € (sous le plancher) et volet B = 162,62 − 0,2699 × 557,69 = **12,10 €**. Ce sont exactement les montants des deux fiches.

⚠️ **Le barème fiscal 2025 reste ouvert.** Des sources secondaires donnent des tranches de 16 310 / 28 790 / 49 820 €, une quotité exemptée de 10 900 € et des frais forfaitaires plafonnés à 5 930 €. Avec ces valeurs, le précompte calculé vaut 516,61 € contre **498,76 €** sur la fiche de juillet. L'écart de 17,85 €/mois est trop grand pour un arrondi : il faut le document officiel.

---

## 3. Moteur

### 3.1 Avantage de toute nature

`Situation` reçoit un champ :

```ts
export interface Situation {
  brutMensuelCentimes: number
  /** Avantage de toute nature mensuel (voiture de société), montant déjà calculé. 0 si aucun. */
  atnMensuelCentimes: number
  etatCivil: EtatCivil
  revenusConjoint: RevenusConjoint | null
  enfantsACharge: number
  parentIsole: boolean
}
```

`calculerNet` change en **un seul point** :
- **étape 3 bis** : `imposablePrecompte = imposableMensuel + atn` — c'est cette base qui part vers le précompte (étape 4 et suivantes).

L'étape 12 ne change pas : `net = brut − onssNet − precompte − cotisationSpeciale`. **L'ATN ne se retire pas du net**, parce qu'il n'y a jamais été ajouté : le brut ne le contient pas. Les fiches de paie affichent « + 261,45 » puis « − 261,45 » parce qu'elles déroulent la base imposable ; les deux lignes s'annulent. L'avantage ne coûte donc que l'impôt qu'il fait naître.

Vérification sur la fiche de juillet : 273 294 − 35 720 + 13 269 − 49 876 + 4 632 − 1 630 − 2 071 + 10 084 = **211 982**, le net versé, sans soustraire l'ATN.

L'ONSS, le bonus à l'emploi et la cotisation spéciale continuent de porter sur le **brut seul** : l'avantage voiture n'est pas soumis à l'ONSS du travailleur (l'employeur paie une cotisation de solidarité, hors périmètre).

`Intermediaires` reçoit `atn` et `imposablePrecompte`. Le détail affiché gagne deux lignes, uniquement quand l'ATN n'est pas nul : « Avantage de toute nature » en `+` avant le précompte, et « Avantage de toute nature (retenu) » en `−` après. C'est la présentation des fiches SD Worx.

**Conséquences à assumer :**
- `calculerNet` change pour la première fois depuis la V1. Les 74 cas de référence doivent rester **identiques** avec `atnMensuelCentimes: 0`, ce que le script Python garantit en écrivant ce champ à 0.
- L'empreinte des paramètres change (nouvelle période), donc `npm run verifier:recul` doit être relancé. Le recul mesuré ne doit pas bouger pour les périodes 2026.
- `SITUATIONS_FAMILIALES` ne change pas : l'ATN n'est pas une dimension familiale, et l'outil de recul continue de mesurer à ATN nul, ce qui reste le cas d'usage de `calculerBrut`.

### 3.2 Net → brut avec un ATN

L'ATN fait partie de la situation, comme les enfants : la recherche par dichotomie de `calculerBrut` fonctionne sans changement. La seule différence est que le net ne décale plus d'une constante — il n'y a rien à adapter, puisque `calculerBrut` cherche déjà le plus petit brut dont le net atteint la cible.

### 3.3 Frais propres à l'employeur

`Avantages` reçoit :

```ts
fraisPropresEmployeur: { actif: boolean; montantMensuelCentimes: number }
```

`ResultatAvantages` reçoit `fraisPropresCentimes`, et le net versé devient :

`netVerse = net légal − retenue titres + télétravail + frais propres`

Pas de plafond ONSS : ce sont des frais réels justifiés, dont le montant dépend de la fonction. Donc **aucune alerte** pour ce champ.

---

## 4. Paramètres 2025

Nouvelle période `P2025`, valable du **01/02/2025 au 31/12/2025**. Le bonus à l'emploi a changé au 1er février 2025 ; les fiches de juillet et de septembre tombent bien dans cet intervalle.

| Bloc | Source | Valeur |
|---|---|---|
| `onssTauxPersonnelDixMilliemes` | inchangé | 1307 |
| `bonusEmploi.voletA` | ONSS-BE-2025/3 | max 12 059, plancher 277 783, plafond 327 148, coef 2443 |
| `bonusEmploi.voletB` | ONSS-BE-2025/3 | max 16 262, plancher 217 525, plafond 277 783, coef 2699 |
| `precompte` | SPF-FC-2025 | **à renseigner depuis le document officiel** |
| `cotisationSpeciale` | ONSS-CSSS-2025 | à confirmer ; identique à 2026 d'après les fiches |
| `avantages` | ONSS 2025 | part travailleur minimale 109 ; les autres plafonds ne servent pas aux fiches et reprennent les valeurs 2026, avec un commentaire disant qu'ils ne sont pas vérifiés |
| `rmmmgCentimes` | Securex 2025 | à relever ; ne sert qu'à l'alerte |

**Périodes non contiguës.** Il y aura un trou entre le 31/12/2025 et le 01/07/2026. Le test « périodes contiguës » devient :
- les périodes ne se chevauchent pas ;
- elles sont triées par date de début ;
- `getParametres` lève `PeriodeNonCouverte` dans le trou, ce qu'un test vérifie explicitement pour le 15/03/2026.

---

## 5. Cas de référence issus des fiches

Nouveau fichier **`src/engine/__tests__/fichesReelles.json`**, écrit à la main (le script Python reste réservé aux 74 cas calculés depuis les textes).

**Aucune donnée personnelle** : ni nom, ni adresse, ni NISS, ni IBAN, ni employeur. Le champ `source` dit « fiche de paie d'un secrétariat social, période 07/2025, anonymisée ».

```ts
interface CasFicheReelle {
  id: string                    // 'fiche-2025-07'
  date: string                  // '2025-07-25' (date de valeur)
  situation: Situation          // brut 273 294, atn 27 017, isolé, 0 enfant
  avantages: Avantages          // titres 19 × 1,09 ; frais propres 10 084 ; reste inactif
  attendu: {
    onss: number                // 35 720
    bonusVoletA: number         // 12 059
    bonusVoletB: number         // 1 210
    imposableMensuel: number    // 250 843
    precompteAvantBonus: number // 49 876
    bonusFiscal: number         // 4 632
    cotisationSpeciale: number  // 1 630
    retenueTitres: number       // 2 071
    netVerse: number            // 211 982
  }
  source: string
  verifie: true
}
```

**Attention à la présentation des fiches** : elles affichent le précompte **avant bonus** (498,76 €) puis les bonus fiscaux séparément (39,96 € et 6,36 €). Notre moteur expose `precompteAvantBonus`, `bonusFiscal` et `precompte` (net des deux). La correspondance est donc `precompteAvantBonus = 49 876` et `bonusFiscal = 4 632`, et le test compare ces deux valeurs, pas seulement leur différence.

| Ligne | Juillet 2025 | Septembre 2025 |
|---|---|---|
| Brut | 2 732,94 € | 2 732,94 € |
| ONSS | 357,20 € | 357,20 € |
| Bonus volet A / volet B | 120,59 € / 12,10 € | 120,59 € / 12,10 € |
| Imposable | 2 508,43 € | 2 508,43 € |
| ATN voiture | 270,17 € | 261,45 € |
| Précompte avant bonus | 498,76 € | 495,03 € |
| Bonus fiscal (A + B) | 46,32 € | 46,32 € |
| Cotisation spéciale | 16,30 € | 16,30 € |
| Chèques-repas (part perso) | 19 × 1,09 = 20,71 € | 22 × 1,09 = 23,98 € |
| Frais propres à l'employeur | 100,84 € | 116,77 € |
| **Net versé** | **2 119,82 €** | **2 136,21 €** |

Le test additionne aussi les lignes pour retrouver le net versé, comme le fait la fiche.

---

## 6. Architecture (fichiers touchés)

```
src/engine/
  types.ts                        + atnMensuelCentimes dans Situation, + atn et imposablePrecompte dans Intermediaires, + 2 IdLigne
  calculerNet.ts                  base du précompte + ATN, net − ATN, 2 lignes de détail
  avantages.ts                    + fraisPropresEmployeur
  remuneration.ts                 net versé + frais propres
  validation.ts                   champs ATN et frais propres
  parametres/p2025.ts             NOUVEAU — période 01/02/2025 → 31/12/2025
  parametres/index.ts             + P2025 dans PERIODES
  parametres/parametres.test.ts   chevauchement au lieu de contiguïté, trou de 2026
  __tests__/fichesReelles.json    NOUVEAU — les deux cas vérifiés
  __tests__/fichesReelles.test.ts NOUVEAU
  __tests__/reculMax.json         REGÉNÉRÉ
tools/reference/reference.py      écrit atnMensuelCentimes: 0 dans les 74 cas
src/hooks/, src/components/, src/i18n/fr.ts   champs ATN et frais propres, lignes de détail
README.md
```

---

## 7. Tests

- **Les deux fiches**, ligne par ligne, au centime (§ 5). Ce sont les premiers cas `verifie: true`.
- **Non-régression** : les 74 cas de référence donnent exactement les mêmes valeurs qu'aujourd'hui, avec `atnMensuelCentimes: 0`.
- **ATN** : un ATN nul ne change rien ; un ATN non nul augmente la base du précompte et diminue le net du même montant ; la somme signée des lignes redonne le net.
- **Frais propres** : ils s'ajoutent au net versé, ne déclenchent aucune alerte, et ne touchent ni l'impôt ni l'ONSS.
- **Période 2025** : bornes (31/01/2025 non couvert, 01/02/2025 couvert, 31/12/2025 couvert), trou du 15/03/2026 non couvert, absence de chevauchement.
- **Recul** : `npm run verifier:recul` relancé ; la valeur des périodes 2026 reste 514 centimes ; la période 2025 reçoit sa propre mesure, qui doit rester sous la marge de 1 000.
- **Interface** : le champ ATN et le champ frais propres, leurs erreurs de saisie, et les deux lignes de détail quand l'ATN n'est pas nul.

---

## 8. Risques et points ouverts

1. **La formule-clé 2025 n'est pas encore en main.** C'est le seul vrai risque du projet. Parade : chercher le PDF officiel du SPF (arrêté royal de décembre 2024, publié au Moniteur) ou son annexe. Si les valeurs officielles ne reproduisent pas 498,76 €, **on ne touche à rien** : on documente l'écart, on revérifie d'abord notre lecture (base du précompte, plafond des frais, arrondis), et on le signale comme point ouvert.
2. **Le nombre de chèques-repas ne suit pas « un titre par jour presté »** : la fiche de juillet donne 19 titres pour 19 jours travaillés, celle de septembre 22 titres pour 21 jours travaillés plus un jour de congé. Notre champ reste une saisie libre, ce qui absorbe ces règles sectorielles. À mentionner dans les limites du README.
3. **La cotisation spéciale 2025 est supposée identique à 2026** sur la foi des deux fiches. Parade : confirmer sur la page ONSS 2025 avant de figer la période.
4. **`calculerNet` change** pour la première fois depuis la V1. Parade : la non-régression des 74 cas est un test bloquant, et l'outil de recul est relancé.
5. **Deux fiches, un seul profil** : isolé, sans enfant, même brut. Elles ne valident ni le quotient conjugal, ni les réductions pour enfants, ni les bas salaires. D'autres fiches restent bienvenues.
