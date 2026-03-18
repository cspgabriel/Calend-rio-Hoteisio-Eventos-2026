import React, { useState, useEffect } from 'react';
import {
  addDoc, collection, Timestamp,
  deleteDoc, doc, updateDoc, getDocs, writeBatch, setDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  X, Plus, LogOut, ShieldCheck, Database, CalendarPlus,
  Pencil, Trash2, RefreshCw, AlertTriangle, Upload,
} from 'lucide-react';
import { EventData } from '../types';
import { EVENTS } from '../constants';

const ADMIN_PASSWORD = 'admin123';

type Props = {
  events: EventData[];
  loading: boolean;
  firestoreAvailable: boolean | null;
  onLogout?: () => void;
  onRefresh?: () => void;
};

const EMPTY_FORM = {
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

/** Parse a Firestore document into a lightweight row shape for the admin table. */
function docToRow(id: string, data: Record<string, any>): EventData {
  const startDate = data.start?.toDate ? data.start.toDate() : new Date(data.start);
  const endDate = data.end?.toDate ? data.end.toDate() : new Date(data.end);
  const addedAt = data.addedAt?.toDate ? data.addedAt.toDate() : null;
  return {
    id,
    name: data.name ?? '',
    venue: data.venue ?? '',
    type: data.type ?? '',
    startDate: startDate.toLocaleDateString('pt-BR'),
    endDate: endDate.toLocaleDateString('pt-BR'),
    month: startDate.toLocaleDateString('pt-BR', { month: 'long' }),
    neighborhood: data.neighborhood ?? '',
    region: data.region ?? 'A definir',
    year: startDate.getFullYear().toString(),
    lat: 0,
    lng: 0,
    parsedStartDate: startDate,
    parsedEndDate: endDate,
    inclusionDate: addedAt ? addedAt.toLocaleDateString('pt-BR') : 'N/A',
    city: 'Rio de Janeiro',
    state: 'RJ',
    country: 'Brasil',
  };
}

export default function AdminPanel({ events, loading, firestoreAvailable, onLogout, onRefresh }: Props) {
  /* ── auth ─────────────────────────────────────────────────────────────── */
  const [isLocked, setIsLocked] = useState(true);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  /* ── Firestore rows (admin's own live list) ───────────────────────────── */
  const [rows, setRows] = useState<EventData[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);

  /* ── form state (create + edit) ──────────────────────────────────────── */
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  /* ── bulk selection ──────────────────────────────────────────────────── */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [confirmSingle, setConfirmSingle] = useState<string | null>(null); // id to delete

  /* ── seed Firestore from static data ────────────────────────────────── */
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  /* ── helpers ─────────────────────────────────────────────────────────── */
  const handleUnlock = () => {
    if (password === ADMIN_PASSWORD) {
      setIsLocked(false);
      setAuthError(null);
    } else {
      setAuthError('Senha incorreta.');
    }
  };

  const loadRows = async () => {
    if (!db) return;
    setRowsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'eventos'));
      setRows(snap.docs.map(d => docToRow(d.id, d.data() as Record<string, any>)));
    } catch (e) {
      console.error(e);
    } finally {
      setRowsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLocked) loadRows();
  }, [isLocked]);

  const refresh = () => {
    loadRows();
    onRefresh?.();
    setSelected(new Set());
  };

  /* ── seed Firestore with all static events ───────────────────────────── */
  const handleSeedFirestore = async () => {
    setSeeding(true);
    setSeedError(null);
    setConfirmSeed(false);
    try {
      // Firestore batch limit is 500; EVENTS has ~135 so a single batch is fine
      const batch = writeBatch(db);
      EVENTS.forEach(event => {
        const ref = doc(db, 'eventos', event.id);
        batch.set(ref, {
          name: event.name,
          venue: event.venue,
          type: event.type,
          start: Timestamp.fromDate(parseDateParts(event.startDate)),
          end: Timestamp.fromDate(parseDateParts(event.endDate)),
          neighborhood: event.neighborhood,
          region: event.region,
          year: event.year,
          addedAt: Timestamp.now(),
        }, { merge: true });
      });
      await batch.commit();
      refresh();
    } catch (err) {
      console.error(err);
      setSeedError(`Falha ao importar eventos. Verifique as regras do Firestore.${err instanceof Error ? ` (${err.message})` : ''}`);
    } finally {
      setSeeding(false);
    }
  };

  const parseDateParts = (ddmmyyyy: string) => {
    const [d, m, y] = ddmmyyyy.split('/');
    return new Date(Number(y), Number(m) - 1, Number(d));
  };

  const validateForm = () => {
    for (const key of ['name', 'venue', 'type', 'startDate', 'endDate', 'neighborhood', 'year'] as const) {
      if (!form[key]) { setFormError('Preencha todos os campos antes de salvar.'); return false; }
    }
    return true;
  };

  /* ── create ─────────────────────────────────────────────────────────── */
  const handleCreate = async () => {
    if (!db || !validateForm()) return;
    setSubmitting(true); setFormError(null); setFormSuccess(null);
    try {
      await addDoc(collection(db, 'eventos'), {
        name: form.name, venue: form.venue, type: form.type,
        start: Timestamp.fromDate(parseDateParts(form.startDate)),
        end: Timestamp.fromDate(parseDateParts(form.endDate)),
        neighborhood: form.neighborhood, region: 'A definir',
        year: form.year, addedAt: Timestamp.now(),
      });
      setFormSuccess('Evento criado com sucesso!');
      setForm(EMPTY_FORM);
      refresh();
    } catch (err) {
      console.error(err);
      setFormError('Falha ao criar evento. Verifique as permissões do Firestore.');
    } finally { setSubmitting(false); }
  };

  /* ── open edit ──────────────────────────────────────────────────────── */
  const openEdit = (event: EventData) => {
    setForm({
      name: event.name, venue: event.venue, type: event.type,
      startDate: event.startDate, endDate: event.endDate,
      neighborhood: event.neighborhood, year: event.year,
    });
    setEditingId(event.id);
    setFormMode('edit');
    setFormError(null); setFormSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── update ─────────────────────────────────────────────────────────── */
  const handleUpdate = async () => {
    if (!db || !editingId || !validateForm()) return;
    setSubmitting(true); setFormError(null); setFormSuccess(null);
    try {
      await updateDoc(doc(db, 'eventos', editingId), {
        name: form.name, venue: form.venue, type: form.type,
        start: Timestamp.fromDate(parseDateParts(form.startDate)),
        end: Timestamp.fromDate(parseDateParts(form.endDate)),
        neighborhood: form.neighborhood, year: form.year,
      });
      setFormSuccess('Evento atualizado com sucesso!');
      setForm(EMPTY_FORM); setEditingId(null); setFormMode(null);
      refresh();
    } catch (err) {
      console.error(err);
      setFormError('Falha ao atualizar evento. Verifique as permissões do Firestore.');
    } finally { setSubmitting(false); }
  };

  /* ── single delete (confirmed) ──────────────────────────────────────── */
  const handleDelete = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'eventos', id));
      setConfirmSingle(null);
      refresh();
    } catch (err) {
      console.error(err);
    }
  };

  /* ── bulk delete (confirmed) ────────────────────────────────────────── */
  const handleBulkDelete = async () => {
    if (!db) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selected].map(id => deleteDoc(doc(db, 'eventos', id))));
      setConfirmBulk(false);
      refresh();
    } catch (err) {
      console.error(err);
    } finally { setBulkDeleting(false); }
  };

  /* ── selection helpers ──────────────────────────────────────────────── */
  const toggleOne = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAll = () =>
    setSelected(selected.size === rows.length ? new Set() : new Set(rows.map(r => r.id)));
  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0;

  /* ──────────────────────────────────────────────────────────────────────
     LOGIN SCREEN
  ────────────────────────────────────────────────────────────────────── */
  if (isLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#003366] via-[#00204d] to-[#001a33] p-6">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <img
              src="https://sindhoteisrj.com.br/wp-content/uploads/2023/04/Logo-HoteisRIO-Branca-Fundo-Transparente.png"
              alt="HoteisRIO" className="h-16 object-contain drop-shadow-lg"
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
            <p className="text-sm text-blue-100 mb-5">Informe a senha para acessar as funcionalidades de edição.</p>
            <input
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder="Senha de acesso"
              className="w-full bg-white/10 border border-white/20 text-white placeholder-blue-300 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            />
            {authError && (
              <p className="text-sm text-red-300 bg-red-900/30 border border-red-400/30 rounded-lg px-3 py-2 mb-4">
                {authError}
              </p>
            )}
            <div className="flex items-center gap-3">
              <button onClick={handleUnlock}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg transition-all active:scale-95">
                Entrar
              </button>
              <button onClick={() => window.location.assign('/')}
                className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition">
                Voltar
              </button>
            </div>
          </div>
          <p className="text-center text-blue-400 text-xs mt-6">Calendário de Eventos RJ 2026 — HoteisRIO</p>
        </div>
      </div>
    );
  }

  /* ──────────────────────────────────────────────────────────────────────
     MAIN PANEL
  ────────────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-gradient-to-r from-[#003366] to-[#00204d] shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <img
              src="https://sindhoteisrj.com.br/wp-content/uploads/2023/04/Logo-HoteisRIO-Branca-Fundo-Transparente.png"
              alt="HoteisRIO" className="h-10 object-contain"
            />
            <div className="border-l border-white/20 pl-4">
              <h1 className="text-lg font-bold text-white leading-none">Painel Administrativo</h1>
              <p className="text-xs text-blue-200 mt-0.5">Gestão de Eventos 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setFormMode('create'); setForm(EMPTY_FORM); setEditingId(null); setFormError(null); setFormSuccess(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white font-medium rounded-xl shadow transition-all active:scale-95"
            >
              <CalendarPlus size={16} /> Novo Evento
            </button>
            <button onClick={refresh} title="Recarregar" aria-label="Recarregar eventos"
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition">
              <RefreshCw size={16} className={rowsLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => { setIsLocked(true); setPassword(''); onLogout?.(); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-6">

        {/* ── Status card ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-xl"><Database size={20} className="text-blue-600" /></div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Eventos no Firebase</h2>
                <p className="text-sm text-slate-500">
                  Collection <span className="font-semibold text-blue-600">eventos</span> — mesmo backend do portal público.
                </p>
              </div>
            </div>
            <div>
              {loading ? (
                <span className="text-sm text-slate-400 animate-pulse">Carregando...</span>
              ) : firestoreAvailable === false ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Firestore indisponível
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  {events.length} evento{events.length === 1 ? '' : 's'} no portal
                </span>
              )}
            </div>
          </div>
          {firestoreAvailable === false && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              Firestore não configurado. Verifique as variáveis de ambiente (arquivo{' '}
              <code className="font-mono bg-red-100 px-1 rounded">.env</code>).
            </div>
          )}
        </div>

        {/* ── Create / Edit form ───────────────────────────────────────── */}
        {formMode !== null && (
          <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl">
                  {formMode === 'create' ? <Plus size={18} className="text-blue-600" /> : <Pencil size={18} className="text-blue-600" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    {formMode === 'create' ? 'Novo Evento' : 'Editar Evento'}
                  </h2>
                  <p className="text-sm text-slate-500">Preencha todos os campos e clique em salvar.</p>
                </div>
              </div>
              <button
                onClick={() => { setFormMode(null); setEditingId(null); setFormError(null); setFormSuccess(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {([
                ['name', 'Nome do Evento', 'Ex: Rock in Rio'],
                ['venue', 'Local / Venue', 'Ex: Parque Olímpico'],
                ['type', 'Tipo de Evento', 'Ex: Show & Festival'],
                ['neighborhood', 'Bairro', 'Ex: Barra Olímpica'],
                ['startDate', 'Data de Início (DD/MM/AAAA)', '01/06/2026'],
                ['endDate', 'Data de Fim (DD/MM/AAAA)', '03/06/2026'],
                ['year', 'Ano', '2026'],
              ] as [keyof typeof EMPTY_FORM, string, string][]).map(([field, lbl, ph]) => (
                <div key={field}>
                  <label className={labelClass}>{lbl}</label>
                  <input
                    value={form[field]}
                    onChange={(e) => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                    className={inputClass} placeholder={ph}
                  />
                </div>
              ))}
            </div>

            {formError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mt-5">{formError}</p>
            )}
            {formSuccess && (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 mt-5">{formSuccess}</p>
            )}

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={formMode === 'create' ? handleCreate : handleUpdate}
                disabled={submitting}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-semibold rounded-xl shadow transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Salvando...' : formMode === 'create' ? 'Criar Evento' : 'Salvar Alterações'}
              </button>
              <button
                onClick={() => { setForm(EMPTY_FORM); setFormError(null); setFormSuccess(null); }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
              >
                Limpar
              </button>
            </div>
          </div>
        )}

        {/* ── Bulk action bar ──────────────────────────────────────────── */}
        {someSelected && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-blue-800">
              {selected.size} evento{selected.size > 1 ? 's' : ''} selecionado{selected.size > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelected(new Set())}
                className="text-xs px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition">
                Desmarcar
              </button>
              <button onClick={() => setConfirmBulk(true)}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition">
                <Trash2 size={13} /> Excluir selecionados
              </button>
            </div>
          </div>
        )}

        {/* ── Bulk delete confirmation ─────────────────────────────────── */}
        {confirmBulk && (
          <div className="bg-white border border-red-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <AlertTriangle size={22} className="text-red-500 shrink-0" />
            <p className="text-sm text-slate-700 flex-1">
              Tem certeza que deseja excluir <strong>{selected.size}</strong> evento{selected.size > 1 ? 's' : ''}? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setConfirmBulk(false)}
                className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition">
                Cancelar
              </button>
              <button onClick={handleBulkDelete} disabled={bulkDeleting}
                className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition disabled:opacity-50">
                {bulkDeleting ? 'Excluindo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}

        {/* ── Single delete confirmation ───────────────────────────────── */}
        {confirmSingle && (
          <div className="bg-white border border-red-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <AlertTriangle size={22} className="text-red-500 shrink-0" />
            <p className="text-sm text-slate-700 flex-1">
              Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setConfirmSingle(null)}
                className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmSingle)}
                className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition">
                Excluir
              </button>
            </div>
          </div>
        )}

        {/* ── Admin events table ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">
              Eventos no Firestore
              {rows.length > 0 && (
                <span className="ml-2 text-xs font-normal text-slate-400">({rows.length})</span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              {!rowsLoading && rows.length === 0 && (
                <button
                  onClick={() => setConfirmSeed(true)}
                  disabled={seeding}
                  title="Importar os 135 eventos estáticos para o Firestore"
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50"
                >
                  <Upload size={13} /> Importar eventos para o Firestore
                </button>
              )}
              {rowsLoading && <RefreshCw size={14} className="animate-spin text-slate-400" />}
            </div>
          </div>

          {/* seed confirmation */}
          {confirmSeed && (
            <div className="mx-6 mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-4">
              <Upload size={20} className="text-blue-600 shrink-0" />
              <p className="text-sm text-slate-700 flex-1">
                Importar <strong>{EVENTS.length} eventos</strong> do calendário estático para o Firestore?
                Eventos já existentes serão mantidos (merge).
              </p>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setConfirmSeed(false)}
                  className="px-3 py-1.5 text-sm bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition">
                  Cancelar
                </button>
                <button onClick={handleSeedFirestore} disabled={seeding}
                  className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50">
                  {seeding ? 'Importando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          )}

          {seedError && (
            <div className="mx-6 mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              {seedError}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll}
                      aria-label="Selecionar todos os eventos"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-400 cursor-pointer" />
                  </th>
                  <th className="px-4 py-3">Nome do Evento</th>
                  <th className="px-4 py-3 whitespace-nowrap">Início</th>
                  <th className="px-4 py-3 whitespace-nowrap">Fim</th>
                  <th className="px-4 py-3">Local / Bairro</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rowsLoading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm animate-pulse">
                      Carregando eventos...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                      Nenhum evento cadastrado no Firestore ainda.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}
                      className={`transition-colors ${selected.has(row.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleOne(row.id)}
                          aria-label={`Selecionar ${row.name}`}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-400 cursor-pointer" />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">{row.name}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.startDate}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.endDate}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.venue}
                        {row.neighborhood && row.neighborhood !== row.venue && (
                          <span className="text-slate-400"> · {row.neighborhood}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5">
                          {row.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(row)}
                            title="Editar"
                            aria-label={`Editar ${row.name}`}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setConfirmSingle(row.id)}
                            title="Excluir"
                            aria-label={`Excluir ${row.name}`}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {rows.length > 0 && (
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
              {rows.length} evento{rows.length === 1 ? '' : 's'} no Firestore
              {someSelected && ` · ${selected.size} selecionado${selected.size > 1 ? 's' : ''}`}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
