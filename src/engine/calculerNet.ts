import { calculerBonusEmploiSocial } from './bonusEmploiSocial'
import { calculerCotisationSpeciale } from './cotisationSpeciale'
import { cotisationOnssPersonnelle } from './onss'
import { getParametres } from './parametres'
import { calculerPrecompte } from './precompte'
import type { Intermediaires, Ligne, Resultat, Situation } from './types'

/**
 * Brut → net mensuel pour une situation valide, avec les règles en vigueur à dateIso (AAAA-MM-JJ).
 * Lève PeriodeNonCouverte si aucune règle n'est intégrée pour cette date.
 */
export function calculerNet(situation: Situation, dateIso: string): Resultat {
  const parametres = getParametres(dateIso)
  const brut = situation.brutMensuelCentimes

  const onss = cotisationOnssPersonnelle(brut, parametres)
  const bonus = calculerBonusEmploiSocial(brut, onss, parametres)
  const onssNet = onss - bonus.total
  const imposableMensuel = brut - onssNet
  const precompte = calculerPrecompte(imposableMensuel, bonus, situation, parametres)
  const cotisationSpeciale = calculerCotisationSpeciale(brut, situation, parametres)
  const net = brut - onssNet - precompte.precompte - cotisationSpeciale

  const intermediaires: Intermediaires = {
    onss,
    bonusVoletA: bonus.voletA,
    bonusVoletB: bonus.voletB,
    bonusSocial: bonus.total,
    onssNet,
    imposableMensuel,
    ...precompte,
    cotisationSpeciale,
    net,
  }

  const lignes: Ligne[] = [
    { id: 'brut', sens: '=', montantCentimes: brut, source: 'Saisie' },
    { id: 'onss', sens: '-', montantCentimes: onss, source: 'ONSS — cotisation personnelle' },
    { id: 'bonusVoletA', sens: '+', montantCentimes: bonus.voletA, source: 'ONSS-BE-2026/3, volet A' },
    { id: 'bonusVoletB', sens: '+', montantCentimes: bonus.voletB, source: 'ONSS-BE-2026/3, volet B' },
    { id: 'imposableMensuel', sens: '=', montantCentimes: imposableMensuel, source: 'SPF-FC-2026 n° 7' },
    { id: 'precompteAvantBonus', sens: '-', montantCentimes: precompte.precompteAvantBonus, source: 'SPF-FC-2026 n° 7 à 16, annexes 1 à 5' },
    { id: 'bonusFiscal', sens: '+', montantCentimes: precompte.bonusFiscal, source: 'SPF-FC-2026 n° 20 et 21' },
    { id: 'cotisationSpeciale', sens: '-', montantCentimes: cotisationSpeciale, source: 'ONSS-CSSS-2026/3' },
    { id: 'net', sens: '=', montantCentimes: net, source: 'Brut − ONSS net − précompte − cotisation spéciale' },
  ]

  return {
    periode: { id: parametres.id, valideDu: parametres.valideDu, valideAu: parametres.valideAu },
    lignes,
    intermediaires,
    netMensuelCentimes: net,
    netAnnuelCentimes: net * 12,
    tauxRetour: net / brut,
  }
}