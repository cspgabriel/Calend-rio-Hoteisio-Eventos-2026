import React, { useMemo, useRef, useState } from 'react';
import { EventData } from '../types';
import { Calendar, MapPin, PlusCircle, Sparkles, Building2, Download, FileText, Share2, Check, Loader2, FileSpreadsheet, Clock } from 'lucide-react';
import { calculateDemandLevel, parseDate, formatInclusionDate } from '../utils';
import html2canvas from 'html2canvas';

interface RecentAdditionsViewProps {
  events: EventData[];
}

const RecentAdditionsView: React.FC<RecentAdditionsViewProps> = ({ events }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const recentEvents = useMemo(() => {
    // Ordenar pela data de inclusão (mais recente primeiro)
    return [...events].sort((a, b) => {
      const dateA = parseDate(a.inclusionDate).getTime();
      const dateB = parseDate(b.inclusionDate).getTime();
      return dateB - dateA;
    }).slice(0, 12);
  }, [events]);

  const handleDownloadPNG = async () => {
    if (!containerRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(containerRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f8fafc',
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `hoteisrio-novos-eventos-${new Date().toISOString().slice(0,10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Erro ao gerar PNG:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleDownloadExcel = () => {
    const headers = ["Nome do Evento", "Local", "Bairro", "Região", "Tipo", "Data Início", "Data Fim", "Data Inclusão", "Mês", "Ano"];
    const csvContent = [
      headers.join(";"),
      ...recentEvents.map(e => [
        `"${e.name.replace(/"/g, '""')}"`,
        `"${e.venue.replace(/"/g, '""')}"`,
        `"${e.neighborhood}"`,
        `"${e.region}"`,
        `"${e.type}"`,
        e.startDate,
        e.endDate,
        e.inclusionDate,
        e.month,
        e.year
      ].join(";"))
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `hoteisrio-novos-eventos-${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?view=recent`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'HoteisRio - Novos Eventos',
          text: 'Confira as últimas atualizações do Observatório de Eventos do Rio de Janeiro.',
          url: shareUrl,
        });
      } catch (err) {
        console.error('Erro ao compartilhar:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Erro ao copiar link:', err);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Action Toolbar */}
      <div className="no-print sticky top-0 z-30 bg-white/80 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest px-2">
          <Sparkles size={14} className="text-blue-500" />
          Ações de Exportação
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button 
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 text-sm font-semibold transition-all"
          >
            <FileSpreadsheet size={16} />
            Excel
          </button>
          <button 
            onClick={handleDownloadPNG}
            disabled={isExporting}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold transition-all disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            PNG
          </button>
          <button 
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold transition-all"
          >
            <FileText size={16} />
            PDF
          </button>
          <button 
            onClick={handleShare}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
              copied 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                : 'bg-[#003366] text-white border-[#003366] hover:bg-[#002b55]'
            }`}
          >
            {copied ? <Check size={16} /> : <Share2 size={16} />}
            {copied ? 'Copiado!' : 'Compartilhar'}
          </button>
        </div>
      </div>

      <div ref={containerRef} className="print-container space-y-8 p-1">
        <div className="bg-[#002b55] rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Sparkles size={120} />
          </div>
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full text-blue-300 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-500/30">
              <PlusCircle size={14} />
              Feed de Atualizações
            </div>
            <h2 className="text-3xl font-bold mb-4">Últimas Inclusões no Observatório</h2>
            <p className="text-blue-100/80 leading-relaxed text-lg">
              Acompanhe em tempo real os novos eventos mapeados pela curadoria do HoteisRio. 
              Estes registros foram inseridos recentemente na base de dados estratégica.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentEvents.map((event, index) => {
            const demand = calculateDemandLevel(event);
            return (
              <div 
                key={event.id} 
                className="bg-white rounded-xl shadow-md border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col group"
              >
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded uppercase tracking-tighter flex items-center gap-1">
                      <Clock size={10} />
                      Incluído em: {formatInclusionDate(event.inclusionDate)}
                    </span>
                    {demand === 'Muito Alta' && (
                      <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-1 rounded uppercase tracking-tighter border border-red-100">
                        Impacto Crítico
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-blue-700 transition-colors leading-tight">
                    {event.name}
                  </h3>

                  <div className="space-y-2.5 mb-6">
                    <div className="flex items-center text-sm text-slate-500">
                      <Calendar size={14} className="mr-2 text-blue-500" />
                      <span className="font-medium text-slate-700">{event.startDate} — {event.endDate}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-500">
                      <MapPin size={14} className="mr-2 text-emerald-500" />
                      <span>{event.neighborhood}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-500">
                      <Building2 size={14} className="mr-2 text-indigo-400" />
                      <span className="truncate">{event.venue}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50">
                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
                      {event.type}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-slate-100 rounded-xl p-6 text-center border-2 border-dashed border-slate-200 no-print">
          <p className="text-slate-500 text-sm">
            Este é um link de acesso restrito para verificação de dados recém-inseridos.<br/>
            Para a visão analítica completa, utilize o <strong>Dashboard Principal</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecentAdditionsView;