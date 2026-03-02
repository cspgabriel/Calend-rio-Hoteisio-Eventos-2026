import React, { useMemo } from 'react';
import { EventData } from '../types';
import { Calendar, MapPin, Clock } from 'lucide-react';

interface UpcomingEventsProps {
  events: EventData[];
}

const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ events }) => {
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    // Reset time to compare dates only
    today.setHours(0, 0, 0, 0);

    return events
      .filter(event => event.parsedStartDate >= today)
      .sort((a, b) => a.parsedStartDate.getTime() - b.parsedStartDate.getTime())
      .slice(0, 5); // Get top 5 upcoming
  }, [events]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[450px] overflow-hidden flex flex-col">
      <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center">
        <Clock size={16} className="mr-2 text-blue-500" />
        Próximos Eventos
      </h3>
      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {upcomingEvents.map((event) => (
          <div key={event.id} className="flex gap-3 items-start p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group">
            <div className="bg-blue-50 text-blue-700 rounded-lg p-2 text-center min-w-[50px]">
              <span className="block text-xs font-bold uppercase">{event.month.substring(0, 3)}</span>
              <span className="block text-lg font-bold">{event.startDate.split('/')[0]}</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 line-clamp-2 group-hover:text-blue-600 transition-colors">
                {event.name}
              </h4>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                <span className="flex items-center">
                   <MapPin size={10} className="mr-1" />
                   {event.neighborhood}
                </span>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <span>{event.type}</span>
              </div>
            </div>
          </div>
        ))}
        {upcomingEvents.length === 0 && (
          <div className="text-center py-10 text-slate-400 text-sm">
            Nenhum evento futuro encontrado.
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingEvents;