import React from 'react';
import { Calendar, Users, MapPin, TrendingUp } from 'lucide-react';
import { EventData } from '../types';

interface StatsCardsProps {
  totalEvents: number;
  busiestMonth: string;
  topNeighborhood: string;
  highDemandCount: number;
  events: EventData[]; // Needed for extra calculations if any
}

const StatsCards: React.FC<StatsCardsProps> = ({ totalEvents, busiestMonth, topNeighborhood, highDemandCount, events }) => {
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100 flex flex-col justify-between h-28">
        <div className="flex justify-between items-start">
            <p className="text-slate-500 text-xs font-bold uppercase">Total Eventos</p>
            <Calendar size={18} className="text-blue-500" />
        </div>
        <div>
            <h3 className="text-2xl font-bold text-slate-800">{totalEvents}</h3>
            <p className="text-[10px] text-slate-400">Filtrados</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100 flex flex-col justify-between h-28">
        <div className="flex justify-between items-start">
            <p className="text-slate-500 text-xs font-bold uppercase">Mês de Pico</p>
            <TrendingUp size={18} className="text-indigo-500" />
        </div>
        <div>
            <h3 className="text-xl font-bold text-slate-800 truncate" title={busiestMonth}>{busiestMonth}</h3>
            <p className="text-[10px] text-slate-400">Maior volume</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100 flex flex-col justify-between h-28">
        <div className="flex justify-between items-start">
            <p className="text-slate-500 text-xs font-bold uppercase">Top Bairro</p>
            <MapPin size={18} className="text-emerald-500" />
        </div>
        <div>
            <h3 className="text-lg font-bold text-slate-800 truncate" title={topNeighborhood}>{topNeighborhood}</h3>
            <p className="text-[10px] text-slate-400">Cluster principal</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100 flex flex-col justify-between h-28">
        <div className="flex justify-between items-start">
            <p className="text-slate-500 text-xs font-bold uppercase">Alta Demanda</p>
            <Users size={18} className="text-amber-500" />
        </div>
        <div>
            <h3 className="text-2xl font-bold text-slate-800">{highDemandCount}</h3>
            <p className="text-[10px] text-slate-400">Mega eventos</p>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;