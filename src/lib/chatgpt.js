const { randomUUID } = require('crypto');

class ChatGPTClient {
  constructor(options = {}) {
    const {
      cookie,
      oaiDeviceId,
      sessionId,
      userAgent = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
      oaiLanguage = 'id-ID',
      oaiClientVersion = 'prod-741180aa2b79430e4f3840306c9dd2056745bbfc',
      oaiClientBuildNumber = '6911970',
      timezone = 'Asia/Jakarta',
      timezoneOffsetMin = -420,
    } = options;

    this.cookie = null;
    this.oaiDeviceId = oaiDeviceId || randomUUID();
    this.sessionId = sessionId || randomUUID();
    this.userAgent = userAgent;
    this.oaiLanguage = oaiLanguage;
    this.oaiClientVersion = oaiClientVersion;
    this.oaiClientBuildNumber = oaiClientBuildNumber;
    this.timezone = timezone;
    this.timezoneOffsetMin = timezoneOffsetMin;

    this.conversationId = null;
    this.parentMessageId = null;
    this.baseConversationUrl = 'https://chatgpt.com/backend-anon/f/conversation';
    this.baseSentinelUrl = 'https://chatgpt.com/backend-anon/sentinel/chat-requirements/prepare';
  }

  _buildHeaders(extra = {}) {
    const headers = {
      'authority': 'chatgpt.com',
      'accept': '*/*',
      'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'content-type': 'application/json',
      'cookie': this.cookie,
      'origin': 'https://chatgpt.com',
      'referer': 'https://chatgpt.com/',
      'sec-ch-ua': '"Chromium";v="137", "Not/A)Brand";v="24"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': this.userAgent,
      'oai-client-build-number': this.oaiClientBuildNumber,
      'oai-client-version': this.oaiClientVersion,
      'oai-device-id': this.oaiDeviceId,
      'oai-language': this.oaiLanguage,
      'oai-session-id': this.sessionId,
      ...extra,
    };
    return headers;
  }

  async prepareChatRequirements(p) {
    const headers = this._buildHeaders({
      'x-openai-target-path': '/backend-anon/sentinel/chat-requirements/prepare',
      'x-openai-target-route': '/backend-anon/sentinel/chat-requirements/prepare',
    });
    const res = await fetch(this.baseSentinelUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p }),
    });
    if (!res.ok) throw new Error(`Sentinel prepare failed: ${res.status}`);
    return res.json();
  }

  async sendMessage(prompt, opts = {}) {
    const {
      model = 'auto',
      newConversation = false,
      onChunk,
    } = opts;

    if (newConversation) {
      this.conversationId = null;
      this.parentMessageId = null;
    }

    const messageId = randomUUID();
    const now = Date.now() / 1000;
    const parentMessageId = this.parentMessageId || 'client-created-root';

    const body = {
      action: 'next',
      messages: [
        {
          id: messageId,
          author: { role: 'user' },
          create_time: now,
          content: {
            content_type: 'text',
            parts: [prompt],
          },
          metadata: {
            selected_github_repos: [],
            selected_all_github_repos: false,
            serialization_metadata: { custom_symbol_offsets: [] },
          },
        },
      ],
      parent_message_id: parentMessageId,
      model,
      client_prepare_state: 'sent',
      timezone_offset_min: this.timezoneOffsetMin,
      timezone: this.timezone,
      conversation_mode: { kind: 'primary_assistant' },
      enable_message_followups: true,
      system_hints: [],
      supports_buffering: true,
      supported_encodings: ['v1'],
      client_contextual_info: {
        is_dark_mode: false,
        time_since_loaded: 15,
        page_height: 1070,
        page_width: 553,
        pixel_ratio: 1.306249976158142,
        screen_height: 1225,
        screen_width: 552,
        app_name: 'chatgpt.com',
      },
      no_auth_ad_preferences: {
        personalization_enabled: true,
        history_enabled: true,
        bazaar_consent_set: false,
      },
      paragen_cot_summary_display_override: 'allow',
      force_parallel_switch: 'auto',
    };

    if (this.conversationId) {
      body.conversation_id = this.conversationId;
    }

    const headers = this._buildHeaders({
      'accept': 'text/event-stream',
      'x-openai-target-path': '/backend-api/f/conversation',
      'x-openai-target-route': '/backend-api/f/conversation',
      'x-oai-turn-trace-id': randomUUID(),
    });

    const res = await fetch(this.baseConversationUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`ChatGPT API error: ${res.status} ${res.statusText} - ${errText.slice(0, 200)}`);
    }

    const result = await this._parseSSE(res, onChunk);
    this.parentMessageId = result.assistantMessageId || messageId;
    if (result.conversationId) {
      this.conversationId = result.conversationId;
    }
    return result;
  }

  async _parseSSE(res, onChunk) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    let conversationId = null;
    let assistantMessageId = null;
    let currentEventType = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEventType = line.slice(7).trim();
          continue;
        }
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') return { text: fullText, conversationId, assistantMessageId };

          try {
            const obj = JSON.parse(dataStr);

            if (obj.type === 'resume_conversation_token') {
              conversationId = obj.conversation_id;
            }

            if (obj.type === 'delta' || currentEventType === 'delta') {
              if (obj.o === 'append' && obj.p === '/message/content/parts/0') {
                const chunk = obj.v;
                fullText += chunk;
                if (onChunk) onChunk(chunk);
              }
              if (obj.o === 'patch' && Array.isArray(obj.v)) {
                for (const patch of obj.v) {
                  if (patch.o === 'append' && patch.p === '/message/content/parts/0') {
                    const chunk = patch.v;
                    fullText += chunk;
                    if (onChunk) onChunk(chunk);
                  }
                }
              }
              if (obj.v?.message?.author?.role === 'assistant') {
                assistantMessageId = obj.v.message.id;
              }
            }

          } catch (_) {
          }
        }
      }
    }

    return { text: fullText, conversationId, assistantMessageId };
  }

  resetConversation() {
    this.conversationId = null;
    this.parentMessageId = null;
  }
}

module.exports = ChatGPTClient;