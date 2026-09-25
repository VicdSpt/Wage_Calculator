import type { IdLigne, RevenusConjoint } from '../engine/types'
import type { CodeAlerteAvantage, ChoixMobilite } from '../engine/avantages'
import type { Carburant } from '../engine/atnVoiture'
import type { CodeErreur, ModeAtn, SensCalcul } from '../engine/validation'

export const fr = {
  titre: 'Salaire net Belgique',
  sousTitre: 'Du brut au net, ou du net au brut, pour un employé à temps plein',
  bandeauEstimation: 'Estimation pour un employé à temps plein. Ne remplace pas une fiche de paie.',

  formulaire: {
    titre: 'Votre situation',
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
    sens: 'Sens du calcul',
    sensOptions: { brutVersNet: 'Brut → net', netVersBrut: 'Net → brut' } satisfies Record<SensCalcul, string>,
    netHorsLimites: (netMax: string) => `Au-delà de ${netMax} net, le brut nécessaire dépasse 100 000 €.`,
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
    atn: 'Avantage de toute nature mensuel (€)',
    aideAtn: 'Voiture de société par exemple. Montant de l’avantage repris sur votre fiche de paie, avant déduction de votre contribution personnelle. 0 si vous n’en avez pas.',
    parentIsole: 'Je suis parent isolé (veuf, célibataire, divorcé ou séparé de fait)',
    voiture: {
      titre: 'Voiture de société / avantage de toute nature',
      modes: { montant: 'Je connais le montant', voiture: 'Calculer depuis la voiture' } satisfies Record<ModeAtn, string>,
      valeurCatalogue: 'Valeur catalogue (€)',
      aideValeurCatalogue: 'Prix catalogue à l’état neuf, options et TVA réellement payée comprises, sans les remises.',
      carburant: 'Carburant',
      carburants: { essence: 'Essence, LPG ou gaz naturel', diesel: 'Diesel', electrique: 'Électrique' } satisfies Record<Carburant, string>,
      co2: 'Émissions de CO₂ (g/km)',
      aideCo2:
        'Valeur du certificat de conformité ; pour une hybride rechargeable, la valeur pondérée. Les « fausses hybrides » suivent une règle propre, non prise en compte ici.',
      premiereImmatriculation: 'Première immatriculation',
      contribution: 'Contribution personnelle mensuelle (€)',
      aideContribution:
        'Montant que votre employeur retient pour l’usage privé de la voiture. Il réduit l’avantage imposable et se retire du net versé.',
      apercu: (montant: string) => `ATN : ${montant} par mois`,
    },
    mobilite: {
      titre: 'Voiture ou budget mobilité',
      aide: 'Le budget mobilité s’obtient en échange de la voiture de société, ou du droit d’en avoir une : les deux ne se cumulent pas.',
      choix: {
        aucun: 'Aucun',
        voiture: 'Voiture de société',
        budgetMobilite: 'Budget mobilité',
      } satisfies Record<ChoixMobilite, string>,
      budgetAnnuel: 'Budget mobilité annuel (€)',
      aideBudgetAnnuel: 'Montant annuel communiqué par votre employeur.',
      pilier3: 'Part prise en cash, pilier 3 (€ par an)',
      aidePilier3:
        'Le solde que vous ne dépensez pas en voiture zéro émission (pilier 1) ni en transports durables et frais de logement (pilier 2). Seule cette part est versée sur votre compte.',
    },
    primes: {
      titre: '13e mois et pécule de vacances',
      treizieme: '13e mois',
      treiziemePourcentage: 'Pourcentage du salaire mensuel (%)',
      aideTreiziemePourcentage: '100 correspond à un mois complet. Certaines conventions donnent davantage.',
      treiziemeMoisPrestes: 'Mois prestés cette année',
      pecule: 'Double pécule de vacances',
      peculeMoisPrestes: 'Mois prestés l’année précédente',
      aidePeculeMoisPrestes: 'C’est l’année précédente qui ouvre le droit au pécule.',
    },
    avantages: {
      titre: 'Avantages extralégaux',
      titresRepas: 'Titres-repas',
      joursPrestes: 'Jours prestés dans le mois',
      valeurFaciale: 'Valeur faciale du titre (€)',
      partTravailleur: 'Part du travailleur (€)',
      teletravail: 'Indemnité de télétravail',
      teletravailMontant: 'Montant mensuel (€)',
      ecocheques: 'Écochèques',
      ecochequesMontant: 'Montant annuel (€)',
      fraisPropres: 'Frais propres à l’employeur',
      fraisPropresMontant: 'Montant mensuel remboursé (€)',
      aideFraisPropres: 'Remboursements de frais réels (déplacements, matériel). Ni imposés ni soumis à l’ONSS, sans plafond.',
      plafond: (montant: string) => `Plafond ONSS : ${montant}`,
      plafondAnnuel: (montant: string) => `Plafond ONSS : ${montant} par an`,
    },
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
    joursInvalide: 'Indiquez un nombre entier de jours prestés entre 0 et 23.',
    valeurFacialeInvalide: 'Indiquez un montant valide, supérieur à 0 et au maximum 20 € par titre-repas.',
    partTravailleurInvalide: 'Indiquez un montant valide, au maximum 20 € par titre-repas.',
    partTravailleurSuperieure: 'La part du travailleur ne peut pas dépasser la valeur faciale du titre-repas.',
    teletravailInvalide: 'Indiquez un montant valide, au maximum 1 000 € par mois.',
    ecochequesInvalide: 'Indiquez un montant valide, au maximum 2 000 € par an.',
    atnInvalide: 'Indiquez un montant entre 0,00 € et 10 000,00 €.',
    fraisPropresInvalide: 'Indiquez un montant entre 0,00 € et 5 000,00 €.',
    valeurCatalogueInvalide: 'Indiquez une valeur catalogue entre 0,01 € et 770 000,00 €.',
    co2Invalide: 'Indiquez des émissions de CO₂ en grammes par km : un nombre entier entre 0 et 500.',
    immatriculationInvalide: 'Indiquez le mois de première immatriculation, au plus tard le mois du calcul.',
    contributionInvalide: 'Indiquez un montant entre 0,00 € et 10 000,00 €.',
    pourcentagePrimeInvalide: 'Indiquez un pourcentage entre 0 et 200 (100 = un mois de salaire).',
    moisPrestesInvalide: 'Indiquez un nombre entier de mois prestés, entre 0 et 12.',
    budgetMobiliteInvalide: 'Indiquez un montant entre 0,00 € et 50 000,00 €.',
    pilier3Invalide: 'Indiquez un montant entre 0,00 € et 50 000,00 €.',
    pilier3SuperieurAuBudget: 'La part prise en cash ne peut pas dépasser le budget annuel.',
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
    atn: {
      libelle: 'Avantage de toute nature',
      explication:
        'Valeur de l’avantage reçu en nature, par exemple une voiture de société, après déduction de votre contribution personnelle. Il n’est pas versé en argent, mais il augmente la base du précompte professionnel.',
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
    atnRetenu: {
      libelle: 'Avantage de toute nature (retenu)',
      explication:
        'Le montant ajouté plus haut ressort ici : il n’arrive pas sur le compte, il n’a servi qu’à calculer l’impôt. Les deux lignes s’annulent.',
    },
    net: { libelle: 'Salaire net', explication: 'Le montant versé sur votre compte chaque mois.' },
  } satisfies Record<IdLigne, { libelle: string; explication: string }>,

  lignesAvantages: {
    retenueTitres: {
      libelle: 'Part personnelle des titres-repas',
      explication: 'Votre part dans les titres-repas, retenue sur le net. Elle est d’au moins 1,09 € par titre.',
      source: 'ONSS — titres-repas',
    },
    teletravail: {
      libelle: 'Indemnité de télétravail',
      explication:
        'Forfait de frais propres à l’employeur, versé avec le salaire. Ni imposé ni soumis à l’ONSS tant qu’il reste sous le plafond mensuel.',
      source: 'ONSS — frais propres à l’employeur',
    },
    fraisPropres: {
      libelle: 'Frais propres à l’employeur',
      explication:
        'Remboursement de frais réels engagés pour le travail (déplacements, matériel). Ni imposé ni soumis à l’ONSS, sans plafond.',
      source: 'ONSS — frais propres à l’employeur',
    },
    contributionVoiture: {
      libelle: 'Contribution personnelle voiture',
      explication:
        'Ce que votre employeur retient pour l’usage privé de la voiture de société. Elle réduit du même montant l’avantage imposable, sans pouvoir le rendre négatif.',
      source: 'Art. 36 § 2 CIR 92 — intervention du bénéficiaire',
    },
    pilier3BudgetMobilite: {
      libelle: 'Pilier 3 net du budget mobilité',
      explication:
        'La part du budget mobilité prise en cash, mensualisée et diminuée de la cotisation spéciale de sécurité sociale. Elle s’ajoute au net versé, exonérée d’impôt.',
      source: 'Loi du 17/03/2019, budget mobilité',
    },
    netVerse: {
      libelle: 'Net versé',
      explication:
        'Ce qui arrive réellement sur votre compte : le net du salaire, moins votre part dans les titres-repas et la contribution voiture, plus l’indemnité de télétravail, les frais propres remboursés et le pilier 3 net du budget mobilité.',
      source: 'Net − part personnelle des titres-repas + indemnité de télétravail + frais propres − contribution voiture + pilier 3 net du budget mobilité',
    },
  },

  atnVoiture: {
    /** « 45 000,00 € × 94 % × 6/7 × 8,8 % = 3 190,63 € par an[ ; le minimum légal …], soit 265,89 € par mois. » */
    explication: (p: { valeur: string; age: string; pourcentage: string; annuelFormule: string; minimum: string | null; mensuel: string }) =>
      `${p.valeur} × ${p.age} × 6/7 × ${p.pourcentage} = ${p.annuelFormule} par an${p.minimum === null ? '' : ` ; le minimum légal de ${p.minimum} par an s’applique`}, soit ${p.mensuel} par mois.`,
    contribution: (montant: string) => ` Contribution personnelle déduite : ${montant}.`,
    source: 'Art. 36 § 2 CIR 92 ; émissions de CO₂ de référence fixées chaque année par arrêté royal',
  },

  primes: {
    titre: '13e mois et pécule de vacances',
    treizieme: '13e mois',
    pecule: 'Double pécule de vacances',
    brut: {
      libelle: 'Brut',
      explication: 'Le montant brut de la prime, avant toute retenue.',
      source: 'Salaire mensuel × pourcentage, proratisé par les mois prestés',
    },
    retenueOnss: {
      libelle: 'Cotisations ONSS (13,07 %)',
      explication: 'Le 13e mois est de la rémunération ordinaire : il supporte les mêmes cotisations que le salaire.',
      source: 'ONSS — cotisation personnelle',
    },
    retenuePecule: {
      libelle: 'Retenue ONSS (13,07 %)',
      explication:
        'Le double pécule n’est pas soumis aux cotisations ordinaires, mais à une retenue propre, au même taux et sur 85 % seulement du montant — la part fixée par l’ONSS, qui exclut la rémunération à partir du 3e jour de la 4e semaine de vacances.',
      source: 'ONSS — retenue sur le double pécule de vacances',
    },
    precompte: { libelle: 'Précompte professionnel', source: 'SPF Finances — barème des allocations exceptionnelles' },
    /** « 43,41 % : rémunération annuelle de 32 621,28 €, tranche jusqu’à 34 640,00 €. » */
    explicationPrecompte: (p: { taux: string; base: string; tranche: string | null; reduction: string | null }) =>
      `${p.taux} : rémunération annuelle de ${p.base}, ${p.tranche === null ? 'dernière tranche du barème' : `tranche jusqu’à ${p.tranche}`}.` +
      (p.reduction === null ? '' : ` Réduction pour enfants à charge : ${p.reduction}.`),
    net: {
      libelle: 'Net',
      explication: 'Ce qui reste de la prime après la retenue sociale et le précompte.',
      source: 'Brut − retenue − précompte',
    },
    noteCotisationSpeciale:
      'La cotisation spéciale de sécurité sociale se calcule par trimestre : elle n’est pas recalculée ici, le net d’une prime est donc un peu optimiste sur le trimestre où elle tombe.',
  },

  budgetMobilite: {
    titre: 'Budget mobilité',
    pilier3Brut: {
      libelle: 'Pilier 3, part en cash',
      explication: 'Le solde du budget annuel que vous prenez en argent, ramené au mois.',
      source: 'Loi du 17/03/2019, budget mobilité',
    },
    cotisation: {
      libelle: 'Cotisation spéciale de sécurité sociale',
      explication: 'Retenue propre au pilier 3. Ce montant n’est pas imposé, mais il supporte cette cotisation.',
      source: 'Loi du 17/03/2019, budget mobilité',
    },
    net: {
      libelle: 'Net versé en plus, par mois',
      explication: 'S’ajoute à votre net mensuel : il est exonéré d’impôt.',
      source: 'Loi du 17/03/2019, budget mobilité',
    },
    piliers1Et2: (montant: string) =>
      `Reste ${montant} par an pour les piliers 1 et 2 (voiture zéro émission, transports durables, logement), exonérés et non détaillés ici.`,
  },

  recapitulatif: {
    titre: { brutVersNet: 'Votre salaire net', netVersBrut: 'Votre salaire brut' } satisfies Record<SensCalcul, string>,
    netMensuel: 'Net mensuel',
    netAnnuel: 'Net annuel (× 12)',
    brutNecessaire: 'Brut mensuel nécessaire',
    netObtenu: 'Net obtenu',
    ecart: (montant: string) => `${montant} de plus que demandé : aucun brut ne donne exactement ce net`,
    brutAnnuel: 'Brut annuel (× 12)',
    horsExtras: 'Hors 13e mois et pécule de vacances',
    tauxRetour: 'Taux de retour',
    periode: (du: string, au: string) => `Règles en vigueur du ${du} au ${au}`,
    netVerse: 'Net versé sur le compte',
    detailNetVerse: (net: string, retenue: string, teletravail: string, fraisPropres: string, contribution: string, budgetMobilite: string) =>
      [`net légal ${net}`, retenue, teletravail, fraisPropres, contribution, budgetMobilite].filter((partie) => partie !== '').join(' '),
    retenueTitres: (montant: string) => `− ${montant} de titres-repas`,
    plusTeletravail: (montant: string) => `+ ${montant} de télétravail`,
    plusFraisPropres: (montant: string) => `+ ${montant} de frais propres`,
    moinsContribution: (montant: string) => `− ${montant} de contribution voiture`,
    plusBudgetMobilite: (montant: string) => `+ ${montant} de budget mobilité`,
    avantagesRecus: 'Avantages reçus',
    titresRecus: (nombre: number, valeur: string) => `${nombre} titres-repas de ${valeur}`,
    totalMensuel: 'Total mensuel',
    ecocheques: 'Écochèques',
    parAn: (montant: string) => `${montant} par an`,
  },

  detail: {
    titre: 'Détail du calcul',
    explicationDe: (libelle: string) => `Explication : ${libelle}`,
    source: 'Source',
    explicationBrutTrouve: 'Le plus petit brut mensuel qui donne au moins le net demandé.',
  },

  alertes: {
    saisieInvalide: 'Corrigez la saisie pour voir le calcul.',
    periodeNonCouverte: (date: string) => `Les règles pour le ${date} ne sont pas encore intégrées.`,
    sousRmmmg: (montant: string) =>
      `Ce brut est inférieur au salaire minimum légal pour un temps plein (${montant}). Le calcul reste indicatif.`,
    budgetMobiliteHorsBornes: (montant: string, min: string, max: string) =>
      `Budget de ${montant} par an : hors des bornes légales (${min} à ${max}). Le calcul reste indicatif.`,
    conditionsAvantages:
      'Les avantages sont supposés conformes aux conditions d’exonération (convention collective, un titre par jour presté, télétravail structurel).',
    avantages: {
      partPatronaleTitres: (montant: string, plafond: string) =>
        `Part patronale de ${montant} : au-delà de ${plafond}, le titre-repas devient du salaire soumis à l’ONSS et à l’impôt. Le calcul ne tient pas compte de ce basculement.`,
      partTravailleurTitres: (montant: string, plancher: string) =>
        `Part du travailleur de ${montant} : en dessous de ${plancher}, le titre-repas devient du salaire.`,
      valeurFacialeTitres: (montant: string, plafond: string) =>
        `Valeur faciale de ${montant} : au-delà de ${plafond}, le titre-repas devient du salaire.`,
      teletravail: (montant: string, plafond: string) =>
        `Indemnité de ${montant} : au-delà de ${plafond} par mois, l’excédent est soumis à l’ONSS et à l’impôt.`,
      ecocheques: (montant: string, plafond: string) =>
        `Écochèques de ${montant} par an : au-delà de ${plafond} par an, l’excédent devient du salaire.`,
    } satisfies Record<CodeAlerteAvantage, (montant: string, plafond: string) => string>,
  },
}

/** Message d'une erreur de saisie, adapté au sens du calcul quand il le faut. */
export function texteErreur(code: CodeErreur, sens: SensCalcul): string {
  const texte = fr.erreurs[code]
  return typeof texte === 'string' ? texte : texte[sens]
}