import React, { useState, useMemo } from 'react';
import { EventData } from '../types';
import { normalizeString, formatInclusionDate } from '../utils';
import { MapPin, Calendar, Building2, ArrowUpDown, ArrowUp, ArrowDown, Search, Clock, PlusCircle } from 'lucide-react';
import type { NewEventInput } from '../services/eventsService';

interface EventListProps {
  events: EventData[];
  onCreateEvent?: (input: NewEventInput) => Promise<void> | void;
}

type SortConfig = {
  key: keyof EventData;
  direction: 'asc' | 'desc';
} | null;

const EventList: React.FC<EventListProps> = ({ events, onCreateEvent }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [filters, setFilters] = useState({
    name: '',
    startDate: '',
    endDate: '',
    venue: '',
    type: '',
    inclusion: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEvent, setNewEvent] = useState<NewEventInput>({
    name: '',
    venue: '',
    type: '',
    startDate: '',
    endDate: '',
    neighborhood: '',
    year: '2026'
  });

  const requestSort = (key: keyof EventData) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (name: keyof EventData) => {
    if (!sortConfig || sortConfig.key !== name) {
      return <ArrowUpDown size={14} className="text-slate-300" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="text-blue-500" /> 
      : <ArrowDown size={14} className="text-blue-500" />;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateEvent) return;
    if (!newEvent.name || !newEvent.startDate || !newEvent.endDate) return;

    setIsSubmitting(true);
    try {
      await onCreateEvent(newEvent);
      setNewEvent({
        name: '',
        venue: '',
        type: '',
        startDate: '',
        endDate: '',
        neighborhood: '',
        year: newEvent.year
      });
      setIsCreating(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const processedEvents = useMemo(() => {
    let filtered = events.filter(item => {
      return (
        normalizeString(item.name).includes(normalizeString(filters.name)) &&
        item.startDate.includes(filters.startDate) &&
        item.endDate.includes(filters.endDate) &&
        (normalizeString(item.venue).includes(normalizeString(filters.venue)) || normalizeString(item.neighborhood).includes(normalizeString(filters.venue))) &&
        normalizeString(item.type).includes(normalizeString(filters.type)) &&
        item.inclusionDate.includes(filters.inclusion)
      );
    });

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        let aValue: any = a[sortConfig.key];
        let bValue: any = b[sortConfig.key];

        if (sortConfig.key === 'startDate') {
          aValue = a.parsedStartDate.getTime();
          bValue = b.parsedStartDate.getTime();
        } else if (sortConfig.key === 'endDate') {
          aValue = a.parsedEndDate.getTime();
          bValue = b.parsedEndDate.getTime();
        } else if (sortConfig.key === 'inclusionDate') {
          // Manual parsing for inclusion date sorting
          const partsA = a.inclusionDate.split('/');
          const partsB = b.inclusionDate.split('/');
          aValue = new Date(parseInt(partsA[2]), parseInt(partsA[1]) - 1, parseInt(partsA[0])).getTime();
          bValue = new Date(parseInt(partsB[2]), parseInt(partsB[1]) - 1, parseInt(partsB[0])).getTime();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [events, filters, sortConfig]);

  return (
<<<<<<< HEAD
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div className="px-6 pt-4 pb-3 border-b border-slate-200 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Building2 size={16} className="text-blue-500" />
            Gestão de Eventos
          </h3>
          {onCreateEvent && (
            <button
              type="button"
              onClick={() => setIsCreating(!isCreating)}
              className="inline-flex items-center gap-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md transition-colors"
            >
              <PlusCircle size={14} />
              {isCreating ? 'Fechar formulário' : 'Novo evento'}
            </button>
          )}
        </div>

        {isCreating && (
          <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
            <input
              type="text"
              required
              placeholder="Nome do evento"
              className="border rounded px-2 py-1 outline-none"
              value={newEvent.name}
              onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
            />
            <input
              type="text"
              required
              placeholder="Início (DD/MM/AAAA)"
              className="border rounded px-2 py-1 outline-none"
              value={newEvent.startDate}
              onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
            />
            <input
              type="text"
              required
              placeholder="Término (DD/MM/AAAA)"
              className="border rounded px-2 py-1 outline-none"
              value={newEvent.endDate}
              onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
            />
            <input
              type="text"
              placeholder="Local"
              className="border rounded px-2 py-1 outline-none"
              value={newEvent.venue}
              onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
            />
            <input
              type="text"
              placeholder="Bairro"
              className="border rounded px-2 py-1 outline-none"
              value={newEvent.neighborhood}
              onChange={(e) => setNewEvent({ ...newEvent, neighborhood: e.target.value })}
            />
            <input
              type="text"
              placeholder="Tipo (show, congresso...)"
              className="border rounded px-2 py-1 outline-none"
              value={newEvent.type}
              onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
            />
            <input
              type="text"
              placeholder="Ano"
              className="border rounded px-2 py-1 outline-none"
              value={newEvent.year}
              onChange={(e) => setNewEvent({ ...newEvent, year: e.target.value })}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="md:col-span-3 lg:col-span-1 inline-flex items-center justify-center text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-md transition-colors disabled:opacity-60"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar evento'}
            </button>
          </form>
        )}
      </div>
=======
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
>>>>>>> 52bcc15d16a549f6a4542418e73b42dc7dfcb9dc
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-4 min-w-[250px]">
                <div className="flex flex-col gap-2">
                    <button onClick={() => requestSort('name')} className="flex items-center gap-1 hover:text-slate-700">
                        Evento {getSortIcon('name')}
                    </button>
                    <div className="relative">
                        <input type="text" placeholder="Filtrar nome..." className="w-full text-xs p-1.5 pl-7 border rounded font-normal outline-none" value={filters.name} onChange={(e) => setFilters({...filters, name: e.target.value})} />
                        <Search size={10} className="absolute left-2 top-2 text-slate-400" />
                    </div>
                </div>
              </th>
              <th className="px-6 py-4 min-w-[130px]">
                 <div className="flex flex-col gap-2">
                    <button onClick={() => requestSort('startDate')} className="flex items-center gap-1 hover:text-slate-700">
                        Início {getSortIcon('startDate')}
                    </button>
                    <input type="text" placeholder="Filtrar..." className="w-full text-xs p-1.5 border rounded font-normal outline-none" value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value})} />
                </div>
              </th>
              <th className="px-6 py-4 min-w-[130px]">
                 <div className="flex flex-col gap-2">
                    <button onClick={() => requestSort('endDate')} className="flex items-center gap-1 hover:text-slate-700">
                        Término {getSortIcon('endDate')}
                    </button>
                    <input type="text" placeholder="Filtrar..." className="w-full text-xs p-1.5 border rounded font-normal outline-none" value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value})} />
                </div>
              </th>
              <th className="px-6 py-4 min-w-[200px]">
                 <div className="flex flex-col gap-2">
                    <button onClick={() => requestSort('venue')} className="flex items-center gap-1 hover:text-slate-700">
                        Local / Bairro {getSortIcon('venue')}
                    </button>
                    <input type="text" placeholder="Filtrar local..." className="w-full text-xs p-1.5 border rounded font-normal outline-none" value={filters.venue} onChange={(e) => setFilters({...filters, venue: e.target.value})} />
                </div>
              </th>
              <th className="px-6 py-4 min-w-[120px]">
                 <div className="flex flex-col gap-2">
                    <button onClick={() => requestSort('inclusionDate')} className="flex items-center gap-1 hover:text-slate-700">
                        Inclusão {getSortIcon('inclusionDate')}
                    </button>
                    <input type="text" placeholder="Data..." className="w-full text-xs p-1.5 border rounded font-normal outline-none" value={filters.inclusion} onChange={(e) => setFilters({...filters, inclusion: e.target.value})} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {processedEvents.map((event) => (
                <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800">{event.name}</span>
                      <span className="text-xs text-slate-400 mt-1">{event.venue}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-slate-600">
                      <Calendar size={14} className="mr-2 text-slate-400" />
                      <span>{event.startDate}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-slate-600">
                      <Calendar size={14} className="mr-2 text-slate-400" />
                      <span>{event.endDate}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-slate-600">
                      <MapPin size={14} className="mr-2 text-slate-400" />
                      {event.neighborhood}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-xs text-slate-500">
                      <Clock size={12} className="mr-1 text-slate-300" />
                      {formatInclusionDate(event.inclusionDate)}
                    </div>
                  </td>
                </tr>
            ))}
            {processedEvents.length === 0 && (
                <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        Nenhum evento encontrado.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="bg-slate-50 p-3 text-xs text-slate-400 text-center border-t border-slate-200">
        Mostrando {processedEvents.length} de {events.length} eventos
      </div>
    </div>
  );
};

export default EventList;