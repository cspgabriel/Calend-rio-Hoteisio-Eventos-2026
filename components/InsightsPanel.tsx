import React from 'react';
import { EventData } from '../types';
import { Lightbulb } from 'lucide-react';

interface InsightsPanelProps {
  events: EventData[];
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ events }) => {
  // Generate dynamic insights
  const insights = React.useMemo(() => {
    const list = [];
    
    // Insight 1: Peak dates
    const monthCounts: Record<string, number> = {};
    events.forEach(e => monthCounts[e.month] = (monthCounts[e.month] || 0) + 1);
    const topMonth = Object.keys(monthCounts).reduce((a, b) => monthCounts[a] > monthCounts[b] ? a : b, '');
    
    if (topMonth) {
      list.push(`O mês de **${topMonth}** apresenta a maior concentração de oportunidades, com ${monthCounts[topMonth]} eventos agendados. Prepare tarifas dinâmicas para este período.`);
    }

    // Insight 2: Location Hotspots
    const locCounts: Record<string, number> = {};
    events.forEach(e => locCounts[e.neighborhood] = (locCounts[e.neighborhood] || 0) + 1);
    const barraCount = (locCounts['Barra da Tijuca'] || 0) + (locCounts['Barra Olímpica'] || 0);
    
    if (barraCount > events.length * 0.4) {
      list.push(`A região da **Barra (Tijuca/Olímpica)** concentra ${(barraCount / events.length * 100).toFixed(0)}% dos eventos. Hotéis na Zona Sul devem focar em transfer e pacotes de lazer pré/pós evento.`);
    }

    // Insight 3: Corporate vs Leisure
    const corpTypes = events.filter(e => e.type.match(/Congresso|Conferência|Feira|Summit/i)).length;
    if (corpTypes > events.length / 2) {
       list.push(`Perfil predominante **Corporativo (${(corpTypes / events.length * 100).toFixed(0)}%)**. Foco sugerido em serviços de business center, wi-fi de alta velocidade e early breakfast.`);
    } else {
       list.push(`Perfil misto com forte presença de **Lazer/Festivais**. Prepare operações para check-ins tardios e café da manhã estendido.`);
    }

    return list;
  }, [events]);

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl p-6 text-white shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="text-yellow-400" size={24} />
        <h3 className="text-lg font-bold">Insights Estratégicos</h3>
      </div>
      <div className="space-y-4">
        {insights.map((insight, idx) => (
          <div key={idx} className="flex gap-3 items-start">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
            <p className="text-sm text-indigo-100 leading-relaxed" dangerouslySetInnerHTML={{ 
              __html: insight.replace(/\*\*(.*?)\*\*/g, '<span class="font-bold text-white">$1</span>') 
            }} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsightsPanel;