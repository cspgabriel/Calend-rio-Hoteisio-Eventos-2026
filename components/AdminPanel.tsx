import React, { useState } from 'react';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Plus, LogOut, ShieldCheck, Database, CalendarPlus } from 'lucide-react';
import EventList from './EventList';
import { EventData } from '../types';

const ADMIN_PASSWORD = 'admin123';

type Props = {
  events: EventData[];
  loading: boolean;
  firestoreAvailable: boolean | null;
  onLogout?: () => void;
};

const EMPTY_EVENT_FORM = {
  name: '',
  venue: '',
  type: '',
  startDate: '',
  endDate: '',
  neighborhood: '',
  year: '',
};

const inputClass =
  'w-full mt-1 p-2.5 bg-white border border-blue-100 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition';

const labelClass = 'text-xs font-semibold text-slate-500 uppercase tracking-wide';

export default function AdminPanel({ events, loading, firestoreAvailable, onLogout }: Props) {
  const [isLocked, setIsLocked] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_EVENT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleUnlock = () => {
    if (password === ADMIN_PASSWORD) {
      setIsLocked(false);
      setError(null);
    } else {
      setError('Senha incorreta.');
    }
  };

  const handleReset = () => {
    setForm(EMPTY_EVENT_FORM);
    setError(null);
    setSuccess(null);
  };

  const handleCreate = async () => {
    if (!db) {
      setError('Firestore não está configurado. Verifique as variáveis de ambiente.');
      return;
    }

    const required = ['name', 'venue', 'type', 'startDate', 'endDate', 'neighborhood', 'year'] as const;
    for (const key of required) {
      if (!form[key]) {
        setError('Preencha todos os campos antes de criar.');
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const startParts = form.startDate.split('/');
      const endParts = form.endDate.split('/');
      const start = new Date(Number(startParts[2]), Number(startParts[1]) - 1, Number(startParts[0]));
      const end = new Date(Number(endParts[2]), Number(endParts[1]) - 1, Number(endParts[0]));

      await addDoc(collection(db, 'eventos'), {
        name: form.name,
        venue: form.venue,
        type: form.type,
        start: Timestamp.fromDate(start),
        end: Timestamp.fromDate(end),
        neighborhood: form.neighborhood,
        region: 'A definir',
        year: form.year,
        addedAt: Timestamp.now(),
      });

      setSuccess('Evento criado com sucesso!');
      handleReset();
    } catch (err) {
      console.error(err);
      setError('Falha ao criar evento. Verifique as permissões do Firestore.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Login Screen ──────────────────────────────────────────────────────── */
  if (isLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#003366] via-[#00204d] to-[#001a33] p-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img
              src="https://sindhoteisrj.com.br/wp-content/uploads/2023/04/Logo-HoteisRIO-Branca-Fundo-Transparente.png"
              alt="HoteisRIO"
              className="h-16 object-contain drop-shadow-lg"
            />
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <ShieldCheck size={22} className="text-blue-300" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Área Administrativa</h1>
                <p className="text-sm text-blue-200">Acesso restrito — HoteisRIO</p>
              </div>
            </div>

            <p className="text-sm text-blue-100 mb-5">
              Informe a senha para acessar as funcionalidades de edição.
            </p>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder="Senha de acesso"
              className="w-full bg-white/10 border border-white/20 text-white placeholder-blue-300 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            />

            {error && (
              <p className="text-sm text-red-300 bg-red-900/30 border border-red-400/30 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleUnlock}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg transition-all active:scale-95"
              >
                Entrar
              </button>
              <button
                onClick={() => window.location.assign('/')}
                className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition"
              >
                Voltar
              </button>
            </div>
          </div>

          <p className="text-center text-blue-400 text-xs mt-6">
            Calendário de Eventos RJ 2026 — HoteisRIO
          </p>
        </div>
      </div>
    );
  }

  /* ─── Main Admin Panel ──────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Header */}
      <header className="bg-gradient-to-r from-[#003366] to-[#00204d] shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="https://sindhoteisrj.com.br/wp-content/uploads/2023/04/Logo-HoteisRIO-Branca-Fundo-Transparente.png"
              alt="HoteisRIO"
              className="h-10 object-contain"
            />
            <div className="border-l border-white/20 pl-4">
              <h1 className="text-lg font-bold text-white leading-none">Painel Administrativo</h1>
              <p className="text-xs text-blue-200 mt-0.5">Gestão de Eventos 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowForm(s => !s);
                setSuccess(null);
                setError(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white font-medium rounded-xl shadow transition-all active:scale-95"
            >
              <CalendarPlus size={16} />
              Novo Evento
            </button>
            <button
              onClick={() => {
                setIsLocked(true);
                setPassword('');
                onLogout?.();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-6">

        {/* Status Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-xl">
                <Database size={20} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Eventos no Firebase</h2>
                <p className="text-sm text-slate-500">
                  Collection <span className="font-semibold text-blue-600">eventos</span> — mesmo backend do portal público.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {loading ? (
                <span className="text-sm text-slate-400 animate-pulse">Carregando...</span>
              ) : firestoreAvailable === false ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                  Firestore indisponível
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  {events.length} evento{events.length === 1 ? '' : 's'} carregado{events.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>

          {firestoreAvailable === false && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              Firestore não configurado. Verifique as variáveis de ambiente (arquivo <code className="font-mono bg-red-100 px-1 rounded">.env</code>).
            </div>
          )}
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <Plus size={18} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Novo Evento</h2>
                  <p className="text-sm text-slate-500">Preencha todos os campos e clique em salvar.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setSuccess(null);
                  setError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Nome do Evento</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className={inputClass}
                  placeholder="Ex: Rock in Rio"
                />
              </div>
              <div>
                <label className={labelClass}>Local / Venue</label>
                <input
                  value={form.venue}
                  onChange={(e) => setForm(prev => ({ ...prev, venue: e.target.value }))}
                  className={inputClass}
                  placeholder="Ex: Parque Olímpico"
                />
              </div>
              <div>
                <label className={labelClass}>Tipo de Evento</label>
                <input
                  value={form.type}
                  onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value }))}
                  className={inputClass}
                  placeholder="Ex: Show & Festival"
                />
              </div>
              <div>
                <label className={labelClass}>Bairro</label>
                <input
                  value={form.neighborhood}
                  onChange={(e) => setForm(prev => ({ ...prev, neighborhood: e.target.value }))}
                  className={inputClass}
                  placeholder="Ex: Barra Olímpica"
                />
              </div>
              <div>
                <label className={labelClass}>Data de Início (DD/MM/AAAA)</label>
                <input
                  value={form.startDate}
                  onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className={inputClass}
                  placeholder="01/06/2026"
                />
              </div>
              <div>
                <label className={labelClass}>Data de Fim (DD/MM/AAAA)</label>
                <input
                  value={form.endDate}
                  onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className={inputClass}
                  placeholder="03/06/2026"
                />
              </div>
              <div>
                <label className={labelClass}>Ano</label>
                <input
                  value={form.year}
                  onChange={(e) => setForm(prev => ({ ...prev, year: e.target.value }))}
                  className={inputClass}
                  placeholder="2026"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mt-5">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 mt-5">
                {success}
              </p>
            )}

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-semibold rounded-xl shadow transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Salvando...' : 'Salvar Evento'}
              </button>
              <button
                onClick={handleReset}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
              >
                Limpar
              </button>
            </div>
          </div>
        )}

        {/* Events List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4">Lista de Eventos</h2>
          <EventList events={events} />
        </div>
      </main>
    </div>
  );
}
