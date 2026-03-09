import { ref, get, push, set, update, remove } from 'firebase/database';
import { database } from '../firebase';
import type { EventData } from '../types';
import { parseDate } from '../utils';

type StoredEvent = Omit<EventData, 'parsedStartDate' | 'parsedEndDate'>;

export type NewEventInput = {
  name: string;
  venue: string;
  type: string;
  startDate: string; // DD/MM/YYYY
  endDate: string;   // DD/MM/YYYY
  neighborhood: string;
  year: string;
};

const mapFromStoredEvent = (id: string, data: StoredEvent): EventData => {
  return {
    ...data,
    id: data.id || id,
    parsedStartDate: parseDate(data.startDate),
    parsedEndDate: parseDate(data.endDate)
  };
};

export async function fetchEvents(): Promise<EventData[]> {
  const snapshot = await get(ref(database, 'events'));

  if (!snapshot.exists()) {
    return [];
  }

  const raw = snapshot.val() as Record<string, StoredEvent>;

  return Object.entries(raw).map(([id, value]) =>
    mapFromStoredEvent(id, value)
  );
}

export async function fetchTourismFairs(): Promise<EventData[]> {
  const snapshot = await get(ref(database, 'tourismFairs'));

  if (!snapshot.exists()) {
    return [];
  }

  const raw = snapshot.val() as Record<string, StoredEvent>;

  return Object.entries(raw).map(([id, value]) =>
    mapFromStoredEvent(id, value)
  );
}

export async function createEvent(
  event: NewEventInput
): Promise<EventData> {
  const eventsRef = ref(database, 'events');
  const newRef = push(eventsRef);
  const id = newRef.key as string;

  const parsedStart = parseDate(event.startDate);
  const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long' });
  const monthName = monthFormatter.format(parsedStart);
  const month =
    monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const monthNum = String(today.getMonth() + 1).padStart(2, '0');
  const yearNum = today.getFullYear();
  const inclusionDate = `${day}/${monthNum}/${yearNum}`;

  const stored: StoredEvent = {
    id,
    name: event.name,
    venue: event.venue,
    type: event.type,
    startDate: event.startDate,
    endDate: event.endDate,
    month,
    neighborhood: event.neighborhood,
    region: 'A definir',
    year: event.year,
    lat: 0,
    lng: 0,
    inclusionDate
  };

  await set(newRef, stored);

  return mapFromStoredEvent(id, stored);
}

export async function updateEvent(
  id: string,
  partial: Partial<NewEventInput>
): Promise<void> {
  const eventRef = ref(database, `events/${id}`);
  await update(eventRef, partial as Partial<StoredEvent>);
}

export async function deleteEvent(id: string): Promise<void> {
  const eventRef = ref(database, `events/${id}`);
  await remove(eventRef);
}

