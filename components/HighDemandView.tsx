import React, { useMemo, useState } from 'react';
import { EventData } from '../types';
import { calculateDemandLevel, getDurationDays } from '../utils';
import { TrendingUp, Users, DollarSign, Star, Filter } from 'lucide-react';

interface HighDemandViewProps {
  events: EventData[];
}

const HighDemandView: React.FC<HighDemandViewProps> = ({ events }) => {
  const [demandFilter, setDemandFilter] = useState<'Todos' | 'Muito Alta' | 'Alta'>('Todos');

  // 1. Calculate metrics and sort all high demand events
  const allHighImpactEvents = useMemo(() => {
    return events
      .map(event => {
        const demand = calculateDemandLevel(event);
        // Calculate a score for sorting: Very High = 2, High = 1
        let score = demand === 'Muito Alta' ? 100 : (demand === 'Alta' ? 50 : 0);
        
        // Boost for duration (Longer events = more room nights)
        const duration = getDurationDays(event.parsedStartDate, event.parsedEndDate);
        score += duration * 2;

        return { ...event, demand, score, duration };
      })
      .filter(e => e.demand === 'Muito Alta' || e.demand === 'Alta')
      .sort((a, b) => b.score - a.score); // Descending order
  }, [events]);

  // 2. Apply the local view filter
  const displayedEvents = useMemo(() => {
    if (demandFilter === 'Todos') return allHighImpactEvents;
    return allHighImpactEvents.filter(e => e.demand === demandFilter);
  }, [allHighImpactEvents, demandFilter]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 rounded-xl text-white shadow-lg mb-8">
        <h2 className="text-2xl font-bold mb-2 flex items-center">
            <TrendingUp className="mr-3" />
            Oportunidades de Receita (Top Picks)
        </h2>
        <p className="text-indigo-100 max-w-2xl">
            Eventos classificados como "Alta" ou "Muito Alta" demanda. 
            Estes geradores de fluxo exigem estratégias de Revenue Management antecipadas (restrições de MLOS, tarifas premium e pacotes).
        </p>
      </div>

      {/* Demand Filter Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm font-semibold text-slate-500 mr-2 flex items-center">
          <Filter size={16} className="mr-1" />
          Filtrar Demanda:
        </span>
        <button 
          onClick={() => setDemandFilter('Todos')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            demandFilter === 'Todos' 
              ? 'bg-slate-800 text-white shadow-md' 
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Todos ({allHighImpactEvents.length})
        </button>
        <button 
          onClick={() => setDemandFilter('Muito Alta')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            demandFilter === 'Muito Alta' 
              ? 'bg-red-600 text-white shadow-md' 
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-red-50 hover:text-red-600'
          }`}
        >
          Muito Alta
        </button>
        <button 
          onClick={() => setDemandFilter('Alta')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            demandFilter === 'Alta' 
              ? 'bg-orange-500 text-white shadow-md' 
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50 hover:text-orange-600'
          }`}
        >
          Alta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedEvents.map((event, idx) => (
            <div key={event.id} className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 group animate-in fade-in slide-in-from-bottom-4">
                <div className={`h-2 w-full transition-colors ${event.demand === 'Muito Alta' ? 'bg-red-500' : 'bg-orange-400'}`}></div>
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${event.demand === 'Muito Alta' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                            {event.demand} Demanda
                        </span>
                        {/* Show star only if it's top 3 overall, regardless of filter */}
                        {allHighImpactEvents.indexOf(event) < 3 && <Star className="text-yellow-400 fill-yellow-400" size={18} />}
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight">{event.name}</h3>
                    
                    <div className="space-y-2 text-sm text-slate-600 mb-6">
                        <p className="flex items-center"><Users size={14} className="mr-2 text-slate-400"/> {event.type}</p>
                        <p className="flex items-center"><DollarSign size={14} className="mr-2 text-slate-400"/> Potencial: {event.duration} noites (est.)</p>
                        <p className="text-xs text-slate-400 mt-1">{event.startDate} • {event.venue}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-semibold text-slate-900 uppercase mb-2">Ação Sugerida</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            {event.type.includes('Congresso') ? 'Foco em Corporate rates e Business Services.' : 
                             event.type.includes('Festival') || event.type.includes('Show') ? 'Pacotes de lazer, late check-out e transporte.' :
                             'Monitorar compset agressivamente.'}
                        </p>
                    </div>
                </div>
            </div>
        ))}
        {displayedEvents.length === 0 && (
            <div className="col-span-full py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-500">Nenhum evento encontrado para este nível de demanda.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default HighDemandView;