const crypto = require("node:crypto");
const fs = require("node:fs/promises");

const API = "https://api.overchat.ai/v1/chat/completions";
const SESSION_FILE = "./overchat-claude-session.json";

const MODEL = "claude-haiku-4-5-20251001";
const PERSONA_ID = "claude-haiku-4-5-landing";

async function loadSession() {
  try {
    const raw = await fs.readFile(SESSION_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {
      chatId: crypto.randomUUID(),
      deviceId: crypto.randomUUID(),
      messages: [],
    };
  }
}

async function saveSession(session) {
  await fs.writeFile(
    SESSION_FILE,
    JSON.stringify(session, null, 2),
    "utf8"
  );
}

async function overchat(prompt) {
  const session = await loadSession();

  const userMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: prompt,
  };

  const systemMessage = {
    id: crypto.randomUUID(),
    role: "system",
    content:
      "Follow the user's language and respond in a natural, concise, and clear style.",
  };

  const body = {
    chatId: session.chatId,
    model: MODEL,
    messages: [...session.messages, systemMessage, userMessage],
    personaId: PERSONA_ID,
    frequency_penalty: 0,
    max_tokens: 4000,
    presence_penalty: 0,
    stream: true,
    temperature: 0.5,
    top_p: 0.95,
  };

  const headers = {
    "sec-ch-ua-platform": `"Android"`,
    "x-device-uuid": session.deviceId,
    "sec-ch-ua": `"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"`,
    "sec-ch-ua-mobile": "?1",
    "x-device-language": "id-ID",
    "x-device-platform": "web",
    "x-device-version": "1.0.44",
    "user-agent":
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
    accept: "*/*",
    "content-type": "application/json",
    origin: "https://overchat.ai",
    referer: "https://overchat.ai/",
    "accept-language": "id-ID,id;q=0.9",
    priority: "u=1, i",
  };

  const response = await fetch(API, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();

    return {
      result: {
        question: prompt,
        error: text,
      },
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let answer = "";
  let responseId = null;
  let model = MODEL;

  while (true) {
    const { value, done } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line.startsWith("data:")) continue;

      const data = line.slice(5).trim();

      if (!data || data === "[DONE]") continue;

      try {
        const json = JSON.parse(data);

        if (typeof json.id === "string") {
          responseId = json.id;
        }

        if (typeof json.model === "string") {
          model = json.model;
        }

        const content =
          json?.choices?.[0]?.delta?.content ||
          json?.choices?.[0]?.message?.content ||
          "";

        if (typeof content === "string") {
          answer += content;
        }
      } catch {}
    }
  }

  answer = answer.trim();

  const assistantMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: answer,
  };

  session.messages.push(userMessage);
  session.messages.push(assistantMessage);

  if (session.messages.length > 20) {
    session.messages = session.messages.slice(-20);
  }

  await saveSession(session);

  return {
    result: {
      question: prompt,
     /* chatId: session.chatId,
      deviceId: session.deviceId,
      responseId,*/
      model,
      answer,
    },
  };
}

module.exports = {
  overchat,
};