import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { EventData } from '../types';
import { MapPin } from 'lucide-react';

interface ChartsProps {
  events: EventData[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export const MonthlyChart: React.FC<ChartsProps> = ({ events }) => {
  const data = React.useMemo(() => {
    const counts: Record<string, number> = {};
    const monthOrder = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    events.forEach(e => {
      counts[e.month] = (counts[e.month] || 0) + 1;
    });

    // Map ALL months to ensure the chart shows the full year context
    return monthOrder.map(month => ({
      name: month.substring(0, 3), // Short name for cleaner axis
      fullName: month,
      eventos: counts[month] || 0
    }));
  }, [events]);

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip 
            cursor={{ fill: '#f1f5f9' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            formatter={(value: number) => [value, 'Eventos']}
            labelFormatter={(label) => {
                const item = data.find(d => d.name === label);
                return item ? item.fullName : label;
            }}
          />
          <Bar dataKey="eventos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const TypeRankingChart: React.FC<ChartsProps> = ({ events }) => {
  const data = React.useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(e => {
      let type = e.type.split(' ')[0];
      if (type === 'Feira') type = 'Feira/Expo';
      if (type === 'Exposição') type = 'Feira/Expo';
      counts[type] = (counts[type] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7); 
  }, [events]);

  const maxVal = Math.max(...data.map(d => d.value));

  return (
    <div className="h-80 w-full overflow-y-auto pr-2">
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={item.name} className="relative">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-slate-700">{index + 1}. {item.name}</span>
              <span className="text-slate-500">{item.value}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
              <div 
                className="h-2.5 rounded-full" 
                style={{ 
                  width: `${(item.value / maxVal) * 100}%`,
                  backgroundColor: COLORS[index % COLORS.length]
                }}
              ></div>
            </div>
          </div>
        ))}
        {data.length === 0 && <p className="text-slate-400 text-sm text-center mt-10">Sem dados de tipologia.</p>}
      </div>
    </div>
  );
};

export const GeoMap: React.FC<ChartsProps> = ({ events }) => {
    // Basic implementation of a coordinate plotter
    // Rio de Janeiro roughly: Lat -23.08 to -22.75, Lng -43.7 to -43.1
    
    // 1. Filter valid points
    const points = React.useMemo(() => {
        return events.filter(e => e.lat && e.lng && e.lat !== -22.9068); // Exclude default if set manually
    }, [events]);

    if (points.length === 0) return <div className="h-80 flex items-center justify-center text-slate-400">Sem dados de localização GPS.</div>;

    // 2. Calculate bounds
    const minLat = Math.min(...points.map(p => p.lat));
    const maxLat = Math.max(...points.map(p => p.lat));
    const minLng = Math.min(...points.map(p => p.lng));
    const maxLng = Math.max(...points.map(p => p.lng));

    // Padding
    const latPad = (maxLat - minLat) * 0.1;
    const lngPad = (maxLng - minLng) * 0.1;

    // Scale function
    const normalize = (val: number, min: number, max: number) => (val - min) / (max - min);

    return (
        <div className="h-80 w-full relative bg-blue-50/30 rounded-lg border border-slate-100 overflow-hidden">
            {/* Simple Grid Background to simulate map */}
            <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-10 pointer-events-none">
                {[...Array(36)].map((_, i) => <div key={i} className="border border-slate-300"></div>)}
            </div>
            
            <div className="absolute top-2 right-2 bg-white/80 p-2 rounded text-[10px] text-slate-500 z-10">
                Norte
            </div>

            <div className="relative w-full h-full p-4">
                {points.map(event => {
                    // Invert Lat because screen Y goes down, but Latitude goes up (North)
                    // Actually Lat is negative, so closer to 0 is North. 
                    // -22.8 (North) -> 0% Top
                    // -23.0 (South) -> 100% Bottom
                    
                    const x = normalize(event.lng, minLng - lngPad, maxLng + lngPad) * 100;
                    const y = (1 - normalize(event.lat, minLat - latPad, maxLat + latPad)) * 100;

                    return (
                        <div 
                            key={event.id}
                            className="absolute group transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                            style={{ left: `${x}%`, top: `${y}%` }}
                        >
                            <MapPin size={16} className={`text-blue-600 drop-shadow-md ${event.type.includes('Feira') ? 'text-purple-600' : ''}`} fill="currentColor" fillOpacity={0.2} />
                            
                            {/* Tooltip */}
                            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white p-2 rounded shadow-xl border border-slate-200 z-20 w-40 text-center">
                                <p className="font-bold text-xs text-slate-800">{event.name}</p>
                                <p className="text-[10px] text-slate-500">{event.venue}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-slate-400 pointer-events-none">
                Visualização Geoespacial Aproximada (Baseada em Lat/Lng)
            </div>
        </div>
    );
};