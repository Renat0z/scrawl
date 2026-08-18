import Groq from 'groq-sdk';

let _client = null;

function client() {
  if (!_client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('Error: GROQ_API_KEY environment variable not set.');
      process.exit(1);
    }
    _client = new Groq({ apiKey });
  }
  return _client;
}

const DEFAULT_MODEL = 'llama-3.1-8b-instant';

function truncate(text, maxChars = 12000) {
  return text.length > maxChars ? text.slice(0, maxChars) + '\n[... truncated]' : text;
}

export async function ask(content, question, model = DEFAULT_MODEL) {
  const res = await client().chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that answers questions about web page content. Be concise and accurate.',
      },
      {
        role: 'user',
        content: `Web page content:\n\n${truncate(content)}\n\nQuestion: ${question}`,
      },
    ],
    max_tokens: 1024,
  });
  return res.choices[0].message.content;
}

export async function summarize(content, length = 'medium', model = DEFAULT_MODEL) {
  const guide = { short: '2-3 sentences', medium: '1-2 paragraphs', long: '3-5 paragraphs' }[length] ?? '1-2 paragraphs';
  const res = await client().chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Summarize the web page content in ${guide}. Focus on the main topic and key points.`,
      },
      { role: 'user', content: truncate(content) },
    ],
    max_tokens: 1024,
  });
  return res.choices[0].message.content;
}

export async function extractFields(content, fields, model = DEFAULT_MODEL) {
  const res = await client().chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Extract the following fields from the web page content and return as valid JSON: ${fields.join(', ')}.`,
      },
      { role: 'user', content: truncate(content) },
    ],
    max_tokens: 1024,
    response_format: { type: 'json_object' },
  });
  return JSON.parse(res.choices[0].message.content);
}
