const axios = require('axios');
const qs = require('qs');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

/**
 * Gemini AI V2 - BatchExecute Method
 * Automated Cookie Handling & Firebase Persistence
 */

const FIREBASE_URL = 'https://puru-tools-default-rtdb.firebaseio.com/cookieGeminiV2.json';

async function syncFirebase(method = 'GET', data = null) {
    try {
        if (method === 'GET') {
            const res = await axios.get(FIREBASE_URL);
            return res.data?.cookies || null;
        } else {
            await axios.put(FIREBASE_URL, {
                cookies: data,
                last_updated: new Date().toISOString()
            });
        }
    } catch (err) {
        // Silent error for database sync
    }
}

async function chat(promptText) {
    const jar = new CookieJar();
    const client = wrapper(axios.create({ 
        jar, 
        withCredentials: true,
        maxRedirects: 10 
    }));

    // 1. Load existing cookies from Firebase
    const savedCookies = await syncFirebase('GET');
    if (savedCookies) {
        try {
            const parsed = JSON.parse(savedCookies);
            if (Array.isArray(parsed)) {
                parsed.forEach(cookieStr => {
                    jar.setCookieSync(cookieStr, 'https://gemini.google.com');
                });
            } else {
                jar.setCookieSync(savedCookies, 'https://gemini.google.com');
            }
        } catch (e) {
            jar.setCookieSync(savedCookies, 'https://gemini.google.com');
        }
    }

    // 2. Construct RPC Payload
    const contents = {
        contents: [
            {
                role: "user",
                parts: [{ text: promptText }]
            }
        ]
    };

    const rpcData = [
        null, 
        JSON.stringify(contents), 
        1, 
        "caea8d35955a"
    ];

    const fReq = [
        [
            [
                "q4uTj",
                JSON.stringify(rpcData),
                null,
                "generic"
            ]
        ]
    ];

    const payload = qs.stringify({
        'f.req': JSON.stringify(fReq),
        'at': '' 
    });

    try {
        // 3. Perform Request
        const response = await client.post('https://gemini.google.com/_/BardChatUi/data/batchexecute', payload, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'X-Same-Domain': '1',
                'Origin': 'https://gemini.google.com',
                'Referer': 'https://gemini.google.com/',
                'Accept': '*/*'
            }
        });

        // 4. Persistence: Capture and save new cookies (including HttpOnly/Redirect cookies)
        const cookiesToSave = JSON.stringify(
            jar.getCookiesSync('https://gemini.google.com').map(c => c.toString())
        );
        await syncFirebase('PUT', cookiesToSave);

        let rawData = response.data;
        if (typeof rawData !== 'string') rawData = JSON.stringify(rawData);
        
        // Clean Google anti-XSS prefix
        const cleanData = rawData.replace(/^\)\]\}'\s*/, '');
        
        const outerArray = JSON.parse(cleanData);
        const innerDataString = outerArray[0][2];
        const innerDataArray = JSON.parse(innerDataString);
        
        let reply = "";
        
        if (innerDataArray && innerDataArray[0]) {
            const resultObj = JSON.parse(innerDataArray[0]);
            if (resultObj && resultObj.candidates && resultObj.candidates[0]) {
                reply = resultObj.candidates[0].content.parts[0].text;
            }
        }

        // Fallback Regex
        if (!reply) {
            const fallbackMatch = innerDataString.match(/"text":"(.*?)"/);
            if (fallbackMatch) {
                reply = fallbackMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
            }
        }

        return reply || "Gagal mengekstrak respons dari AI.";

    } catch (err) {
        if (err.response && err.response.status === 400) {
            throw new Error(`Gemini Error 400: Payload rejected. Session might be invalid.`);
        }
        throw new Error(`Gagal menghubungi Gemini V2: ${err.message}`);
    }
}

module.exports = { chat };