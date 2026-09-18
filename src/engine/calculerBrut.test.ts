import { describe, expect, it } from 'vitest'
import fichier from './__tests__/references.json'
import { SITUATIONS_FAMILIALES } from './__tests__/situations'
import { calculerBrut, MARGE_RECUL_CENTIMES, type SituationFamiliale } from './calculerBrut'
import { calculerNet } from './calculerNet'
import { BRUT_MAX_CENTIMES, NetHorsLimites, PeriodeNonCouverte, type Situation } from './types'

const SEPT = '2026-09-14'
const AOUT = '2026-08-31'
const DATES = [AOUT, SEPT] as const

const ISOLE: SituationFamiliale = { etatCivil: 'isole', revenusConjoint: null, enfantsACharge: 0, parentIsole: false, atnMensuelCentimes: 0 }
const CONJOINT_AVEC_REVENUS: SituationFamiliale = {
  etatCivil: 'marieOuCohabitant',
  revenusConjoint: 'superieurs',
  enfantsACharge: 0,
  parentIsole: false,
  atnMensuelCentimes: 0,
}

function net(famille: SituationFamiliale, brut: number, dateIso: string): number {
  return calculerNet({ ...famille, brutMensuelCentimes: brut }, dateIso).netMensuelCentimes
}

/** Oracle : net(b) ≤ b, donc le plus petit brut qui atteint la cible est ≥ la cible. On monte centime par centime. */
function brutOracle(famille: SituationFamiliale, cible: number, dateIso: string): number {
  let brut = cible
  while (net(famille, brut, dateIso) < cible) {
    brut++
  }
  return brut
}

/** Vérification locale : le brut atteint la cible, et le centime en dessous non. */
function verifierLocalement(famille: SituationFamiliale, cible: number, dateIso: string, brut: number) {
  expect(net(famille, brut, dateIso)).toBeGreaterThanOrEqual(cible)
  if (brut > 1) {
    expect(net(famille, brut - 1, dateIso)).toBeLessThan(cible)
  }
}

/** Générateur pseudo-aléatoire à graine fixe (mulberry32), pour des tests reproductibles. */
function generateur(graine: number): () => number {
  let etat = graine
  return () => {
    etat = (etat + 0x6d2b79f5) | 0
    let t = Math.imul(etat ^ (etat >>> 15), 1 | etat)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

interface CasReference {
  id: string
  date: string
  situation: Situation
  attendu: { net: number }
}
const REFERENCES = fichier.cas as unknown as CasReference[]

function famille(situation: Situation): SituationFamiliale {
  const { brutMensuelCentimes: _brut, ...reste } = situation
  return reste
}

describe('situations couvertes', () => {
  it('liste les 76 situations familiales', () => {
    expect(SITUATIONS_FAMILIALES).toHaveLength(76)
    expect(new Set(SITUATIONS_FAMILIALES.map((s) => JSON.stringify(s))).size).toBe(76)
  })
})

describe('calculerBrut', () => {
  it('retrouve le brut de l\'exemple : 2 261,33 € net → 2 999,96 € brut', () => {
    const r = calculerBrut(ISOLE, 226_133, SEPT)
    expect(r.brutCentimes).toBe(299_996)
    expect(r.netCibleCentimes).toBe(226_133)
    expect(r.resultat).toEqual(calculerNet({ ...ISOLE, brutMensuelCentimes: 299_996 }, SEPT))
  })

  it('un ATN non nul ne change pas le brut trouvé, comparé à l\'oracle', () => {
    const isoleAvecAtn: SituationFamiliale = { ...ISOLE, atnMensuelCentimes: 27_017 }
    const cible = 226_133
    expect(calculerBrut(isoleAvecAtn, cible, SEPT).brutCentimes).toBe(brutOracle(isoleAvecAtn, cible, SEPT))
  })

  it('le net ne dépasse jamais le brut (hypothèse de l\'oracle)', () => {
    for (const c of REFERENCES) {
      expect(c.attendu.net).toBeLessThanOrEqual(c.situation.brutMensuelCentimes)
    }
    for (const brut of [1, 109_509, 109_510, 180_845, 234_518, 1_000_000, BRUT_MAX_CENTIMES]) {
      expect(net(CONJOINT_AVEC_REVENUS, brut, SEPT)).toBeLessThanOrEqual(brut)
      expect(net(ISOLE, brut, SEPT)).toBeLessThanOrEqual(brut)
    }
  })

  describe('cas de référence', () => {
    it.each(REFERENCES.map((c) => [c.id, c] as const))('%s : vérification locale', (_id, c) => {
      const f = famille(c.situation)
      const r = calculerBrut(f, c.attendu.net, c.date)
      verifierLocalement(f, c.attendu.net, c.date, r.brutCentimes)
      expect(r.brutCentimes).toBeLessThanOrEqual(c.situation.brutMensuelCentimes)
    })

    const petits = REFERENCES.filter((c) => c.situation.brutMensuelCentimes <= 300_000)
    it.each(petits.map((c) => [c.id, c] as const))('%s : égal à l\'oracle', (_id, c) => {
      const f = famille(c.situation)
      expect(calculerBrut(f, c.attendu.net, c.date).brutCentimes).toBe(brutOracle(f, c.attendu.net, c.date))
    })
  })

  describe('zones pieges, compares a l\'oracle', () => {
    it('la marche de la cotisation spéciale à 1 095,10 € (conjoint avec revenus)', () => {
      expect(net(CONJOINT_AVEC_REVENUS, 109_509, SEPT)).toBe(109_509)
      expect(net(CONJOINT_AVEC_REVENUS, 109_510, SEPT)).toBe(108_995)
      for (const cible of [108_994, 108_995, 109_000, 109_509, 109_510, 109_600]) {
        expect(calculerBrut(CONJOINT_AVEC_REVENUS, cible, SEPT).brutCentimes).toBe(brutOracle(CONJOINT_AVEC_REVENUS, cible, SEPT))
      }
    })

    it('la baisse du net à 2 345,18 € (isolé)', () => {
      expect(net(ISOLE, 234_517, SEPT)).toBe(213_385)
      expect(net(ISOLE, 234_518, SEPT)).toBe(213_382)
      for (let cible = 213_380; cible <= 213_390; cible++) {
        expect(calculerBrut(ISOLE, cible, SEPT).brutCentimes).toBe(brutOracle(ISOLE, cible, SEPT))
      }
    })

    it('un net impossible au centime pres : le net obtenu depasse la cible d\'un centime', () => {
      expect(net(ISOLE, 180_845, SEPT)).toBe(180_844)
      expect(net(ISOLE, 180_846, SEPT)).toBe(180_846)
      const r = calculerBrut(ISOLE, 180_845, SEPT)
      expect(r.brutCentimes).toBe(180_846)
      expect(r.resultat.netMensuelCentimes).toBe(180_846)
      expect(r.brutCentimes).toBe(brutOracle(ISOLE, 180_845, SEPT))
    })

    it.each(DATES)('les planchers des volets A et B (%s)', (date) => {
      for (const brut of [230_062, 293_793]) {
        const cible = net(ISOLE, brut, date)
        expect(calculerBrut(ISOLE, cible, date).brutCentimes).toBe(brutOracle(ISOLE, cible, date))
      }
    })

    const hasard = generateur(20260915)
    const cibles = Array.from({ length: 40 }, (_, i) => ({
      i,
      famille: SITUATIONS_FAMILIALES[Math.floor(hasard() * SITUATIONS_FAMILIALES.length)],
      date: DATES[Math.floor(hasard() * DATES.length)],
      cible: 1 + Math.floor(hasard() * 250_000),
    }))
    it.each(cibles)('cible pseudo-aléatoire n° $i ($cible c, $date)', ({ famille: f, date, cible }) => {
      expect(calculerBrut(f, cible, date).brutCentimes).toBe(brutOracle(f, cible, date))
    })
  })

  describe('limites', () => {
    it('accepte le net du brut maximal et refuse un centime de plus', () => {
      const netMax = net(ISOLE, BRUT_MAX_CENTIMES, SEPT)
      expect(netMax).toBe(4_146_374)
      const r = calculerBrut(ISOLE, netMax, SEPT)
      expect(r.brutCentimes).toBeLessThanOrEqual(BRUT_MAX_CENTIMES)
      verifierLocalement(ISOLE, netMax, SEPT, r.brutCentimes)

      expect(() => calculerBrut(ISOLE, netMax + 1, SEPT)).toThrow(NetHorsLimites)
      try {
        calculerBrut(ISOLE, netMax + 1, SEPT)
      } catch (erreur) {
        expect(erreur).toMatchObject({ netCibleCentimes: netMax + 1, netMaxCentimes: netMax })
      }
    })

    it('renvoie 0,01 € de brut pour 0,01 € de net', () => {
      expect(calculerBrut(ISOLE, 1, SEPT).brutCentimes).toBe(1)
    })

    it('lève PeriodeNonCouverte hors des périodes intégrées', () => {
      expect(() => calculerBrut(ISOLE, 226_133, '2027-01-15')).toThrow(PeriodeNonCouverte)
    })

    it('expose une marge de 10 €', () => {
      expect(MARGE_RECUL_CENTIMES).toBe(1_000)
    })
  })

  it('reste rapide : 200 recherches sur tout l\'intervalle en moins de 2 secondes', { timeout: 20_000 }, () => {
    const hasard = generateur(15092026)
    const recherches = Array.from({ length: 200 }, () => {
      const f = SITUATIONS_FAMILIALES[Math.floor(hasard() * SITUATIONS_FAMILIALES.length)]
      const date = DATES[Math.floor(hasard() * DATES.length)]
      const cible = 1 + Math.floor(hasard() * net(f, BRUT_MAX_CENTIMES, date))
      return { f, date, cible }
    })

    const debut = performance.now()
    const bruts = recherches.map(({ f, date, cible }) => calculerBrut(f, cible, date).brutCentimes)
    const duree = performance.now() - debut

    expect(duree).toBeLessThan(2_000)
    recherches.forEach(({ f, date, cible }, i) => verifierLocalement(f, cible, date, bruts[i]))
  })
})
