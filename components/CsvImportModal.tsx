import React, { useState, useRef } from 'react';
import { X, Upload, AlertCircle, CheckCircle, FileText, Download } from 'lucide-react';
import { EventData } from '../types';
import { parseDate } from '../utils';

interface CsvImportModalProps {
  onClose: () => void;
  onImport: (events: Omit<EventData, 'id' | 'parsedStartDate' | 'parsedEndDate'>[]) => Promise<void>;
}

const MONTH_MAP: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
  5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
  9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
};

function getMonthFromDate(dateStr: string): string {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[1]);
    return MONTH_MAP[month] || 'A definir';
  }
  return 'A definir';
}

function normalizeString(s: string): string {
  return s.trim().replace(/^"|"$/g, '');
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === ';' || ch === ',') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

const TEMPLATE_CSV =
  'Nome do Evento;Local;Bairro;Região;Tipo;Data Início;Data Fim;Mês;Ano\n' +
  '"Exemplo de Evento";"Riocentro";"Barra Olímpica";"Barra & Jacarepaguá";"Congresso & Conferência";"01/06/2026";"03/06/2026";"Junho";"2026"';

const CsvImportModal: React.FC<CsvImportModalProps> = ({ onClose, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'preview' | 'importing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [parsedEvents, setParsedEvents] = useState<Omit<EventData, 'id' | 'parsedStartDate' | 'parsedEndDate'>[]>([]);
  const [fileName, setFileName] = useState('');

  const downloadTemplate = () => {
    const blob = new Blob(['\uFEFF' + TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_eventos.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setStatus('parsing');
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        let text = evt.target?.result as string;
        // Strip BOM if present
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

        const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
        if (lines.length < 2) {
          setErrorMsg('O arquivo CSV deve ter pelo menos uma linha de cabeçalho e uma linha de dados.');
          setStatus('error');
          return;
        }

        const separator = lines[0].includes(';') ? ';' : ',';
        const headers = parseCsvLine(lines[0]).map(h => normalizeString(h).toLowerCase());

        // Expected header indices
        const idx = {
          name: headers.indexOf('nome do evento'),
          venue: headers.indexOf('local'),
          neighborhood: headers.indexOf('bairro'),
          region: headers.indexOf('região'),
          type: headers.indexOf('tipo'),
          startDate: headers.indexOf('data início') !== -1 ? headers.indexOf('data início') : headers.indexOf('data inicio'),
          endDate: headers.indexOf('data fim'),
          month: headers.indexOf('mês') !== -1 ? headers.indexOf('mês') : headers.indexOf('mes'),
          year: headers.indexOf('ano'),
        };

        const missing: string[] = [];
        if (idx.name === -1) missing.push('Nome do Evento');
        if (idx.startDate === -1) missing.push('Data Início');
        if (idx.endDate === -1) missing.push('Data Fim');
        if (missing.length > 0) {
          setErrorMsg(`Colunas obrigatórias não encontradas: ${missing.join(', ')}. Verifique o cabeçalho do CSV.`);
          setStatus('error');
          return;
        }

        const events: Omit<EventData, 'id' | 'parsedStartDate' | 'parsedEndDate'>[] = [];
        const parseErrors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = parseCsvLine(lines[i]);
          const name = normalizeString(cols[idx.name] || '');
          const startDate = normalizeString(cols[idx.startDate] || '');
          const endDate = normalizeString(cols[idx.endDate] || '');

          if (!name || !startDate || !endDate) {
            parseErrors.push(`Linha ${i + 1}: Nome, Data Início ou Data Fim ausentes.`);
            continue;
          }

          // Validate date format DD/MM/YYYY
          if (!/^\d{2}\/\d{2}\/\d{4}$/.test(startDate)) {
            parseErrors.push(`Linha ${i + 1}: Data Início "${startDate}" inválida. Use DD/MM/AAAA.`);
            continue;
          }

          const venue = idx.venue !== -1 ? normalizeString(cols[idx.venue] || '') : 'A definir';
          const neighborhood = idx.neighborhood !== -1 ? normalizeString(cols[idx.neighborhood] || '') : 'A definir';
          const region = idx.region !== -1 ? normalizeString(cols[idx.region] || '') : 'Outros';
          const type = idx.type !== -1 ? normalizeString(cols[idx.type] || '') : 'Outros';
          const year = idx.year !== -1 ? normalizeString(cols[idx.year] || '') : startDate.slice(6);
          const month = idx.month !== -1 ? normalizeString(cols[idx.month] || '') : getMonthFromDate(startDate);

          events.push({
            name,
            venue: venue || 'A definir',
            type: type || 'Outros',
            startDate,
            endDate,
            month: month || getMonthFromDate(startDate),
            neighborhood: neighborhood || 'A definir',
            region: region || 'Outros',
            year: year || startDate.slice(6),
            lat: 0,
            lng: 0,
            inclusionDate: new Date().toLocaleDateString('pt-BR'),
          });
        }

        if (parseErrors.length > 0 && events.length === 0) {
          setErrorMsg('Nenhum evento válido encontrado.\n' + parseErrors.slice(0, 5).join('\n'));
          setStatus('error');
          return;
        }

        if (parseErrors.length > 0) {
          setErrorMsg(`${parseErrors.length} linha(s) ignorada(s) por erros. ${events.length} eventos prontos para importar.`);
        }

        setParsedEvents(events);
        setStatus('preview');
      } catch (err) {
        setErrorMsg('Erro ao processar o arquivo. Verifique se é um CSV válido.');
        setStatus('error');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = async () => {
    setStatus('importing');
    try {
      await onImport(parsedEvents);
      setStatus('done');
    } catch (err) {
      setErrorMsg('Erro ao importar eventos para o Firebase. Tente novamente.');
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Upload size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Importar Eventos via CSV</h2>
              <p className="text-xs text-slate-500">Os eventos serão salvos no Firebase automaticamente</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Template download */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-700">Baixar modelo CSV</p>
                <p className="text-xs text-slate-500">Use este template para formatar seus dados</p>
              </div>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg border border-blue-200 transition-colors"
            >
              <Download size={14} />
              Template
            </button>
          </div>

          {/* File picker */}
          {(status === 'idle' || status === 'parsing') && (
            <div
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} className="mx-auto mb-3 text-slate-400" />
              <p className="text-sm font-medium text-slate-600 mb-1">
                {status === 'parsing' ? 'Processando...' : 'Clique ou arraste um arquivo CSV aqui'}
              </p>
              <p className="text-xs text-slate-400">Separador: ponto-e-vírgula (;) ou vírgula (,) · Encoding: UTF-8</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 whitespace-pre-line">{errorMsg}</p>
            </div>
          )}

          {/* Preview */}
          {status === 'preview' && parsedEvents.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-700">
                  {parsedEvents.length} evento(s) prontos para importar
                </p>
                <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{fileName}</span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-slate-500 min-w-[200px]">Nome</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-500">Local</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-500">Início</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-500">Término</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-500">Tipo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedEvents.slice(0, 20).map((ev, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium text-slate-800 truncate max-w-[200px]">{ev.name}</td>
                          <td className="px-4 py-2 text-slate-600 truncate max-w-[150px]">{ev.venue}</td>
                          <td className="px-4 py-2 text-slate-600">{ev.startDate}</td>
                          <td className="px-4 py-2 text-slate-600">{ev.endDate}</td>
                          <td className="px-4 py-2 text-slate-600">{ev.type}</td>
                        </tr>
                      ))}
                      {parsedEvents.length > 20 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-2 text-center text-slate-400">
                            +{parsedEvents.length - 20} mais...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Success */}
          {status === 'done' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex flex-col items-center gap-3 text-center">
              <CheckCircle size={36} className="text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-800">
                {parsedEvents.length} evento(s) importado(s) com sucesso!
              </p>
              <p className="text-xs text-emerald-600">Os dados foram salvos no Firebase e já estão visíveis na lista.</p>
            </div>
          )}

          {/* Importing */}
          {status === 'importing' && (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm text-slate-600">Importando {parsedEvents.length} eventos para o Firebase...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
          {status === 'done' ? (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Fechar
            </button>
          ) : (
            <>
              {(status === 'error') && (
                <button
                  onClick={() => { setStatus('idle'); setErrorMsg(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Tentar novamente
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              {status === 'preview' && (
                <button
                  onClick={handleImport}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <Upload size={16} />
                  Importar {parsedEvents.length} evento(s)
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CsvImportModal;
