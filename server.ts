import express, { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const app = express();
const upload = multer({ dest: 'uploads/' });
const client = new Anthropic();

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
  'Evento', 'Esporte', 'Carnaval', 'Festa', 'Feira'
];

app.post('/api/parse-events', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const textInput = req.body.input || '';
    const imageFile = req.file;

    let prompt = `Você é um assistente especializado em extrair informações de eventos.
Analise o seguinte ${imageFile ? 'texto e imagem' : 'texto'} e extraia informações sobre eventos.

Para cada evento encontrado, retorne um JSON com esta estrutura:
{
  "events": [
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
}

Texto fornecido:
${textInput}

Retorne APENAS o JSON válido, sem explicações adicionais.`;

    let response;

    if (imageFile) {
      const imageData = fs.readFileSync(imageFile.path);
      const base64Image = imageData.toString('base64');
      const mimeType = imageFile.mimetype || 'image/jpeg';

      response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      fs.unlinkSync(imageFile.path);
    } else {
      response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });
    }

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Resposta inválida da IA');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Não foi possível extrair eventos do texto/imagem');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validação básica
    const events: ParsedEvent[] = (parsed.events || []).filter((event: any) => {
      return event.name && event.venue && event.start && event.end;
    });

    res.json({ events });
  } catch (error) {
    console.error('Erro ao processar eventos:', error);
    res.status(500).json({
      error: 'Erro ao processar com IA',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
