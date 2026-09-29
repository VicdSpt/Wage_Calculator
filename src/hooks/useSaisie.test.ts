import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SAISIE_BUDGET_MOBILITE_PAR_DEFAUT, SAISIE_PAR_DEFAUT, SAISIE_PRIMES_PAR_DEFAUT, SAISIE_VOITURE_PAR_DEFAUT, type SaisieFormulaire } from '../engine/validation'
import {
  CHAMPS_FAMILLE,
  CLE_COMPARAISON,
  CLE_STOCKAGE,
  CLE_STOCKAGE_V1,
  CLE_STOCKAGE_V2,
  CLE_STOCKAGE_V3,
  CLE_STOCKAGE_V4,
  CLE_STOCKAGE_V5,
  CLE_STOCKAGE_V6,
  lireOffresStockees,
  lireSaisieStockee,
  useSaisie,
} from './useSaisie'
import { calculerEtat } from './useCalcul'

const V1 = { brut: '2500', etatCivil: 'marieOuCohabitant', revenusConjoint: 'superieurs', enfantsACharge: '2', parentIsole: false }

describe('lireSaisieStockee', () => {
  it('utilise la clé v7 en écriture, v6, v5, v4, v3, v2 et v1 en reprise', () => {
    expect(CLE_STOCKAGE).toBe('wage-calculator:saisie:v7')
    expect(CLE_STOCKAGE_V6).toBe('wage-calculator:saisie:v6')
    expect(CLE_STOCKAGE_V5).toBe('wage-calculator:saisie:v5')
    expect(CLE_STOCKAGE_V4).toBe('wage-calculator:saisie:v4')
    expect(CLE_STOCKAGE_V3).toBe('wage-calculator:saisie:v3')
    expect(CLE_STOCKAGE_V2).toBe('wage-calculator:saisie:v2')
    expect(CLE_STOCKAGE_V1).toBe('wage-calculator:saisie:v1')
  })

  it('renvoie la saisie par défaut si rien n’est stocké', () => {
    expect(lireSaisieStockee()).toEqual(SAISIE_PAR_DEFAUT)
  })

  it('restaure une saisie v2 valide', () => {
    const stockee = { ...SAISIE_PAR_DEFAUT, sens: 'netVersBrut', montant: '2500', montantAvantBascule: '3000' }
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(stockee))
    expect(lireSaisieStockee()).toEqual(stockee)
  })

  it('reprend une saisie v1 en brut → net', () => {
    localStorage.setItem(CLE_STOCKAGE_V1, JSON.stringify(V1))
    expect(lireSaisieStockee()).toEqual({
      sens: 'brutVersNet',
      montant: '2500',
      periode: SAISIE_PAR_DEFAUT.periode,
      montantAvantBascule: null,
      atn: '0',
      etatCivil: 'marieOuCohabitant',
      revenusConjoint: 'superieurs',
      enfantsACharge: '2',
      parentIsole: false,
      avantages: SAISIE_PAR_DEFAUT.avantages,
      voiture: SAISIE_VOITURE_PAR_DEFAUT,
      primes: SAISIE_PRIMES_PAR_DEFAUT,
      choixMobilite: SAISIE_PAR_DEFAUT.choixMobilite,
      budgetMobilite: SAISIE_BUDGET_MOBILITE_PAR_DEFAUT,
    })
  })

  it('préfère la clé v2 à la clé v1', () => {
    localStorage.setItem(CLE_STOCKAGE_V1, JSON.stringify(V1))
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, montant: '4200' }))
    expect(lireSaisieStockee().montant).toBe('4200')
  })

  it('se rabat sur la clé v1 si la clé v2 est corrompue', () => {
    localStorage.setItem(CLE_STOCKAGE, '{corrompu')
    localStorage.setItem(CLE_STOCKAGE_V1, JSON.stringify(V1))
    expect(lireSaisieStockee().montant).toBe('2500')
  })

  it.each([
    'pas du json',
    '{"montant":2500}',
    JSON.stringify({ ...SAISIE_PAR_DEFAUT, revenusConjoint: 'inconnu' }),
    JSON.stringify({ ...SAISIE_PAR_DEFAUT, sens: 'autre' }),
    JSON.stringify({ ...SAISIE_PAR_DEFAUT, montantAvantBascule: 3000 }),
  ])('ignore un contenu v2 invalide : %s', (contenu) => {
    localStorage.setItem(CLE_STOCKAGE, contenu)
    expect(lireSaisieStockee()).toEqual(SAISIE_PAR_DEFAUT)
  })

  it.each(['pas du json', '{"brut":2500}', JSON.stringify({ ...V1, etatCivil: 'inconnu' })])('ignore un contenu v1 invalide : %s', (contenu) => {
    localStorage.setItem(CLE_STOCKAGE_V1, contenu)
    expect(lireSaisieStockee()).toEqual(SAISIE_PAR_DEFAUT)
  })

  it('résiste à un localStorage inaccessible', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqué')
    })
    expect(lireSaisieStockee()).toEqual(SAISIE_PAR_DEFAUT)
  })
})

describe('useSaisie', () => {
  it('mémorise chaque modification dans la clé v2', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.modifier('montant', '4200'))
    expect(result.current.saisie.montant).toBe('4200')
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE) ?? '{}')).toMatchObject({ montant: '4200', sens: 'brutVersNet' })
  })

  it('ne réécrit pas la clé v1', () => {
    localStorage.setItem(CLE_STOCKAGE_V1, JSON.stringify(V1))
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.modifier('montant', '4200'))
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE_V1) ?? '{}')).toEqual(V1)
  })

  it('continue de fonctionner si l’écriture échoue', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.modifier('montant', '4200'))
    expect(result.current.saisie.montant).toBe('4200')
  })
})

describe('useSaisie — bascule de sens', () => {
  it('reprend le montant fourni et garde le montant quitté', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.basculerSens('2261,33'))
    expect(result.current.saisie).toMatchObject({ sens: 'netVersBrut', montant: '2261,33', montantAvantBascule: '3000' })
  })

  it('restaure exactement le montant d’origine au retour, sans modification', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.basculerSens('2261,33'))
    act(() => result.current.basculerSens('2999,96'))
    expect(result.current.saisie).toMatchObject({ sens: 'brutVersNet', montant: '3000', montantAvantBascule: '2261,33' })
    act(() => result.current.basculerSens('2261,33'))
    expect(result.current.saisie).toMatchObject({ sens: 'netVersBrut', montant: '2261,33', montantAvantBascule: '3000' })
  })

  it('reprend le résultat si le montant a été modifié après la bascule', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.basculerSens('2261,33'))
    act(() => result.current.modifier('montant', '2500'))
    expect(result.current.saisie.montantAvantBascule).toBeNull()
    act(() => result.current.basculerSens('3322,15'))
    expect(result.current.saisie).toMatchObject({ sens: 'brutVersNet', montant: '3322,15', montantAvantBascule: '2500' })
  })

  it('oublie le montant quitté si un autre champ change', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.basculerSens('2261,33'))
    act(() => result.current.modifier('enfantsACharge', '2'))
    expect(result.current.saisie.montantAvantBascule).toBeNull()

    act(() => result.current.basculerSens('2950,10'))
    expect(result.current.saisie).toMatchObject({ sens: 'brutVersNet', montant: '2950,10', montantAvantBascule: '2261,33' })
  })

  it('garde le montant tapé si aucun résultat n’est disponible', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.modifier('montant', 'abc'))
    act(() => result.current.basculerSens(null))
    expect(result.current.saisie).toMatchObject({ sens: 'netVersBrut', montant: 'abc', montantAvantBascule: 'abc' })
  })

  it('mémorise le sens et le montant quitté', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.basculerSens('2261,33'))
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE) ?? '{}')).toMatchObject({
      sens: 'netVersBrut',
      montant: '2261,33',
      montantAvantBascule: '3000',
    })
  })

  it('bascule la période et reprend le montant converti', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.basculerPeriode('41760,00'))
    expect(result.current.saisie).toMatchObject({ periode: 'annuel', montant: '41760,00' })
    act(() => result.current.basculerPeriode('3000,00'))
    expect(result.current.saisie).toMatchObject({ periode: 'mensuel', montant: '3000,00' })
  })

  it('garde le montant tapé quand aucun montant converti n’est fourni', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.basculerPeriode(null))
    expect(result.current.saisie).toMatchObject({ periode: 'annuel', montant: SAISIE_PAR_DEFAUT.montant })
  })
})

describe('lireSaisieStockee — reprise de la clé v2', () => {
  const V2 = {
    sens: 'netVersBrut',
    montant: '2500',
    montantAvantBascule: '3000',
    etatCivil: 'isole',
    revenusConjoint: 'aucun',
    enfantsACharge: '1',
    parentIsole: true,
  }

  it('reprend une saisie v2 en ajoutant l’ATN, les avantages, la voiture et les primes par défaut', () => {
    localStorage.setItem(CLE_STOCKAGE_V2, JSON.stringify(V2))
    expect(lireSaisieStockee()).toEqual({
      ...V2,
      periode: SAISIE_PAR_DEFAUT.periode,
      atn: SAISIE_PAR_DEFAUT.atn,
      avantages: SAISIE_PAR_DEFAUT.avantages,
      voiture: SAISIE_VOITURE_PAR_DEFAUT,
      primes: SAISIE_PRIMES_PAR_DEFAUT,
      choixMobilite: SAISIE_PAR_DEFAUT.choixMobilite,
      budgetMobilite: SAISIE_BUDGET_MOBILITE_PAR_DEFAUT,
    })
  })

  it('préfère la clé v7 à la clé v2', () => {
    localStorage.setItem(CLE_STOCKAGE_V2, JSON.stringify(V2))
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, montant: '4200' }))
    expect(lireSaisieStockee().montant).toBe('4200')
  })

  it('garde le reste d’une saisie v7 dont le bloc avantages est invalide, avec les avantages par défaut', () => {
    localStorage.setItem(
      CLE_STOCKAGE,
      JSON.stringify({ ...SAISIE_PAR_DEFAUT, montant: '4200', avantages: { titresRepasActif: 'oui' } }),
    )
    expect(lireSaisieStockee()).toEqual({ ...SAISIE_PAR_DEFAUT, montant: '4200', avantages: SAISIE_PAR_DEFAUT.avantages })
  })

  it('ne réécrit pas la clé v2', () => {
    localStorage.setItem(CLE_STOCKAGE_V2, JSON.stringify(V2))
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.modifier('montant', '4200'))
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE_V2) ?? '{}')).toEqual(V2)
  })
})

describe('lireSaisieStockee — reprise d’une saisie v3 antérieure à l’ATN et aux frais propres', () => {
  it('reprend une saisie v3 sans atn avec l’ATN et les avantages par défaut', () => {
    const {
      periode: _periode,
      atn: _atn,
      choixMobilite: _choixMobilite,
      budgetMobilite: _budgetMobilite,
      ...sansAtn
    } = SAISIE_PAR_DEFAUT
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...sansAtn, montant: '4200' }))
    expect(lireSaisieStockee()).toEqual({
      ...SAISIE_PAR_DEFAUT,
      montant: '4200',
      atn: SAISIE_PAR_DEFAUT.atn,
      avantages: SAISIE_PAR_DEFAUT.avantages,
    })
  })

  it('reprend une saisie v3 dont les avantages n’ont pas les frais propres, avec les avantages par défaut', () => {
    const { fraisPropresActif: _fraisPropresActif, fraisPropres: _fraisPropres, ...avantagesSansFraisPropres } =
      SAISIE_PAR_DEFAUT.avantages
    localStorage.setItem(
      CLE_STOCKAGE,
      JSON.stringify({ ...SAISIE_PAR_DEFAUT, montant: '4200', avantages: avantagesSansFraisPropres }),
    )
    expect(lireSaisieStockee()).toEqual({ ...SAISIE_PAR_DEFAUT, montant: '4200', avantages: SAISIE_PAR_DEFAUT.avantages })
  })

  it('ne fait pas planter le calcul après reprise d’une saisie v3 antérieure à l’ATN', () => {
    const {
      periode: _periode,
      atn: _atn,
      choixMobilite: _choixMobilite,
      budgetMobilite: _budgetMobilite,
      ...sansAtn
    } = SAISIE_PAR_DEFAUT
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(sansAtn))
    expect(() => calculerEtat(lireSaisieStockee(), '2026-09-14')).not.toThrow()
    expect(calculerEtat(lireSaisieStockee(), '2026-09-14').etat).toBe('ok')
  })
})

describe('lireSaisieStockee — voiture de société (v4)', () => {
  const {
    periode: _periodeV3,
    choixMobilite: _choixMobiliteV3,
    budgetMobilite: _budgetMobiliteV3,
    ...SAISIE_PAR_DEFAUT_SANS_MOBILITE
  } = SAISIE_PAR_DEFAUT
  const V3 = { ...SAISIE_PAR_DEFAUT_SANS_MOBILITE, montant: '3500', atn: '270,17', voiture: undefined, primes: undefined }

  it('reprend une saisie v3 complète en mode « je connais le montant », avec la voiture, les primes, le choix de mobilité et le budget mobilité par défaut', () => {
    localStorage.setItem(CLE_STOCKAGE_V3, JSON.stringify(V3))
    expect(lireSaisieStockee()).toEqual({
      ...V3,
      periode: SAISIE_PAR_DEFAUT.periode,
      voiture: SAISIE_VOITURE_PAR_DEFAUT,
      primes: SAISIE_PRIMES_PAR_DEFAUT,
      choixMobilite: SAISIE_PAR_DEFAUT.choixMobilite,
      budgetMobilite: SAISIE_BUDGET_MOBILITE_PAR_DEFAUT,
    })
  })

  it('préfère la clé v7 à la clé v3', () => {
    const v7 = { ...SAISIE_PAR_DEFAUT, montant: '4000' }
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(v7))
    localStorage.setItem(CLE_STOCKAGE_V3, JSON.stringify(V3))
    expect(lireSaisieStockee()).toEqual(v7)
  })

  it('préfère la clé v3 à la clé v2', () => {
    const v2 = { ...SAISIE_PAR_DEFAUT_SANS_MOBILITE, montant: '1234', atn: undefined, avantages: undefined, voiture: undefined }
    localStorage.setItem(CLE_STOCKAGE_V2, JSON.stringify(v2))
    localStorage.setItem(CLE_STOCKAGE_V3, JSON.stringify(V3))
    expect(lireSaisieStockee()).toEqual({
      ...V3,
      periode: SAISIE_PAR_DEFAUT.periode,
      voiture: SAISIE_VOITURE_PAR_DEFAUT,
      primes: SAISIE_PRIMES_PAR_DEFAUT,
      choixMobilite: SAISIE_PAR_DEFAUT.choixMobilite,
      budgetMobilite: SAISIE_BUDGET_MOBILITE_PAR_DEFAUT,
    })
  })

  it('garde le reste d’une saisie v7 dont le bloc voiture est invalide', () => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, montant: '4000', voiture: { mode: 'avion' } }))
    expect(lireSaisieStockee()).toEqual({ ...SAISIE_PAR_DEFAUT, montant: '4000', voiture: SAISIE_VOITURE_PAR_DEFAUT })
  })

  it('restaure une voiture v4 valide', () => {
    const voiture = { ...SAISIE_VOITURE_PAR_DEFAUT, mode: 'voiture', carburant: 'diesel', premiereImmatriculation: '2024-03', contribution: '75' }
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, voiture }))
    expect(lireSaisieStockee().voiture).toEqual(voiture)
  })

  it('ne fait pas planter le calcul après reprise d’une saisie v3', () => {
    localStorage.setItem(CLE_STOCKAGE_V3, JSON.stringify(V3))
    const etat = calculerEtat(lireSaisieStockee(), '2026-09-14')
    expect(etat.etat).toBe('ok')
    expect(etat.etat === 'ok' && etat.resultat.intermediaires.atn).toBe(27_017)
  })

  it('ne réécrit pas la clé v3', () => {
    localStorage.setItem(CLE_STOCKAGE_V3, JSON.stringify(V3))
    renderHook(() => useSaisie())
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE_V3) ?? 'null')).toEqual({ ...V3, voiture: undefined })
  })
})

describe('lireSaisieStockee — primes annuelles (v5)', () => {
  const {
    periode: _periodeV4,
    choixMobilite: _choixMobiliteV4,
    budgetMobilite: _budgetMobiliteV4,
    ...SAISIE_PAR_DEFAUT_SANS_MOBILITE_V4
  } = SAISIE_PAR_DEFAUT
  const V4 = { ...SAISIE_PAR_DEFAUT_SANS_MOBILITE_V4, montant: '4200', primes: undefined }

  it('reprend une saisie v4 avec les primes, le choix de mobilité et le budget mobilité par défaut', () => {
    localStorage.setItem(CLE_STOCKAGE_V4, JSON.stringify(V4))
    expect(lireSaisieStockee()).toEqual({
      ...V4,
      periode: SAISIE_PAR_DEFAUT.periode,
      primes: SAISIE_PRIMES_PAR_DEFAUT,
      choixMobilite: SAISIE_PAR_DEFAUT.choixMobilite,
      budgetMobilite: SAISIE_BUDGET_MOBILITE_PAR_DEFAUT,
    })
  })

  it('préfère la clé v7 à la clé v4', () => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, montant: '5000' }))
    localStorage.setItem(CLE_STOCKAGE_V4, JSON.stringify(V4))
    expect(lireSaisieStockee().montant).toBe('5000')
  })

  it('préfère la clé v4 à la clé v3', () => {
    const v3 = { ...SAISIE_PAR_DEFAUT_SANS_MOBILITE_V4, montant: '1234', voiture: undefined, primes: undefined }
    localStorage.setItem(CLE_STOCKAGE_V4, JSON.stringify(V4))
    localStorage.setItem(CLE_STOCKAGE_V3, JSON.stringify(v3))
    expect(lireSaisieStockee().montant).toBe('4200')
  })

  it('garde le reste d’une saisie v7 dont le bloc primes est invalide', () => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, montant: '4000', primes: { treiziemeActif: 'oui' } }))
    expect(lireSaisieStockee()).toEqual({ ...SAISIE_PAR_DEFAUT, montant: '4000', primes: SAISIE_PRIMES_PAR_DEFAUT })
  })

  it('ne fait pas planter le calcul après reprise d’une saisie v4', () => {
    localStorage.setItem(CLE_STOCKAGE_V4, JSON.stringify(V4))
    const etat = calculerEtat(lireSaisieStockee(), '2026-09-14')
    expect(etat.etat).toBe('ok')
    expect(etat.etat === 'ok' && etat.primes.treizieme).not.toBeNull()
  })

  it('ne réécrit pas la clé v4', () => {
    localStorage.setItem(CLE_STOCKAGE_V4, JSON.stringify(V4))
    renderHook(() => useSaisie())
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE_V4) ?? 'null')).toEqual({ ...V4, primes: undefined })
  })
})

describe('reprise d’une saisie antérieure (v6)', () => {
  const V5 = (() => {
    const { periode: _periode, choixMobilite: _choix, budgetMobilite: _budget, ...reste } = SAISIE_PAR_DEFAUT
    return reste
  })()

  it('lit la clé v7 en priorité', () => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, montant: '4000' }))
    localStorage.setItem(CLE_STOCKAGE_V5, JSON.stringify({ ...V5, montant: '1000' }))
    expect(lireSaisieStockee().montant).toBe('4000')
  })

  it('reprend une saisie v5 en gardant la voiture et sans budget mobilité', () => {
    localStorage.setItem(CLE_STOCKAGE_V5, JSON.stringify({ ...V5, montant: '4000' }))
    const saisie = lireSaisieStockee()
    expect(saisie.montant).toBe('4000')
    // Comportement inchangé pour une saisie existante : la section ATN reste celle d'avant.
    expect(saisie.choixMobilite).toBe('voiture')
    expect(saisie.budgetMobilite).toEqual(SAISIE_BUDGET_MOBILITE_PAR_DEFAUT)
  })

  it('remplace un bloc budget mobilité corrompu par la valeur par défaut', () => {
    localStorage.setItem(
      CLE_STOCKAGE,
      JSON.stringify({ ...SAISIE_PAR_DEFAUT, budgetMobilite: { budgetAnnuel: 5 }, choixMobilite: 'budgetMobilite' }),
    )
    expect(lireSaisieStockee().budgetMobilite).toEqual(SAISIE_BUDGET_MOBILITE_PAR_DEFAUT)
  })

  it('remplace un choix de mobilité inconnu par la valeur par défaut', () => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, choixMobilite: 'trottinette' }))
    expect(lireSaisieStockee().choixMobilite).toBe('voiture')
  })

  it('ne réécrit jamais la clé v5', () => {
    localStorage.setItem(CLE_STOCKAGE_V5, JSON.stringify({ ...V5, montant: '4000' }))
    lireSaisieStockee()
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE_V5) as string).montant).toBe('4000')
  })
})

describe('reprise d’une saisie antérieure (v7)', () => {
  const V6 = (() => {
    const { periode: _periode, ...reste } = SAISIE_PAR_DEFAUT
    return reste
  })()

  it('lit la clé v7 en priorité', () => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, periode: 'annuel', montant: '52000' }))
    localStorage.setItem(CLE_STOCKAGE_V6, JSON.stringify({ ...V6, montant: '1000' }))
    expect(lireSaisieStockee()).toMatchObject({ periode: 'annuel', montant: '52000' })
  })

  it('reprend une saisie v6 en mensuel, sans rien changer au reste de la saisie', () => {
    localStorage.setItem(CLE_STOCKAGE_V6, JSON.stringify({ ...V6, montant: '4000' }))
    expect(lireSaisieStockee()).toEqual({ ...V6, montant: '4000', periode: 'mensuel' })
  })

  it('remplace une période inconnue par « mensuel »', () => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, periode: 'trimestriel' }))
    expect(lireSaisieStockee().periode).toBe('mensuel')
  })

  it('ne réécrit jamais la clé v6', () => {
    localStorage.setItem(CLE_STOCKAGE_V6, JSON.stringify({ ...V6, montant: '4000' }))
    lireSaisieStockee()
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE_V6) as string).montant).toBe('4000')
  })
})

describe('useSaisie — deux offres', () => {
  it('n’a pas d’offre B au départ', () => {
    const { result } = renderHook(() => useSaisie())
    expect(result.current.offreB).toBeNull()
    expect(result.current.offreActive).toBe('A')
    expect(result.current.saisie).toBe(result.current.offreA)
  })

  it('crée l’offre B par copie de l’offre A, sans le souvenir de la bascule, et l’ouvre', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.modifier('montant', '3200'))
    act(() => result.current.basculerSens('2400'))
    act(() => result.current.ajouterOffreB())
    expect(result.current.offreActive).toBe('B')
    expect(result.current.offreB).toEqual({ ...result.current.offreA, montantAvantBascule: null })
    expect(result.current.offreA.montantAvantBascule).toBe('3200')
    expect(result.current.saisie).toBe(result.current.offreB)
  })

  it('ne transmet pas un champ propre à l’offre ouverte à l’autre offre', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.ajouterOffreB())
    act(() => result.current.modifier('montant', '3500'))
    expect(result.current.offreB?.montant).toBe('3500')
    expect(result.current.offreA.montant).toBe(SAISIE_PAR_DEFAUT.montant)
    act(() => result.current.choisirOffre('A'))
    act(() => result.current.modifier('choixMobilite', 'aucun'))
    expect(result.current.offreA.choixMobilite).toBe('aucun')
    expect(result.current.offreB?.choixMobilite).toBe(SAISIE_PAR_DEFAUT.choixMobilite)
  })

  it('écrit la famille dans les deux offres, depuis l’une comme depuis l’autre', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.ajouterOffreB())
    act(() => result.current.modifier('enfantsACharge', '2'))
    act(() => result.current.modifier('etatCivil', 'marieOuCohabitant'))
    act(() => result.current.choisirOffre('A'))
    act(() => result.current.modifier('revenusConjoint', 'aucun'))
    act(() => result.current.modifier('parentIsole', true))
    for (const champ of CHAMPS_FAMILLE) {
      expect(result.current.offreB?.[champ]).toEqual(result.current.offreA[champ])
    }
    expect(result.current.offreA).toMatchObject({ enfantsACharge: '2', etatCivil: 'marieOuCohabitant', revenusConjoint: 'aucun', parentIsole: true })
  })

  it('bascule le sens et la période de l’offre ouverte seulement', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.ajouterOffreB())
    act(() => result.current.basculerSens('2261,33'))
    act(() => result.current.choisirOffre('A'))
    expect(result.current.offreA).toMatchObject({ sens: 'brutVersNet', montant: SAISIE_PAR_DEFAUT.montant })
    expect(result.current.offreB).toMatchObject({ sens: 'netVersBrut', montant: '2261,33' })
    act(() => result.current.basculerPeriode('41760'))
    expect(result.current.offreA).toMatchObject({ periode: 'annuel', montant: '41760' })
    expect(result.current.offreB?.periode).toBe('mensuel')
  })

  it('retire l’offre B et rouvre l’offre A', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.ajouterOffreB())
    act(() => result.current.modifier('montant', ''))
    act(() => result.current.retirerOffreB())
    expect(result.current.offreB).toBeNull()
    expect(result.current.offreActive).toBe('A')
    expect(result.current.saisie).toBe(result.current.offreA)
    expect(result.current.offreA.montant).toBe(SAISIE_PAR_DEFAUT.montant)
  })

  it('ne peut pas ouvrir une offre B qui n’existe pas', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.choisirOffre('B'))
    expect(result.current.offreActive).toBe('A')
  })

  it('sauvegarde la comparaison sous sa propre clé, et la supprime au retrait', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.ajouterOffreB())
    act(() => result.current.modifier('montant', '3500'))
    expect(JSON.parse(localStorage.getItem(CLE_COMPARAISON) ?? 'null')).toEqual({ offreB: result.current.offreB, offreActive: 'B' })
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE) ?? 'null')).toEqual(result.current.offreA)
    act(() => result.current.retirerOffreB())
    expect(localStorage.getItem(CLE_COMPARAISON)).toBeNull()
  })

  it('retrouve l’offre B et l’offre ouverte au rechargement', () => {
    const premier = renderHook(() => useSaisie())
    act(() => premier.result.current.ajouterOffreB())
    act(() => premier.result.current.modifier('montant', '3500'))
    premier.unmount()
    const { result } = renderHook(() => useSaisie())
    expect(result.current.offreActive).toBe('B')
    expect(result.current.saisie.montant).toBe('3500')
    expect(result.current.offreA.montant).toBe(SAISIE_PAR_DEFAUT.montant)
  })
})

describe('lireOffresStockees', () => {
  it('reprend l’offre A seule sans clé de comparaison', () => {
    expect(lireOffresStockees()).toEqual({ offreA: SAISIE_PAR_DEFAUT, offreB: null, offreActive: 'A' })
  })

  it('reprend une offre B complète', () => {
    const offreB = { ...SAISIE_PAR_DEFAUT, montant: '3500' }
    localStorage.setItem(CLE_COMPARAISON, JSON.stringify({ offreB, offreActive: 'B' }))
    expect(lireOffresStockees()).toEqual({ offreA: SAISIE_PAR_DEFAUT, offreB, offreActive: 'B' })
  })

  it('complète une offre B à laquelle il manque des blocs', () => {
    const incomplete: Partial<SaisieFormulaire> = { ...SAISIE_PAR_DEFAUT, montant: '3500' }
    delete incomplete.primes
    delete incomplete.periode
    localStorage.setItem(CLE_COMPARAISON, JSON.stringify({ offreB: incomplete, offreActive: 'B' }))
    expect(lireOffresStockees().offreB).toEqual({ ...SAISIE_PAR_DEFAUT, montant: '3500' })
  })

  it('reprend l’offre A seule si l’offre B est inutilisable', () => {
    localStorage.setItem(CLE_COMPARAISON, JSON.stringify({ offreB: 'abîmée', offreActive: 'B' }))
    expect(lireOffresStockees()).toEqual({ offreA: SAISIE_PAR_DEFAUT, offreB: null, offreActive: 'A' })
    localStorage.setItem(CLE_COMPARAISON, '{pas du json')
    expect(lireOffresStockees().offreB).toBeNull()
  })

  it('ouvre l’offre A si l’offre ouverte est inconnue', () => {
    localStorage.setItem(CLE_COMPARAISON, JSON.stringify({ offreB: SAISIE_PAR_DEFAUT, offreActive: 'C' }))
    expect(lireOffresStockees().offreActive).toBe('A')
  })

  it('impose la famille de l’offre A à l’offre B', () => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, enfantsACharge: '2' }))
    localStorage.setItem(CLE_COMPARAISON, JSON.stringify({ offreB: { ...SAISIE_PAR_DEFAUT, enfantsACharge: '5', montant: '3500' }, offreActive: 'B' }))
    expect(lireOffresStockees().offreB).toMatchObject({ enfantsACharge: '2', montant: '3500' })
  })
})
