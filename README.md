# Salaire net Belgique

Calculateur de salaire mensuel pour un employé à temps plein en Belgique, dans les deux sens : du brut au net, ou du net souhaité au brut nécessaire. Exact au centime selon les règles officielles en vigueur du 1er juillet au 31 décembre 2026.

Chaque ligne du détail (ONSS, bonus à l'emploi, précompte professionnel, bonus fiscal, cotisation spéciale) cite sa source officielle. Les avantages extralégaux exonérés — titres-repas, indemnité de télétravail, écochèques — s'ajoutent au calcul pour donner le net réellement versé sur le compte.

![Calculateur : isolé sans enfant, brut 3 000,00 € → net 2 261,33 €](docs/images/apercu.png)

## Démarrer

```powershell
npm install
npm run dev
```

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm test` | tous les tests (Vitest) |
| `npm run typecheck` | vérification TypeScript |
| `npm run lint` | oxlint |
| `npm run build` | build de production dans `dist/` |
| `python tools/reference/reference.py` | régénère les 74 cas de référence |
| `npm run verifier:recul` | mesure le recul maximal du net (à relancer après tout changement de paramètres) |

## Comment l'exactitude est vérifiée

- Le moteur (`src/engine/`) calcule en centimes entiers, avec les arrondis imposés par les textes.
- `tools/reference/reference.py` recalcule 74 situations directement depuis les textes officiels, sans réutiliser le code TypeScript. Le moteur doit reproduire chaque valeur intermédiaire au centime.
- Un cas n'est marqué `verifie: true` qu'après comparaison avec une source externe (fiche de paie réelle, simulateur officiel).
- Net → brut : `calculerBrut` renvoie le plus petit brut dont le net atteint la cible. Le net ne monte pas toujours avec le brut (arrondis, marche de la cotisation spéciale). La recherche redescend donc jusqu'à ce que le net passe sous « cible − 10 € ». C'est exact tant que le net ne recule jamais de plus de 10 €. `npm run verifier:recul` le mesure sur toutes les situations et tous les bruts au centime, et un test échoue si la mesure manque ou dépasse la marge.
- Avantages extralégaux : titres-repas, indemnité de télétravail et écochèques sont exonérés d'ONSS et d'impôt tant que les plafonds ONSS sont respectés. Le calcul ne fait que des multiplications entières, ne touche pas au salaire, et signale par une alerte tout dépassement de plafond, sans modéliser le basculement en salaire.

## Sources

- SPF Finances, formule-clé du précompte professionnel 2026 (ESS-SR/2025-0928)
- ONSS, instructions administratives 2026/3 : bonus à l'emploi, cotisation spéciale de sécurité sociale
- ONSS, instructions administratives : titres-repas, frais propres à l'employeur (indemnité de bureau), éco-chèques

## Limites de la V1

Employé à temps plein uniquement ; le calcul net → brut couvre les mêmes situations que le brut → net. Pas d'ouvriers, de temps partiel, de 13e mois, de pécule de vacances, ni de voiture de société. Les avantages extralégaux couverts sont supposés conformes à leurs conditions d'exonération (convention collective, un titre par jour presté, télétravail structurel). Estimation qui ne remplace pas une fiche de paie. Détails dans `docs/superpowers/specs/`.
