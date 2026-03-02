import React, { useMemo, useState } from 'react';
import { EventData } from '../types';
import { MapPin, Building, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface LocationViewProps {
  events: EventData[];
}

const LocationView: React.FC<LocationViewProps> = ({ events }) => {
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);

  const locationData = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(e => {
        const hood = e.neighborhood === 'A definir' ? 'Outros' : e.neighborhood;
        counts[hood] = (counts[hood] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (!selectedNeighborhood) return [];
    return events.filter(e => {
        const hood = e.neighborhood === 'A definir' ? 'Outros' : e.neighborhood;
        return hood === selectedNeighborhood;
    });
  }, [events, selectedNeighborhood]);

  const activeData = selectedNeighborhood ? locationData.filter(d => d.name === selectedNeighborhood) : locationData;

  return (
    <div className="space-y-6">
       <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <MapPin className="text-emerald-500 mr-2" size={20} />
            Densidade por Bairro
        </h2>
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11}} interval={0} />
                    <Tooltip cursor={{fill: '#f1f5f9'}} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} onClick={(data) => setSelectedNeighborhood(data.name)} className="cursor-pointer">
                        {locationData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.name === selectedNeighborhood ? '#10b981' : '#64748b'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">Clique em uma barra para ver os detalhes do bairro.</p>
       </div>

       {selectedNeighborhood && (
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
               <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 flex justify-between items-center">
                   <div>
                       <h3 className="text-lg font-bold text-emerald-900">{selectedNeighborhood}</h3>
                       <p className="text-sm text-emerald-700">{filteredEvents.length} eventos listados</p>
                   </div>
                   <button onClick={() => setSelectedNeighborhood(null)} className="text-sm text-emerald-600 hover:text-emerald-800 font-medium">
                       Ver Todos
                   </button>
               </div>
               <div className="divide-y divide-slate-100">
                   {filteredEvents.map(event => (
                       <div key={event.id} className="p-4 hover:bg-slate-50 flex items-center justify-between group">
                           <div>
                               <h4 className="font-semibold text-slate-800">{event.name}</h4>
                               <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                   <span className="flex items-center"><Building size={12} className="mr-1"/> {event.venue}</span>
                                   <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                   <span>{event.startDate}</span>
                               </div>
                           </div>
                           <div className="text-right">
                               <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                   {event.type}
                               </span>
                           </div>
                       </div>
                   ))}
               </div>
           </div>
       )}
    </div>
  );
};

export default LocationView;
