import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function checkPending() {
  const colls = ['driver_registrations', 'driver_requests', 'requests', 'pending_drivers'];
  for (const c of colls) {
    try {
      const snap = await getDocs(collection(db, c));
      console.log(`Collection ${c}: ${snap.size} docs`);
      snap.forEach(doc => {
        const d = doc.data();
        console.log(`  Doc [${doc.id}]: name="${d.name}", upazila="${d.upazila}", union="${d.union}", ward="${d.ward}"`);
      });
    } catch(e) {
      console.log(`Error reading ${c}: ${e.message}`);
    }
  }
  process.exit(0);
}

checkPending();

