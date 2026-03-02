import React, { useMemo, useState } from 'react';
import { EventData } from '../types';
import { Plane, MapPin, Calendar, Globe, BarChart3, PieChart, Info, Search, Filter, RotateCcw, Download } from 'lucide-react';
import { normalizeString } from '../utils';

interface TourismFairsViewProps {
  events: EventData[];
}

const MONTH_ORDER = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const TourismFairsView: React.FC<TourismFairsViewProps> = ({ events }) => {
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('Classificação');
  const [selectedVenue, setSelectedVenue] = useState('Todos os Locais');
  const [selectedType, setSelectedType] = useState('Todos os Tipos');
  const [selectedMonth, setSelectedMonth] = useState('Todos os Meses');
  const [selectedCountry, setSelectedCountry] = useState('Todos os Países');
  const [selectedCity, setSelectedCity] = useState('Todas as Cidades');
  const [selectedState, setSelectedState] = useState('Todos os Estados');

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedRegion('Classificação');
    setSelectedVenue('Todos os Locais');
    setSelectedType('Todos os Tipos');
    setSelectedMonth('Todos os Meses');
    setSelectedCountry('Todos os Países');
    setSelectedCity('Todas as Cidades');
    setSelectedState('Todos os Estados');
  };

  const handleDownloadExcel = () => {
    const headers = ["Nome da Feira", "Local", "Cidade", "Estado", "País", "Classificação", "Tipo", "Data Início", "Data Fim", "Mês", "Ano"];
    const csvContent = [
      headers.join(";"),
      ...filteredEvents.map(e => [
        `"${e.name.replace(/"/g, '""')}"`,
        `"${e.venue.replace(/"/g, '""')}"`,
        `"${e.city || ''}"`,
        `"${e.state || ''}"`,
        `"${e.country || ''}"`,
        `"${e.region}"`,
        `"${e.type}"`,
        e.startDate,
        e.endDate,
        e.month,
        e.year
      ].join(";"))
    ].join("\n");
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `feiras_turismo_rio_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Extract unique filter options from the provided events
  const filterOptions = useMemo(() => {
    // Explicitly exclude 'Centro' from regions list
    const regions = Array.from(new Set(events.map(e => e.region)))
      .filter(r => Boolean(r) && r !== 'Centro')
      .sort();
      
    const venues = Array.from(new Set(events.map(e => e.venue))).filter(Boolean).sort();
    const types = Array.from(new Set(events.map(e => e.type))).filter(Boolean).sort();
    const months = MONTH_ORDER.filter(m => events.some(e => e.month === m));
    const countries = Array.from(new Set(events.map(e => e.country))).filter(Boolean).sort();
    const cities = Array.from(new Set(events.map(e => e.city))).filter(Boolean).sort();
    
    // Filter states to show ONLY Brazilian states as requested
    const states = Array.from(new Set(
      events
        .filter(e => e.country === 'Brasil')
        .map(e => e.state)
    )).filter(Boolean).sort();
    
    return { regions, venues, types, months, countries, cities, states };
  }, [events]);

  // Apply Filters
  const filteredEvents = useMemo(() => {
    const normalizedSearch = normalizeString(searchTerm);

    return events.filter(event => {
      const matchesSearch = searchTerm === '' ||
        normalizeString(event.name).includes(normalizedSearch) ||
        normalizeString(event.venue).includes(normalizedSearch);
      
      const matchesRegion = selectedRegion === 'Classificação' || event.region === selectedRegion;
      const matchesVenue = selectedVenue === 'Todos os Locais' || event.venue === selectedVenue;
      const matchesType = selectedType === 'Todos os Tipos' || event.type === selectedType;
      const matchesMonth = selectedMonth === 'Todos os Meses' || event.month === selectedMonth;
      const matchesCountry = selectedCountry === 'Todos os Países' || event.country === selectedCountry;
      const matchesCity = selectedCity === 'Todas as Cidades' || event.city === selectedCity;
      const matchesState = selectedState === 'Todos os Estados' || event.state === selectedState;

      return matchesSearch && matchesRegion && matchesVenue && matchesType && matchesMonth && matchesCountry && matchesCity && matchesState;
    });
  }, [events, searchTerm, selectedRegion, selectedVenue, selectedType, selectedMonth, selectedCountry, selectedCity, selectedState]);

  const { international, national, stats } = useMemo(() => {
    const intFairs = filteredEvents.filter(e => e.region === 'Internacional');
    const natFairs = filteredEvents.filter(e => e.region === 'Nacional' || e.region === 'Centro' || e.region === 'Outros');

    const monthCounts: Record<string, number> = {};
    filteredEvents.forEach(e => {
      monthCounts[e.month] = (monthCounts[e.month] || 0) + 1;
    });

    const busiestMonth = Object.keys(monthCounts).length > 0 
      ? Object.keys(monthCounts).reduce((a, b) => (monthCounts[a] > monthCounts[b]) ? a : b) 
      : 'N/A';

    const totalDestinations = new Set(filteredEvents.map(e => e.city)).size;

    return {
      international: intFairs,
      national: natFairs,
      stats: {
        total: filteredEvents.length,
        intCount: intFairs.length,
        natCount: natFairs.length,
        busiestMonth,
        destinations: totalDestinations
      }
    };
  }, [filteredEvents]);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#003366] to-[#006699] p-8 rounded-2xl text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Plane size={140} className="rotate-12" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-white text-xs font-bold uppercase tracking-wider mb-4 border border-white/30">
            <Plane size={14} />
            Calendário Promocional 2026
          </div>
          <h2 className="text-3xl font-bold mb-4">Feiras e Eventos de Turismo</h2>
          <p className="text-blue-100 max-w-2xl text-lg leading-relaxed">
            Consulte o cronograma de promoção do destino Rio de Janeiro. Estas eventos são fundamentais para entender o fluxo de captação de turistas nacionais e estrangeiros.
          </p>
        </div>
      </div>

      {/* Local Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Filter size={14} />
              Filtrar Feiras
          </div>
          <div className="flex items-center gap-2">
            <button 
                onClick={handleDownloadExcel}
                className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200"
            >
                <Download size={14} />
                Exportar Excel
            </button>
            <button 
                onClick={clearFilters}
                className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
            >
                <RotateCcw size={14} />
                Limpar Filtros
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="flex items-center bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all">
            <Search size={16} className="text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Nome do evento..." 
              className="bg-transparent border-none outline-none text-xs w-full placeholder-slate-400 text-slate-700" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>

          <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg p-2 outline-none cursor-pointer hover:bg-slate-50 transition-colors">
            <option>Todos os Países</option>
            {filterOptions.countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg p-2 outline-none cursor-pointer hover:bg-slate-50 transition-colors">
            <option>Todos os Estados</option>
            {filterOptions.states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg p-2 outline-none cursor-pointer hover:bg-slate-50 transition-colors">
            <option>Todas as Cidades</option>
            {filterOptions.cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg p-2 outline-none cursor-pointer hover:bg-slate-50 transition-colors font-medium">
            <option>Classificação</option>
            {filterOptions.regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <select value={selectedVenue} onChange={(e) => setSelectedVenue(e.target.value)} className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg p-2 outline-none cursor-pointer hover:bg-slate-50 transition-colors">
            <option>Todos os Locais</option>
            {filterOptions.venues.map(v => <option key={v} value={v}>{v}</option>)}
          </select>

          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg p-2 outline-none cursor-pointer hover:bg-slate-50 transition-colors">
            <option>Todos os Tipos</option>
            {filterOptions.types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg p-2 outline-none cursor-pointer hover:bg-slate-50 transition-colors">
            <option>Todos os Meses</option>
            {filterOptions.months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Statistics Dashboard for Tourism Fairs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-tight">Total de Feiras</span>
            <BarChart3 size={18} className="text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
          <p className="text-xs text-slate-400 mt-1">Resultados filtrados</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-tight">Divisão Regional</span>
            <PieChart size={18} className="text-indigo-500" />
          </div>
          <div className="flex items-center gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">{stats.intCount}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Internacionais</p>
            </div>
            <div className="h-8 w-px bg-slate-100"></div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{stats.natCount}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Nacionais</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-tight">Mês com mais Ações</span>
            <Calendar size={18} className="text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 truncate">{stats.busiestMonth}</h3>
          <p className="text-xs text-slate-400 mt-1">Pico de promoção</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-tight">Cidades Destino</span>
            <MapPin size={18} className="text-amber-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{stats.destinations}</h3>
          <p className="text-xs text-slate-400 mt-1">Locais de exposição</p>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-800 text-sm">
        <span className="bg-blue-600 text-white p-1 rounded-full"><Info size={14} /></span>
        <p>Dados atualizados conforme o calendário oficial das principais entidades do setor. <strong>Base estratégica de 150+ eventos preservada.</strong></p>
      </div>

      {/* Internacional Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
            <Globe className="text-blue-600" size={24} />
            Feiras Internacionais
            <span className="ml-auto text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
              {international.length} Eventos
            </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {international.map(event => (
                <div key={event.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-12 -mt-12 z-0 group-hover:bg-blue-100 transition-colors"></div>
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold tracking-widest text-blue-600 uppercase mb-2 block">Mercado Global • {event.country}</span>
                        <h4 className="text-lg font-bold text-slate-800 mb-3 group-hover:text-blue-700 transition-colors">{event.name}</h4>
                        <div className="space-y-2.5 text-sm text-slate-600">
                             <div className="flex items-center">
                                <Calendar size={14} className="mr-2 text-slate-400" />
                                <span className="font-medium">{event.startDate} a {event.endDate}</span>
                             </div>
                             <div className="flex items-center">
                                <MapPin size={14} className="mr-2 text-slate-400" />
                                <span className="truncate">{event.city}, {event.country}</span>
                             </div>
                        </div>
                    </div>
                </div>
            ))}
            {international.length === 0 && (
              <div className="col-span-full py-10 text-center text-slate-400 bg-white rounded-xl border border-dashed">
                Nenhuma feira internacional encontrada com os filtros atuais.
              </div>
            )}
        </div>
      </div>

      {/* Nacional Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
            <MapPin className="text-emerald-600" size={24} />
            Feiras Nacionais & Locais
            <span className="ml-auto text-xs font-medium bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
              {national.length} Eventos
            </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {national.map(event => (
                <div key={event.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -mr-12 -mt-12 z-0 group-hover:bg-green-100 transition-colors"></div>
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold tracking-widest text-green-600 uppercase mb-2 block">Mercado Nacional • {event.state}</span>
                        <h4 className="text-lg font-bold text-slate-800 mb-3 group-hover:text-emerald-700 transition-colors">{event.name}</h4>
                        <div className="space-y-2.5 text-sm text-slate-600">
                             <div className="flex items-center">
                                <Calendar size={14} className="mr-2 text-slate-400" />
                                <span className="font-medium">{event.startDate} a {event.endDate}</span>
                             </div>
                             <div className="flex items-center">
                                <MapPin size={14} className="mr-2 text-slate-400" />
                                <span className="truncate">{event.city}, {event.state}</span>
                             </div>
                        </div>
                    </div>
                </div>
            ))}
             {national.length === 0 && (
               <div className="col-span-full py-10 text-center text-slate-400 bg-white rounded-xl border border-dashed">
                 Nenhuma feira nacional encontrada com os filtros atuais.
               </div>
             )}
        </div>
      </div>
    </div>
  );
};

export default TourismFairsView;