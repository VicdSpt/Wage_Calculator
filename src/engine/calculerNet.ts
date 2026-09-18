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
  // L'avantage de toute nature est imposable mais pas soumis à l'ONSS du travailleur :
  // il entre dans la base du précompte ; le net, lui, ne le perd pas, puisque le brut ne l'a
  // jamais contenu.
  const atn = situation.atnMensuelCentimes
  const imposablePrecompte = imposableMensuel + atn
  const precompte = calculerPrecompte(imposablePrecompte, bonus, situation, parametres)
  const cotisationSpeciale = calculerCotisationSpeciale(brut, situation, parametres)
  // Le net ne perd pas l'ATN : le brut ne le contenait pas. L'avantage ne coûte que l'impôt
  // qu'il fait naître. Les deux lignes du détail (+ puis −) s'annulent, comme sur une fiche.
  const net = brut - onssNet - precompte.precompte - cotisationSpeciale

  const intermediaires: Intermediaires = {
    onss,
    bonusVoletA: bonus.voletA,
    bonusVoletB: bonus.voletB,
    bonusSocial: bonus.total,
    onssNet,
    imposableMensuel,
    atn,
    imposablePrecompte,
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
    ...(atn > 0
      ? [{ id: 'atn' as const, sens: '+' as const, montantCentimes: atn, source: 'Avantage de toute nature imposable' }]
      : []),
    { id: 'precompteAvantBonus', sens: '-', montantCentimes: precompte.precompteAvantBonus, source: 'SPF-FC-2026 n° 7 à 16, annexes 1 à 5' },
    { id: 'bonusFiscal', sens: '+', montantCentimes: precompte.bonusFiscal, source: 'SPF-FC-2026 n° 20 et 21' },
    { id: 'cotisationSpeciale', sens: '-', montantCentimes: cotisationSpeciale, source: 'ONSS-CSSS-2026/3' },
    ...(atn > 0
      ? [{ id: 'atnRetenu' as const, sens: '-' as const, montantCentimes: atn, source: 'Avantage non versé en argent' }]
      : []),
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