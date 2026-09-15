import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SAISIE_PAR_DEFAUT } from '../engine/validation'
import { CLE_STOCKAGE, CLE_STOCKAGE_V1, lireSaisieStockee, useSaisie } from './useSaisie'

const V1 = { brut: '2500', etatCivil: 'marieOuCohabitant', revenusConjoint: 'superieurs', enfantsACharge: '2', parentIsole: false }

describe('lireSaisieStockee', () => {
  it('utilise les cles v2 (ecriture) et v1 (reprise)', () => {
    expect(CLE_STOCKAGE).toBe('wage-calculator:saisie:v2')
    expect(CLE_STOCKAGE_V1).toBe('wage-calculator:saisie:v1')
  })

  it('renvoie la saisie par defaut si rien n\'est stocke', () => {
    expect(lireSaisieStockee()).toEqual(SAISIE_PAR_DEFAUT)
  })

  it('restaure une saisie v2 valide', () => {
    const stockee = { ...SAISIE_PAR_DEFAUT, sens: 'netVersBrut', montant: '2500', montantAvantBascule: '3000' }
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(stockee))
    expect(lireSaisieStockee()).toEqual(stockee)
  })

  it('reprend une saisie v1 en brut vers net', () => {
    localStorage.setItem(CLE_STOCKAGE_V1, JSON.stringify(V1))
    expect(lireSaisieStockee()).toEqual({
      sens: 'brutVersNet',
      montant: '2500',
      montantAvantBascule: null,
      etatCivil: 'marieOuCohabitant',
      revenusConjoint: 'superieurs',
      enfantsACharge: '2',
      parentIsole: false,
    })
  })

  it('prefere la cle v2 a la cle v1', () => {
    localStorage.setItem(CLE_STOCKAGE_V1, JSON.stringify(V1))
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ ...SAISIE_PAR_DEFAUT, montant: '4200' }))
    expect(lireSaisieStockee().montant).toBe('4200')
  })

  it('se rabat sur la cle v1 si la cle v2 est corrompue', () => {
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

  it('resiste a un localStorage inaccessible', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloque')
    })
    expect(lireSaisieStockee()).toEqual(SAISIE_PAR_DEFAUT)
  })
})

describe('useSaisie', () => {
  it('memorise chaque modification dans la cle v2', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.modifier('montant', '4200'))
    expect(result.current.saisie.montant).toBe('4200')
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE) ?? '{}')).toMatchObject({ montant: '4200', sens: 'brutVersNet' })
  })

  it('ne reecrit pas la cle v1', () => {
    localStorage.setItem(CLE_STOCKAGE_V1, JSON.stringify(V1))
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.modifier('montant', '4200'))
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE_V1) ?? '{}')).toEqual(V1)
  })

  it('continue de fonctionner si l\'ecriture echoue', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.modifier('montant', '4200'))
    expect(result.current.saisie.montant).toBe('4200')
  })
})

describe('useSaisie - bascule de sens', () => {
  it('reprend le montant fourni et garde le montant quitte', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.basculerSens('2261,33'))
    expect(result.current.saisie).toMatchObject({ sens: 'netVersBrut', montant: '2261,33', montantAvantBascule: '3000' })
  })

  it('restaure exactement le montant d\'origine au retour, sans modification', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.basculerSens('2261,33'))
    act(() => result.current.basculerSens('2999,96'))
    expect(result.current.saisie).toMatchObject({ sens: 'brutVersNet', montant: '3000', montantAvantBascule: '2261,33' })
    act(() => result.current.basculerSens('2261,33'))
    expect(result.current.saisie).toMatchObject({ sens: 'netVersBrut', montant: '2261,33', montantAvantBascule: '3000' })
  })

  it('reprend le resultat si le montant a ete modifie apres la bascule', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.basculerSens('2261,33'))
    act(() => result.current.modifier('montant', '2500'))
    expect(result.current.saisie.montantAvantBascule).toBeNull()
    act(() => result.current.basculerSens('3322,15'))
    expect(result.current.saisie).toMatchObject({ sens: 'brutVersNet', montant: '3322,15', montantAvantBascule: '2500' })
  })

  it('garde le montant quitte si un autre champ change', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.basculerSens('2261,33'))
    act(() => result.current.modifier('enfantsACharge', '2'))
    expect(result.current.saisie.montantAvantBascule).toBe('3000')
  })

  it('garde le montant tape si aucun resultat n\'est disponible', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.modifier('montant', 'abc'))
    act(() => result.current.basculerSens(null))
    expect(result.current.saisie).toMatchObject({ sens: 'netVersBrut', montant: 'abc', montantAvantBascule: 'abc' })
  })

  it('memorise le sens et le montant quitte', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.basculerSens('2261,33'))
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE) ?? '{}')).toMatchObject({
      sens: 'netVersBrut',
      montant: '2261,33',
      montantAvantBascule: '3000',
    })
  })
})
