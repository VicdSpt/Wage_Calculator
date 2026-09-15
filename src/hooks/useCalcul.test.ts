import { describe, expect, it } from 'vitest'
import { calculerNet } from '../engine/calculerNet'
import { SAISIE_PAR_DEFAUT, type SaisieFormulaire } from '../engine/validation'
import { calculerEtat } from './useCalcul'

const DATE = '2026-09-14'
const RMMMG = 223_361

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
      calculerNet({ brutMensuelCentimes: 299_996, etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false }, DATE),
    )
  })

  it('net → brut : signale un net au-delà du maximum atteignable', () => {
    expect(calculerEtat(saisie({ sens: 'netVersBrut', montant: '50000' }), DATE)).toEqual({ etat: 'netHorsLimites', netMaxCentimes: 4_146_374 })
  })

  it.each(['brutVersNet', 'netVersBrut'] as const)('%s : renvoie les erreurs de saisie', (sens) => {
    expect(calculerEtat(saisie({ sens, montant: '' }), DATE)).toEqual({ etat: 'saisieInvalide', erreurs: { montant: 'montantVide' } })
  })

  it.each(['brutVersNet', 'netVersBrut'] as const)('%s : signale une période non couverte', (sens) => {
    expect(calculerEtat(saisie({ sens }), '2027-01-15')).toEqual({ etat: 'periodeNonCouverte', dateIso: '2027-01-15' })
  })
})
