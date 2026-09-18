import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SAISIE_PAR_DEFAUT } from '../engine/validation'
import { CLE_STOCKAGE, CLE_STOCKAGE_V1, CLE_STOCKAGE_V2, lireSaisieStockee, useSaisie } from './useSaisie'
import { calculerEtat } from './useCalcul'

const V1 = { brut: '2500', etatCivil: 'marieOuCohabitant', revenusConjoint: 'superieurs', enfantsACharge: '2', parentIsole: false }

describe('lireSaisieStockee', () => {
  it('utilise la clé v3 en écriture, v2 et v1 en reprise', () => {
    expect(CLE_STOCKAGE).toBe('wage-calculator:saisie:v3')
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
      montantAvantBascule: null,
      atn: '0',
      etatCivil: 'marieOuCohabitant',
      revenusConjoint: 'superieurs',
      enfantsACharge: '2',
      parentIsole: false,
      avantages: SAISIE_PAR_DEFAUT.avantages,
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

  it('reprend une saisie v2 en ajoutant l’ATN et les avantages par défaut', () => {
    localStorage.setItem(CLE_STOCKAGE_V2, JSON.stringify(V2))
    expect(lireSaisieStockee()).toEqual({ ...V2, atn: SAISIE_PAR_DEFAUT.atn, avantages: SAISIE_PAR_DEFAUT.avantages })
  })

  it('préfère la clé v3 à la clé v2', () => {
    localStorage.setItem(CLE_STOCKAGE_V2, JSON.stringify(V2))
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, montant: '4200' }))
    expect(lireSaisieStockee().montant).toBe('4200')
  })

  it('garde le reste d’une saisie v3 dont le bloc avantages est invalide, avec les avantages par défaut', () => {
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
    const { atn: _atn, ...sansAtn } = SAISIE_PAR_DEFAUT
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
    const { atn: _atn, ...sansAtn } = SAISIE_PAR_DEFAUT
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(sansAtn))
    expect(() => calculerEtat(lireSaisieStockee(), '2026-09-14')).not.toThrow()
    expect(calculerEtat(lireSaisieStockee(), '2026-09-14').etat).toBe('ok')
  })
})
