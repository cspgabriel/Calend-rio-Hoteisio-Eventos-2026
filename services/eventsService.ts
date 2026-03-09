import { ref, get, push, set, update, remove } from 'firebase/database';
import { database } from '../firebase';
import type { EventData } from '../types';
import { parseDate } from '../utils';

type StoredEvent = Omit<EventData, 'parsedStartDate' | 'parsedEndDate'>;

export type NewEventInput = Omit<
  EventData,
  'id' | 'parsedStartDate' | 'parsedEndDate'
>;

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

  const stored: StoredEvent = {
    ...event,
    id
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

