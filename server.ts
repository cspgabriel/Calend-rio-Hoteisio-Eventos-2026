import express, { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import multer from 'multer';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const geminiApiKey = process.env.GEMINI_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

app.use(express.json());
app.use(express.static('dist'));

interface ParsedEvent {
  name: string;
  venue: string;
  type: string;
  start: string;
  end: string;
  neighborhood?: string;
  confidence?: number;
}

const EVENT_TYPES = [
  'Show', 'Festival', 'Congresso', 'Conferência', 'Exposição',
  'Evento', 'Esporte', 'Carnaval', 'Feira'
];

app.post('/api/parse-events', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!genAI) {
      return res.status(500).json({
        events: [],
        error: 'Missing GEMINI_API_KEY in server environment',
      });
    }

    const textInput = req.body.input || '';
    const imageFile = req.file;

    if (!textInput && !imageFile) {
      return res.status(400).json({ 
        events: [],
        error: 'Provide text or image input' 
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let prompt = `Você é um assistente especializado em extrair informações de eventos.
Analise o seguinte ${imageFile ? 'texto e imagem' : 'texto'} e extraia informações sobre eventos.

Para cada evento encontrado, retorne UM JSON array com esta estrutura exata:
[
  {
    "name": "Nome do evento",
    "venue": "Local/Venue",
    "type": "Tipo (escolha entre: ${EVENT_TYPES.join(', ')})",
    "start": "YYYY-MM-DD",
    "end": "YYYY-MM-DD",
    "neighborhood": "Bairro (opcional)",
    "confidence": 0.95
  }
]

Se não encontrar eventos, retorne um array vazio [].

TEXTO PARA ANALISAR:
${textInput || '(Análise via imagem)'}

RETORNE APENAS O JSON, SEM EXPLICAÇÕES ADICIONAIS.`;

    const content: Array<
      | { text: string }
      | { inlineData: { data: string; mimeType: string } }
    > = [{ text: prompt }];

    if (imageFile) {
      const base64Image = imageFile.buffer.toString('base64');
      content.push({
        inlineData: {
          data: base64Image,
          mimeType: imageFile.mimetype || 'image/jpeg',
        },
      });
    }

    const result = await model.generateContent(content);
    const responseText = result.response.text();

    // Extract JSON from response
    const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      return res.status(400).json({ 
        events: [],
        error: 'Could not parse response as JSON' 
      });
    }

    try {
      const events: ParsedEvent[] = JSON.parse(jsonMatch[0]);
      
      // Validate and filter events
      const validEvents = events.filter(e => 
        e.name && e.venue && e.type && e.start && e.end
      ).map(e => ({
        name: e.name || '',
        venue: e.venue || '',
        type: e.type || 'Evento',
        start: e.start,
        end: e.end,
        neighborhood: e.neighborhood || 'A definir',
        confidence: e.confidence || 0.8
      }));

      res.json({ events: validEvents });
    } catch (parseError) {
      res.status(400).json({ 
        events: [],
        error: 'Failed to parse JSON from response',
        details: parseError instanceof Error ? parseError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      events: [],
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Fallback for main app
app.get('*', (req: Request, res: Response) => {
  res.sendFile('dist/index.html');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
