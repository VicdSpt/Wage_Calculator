import type { ReactNode } from 'react'
import { CARBURANTS, type Carburant } from '../engine/atnVoiture'
import { REVENUS_CONJOINT, type RevenusConjoint } from '../engine/types'
import {
  MODES_ATN,
  SENS_CALCUL,
  type ErreursSaisie,
  type SaisieAvantages,
  type SaisieFormulaire,
  type SaisiePrimes,
  type SaisieVoiture,
} from '../engine/validation'
import { fr, texteErreur } from '../i18n/fr'
import { formatEuro } from '../utils/format'

interface Props {
  saisie: SaisieFormulaire
  erreurs: ErreursSaisie
  /** Net maximal atteignable si le net demandé le dépasse, sinon null. */
  netMaxCentimes: number | null
  /** Plafonds ONSS de la période, pour les aides sous les champs. null si le calcul n'aboutit pas. */
  plafondTeletravailCentimes: number | null
  plafondEcochequesCentimes: number | null
  /** ATN mensuel calculé depuis la voiture, pour l'aperçu. null hors mode voiture ou si le calcul n'aboutit pas. */
  apercuAtnCentimes: number | null
  onChange: <K extends keyof SaisieFormulaire>(champ: K, valeur: SaisieFormulaire[K]) => void
  onBasculerSens: () => void
}

const CHAMP =
  'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-blue-600 aria-invalid:border-red-600 dark:border-slate-600 dark:bg-slate-800'

function Erreur({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1 text-sm text-red-700 dark:text-red-400">
      {children}
    </p>
  )
}

interface ChampAvantageProps {
  id: string
  libelle: string
  valeur: string
  aide?: string
  erreur?: string
  desactive?: boolean
  onChange: (valeur: string) => void
}

function ChampAvantage({ id, libelle, valeur, aide, erreur, desactive, onChange }: ChampAvantageProps) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {libelle}
      </label>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? `${id}-erreur` : aide ? `${id}-aide` : undefined}
        disabled={desactive}
        className={CHAMP}
      />
      {erreur ? (
        <Erreur id={`${id}-erreur`}>{erreur}</Erreur>
      ) : (
        aide && (
          <p id={`${id}-aide`} className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {aide}
          </p>
        )
      )}
    </div>
  )
}

export function FormulaireSituation({
  saisie,
  erreurs,
  netMaxCentimes,
  plafondTeletravailCentimes,
  plafondEcochequesCentimes,
  apercuAtnCentimes,
  onChange,
  onBasculerSens,
}: Props) {
  const t = fr.formulaire
  const isole = saisie.etatCivil === 'isole'
  const enfants = Number(saisie.enfantsACharge)
  const afficherParentIsole = isole && Number.isInteger(enfants) && enfants > 0
  const erreurMontant = erreurs.montant
    ? texteErreur(erreurs.montant, saisie.sens)
    : netMaxCentimes !== null
      ? t.netHorsLimites(formatEuro(netMaxCentimes))
      : null

  const a = saisie.avantages
  const ta = t.avantages
  const modifierAvantage = <K extends keyof SaisieAvantages>(champ: K, valeur: SaisieAvantages[K]) =>
    onChange('avantages', { ...a, [champ]: valeur })
  const erreurTexte = (code: ErreursSaisie[keyof ErreursSaisie]) => (code ? texteErreur(code, saisie.sens) : undefined)

  const v = saisie.voiture
  const tv = t.voiture
  const modifierVoiture = <K extends keyof SaisieVoiture>(champ: K, valeur: SaisieVoiture[K]) =>
    onChange('voiture', { ...v, [champ]: valeur })

  const pr = saisie.primes
  const tp = t.primes
  const modifierPrime = <K extends keyof SaisiePrimes>(champ: K, valeur: SaisiePrimes[K]) => onChange('primes', { ...pr, [champ]: valeur })

  return (
    <section aria-labelledby="titre-formulaire" className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
      <h2 id="titre-formulaire" className="mb-4 text-lg font-semibold">
        {t.titre}
      </h2>
      <form className="space-y-5" onSubmit={(e) => e.preventDefault()} noValidate>
        <fieldset>
          <legend className="font-medium">{t.sens}</legend>
          <div className="mt-2 inline-flex rounded-lg border border-slate-300 p-1 dark:border-slate-600">
            {SENS_CALCUL.map((valeur) => (
              <label
                key={valeur}
                className="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium has-checked:bg-blue-700 has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-blue-600"
              >
                <input
                  type="radio"
                  name="sens"
                  value={valeur}
                  checked={saisie.sens === valeur}
                  onChange={onBasculerSens}
                  className="sr-only"
                />
                {t.sensOptions[valeur]}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="montant" className="font-medium">
            {t.montant[saisie.sens]}
          </label>
          <input
            id="montant"
            inputMode="decimal"
            autoComplete="off"
            value={saisie.montant}
            onChange={(e) => onChange('montant', e.target.value)}
            aria-invalid={erreurMontant ? true : undefined}
            aria-describedby={erreurMontant ? 'montant-erreur' : undefined}
            className={CHAMP}
          />
          {erreurMontant && <Erreur id="montant-erreur">{erreurMontant}</Erreur>}
        </div>

        <fieldset>
          <legend className="font-medium">{t.etatCivil}</legend>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
            {(['isole', 'marieOuCohabitant'] as const).map((valeur) => (
              <label key={valeur} className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="etatCivil"
                  value={valeur}
                  checked={saisie.etatCivil === valeur}
                  onChange={() => onChange('etatCivil', valeur)}
                  className="size-4 accent-blue-700"
                />
                {t[valeur]}
              </label>
            ))}
          </div>
        </fieldset>

        {!isole && (
          <div>
            <label htmlFor="revenusConjoint" className="font-medium">
              {t.revenusConjoint}
            </label>
            <select
              id="revenusConjoint"
              value={saisie.revenusConjoint}
              onChange={(e) => onChange('revenusConjoint', e.target.value as RevenusConjoint)}
              aria-describedby="revenusConjoint-aide"
              className={CHAMP}
            >
              {REVENUS_CONJOINT.map((valeur) => (
                <option key={valeur} value={valeur}>
                  {fr.revenusConjoint[valeur]}
                </option>
              ))}
            </select>
            <p id="revenusConjoint-aide" className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t.aideRevenusConjoint}
            </p>
          </div>
        )}

        <div>
          <label htmlFor="enfantsACharge" className="font-medium">
            {t.enfants}
          </label>
          <input
            id="enfantsACharge"
            type="number"
            inputMode="numeric"
            min={0}
            max={10}
            step={1}
            value={saisie.enfantsACharge}
            onChange={(e) => onChange('enfantsACharge', e.target.value)}
            aria-invalid={erreurs.enfantsACharge ? true : undefined}
            aria-describedby={erreurs.enfantsACharge ? 'enfants-erreur' : undefined}
            className={CHAMP}
          />
          {erreurs.enfantsACharge && <Erreur id="enfants-erreur">{texteErreur(erreurs.enfantsACharge, saisie.sens)}</Erreur>}
        </div>

        {afficherParentIsole && (
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={saisie.parentIsole}
              onChange={(e) => onChange('parentIsole', e.target.checked)}
              className="mt-1 size-4 accent-blue-700"
            />
            {t.parentIsole}
          </label>
        )}

        <fieldset className="border-t border-slate-200 pt-4 dark:border-slate-700">
          <legend className="font-medium">{tv.titre}</legend>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {MODES_ATN.map((mode) => (
              <label key={mode} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="modeAtn"
                  value={mode}
                  checked={v.mode === mode}
                  onChange={() => modifierVoiture('mode', mode)}
                  className="size-4 accent-blue-700"
                />
                {tv.modes[mode]}
              </label>
            ))}
          </div>

          {v.mode === 'montant' ? (
            <div className="mt-2">
              <label htmlFor="atn" className="text-sm font-medium">
                {t.atn}
              </label>
              <input
                id="atn"
                inputMode="decimal"
                autoComplete="off"
                value={saisie.atn}
                onChange={(e) => onChange('atn', e.target.value)}
                aria-invalid={erreurs.atn ? true : undefined}
                aria-describedby={erreurs.atn ? 'atn-erreur' : 'atn-aide'}
                className={CHAMP}
              />
              {erreurs.atn ? (
                <Erreur id="atn-erreur">{texteErreur(erreurs.atn, saisie.sens)}</Erreur>
              ) : (
                <p id="atn-aide" className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {t.aideAtn}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-2 space-y-3 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
              <ChampAvantage
                id="valeurCatalogue"
                libelle={tv.valeurCatalogue}
                valeur={v.valeurCatalogue}
                aide={tv.aideValeurCatalogue}
                erreur={erreurTexte(erreurs.valeurCatalogue)}
                onChange={(valeur) => modifierVoiture('valeurCatalogue', valeur)}
              />
              <div>
                <label htmlFor="carburant" className="text-sm font-medium">
                  {tv.carburant}
                </label>
                <select
                  id="carburant"
                  value={v.carburant}
                  onChange={(e) => modifierVoiture('carburant', e.target.value as Carburant)}
                  className={CHAMP}
                >
                  {CARBURANTS.map((carburant) => (
                    <option key={carburant} value={carburant}>
                      {tv.carburants[carburant]}
                    </option>
                  ))}
                </select>
              </div>
              <ChampAvantage
                id="co2"
                libelle={tv.co2}
                valeur={v.co2}
                aide={tv.aideCo2}
                erreur={erreurTexte(erreurs.co2)}
                desactive={v.carburant === 'electrique'}
                onChange={(valeur) => modifierVoiture('co2', valeur)}
              />
              <div>
                <label htmlFor="premiereImmatriculation" className="text-sm font-medium">
                  {tv.premiereImmatriculation}
                </label>
                <input
                  id="premiereImmatriculation"
                  type="month"
                  value={v.premiereImmatriculation}
                  onChange={(e) => modifierVoiture('premiereImmatriculation', e.target.value)}
                  aria-invalid={erreurs.premiereImmatriculation ? true : undefined}
                  aria-describedby={erreurs.premiereImmatriculation ? 'premiereImmatriculation-erreur' : undefined}
                  className={CHAMP}
                />
                {erreurs.premiereImmatriculation && (
                  <Erreur id="premiereImmatriculation-erreur">{texteErreur(erreurs.premiereImmatriculation, saisie.sens)}</Erreur>
                )}
              </div>
              {apercuAtnCentimes !== null && <p className="text-sm font-medium">{tv.apercu(formatEuro(apercuAtnCentimes))}</p>}
            </div>
          )}

          <div className="mt-3">
            <ChampAvantage
              id="contribution"
              libelle={tv.contribution}
              valeur={v.contribution}
              aide={tv.aideContribution}
              erreur={erreurTexte(erreurs.contribution)}
              onChange={(valeur) => modifierVoiture('contribution', valeur)}
            />
          </div>
        </fieldset>

        <fieldset className="border-t border-slate-200 pt-4 dark:border-slate-700">
          <legend className="font-medium">{tp.titre}</legend>

          <label className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={pr.treiziemeActif}
              onChange={(e) => modifierPrime('treiziemeActif', e.target.checked)}
              className="size-4 accent-blue-700"
            />
            {tp.treizieme}
          </label>
          {pr.treiziemeActif && (
            <div className="mt-2 space-y-3 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
              <ChampAvantage
                id="treiziemePourcentage"
                libelle={tp.treiziemePourcentage}
                valeur={pr.treiziemePourcentage}
                aide={tp.aideTreiziemePourcentage}
                erreur={erreurTexte(erreurs.treiziemePourcentage)}
                onChange={(valeur) => modifierPrime('treiziemePourcentage', valeur)}
              />
              <ChampAvantage
                id="treiziemeMoisPrestes"
                libelle={tp.treiziemeMoisPrestes}
                valeur={pr.treiziemeMoisPrestes}
                erreur={erreurTexte(erreurs.treiziemeMoisPrestes)}
                onChange={(valeur) => modifierPrime('treiziemeMoisPrestes', valeur)}
              />
            </div>
          )}

          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={pr.peculeActif}
              onChange={(e) => modifierPrime('peculeActif', e.target.checked)}
              className="size-4 accent-blue-700"
            />
            {tp.pecule}
          </label>
          {pr.peculeActif && (
            <div className="mt-2 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
              <ChampAvantage
                id="peculeMoisPrestes"
                libelle={tp.peculeMoisPrestes}
                valeur={pr.peculeMoisPrestes}
                aide={tp.aidePeculeMoisPrestes}
                erreur={erreurTexte(erreurs.peculeMoisPrestes)}
                onChange={(valeur) => modifierPrime('peculeMoisPrestes', valeur)}
              />
            </div>
          )}
        </fieldset>

        <fieldset className="border-t border-slate-200 pt-4 dark:border-slate-700">
          <legend className="font-medium">{ta.titre}</legend>

          <label className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={a.titresRepasActif}
              onChange={(e) => modifierAvantage('titresRepasActif', e.target.checked)}
              className="size-4 accent-blue-700"
            />
            {ta.titresRepas}
          </label>
          {a.titresRepasActif && (
            <div className="mt-2 space-y-3 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
              <ChampAvantage
                id="joursPrestes"
                libelle={ta.joursPrestes}
                valeur={a.joursPrestes}
                erreur={erreurTexte(erreurs.joursPrestes)}
                onChange={(valeur) => modifierAvantage('joursPrestes', valeur)}
              />
              <ChampAvantage
                id="valeurFaciale"
                libelle={ta.valeurFaciale}
                valeur={a.valeurFaciale}
                erreur={erreurTexte(erreurs.valeurFaciale)}
                onChange={(valeur) => modifierAvantage('valeurFaciale', valeur)}
              />
              <ChampAvantage
                id="partTravailleur"
                libelle={ta.partTravailleur}
                valeur={a.partTravailleur}
                erreur={erreurTexte(erreurs.partTravailleur)}
                onChange={(valeur) => modifierAvantage('partTravailleur', valeur)}
              />
            </div>
          )}

          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={a.teletravailActif}
              onChange={(e) => modifierAvantage('teletravailActif', e.target.checked)}
              className="size-4 accent-blue-700"
            />
            {ta.teletravail}
          </label>
          {a.teletravailActif && (
            <div className="mt-2 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
              <ChampAvantage
                id="teletravail"
                libelle={ta.teletravailMontant}
                valeur={a.teletravail}
                aide={plafondTeletravailCentimes === null ? undefined : ta.plafond(formatEuro(plafondTeletravailCentimes))}
                erreur={erreurTexte(erreurs.teletravail)}
                onChange={(valeur) => modifierAvantage('teletravail', valeur)}
              />
            </div>
          )}

          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={a.ecochequesActif}
              onChange={(e) => modifierAvantage('ecochequesActif', e.target.checked)}
              className="size-4 accent-blue-700"
            />
            {ta.ecocheques}
          </label>
          {a.ecochequesActif && (
            <div className="mt-2 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
              <ChampAvantage
                id="ecocheques"
                libelle={ta.ecochequesMontant}
                valeur={a.ecocheques}
                aide={plafondEcochequesCentimes === null ? undefined : ta.plafondAnnuel(formatEuro(plafondEcochequesCentimes))}
                erreur={erreurTexte(erreurs.ecocheques)}
                onChange={(valeur) => modifierAvantage('ecocheques', valeur)}
              />
            </div>
          )}

          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={a.fraisPropresActif}
              onChange={(e) => modifierAvantage('fraisPropresActif', e.target.checked)}
              className="size-4 accent-blue-700"
            />
            {ta.fraisPropres}
          </label>
          {a.fraisPropresActif && (
            <div className="mt-2 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
              <ChampAvantage
                id="fraisPropres"
                libelle={ta.fraisPropresMontant}
                valeur={a.fraisPropres}
                aide={ta.aideFraisPropres}
                erreur={erreurTexte(erreurs.fraisPropres)}
                onChange={(valeur) => modifierAvantage('fraisPropres', valeur)}
              />
            </div>
          )}
        </fieldset>
      </form>
    </section>
  )
}