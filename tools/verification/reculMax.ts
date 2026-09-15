/**
 * Mesure le recul maximal du net quand le brut augmente, pour chaque période de paramètres,
 * sur toutes les situations couvertes et tous les bruts de 0,01 € à 100 000 €.
 * calculerBrut n'est exact que si ce recul reste ≤ MARGE_RECUL_CENTIMES (spec net → brut § 3.2).
 *
 * Usage : npm run verifier:recul   (plusieurs minutes, un thread par cœur)
 * Écrit : src/engine/__tests__/reculMax.json
 */
import { writeFileSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import { Worker, isMainThread, parentPort } from 'node:worker_threads'
import { SITUATIONS_FAMILIALES } from '../../src/engine/__tests__/situations.ts'
import { calculerNet } from '../../src/engine/calculerNet.ts'
import { PERIODES } from '../../src/engine/parametres/index.ts'
import { BRUT_MAX_CENTIMES } from '../../src/engine/types.ts'
import { dateIsoLocale } from '../../src/utils/format.ts'

interface Tache {
  periodeId: string
  dateIso: string
  indexSituation: number
}

interface Mesure extends Tache {
  reculMaxCentimes: number
  brutCentimes: number
}

/** Plus grande valeur de max(net(x) pour x < b) − net(b), et le brut b où elle se produit. */
function mesurer(tache: Tache): Mesure {
  const famille = SITUATIONS_FAMILIALES[tache.indexSituation]
  let netMaxVu = Number.NEGATIVE_INFINITY
  let reculMaxCentimes = 0
  let brutCentimes = 0
  for (let brut = 1; brut <= BRUT_MAX_CENTIMES; brut++) {
    const net = calculerNet({ ...famille, brutMensuelCentimes: brut }, tache.dateIso).netMensuelCentimes
    if (net > netMaxVu) {
      netMaxVu = net
    } else if (netMaxVu - net > reculMaxCentimes) {
      reculMaxCentimes = netMaxVu - net
      brutCentimes = brut
    }
  }
  return { ...tache, reculMaxCentimes, brutCentimes }
}

async function principal() {
  const taches: Tache[] = PERIODES.flatMap((periode) =>
    SITUATIONS_FAMILIALES.map((_, indexSituation) => ({ periodeId: periode.id, dateIso: periode.valideDu, indexSituation })),
  )
  const total = taches.length
  const mesures: Mesure[] = []
  const nbThreads = Math.min(availableParallelism(), total)
  const debut = Date.now()
  console.log(`${total} mesures (${PERIODES.length} périodes × ${SITUATIONS_FAMILIALES.length} situations) sur ${nbThreads} threads…`)

  await Promise.all(
    Array.from(
      { length: nbThreads },
      () =>
        new Promise<void>((resoudre, rejeter) => {
          const worker = new Worker(new URL(import.meta.url))
          const suivante = () => {
            const tache = taches.shift()
            if (tache) {
              worker.postMessage(tache)
            } else {
              void worker.terminate().then(() => resoudre())
            }
          }
          worker.on('online', suivante)
          worker.on('message', (mesure: Mesure) => {
            mesures.push(mesure)
            console.log(`  ${mesures.length}/${total} — ${mesure.periodeId}, situation ${mesure.indexSituation} : ${mesure.reculMaxCentimes} c`)
            suivante()
          })
          worker.on('error', rejeter)
        }),
    ),
  )

  const periodes: Record<string, { reculMaxCentimes: number; brutCentimes: number; situation: (typeof SITUATIONS_FAMILIALES)[number] }> = {}
  for (const periode of PERIODES) {
    const pire = mesures
      .filter((m) => m.periodeId === periode.id)
      .reduce((a, b) => (b.reculMaxCentimes > a.reculMaxCentimes ? b : a))
    periodes[periode.id] = {
      reculMaxCentimes: pire.reculMaxCentimes,
      brutCentimes: pire.brutCentimes,
      situation: SITUATIONS_FAMILIALES[pire.indexSituation],
    }
  }

  const sortie = new URL('../../src/engine/__tests__/reculMax.json', import.meta.url)
  const contenu = {
    description: 'Généré par tools/verification/reculMax.ts (npm run verifier:recul) — ne pas modifier à la main',
    genereLe: dateIsoLocale(new Date()),
    situationsCouvertes: SITUATIONS_FAMILIALES.length,
    brutMaxCentimes: BRUT_MAX_CENTIMES,
    periodes,
  }
  writeFileSync(sortie, `${JSON.stringify(contenu, null, 2)}\n`)
  console.log(`Terminé en ${Math.round((Date.now() - debut) / 1000)} s.`)
  console.log(JSON.stringify(periodes, null, 2))
}

if (isMainThread) {
  await principal()
} else {
  parentPort?.on('message', (tache: Tache) => parentPort?.postMessage(mesurer(tache)))
}
