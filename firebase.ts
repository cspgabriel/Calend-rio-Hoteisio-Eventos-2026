import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  writeBatch,
  query,
  orderBy,
  getCountFromServer,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { EventData } from './types';
import { parseDate } from './utils';

const firebaseConfig = {
  apiKey: "AIzaSyCwYnp8E73Or7osEouOlioBaPSGlkN6Ytc",
  authDomain: "eventos-d16c9.firebaseapp.com",
  databaseURL: "https://eventos-d16c9.firebaseio.com",
  projectId: "eventos-d16c9",
  storageBucket: "eventos-d16c9.firebasestorage.app",
  messagingSenderId: "271681547398",
  appId: "1:271681547398:web:1806de7516daa7bf9b3507",
  measurementId: "G-2MMXC40XS4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const EVENTS_COLLECTION = 'events';

function docToEventData(docSnap: QueryDocumentSnapshot<DocumentData>): EventData {
  const d = docSnap.data();
  const startDate: string = d.startDate || '';
  const endDate: string = d.endDate || '';
  return {
    id: docSnap.id,
    name: d.name || '',
    venue: d.venue || '',
    type: d.type || '',
    startDate,
    endDate,
    month: d.month || '',
    neighborhood: d.neighborhood || '',
    region: d.region || '',
    year: d.year || '',
    lat: d.lat ?? 0,
    lng: d.lng ?? 0,
    parsedStartDate: parseDate(startDate),
    parsedEndDate: parseDate(endDate),
    inclusionDate: d.inclusionDate || '',
    city: d.city,
    state: d.state,
    country: d.country,
  };
}

export async function loadEventsFromFirestore(): Promise<EventData[]> {
  const q = query(collection(db, EVENTS_COLLECTION), orderBy('startDate', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToEventData);
}

export async function seedFirestoreIfEmpty(events: EventData[]): Promise<boolean> {
  const snap = await getCountFromServer(collection(db, EVENTS_COLLECTION));
  if (snap.data().count > 0) return false;
  await seedFirestoreFromConstants(events);
  return true;
}

export async function seedFirestoreFromConstants(events: EventData[]): Promise<void> {
  const BATCH_SIZE = 400;
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const slice = events.slice(i, i + BATCH_SIZE);
    for (const event of slice) {
      const ref = doc(collection(db, EVENTS_COLLECTION));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { parsedStartDate, parsedEndDate, ...rest } = event;
      batch.set(ref, rest);
    }
    await batch.commit();
  }
}

export async function deleteEventsFromFirestore(ids: string[]): Promise<void> {
  const BATCH_SIZE = 400;
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const slice = ids.slice(i, i + BATCH_SIZE);
    for (const id of slice) {
      batch.delete(doc(db, EVENTS_COLLECTION, id));
    }
    await batch.commit();
  }
}

export async function addEventsToFirestore(events: Omit<EventData, 'id' | 'parsedStartDate' | 'parsedEndDate'>[]): Promise<EventData[]> {
  const results: EventData[] = [];
  const BATCH_SIZE = 400;
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const slice = events.slice(i, i + BATCH_SIZE);
    const refs = slice.map(() => doc(collection(db, EVENTS_COLLECTION)));
    slice.forEach((event, j) => {
      batch.set(refs[j], event);
    });
    await batch.commit();
    slice.forEach((event, j) => {
      results.push({
        ...event,
        id: refs[j].id,
        parsedStartDate: parseDate(event.startDate),
        parsedEndDate: parseDate(event.endDate),
      });
    });
  }
  return results;
}
