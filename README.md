# Salaire net Belgique

Calculateur brut → net mensuel pour un employé à temps plein en Belgique, exact au centime selon les règles officielles en vigueur du 1er juillet au 31 décembre 2026.

Chaque ligne du détail (ONSS, bonus à l'emploi, précompte professionnel, bonus fiscal, cotisation spéciale) cite sa source officielle.

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

## Comment l'exactitude est vérifiée

- Le moteur (`src/engine/`) calcule en centimes entiers, avec les arrondis imposés par les textes.
- `tools/reference/reference.py` recalcule 74 situations directement depuis les textes officiels, sans réutiliser le code TypeScript. Le moteur doit reproduire chaque valeur intermédiaire au centime.
- Un cas n'est marqué `verifie: true` qu'après comparaison avec une source externe (fiche de paie réelle, simulateur officiel).

## Sources

- SPF Finances, formule-clé du précompte professionnel 2026 (ESS-SR/2025-0928)
- ONSS, instructions administratives 2026/3 : bonus à l'emploi, cotisation spéciale de sécurité sociale

## Limites de la V1

Employé à temps plein uniquement ; pas d'ouvriers, de temps partiel, de 13e mois, de pécule de vacances ni d'avantages extralégaux. Estimation qui ne remplace pas une fiche de paie. Détails dans `docs/superpowers/specs/`.
