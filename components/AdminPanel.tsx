import React, { useState } from 'react';
import { Plus, Upload, Zap, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { EventData } from '../types';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

interface ParsedEvent {
  name: string;
  venue: string;
  type: string;
  start: string;
  end: string;
  neighborhood?: string;
  description?: string;
  confidence?: number;
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  const [formData, setFormData] = useState({
    name: '',
    venue: '',
    type: '',
    start: '',
    end: '',
    neighborhood: '',
  });
  const [aiInput, setAiInput] = useState('');
  const [aiImage, setAiImage] = useState<File | null>(null);
  const [parsedEvents, setParsedEvents] = useState<ParsedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.venue || !formData.type || !formData.start || !formData.end) {
      setMessage({ type: 'error', text: 'Preencha todos os campos obrigatórios' });
      return;
    }

    try {
      await addDoc(collection(db, 'eventos'), {
        name: formData.name,
        venue: formData.venue,
        type: formData.type,
        start: new Date(formData.start),
        end: new Date(formData.end),
        neighborhood: formData.neighborhood || 'A definir',
        addedAt: new Date().toLocaleDateString('pt-BR'),
      });
      
      setMessage({ type: 'success', text: 'Evento criado com sucesso!' });
      setFormData({ name: '', venue: '', type: '', start: '', end: '', neighborhood: '' });
    } catch (error) {
      setMessage({ type: 'error', text: `Erro ao criar evento: ${error.message}` });
    }
  };

  const handleProcessAI = async () => {
    if (!aiInput && !aiImage) {
      setMessage({ type: 'error', text: 'Digite um texto ou envie uma imagem' });
      return;
    }

    setLoading(true);
    try {
      const formDataAI = new FormData();
      formDataAI.append('input', aiInput);
      if (aiImage) {
        formDataAI.append('image', aiImage);
      }

      const response = await fetch('/api/parse-events', {
        method: 'POST',
        body: formDataAI,
      });

      if (!response.ok) {
        throw new Error('Erro ao processar com IA');
      }

      const data = await response.json();
      setParsedEvents(data.events);
      setMessage({ type: 'success', text: `${data.events.length} evento(s) detectado(s)` });
    } catch (error) {
      setMessage({ type: 'error', text: `Erro: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromAI = async (event: ParsedEvent) => {
    try {
      await addDoc(collection(db, 'eventos'), {
        name: event.name,
        venue: event.venue || 'A definir',
        type: event.type || 'Evento',
        start: new Date(event.start),
        end: new Date(event.end),
        neighborhood: event.neighborhood || 'A definir',
        addedAt: new Date().toLocaleDateString('pt-BR'),
      });
      
      setParsedEvents(prev => prev.filter(e => e.name !== event.name));
      setMessage({ type: 'success', text: `"${event.name}" criado com sucesso!` });
    } catch (error) {
      setMessage({ type: 'error', text: `Erro: ${error.message}` });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setAiImage(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              🔐 Painel Administrativo
            </h1>
            <p className="mt-2 text-purple-100">Gerencie eventos de forma segura</p>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-4 px-6 font-medium transition-colors ${
                activeTab === 'manual'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Plus size={18} className="inline mr-2" />
              Criar Evento Manual
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-4 px-6 font-medium transition-colors ${
                activeTab === 'ai'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Zap size={18} className="inline mr-2" />
              IA - Processar Imagem/Texto
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Messages */}
            {message && (
              <div className={`mb-6 p-4 rounded-lg flex items-gap-2 ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-800' 
                  : 'bg-red-50 text-red-800'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle size={20} className="mr-2 flex-shrink-0" />
                ) : (
                  <AlertCircle size={20} className="mr-2 flex-shrink-0" />
                )}
                {message.text}
              </div>
            )}

            {/* Manual Form */}
            {activeTab === 'manual' && (
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Evento *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Show Luan Santana"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Venue *
                    </label>
                    <input
                      type="text"
                      name="venue"
                      value={formData.venue}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Parque Olímpico"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo *
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      <option value="Show">Show</option>
                      <option value="Festival">Festival</option>
                      <option value="Congresso">Congresso</option>
                      <option value="Conferência">Conferência</option>
                      <option value="Exposição">Exposição</option>
                      <option value="Evento">Evento</option>
                      <option value="Esporte">Esporte</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Início *
                    </label>
                    <input
                      type="date"
                      name="start"
                      value={formData.start}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Fim *
                    </label>
                    <input
                      type="date"
                      name="end"
                      value={formData.end}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    name="neighborhood"
                    value={formData.neighborhood}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Barra da Tijuca"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Criar Evento
                </button>
              </form>
            )}

            {/* AI Form */}
            {activeTab === 'ai' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💡 Cole um texto sobre eventos ou envie uma imagem e a IA extrairá automaticamente as informações
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Texto / Descrição
                  </label>
                  <textarea
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Cole aqui o texto sobre eventos, horários, locais, etc..."
                    rows={5}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ou envie uma imagem
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="imageInput"
                    />
                    <label htmlFor="imageInput" className="cursor-pointer block">
                      <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        {aiImage ? aiImage.name : 'Clique para enviar imagem'}
                      </p>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleProcessAI}
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader size={20} className="animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Zap size={20} />
                      Processar com IA
                    </>
                  )}
                </button>

                {/* Parsed Events */}
                {parsedEvents.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Eventos Detectados ({parsedEvents.length})
                    </h3>
                    {parsedEvents.map((event, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <h4 className="font-semibold text-gray-800">{event.name}</h4>
                        <div className="mt-2 text-sm text-gray-600 space-y-1">
                          <p><strong>Venue:</strong> {event.venue || 'A definir'}</p>
                          <p><strong>Tipo:</strong> {event.type || 'Evento'}</p>
                          <p><strong>Data:</strong> {event.start} a {event.end}</p>
                          {event.neighborhood && <p><strong>Bairro:</strong> {event.neighborhood}</p>}
                          {event.confidence && <p><strong>Confiança:</strong> {Math.round(event.confidence * 100)}%</p>}
                        </div>
                        <button
                          onClick={() => handleCreateFromAI(event)}
                          className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={18} />
                          Criar Evento
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
