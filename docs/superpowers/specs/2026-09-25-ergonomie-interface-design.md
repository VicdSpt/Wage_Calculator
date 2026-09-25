# Salaire net Belgique — V2.7 : ergonomie de l'interface

- **Date :** 2026-09-25
- **Statut :** appliquée
- **Branche :** `feat/ergonomie-interface`
- **S'appuie sur :** [spec V1](2026-09-14-salaire-net-belgique-v1-design.md), [spec avantages](2026-09-16-avantages-extralegaux-design.md), [spec voiture](2026-09-22-voiture-societe-design.md), [spec primes annuelles](2026-09-23-primes-annuelles-design.md), [spec budget mobilité](2026-09-24-budget-mobilite-design.md)

---

## 1. Objectif

Rendre l'app plus agréable à utiliser sur ordinateur. L'utilisateur trouve que « tout est très vertical ». Relevé le 2026-09-25 sur une capture à 1 440 px :

- la page n'occupe qu'environ 1 000 px de large, avec de grandes marges vides ;
- le formulaire est une seule carte d'environ 1 500 px de haut, où six blocs s'empilent avec leurs textes d'aide ;
- un grand vide sépare le récapitulatif du détail du calcul, parce que la grille aligne ses lignes sur la hauteur du formulaire ;
- le résultat n'est pas fixé à l'écran : quand on descend remplir les primes, on ne voit plus l'effet de ce qu'on change ;
- les panneaux des primes et du budget mobilité s'ajoutent tout en bas, loin du reste des résultats.

Choix de l'utilisateur, 2026-09-25 :

- **ordinateur d'abord** : l'écran large est la cible ; le téléphone reste utilisable, sans être prioritaire ;
- **sections repliables avec résumé** (option C des maquettes), plutôt qu'un formulaire simplement compacté (A) ou découpé en onglets (B) ;
- **la mise en page seulement** : la palette, la typographie et le style actuels ne changent pas.

### Critères de réussite

1. Sur un écran de 1 440 px, le formulaire replié tient sans défilement, et le résultat reste visible pendant qu'on remplit une section ouverte.
2. Chaque section repliée résume son contenu sur une ligne, lisible sans l'ouvrir.
3. Une erreur de saisie n'est jamais cachée : la section qui la contient s'ouvre toute seule et son résumé la signale.
4. L'app reste utilisable entièrement au clavier et avec un lecteur d'écran.
5. **Le calcul ne change pas** : aucun fichier de `src/engine/` n'est modifié, et aucune valeur attendue d'un test existant ne bouge.

### Hors périmètre

- la palette, la typographie, les espacements généraux et le thème ;
- toute nouvelle fonctionnalité de calcul ;
- une mise en page spécifique au téléphone, au-delà de ce que les sections repliables apportent d'elles-mêmes ;
- la mémorisation de l'état ouvert ou fermé des sections, et de l'onglet choisi, entre deux visites.

---

## 2. Agencement

Sur ordinateur (à partir du point de rupture `lg` de Tailwind) :

- **La page s'élargit** : conteneur `max-w-7xl` au lieu de `max-w-5xl`, soit environ 1 280 px.
- **Grille de 12 colonnes** : 7 pour la saisie, 5 pour le résultat.
- **Le bandeau « Estimation… »** reste en haut de page, sur toute la largeur.

**Colonne de saisie, de haut en bas :**

1. **« Salaire et famille »**, toujours ouvert : sens du calcul, montant, état civil, enfants à charge, revenus du conjoint et parent isolé quand ils s'appliquent. Champs en deux colonnes. Ce bloc regroupe salaire et famille (la maquette C repliait la famille) : ce sont les champs qu'on change le plus souvent et qui pèsent le plus sur le résultat.
2. **« Voiture ou budget mobilité »**, repliable.
3. **« 13e mois et pécule de vacances »**, repliable.
4. **« Avantages extralégaux »**, repliable.

Dans une section ouverte, les champs voisins passent côte à côte : pourcentage et mois prestés du 13e mois ; budget annuel et part en cash ; valeur catalogue et carburant, émissions et première immatriculation ; ATN et contribution personnelle ; montants des avantages. Les textes d'aide restent visibles sous leur champ.

**Colonne de résultat, fixée à l'écran** (`sticky`), de haut en bas :

1. les **alertes qui dépendent de la saisie** : salaire sous le minimum légal, plafonds d'avantages dépassés, budget mobilité hors bornes, période non couverte, saisie invalide ;
2. le **récapitulatif**, inchangé ;
3. les **onglets de résultats** : « Détail du calcul », « 13e mois et pécule », « Budget mobilité ».

Si la colonne devient plus haute que l'écran, elle défile elle-même.

Sur téléphone (sous `lg`) : une seule colonne, rien de fixé. L'ordre actuel est gardé : le résultat d'abord, puis la saisie.

---

## 3. Comportement

### 3.1 Sections repliables

- **Le titre est un bouton** avec `aria-expanded` et `aria-controls`, sur le modèle de `InfoBulle`. Entrée et Espace l'activent.
- **Une section fermée retire ses champs de la page** (rendu conditionnel), au lieu de les masquer. La saisie n'est pas perdue : elle vit dans `useSaisie`, au-dessus du formulaire.
- **Au chargement, les trois sections repliables sont fermées.** L'état n'est pas mémorisé.
- **Une section qui contient une erreur est ouverte d'office**, et le reste tant que l'erreur n'est pas corrigée ; son résumé devient « ⚠ à corriger ». L'ouverture effective vaut donc « ouverte par l'utilisateur, ou contient une erreur ».
- **Le résumé se calcule à partir de la saisie** (les textes tapés), jamais du résultat : il s'affiche aussi quand la saisie est invalide. Il est visible que la section soit ouverte ou fermée.

### 3.2 Contenu des résumés

| Section | Cas | Résumé |
|---|---|---|
| Voiture ou budget mobilité | choix « aucun » | Aucun |
| | voiture, mode montant | Voiture de société · ATN {montant}/mois |
| | voiture, mode calcul | Voiture de société · {valeur catalogue} catalogue |
| | budget mobilité | Budget mobilité · {part en cash}/an en cash |
| 13e mois et pécule | aucune prime cochée | Aucune prime |
| | 13e mois seul | 13e mois {pourcentage} % |
| | pécule seul | Double pécule |
| | les deux | 13e mois {pourcentage} % · double pécule |
| Avantages extralégaux | aucun coché | Aucun |
| | un ou plusieurs | leurs noms, séparés par des virgules, dans l'ordre du formulaire |

Les montants du résumé sont ceux que l'utilisateur a tapés, suivis de « € » ; ils ne sont pas recalculés. Tous les textes passent par `src/i18n/fr.ts`.

### 3.3 Onglets de résultats

- **Motif ARIA des onglets** : `role="tablist"`, `role="tab"` avec `aria-selected` et `aria-controls`, `role="tabpanel"` étiqueté par son onglet ; tabulation mobile (seul l'onglet actif est dans l'ordre de tabulation) ; flèches gauche et droite pour passer d'un onglet à l'autre, Début et Fin pour le premier et le dernier.
- **« Détail du calcul » est toujours présent.** La présence des deux autres onglets suit la saisie, pas le résultat du calcul : « 13e mois et pécule » n'apparaît que si une prime est cochée ; « Budget mobilité », que si ce choix est fait. Ainsi, une saisie momentanément invalide (un champ vidé le temps d'être corrigé) ne fait pas disparaître l'onglet choisi.
- **Si l'onglet actif disparaît** (parce que la saisie qui le justifiait a changé), l'onglet actif redevient « Détail du calcul ».
- **Chaque panneau garde son titre et sa région actuels** (`Détail du calcul`, `13e mois et pécule de vacances`, `Budget mobilité`) : seul change le fait qu'il faut choisir son onglet pour le voir. Quand l'onglet est présent mais que le calcul n'aboutit pas encore, le panneau montre un tiret (`—`), comme le fait déjà « Détail du calcul ».

---

## 4. Architecture

- **Découper `src/components/FormulaireSituation.tsx`** (558 lignes) en quatre composants, un par bloc de l'écran, dans `src/components/formulaire/` : `SectionSalaireFamille`, `SectionMobilite`, `SectionPrimes`, `SectionAvantages`. Les petits composants de champ qu'ils partagent (`ChampAvantage`, le composant d'erreur, les aides) vont dans un fichier commun du même dossier. `FormulaireSituation` ne fait plus que les assembler, et garde son interface actuelle vis-à-vis de `App`.
- **Créer `src/components/SectionRepliable.tsx`** : titre-bouton, résumé, contenu rendu seulement si ouvert, ouverture forcée par une propriété.
- **Créer `src/components/OngletsResultats.tsx`** : liste d'onglets variable, gestion du clavier, retour au détail quand l'onglet actif disparaît.
- **Créer `src/components/formulaire/resumes.ts`** : fonctions pures qui transforment la saisie en ligne de résumé, et qui disent quelles sections contiennent une erreur (d'après les clés de `ErreursSaisie`).
- **Modifier `src/App.tsx`** : nouvelle grille, colonne de résultat fixée, onglets.
- **Couper `src/components/Avertissements.tsx` en deux** : le bandeau d'estimation, en haut de page ; les alertes dépendant de la saisie, dans la colonne de résultat.
- **Modifier `src/i18n/fr.ts`** : textes des résumés, « à corriger », libellés des onglets.
- **Aucun fichier de `src/engine/` ni de `src/hooks/` ne change.**

---

## 5. Tests

- **Résumés** : un test par ligne du tableau du § 3.2, et la correspondance erreur → section pour chaque clé de `ErreursSaisie`.
- **`SectionRepliable`** : ouverture et fermeture au clic et au clavier, `aria-expanded` à jour, ouverture forcée quand une erreur est présente.
- **`OngletsResultats`** : navigation au clavier (flèches, Début, Fin), apparition et disparition des onglets, retour au détail.
- **Tests d'interface existants** (`src/App.test.tsx`) : ils gagnent les étapes d'interaction qu'une personne ferait (ouvrir une section avant de remplir un champ, choisir un onglet avant de lire un panneau), au moyen de deux fonctions d'aide. **Aucune valeur attendue ni aucune affirmation n'est retirée ou affaiblie.**
- **Vérification visuelle** : la colonne fixée ne se teste pas dans jsdom, qui ne calcule pas la mise en page. Elle est vérifiée par des captures réelles en fin de chantier, à 1 440 px et à 390 px de large.

---

## 6. Risques

1. **`src/App.test.tsx` est le point dur** : il compte une centaine d'interrogations de champs et de zones, qui vont presque toutes gagner une étape d'interaction. Le risque est qu'un test soit affaibli au passage. Parade : les relectures comparent chaque test avant et après, et le nombre d'affirmations ne doit pas baisser.
2. **Découper `FormulaireSituation.tsx`** déplace beaucoup de code sans changer son comportement : ce découpage doit être une tâche à part, qui ne touche à aucun comportement, pour que son diff se relise comme un déplacement.
3. **Une erreur dans une section fermée** serait le pire défaut de cette refonte : le calcul refuserait de s'afficher sans qu'on voie pourquoi. D'où l'ouverture forcée (§ 3.1) et ses tests.
4. **La colonne fixée peut masquer du contenu** sur un écran peu haut : d'où son propre défilement quand elle dépasse la hauteur de l'écran.
