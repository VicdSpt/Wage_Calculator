# Salaire net Belgique — V2.8 : la vue annuelle

- **Date :** 2026-09-28
- **Statut :** en cours de rédaction
- **Branche :** `feat/vue-annuelle`
- **S'appuie sur :** [spec primes annuelles](2026-09-23-primes-annuelles-design.md), [spec budget mobilité](2026-09-24-budget-mobilite-design.md), [spec ergonomie](2026-09-25-ergonomie-interface-design.md)

---

## 1. Objectif

Permettre à une personne qui lit une offre d'emploi exprimée par an (« 52 000 € brut/an ») de la taper telle quelle, et de voir ce qu'elle touchera par mois et sur l'année.

En Belgique, le « salaire annuel brut » d'une offre compte presque toujours **12 mois, le 13e mois et le double pécule de vacances**, soit le brut mensuel × 13,92 avec les réglages courants. Un simple × 12 surestimerait le brut mensuel, donc le net, d'environ 16 %.

Choix de l'utilisateur, 2026-09-28 :

- **seul le brut se saisit en annuel** : les offres sont exprimées en brut. Le net → brut reste en mensuel ;
- **le brut annuel suit les réglages des primes** : 12 mois, plus le 13e mois tel que réglé, plus le double pécule tel que réglé ; × 13,92 avec les réglages par défaut. Le facteur utilisé est affiché ;
- le net annuel affiché devient un **net annuel tout compris**.

Contexte : le coût employeur, qui était la suite prévue, a été mis en réserve ce même jour — le public visé est la personne qui cherche un emploi.

### Critères de réussite

1. Taper un brut annuel donne exactement le même net que taper le brut mensuel retenu pour lui.
2. Le brut annuel recalculé depuis le brut mensuel retenu est le plus proche possible de l'annuel tapé ; l'écart, s'il existe, ne dépasse pas quelques centimes et il est affiché.
3. Le brut annuel affiché est exactement la somme de 12 bruts mensuels et des bruts des primes affichés dans l'onglet des primes.
4. Une saisie enregistrée par une version antérieure se recharge en saisie mensuelle, sans rien changer à son résultat.
5. **Le calcul du net ne change pas** : aucune fonction de calcul du salaire n'est modifiée, et aucune valeur attendue d'un test existant ne bouge — hormis les libellés et montants de la ligne annuelle du récapitulatif, que ce sous-projet remplace délibérément.

### Hors périmètre

- la saisie du **net annuel** (« je veux 36 000 € net par an ») : le calcul inverse devrait tenir compte du précompte propre aux primes ;
- une **année incomplète** traitée autrement que par les mois prestés déjà réglables dans les primes ;
- le **simple pécule**, payé avec le salaire comme de la rémunération ordinaire : il est déjà dans les 12 mois ;
- les avantages non versés en argent (titres-repas, écochèques) dans le net annuel : ils restent affichés à part.

---

## 2. Conversion

### 2.1 Du mensuel à l'annuel

```
brutAnnuel(M) = 12 × M + brut13e(M) + brutPecule(M)
```

`brut13e` et `brutPecule` sont **exactement** les montants bruts que calcule déjà `src/engine/primesAnnuelles.ts` pour les primes cochées (pourcentage du 13e mois, mois prestés, 92 % du double pécule), avec leurs arrondis ; une prime non cochée compte pour 0. Aucune seconde formule n'est écrite : la fonction qui calcule le brut d'une prime est exportée et réutilisée.

Le **facteur affiché** vaut, en dix-millièmes, `12 × 10 000 + pourcentage13e × mois13e / 12 + 9 200 × moisPecule / 12` pour les primes cochées : 139 200 (« × 13,92 ») par défaut, 129 200 sans 13e mois, 120 000 sans prime. Il sert à l'affichage ; le calcul passe par `brutAnnuel(M)`.

### 2.2 De l'annuel au mensuel

Un brut mensuel est un nombre entier de centimes, et `brutAnnuel` avance d'environ 14 centimes par centime mensuel : un annuel tapé n'a pas toujours d'antécédent exact. On retient le **brut mensuel M dont `brutAnnuel(M)` est le plus proche de l'annuel tapé** ; à égalité, le plus petit. `brutAnnuel` est croissante : une recherche par dichotomie suivie de l'examen des deux voisins suffit.

### 2.3 Limites

Les bornes actuelles du brut (strictement positif, au plus 100 000 € par mois) s'appliquent au **brut mensuel retenu**, avec les codes d'erreur actuels. La conversion a besoin des réglages des primes validés ; si les primes sont en erreur, la saisie est déjà invalide et le montant n'est pas converti.

### 2.4 Net annuel tout compris

```
netAnnuelToutCompris = 12 × netVersé + net13e + netPecule
```

`netVersé` est le net versé mensuel actuel (net légal, avantages et pilier 3 du budget mobilité compris). `net13e` et `netPecule` sont les nets des primes cochées, tels que les calcule la V2.5 ; une prime non cochée compte pour 0. Les titres-repas et les écochèques n'y entrent pas.

---

## 3. Saisie et sauvegarde

- `SaisieFormulaire` gagne `periode: 'mensuel' | 'annuel'`, `'mensuel'` par défaut.
- La période ne s'applique qu'en **brut → net**. En net → brut, le champ du montant reste mensuel et la période est ignorée.
- La validation transforme un montant annuel en brut mensuel (§ 2.2) après avoir validé les primes ; le reste de la validation et le calcul ne voient qu'un brut mensuel.
- **Basculer la période convertit le montant tapé** (§ 2.1 ou § 2.2), comme la bascule brut ↔ net reprend le résultat affiché. Si la saisie est invalide à ce moment-là, le montant est laissé tel quel.
- La sauvegarde passe en **v7**. Une saisie v6 ou antérieure, sans `periode`, se reprend en `'mensuel'` ; les clés anciennes ne sont jamais réécrites.

---

## 4. Affichage

### 4.1 Formulaire

Dans le bloc « Salaire et famille », le champ du brut gagne un sélecteur **« par mois / par an »**, sur le modèle du sélecteur du sens du calcul, visible en brut → net seulement.

Sous le champ, une ligne donne l'équivalent dans l'autre période et le facteur :

- saisie mensuelle : « soit 41 760,00 € brut par an (× 13,92 : 12 mois, 13e mois, double pécule) » ;
- saisie annuelle : « soit 3 735,63 € brut par mois (× 13,92 : 12 mois, 13e mois, double pécule) », suivie, si l'annuel recalculé diffère de l'annuel tapé, de « annuel recalculé : 51 999,97 € ».

Exemple de référence, avec les réglages par défaut : 52 000,00 € tapés par an. Pour M = 373 563 centimes, `brutAnnuel(M)` = 12 × 373 563 + 373 563 (13e mois à 100 %) + 343 678 (92 %, arrondi) = 5 199 997 centimes, à 3 centimes de l'annuel tapé ; pour M = 373 564, il vaut 5 200 011, à 11 centimes. Le brut mensuel retenu est donc 3 735,63 €, et l'annuel recalculé 51 999,97 €. À l'inverse, 41 760,00 € tapés redonnent exactement 3 000,00 € par mois, sans écart.

La parenthèse suit les primes cochées : « 12 mois », « 12 mois, 13e mois », « 12 mois, double pécule » ou « 12 mois, 13e mois, double pécule ». La ligne n'apparaît que si la saisie est valide.

### 4.2 Récapitulatif

- La ligne « Net annuel (× 12) — hors 13e mois et pécule de vacances » devient **« Net annuel tout compris »** (§ 2.4), avec sa composition en petit (« 12 mois, 13e mois et double pécule, nets », selon les primes cochées).
- En **net → brut**, la ligne « Brut annuel (× 12) » devient **« Brut annuel »**, calculé au sens belge (§ 2.1), avec le facteur en petit ; le net annuel tout compris y est aussi affiché.
- Le montant mis en avant (net mensuel ou net versé), le taux de retour (mensuel), les titres-repas et les écochèques ne changent pas.

---

## 5. Architecture

- **Créer `src/engine/annuel.ts`** : `brutAnnuelDepuisMensuel`, `brutMensuelDepuisAnnuel`, `facteurAnnuelDixMilliemes`, `netAnnuelToutCompris`. Fonctions pures, centimes entiers.
- **Modifier `src/engine/primesAnnuelles.ts`** : exporter la fonction qui calcule le brut d'une prime, sans en changer le comportement.
- **Modifier `src/engine/validation.ts`** : le champ `periode`, la conversion de l'annuel en mensuel.
- **Modifier `src/hooks/useSaisie.ts`** : la sauvegarde v7, la reprise, la bascule de période.
- **Modifier `src/hooks/useCalcul.ts`** s'il faut exposer au récapitulatif le brut annuel et le net annuel tout compris.
- **Modifier `src/components/formulaire/SectionSalaireFamille.tsx`**, **`src/components/Recapitulatif.tsx`**, **`src/i18n/fr.ts`**.
- **Aucune fonction de calcul du salaire ne change** (`calculerNet`, `calculerBrut`, `remuneration.ts`, `primesAnnuelles.ts` hormis l'export) ; `npm run verifier:recul` n'a pas à être relancé.

---

## 6. Tests

- **`annuel.ts`** : le facteur pour chacune des quatre combinaisons de primes ; `brutAnnuelDepuisMensuel` au centime sur des exemples chiffrés, dont un pourcentage de 13e mois différent de 100 % et des mois prestés partiels ; l'aller-retour `brutMensuelDepuisAnnuel(brutAnnuelDepuisMensuel(M)) = M` sur une plage de salaires ; le mensuel retenu est le plus proche de l'annuel tapé, et le plus petit à égalité ; `netAnnuelToutCompris` avec et sans primes.
- **Validation** : un montant annuel donne le brut mensuel attendu ; les bornes s'appliquent au mensuel ; la période est ignorée en net → brut.
- **Sauvegarde** : chaque maillon de la reprise, dont une saisie v6 reprise en mensuel.
- **Interface** : taper 41 760 € par an donne exactement le même net que 3 000 € par mois ; la bascule convertit le montant dans les deux sens ; la ligne d'équivalence et le facteur suivent les primes cochées ; le net annuel tout compris vaut 12 × le net versé plus les nets des primes, recalculé dans le test par le moteur ; le net → brut affiche le brut annuel belge.
- Pas d'oracle Python : ce sous-projet n'introduit aucune règle légale, seulement de l'arithmétique sur des calculs déjà vérifiés.

---

## 7. Risques

1. **Le mot « annuel » change de sens** dans le récapitulatif : il signifiait × 12, il signifie maintenant « tout compris ». Des tests existants affirment l'ancien libellé et l'ancien montant ; ce sont les seules valeurs attendues autorisées à changer, et chacun doit être listé et justifié.
2. **Arrondi** : un annuel tapé n'a pas toujours d'antécédent exact (§ 2.2). L'écart est affiché plutôt que caché.
3. **Ordre des validations** : la conversion dépend des primes. Si les primes changent, le brut mensuel retenu pour un même annuel change aussi — c'est voulu (l'annuel suit les primes), et l'interface le montre par la ligne d'équivalence.
