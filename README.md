# Campaign Copilot

An AI-native Mini CRM for consumer brands to reach their shoppers through intelligent, conversation-driven campaigns.

Built as part of Xeno's Engineering Internship Assignment — June 2026.

---

## What it does

Campaign Copilot lets a marketer describe a campaign goal in plain English. The system figures out who to talk to, drafts the message, fires it across a channel, and tracks what happened — all without touching a form or writing a query.

**Example:**
> "Send a thank you to VIP customers who spent over ₹1000"

The AI parses the intent, resolves the segment against live customer data, previews the matching audience, and waits for one-click confirmation before launching.

---

## Architecture

```
┌──────────────────────────────────────────┐
│           React Frontend (Vite)          │
│   Chat Interface · Customers · Campaigns │
└──────────────────┬───────────────────────┘
                   │ REST
┌──────────────────▼───────────────────────┐
│         CRM Backend (Node.js)            │
│                                          │
│  /api/chat       AI agent endpoint       │
│  /api/customers  customer data           │
│  /api/segments   segment CRUD            │
│  /api/campaigns  campaign management     │
│  /api/receipts   callback receiver       │
│                                          │
│  PostgreSQL (RDS-style relational DB)    │
└──────────────────┬───────────────────────┘
                   │ HTTP
┌──────────────────▼───────────────────────┐
│       Channel Stub (separate service)    │
│  Simulates WhatsApp · SMS · Email · RCS  │
│  Async callbacks → /api/receipts         │
└──────────────────────────────────────────┘
```

Two services, not one. The channel stub is intentionally separate — it mirrors how real messaging providers (Twilio, Gupshup, Meta) work: you send, they call back.

---

## AI Layer

The AI agent runs on **Groq (LLaMA 3.3 70B)**. It receives the marketer's natural language input and returns a structured JSON campaign plan — segment rules, channel, personalised message template, campaign name.

The agent doesn't write SQL. It produces a rule object:

```json
{
  "rules": {
    "tag": "vip",
    "min_spend": 1000
  },
  "channel": "whatsapp",
  "message_template": "Hey {name}, thanks for being a valued VIP!"
}
```

A separate segment engine translates that into parameterised PostgreSQL queries. This separation means the AI can never inject SQL, and the rule schema is easy to extend.

---

## Channel Delivery Loop

The stub simulates realistic delivery outcomes per channel:

| Channel   | Delivery | Open Rate | Click Rate |
|-----------|----------|-----------|------------|
| WhatsApp  | 92%      | 75%       | 30%        |
| SMS       | 88%      | 65%       | 15%        |
| Email     | 85%      | 40%       | 12%        |
| RCS       | 90%      | 70%       | 25%        |

Each communication follows the lifecycle: `pending → sent → delivered → opened → clicked` (or `failed`). Every state change fires an async HTTP callback to `/api/receipts`, which updates the communication record and increments campaign-level counters atomically.

The frontend polls campaign stats every 3 seconds — so the delivery funnel chart updates live after a campaign fires.

---

## Data Model

Five tables. Each one has a clear reason to exist:

- **customers** — who the brand knows about
- **orders** — purchase history; drives all segmentation
- **segments** — saved audience definitions with JSONB rules
- **campaigns** — one campaign = one segment + one channel + one message
- **communications** — one row per customer per campaign; tracks the full delivery lifecycle

`communications` is the most important table. Analytics are aggregates over this table, not over campaigns. The separation means partial failures are observable and per-customer delivery state is always queryable.

---

## Stack

**Backend:** Node.js, Express, PostgreSQL, Groq SDK  
**Frontend:** React, Vite, Recharts, Lucide  
**Channel Stub:** Node.js, Express, Axios  
**AI Model:** LLaMA 3.3 70B via Groq  
**Hosting:** Railway (backend + DB + stub), Vercel (frontend)

---

## Running locally

**Prerequisites:** Node.js 18+, PostgreSQL 14+

```bash
# Clone
git clone https://github.com/Qaleelsha/campaign-copilot.git
cd campaign-copilot

# Backend
cd backend
cp .env.example .env        # fill in your keys
npm install
psql -d campaign_copilot -f src/schema.sql
npm run seed
npm run dev                 # runs on :3001

# Channel stub (separate terminal)
cd channel-stub
cp .env.example .env
npm install
node index.js               # runs on :3002

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                 # runs on :5174
```

**Environment variables (backend):**
```
DATABASE_URL=postgresql://localhost:5432/campaign_copilot
GROQ_API_KEY=your_key_here
CHANNEL_STUB_URL=http://localhost:3002/send
PORT=3001
```

**Environment variables (channel-stub):**
```
CRM_RECEIPT_URL=http://localhost:3001/api/receipts
PORT=3002
```

---

## Tradeoffs and scope decisions

**What I built and why:**
- Chat-first interface over a form-based one — more opinionated, more interesting to demo, closer to how AI-native tools should feel
- Segment engine with a fixed rule schema instead of free-form SQL generation — safer, more predictable, easier to extend
- Campaign-level aggregate counters alongside the communications table — slightly denormalised but makes analytics queries instant without COUNT() on every request

**What I deliberately skipped:**
- Authentication — not relevant to evaluating the core product
- Real messaging provider integration — the stub models the actual topology accurately enough
- Multi-user workspaces — out of scope for a single-brand demo

**What I'd do differently at production scale:**
- Replace synchronous campaign firing with a job queue (BullMQ or SQS) so large segments don't block the API process
- Add a retry mechanism with exponential backoff for failed channel stub callbacks
- Store conversation history server-side instead of passing it in each request

---

## Project structure

```
campaign-copilot/
├── backend/
│   ├── src/
│   │   ├── config/db.js
│   │   ├── routes/
│   │   │   ├── chat.js
│   │   │   ├── customers.js
│   │   │   ├── orders.js
│   │   │   ├── campaigns.js
│   │   │   ├── segments.js
│   │   │   └── receipts.js
│   │   ├── services/
│   │   │   ├── agent.js
│   │   │   ├── segmentEngine.js
│   │   │   └── campaignRunner.js
│   │   ├── schema.sql
│   │   └── scripts/seed.js
│   └── index.js
├── channel-stub/
│   └── index.js
└── frontend/
    └── src/
        ├── pages/
        ├── components/
        ├── styles/
        └── api.js
```

---

*Built by Qaleel Sha Backer — github.com/Qaleelsha*