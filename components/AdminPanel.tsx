import React, { useState } from 'react';
import { addDoc, collection, Timestamp, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Plus, AlertTriangle } from 'lucide-react';
import EventList from './EventList';
import { EventData } from '../types';

const ADMIN_PASSWORD = 'admin123';

type Props = {
  events: EventData[];
  loading: boolean;
  firestoreAvailable: boolean | null;
  onLogout?: () => void;
  onReload?: () => void;
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

export default function AdminPanel({ events, loading, firestoreAvailable, onLogout, onReload }: Props) {
  const [isLocked, setIsLocked] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_EVENT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit state
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EVENT_FORM);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Delete state
  const [pendingDelete, setPendingDelete] = useState<EventData | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

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

  const handleEdit = (event: EventData) => {
    setEditingEvent(event);
    setEditForm({
      name: event.name,
      venue: event.venue,
      type: event.type,
      startDate: event.startDate,
      endDate: event.endDate,
      neighborhood: event.neighborhood,
      year: event.year,
    });
    setEditError(null);
    setEditSuccess(null);
  };

  const handleUpdate = async () => {
    if (!db || !editingEvent) return;

    const required = ['name', 'venue', 'type', 'startDate', 'endDate', 'neighborhood', 'year'] as const;
    for (const key of required) {
      if (!editForm[key]) {
        setEditError('Preencha todos os campos antes de salvar.');
        return;
      }
    }

    setEditSubmitting(true);
    setEditError(null);
    setEditSuccess(null);

    try {
      const startParts = editForm.startDate.split('/');
      const endParts = editForm.endDate.split('/');
      const start = new Date(Number(startParts[2]), Number(startParts[1]) - 1, Number(startParts[0]));
      const end = new Date(Number(endParts[2]), Number(endParts[1]) - 1, Number(endParts[0]));

      await updateDoc(doc(db, 'eventos', editingEvent.id), {
        name: editForm.name,
        venue: editForm.venue,
        type: editForm.type,
        start: Timestamp.fromDate(start),
        end: Timestamp.fromDate(end),
        neighborhood: editForm.neighborhood,
        region: editingEvent.region || 'A definir',
        year: editForm.year,
      });

      setEditSuccess('Evento atualizado com sucesso!');
      onReload?.();
      setTimeout(() => {
        setEditingEvent(null);
        setEditSuccess(null);
      }, 1500);
    } catch (err) {
      console.error(err);
      setEditError('Falha ao atualizar evento. Verifique as permissões do Firestore.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!db || !pendingDelete) return;

    setDeleteSubmitting(true);
    try {
      await deleteDoc(doc(db, 'eventos', pendingDelete.id));
      setPendingDelete(null);
      onReload?.();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  if (isLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white shadow rounded-xl border border-slate-200 p-6">
          <h1 className="text-xl font-semibold text-slate-800 mb-4">Área Administrativa</h1>
          <p className="text-sm text-slate-500 mb-4">Informe a senha para acessar as funcionalidades de edição.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <div className="flex items-center justify-between">
            <button
              onClick={handleUnlock}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Entrar
            </button>
            <button
              onClick={() => window.location.assign('/')}
              className="px-4 py-2 text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Painel Administrativo</h1>
            <p className="text-sm text-slate-500">Aqui você pode adicionar novos eventos diretamente no banco.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowForm(s => !s);
                setSuccess(null);
                setError(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Plus size={16} />
              Criar novo evento
            </button>
            <button
              onClick={() => {
                setIsLocked(true);
                setPassword('');
                onLogout?.();
              }}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
            >
              Sair
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Eventos no Firebase</h2>
              <p className="text-sm text-slate-500">
                Esta lista reflete o que está armazenado na collection <span className="font-semibold">eventos</span>.
              </p>
            </div>
            <div className="text-sm text-slate-500">
              {loading ? 'Carregando...' : `${events.length} evento${events.length === 1 ? '' : 's'}`}
            </div>
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-slate-500">Aguarde enquanto conectamos ao Firestore...</div>
          ) : firestoreAvailable === false ? (
            <div className="mt-4 text-sm text-red-600">Firestore não configurado. Verifique as variáveis de ambiente.</div>
          ) : (
            <div className="mt-4 text-sm text-slate-500">Os eventos exibidos abaixo são provenientes do mesmo backend que alimenta o portal.</div>
          )}
        </div>

        {showForm && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Novo evento</h2>
                <p className="text-sm text-slate-500">Preencha os campos abaixo e clique em criar.</p>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setSuccess(null);
                  setError(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div>
                <label className="text-xs font-semibold text-slate-500">Nome do Evento</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Ex: Rock in Rio"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Local/Localização</label>
                <input
                  value={form.venue}
                  onChange={(e) => setForm(prev => ({ ...prev, venue: e.target.value }))}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Ex: Parque Olímpico"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Tipo de Evento</label>
                <input
                  value={form.type}
                  onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Ex: Show & Festival"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Bairro</label>
                <input
                  value={form.neighborhood}
                  onChange={(e) => setForm(prev => ({ ...prev, neighborhood: e.target.value }))}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Ex: Barra Olímpica"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Data de Início (DD/MM/YYYY)</label>
                <input
                  value={form.startDate}
                  onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Data de Fim (DD/MM/YYYY)</label>
                <input
                  value={form.endDate}
                  onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Ano</label>
                <input
                  value={form.year}
                  onChange={(e) => setForm(prev => ({ ...prev, year: e.target.value }))}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Ex: 2026"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
            {success && <p className="text-sm text-emerald-600 mt-4">{success}</p>}

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {submitting ? 'Salvando...' : 'Salvar evento'}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
              >
                Limpar
              </button>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Lista de eventos</h2>
          <EventList
            events={events}
            onEdit={handleEdit}
            onDelete={(event) => setPendingDelete(event)}
          />
        </div>
      </div>

      {/* Edit Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg">
            <div className="flex items-start justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Editar evento</h2>
                <p className="text-sm text-slate-500 mt-0.5">Atualize os campos e clique em salvar.</p>
              </div>
              <button
                onClick={() => { setEditingEvent(null); setEditError(null); setEditSuccess(null); }}
                className="text-slate-400 hover:text-slate-600 mt-0.5"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500">Nome do Evento</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Local/Localização</label>
                <input
                  value={editForm.venue}
                  onChange={(e) => setEditForm(prev => ({ ...prev, venue: e.target.value }))}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Tipo de Evento</label>
                <input
                  value={editForm.type}
                  onChange={(e) => setEditForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Bairro</label>
                <input
                  value={editForm.neighborhood}
                  onChange={(e) => setEditForm(prev => ({ ...prev, neighborhood: e.target.value }))}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Data de Início (DD/MM/YYYY)</label>
                <input
                  value={editForm.startDate}
                  onChange={(e) => setEditForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Data de Fim (DD/MM/YYYY)</label>
                <input
                  value={editForm.endDate}
                  onChange={(e) => setEditForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Ano</label>
                <input
                  value={editForm.year}
                  onChange={(e) => setEditForm(prev => ({ ...prev, year: e.target.value }))}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            {editError && <p className="text-sm text-red-600 px-6 pb-2">{editError}</p>}
            {editSuccess && <p className="text-sm text-emerald-600 px-6 pb-2">{editSuccess}</p>}

            <div className="flex items-center gap-3 p-6 pt-2 border-t border-slate-100">
              <button
                onClick={handleUpdate}
                disabled={editSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {editSubmitting ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button
                onClick={() => { setEditingEvent(null); setEditError(null); setEditSuccess(null); }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle size={22} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-base font-semibold text-slate-800">Excluir evento</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Tem certeza que deseja excluir <span className="font-semibold text-slate-700">"{pendingDelete.name}"</span>? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleteSubmitting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
