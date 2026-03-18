import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import CsvImportModal from './components/CsvImportModal';
import { calculateDemandLevel, normalizeString } from './utils';
import {
  Search, LayoutDashboard, List, Calendar as CalendarIcon,
  Map as MapIcon, TrendingUp, Menu, X, Filter, Download,
  ChevronLeft, RotateCcw, Sparkles, Plane, Upload, Database,
  Trash2, AlertTriangle, CheckCircle2
} from 'lucide-react';
import {
  loadEventsFromFirestore,
  seedFirestoreIfEmpty,
  deleteEventsFromFirestore,
  addEventsToFirestore,
} from './firebase';

type ViewType = 'dashboard' | 'list' | 'calendar' | 'location' | 'high-demand' | 'recent-additions' | 'tourism-fairs' | 'admin';

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
  // ── Route detection ─────────────────────────────────────────────────────────
  const initialView = useMemo<ViewType>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/admin') return 'admin';
    return 'list';
  }, []);

  const [activeView, setActiveView] = useState<ViewType>(initialView);

  const isEmbed = useMemo(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('mode') === 'embed';
    }
    return false;
  }, []);

  // ── Firebase / events state ──────────────────────────────────────────────────
  const [events, setEvents] = useState<EventData[]>(EVENTS);
  const [firebaseStatus, setFirebaseStatus] = useState<'loading' | 'synced' | 'error'>('loading');
  const [showCsvModal, setShowCsvModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const seeded = await seedFirestoreIfEmpty(EVENTS);
        const loaded = seeded ? EVENTS : await loadEventsFromFirestore();
        if (!cancelled) {
          setEvents(loaded.length > 0 ? loaded : EVENTS);
          setFirebaseStatus('synced');
        }
      } catch (err) {
        console.error('Firebase error:', err);
        if (!cancelled) setFirebaseStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Query-param routing ──────────────────────────────────────────────────────
  useEffect(() => {
    if (window.location.pathname === '/admin') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'recent') setActiveView('recent-additions');
    else if (params.get('view') === 'fairs') setActiveView('tourism-fairs');
  }, []);

  // ── Sidebar state ─────────────────────────────────────────────────────────
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(!isEmbed);

  // ── Filter states ──────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('Todas as Regiões');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('Todos os Bairros');
  const [selectedVenue, setSelectedVenue] = useState('Todos os Locais');
  const [selectedType, setSelectedType] = useState('Todos os Tipos');
  const [selectedMonth, setSelectedMonth] = useState('Todos os Meses');
  const [selectedYear, setSelectedYear] = useState('Todos os Anos');

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedRegion('Todas as Regiões');
    setSelectedNeighborhood('Todos os Bairros');
    setSelectedVenue('Todos os Locais');
    setSelectedType('Todos os Tipos');
    setSelectedMonth('Todos os Meses');
    setSelectedYear('Todos os Anos');
  };

  const filterOptions = useMemo(() => {
    const regions = Array.from(new Set(events.map(e => e.region))).sort();
    const neighborhoods = Array.from(new Set(events.map(e => e.neighborhood))).sort();
    const venues = Array.from(new Set(events.map(e => e.venue))).sort();
    const types = Array.from(new Set(events.map(e => e.type))).sort();
    const years = Array.from(new Set(events.map(e => e.year))).sort();
    return { regions, neighborhoods, venues, types, months: MONTH_ORDER, years };
  }, [events]);

  const filteredEvents = useMemo(() => {
    const normalizedSearch = normalizeString(searchTerm);
    return events.filter(event => {
      const matchesSearch = searchTerm === '' ||
        normalizeString(event.name).includes(normalizedSearch) ||
        normalizeString(event.venue).includes(normalizedSearch) ||
        normalizeString(event.type).includes(normalizedSearch);
      return matchesSearch &&
        (selectedRegion === 'Todas as Regiões' || event.region === selectedRegion) &&
        (selectedNeighborhood === 'Todos os Bairros' || event.neighborhood === selectedNeighborhood) &&
        (selectedVenue === 'Todos os Locais' || event.venue === selectedVenue) &&
        (selectedType === 'Todos os Tipos' || event.type === selectedType) &&
        (selectedMonth === 'Todos os Meses' || event.month === selectedMonth) &&
        (selectedYear === 'Todos os Anos' || event.year === selectedYear);
    });
  }, [events, searchTerm, selectedRegion, selectedNeighborhood, selectedVenue, selectedType, selectedMonth, selectedYear]);

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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleMobileSidebar = () => setIsMobileSidebarOpen(v => !v);
  const toggleDesktopSidebar = () => setIsDesktopSidebarOpen(v => !v);

  const handleViewChange = (view: ViewType) => {
    setActiveView(view);
    setIsMobileSidebarOpen(false);
    if (view === 'admin') {
      window.history.pushState({}, '', '/admin');
    } else {
      const url = new URL(window.location.origin);
      if (view === 'recent-additions') url.searchParams.set('view', 'recent');
      else if (view === 'tourism-fairs') url.searchParams.set('view', 'fairs');
      window.history.pushState({}, '', url);
    }
  };

  const handleDeleteEvents = useCallback(async (ids: string[]) => {
    await deleteEventsFromFirestore(ids);
    setEvents(prev => prev.filter(e => !ids.includes(e.id)));
  }, []);

  const handleImportEvents = useCallback(async (
    newEvents: Omit<EventData, 'id' | 'parsedStartDate' | 'parsedEndDate'>[]
  ) => {
    const saved = await addEventsToFirestore(newEvents);
    setEvents(prev => [...prev, ...saved]);
  }, []);

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
    link.setAttribute("download", `eventos_rio_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const viewLabel: Record<ViewType, string> = {
    dashboard: 'Visão Geral do Mercado',
    calendar: 'Calendário de Eventos',
    location: 'Análise Geográfica',
    'high-demand': 'Oportunidades de Receita',
    list: 'Todos os Eventos',
    'recent-additions': 'Eventos Adicionados Recentemente',
    'tourism-fairs': 'Calendário Promocional 2026',
    admin: 'Administração',
  };

  const showFilters = activeView !== 'recent-additions' && activeView !== 'tourism-fairs' && activeView !== 'admin';

  return (
    <div className={`min-h-screen bg-slate-50 flex ${isEmbed ? 'flex-col' : 'flex-row'}`}>

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={toggleMobileSidebar} />
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
          <button onClick={toggleMobileSidebar} className="md:hidden text-white/70 hover:text-white"><X size={20} /></button>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2 min-w-[16rem] overflow-y-auto">
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

          <div className="pt-2 border-t border-white/10">
            <button
              onClick={() => handleViewChange('admin')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeView === 'admin' ? 'bg-white/20 text-white shadow-sm font-medium' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}
            >
              <Database size={20} />
              Administração
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-white/10 min-w-[16rem]">
          <div className="bg-black/20 rounded-lg p-4">
            <p className="text-xs text-blue-200 mb-1">Firebase</p>
            <div className="flex items-center gap-2">
              {firebaseStatus === 'loading' && (
                <><div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" /><span className="text-xs font-medium text-yellow-200">Conectando...</span></>
              )}
              {firebaseStatus === 'synced' && (
                <><div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /><span className="text-xs font-medium text-emerald-200">Sincronizado</span></>
              )}
              {firebaseStatus === 'error' && (
                <><div className="w-2 h-2 bg-red-400 rounded-full" /><span className="text-xs font-medium text-red-300">Erro de conexão</span></>
              )}
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
              {viewLabel[activeView]}
            </h2>
          </div>

          {activeView !== 'admin' && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowCsvModal(true)}
                className="hidden md:flex items-center gap-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors border border-blue-200"
              >
                <Upload size={16} />
                Importar CSV
              </button>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">

            {showFilters && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-8">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Filter size={14} />
                    Filtros Estratégicos
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors border border-slate-200"
                    >
                      <RotateCcw size={16} />
                      Limpar Filtros
                    </button>
                    <button
                      onClick={() => setShowCsvModal(true)}
                      className="flex items-center gap-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors border border-blue-200"
                    >
                      <Upload size={16} />
                      Importar CSV
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

            {showFilters && (
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
              {activeView === 'list' && (
                <EventList
                  events={filteredEvents}
                  onDeleteEvents={firebaseStatus === 'synced' ? handleDeleteEvents : undefined}
                />
              )}
              {activeView === 'recent-additions' && <RecentAdditionsView events={events} />}
              {activeView === 'tourism-fairs' && <TourismFairsView events={TOURISM_FAIRS} />}
              {activeView === 'admin' && (
                <AdminView
                  events={events}
                  firebaseStatus={firebaseStatus}
                  onDeleteEvents={handleDeleteEvents}
                  onOpenImport={() => setShowCsvModal(true)}
                  onDownloadExcel={handleDownloadExcel}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      {showCsvModal && (
        <CsvImportModal
          onClose={() => setShowCsvModal(false)}
          onImport={handleImportEvents}
        />
      )}
    </div>
  );
}

// ── Admin View Component ───────────────────────────────────────────────────────
interface AdminViewProps {
  events: EventData[];
  firebaseStatus: 'loading' | 'synced' | 'error';
  onDeleteEvents: (ids: string[]) => Promise<void>;
  onOpenImport: () => void;
  onDownloadExcel: () => void;
}

function AdminView({ events, firebaseStatus, onDeleteEvents, onOpenImport, onDownloadExcel }: AdminViewProps) {
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const handleDeleteAll = async () => {
    if (!window.confirm(`Excluir TODOS os ${events.length} eventos do Firebase?\n\nEsta acao nao pode ser desfeita.`)) return;
    if (!window.confirm('Confirmacao final: remover permanentemente todos os eventos?')) return;
    setIsDeletingAll(true);
    try {
      await onDeleteEvents(events.map(e => e.id));
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${firebaseStatus === 'synced' ? 'bg-emerald-100' : firebaseStatus === 'error' ? 'bg-red-100' : 'bg-yellow-100'}`}>
            {firebaseStatus === 'synced' && <CheckCircle2 size={24} className="text-emerald-600" />}
            {firebaseStatus === 'error' && <AlertTriangle size={24} className="text-red-600" />}
            {firebaseStatus === 'loading' && <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Firebase</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">
              {firebaseStatus === 'synced' ? 'Sincronizado' : firebaseStatus === 'error' ? 'Erro de conexão' : 'Conectando...'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Database size={24} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Eventos no banco</p>
            <p className="text-2xl font-bold text-slate-800">{events.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
            <Upload size={24} className="text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Coleção Firestore</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">eventos-d16c9</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Database size={16} className="text-blue-500" />
          Gerenciamento de Dados
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={onOpenImport}
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 transition-colors text-left"
          >
            <Upload size={20} className="shrink-0" />
            <div>
              <p className="font-semibold text-sm">Importar CSV</p>
              <p className="text-xs text-blue-600 mt-0.5">Adiciona eventos ao Firebase</p>
            </div>
          </button>

          <button
            onClick={onDownloadExcel}
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors text-left"
          >
            <Download size={20} className="shrink-0" />
            <div>
              <p className="font-semibold text-sm">Exportar Excel / CSV</p>
              <p className="text-xs text-emerald-600 mt-0.5">Baixa todos os eventos</p>
            </div>
          </button>

          <button
            onClick={handleDeleteAll}
            disabled={isDeletingAll || firebaseStatus !== 'synced' || events.length === 0}
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 text-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
          >
            {isDeletingAll
              ? <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin shrink-0" />
              : <Trash2 size={20} className="shrink-0" />
            }
            <div>
              <p className="font-semibold text-sm">{isDeletingAll ? 'Excluindo...' : 'Excluir TODOS os eventos'}</p>
              <p className="text-xs text-red-600 mt-0.5">Remove permanentemente do Firebase</p>
            </div>
          </button>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <List size={16} className="text-slate-400" />
          Lista completa — selecione e exclua pelo checkbox
        </p>
        <EventList
          events={events}
          onDeleteEvents={firebaseStatus === 'synced' ? onDeleteEvents : undefined}
        />
      </div>
    </div>
  );
}
