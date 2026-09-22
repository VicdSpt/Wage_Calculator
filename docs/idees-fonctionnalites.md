# Ce qu'on pourrait ajouter

Inventaire dressé le 2026-09-22, à partir d'une comparaison avec
[belgian-wage-calculator.vercel.app](https://belgian-wage-calculator.vercel.app/fr) (calculateur gratuit,
sans sources citées, mis à jour le 04/08/2026) et des limites de notre V1.

Rien ici n'est décidé. La colonne « chez lui » dit si le site comparé le propose ; « effort » est une
estimation pour nous, avec notre exigence : chaque valeur cite sa source officielle, et chaque calcul
est reproduit par un script indépendant.

## Ce qu'on a déjà

Brut → net et net → brut ; ONSS et bonus à l'emploi (volets A et B) ; précompte professionnel avec
barème progressif, quotité exemptée et réductions familiales ; bonus fiscal ; cotisation spéciale de
sécurité sociale ; titres-repas, indemnité de télétravail, écochèques, frais propres à l'employeur ;
avantage de toute nature d'une voiture de société, saisi ou calculé (art. 36 § 2 CIR 92), avec la
contribution personnelle. Trois périodes de paramètres : 2025, juillet 2026, septembre 2026.

## 1. Montants annuels et périodiques

| Fonction | Ce que ça fait | Chez lui | Effort |
|---|---|---|---|
| 13e mois / prime de fin d'année | Précompte au barème des allocations exceptionnelles, distinct du mensuel ; paramètre CCT en % | oui | gros (le barème) |
| Double pécule de vacances | 92 % du brut, cotisation ONSS spéciale de 13,07 %, même barème exceptionnel | oui | petit une fois le barème fait |
| Simple pécule | Le pécule « normal », payé avec le salaire de mai ou juin | oui | petit |
| Décompte fiscal de fin d'année | Estime le solde d'impôt à payer ou à récupérer | oui | gros (c'est l'IPP, pas le précompte) |
| Mois travaillés partiels | Entrée ou sortie en cours d'année, prorata | oui | moyen |
| Bonus CCT 90 | Bonus collectif, régime social et fiscal propre | oui | moyen |
| Participation bénéficiaire | Prime sur les bénéfices, taxation distincte | oui | moyen |

Le barème des allocations exceptionnelles débloque à lui seul les quatre premières lignes.

## 2. Voiture et mobilité

Règle clé : le budget mobilité **remplace** la voiture de société (on l'obtient en échange de la voiture
ou du droit à en avoir une), mais son **pilier 1 est une voiture**, qui doit être zéro émission depuis le
1er janvier 2026. Notre calcul d'ATN sert donc au pilier 1. Piliers 1 et 2 exonérés d'impôt et d'ONSS ;
pilier 3 (solde en cash) diminué d'une cotisation spéciale du travailleur de 38,07 %, sans impôt.
Budget annuel encadré : 3 233 € à 17 244 € en 2026.

| Fonction | Chez lui | Effort |
|---|---|---|
| Budget mobilité, pilier 2 (transports durables, frais de logement) | oui | moyen |
| Budget mobilité, pilier 3 (cash, 38,07 %) | oui | petit |
| Budget mobilité, pilier 1 (voiture zéro émission) | « bientôt disponible » | petit, réutilise l'ATN |
| Voiture classique **ou** budget mobilité, au choix exclusif | oui | petit |
| Bornes légales du budget annuel | ? | petit |
| Cotisation CO₂ patronale | oui (côté employeur) | moyen |
| Fausses hybrides, voitures sans donnée CO₂ | ? | petit |
| Carte carburant ou de recharge | non | moyen |

## 3. Avantages extralégaux

| Fonction | Chez lui | Effort |
|---|---|---|
| Chèques sport et culture | oui | petit |
| Indemnité vélo (par km) | oui | petit |
| Indemnité par jour de déplacement | oui | petit |
| Indemnité internet | oui | petit |
| Indemnité PC | oui | petit |
| Frais de représentation | oui | petit |
| Jours de congé supplémentaires | oui | petit |
| Assurance groupe | oui | moyen (taxation à la sortie) |
| Assurance hospitalisation | non | petit |
| Chèques-cadeaux | non | petit |
| Intervention dans les transports en commun | non | moyen |
| Plan cafétéria | mentionné | gros |

Les sept premiers suivent le motif des titres-repas et des frais propres : un montant, un plafond, une alerte.

## 4. Rémunérations particulières

| Fonction | Chez lui | Effort |
|---|---|---|
| Revenus de droits d'auteur | oui | gros (régime à part, plafonds, requalification) |
| Brut variable (primes, commissions) | oui | moyen |
| Heures supplémentaires et sursalaire | non | moyen |
| Travail de nuit, week-end, équipes | non | moyen |
| Stock-options, warrants | non | gros |

## 5. Statuts non couverts

| Fonction | Chez lui | Effort |
|---|---|---|
| Temps partiel | partiellement (heures et jours réglables) | moyen |
| Ouvriers (ONSS sur 108 %, pécule payé par une caisse) | non | gros |
| Étudiants (cotisation de solidarité 8,13 %) | non | petit |
| Dirigeants d'entreprise | non | gros |
| Frontaliers, expatriés | non | gros |
| Chômage temporaire, congé parental, crédit-temps | non | moyen chacun |
| Pensionnés | non | moyen |

## 6. Côté employeur

| Fonction | Chez lui | Effort |
|---|---|---|
| Coût salarial total | oui | moyen |
| Cotisations patronales détaillées | oui (25 %, simplifié) | moyen |
| Réduction structurelle et réductions groupes cibles | non | gros |
| Provision pour pécule et 13e mois | non | moyen |
| Comparaison « ce que ça coûte / ce qu'il reçoit » | oui | petit |

## 7. Confort et interface

| Fonction | Chez lui | Effort |
|---|---|---|
| Lien partageable de la simulation | oui | petit |
| Trois langues (FR, NL, EN) | oui | moyen |
| Comparer deux situations côte à côte | non | moyen |
| Optimiseur : quel mélange maximise le net | oui | gros |
| Export PDF du détail | non | moyen |
| Courbe brut → net | non | petit |
| Simulation d'augmentation | non | petit |
| Mode daltonien, tutoriel | oui | petit |
| Export vers r/BESalary | oui | petit |

## 8. Ce qui ne se voit pas mais tient le reste

| Chantier | Pourquoi | Effort |
|---|---|---|
| Paramètres 2027 | Au 1er janvier 2027, l'application n'affiche plus de résultat | moyen, **seule échéance datée** |
| Trou de janvier à juin 2026 | Aucune règle intégrée sur ces six mois | petit |
| Vérification externe des 74 cas de référence | Recalculés depuis les textes, jamais confrontés au simulateur du SPF | moyen |
| Écart de précompte de 17,85 €/mois | Inexpliqué sur les deux fiches de paie réelles de 2025 | inconnu |
| Écart de bonus fiscal de 17,18 €/mois | Trouvé le 2026-09-22 en comparant avec le site : son bonus fiscal suppose 63 % sur le volet B, nous appliquons 52,54 % (SPF-FC-2026). Les sources secondaires nous donnent raison, à confirmer sur le texte officiel | petit |
| Déploiement | Le calculateur n'est pas en ligne | petit |
| Veille automatique des paramètres | Un test qui échoue quand l'ONSS ou le SPF publient de nouvelles valeurs | moyen |

## Sources de la comparaison

- [Securex — Les trois piliers du budget de mobilité en détail](https://www.securex.be/fr/lex4you/employeur/themes/mobilite/budget-de-mobilite/les-trois-piliers-du-budget-de-mobilite-en-detail)
- [lebudgetmobilite.be — Principes de base et affectation du budget](https://lebudgetmobilite.be/fr/1-quels-sont-les-principes-de-base-du-budget-mobilite)
- [Lizy — Les 3 piliers du budget mobilité, guide 2026](https://www.lizy.be/fr/blog/3-piliers-budget-mobilite)
- [Liantis — Renforcement du bonus à l'emploi à partir de 2026](https://www.liantis.be/fr/nouvelles/renforcement-du-bonus-%C3%A0-l%E2%80%99emploi-%C3%A0-partir-de-2026-qu%E2%80%99est-ce-qui-va-changer-pour-les)
