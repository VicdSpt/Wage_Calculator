import { describe, expect, it } from 'vitest'
import { calculerNet } from '../engine/calculerNet'
import { getParametres } from '../engine/parametres'
import { SAISIE_PAR_DEFAUT, type SaisieFormulaire } from '../engine/validation'
import { calculerEtat } from './useCalcul'

const DATE = '2026-09-14'
const RMMMG = 223_361
const PLAFONDS = getParametres(DATE).avantages

function saisie(modif: Partial<SaisieFormulaire>): SaisieFormulaire {
  return { ...SAISIE_PAR_DEFAUT, ...modif }
}

describe('calculerEtat', () => {
  it('brut → net : calcule le net du brut saisi', () => {
    const etat = calculerEtat(SAISIE_PAR_DEFAUT, DATE)
    expect(etat).toMatchObject({ etat: 'ok', sens: 'brutVersNet', brutCentimes: 300_000, netCibleCentimes: null, rmmmgCentimes: RMMMG })
    expect(etat.etat === 'ok' && etat.resultat.netMensuelCentimes).toBe(226_133)
  })

  it('net → brut : trouve le plus petit brut et garde la cible', () => {
    const etat = calculerEtat(saisie({ sens: 'netVersBrut', montant: '2261,33' }), DATE)
    expect(etat).toMatchObject({ etat: 'ok', sens: 'netVersBrut', brutCentimes: 299_996, netCibleCentimes: 226_133, rmmmgCentimes: RMMMG })
    expect(etat.etat === 'ok' && etat.resultat).toEqual(
      calculerNet({ brutMensuelCentimes: 299_996, etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false, atnMensuelCentimes: 0 }, DATE),
    )
  })

  it('net → brut : signale un net au-delà du maximum atteignable', () => {
    expect(calculerEtat(saisie({ sens: 'netVersBrut', montant: '50000' }), DATE)).toEqual({
      etat: 'netHorsLimites',
      netMaxCentimes: 4_146_374,
      avantagesActifs: false,
      plafondsAvantages: PLAFONDS,
    })
  })

  it.each(['brutVersNet', 'netVersBrut'] as const)('%s : renvoie les erreurs de saisie', (sens) => {
    expect(calculerEtat(saisie({ sens, montant: '' }), DATE)).toEqual({
      etat: 'saisieInvalide',
      erreurs: { montant: 'montantVide' },
      avantagesActifs: false,
      plafondsAvantages: PLAFONDS,
    })
  })

  it.each(['brutVersNet', 'netVersBrut'] as const)('%s : signale une période non couverte', (sens) => {
    expect(calculerEtat(saisie({ sens }), '2027-01-15')).toEqual({
      etat: 'periodeNonCouverte',
      dateIso: '2027-01-15',
      avantagesActifs: false,
      plafondsAvantages: null,
    })
  })
})

describe('calculerEtat — avantages extralégaux', () => {
  const AVEC_TITRES = {
    ...SAISIE_PAR_DEFAUT.avantages,
    titresRepasActif: true,
    teletravailActif: true,
  }

  it('brut → net : expose le résultat complet et les plafonds de la période', () => {
    const etat = calculerEtat(saisie({ avantages: AVEC_TITRES }), DATE)
    expect(etat.etat).toBe('ok')
    if (etat.etat !== 'ok') return
    expect(etat.avantagesActifs).toBe(true)
    expect(etat.complet.netVerseCentimes).toBe(226_133 - 2_180 + 16_099)
    expect(etat.complet.totalMensuelCentimes).toBe(226_133 - 2_180 + 16_099 + 20_000)
    expect(etat.plafondsAvantages.teletravailMaxCentimes).toBe(16_421)
  })

  it('sans avantage, avantagesActifs vaut false et le net versé égale le net légal', () => {
    const etat = calculerEtat(SAISIE_PAR_DEFAUT, DATE)
    expect(etat.etat === 'ok' && etat.avantagesActifs).toBe(false)
    expect(etat.etat === 'ok' && etat.complet.netVerseCentimes).toBe(226_133)
  })

  it('net → brut : la cible est le net versé', () => {
    const etat = calculerEtat(saisie({ sens: 'netVersBrut', montant: '2400,52', avantages: AVEC_TITRES }), DATE)
    expect(etat.etat).toBe('ok')
    if (etat.etat !== 'ok') return
    expect(etat.netCibleCentimes).toBe(240_052)
    expect(etat.complet.netVerseCentimes).toBeGreaterThanOrEqual(240_052)
    expect(etat.brutCentimes).toBe(299_996)
  })

  it('renvoie les erreurs des champs d’avantage', () => {
    const etat = calculerEtat(saisie({ avantages: { ...AVEC_TITRES, joursPrestes: '99' } }), DATE)
    expect(etat).toEqual({
      etat: 'saisieInvalide',
      erreurs: { joursPrestes: 'joursInvalide' },
      avantagesActifs: true,
      plafondsAvantages: PLAFONDS,
    })
  })

  it('garde avantagesActifs et les plafonds même quand le montant principal est invalide', () => {
    const etat = calculerEtat(saisie({ montant: '', avantages: AVEC_TITRES }), DATE)
    expect(etat).toEqual({
      etat: 'saisieInvalide',
      erreurs: { montant: 'montantVide' },
      avantagesActifs: true,
      plafondsAvantages: PLAFONDS,
    })
  })
})
