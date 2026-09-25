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
