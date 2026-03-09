import React, { useState, useEffect } from 'react';
import { Plus, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { addDoc, collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import EventList from './EventList';
import { EventData } from '../types';

import { EVENTS } from '../constants';

const normalizeKey = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const parseInclusionDate = (value: string): Date | null => {
  if (!value || value === 'N/A') return null;

  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parsePtBrDate = (value: string): Date | null => {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatPtBrDate = (date: Date): string => {
  const d = `${date.getDate()}`.padStart(2, '0');
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const toInputDate = (ptBrDate: string): string => {
  const parsed = parsePtBrDate(ptBrDate);
  if (!parsed) return '';
  const y = parsed.getFullYear();
  const m = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const d = `${parsed.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const dedupeEventsByInclusion = (list: EventData[]): EventData[] => {
  const grouped = new Map<string, EventData[]>();
  for (const event of list) {
    const key = normalizeKey(event.name);
    const bucket = grouped.get(key) || [];
    bucket.push({
      ...event,
      parsedStartDate: new Date(event.parsedStartDate),
      parsedEndDate: new Date(event.parsedEndDate),
    });
    grouped.set(key, bucket);
  }

  const merged: EventData[] = [];

  for (const events of grouped.values()) {
    const sorted = [...events].sort((a, b) => {
      const aStart = parsePtBrDate(a.startDate) || a.parsedStartDate;
      const bStart = parsePtBrDate(b.startDate) || b.parsedStartDate;
      return aStart.getTime() - bStart.getTime();
    });

    const acc: EventData[] = [];

    for (const next of sorted) {
      const current = acc[acc.length - 1];
      if (!current) {
        acc.push(next);
        continue;
      }

      const currentStart = parsePtBrDate(current.startDate) || current.parsedStartDate;
      const currentEnd = parsePtBrDate(current.endDate) || current.parsedEndDate;
      const nextStart = parsePtBrDate(next.startDate) || next.parsedStartDate;
      const nextEnd = parsePtBrDate(next.endDate) || next.parsedEndDate;

      const isSequentialOrOverlap = nextStart.getTime() <= addDays(currentEnd, 1).getTime();

      if (!isSequentialOrOverlap) {
        acc.push(next);
        continue;
      }

      const mergedStart = currentStart.getTime() <= nextStart.getTime() ? currentStart : nextStart;
      const mergedEnd = currentEnd.getTime() >= nextEnd.getTime() ? currentEnd : nextEnd;
      current.parsedStartDate = mergedStart;
      current.parsedEndDate = mergedEnd;
      current.startDate = formatPtBrDate(mergedStart);
      current.endDate = formatPtBrDate(mergedEnd);
      current.month = mergedStart.toLocaleDateString('pt-BR', { month: 'long' });
      current.year = `${mergedStart.getFullYear()}`;

      const currentInc = parseInclusionDate(current.inclusionDate);
      const nextInc = parseInclusionDate(next.inclusionDate);
      if ((!currentInc && nextInc) || (currentInc && nextInc && nextInc.getTime() > currentInc.getTime())) {
        current.inclusionDate = next.inclusionDate;
      }

      if ((!current.venue || current.venue === 'A definir') && next.venue && next.venue !== 'A definir') {
        current.venue = next.venue;
      }
      if ((!current.neighborhood || current.neighborhood === 'A definir') && next.neighborhood && next.neighborhood !== 'A definir') {
        current.neighborhood = next.neighborhood;
      }
      if ((!current.region || current.region === 'A definir') && next.region && next.region !== 'A definir') {
        current.region = next.region;
      }
    }

    merged.push(...acc);
  }

  return merged;
};

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [events, setEvents] = useState<EventData[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    start: '',
    end: '',
    neighborhood: '',
    region: '',
    year: '',
  });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const savedAuth = localStorage.getItem('adminAuth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const loadEvents = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'eventos'));
      const eventsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const startDate = data.start.toDate ? data.start.toDate() : new Date(data.start);
        const endDate = data.end.toDate ? data.end.toDate() : new Date(data.end);
        const addedAtRaw = data.addedAt;
        const addedAtDate =
          addedAtRaw?.toDate
            ? addedAtRaw.toDate()
            : parseInclusionDate(String(addedAtRaw || ''));

        return {
          id: doc.id,
          name: data.name,
          venue: data.venue,
          type: data.type,
          startDate: startDate.toLocaleDateString('pt-BR'),
          endDate: endDate.toLocaleDateString('pt-BR'),
          month: startDate.toLocaleDateString('pt-BR', { month: 'long' }),
          neighborhood: data.neighborhood,
          region: data.region,
          year: startDate.getFullYear().toString(),
          lat: 0,
          lng: 0,
          parsedStartDate: startDate,
          parsedEndDate: endDate,
          inclusionDate: addedAtDate ? addedAtDate.toLocaleDateString('pt-BR') : 'N/A',
          city: 'Rio de Janeiro',
          state: 'RJ',
          country: 'Brasil'
        } as EventData;
      });
      setEvents(dedupeEventsByInclusion(eventsData.concat(EVENTS)));
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadEvents();
    }
  }, [isAuthenticated]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
      localStorage.setItem('adminAuth', 'true');
      setPassword('');
      setPasswordError('');
      loadEvents();
    } else {
      setPasswordError('Senha incorreta');
      setPassword('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditEvent = (event: EventData) => {
    const isStaticEvent = event.id.startsWith('evt-') || event.id.startsWith('tf-');
    if (isStaticEvent) {
      setMessage({ type: 'error', text: 'Este evento é da base fixa e não pode ser editado por aqui.' });
      return;
    }

    setEditingEventId(event.id);
    setFormData({
      name: event.name || '',
      type: event.type || '',
      start: toInputDate(event.startDate),
      end: toInputDate(event.endDate),
      neighborhood: event.neighborhood || '',
      region: event.region || '',
      year: event.year || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.type || !formData.start || !formData.end) {
      setMessage({ type: 'error', text: 'Preencha todos os campos obrigatórios' });
      return;
    }

    try {
      const payload = {
        name: formData.name,
        venue: 'A definir',
        type: formData.type,
        start: new Date(formData.start),
        end: new Date(formData.end),
        neighborhood: formData.neighborhood || 'A definir',
        region: formData.region || 'A definir',
        year: formData.year || new Date(formData.start).getFullYear().toString(),
      };

      if (editingEventId) {
        await updateDoc(doc(db, 'eventos', editingEventId), {
          ...payload,
          updatedAt: new Date().toISOString(),
        });
        setMessage({ type: 'success', text: 'Evento atualizado com sucesso!' });
      } else {
        await addDoc(collection(db, 'eventos'), {
          ...payload,
          addedAt: new Date().toISOString(),
        });
        setMessage({ type: 'success', text: 'Evento criado com sucesso!' });
      }

      setEditingEventId(null);
      setFormData({ name: '', type: '', start: '', end: '', neighborhood: '', region: '', year: '' });
      loadEvents();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: `Erro ao salvar evento: ${error instanceof Error ? error.message : 'Erro desconhecido'}` });
    }
  };
  
  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'eventos', id));
      loadEvents();
    } catch (error) {
      alert('Erro ao excluir evento: ' + (error as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              🔐 Painel Administrativo
            </h1>
            <p className="mt-2 text-purple-100">Crie e gerencie eventos de forma segura</p>
          </div>

          {!isAuthenticated ? (
            <div className="p-8">
              <div className="max-w-md mx-auto">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <Lock className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-blue-900 text-center mb-2">Acesso Restrito</h2>
                  <p className="text-center text-blue-800">Digite a senha para acessar o painel administrativo</p>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  {passwordError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
                      <AlertCircle size={20} className="flex-shrink-0" />
                      {passwordError}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Senha
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite a senha"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
                  >
                    Acessar Painel
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="p-8">
              {message && (
                <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
                  message.type === 'success' 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {message.type === 'success' ? (
                    <CheckCircle size={20} className="flex-shrink-0" />
                  ) : (
                    <AlertCircle size={20} className="flex-shrink-0" />
                  )}
                  {message.text}
                </div>
              )}

              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  {editingEventId ? 'Editar Evento' : 'Adicionar Novo Evento'}
                </h2>
                <form onSubmit={handleCreateEvent} className="space-y-4 bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Nome do Evento *" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <select name="type" value={formData.type} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecione o Tipo *</option>
                    <option value="Show">Show</option>
                    <option value="Festival">Festival</option>
                    <option value="Congresso">Congresso</option>
                    <option value="Conferência">Conferência</option>
                    <option value="Exposição">Exposição</option>
                    <option value="Evento">Evento</option>
                    <option value="Esporte">Esporte</option>
                    <option value="Carnaval">Carnaval</option>
                    <option value="Feira">Feira</option>
                  </select>
                  <input type="date" name="start" value={formData.start} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="date" name="end" value={formData.end} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="text" name="neighborhood" value={formData.neighborhood} onChange={handleInputChange} placeholder="Bairro" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="text" name="region" value={formData.region} onChange={handleInputChange} placeholder="Região" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="text" name="year" value={formData.year} onChange={handleInputChange} placeholder="Ano" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <button
                    type="submit"
                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={20} />
                    {editingEventId ? 'Atualizar Evento' : 'Adicionar Evento'}
                  </button>
                  {editingEventId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEventId(null);
                        setFormData({ name: '', type: '', start: '', end: '', neighborhood: '', region: '', year: '' });
                      }}
                      className="w-full md:w-auto ml-0 md:ml-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg transition-colors"
                    >
                      Cancelar edição
                    </button>
                  )}
                </form>
              </div>

              <h2 className="text-xl font-semibold text-gray-800 mb-4">Lista de Eventos</h2>
              <EventList events={events} onDelete={handleDeleteEvent} onEdit={handleEditEvent} />

              <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                <button
                  onClick={() => {
                    window.location.href = '/';
                  }}
                  className="w-full text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg py-2 transition-colors"
                >
                  Ir para o site principal
                </button>
                <button
                  onClick={() => {
                    setIsAuthenticated(false);
                    localStorage.removeItem('adminAuth');
                  }}
                  className="w-full text-sm text-gray-600 hover:text-gray-900"
                >
                  Sair do painel administrativo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
