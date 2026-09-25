# Ergonomie de l'interface (V2.7) — plan d'implémentation

> **Pour les travailleurs agentiques :** SOUS-COMPÉTENCE REQUISE : utiliser superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`).

**Objectif :** rendre l'app moins verticale sur ordinateur : formulaire en sections repliables avec résumé, résultat fixé à l'écran dans une colonne de droite, résultats détaillés en onglets.

**Architecture :** on découpe d'abord `FormulaireSituation.tsx` en quatre composants sans rien changer à son comportement ; on écrit à part trois briques testées (les résumés, `SectionRepliable`, `OngletsResultats`) ; puis on les assemble dans le formulaire, et enfin dans la mise en page de `App.tsx`.

**Pile technique :** React 19, TypeScript 6 strict, Tailwind 4, Vitest + Testing Library + user-event + jsdom, oxlint. Aucune dépendance nouvelle : pas de bibliothèque de composants.

**Spec :** `docs/superpowers/specs/2026-09-25-ergonomie-interface-design.md`

**Branche :** `feat/ergonomie-interface`, déjà créée (commits `e47b28b` pour le `.gitignore`, `8d6e39f` pour la spec). Un commit par tâche. **Ni push ni merge** avant la fin, et seulement sur demande explicite de l'utilisateur.

## Contraintes globales

- **Le calcul ne change pas** : aucun fichier de `src/engine/` ni de `src/hooks/` n'est modifié.
- **Aucune valeur attendue ni aucune affirmation d'un test existant n'est retirée ou affaiblie.** Un test existant peut gagner des étapes d'interaction (ouvrir une section, choisir un onglet), rien d'autre.
- **Le style ne change pas** : palette, typographie et thème restent ceux du dépôt. On réutilise les classes Tailwind déjà présentes (cartes `rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900`, champs `CHAMP`, cases `size-4 accent-blue-700`).
- **Aucun texte en dur** dans un composant : tout libellé passe par `src/i18n/fr.ts`, avec apostrophes typographiques `’`.
- **Accessible au clavier et au lecteur d'écran** : boutons natifs, `aria-expanded` / `aria-controls` pour les sections, motif ARIA des onglets.
- **TypeScript strict**, aucun `any`. Fichiers **UTF-8**, fins de ligne **LF**.
- `npm test`, `npm run typecheck`, `npm run lint` verts avant chaque commit ; `npm run build` aussi à la dernière tâche.
- Message de commit en français, sujet impératif court, ligne vide, puis la ligne `Co-Authored-By` que le rappel système de l'implémenteur lui indique.

## Points de vigilance pour la relecture

Cinq situations que la spec implique et qu'un test doit épingler, la plus probable d'abord.

1. **Corriger une erreur ne doit pas refermer la section pendant qu'on tape.** Une section ouverte d'office par une erreur reste ouverte quand l'erreur disparaît ; sinon le champ s'évanouit au moment où la saisie redevient valide. → tests en tâches 3 et 5.
2. **Une affirmation d'absence peut devenir vide.** Un test existant qui vérifie qu'un champ est *absent* passerait encore si ce champ se trouvait dans une section fermée, mais pour une mauvaise raison. Chaque test qui touche un champ d'une section repliable doit l'ouvrir **avant sa première affirmation**. → règle et liste en tâche 5.
3. **Une saisie restaurée invalide** (enregistrée dans le navigateur) doit ouvrir d'elle-même la section fautive au chargement, sinon le calcul ne s'affiche pas sans explication visible. → test en tâche 5.
4. **L'onglet actif qui disparaît** (on décoche les deux primes pendant qu'on regarde leur onglet) doit ramener au détail, et ne pas y revenir tout seul si l'onglet réapparaît. → tests en tâches 4 et 6.
5. **Tout doit rester utilisable au clavier seul** : ouvrir une section avec Entrée ou Espace, passer d'un onglet à l'autre avec les flèches. → tests en tâches 3 et 4.

---

## Task 1 : découper le formulaire sans changer son comportement

**Fichiers :**
- Créer : `src/components/formulaire/champs.tsx`
- Créer : `src/components/formulaire/SectionSalaireFamille.tsx`
- Créer : `src/components/formulaire/SectionMobilite.tsx`
- Créer : `src/components/formulaire/SectionPrimes.tsx`
- Créer : `src/components/formulaire/SectionAvantages.tsx`
- Modifier : `src/components/FormulaireSituation.tsx`

**Interfaces :**
- Consomme : rien de nouveau.
- Produit :
  - `type ModifierSaisie = <K extends keyof SaisieFormulaire>(champ: K, valeur: SaisieFormulaire[K]) => void`, exporté de `champs.tsx`
  - `CHAMP`, `Erreur`, `ChampAvantage`, `messageErreur(code: CodeErreur | undefined, sens: SensCalcul): string | undefined`, exportés de `champs.tsx`
  - quatre composants, chacun rendant un **fragment** (`<>…</>`) dont les enfants sont exactement les blocs qu'il reprend :
    - `SectionSalaireFamille({ saisie, erreurs, netMaxCentimes, onChange, onBasculerSens })`
    - `SectionMobilite({ saisie, erreurs, apercuAtnCentimes, onChange })`
    - `SectionPrimes({ saisie, erreurs, onChange })`
    - `SectionAvantages({ saisie, erreurs, plafondTeletravailCentimes, plafondEcochequesCentimes, onChange })`

Cette tâche est un **déplacement de code**. Le DOM produit doit rester identique au caractère près : les fragments laissent les blocs enfants directs du `<form>`, comme aujourd'hui. **Aucun test ne doit être modifié** : s'il en faut, c'est que le comportement a changé.

- [ ] **Étape 1 : constater l'état de départ**

Commande : `npm test`
Attendu : tout est vert (817 tests à la date du plan). Note le nombre exact dans ton rapport : il ne doit pas changer.

- [ ] **Étape 2 : créer `champs.tsx`**

Crée `src/components/formulaire/champs.tsx` en y **déplaçant sans les modifier** les lignes 32 à 81 de `src/components/FormulaireSituation.tsx` (la constante `CHAMP`, les composants `Erreur` et `ChampAvantage` et l'interface `ChampAvantageProps`), en ajoutant `export` devant chacun. Ajoute en tête :

```tsx
import type { ReactNode } from 'react'
import type { CodeErreur, SaisieFormulaire, SensCalcul } from '../../engine/validation'
import { texteErreur } from '../../i18n/fr'

/** Signature de la mise à jour d'un champ de la saisie, partagée par les sections. */
export type ModifierSaisie = <K extends keyof SaisieFormulaire>(champ: K, valeur: SaisieFormulaire[K]) => void

/** Message d'une erreur de champ, ou undefined quand il n'y en a pas : ce qu'attend ChampAvantage. */
export function messageErreur(code: CodeErreur | undefined, sens: SensCalcul): string | undefined {
  return code ? texteErreur(code, sens) : undefined
}
```

- [ ] **Étape 3 : créer les quatre sections**

Pour chaque fichier, reprends **tel quel** le JSX indiqué de `FormulaireSituation.tsx`, entouré d'un fragment, et les constantes locales dont il a besoin (lignes 93 à 121). Chaque section définit son `erreurTexte` avec la même forme qu'aujourd'hui, pour que le JSX déplacé ne change pas :

```tsx
const erreurTexte = (code: CodeErreur | undefined) => messageErreur(code, saisie.sens)
```

Répartition :

| Fichier | Constantes reprises | JSX repris (lignes actuelles) |
|---|---|---|
| `SectionSalaireFamille.tsx` | `t`, `isole`, `enfants`, `afficherParentIsole`, `erreurMontant` (l. 93-101) | 129 à 241 : sens du calcul, montant, état civil, revenus du conjoint, enfants, parent isolé |
| `SectionMobilite.tsx` | `t`, `erreurTexte`, `v`, `tv`, `modifierVoiture`, `bm`, `tm`, `modifierBudget` (l. 93, 107, 109-117) | 243 à 395 : choix de mobilité, voiture, budget mobilité |
| `SectionPrimes.tsx` | `t`, `erreurTexte`, `pr`, `tp`, `modifierPrime` (l. 93, 107, 119-121) | 397 à 450 : 13e mois et pécule |
| `SectionAvantages.tsx` | `t`, `a`, `ta`, `modifierAvantage`, `erreurTexte` (l. 93, 103-107) | 452 à 555 : avantages extralégaux |

Chaque composant a son interface `Props` avec exactement les propriétés annoncées ci-dessus, typées comme dans l'interface `Props` actuelle de `FormulaireSituation` (`onChange: ModifierSaisie`). Exemple pour la première :

```tsx
import { REVENUS_CONJOINT, type RevenusConjoint } from '../../engine/types'
import { SENS_CALCUL, type ErreursSaisie, type SaisieFormulaire } from '../../engine/validation'
import { fr, texteErreur } from '../../i18n/fr'
import { formatEuro } from '../../utils/format'
import { CHAMP, Erreur, type ModifierSaisie } from './champs'

interface Props {
  saisie: SaisieFormulaire
  erreurs: ErreursSaisie
  /** Net maximal atteignable si le net demandé le dépasse, sinon null. */
  netMaxCentimes: number | null
  onChange: ModifierSaisie
  onBasculerSens: () => void
}

/** Sens du calcul, montant et situation familiale (spec ergonomie § 2). */
export function SectionSalaireFamille({ saisie, erreurs, netMaxCentimes, onChange, onBasculerSens }: Props) {
  const t = fr.formulaire
  const isole = saisie.etatCivil === 'isole'
  const enfants = Number(saisie.enfantsACharge)
  const afficherParentIsole = isole && Number.isInteger(enfants) && enfants > 0
  const erreurMontant = erreurs.montant
    ? texteErreur(erreurs.montant, saisie.sens)
    : netMaxCentimes !== null
      ? t.netHorsLimites(formatEuro(netMaxCentimes))
      : null

  return (
    <>
      {/* lignes 129 à 241 de FormulaireSituation.tsx, sans modification */}
    </>
  )
}
```

Importe dans chaque fichier ce que son JSX utilise, et rien d'autre (oxlint signale les imports inutiles).

- [ ] **Étape 4 : réduire `FormulaireSituation.tsx` à l'assemblage**

`FormulaireSituation` garde son interface `Props` et sa signature telles quelles (`App.tsx` ne change pas). Son corps devient :

```tsx
export function FormulaireSituation({
  saisie,
  erreurs,
  netMaxCentimes,
  plafondTeletravailCentimes,
  plafondEcochequesCentimes,
  apercuAtnCentimes,
  onChange,
  onBasculerSens,
}: Props) {
  const t = fr.formulaire
  return (
    <section aria-labelledby="titre-formulaire" className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
      <h2 id="titre-formulaire" className="mb-4 text-lg font-semibold">
        {t.titre}
      </h2>
      <form className="space-y-5" onSubmit={(e) => e.preventDefault()} noValidate>
        <SectionSalaireFamille
          saisie={saisie}
          erreurs={erreurs}
          netMaxCentimes={netMaxCentimes}
          onChange={onChange}
          onBasculerSens={onBasculerSens}
        />
        <SectionMobilite saisie={saisie} erreurs={erreurs} apercuAtnCentimes={apercuAtnCentimes} onChange={onChange} />
        <SectionPrimes saisie={saisie} erreurs={erreurs} onChange={onChange} />
        <SectionAvantages
          saisie={saisie}
          erreurs={erreurs}
          plafondTeletravailCentimes={plafondTeletravailCentimes}
          plafondEcochequesCentimes={plafondEcochequesCentimes}
          onChange={onChange}
        />
      </form>
    </section>
  )
}
```

`onChange` y garde son type actuel, qui est déjà exactement `ModifierSaisie` : tu peux remplacer sa déclaration dans `Props` par ce type importé.

- [ ] **Étape 5 : vérifier que rien n'a changé**

Commandes : `npm test`, `npm run typecheck`, `npm run lint`
Attendu : tout est vert, **même nombre de tests qu'à l'étape 1, aucun fichier de test modifié**.

Puis `git diff --stat` : seuls les six fichiers de cette tâche apparaissent. Relis `git diff --color-moved=zebra` : le JSX doit apparaître comme déplacé, pas comme réécrit.

- [ ] **Étape 6 : commiter**

```bash
git add src/components/FormulaireSituation.tsx src/components/formulaire/
git commit -m "$(cat <<'EOF'
refactor: découper le formulaire en quatre sections

<ligne Co-Authored-By de ton rappel système>
EOF
)"
```

---

## Task 2 : les résumés des sections

**Fichiers :**
- Créer : `src/components/formulaire/resumes.ts`
- Créer : `src/components/formulaire/resumes.test.ts`
- Modifier : `src/i18n/fr.ts`

**Interfaces :**
- Consomme : `SaisieFormulaire`, `SaisiePrimes`, `SaisieAvantages`, `ErreursSaisie` de `src/engine/validation.ts`.
- Produit :
  - `const SECTIONS_REPLIABLES = ['mobilite', 'primes', 'avantages'] as const` et `type IdSection`
  - `resumeMobilite(saisie: Pick<SaisieFormulaire, 'choixMobilite' | 'atn' | 'voiture' | 'budgetMobilite'>): string`
  - `resumePrimes(primes: SaisiePrimes): string`
  - `resumeAvantages(avantages: SaisieAvantages): string`
  - `sectionsEnErreur(erreurs: ErreursSaisie): ReadonlySet<IdSection>`
  - dans `fr.formulaire` : `salaireFamille` et le bloc `resumes`

- [ ] **Étape 1 : écrire les tests qui échouent**

Crée `src/components/formulaire/resumes.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { SAISIE_PAR_DEFAUT, type ErreursSaisie } from '../../engine/validation'
import { resumeAvantages, resumeMobilite, resumePrimes, sectionsEnErreur } from './resumes'

const D = SAISIE_PAR_DEFAUT

describe('resumeMobilite', () => {
  it('dit « Aucun » quand ni voiture ni budget mobilité', () => {
    expect(resumeMobilite({ ...D, choixMobilite: 'aucun' })).toBe('Aucun')
  })

  it('reprend l’ATN tapé en mode montant', () => {
    expect(resumeMobilite({ ...D, choixMobilite: 'voiture', atn: ' 250 ', voiture: { ...D.voiture, mode: 'montant' } })).toBe(
      'Voiture de société · ATN 250 €/mois',
    )
  })

  it('reprend la valeur catalogue tapée en mode calcul', () => {
    expect(resumeMobilite({ ...D, choixMobilite: 'voiture', voiture: { ...D.voiture, mode: 'voiture', valeurCatalogue: '45000' } })).toBe(
      'Voiture de société · 45000 € catalogue',
    )
  })

  it('reprend la part prise en cash du budget mobilité', () => {
    expect(resumeMobilite({ ...D, choixMobilite: 'budgetMobilite', budgetMobilite: { budgetAnnuel: '6000', pilier3Annuel: '2000' } })).toBe(
      'Budget mobilité · 2000 €/an en cash',
    )
  })
})

describe('resumePrimes', () => {
  const P = D.primes

  it('dit « Aucune prime » quand rien n’est coché', () => {
    expect(resumePrimes({ ...P, treiziemeActif: false, peculeActif: false })).toBe('Aucune prime')
  })

  it('donne le pourcentage du 13e mois seul', () => {
    expect(resumePrimes({ ...P, treiziemeActif: true, treiziemePourcentage: '108,5', peculeActif: false })).toBe('13e mois 108,5 %')
  })

  it('dit « Double pécule » pour le pécule seul', () => {
    expect(resumePrimes({ ...P, treiziemeActif: false, peculeActif: true })).toBe('Double pécule')
  })

  it('réunit les deux primes', () => {
    expect(resumePrimes({ ...P, treiziemeActif: true, treiziemePourcentage: '100', peculeActif: true })).toBe(
      '13e mois 100 % · double pécule',
    )
  })
})

describe('resumeAvantages', () => {
  const A = D.avantages

  it('dit « Aucun » quand rien n’est coché', () => {
    expect(resumeAvantages({ ...A, titresRepasActif: false, teletravailActif: false, ecochequesActif: false, fraisPropresActif: false })).toBe(
      'Aucun',
    )
  })

  it('énumère les avantages cochés dans l’ordre du formulaire', () => {
    expect(resumeAvantages({ ...A, titresRepasActif: false, teletravailActif: true, ecochequesActif: true, fraisPropresActif: false })).toBe(
      'Indemnité de télétravail, Écochèques',
    )
    expect(resumeAvantages({ ...A, titresRepasActif: true, teletravailActif: true, ecochequesActif: true, fraisPropresActif: true })).toBe(
      'Titres-repas, Indemnité de télétravail, Écochèques, Frais propres à l’employeur',
    )
  })
})

describe('sectionsEnErreur', () => {
  it('ne signale aucune section sans erreur', () => {
    expect(sectionsEnErreur({}).size).toBe(0)
  })

  it('ne rattache le montant et les enfants à aucune section repliable', () => {
    expect(sectionsEnErreur({ montant: 'montantVide', enfantsACharge: 'enfantsInvalide' }).size).toBe(0)
  })

  it.each<[keyof ErreursSaisie, string]>([
    ['atn', 'mobilite'],
    ['valeurCatalogue', 'mobilite'],
    ['co2', 'mobilite'],
    ['premiereImmatriculation', 'mobilite'],
    ['contribution', 'mobilite'],
    ['budgetAnnuel', 'mobilite'],
    ['pilier3Annuel', 'mobilite'],
    ['treiziemePourcentage', 'primes'],
    ['treiziemeMoisPrestes', 'primes'],
    ['peculeMoisPrestes', 'primes'],
    ['joursPrestes', 'avantages'],
    ['valeurFaciale', 'avantages'],
    ['partTravailleur', 'avantages'],
    ['teletravail', 'avantages'],
    ['ecocheques', 'avantages'],
    ['fraisPropres', 'avantages'],
  ])('rattache une erreur sur %s à la section %s', (champ, section) => {
    expect([...sectionsEnErreur({ [champ]: 'montantFormat' })]).toEqual([section])
  })

  it('signale plusieurs sections à la fois', () => {
    expect(new Set(sectionsEnErreur({ atn: 'atnInvalide', ecocheques: 'ecochequesInvalide' }))).toEqual(new Set(['mobilite', 'avantages']))
  })
})
```

- [ ] **Étape 2 : lancer les tests et constater l'échec**

Commande : `npx vitest run src/components/formulaire/resumes.test.ts`
Attendu : ÉCHEC — le module `./resumes` n'existe pas.

- [ ] **Étape 3 : ajouter les textes**

Dans `src/i18n/fr.ts`, dans le bloc `formulaire`, ajoute après `titre` :

```ts
    salaireFamille: 'Salaire et famille',
    resumes: {
      aucun: 'Aucun',
      voitureMontant: (montant: string) => `Voiture de société · ATN ${montant} €/mois`,
      voitureCalcul: (valeur: string) => `Voiture de société · ${valeur} € catalogue`,
      budgetMobilite: (cash: string) => `Budget mobilité · ${cash} €/an en cash`,
      aucunePrime: 'Aucune prime',
      treizieme: (pourcentage: string) => `13e mois ${pourcentage} %`,
      pecule: 'Double pécule',
      treiziemeEtPecule: (pourcentage: string) => `13e mois ${pourcentage} % · double pécule`,
      aCorriger: '⚠ à corriger',
    },
```

- [ ] **Étape 4 : écrire le module**

Crée `src/components/formulaire/resumes.ts` :

```ts
import type { ErreursSaisie, SaisieAvantages, SaisieFormulaire, SaisiePrimes } from '../../engine/validation'
import { fr } from '../../i18n/fr'

/** Les sections du formulaire qui se replient (spec ergonomie § 2). */
export const SECTIONS_REPLIABLES = ['mobilite', 'primes', 'avantages'] as const
export type IdSection = (typeof SECTIONS_REPLIABLES)[number]

/**
 * Section de chaque champ en erreur ; null pour le bloc « Salaire et famille », toujours ouvert.
 * `satisfies` oblige à rattacher toute nouvelle clé de ErreursSaisie : une erreur sans section
 * serait une erreur qu'on ne verrait pas.
 */
const SECTION_DU_CHAMP = {
  montant: null,
  enfantsACharge: null,
  atn: 'mobilite',
  valeurCatalogue: 'mobilite',
  co2: 'mobilite',
  premiereImmatriculation: 'mobilite',
  contribution: 'mobilite',
  budgetAnnuel: 'mobilite',
  pilier3Annuel: 'mobilite',
  treiziemePourcentage: 'primes',
  treiziemeMoisPrestes: 'primes',
  peculeMoisPrestes: 'primes',
  joursPrestes: 'avantages',
  valeurFaciale: 'avantages',
  partTravailleur: 'avantages',
  teletravail: 'avantages',
  ecocheques: 'avantages',
  fraisPropres: 'avantages',
} as const satisfies Record<keyof ErreursSaisie, IdSection | null>

/** Sections repliables qui contiennent au moins un champ en erreur. */
export function sectionsEnErreur(erreurs: ErreursSaisie): ReadonlySet<IdSection> {
  const sections = new Set<IdSection>()
  for (const champ of Object.keys(erreurs) as (keyof ErreursSaisie)[]) {
    const section = SECTION_DU_CHAMP[champ]
    if (erreurs[champ] !== undefined && section !== null) {
      sections.add(section)
    }
  }
  return sections
}

/** Résumé de la voiture ou du budget mobilité, à partir de ce qui est tapé (spec ergonomie § 3.2). */
export function resumeMobilite(saisie: Pick<SaisieFormulaire, 'choixMobilite' | 'atn' | 'voiture' | 'budgetMobilite'>): string {
  const t = fr.formulaire.resumes
  switch (saisie.choixMobilite) {
    case 'aucun':
      return t.aucun
    case 'budgetMobilite':
      return t.budgetMobilite(saisie.budgetMobilite.pilier3Annuel.trim())
    case 'voiture':
      return saisie.voiture.mode === 'montant' ? t.voitureMontant(saisie.atn.trim()) : t.voitureCalcul(saisie.voiture.valeurCatalogue.trim())
  }
}

/** Résumé du 13e mois et du pécule. */
export function resumePrimes(primes: SaisiePrimes): string {
  const t = fr.formulaire.resumes
  const pourcentage = primes.treiziemePourcentage.trim()
  if (primes.treiziemeActif && primes.peculeActif) {
    return t.treiziemeEtPecule(pourcentage)
  }
  if (primes.treiziemeActif) {
    return t.treizieme(pourcentage)
  }
  return primes.peculeActif ? t.pecule : t.aucunePrime
}

/** Noms des avantages cochés, dans l'ordre du formulaire. */
export function resumeAvantages(avantages: SaisieAvantages): string {
  const ta = fr.formulaire.avantages
  const noms = [
    ...(avantages.titresRepasActif ? [ta.titresRepas] : []),
    ...(avantages.teletravailActif ? [ta.teletravail] : []),
    ...(avantages.ecochequesActif ? [ta.ecocheques] : []),
    ...(avantages.fraisPropresActif ? [ta.fraisPropres] : []),
  ]
  return noms.length === 0 ? fr.formulaire.resumes.aucun : noms.join(', ')
}
```

- [ ] **Étape 5 : lancer les tests et constater le succès**

Commande : `npx vitest run src/components/formulaire/resumes.test.ts`
Attendu : SUCCÈS.

- [ ] **Étape 6 : vérifier et commiter**

```bash
npm test && npm run typecheck && npm run lint
git add src/components/formulaire/resumes.ts src/components/formulaire/resumes.test.ts src/i18n/fr.ts
git commit -m "$(cat <<'EOF'
feat: résumés des sections du formulaire

<ligne Co-Authored-By de ton rappel système>
EOF
)"
```

---

## Task 3 : la section repliable

**Fichiers :**
- Créer : `src/components/SectionRepliable.tsx`
- Créer : `src/components/SectionRepliable.test.tsx`

**Interfaces :**
- Consomme : `fr.formulaire.resumes.aCorriger` (tâche 2).
- Produit : `SectionRepliable({ id, titre, resume, aUneErreur, children })`. Le bouton a pour nom accessible le titre suivi du résumé ; il porte `aria-expanded` et `aria-controls` vers `${id}-contenu`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Crée `src/components/SectionRepliable.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SectionRepliable } from './SectionRepliable'

function section(aUneErreur = false) {
  return (
    <SectionRepliable id="essai" titre="Primes" resume="13e mois 100 %" aUneErreur={aUneErreur}>
      <label>
        Pourcentage
        <input />
      </label>
    </SectionRepliable>
  )
}

const bouton = () => screen.getByRole('button', { name: /^Primes/ })

describe('SectionRepliable', () => {
  it('est fermée par défaut et montre son résumé', () => {
    render(section())
    expect(bouton()).toHaveAttribute('aria-expanded', 'false')
    expect(bouton()).toHaveTextContent('13e mois 100 %')
    expect(screen.queryByLabelText('Pourcentage')).not.toBeInTheDocument()
  })

  it('s’ouvre et se referme au clic, résumé toujours visible', async () => {
    const user = userEvent.setup()
    render(section())
    await user.click(bouton())
    expect(bouton()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Pourcentage')).toBeInTheDocument()
    expect(bouton()).toHaveTextContent('13e mois 100 %')
    await user.click(bouton())
    expect(bouton()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('Pourcentage')).not.toBeInTheDocument()
  })

  it('s’ouvre au clavier, avec Entrée comme avec Espace', async () => {
    const user = userEvent.setup()
    render(section())
    await user.tab()
    expect(bouton()).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(bouton()).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard(' ')
    expect(bouton()).toHaveAttribute('aria-expanded', 'false')
  })

  it('désigne son contenu par aria-controls', async () => {
    const user = userEvent.setup()
    render(section())
    await user.click(bouton())
    const panneau = document.getElementById(bouton().getAttribute('aria-controls') ?? '')
    expect(panneau).toContainElement(screen.getByLabelText('Pourcentage'))
  })

  it('s’ouvre d’office sur une erreur, le signale, et ne se referme pas', async () => {
    const user = userEvent.setup()
    render(section(true))
    expect(bouton()).toHaveAttribute('aria-expanded', 'true')
    expect(bouton()).toHaveTextContent('⚠ à corriger')
    expect(bouton()).not.toHaveTextContent('13e mois 100 %')
    await user.click(bouton())
    expect(screen.getByLabelText('Pourcentage')).toBeInTheDocument()
  })

  it('reste ouverte quand l’erreur est corrigée', () => {
    const { rerender } = render(section(false))
    rerender(section(true))
    expect(bouton()).toHaveAttribute('aria-expanded', 'true')
    rerender(section(false))
    // Le champ ne doit pas disparaître au moment où la saisie redevient valide.
    expect(bouton()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Pourcentage')).toBeInTheDocument()
    expect(bouton()).toHaveTextContent('13e mois 100 %')
  })
})
```

- [ ] **Étape 2 : lancer les tests et constater l'échec**

Commande : `npx vitest run src/components/SectionRepliable.test.tsx`
Attendu : ÉCHEC — le module n'existe pas.

- [ ] **Étape 3 : écrire le composant**

Crée `src/components/SectionRepliable.tsx` :

```tsx
import { useState, type ReactNode } from 'react'
import { fr } from '../i18n/fr'

interface Props {
  /** Préfixe des identifiants du bouton et du contenu. */
  id: string
  titre: string
  /** Une ligne qui résume le contenu, visible ouverte comme fermée. */
  resume: string
  /** Un champ de la section est en erreur : elle s'ouvre d'office et le signale. */
  aUneErreur: boolean
  children: ReactNode
}

/**
 * Bloc du formulaire qui se replie sur une ligne de résumé (spec ergonomie § 3.1). Fermé, son
 * contenu est retiré de la page ; la saisie, elle, vit plus haut et n'est pas perdue.
 */
export function SectionRepliable({ id, titre, resume, aUneErreur, children }: Props) {
  const [ouverte, setOuverte] = useState(aUneErreur)
  // Une erreur ouvre la section, et elle reste ouverte une fois l'erreur corrigée : sinon le champ
  // disparaîtrait au moment même où la saisie redevient valide.
  if (aUneErreur && !ouverte) {
    setOuverte(true)
  }
  const idContenu = `${id}-contenu`

  return (
    <div className="rounded-xl bg-white shadow-sm dark:bg-slate-900">
      <h3>
        <button
          type="button"
          aria-expanded={ouverte}
          aria-controls={idContenu}
          onClick={() => setOuverte((o) => aUneErreur || !o)}
          className="flex w-full items-center justify-between gap-4 rounded-xl p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <span className="flex items-center gap-2 font-semibold">
            <span aria-hidden="true">{ouverte ? '▾' : '▸'}</span>
            {titre}
          </span>
          <span className={aUneErreur ? 'text-sm font-medium text-red-700 dark:text-red-400' : 'text-sm text-slate-600 dark:text-slate-400'}>
            {aUneErreur ? fr.formulaire.resumes.aCorriger : resume}
          </span>
        </button>
      </h3>
      <div id={idContenu} hidden={!ouverte} className="space-y-5 px-5 pb-5">
        {ouverte && children}
      </div>
    </div>
  )
}
```

L'appel à `setOuverte` pendant le rendu est le motif documenté par React pour ajuster un état d'après une propriété ; il ne boucle pas, puisqu'il ne s'exécute que si `ouverte` vaut `false`.

- [ ] **Étape 4 : lancer les tests et constater le succès**

Commande : `npx vitest run src/components/SectionRepliable.test.tsx`
Attendu : SUCCÈS, 6 tests.

- [ ] **Étape 5 : vérifier et commiter**

```bash
npm test && npm run typecheck && npm run lint
git add src/components/SectionRepliable.tsx src/components/SectionRepliable.test.tsx
git commit -m "$(cat <<'EOF'
feat: section repliable avec résumé

<ligne Co-Authored-By de ton rappel système>
EOF
)"
```

---

## Task 4 : les onglets de résultats

**Fichiers :**
- Créer : `src/components/OngletsResultats.tsx`
- Créer : `src/components/OngletsResultats.test.tsx`
- Modifier : `src/i18n/fr.ts`

**Interfaces :**
- Consomme : rien des tâches précédentes.
- Produit :
  - `interface Onglet { id: string; libelle: string; contenu: ReactNode }`
  - `OngletsResultats({ onglets }: { onglets: readonly [Onglet, ...Onglet[]] })` — le premier onglet est toujours présent et sert de repli
  - `fr.onglets = { libelle, detail, primes, budgetMobilite }`

- [ ] **Étape 1 : écrire les tests qui échouent**

Crée `src/components/OngletsResultats.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { OngletsResultats, type Onglet } from './OngletsResultats'

const DETAIL: Onglet = { id: 'detail', libelle: 'Détail', contenu: <p>contenu détail</p> }
const PRIMES: Onglet = { id: 'primes', libelle: 'Primes', contenu: <p>contenu primes</p> }
const BUDGET: Onglet = { id: 'budget', libelle: 'Budget', contenu: <p>contenu budget</p> }

const onglet = (nom: string) => screen.getByRole('tab', { name: nom })

describe('OngletsResultats', () => {
  it('sélectionne le premier onglet par défaut et n’affiche que son panneau', () => {
    render(<OngletsResultats onglets={[DETAIL, PRIMES, BUDGET]} />)
    expect(onglet('Détail')).toHaveAttribute('aria-selected', 'true')
    expect(onglet('Primes')).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('contenu détail')
    expect(screen.queryByText('contenu primes')).not.toBeInTheDocument()
  })

  it('étiquette le panneau par son onglet', () => {
    render(<OngletsResultats onglets={[DETAIL, PRIMES]} />)
    expect(screen.getByRole('tabpanel', { name: 'Détail' })).toBeInTheDocument()
  })

  it('change de panneau au clic', async () => {
    const user = userEvent.setup()
    render(<OngletsResultats onglets={[DETAIL, PRIMES, BUDGET]} />)
    await user.click(onglet('Primes'))
    expect(onglet('Primes')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Primes' })).toHaveTextContent('contenu primes')
  })

  it('ne met que l’onglet actif dans l’ordre de tabulation', () => {
    render(<OngletsResultats onglets={[DETAIL, PRIMES, BUDGET]} />)
    expect(onglet('Détail')).toHaveAttribute('tabindex', '0')
    expect(onglet('Primes')).toHaveAttribute('tabindex', '-1')
    expect(onglet('Budget')).toHaveAttribute('tabindex', '-1')
  })

  it('se parcourt aux flèches, en boucle, et va au premier ou au dernier avec Début et Fin', async () => {
    const user = userEvent.setup()
    render(<OngletsResultats onglets={[DETAIL, PRIMES, BUDGET]} />)
    await user.tab()
    expect(onglet('Détail')).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(onglet('Primes')).toHaveFocus()
    expect(onglet('Primes')).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(onglet('Budget')).toHaveFocus()
    await user.keyboard('{Home}')
    expect(onglet('Détail')).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{End}')
    expect(onglet('Budget')).toHaveAttribute('aria-selected', 'true')
  })

  it('revient au premier onglet quand l’onglet actif disparaît, et n’y retourne pas s’il réapparaît', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<OngletsResultats onglets={[DETAIL, PRIMES]} />)
    await user.click(onglet('Primes'))
    rerender(<OngletsResultats onglets={[DETAIL]} />)
    expect(onglet('Détail')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('contenu détail')
    rerender(<OngletsResultats onglets={[DETAIL, PRIMES]} />)
    expect(onglet('Détail')).toHaveAttribute('aria-selected', 'true')
  })
})
```

- [ ] **Étape 2 : lancer les tests et constater l'échec**

Commande : `npx vitest run src/components/OngletsResultats.test.tsx`
Attendu : ÉCHEC — le module n'existe pas.

- [ ] **Étape 3 : ajouter les textes**

Dans `src/i18n/fr.ts`, à la racine de `fr`, après le bloc `detail` :

```ts
  onglets: {
    libelle: 'Résultats détaillés',
    detail: 'Détail du calcul',
    primes: '13e mois et pécule',
    budgetMobilite: 'Budget mobilité',
  },
```

- [ ] **Étape 4 : écrire le composant**

Crée `src/components/OngletsResultats.tsx` :

```tsx
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { fr } from '../i18n/fr'

export interface Onglet {
  id: string
  libelle: string
  contenu: ReactNode
}

/**
 * Onglets de résultats, sur le motif ARIA des onglets (spec ergonomie § 3.3). Le premier onglet est
 * toujours présent : c'est vers lui qu'on revient quand l'onglet choisi disparaît.
 */
export function OngletsResultats({ onglets }: { onglets: readonly [Onglet, ...Onglet[]] }) {
  const [choisi, setChoisi] = useState(onglets[0].id)
  const boutons = useRef(new Map<string, HTMLButtonElement>())
  // L'onglet choisi a disparu : on revient au premier, et ce choix tient s'il réapparaît.
  if (!onglets.some((o) => o.id === choisi)) {
    setChoisi(onglets[0].id)
  }
  const actif = onglets.find((o) => o.id === choisi) ?? onglets[0]

  function aller(index: number) {
    const cible = onglets[(index + onglets.length) % onglets.length]
    setChoisi(cible.id)
    boutons.current.get(cible.id)?.focus()
  }

  function auClavier(e: KeyboardEvent<HTMLDivElement>) {
    const index = onglets.indexOf(actif)
    const destinations: Partial<Record<string, number>> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: onglets.length - 1,
    }
    const destination = destinations[e.key]
    if (destination === undefined) {
      return
    }
    e.preventDefault()
    aller(destination)
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={fr.onglets.libelle}
        onKeyDown={auClavier}
        className="mb-3 flex gap-1 border-b border-slate-200 dark:border-slate-700"
      >
        {onglets.map((onglet) => {
          const selectionne = onglet.id === actif.id
          return (
            <button
              key={onglet.id}
              ref={(bouton) => {
                if (bouton) {
                  boutons.current.set(onglet.id, bouton)
                } else {
                  boutons.current.delete(onglet.id)
                }
              }}
              type="button"
              role="tab"
              id={`onglet-${onglet.id}`}
              aria-selected={selectionne}
              aria-controls={`panneau-${onglet.id}`}
              tabIndex={selectionne ? 0 : -1}
              onClick={() => setChoisi(onglet.id)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                selectionne
                  ? 'border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-300'
                  : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              {onglet.libelle}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id={`panneau-${actif.id}`} aria-labelledby={`onglet-${actif.id}`} tabIndex={0}>
        {actif.contenu}
      </div>
    </div>
  )
}
```

- [ ] **Étape 5 : lancer les tests et constater le succès**

Commande : `npx vitest run src/components/OngletsResultats.test.tsx`
Attendu : SUCCÈS, 6 tests.

- [ ] **Étape 6 : vérifier et commiter**

```bash
npm test && npm run typecheck && npm run lint
git add src/components/OngletsResultats.tsx src/components/OngletsResultats.test.tsx src/i18n/fr.ts
git commit -m "$(cat <<'EOF'
feat: onglets de résultats accessibles au clavier

<ligne Co-Authored-By de ton rappel système>
EOF
)"
```

---

## Task 5 : le formulaire en sections repliables

**Fichiers :**
- Modifier : `src/components/FormulaireSituation.tsx`
- Modifier : `src/components/formulaire/SectionSalaireFamille.tsx`, `SectionMobilite.tsx`, `SectionPrimes.tsx`, `SectionAvantages.tsx`
- Test : `src/App.test.tsx`

**Interfaces :**
- Consomme : les quatre sections et `champs.tsx` (tâche 1) ; `resumeMobilite`, `resumePrimes`, `resumeAvantages`, `sectionsEnErreur` et `fr.formulaire.salaireFamille` (tâche 2) ; `SectionRepliable` (tâche 3).
- Produit : un formulaire dont les boutons de section ont pour nom accessible le titre suivi du résumé : `/^Voiture ou budget mobilité/`, `/^13e mois et pécule de vacances/`, `/^Avantages extralégaux/`.

- [ ] **Étape 1 : écrire les nouveaux tests d'interface (ils doivent échouer)**

En haut de `src/App.test.tsx`, après la fonction `recapitulatif`, ajoute l'aide :

```ts
/** Ouvre une section repliable du formulaire, comme le ferait une personne. */
function ouvrirSection(titre: RegExp) {
  fireEvent.click(screen.getByRole('button', { name: titre }))
}
```

Puis ajoute ce `describe` à la fin du fichier :

```ts
describe('App — sections repliables', () => {
  it('replie les trois sections au chargement et résume leur contenu', () => {
    render(<App dateIso={DATE} />)
    const mobilite = screen.getByRole('button', { name: /^Voiture ou budget mobilité/ })
    expect(mobilite).toHaveAttribute('aria-expanded', 'false')
    expect(mobilite).toHaveTextContent('Voiture de société · ATN 0 €/mois')
    expect(screen.getByRole('button', { name: /^13e mois et pécule de vacances/ })).toHaveTextContent('13e mois 100 % · double pécule')
    expect(screen.getByRole('button', { name: /^Avantages extralégaux/ })).toHaveTextContent('Aucun')
    expect(screen.queryByLabelText('Avantage de toute nature mensuel (€)')).not.toBeInTheDocument()
  })

  it('garde le bloc salaire et famille toujours ouvert', () => {
    render(<App dateIso={DATE} />)
    expect(screen.getByLabelText('Salaire brut mensuel (€)')).toBeInTheDocument()
    expect(screen.getByLabelText('Enfants à charge')).toBeInTheDocument()
  })

  it('met le résumé à jour pendant la saisie', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    ouvrirSection(/^Voiture ou budget mobilité/)
    const atn = screen.getByLabelText('Avantage de toute nature mensuel (€)')
    await user.clear(atn)
    await user.type(atn, '250')
    expect(screen.getByRole('button', { name: /^Voiture ou budget mobilité/ })).toHaveTextContent('Voiture de société · ATN 250 €/mois')
  })

  it('ouvre d’elle-même la section d’une saisie restaurée invalide', () => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, primes: { ...SAISIE_PAR_DEFAUT.primes, treiziemePourcentage: 'abc' } }))
    render(<App dateIso={DATE} />)
    const primes = screen.getByRole('button', { name: /^13e mois et pécule de vacances/ })
    expect(primes).toHaveAttribute('aria-expanded', 'true')
    expect(primes).toHaveTextContent('⚠ à corriger')
    expect(screen.getByLabelText('Pourcentage du salaire mensuel (%)')).toHaveAttribute('aria-invalid', 'true')
  })

  it('ne referme pas la section quand on corrige l’erreur', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    ouvrirSection(/^13e mois et pécule de vacances/)
    const pourcentage = screen.getByLabelText('Pourcentage du salaire mensuel (%)')
    await user.clear(pourcentage)
    await user.type(pourcentage, 'abc')
    expect(screen.getByRole('button', { name: /^13e mois et pécule de vacances/ })).toHaveTextContent('⚠ à corriger')
    await user.clear(pourcentage)
    await user.type(pourcentage, '100')
    expect(screen.getByLabelText('Pourcentage du salaire mensuel (%)')).not.toHaveAttribute('aria-invalid')
    expect(screen.getByRole('button', { name: /^13e mois et pécule de vacances/ })).toHaveAttribute('aria-expanded', 'true')
  })
})
```

Vérifie comment le fichier isole le stockage local entre les tests (un `beforeEach` existant, ou la configuration globale de Vitest et son fichier de mise en place) : le test de la saisie restaurée ne doit pas polluer les suivants. Suis ce que fait déjà le dépôt.

- [ ] **Étape 2 : lancer les tests et constater l'échec**

Commande : `npx vitest run src/App.test.tsx`
Attendu : ÉCHEC des nouveaux tests — aucun bouton « Voiture ou budget mobilité » n'existe.

- [ ] **Étape 3 : assembler le formulaire**

Dans `src/components/FormulaireSituation.tsx`, le formulaire devient une suite de cartes : le bloc « Salaire et famille » toujours ouvert, puis trois `SectionRepliable`. La carte blanche passe de la `<section>` extérieure aux blocs, et le titre « Votre situation » devient invisible à l'écran mais reste dans le plan du document :

```tsx
  const t = fr.formulaire
  const enErreur = sectionsEnErreur(erreurs)
  return (
    <section aria-labelledby="titre-formulaire">
      <h2 id="titre-formulaire" className="sr-only">
        {t.titre}
      </h2>
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()} noValidate>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
          <h3 className="mb-4 font-semibold">{t.salaireFamille}</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <SectionSalaireFamille
              saisie={saisie}
              erreurs={erreurs}
              netMaxCentimes={netMaxCentimes}
              onChange={onChange}
              onBasculerSens={onBasculerSens}
            />
          </div>
        </div>
        <SectionRepliable id="section-mobilite" titre={t.mobilite.titre} resume={resumeMobilite(saisie)} aUneErreur={enErreur.has('mobilite')}>
          <SectionMobilite saisie={saisie} erreurs={erreurs} apercuAtnCentimes={apercuAtnCentimes} onChange={onChange} />
        </SectionRepliable>
        <SectionRepliable id="section-primes" titre={t.primes.titre} resume={resumePrimes(saisie.primes)} aUneErreur={enErreur.has('primes')}>
          <SectionPrimes saisie={saisie} erreurs={erreurs} onChange={onChange} />
        </SectionRepliable>
        <SectionRepliable
          id="section-avantages"
          titre={t.avantages.titre}
          resume={resumeAvantages(saisie.avantages)}
          aUneErreur={enErreur.has('avantages')}
        >
          <SectionAvantages
            saisie={saisie}
            erreurs={erreurs}
            plafondTeletravailCentimes={plafondTeletravailCentimes}
            plafondEcochequesCentimes={plafondEcochequesCentimes}
            onChange={onChange}
          />
        </SectionRepliable>
      </form>
    </section>
  )
```

- [ ] **Étape 4 : ajuster l'intérieur des sections**

Les blocs étaient séparés par des filets dans une seule carte ; ils sont maintenant chacun dans sa carte, dont le titre est déjà visible. Dans les sections :

1. **Retire les filets de séparation** devenus inutiles : les classes `border-t border-slate-200 pt-4 dark:border-slate-700` des `fieldset` du choix de mobilité (`SectionMobilite`), des primes (`SectionPrimes`) et des avantages (`SectionAvantages`).
2. **Rends invisibles les légendes qui répètent le titre de la section** — celles de ces trois mêmes `fieldset` — en remplaçant leur `className` par `sr-only`. Elles restent nécessaires aux lecteurs d'écran pour nommer le groupe de boutons ou de cases.
3. **Mets les champs voisins côte à côte** (`grid gap-3 sm:grid-cols-2` à la place de `space-y-3` sur le conteneur concerné) :
   - `SectionMobilite`, mode calcul : le conteneur des quatre champs valeur catalogue, carburant, émissions, première immatriculation ; l'aperçu de l'ATN, en dessous, occupe toute la largeur (`sm:col-span-2`) ;
   - `SectionMobilite`, mode montant : place le champ de l'ATN et celui de la contribution dans une même grille à deux colonnes ; en mode calcul, la contribution reste seule sous la grille ;
   - `SectionMobilite`, budget mobilité : budget annuel et part en cash ;
   - `SectionPrimes` : pourcentage et mois prestés du 13e mois ;
   - `SectionAvantages`, titres-repas : les trois champs, en `sm:grid-cols-3`.
4. **`SectionSalaireFamille` ne change pas** : ses blocs deviennent d'eux-mêmes les cellules de la grille posée par `FormulaireSituation`. Le choix « parent isolé » s'étend sur les deux colonnes (`sm:col-span-2` sur son `label`).

Aucun identifiant de champ, aucun libellé et aucune liaison `aria-describedby` ne change.

- [ ] **Étape 5 : faire passer les tests existants, sans les affaiblir**

Commande : `npx vitest run src/App.test.tsx`

Les tests qui touchent un champ d'une section repliable échouent maintenant, puisque ce champ n'est plus dans la page tant que la section est fermée. Pour chacun, ajoute l'étape qu'une personne ferait : `ouvrirSection(/^Voiture ou budget mobilité/)`, `ouvrirSection(/^13e mois et pécule de vacances/)` ou `ouvrirSection(/^Avantages extralégaux/)`, juste après le `render`.

**Règle impérative :** l'ouverture se place **avant la première affirmation du test**, jamais au milieu. Un test qui vérifie qu'un champ est *absent* passerait aussi, à tort, si ce champ était dans une section fermée : il ne prouverait plus rien. Ces tests-là n'échouent pas, donc tu ne les trouveras pas en lançant la suite, mais en lisant. Il y en a au moins trois, à traiter même s'ils restent verts :

- « n’affiche les champs d’un avantage qu’une fois coché » (vérifie que « Jours prestés dans le mois » est absent avant de cocher) → ouvrir la section des avantages avant ;
- « garde le champ du montant en mode « Je connais le montant » » (vérifie que « Valeur catalogue (€) » est absent) → ouvrir la section de mobilité avant ;
- « affiche la section voiture par défaut et pas le budget mobilité » (vérifie que « Budget mobilité annuel (€) » est absent) → ouvrir la section de mobilité avant.

Cherche les autres avec `grep -n "queryBy" src/App.test.tsx` et juge chaque cas.

**Ne modifie ni une valeur attendue, ni une affirmation, et ne supprime aucun test.** Le nombre d'appels à `expect` du fichier ne doit pas baisser : compte-le avant et après (`grep -c "expect(" src/App.test.tsx`) et donne les deux chiffres dans ton rapport, avec la liste des tests modifiés.

- [ ] **Étape 6 : lancer toute la suite**

Commandes : `npm test`, `npm run typecheck`, `npm run lint`
Attendu : tout est vert.

- [ ] **Étape 7 : commiter**

```bash
git add src/components/FormulaireSituation.tsx src/components/formulaire/ src/App.test.tsx
git commit -m "$(cat <<'EOF'
feat: formulaire en sections repliables avec résumé

<ligne Co-Authored-By de ton rappel système>
EOF
)"
```

---

## Task 6 : la mise en page, la colonne de résultat et les onglets

**Fichiers :**
- Modifier : `src/App.tsx`
- Modifier : `src/components/Avertissements.tsx`
- Modifier : `src/i18n/fr.ts`
- Modifier : `docs/superpowers/specs/2026-09-25-ergonomie-interface-design.md` (statut)
- Test : `src/App.test.tsx`

**Interfaces :**
- Consomme : `OngletsResultats`, `Onglet`, `fr.onglets` (tâche 4) ; le formulaire de la tâche 5.
- Produit :
  - `BandeauEstimation({ avantagesActifs }: { avantagesActifs: boolean })` et `AlertesCalcul({ etat }: { etat: EtatCalcul })`, exportés de `src/components/Avertissements.tsx`, qui n'exporte plus `Avertissements`
  - une colonne de résultat étiquetée « Résultats » (`fr.resultats`)

- [ ] **Étape 1 : écrire les nouveaux tests d'interface (ils doivent échouer)**

En haut de `src/App.test.tsx`, après `ouvrirSection`, ajoute :

```ts
/** Choisit un onglet de résultats. */
function choisirOnglet(nom: string) {
  fireEvent.click(screen.getByRole('tab', { name: nom }))
}

function colonneResultats() {
  return screen.getByRole('region', { name: 'Résultats' })
}
```

Puis ce `describe`, à la fin du fichier :

```ts
describe('App — colonne de résultat', () => {
  it('montre le détail du calcul dans l’onglet sélectionné par défaut', () => {
    render(<App dateIso={DATE} />)
    expect(screen.getByRole('tab', { name: 'Détail du calcul' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('region', { name: 'Détail du calcul' })).toBeInTheDocument()
  })

  it('propose l’onglet des primes quand une prime est cochée', () => {
    render(<App dateIso={DATE} />)
    choisirOnglet('13e mois et pécule')
    expect(screen.getByRole('region', { name: '13e mois et pécule de vacances' })).toBeInTheDocument()
  })

  it('retire l’onglet des primes quand plus aucune n’est cochée, et revient au détail', () => {
    render(<App dateIso={DATE} />)
    choisirOnglet('13e mois et pécule')
    ouvrirSection(/^13e mois et pécule de vacances/)
    fireEvent.click(screen.getByLabelText('13e mois'))
    fireEvent.click(screen.getByLabelText('Double pécule de vacances'))
    expect(screen.queryByRole('tab', { name: '13e mois et pécule' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Détail du calcul' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('region', { name: 'Détail du calcul' })).toBeInTheDocument()
  })

  it('ne propose l’onglet du budget mobilité que si ce choix est fait', () => {
    render(<App dateIso={DATE} />)
    expect(screen.queryByRole('tab', { name: 'Budget mobilité' })).not.toBeInTheDocument()
    ouvrirSection(/^Voiture ou budget mobilité/)
    fireEvent.click(screen.getByRole('radio', { name: 'Budget mobilité' }))
    fireEvent.change(screen.getByLabelText('Part prise en cash, pilier 3 (€ par an)'), { target: { value: '2000' } })
    expect(screen.getByRole('tab', { name: 'Budget mobilité' })).toBeInTheDocument()
  })

  it('place les alertes de calcul dans la colonne de résultat', async () => {
    const user = userEvent.setup()
    render(<App dateIso={DATE} />)
    const brut = screen.getByLabelText('Salaire brut mensuel (€)')
    await user.clear(brut)
    await user.type(brut, '1500')
    expect(within(colonneResultats()).getByText(/salaire minimum légal/)).toBeInTheDocument()
  })

  it('garde le bandeau d’estimation en haut de page, hors de la colonne de résultat', () => {
    render(<App dateIso={DATE} />)
    expect(screen.getByText(/Ne remplace pas une fiche de paie/)).toBeInTheDocument()
    expect(within(colonneResultats()).queryByText(/Ne remplace pas une fiche de paie/)).not.toBeInTheDocument()
  })
})
```

Vérifie les libellés exacts contre `src/i18n/fr.ts` avant de lancer (le texte de l'alerte du salaire minimum, celui du bandeau, les libellés des cases « 13e mois » et « Double pécule de vacances ») : ce fichier fait foi, pas ce plan. Si un libellé diffère, corrige le test, pas `fr.ts`.

- [ ] **Étape 2 : lancer les tests et constater l'échec**

Commande : `npx vitest run src/App.test.tsx`
Attendu : ÉCHEC des nouveaux tests — ni onglets ni région « Résultats ».

- [ ] **Étape 3 : couper `Avertissements.tsx` en deux**

Dans `src/components/Avertissements.tsx`, remplace le composant `Avertissements` par deux composants. `montantsAlerte` ne change pas.

```tsx
/** Bandeau fixe, en haut de page (spec ergonomie § 2). */
export function BandeauEstimation({ avantagesActifs }: { avantagesActifs: boolean }) {
  return (
    <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      {fr.bandeauEstimation}
      {avantagesActifs ? ` ${fr.alertes.conditionsAvantages}` : ''}
    </p>
  )
}

/** Alertes qui dépendent de la saisie, affichées au-dessus du récapitulatif (spec ergonomie § 2). */
export function AlertesCalcul({ etat }: { etat: EtatCalcul }) {
  const ok = etat.etat === 'ok' ? etat : null
  return (
    <div className="space-y-3 empty:hidden">
      {/* le reste du JSX actuel d'Avertissements, à partir du paragraphe « periodeNonCouverte »,
          sans modification */}
    </div>
  )
}
```

- [ ] **Étape 4 : la mise en page**

Dans `src/i18n/fr.ts`, à la racine de `fr`, ajoute `resultats: 'Résultats',`.

Dans `src/App.tsx`, remplace l'import d'`Avertissements` par `BandeauEstimation` et `AlertesCalcul`, importe `OngletsResultats` et son type `Onglet`, puis construis la liste des onglets avant le `return` :

```tsx
  const ongletsResultats: [Onglet, ...Onglet[]] = [
    { id: 'detail', libelle: fr.onglets.detail, contenu: <DetailCalcul sens={saisie.sens} complet={ok?.complet ?? null} /> },
  ]
  if (ok && (ok.primes.treizieme !== null || ok.primes.pecule !== null)) {
    ongletsResultats.push({ id: 'primes', libelle: fr.onglets.primes, contenu: <PrimesAnnuelles primes={ok.primes} /> })
  }
  const budget = ok?.complet.budgetMobilite ?? null
  if (
    saisie.choixMobilite === 'budgetMobilite' &&
    budget !== null &&
    (budget.pilier3MensuelBrutCentimes > 0 || budget.piliers1Et2AnnuelCentimes > 0)
  ) {
    ongletsResultats.push({ id: 'budgetMobilite', libelle: fr.onglets.budgetMobilite, contenu: <BudgetMobilite budget={budget} /> })
  }
```

La condition de l'onglet du budget reprend celle du composant `BudgetMobilite`, qui ne rend rien pour un budget nul : un onglet vide n'aurait rien à montrer.

Puis le rendu :

```tsx
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold">{fr.titre}</h1>
          <p className="text-slate-600 dark:text-slate-400">{fr.sousTitre}</p>
        </header>

        <BandeauEstimation avantagesActifs={etat.avantagesActifs} />

        <main className="grid gap-6 lg:grid-cols-12 lg:items-start">
          <div className="order-2 lg:order-1 lg:col-span-7">
            <FormulaireSituation
              saisie={saisie}
              erreurs={erreurs}
              netMaxCentimes={netMaxCentimes}
              plafondTeletravailCentimes={etat.plafondsAvantages?.teletravailMaxCentimes ?? null}
              plafondEcochequesCentimes={etat.plafondsAvantages?.ecochequesMaxAnnuelCentimes ?? null}
              apercuAtnCentimes={ok?.complet.atn.voiture?.mensuelCentimes ?? null}
              onChange={modifier}
              onBasculerSens={basculer}
            />
          </div>
          <section
            aria-label={fr.resultats}
            className="order-1 space-y-4 lg:sticky lg:top-4 lg:order-2 lg:col-span-5 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
          >
            <AlertesCalcul etat={etat} />
            <Recapitulatif
              sens={saisie.sens}
              complet={ok?.complet ?? null}
              brutCentimes={ok?.brutCentimes ?? null}
              netCibleCentimes={ok?.netCibleCentimes ?? null}
              avantagesActifs={etat.avantagesActifs}
            />
            <OngletsResultats onglets={ongletsResultats} />
          </section>
        </main>
      </div>
    </div>
  )
```

- [ ] **Étape 5 : faire passer les tests existants, sans les affaiblir**

Commande : `npx vitest run src/App.test.tsx`

Les tests qui lisent le panneau des primes ou celui du budget mobilité échouent maintenant, puisque ces panneaux sont dans des onglets non sélectionnés. Pour chacun, ajoute `choisirOnglet('13e mois et pécule')` ou `choisirOnglet('Budget mobilité')` **avant la première affirmation qui porte sur ce panneau** — et, pour un test qui vérifie une *absence* dans ce panneau, avant cette affirmation aussi. Le panneau du détail du calcul est l'onglet par défaut : les tests qui le lisent ne changent pas, sauf s'ils ont choisi un autre onglet auparavant.

Même règle qu'à la tâche 5 : **aucune valeur attendue ni aucune affirmation ne change, aucun test n'est supprimé**, et le nombre d'`expect(` ne baisse pas. Donne les chiffres avant et après, et la liste des tests modifiés.

- [ ] **Étape 6 : le statut de la spec**

Dans `docs/superpowers/specs/2026-09-25-ergonomie-interface-design.md`, passe le statut de `en cours de rédaction` à `appliquée`. Si l'implémentation s'est écartée de la spec sur un point, corrige la phrase concernée pour qu'elle décrive le code livré, sans changer le fond.

- [ ] **Étape 7 : vérifier et commiter**

```bash
npm test && npm run typecheck && npm run lint && npm run build
git add src/App.tsx src/components/Avertissements.tsx src/i18n/fr.ts src/App.test.tsx docs/superpowers/specs/2026-09-25-ergonomie-interface-design.md
git commit -m "$(cat <<'EOF'
feat: résultat fixé à droite et résultats en onglets

<ligne Co-Authored-By de ton rappel système>
EOF
)"
```

---

## Après la dernière tâche

- Relecture finale de toute la branche, sur le modèle des sous-projets précédents.
- **Vérification visuelle par le contrôleur**, que jsdom ne peut pas faire : lancer l'app (`npm run dev`), prendre des captures à 1 440 px et à 390 px de large, et vérifier que la colonne de résultat reste fixée en faisant défiler une section ouverte, que le formulaire replié tient à l'écran, et que rien ne déborde sur téléphone.
- **Ni push ni merge** sans demande explicite de l'utilisateur.
