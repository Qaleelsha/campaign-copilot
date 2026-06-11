const Groq = require('groq-sdk');
const { resolveSegment } = require('./segmentEngine');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are Campaign Copilot, an AI assistant for Brew & Co., a coffee chain brand.
You help marketers create targeted customer campaigns using natural language.

You have access to customer data with these attributes:
- Purchase history (categories: coffee, pastry, merchandise)
- Last purchase date
- Total spend
- City (Mumbai, Delhi, Bangalore, Chennai, Kochi, Ahmedabad, Hyderabad, Pune, Lucknow, Kolkata)
- Tags (vip, coffee-lover, pastry-fan)
- Channel preference (whatsapp, sms, email, rcs)

When a marketer describes a campaign goal, you must respond with a JSON object in this exact format:
{
  "intent": "brief description of what the marketer wants",
  "segment_name": "short descriptive name for this audience",
  "segment_description": "one sentence describing who this segment is",
  "rules": {
    "last_purchase_days": N,
    "lapsed_days": N,
    "min_spend": N,
    "category": "coffee",
    "city": "Mumbai",
    "tag": "vip",
    "min_orders": N,
    "channel_preference": "whatsapp"
  },
  "channel": "whatsapp",
  "message_template": "Hey {name}, message here",
  "campaign_name": "short campaign name"
}

Only include rules that are relevant to the request. Do not include all rules every time.

Rules for message templates:
- Keep messages under 160 characters for SMS
- WhatsApp and RCS can be longer and more conversational
- Always use {name} to personalise
- Be warm and on-brand for a coffee chain
- Include a clear call to action

If the request is unclear, ask one clarifying question.
IMPORTANT: Always respond with valid JSON only. No explanation text, no markdown fences, no preamble.`;

function parseAgentResponse(text) {
  try {
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (err) {
    return null;
  }
}

async function runAgent(messages) {
  const formattedMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map(m => ({ role: m.role, content: m.content }))
  ];

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: formattedMessages,
    max_tokens: 1000,
    temperature: 0.3
  });

  const rawText = response.choices[0].message.content;
  const parsed = parseAgentResponse(rawText);

  if (parsed && parsed.rules) {
    try {
      const customers = await resolveSegment(parsed.rules);
      return {
        type: 'campaign_plan',
        plan: parsed,
        segment_preview: {
          count: customers.length,
          sample: customers.slice(0, 5).map(c => ({
            name: c.name,
            city: c.city,
            last_purchase_at: c.last_purchase_at,
            total_spend: c.total_spend
          }))
        },
        raw: rawText
      };
    } catch (err) {
      console.error('Segment resolution error:', err.message);
    }
  }

  return {
    type: 'clarification',
    message: rawText
  };
}

module.exports = { runAgent };