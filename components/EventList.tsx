import React, { useState, useMemo } from 'react';
import { EventData } from '../types';
import { normalizeString, formatInclusionDate } from '../utils';
import { MapPin, Calendar, Building2, ArrowUpDown, ArrowUp, ArrowDown, Search, Clock } from 'lucide-react';

interface EventListProps {
  events: EventData[];
}

type SortConfig = {
  key: keyof EventData;
  direction: 'asc' | 'desc';
} | null;

const EventList: React.FC<EventListProps> = ({ events }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [filters, setFilters] = useState({
    name: '',
    startDate: '',
    endDate: '',
    venue: '',
    type: '',
    inclusion: ''
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
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