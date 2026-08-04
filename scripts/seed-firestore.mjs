// Seeds the `foods` Firestore collection from scripts/out/restructured.json
// (produced by scripts/restructure-data.mjs). Uses the Admin SDK + service
// account, so it bypasses Firestore security rules -- this is the only
// writer of scored/identity data; the client app is read-only.
// Run: node scripts/seed-firestore.mjs

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'

const serviceAccount = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url)))
const records = JSON.parse(readFileSync(new URL('out/restructured.json', import.meta.url)))

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

const BATCH_LIMIT = 400 // Firestore hard cap is 500 writes/batch
let batch = db.batch()
let opsInBatch = 0
let written = 0

for (const record of records) {
  const ref = db.collection('foods').doc(record.food_id)
  batch.set(ref, record)
  opsInBatch++
  written++
  if (opsInBatch >= BATCH_LIMIT) {
    await batch.commit()
    batch = db.batch()
    opsInBatch = 0
  }
}
if (opsInBatch > 0) await batch.commit()

console.log(`Seeded ${written} documents into 'foods'.`)
