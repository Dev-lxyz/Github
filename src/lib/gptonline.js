const axios = require("axios");
const FormData = require("form-data");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const cheerio = require("cheerio");
const { CookieJar } = require("tough-cookie");
const {
  wrapper,
} = require(
  "axios-cookiejar-support"
);

const BASE_URL = "https://gptonline.ai";
const PAGE_URL = `${BASE_URL}/id/chat-online/`;
const AJAX_URL = `${BASE_URL}/id/wp-admin/admin-ajax.php`;
const SESSION_FILE = "./gptonline-session.json";
const UA =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";
const jar = new CookieJar();
const client = wrapper(
  axios.create({
    jar,
    withCredentials: true,
    timeout: 60000,
    validateStatus: () => true,
    headers: {
      "user-agent": UA,
      "accept-language":
        "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  })
);

async function loadSession() {
  try {
    const raw = await fs.readFile(
      SESSION_FILE,
      "utf8"
    );

    return JSON.parse(raw);
  } catch {
    return {
      userId:
        crypto.randomUUID(),
      messages: [],
    };
  }
}

async function saveSession(
  session
) {
  await fs.writeFile(
    SESSION_FILE,
    JSON.stringify(
      session,
      null,
      2
    ),
    "utf8"
  );
}

function extractNonceCandidates(
  text
) {
  const source = String(text || "");

  const candidates = [];

  const patterns = [
    /["']nonce["']\s*[:=]\s*["']([a-zA-Z0-9_-]{8,})["']/gi,
    /nonce\s*[:=]\s*["']([a-zA-Z0-9_-]{8,})["']/gi,
    /name=["']nonce["'][^>]*value=["']([a-zA-Z0-9_-]{8,})["']/gi,
    /value=["']([a-zA-Z0-9_-]{8,})["'][^>]*name=["']nonce["']/gi,
    /data-nonce=["']([a-zA-Z0-9_-]{8,})["']/gi,
    /gpt_embed_get_message[^"'<>]{0,500}["']([a-zA-Z0-9_-]{8,})["']/gi,
  ];

  for (const pattern of patterns) {
    let match;

    while (
      (match = pattern.exec(
        source
      )) !== null
    ) {
      if (match[1]) {
        candidates.push(match[1]);
      }
    }
  }

  return [...new Set(candidates)];
}

function cleanAnswer(text) {
  return String(text || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<pre[^>]*>/gi, "")
    .replace(/<\/pre>/gi, "")
    .replace(/<code[^>]*>/gi, "")
    .replace(/<\/code>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toSessionPrompt(
  prompt,
  messages = []
) {
  const recent =
    messages.slice(-10);

  if (!recent.length)
    return prompt;

  const historyText = recent
    .map((msg) => {
      if (msg.role === "user") {
        return `User: ${msg.content}`;
      }

      if (
        msg.role ===
        "assistant"
      ) {
        return `Assistant: ${msg.content}`;
      }

      return `${msg.role}: ${msg.content}`;
    })
    .join("\n");

  return [
    "Use the following conversation history as context.",

    "Reply naturally to the latest user message and do not mention the history.",

    "",

    historyText,

    "",

    `User: ${prompt}`,
  ].join("\n");
}

async function getNonce() {
  const res = await client.get(
    PAGE_URL,
    {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

        referer: BASE_URL,
      },
    }
  );

  const html = String(
    res.data || ""
  );

  const $ = cheerio.load(html);

  const candidates = [];

  $(
    '[name="nonce"], [id*="nonce"], [data-nonce]'
  ).each((_, el) => {
    const value =
      $(el).attr("value") ||
      $(el).attr("content") ||
      $(el).attr(
        "data-nonce"
      ) ||
      $(el).text();

    if (value) {
      candidates.push(
        value.trim()
      );
    }
  });

  candidates.push(
    ...extractNonceCandidates(
      html
    )
  );

  const inlineScripts = $(
    "script"
  )
    .map((_, el) =>
      $(el).html()
    )
    .get()
    .filter(Boolean);

  for (const script of inlineScripts) {
    candidates.push(
      ...extractNonceCandidates(
        script
      )
    );
  }

  const scriptUrls = $(
    "script[src]"
  )
    .map((_, el) =>
      $(el).attr("src")
    )
    .get()
    .filter(Boolean)
    .map((src) => {
      if (
        src.startsWith("//")
      ) {
        return `https:${src}`;
      }

      if (
        src.startsWith("/")
      ) {
        return `${BASE_URL}${src}`;
      }

      if (
        src.startsWith("http")
      ) {
        return src;
      }

      return new URL(
        src,
        PAGE_URL
      ).toString();
    });

  for (const scriptUrl of scriptUrls) {
    try {
      const jsRes =
        await client.get(
          scriptUrl,
          {
            headers: {
              accept: "*/*",

              referer:
                PAGE_URL,
            },
          }
        );

      candidates.push(
        ...extractNonceCandidates(
          jsRes.data
        )
      );
    } catch {}
  }

  const cleanCandidates = [
    ...new Set(candidates),
  ]
    .map((x) =>
      String(x || "").trim()
    )
    .filter((x) =>
      /^[a-zA-Z0-9_-]{8,80}$/.test(
        x
      )
    );

  if (!cleanCandidates.length) {
    throw new Error(
      "Nonce not found automatically"
    );
  }

  return cleanCandidates[0];
}

async function sendMessage(
  question,
  userId
) {
  const form = new FormData();

  form.append("msg", question);

  form.append(
    "user_id",
    userId
  );

  form.append(
    "action",
    "gpt_embed_send_message"
  );

  const res = await client.post(
    AJAX_URL,
    form,
    {
      headers: {
        ...form.getHeaders(),
        accept: "*/*",
        origin: BASE_URL,
        referer: PAGE_URL,
        "sec-fetch-site":
          "same-origin",
        "sec-fetch-mode":
          "cors",
        "sec-fetch-dest":
          "empty",
      },
    }
  );

  if (
    res.status !== 200 ||
    !res.data?.id
  ) {
    throw new Error(
      `Failed send_message | HTTP ${res.status} | ${JSON.stringify(
        res.data
      )}`
    );
  }

  return res.data.id;
}

async function getMessage(
  chatHistoryId,
  userId,
  nonce
) {
  const form = new FormData();

  form.append(
    "chat_history_id",
    String(chatHistoryId)
  );

  form.append(
    "user_id",
    userId
  );

  form.append(
    "action",
    "gpt_embed_get_message"
  );

  form.append("nonce", nonce);

  const res = await client.post(
    AJAX_URL,
    form,
    {
      headers: {
        ...form.getHeaders(),
        accept: "*/*",
        origin: BASE_URL,
        referer: PAGE_URL,
        "sec-fetch-site":
          "same-origin",
        "sec-fetch-mode":
          "cors",
        "sec-fetch-dest":
          "empty",
      },
    }
  );

  if (
    res.status !== 200 ||
    !res.data?.message
  ) {
    throw new Error(
      `Failed get_message | HTTP ${res.status} | ${JSON.stringify(
        res.data
      )}`
    );
  }

  return res.data.message;
}

async function GPTOnline(
  prompt
) {
  const session =
    await loadSession();

  const nonce =
    await getNonce();

  const finalPrompt =
    toSessionPrompt(
      prompt,
      session.messages
    );

  const chatHistoryId =
    await sendMessage(
      finalPrompt,
      session.userId
    );

  const answer =
    cleanAnswer(
      await getMessage(
        chatHistoryId,
        session.userId,
        nonce
      )
    );

  session.messages.push({
    id: crypto.randomUUID(),
    role: "user",
    content: prompt,
  });

  session.messages.push({
    id: crypto.randomUUID(),
    role: "assistant",
    content: answer,
  });

  if (
    session.messages.length >
    20
  ) {
    session.messages =
      session.messages.slice(
        -20
      );
  }

  await saveSession(session);

  return {
    result: {
      id: chatHistoryId,
      question: prompt,
      response: answer,
    },
  };
}

module.exports = {
  GPTOnline,
};