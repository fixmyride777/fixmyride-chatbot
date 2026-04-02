# FixMyRide AI Agent Backend (Node.js)

Express backend that runs an Anthropic tool-calling loop and exposes it via HTTP.

## Setup

1. Install deps

```bash
npm install
```

2. Create `.env`

```bash
copy .env.example .env
```

Then set `ANTHROPIC_API_KEY` and `WASENDER_API_TOKEN`.
Also set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (server-side only).

3. Run

```bash
npm run dev
```

Server starts on `http://localhost:3000` (or `PORT`).

## API

### POST `/agent/run`

Body:

```json
{
  "phone_number": "+971501234567",
  "message": "Yes, I am in Dubai.",
  "conversation": []
}
```

Response:

```json
{
  "reply": "…",
  "raw": { "id": "…", "content": [] },
  "messages": []
}
```

### POST `/webhook/get-whatsapp-message` (n8n payload)

Send the same JSON payload your n8n webhook receives (it must contain):
- `data.messages.messageBody`
- `data.messages.key.cleanedSenderPn`

Response:

```json
{
  "ok": true,
  "phone_number": "+971501234567",
  "reply": "…",
  "sent": true
}
```

## Notes

- Tool implementations in `src/tools/` are placeholders; wire them to your DB / WhatsApp provider / n8n workflows.
- Requires Node 18+ (built-in `fetch`).

## Supabase memory setup

1. Create a Supabase project.
2. In Supabase SQL editor, run `supabase.sql` from this repo.
3. In `.env`, set:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep private; never expose to frontend)
