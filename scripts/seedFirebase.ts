import { ref, set } from 'firebase/database';
import { database } from '../firebase-seed.ts';
import { EVENTS, TOURISM_FAIRS } from '../constants.ts';
import type { EventData } from '../types';

type StoredEvent = Omit<EventData, 'parsedStartDate' | 'parsedEndDate'>;

const mapToStoredEvent = (event: EventData): StoredEvent => {
  const {
    parsedStartDate,
    parsedEndDate,
    ...rest
  } = event;

  return {
    ...rest
  };
};

async function seedEvents() {
  const eventsRef = ref(database, 'events');
  const eventsPayload: Record<string, StoredEvent> = {};

  EVENTS.forEach((event) => {
    eventsPayload[event.id] = mapToStoredEvent(event);
  });

  await set(eventsRef, eventsPayload);
}

async function seedTourismFairs() {
  const fairsRef = ref(database, 'tourismFairs');
  const fairsPayload: Record<string, StoredEvent> = {};

  TOURISM_FAIRS.forEach((event) => {
    fairsPayload[event.id] = mapToStoredEvent(event);
  });

  await set(fairsRef, fairsPayload);
}

async function main() {
  try {
    console.log('Iniciando seed do Firebase Realtime Database...');
    await seedEvents();
    console.log('Eventos carregados em "events/".');
    await seedTourismFairs();
    console.log('Feiras de turismo carregadas em "tourismFairs/".');
    console.log('Seed concluído com sucesso.');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao executar seed do Firebase:', error);
    process.exit(1);
  }
}

main();

