import { google } from "googleapis";

export default async function handler(req: any, res: any) {
  // CORS configuration if needed, though usually same-domain relative path matches
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action, eventData, eventsData } = req.body;

  if (action !== 'SYNC_ALL' && (!eventData || !eventData.id)) {
    return res.status(400).json({ error: 'Missing event ID' });
  }

  const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
  const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

  if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    console.error("Vercel Env Vars para o Google Sheets não configuradas.");
    return res.status(500).json({ error: 'Configuração do Sheets ausente' });
  }

  PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, '\n');

  try {
    const auth = new google.auth.JWT(
      CLIENT_EMAIL,
      undefined,
      PRIVATE_KEY,
      ["https://www.googleapis.com/auth/spreadsheets"]
    );

    const sheets = google.sheets({ version: "v4", auth });

    if (action === 'SYNC_ALL') {
      if (!Array.isArray(eventsData) || eventsData.length === 0) {
        return res.status(400).json({ error: 'eventsData array is required for SYNC_ALL' });
      }

      await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: "Página1!A:H",
      });

      const headers = ["ID", "Nome", "Local", "Bairro", "Região", "Tipo", "Data Início", "Data Fim"];
      const rows = eventsData.map((e: any) => [
        e.id || "",
        e.name || "",
        e.venue || "",
        e.neighborhood || "",
        e.region || "",
        e.type || "",
        e.startDate || "",
        e.endDate || "",
      ]);

      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: "Página1!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [headers, ...rows] },
      });

      return res.status(200).json({ success: true, message: `${eventsData.length} eventos sincronizados com sucesso!` });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Página1!A:A",
    });

    const rows = response.data.values;
    let rowIndex = -1;

    if (rows && rows.length > 0) {
      rowIndex = rows.findIndex((row: any[]) => row[0] === eventData.id);
    }

    const rowData = action === 'DELETE' ? ["", "", "", "", "", "", "", ""] : [
      eventData.id,
      eventData.name || "",
      eventData.venue || "",
      eventData.neighborhood || "",
      eventData.region || "",
      eventData.type || "",
      eventData.startDate || "",
      eventData.endDate || ""
    ];

    if (rowIndex !== -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `Página1!A${rowIndex + 1}:H${rowIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [rowData] }
      });
    } else if (action !== 'DELETE') {
      if (!rows || rows.length === 0) {
        const headers = ["ID", "Nome", "Local", "Bairro", "Região", "Tipo", "Data Início", "Data Fim"];
        await sheets.spreadsheets.values.append({
          spreadsheetId: SHEET_ID,
          range: "Página1!A1",
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [headers] }
        });
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: "Página1!A:H",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [rowData] }
      });
    }

    return res.status(200).json({ success: true, message: 'Google Sheets sync realizado com sucesso!' });
  } catch (error: any) {
    console.error("Sheets Error:", error);
    return res.status(500).json({ error: 'Falha ao sincronizar com Google Sheets', details: error.message });
  }
}
