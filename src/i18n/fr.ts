import type { IdLigne, RevenusConjoint } from '../engine/types'
import type { CodeErreur, SensCalcul } from '../engine/validation'

export const fr = {
  titre: 'Salaire net Belgique',
  sousTitre: 'Du brut au net pour un employé à temps plein',
  bandeauEstimation: 'Estimation pour un employé à temps plein. Ne remplace pas une fiche de paie.',

  formulaire: {
    titre: 'Votre situation',
    montant: {
      brutVersNet: 'Salaire brut mensuel (€)',
      netVersBrut: 'Salaire net mensuel souhaité (€)',
    } satisfies Record<SensCalcul, string>,
    etatCivil: 'État civil',
    isole: 'Isolé',
    marieOuCohabitant: 'Marié ou cohabitant légal',
    revenusConjoint: 'Revenus du conjoint',
    aideRevenusConjoint: 'Montants « nets » : revenus bruts, moins les cotisations sociales obligatoires, moins 20 %.',
    enfants: 'Enfants à charge',
    parentIsole: 'Je suis parent isolé (veuf, célibataire, divorcé ou séparé de fait)',
  },

  revenusConjoint: {
    aucun: 'Pas de revenus professionnels',
    pensionMax174: 'Uniquement pension ou rente, max 174 € nets/mois',
    pensionMax579: 'Uniquement pension ou rente, max 579 € nets/mois',
    autresMax290: 'Autres revenus professionnels, max 290 € nets/mois',
    superieurs: 'Revenus supérieurs à ces plafonds',
  } satisfies Record<RevenusConjoint, string>,

  erreurs: {
    montantVide: {
      brutVersNet: 'Indiquez votre salaire brut mensuel.',
      netVersBrut: 'Indiquez le salaire net mensuel souhaité.',
    },
    montantFormat: 'Montant invalide : utilisez des chiffres, avec au maximum 2 décimales (ex. 3000,50).',
    montantHorsLimites: 'Le montant doit être compris entre 0,01 € et 100 000 €.',
    enfantsInvalide: 'Indiquez un nombre entier entre 0 et 10.',
  } satisfies Record<CodeErreur, string | Record<SensCalcul, string>>,

  lignes: {
    brut: { libelle: 'Salaire brut', explication: 'Le salaire brut mensuel prévu par votre contrat.' },
    onss: { libelle: 'Cotisations ONSS (13,07 %)', explication: 'Cotisation personnelle de sécurité sociale, retenue sur le brut.' },
    bonusVoletA: {
      libelle: 'Bonus à l’emploi — volet A',
      explication: 'Réduction des cotisations ONSS pour les bas salaires. Elle diminue quand le salaire augmente et disparaît au-delà d’un plafond.',
    },
    bonusVoletB: {
      libelle: 'Bonus à l’emploi — volet B',
      explication: 'Réduction supplémentaire des cotisations ONSS pour les très bas salaires.',
    },
    imposableMensuel: {
      libelle: 'Rémunération imposable',
      explication: 'Le brut moins les cotisations ONSS réellement retenues. C’est la base du précompte professionnel.',
    },
    precompteAvantBonus: {
      libelle: 'Précompte professionnel',
      explication:
        'Impôt retenu à la source. Il est calculé sur une base annuelle (frais forfaitaires, barème progressif, quotité exemptée, réductions pour enfants et situation familiale) puis divisé par 12. Il inclut un forfait de 7 % de taxe communale.',
    },
    bonusFiscal: {
      libelle: 'Bonus fiscal à l’emploi',
      explication: 'Réduction du précompte liée au bonus à l’emploi : 33,14 % du volet A et 52,54 % du volet B, sans pouvoir rendre le précompte négatif.',
    },
    cotisationSpeciale: {
      libelle: 'Cotisation spéciale de sécurité sociale',
      explication: 'Retenue dont le montant dépend du salaire et de la situation du ménage (isolé, ou conjoint avec ou sans revenus).',
    },
    net: { libelle: 'Salaire net', explication: 'Le montant versé sur votre compte chaque mois.' },
  } satisfies Record<IdLigne, { libelle: string; explication: string }>,

  recapitulatif: {
    titre: 'Votre salaire net',
    netMensuel: 'Net mensuel',
    netAnnuel: 'Net annuel (× 12)',
    horsExtras: 'Hors 13e mois et pécule de vacances',
    tauxRetour: 'Taux de retour',
    periode: (du: string, au: string) => `Règles en vigueur du ${du} au ${au}`,
  },

  detail: {
    titre: 'Détail du calcul',
    explicationDe: (libelle: string) => `Explication : ${libelle}`,
    source: 'Source',
  },

  alertes: {
    saisieInvalide: 'Corrigez la saisie pour voir le calcul.',
    periodeNonCouverte: (date: string) => `Les règles pour le ${date} ne sont pas encore intégrées.`,
    sousRmmmg: (montant: string) =>
      `Ce brut est inférieur au salaire minimum légal pour un temps plein (${montant}). Le calcul reste indicatif.`,
  },
}

/** Message d'une erreur de saisie, adapté au sens du calcul quand il le faut. */
export function texteErreur(code: CodeErreur, sens: SensCalcul): string {
  const texte = fr.erreurs[code]
  return typeof texte === 'string' ? texte : texte[sens]
}