<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/0b69e02a-37d8-455a-86c9-252d713aa25f

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Integração com calendário (iCal + Google Calendar)

Agora o painel possui o botão **"Exportar iCal (.ics)"** nos filtros da tela principal.

### Como usar
1. Aplique os filtros desejados.
2. Clique em **Exportar iCal (.ics)**.
3. Importe o arquivo `.ics` no Google Calendar (Configurações > Importar e exportar).

### Observação sobre sincronização automática
- O arquivo `.ics` exportado manualmente funciona bem para importação.
- Para sincronização 100% automática (novo evento no Firebase criando evento no Google Calendar sem ação manual), é necessário um backend seguro com credenciais do Google (ex.: **Firebase Cloud Functions** com Service Account).
