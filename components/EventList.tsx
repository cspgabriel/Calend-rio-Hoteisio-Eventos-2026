import React, { useState, useMemo, useCallback } from 'react';
import { EventData } from '../types';
import { normalizeString, formatInclusionDate } from '../utils';
import { MapPin, Calendar, ArrowUpDown, ArrowUp, ArrowDown, Search, Clock, Trash2, CheckSquare, Square } from 'lucide-react';

interface EventListProps {
  events: EventData[];
  onDeleteEvents?: (ids: string[]) => Promise<void>;
}

type SortConfig = {
  key: keyof EventData;
  direction: 'asc' | 'desc';
} | null;

const EventList: React.FC<EventListProps> = ({ events, onDeleteEvents }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
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

  const visibleIds = useMemo(() => processedEvents.map(e => e.id), [processedEvents]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some(id => selectedIds.has(id));

  const toggleSelectAll = useCallback(() => {
    if (allVisibleSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.add(id));
        return next;
      });
    }
  }, [allVisibleSelected, visibleIds]);

  const toggleSelectEvent = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (!onDeleteEvents || selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!window.confirm(`Excluir ${count} evento(s) selecionado(s) do Firebase? Esta ação não pode ser desfeita.`)) return;
    setIsDeleting(true);
    try {
      await onDeleteEvents(Array.from(selectedIds));
      setSelectedIds(new Set());
    } finally {
      setIsDeleting(false);
    }
  }, [onDeleteEvents, selectedIds]);

  const handleSelectAllEvents = useCallback(() => {
    setSelectedIds(new Set(events.map(e => e.id)));
  }, [events]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* Bulk action toolbar */}
      {onDeleteEvents && (
        <div className={`flex items-center justify-between px-6 py-3 border-b border-slate-200 transition-colors ${selectedIds.size > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
              title={allVisibleSelected ? 'Desmarcar visíveis' : 'Selecionar visíveis'}
            >
              {allVisibleSelected
                ? <CheckSquare size={16} className="text-blue-500" />
                : someVisibleSelected
                  ? <CheckSquare size={16} className="text-blue-300" />
                  : <Square size={16} className="text-slate-400" />
              }
              {allVisibleSelected ? 'Desmarcar todos' : 'Selecionar todos visíveis'}
            </button>
            <button
              onClick={handleSelectAllEvents}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 underline transition-colors"
            >
              Selecionar todos ({events.length})
            </button>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-red-600 bg-red-100 px-3 py-1 rounded-full">
                {selectedIds.size} selecionado(s)
              </span>
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex items-center gap-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 px-4 py-2 rounded-lg transition-colors"
              >
                {isDeleting
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Trash2 size={15} />
                }
                {isDeleting ? 'Excluindo...' : 'Excluir selecionados'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {onDeleteEvents && (
                <th className="pl-4 pr-2 py-4 w-8">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={el => { if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected; }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                    title="Selecionar / Desmarcar todos visíveis"
                  />
                </th>
              )}
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
            {processedEvents.map((event) => {
              const isSelected = selectedIds.has(event.id);
              return (
                <tr
                  key={event.id}
                  className={`transition-colors ${isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'}`}
                  onClick={onDeleteEvents ? () => toggleSelectEvent(event.id) : undefined}
                  style={onDeleteEvents ? { cursor: 'pointer' } : undefined}
                >
                  {onDeleteEvents && (
                    <td className="pl-4 pr-2 py-4" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectEvent(event.id)}
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                    </td>
                  )}
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
              );
            })}
            {processedEvents.length === 0 && (
                <tr>
                    <td colSpan={onDeleteEvents ? 6 : 5} className="px-6 py-8 text-center text-slate-500">
                        Nenhum evento encontrado.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="bg-slate-50 p-3 text-xs text-slate-400 text-center border-t border-slate-200">
        Mostrando {processedEvents.length} de {events.length} eventos
        {selectedIds.size > 0 && (
          <span className="ml-2 text-blue-500 font-medium">· {selectedIds.size} selecionado(s)</span>
        )}
      </div>
    </div>
  );
};

export default EventList;