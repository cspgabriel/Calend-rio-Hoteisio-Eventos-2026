import React, { useState, useMemo, useEffect } from 'react';
import { EVENTS, TOURISM_FAIRS } from './constants';
import { EventData } from './types';
import StatsCards from './components/StatsCards';
import { MonthlyChart, TypeRankingChart } from './components/Charts';
import EventList from './components/EventList';
import InsightsPanel from './components/InsightsPanel';
import CalendarView from './components/CalendarView';
import LocationView from './components/LocationView';
import HighDemandView from './components/HighDemandView';
import UpcomingEvents from './components/UpcomingEvents';
import RecentAdditionsView from './components/RecentAdditionsView';
import TourismFairsView from './components/TourismFairsView';
import { calculateDemandLevel, normalizeString } from './utils';
import { 
  Search, LayoutDashboard, List, Calendar as CalendarIcon, 
  Map as MapIcon, TrendingUp, Menu, X, Filter, Download, 
  ChevronLeft, RotateCcw, Sparkles, Plane, Plus
} from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

type ViewType = 'dashboard' | 'list' | 'calendar' | 'location' | 'high-demand' | 'recent-additions' | 'tourism-fairs';

const MONTH_ORDER = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const NAV_ITEMS = [
  { id: 'list', label: 'Lista Completa', icon: List },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'recent-additions', label: 'Novos Eventos', icon: Sparkles },
  { id: 'tourism-fairs', label: 'Feiras de Turismo', icon: Plane },
  { id: 'calendar', label: 'Por Ano/Mês', icon: CalendarIcon },
  { id: 'location', label: 'Por Localidade', icon: MapIcon },
  { id: 'high-demand', label: 'Mais Público', icon: TrendingUp },
];

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('list');
  
  const [events, setEvents] = useState<EventData[]>([]);
  
  const isEmbed = useMemo(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('mode') === 'embed';
    }
    return false;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'recent') {
      setActiveView('recent-additions');
    } else if (params.get('view') === 'fairs') {
      setActiveView('tourism-fairs');
    }
  }, []);
  
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(!isEmbed);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('Todas as Regiões');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('Todos os Bairros');
  const [selectedVenue, setSelectedVenue] = useState('Todos os Locais');
  const [selectedType, setSelectedType] = useState('Todos os Tipos');
  const [selectedMonth, setSelectedMonth] = useState('Todos os Meses');
  const [selectedYear, setSelectedYear] = useState('Todos os Anos');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: '', venue: '', type: '', start: '', end: '', neighborhood: '', region: '' });

  const loadEvents = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'events'));
      const eventsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().start,
        endDate: doc.data().end,
        inclusionDate: doc.data().addedAt
      } as EventData));
      setEvents(eventsData);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedRegion('Todas as Regiões');
    setSelectedNeighborhood('Todos os Bairros');
    setSelectedVenue('Todos os Locais');
    setSelectedType('Todos os Tipos');
    setSelectedMonth('Todos os Meses');
    setSelectedYear('Todos os Anos');
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'events', id));
      loadEvents();
    } catch (error) {
      alert('Erro ao excluir evento: ' + error.message);
    }
  };

  const filterOptions = useMemo(() => {
    const regions = Array.from(new Set(EVENTS.map(e => e.region))).sort();
    const neighborhoods = Array.from(new Set(EVENTS.map(e => e.neighborhood))).sort();
    const venues = Array.from(new Set(EVENTS.map(e => e.venue))).sort();
    const types = Array.from(new Set(EVENTS.map(e => e.type))).sort();
    const years = Array.from(new Set(EVENTS.map(e => e.year))).sort();
    const months = MONTH_ORDER;
    return { regions, neighborhoods, venues, types, months, years };
  }, []);

  const filteredEvents = useMemo(() => {
    const normalizedSearch = normalizeString(searchTerm);

    return events.concat(EVENTS).filter(event => {
      const matchesSearch = searchTerm === '' ||
        normalizeString(event.name).includes(normalizedSearch) ||
        normalizeString(event.venue).includes(normalizedSearch) ||
        normalizeString(event.type).includes(normalizedSearch);
      
      const matchesRegion = selectedRegion === 'Todas as Regiões' || event.region === selectedRegion;
      const matchesNeighborhood = selectedNeighborhood === 'Todos os Bairros' || event.neighborhood === selectedNeighborhood;
      const matchesVenue = selectedVenue === 'Todos os Locais' || event.venue === selectedVenue;
      const matchesType = selectedType === 'Todos os Tipos' || event.type === selectedType;
      const matchesMonth = selectedMonth === 'Todos os Meses' || event.month === selectedMonth;
      const matchesYear = selectedYear === 'Todos os Anos' || event.year === selectedYear;

      return matchesSearch && matchesRegion && matchesNeighborhood && matchesVenue && matchesType && matchesMonth && matchesYear;
    });
  }, [searchTerm, selectedRegion, selectedNeighborhood, selectedVenue, selectedType, selectedMonth, selectedYear, events]);

  const stats = useMemo(() => {
    const total = filteredEvents.length;
    const monthCounts: Record<string, number> = {};
    const neighborhoodCounts: Record<string, number> = {};
    let highDemand = 0;

    filteredEvents.forEach(e => {
      monthCounts[e.month] = (monthCounts[e.month] || 0) + 1;
      neighborhoodCounts[e.neighborhood] = (neighborhoodCounts[e.neighborhood] || 0) + 1;
      const demand = calculateDemandLevel(e);
      if (demand === 'Muito Alta' || demand === 'Alta') highDemand++;
    });

    const busiestMonth = Object.keys(monthCounts).reduce((a, b) => monthCounts[a] > monthCounts[b] ? a : b, '-');
    const topNeighborhood = Object.keys(neighborhoodCounts).reduce((a, b) => neighborhoodCounts[a] > neighborhoodCounts[b] ? a : b, '-');

    return { total, busiestMonth, topNeighborhood, highDemand };
  }, [filteredEvents]);

  const toggleMobileSidebar = () => setIsMobileSidebarOpen(!isMobileSidebarOpen);
  const toggleDesktopSidebar = () => setIsDesktopSidebarOpen(!isDesktopSidebarOpen);

  const handleViewChange = (view: ViewType) => {
      setActiveView(view);
      setIsMobileSidebarOpen(false);
      const url = new URL(window.location.href);
      if (view === 'recent-additions') {
        url.searchParams.set('view', 'recent');
      } else if (view === 'tourism-fairs') {
        url.searchParams.set('view', 'fairs');
      } else {
        url.searchParams.delete('view');
      }
      window.history.pushState({}, '', url);
  };

  const handleDownloadExcel = () => {
    const headers = ["Nome do Evento", "Local", "Bairro", "Região", "Tipo", "Data Início", "Data Fim", "Mês", "Ano"];
    const csvContent = [
      headers.join(";"),
      ...filteredEvents.map(e => [
        `"${e.name.replace(/"/g, '""')}"`,
        `"${e.venue.replace(/"/g, '""')}"`,
        `"${e.neighborhood}"`,
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
    link.setAttribute("download", `eventos_rio_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`min-h-screen bg-slate-50 flex ${isEmbed ? 'flex-col' : 'flex-row'}`}>
      
      {isMobileSidebarOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={toggleMobileSidebar}></div>
      )}

      <aside 
        className={`
          fixed md:sticky top-0 left-0 h-screen bg-gradient-to-b from-[#003366] to-[#001a33] text-white z-50 
          transform transition-all duration-300 ease-in-out shadow-2xl flex flex-col
          ${isMobileSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full'} 
          ${!isEmbed ? (isDesktopSidebarOpen ? 'md:translate-x-0 md:w-64' : 'md:translate-x-0 md:w-0 md:overflow-hidden') : 'md:hidden'}
        `}
      >
          <div className="p-6 border-b border-white/10 flex items-center justify-between min-w-[16rem]">
              <div className="w-full flex justify-center md:justify-start">
                  <img src="https://sindhoteisrj.com.br/wp-content/uploads/2023/04/Logo-HoteisRIO-Branca-Fundo-Transparente.png" alt="HoteisRIO" className="h-14 object-contain" />
              </div>
              <button onClick={toggleMobileSidebar} className="md:hidden text-white/70 hover:text-white"><X size={20}/></button>
          </div>

          <nav className="flex-1 py-6 px-4 space-y-2 min-w-[16rem]">
              {NAV_ITEMS.map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => handleViewChange(item.id as ViewType)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeView === item.id ? 'bg-white/20 text-white shadow-sm font-medium' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}
                  >
                      <item.icon size={20} />
                      {item.label}
                  </button>
              ))}
          </nav>

          <div className="p-4 border-t border-white/10 min-w-[16rem]">
              <div className="bg-black/20 rounded-lg p-4">
                  <p className="text-xs text-blue-200 mb-1">Status do Sistema</p>
                  <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium text-emerald-200">Dados Atualizados</span>
                  </div>
              </div>
          </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden h-screen">
          <header className={`bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shrink-0 ${isEmbed ? 'md:hidden' : ''}`}>
              <div className="flex items-center gap-4 w-full">
                  <button onClick={toggleMobileSidebar} className="md:hidden text-slate-500 hover:text-slate-700">
                      <Menu size={24} />
                  </button>
                  {!isEmbed && (
                    <button onClick={toggleDesktopSidebar} className="hidden md:flex items-center justify-center p-2 rounded-md hover:bg-slate-100 text-slate-500 transition-colors">
                        {isDesktopSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={24} />}
                    </button>
                  )}
                  <h2 className="text-lg font-semibold text-slate-800 hidden sm:block">
                      {activeView === 'dashboard' && 'Visão Geral do Mercado'}
                      {activeView === 'calendar' && 'Calendário de Eventos'}
                      {activeView === 'location' && 'Análise Geográfica'}
                      {activeView === 'high-demand' && 'Oportunidades de Receita'}
                      {activeView === 'list' && 'Todos os Eventos'}
                      {activeView === 'recent-additions' && 'Eventos Adicionados Recentemente'}
                      {activeView === 'tourism-fairs' && 'Calendário Promocional 2026'}
                  </h2>
              </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
              <div className="max-w-7xl mx-auto">
                
                {activeView !== 'recent-additions' && activeView !== 'tourism-fairs' && (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-8">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <Filter size={14} />
                          Filtros Estratégicos
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                            onClick={clearFilters}
                            className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors border border-slate-200"
                        >
                            <RotateCcw size={16} />
                            Limpar Filtros
                        </button>
                        <button 
                            onClick={() => setShowCreateForm(true)}
                            className="flex items-center gap-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors border border-blue-200"
                        >
                            <Plus size={16} />
                            Criar Evento
                        </button>
                        <button 
                            onClick={handleDownloadExcel}
                            className="flex items-center gap-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-colors border border-emerald-200"
                        >
                            <Download size={16} />
                            Exportar Excel
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4">
                      <div className="flex items-center bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all xl:col-span-1">
                        <Search size={18} className="text-slate-400 mr-2" />
                        <input type="text" placeholder="Buscar..." className="bg-transparent border-none outline-none text-sm w-full placeholder-slate-400 text-slate-700" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                      </div>
                      <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 outline-none">
                        <option>Todas as Regiões</option>
                        {filterOptions.regions.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <select value={selectedNeighborhood} onChange={(e) => setSelectedNeighborhood(e.target.value)} className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 outline-none">
                        <option>Todos os Bairros</option>
                        {filterOptions.neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <select value={selectedVenue} onChange={(e) => setSelectedVenue(e.target.value)} className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 outline-none">
                        <option>Todos os Locais</option>
                        {filterOptions.venues.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                      <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 outline-none">
                        <option>Todos os Tipos</option>
                        {filterOptions.types.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 outline-none">
                        <option>Todos os Meses</option>
                        {filterOptions.months.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 outline-none">
                        <option>Todos os Anos</option>
                        {filterOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {showCreateForm && (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-8">
                    <h3 className="text-lg font-semibold mb-4">Criar Novo Evento</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="text" placeholder="Nome" value={newEvent.name} onChange={(e) => setNewEvent({...newEvent, name: e.target.value})} className="border p-2 rounded" />
                      <input type="text" placeholder="Local" value={newEvent.venue} onChange={(e) => setNewEvent({...newEvent, venue: e.target.value})} className="border p-2 rounded" />
                      <input type="text" placeholder="Tipo" value={newEvent.type} onChange={(e) => setNewEvent({...newEvent, type: e.target.value})} className="border p-2 rounded" />
                      <input type="date" value={newEvent.start} onChange={(e) => setNewEvent({...newEvent, start: e.target.value})} className="border p-2 rounded" />
                      <input type="date" value={newEvent.end} onChange={(e) => setNewEvent({...newEvent, end: e.target.value})} className="border p-2 rounded" />
                      <input type="text" placeholder="Bairro" value={newEvent.neighborhood} onChange={(e) => setNewEvent({...newEvent, neighborhood: e.target.value})} className="border p-2 rounded" />
                      <input type="text" placeholder="Região" value={newEvent.region} onChange={(e) => setNewEvent({...newEvent, region: e.target.value})} className="border p-2 rounded" />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={handleCreateEvent} className="bg-blue-500 text-white px-4 py-2 rounded">Salvar</button>
                      <button onClick={() => setShowCreateForm(false)} className="bg-gray-500 text-white px-4 py-2 rounded">Cancelar</button>
                    </div>
                  </div>
                )}

                {activeView !== 'recent-additions' && activeView !== 'tourism-fairs' && (
                  <StatsCards totalEvents={stats.total} busiestMonth={stats.busiestMonth} topNeighborhood={stats.topNeighborhood} highDemandCount={stats.highDemand} events={filteredEvents} />
                )}

                <div className="animate-in fade-in duration-500">
                    {activeView === 'dashboard' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-6 flex items-center"><CalendarIcon size={16} className="mr-2 text-blue-500" /> Sazonalidade de Eventos</h3>
                                    <MonthlyChart events={filteredEvents} />
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[450px]">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Tipologia (Ranking)</h3>
                                    <p className="text-xs text-slate-400 mb-4">Distribuição por categoria</p>
                                    <TypeRankingChart events={filteredEvents} />
                                </div>
                            </div>
                            <div className="space-y-6">
                                <UpcomingEvents events={filteredEvents} />
                                <InsightsPanel events={filteredEvents} />
                            </div>
                        </div>
                    )}
                    {activeView === 'calendar' && <CalendarView events={filteredEvents} />}
                    {activeView === 'location' && <LocationView events={filteredEvents} />}
                    {activeView === 'high-demand' && <HighDemandView events={filteredEvents} />}
                    {activeView === 'list' && <EventList events={filteredEvents} onDelete={handleDeleteEvent} />}
                    {activeView === 'recent-additions' && <RecentAdditionsView events={EVENTS} />}
                    {activeView === 'tourism-fairs' && <TourismFairsView events={TOURISM_FAIRS} />}
                </div>
              </div>
          </main>
      </div>
    </div>
  );
}