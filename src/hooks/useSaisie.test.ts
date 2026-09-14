import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SAISIE_PAR_DEFAUT } from '../engine/validation'
import { CLE_STOCKAGE, lireSaisieStockee, useSaisie } from './useSaisie'

describe('lireSaisieStockee', () => {
  it('renvoie la saisie par défaut si rien n’est stocké', () => {
    expect(lireSaisieStockee()).toEqual(SAISIE_PAR_DEFAUT)
  })

  it('restaure une saisie valide', () => {
    const stockee = { ...SAISIE_PAR_DEFAUT, brut: '2500', etatCivil: 'marieOuCohabitant', revenusConjoint: 'superieurs' }
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(stockee))
    expect(lireSaisieStockee()).toEqual(stockee)
  })

  it.each(['pas du json', '{"brut":2500}', JSON.stringify({ ...SAISIE_PAR_DEFAUT, revenusConjoint: 'inconnu' })])(
    'ignore un contenu invalide : %s',
    (contenu) => {
      localStorage.setItem(CLE_STOCKAGE, contenu)
      expect(lireSaisieStockee()).toEqual(SAISIE_PAR_DEFAUT)
    },
  )

  it('résiste à un localStorage inaccessible', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqué')
    })
    expect(lireSaisieStockee()).toEqual(SAISIE_PAR_DEFAUT)
  })
})

describe('useSaisie', () => {
  it('mémorise chaque modification', () => {
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.modifier('brut', '4200'))
    expect(result.current.saisie.brut).toBe('4200')
    expect(JSON.parse(localStorage.getItem(CLE_STOCKAGE) ?? '{}')).toMatchObject({ brut: '4200' })
  })

  it('continue de fonctionner si l’écriture échoue', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const { result } = renderHook(() => useSaisie())
    act(() => result.current.modifier('brut', '4200'))
    expect(result.current.saisie.brut).toBe('4200')
  })
})