import React, { useState, useMemo } from 'react';
import { EventData } from '../types';
import { ChevronLeft, ChevronRight, Calendar, MapPin } from 'lucide-react';
import { calculateDemandLevel } from '../utils';

interface CalendarViewProps {
  events: EventData[];
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const CalendarView: React.FC<CalendarViewProps> = ({ events }) => {
  const years = useMemo(() => Array.from(new Set(events.map(e => e.year))).sort(), [events]);
  const [selectedYear, setSelectedYear] = useState(years[0] || '2026');

  const eventsByMonth = useMemo(() => {
    const grouped: Record<string, EventData[]> = {};
    MONTHS.forEach(m => grouped[m] = []);
    
    events
      .filter(e => e.year === selectedYear)
      .forEach(e => {
        if (grouped[e.month]) {
          grouped[e.month].push(e);
        }
      });
      
    // Sort events within month by date
    Object.keys(grouped).forEach(m => {
        grouped[m].sort((a, b) => a.parsedStartDate.getTime() - b.parsedStartDate.getTime());
    });
    
    return grouped;
  }, [events, selectedYear]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="text-blue-600" size={24} />
          Calendário de Eventos
        </h2>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          {years.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                selectedYear === year 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {MONTHS.map((month) => {
          const monthEvents = eventsByMonth[month];
          if (monthEvents.length === 0) return null;

          return (
            <div key={month} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-semibold text-slate-700">{month}</h3>
                <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {monthEvents.length} eventos
                </span>
              </div>
              <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[400px]">
                {monthEvents.map(event => {
                    const demand = calculateDemandLevel(event);
                    return (
                        <div key={event.id} className="relative pl-4 border-l-2 border-slate-200 hover:border-blue-400 transition-colors">
                            <div className="flex flex-col">
                                <span className="text-xs text-slate-500 font-mono mb-0.5">
                                    {event.startDate.split('/')[0]} - {event.endDate.split('/')[0]}
                                </span>
                                <h4 className="text-sm font-semibold text-slate-800 leading-tight mb-1">{event.name}</h4>
                                <div className="flex items-center text-xs text-slate-500 mb-1">
                                    <MapPin size={10} className="mr-1" />
                                    {event.neighborhood}
                                </div>
                                {demand === 'Muito Alta' && (
                                    <span className="inline-block self-start text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                        Alta Demanda
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
