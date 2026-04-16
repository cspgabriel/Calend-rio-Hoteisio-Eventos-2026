import { EventData } from './types';

const ICS_HEADER = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Calendario Hoteis Rio//Eventos//PT-BR',
  'CALSCALE:GREGORIAN',
  'METHOD:PUBLISH',
];

const ICS_FOOTER = ['END:VCALENDAR'];

const escapeIcsText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n');

const formatDateUTC = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

const normalizeDate = (date: Date) => {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  return utc;
};

const buildEventBlock = (event: EventData) => {
  const now = new Date();
  const start = normalizeDate(event.parsedStartDate);
  const endExclusive = normalizeDate(event.parsedEndDate);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  return [
    'BEGIN:VEVENT',
    `UID:${event.id}@calendario-rio-eventos`,
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART;VALUE=DATE:${formatDateUTC(start)}`,
    `DTEND;VALUE=DATE:${formatDateUTC(endExclusive)}`,
    `SUMMARY:${escapeIcsText(event.name)}`,
    `LOCATION:${escapeIcsText(event.venue)}`,
    `DESCRIPTION:${escapeIcsText(`Tipo: ${event.type} | Bairro: ${event.neighborhood} | Regiao: ${event.region}`)}`,
    'END:VEVENT',
  ];
};

export const buildIcsCalendar = (events: EventData[]) => {
  const blocks = events
    .slice()
    .sort((a, b) => a.parsedStartDate.getTime() - b.parsedStartDate.getTime())
    .flatMap(buildEventBlock);

  return [...ICS_HEADER, ...blocks, ...ICS_FOOTER].join('\r\n');
};

export const downloadIcs = (events: EventData[]) => {
  const ics = buildIcsCalendar(events);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `eventos_rio_${new Date().toISOString().slice(0, 10)}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
