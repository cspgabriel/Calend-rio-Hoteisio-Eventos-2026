import React, { useState, useEffect, useCallback } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Plus, Trash2, Calendar, MapPin, Tag, RefreshCw, LogOut, ShieldCheck } from 'lucide-react';

const ADMIN_PASSWORD = 'admin123';
const REGION_UNDEFINED = 'A definir';

type FirestoreEvent = {
  id: string;
  name: string;
  venue: string;
  type: string;
  neighborhood: string;
  region: string;
  year: string;
  start: Timestamp | null;
  end: Timestamp | null;
  addedAt: Timestamp | null;
};

type Props = {
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

function formatTimestamp(ts: Timestamp | null): string {
  if (!ts) return '—';
  const d = ts.toDate();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function AdminPanel({ onLogout }: Props) {
  const [isLocked, setIsLocked] = useState(true);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [firestoreEvents, setFirestoreEvents] = useState<FirestoreEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_EVENT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!db) {
      setLoadError('Firestore não configurado. Verifique as variáveis de ambiente.');
      return;
    }
    setLoadingEvents(true);
    setLoadError(null);
    try {
      let snap;
      try {
        const q = query(collection(db, 'eventos'), orderBy('addedAt', 'desc'));
        snap = await getDocs(q);
      } catch {
        // Fallback: query without ordering if the index is missing
        snap = await getDocs(collection(db, 'eventos'));
      }
      const docs: FirestoreEvent[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name ?? '',
          venue: data.venue ?? '',
          type: data.type ?? '',
          neighborhood: data.neighborhood ?? '',
          region: data.region ?? '',
          year: data.year ?? '',
          start: data.start ?? null,
          end: data.end ?? null,
          addedAt: data.addedAt ?? null,
        };
      });
      setFirestoreEvents(docs);
    } catch (err) {
      console.error(err);
      setLoadError('Falha ao carregar eventos do Firestore. Verifique as permissões do banco de dados.');
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    if (!isLocked) {
      fetchEvents();
    }
  }, [isLocked, fetchEvents]);

  const handleUnlock = () => {
    if (password === ADMIN_PASSWORD) {
      setIsLocked(false);
      setAuthError(null);
    } else {
      setAuthError('Senha incorreta.');
    }
  };

  const handleReset = () => {
    setForm(EMPTY_EVENT_FORM);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleCreate = async () => {
    if (!db) {
      setFormError('Firestore não está configurado. Verifique as variáveis de ambiente.');
      return;
    }

    const required = ['name', 'venue', 'type', 'startDate', 'endDate', 'neighborhood', 'year'] as const;
    for (const key of required) {
      if (!form[key]) {
        setFormError('Preencha todos os campos antes de criar.');
        return;
      }
    }

    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

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
        region: REGION_UNDEFINED,
        year: form.year,
        addedAt: Timestamp.now(),
      });

      setFormSuccess('Evento criado com sucesso!');
      handleReset();
      setShowForm(false);
      fetchEvents();
    } catch (err) {
      console.error(err);
      setFormError('Falha ao criar evento. Verifique as permissões do Firestore.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'eventos', id));
      setFirestoreEvents(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
      setDeleteConfirm(null);
    }
  };

  // ── Login screen ──────────────────────────────────────────────────────────
  if (isLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#003366] to-[#001a33] p-6">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <img
              src="https://sindhoteisrj.com.br/wp-content/uploads/2023/04/Logo-HoteisRIO-Branca-Fundo-Transparente.png"
              alt="HoteisRIO"
              className="h-16 object-contain"
            />
          </div>
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#003366]/10 flex items-center justify-center">
                <ShieldCheck size={20} className="text-[#003366]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">Área Administrativa</h1>
                <p className="text-xs text-slate-500">Acesso restrito — HoteisRIO</p>
              </div>
            </div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Senha de acesso</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder="••••••••"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/30 focus:border-[#003366]"
            />
            {authError && (
              <p className="text-sm text-red-600 mb-3 flex items-center gap-1.5">
                <X size={14} /> {authError}
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={handleUnlock}
                className="flex-1 py-2.5 bg-[#003366] text-white rounded-xl text-sm font-semibold hover:bg-[#004488] transition-colors"
              >
                Entrar
              </button>
              <button
                onClick={() => window.location.assign('/')}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main admin panel ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-row">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-gradient-to-b from-[#003366] to-[#001a33] text-white shadow-2xl">
        <div className="p-6 border-b border-white/10 flex items-center justify-center">
          <img
            src="https://sindhoteisrj.com.br/wp-content/uploads/2023/04/Logo-HoteisRIO-Branca-Fundo-Transparente.png"
            alt="HoteisRIO"
            className="h-14 object-contain"
          />
        </div>
        <nav className="flex-1 py-6 px-4 space-y-1">
          <div className="px-4 py-2 mb-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">Painel Admin</p>
          </div>
          <button
            onClick={() => { setShowForm(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${!showForm ? 'bg-white/20 text-white font-semibold shadow-sm' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}
          >
            <Calendar size={18} />
            Eventos no Firebase
            <span className="ml-auto bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {firestoreEvents.length}
            </span>
          </button>
          <button
            onClick={() => { setShowForm(true); setFormError(null); setFormSuccess(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${showForm ? 'bg-white/20 text-white font-semibold shadow-sm' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}
          >
            <Plus size={18} />
            Adicionar Evento
          </button>
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="bg-black/20 rounded-xl p-3 mb-3">
            <p className="text-xs text-blue-300 mb-1">Status do Firebase</p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${db ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span className={`text-xs font-medium ${db ? 'text-emerald-200' : 'text-red-300'}`}>
                {db ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setIsLocked(true);
              setPassword('');
              onLogout?.();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 text-blue-100 rounded-xl hover:bg-white/20 hover:text-white transition text-sm font-medium"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden h-screen">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#003366]/10 flex items-center justify-center">
              <ShieldCheck size={16} className="text-[#003366]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 leading-tight">Painel Administrativo</h1>
              <p className="text-xs text-slate-400">Gestão de eventos — Firebase</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchEvents}
              disabled={loadingEvents}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw size={13} className={loadingEvents ? 'animate-spin' : ''} />
              Atualizar
            </button>
            <button
              onClick={() => window.location.assign('/')}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              ← Voltar ao site
            </button>
            <button
              onClick={() => {
                setIsLocked(true);
                setPassword('');
                onLogout?.();
              }}
              className="md:hidden flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
            >
              <LogOut size={13} />
              Sair
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Create Event Form */}
            {showForm && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Novo evento</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Preencha os campos e clique em salvar.</p>
                  </div>
                  <button
                    onClick={() => { setShowForm(false); setFormError(null); setFormSuccess(null); }}
                    className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'name', label: 'Nome do Evento', placeholder: 'Ex: Rock in Rio' },
                    { key: 'venue', label: 'Local / Localização', placeholder: 'Ex: Parque Olímpico' },
                    { key: 'type', label: 'Tipo de Evento', placeholder: 'Ex: Show & Festival' },
                    { key: 'neighborhood', label: 'Bairro', placeholder: 'Ex: Barra Olímpica' },
                    { key: 'startDate', label: 'Data de Início (DD/MM/AAAA)', placeholder: '01/01/2026' },
                    { key: 'endDate', label: 'Data de Fim (DD/MM/AAAA)', placeholder: '31/01/2026' },
                    { key: 'year', label: 'Ano', placeholder: '2026' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
                      <input
                        value={form[key as keyof typeof form]}
                        onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] transition"
                        placeholder={placeholder}
                      />
                    </div>
                  ))}
                </div>

                {formError && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                    <X size={14} /> {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                    ✓ {formSuccess}
                  </div>
                )}

                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={handleCreate}
                    disabled={submitting}
                    className="px-5 py-2.5 bg-[#003366] text-white rounded-xl text-sm font-semibold hover:bg-[#004488] transition disabled:opacity-50"
                  >
                    {submitting ? 'Salvando...' : 'Salvar evento'}
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            )}

            {/* Mobile actions */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={() => { setShowForm(true); setFormError(null); setFormSuccess(null); }}
                className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-xl text-sm font-semibold"
              >
                <Plus size={15} /> Adicionar Evento
              </button>
              <button
                onClick={fetchEvents}
                disabled={loadingEvents}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium"
              >
                <RefreshCw size={14} className={loadingEvents ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Events list */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Eventos no Firebase</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {loadingEvents ? 'Carregando...' : `${firestoreEvents.length} evento${firestoreEvents.length !== 1 ? 's' : ''} cadastrado${firestoreEvents.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
                {!loadingEvents && firestoreEvents.length > 0 && (
                  <span className="bg-[#003366]/10 text-[#003366] text-xs font-bold px-3 py-1 rounded-full">
                    {firestoreEvents.length}
                  </span>
                )}
              </div>

              {loadError && (
                <div className="m-6 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <X size={14} /> {loadError}
                </div>
              )}

              {loadingEvents ? (
                <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
                  <RefreshCw size={20} className="animate-spin" />
                  <span className="text-sm">Carregando eventos...</span>
                </div>
              ) : firestoreEvents.length === 0 && !loadError ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                  <Calendar size={32} className="text-slate-300" />
                  <p className="text-sm font-medium">Nenhum evento cadastrado no Firebase.</p>
                  <p className="text-xs text-slate-400">Use "Adicionar Evento" para inserir o primeiro registro.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {firestoreEvents.map((event) => (
                    <div key={event.id} className="px-6 py-4 hover:bg-slate-50 transition-colors group">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-slate-800 truncate">{event.name}</h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <MapPin size={11} /> {event.venue}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Tag size={11} /> {event.type}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Calendar size={11} /> {formatTimestamp(event.start)} → {formatTimestamp(event.end)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {event.neighborhood && (
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{event.neighborhood}</span>
                            )}
                            {event.year && (
                              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{event.year}</span>
                            )}
                            {event.region && event.region !== REGION_UNDEFINED && (
                              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{event.region}</span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          {deleteConfirm === event.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-600 font-medium hidden sm:block">Confirmar exclusão?</span>
                              <button
                                onClick={() => handleDelete(event.id)}
                                disabled={deletingId === event.id}
                                className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                              >
                                {deletingId === event.id ? '...' : 'Sim'}
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200 transition"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(event.id)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                              title="Excluir evento"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
