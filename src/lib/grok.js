const axios = require('axios');
const { URLSearchParams } = require('url');

/**
 * KONFIGURASI DAN HELPER
 */
const CONFIG = {
    baseUrl: 'https://data.toolbaz.com',
    origin: 'https://toolbaz.com',
    referer: 'https://toolbaz.com/',
    userAgent: 'Mozilla/5.0 (Linux; Android 10; RMX2185 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.7444.171 Mobile Safari/537.36',
    model: 'toolbaz-v4.5-fast'
};

// Generator Random String
const gRS = (length) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Instance Axios
const client = axios.create({
    baseURL: CONFIG.baseUrl,
    headers: {
        'Host': 'data.toolbaz.com',
        'User-Agent': CONFIG.userAgent,
        'Accept': '*/*',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Origin': CONFIG.origin,
        'Referer': CONFIG.referer,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
    }
});

/**
 * FUNGSI GENERATE PAYLOAD
 */
function generateClientToken() {
    const bR6wF = {
        "nV5kP": CONFIG.userAgent,
        "lQ9jX": "id-ID",           
        "sD2zR": "360x800",         
        "tY4hL": "Asia/Jakarta",    
        "pL8mC": "Linux armv8l",    
        "cQ3vD": 24,                
        "hK7jN": 8                  
    };

    const uT4bX = {
        "mM9wZ": [], 
        "kP8jY": []  
    };

    const payloadObj = {
        "bR6wF": bR6wF,
        "uT4bX": uT4bX,
        "tuTcS": Math.floor(Date.now() / 1000), 
        "tDfxy": "null",                        
        "RtyJt": gRS(36)                        
    };

    const jsonStr = JSON.stringify(payloadObj);
    const base64Str = Buffer.from(jsonStr, 'utf-8').toString('base64');
    const prefix = gRS(6); 

    return prefix + base64Str;
}

/**
 * FUNGSI UTAMA CHAT
 */
async function chatGrok(message) {
    try {
        const sessionId = gRS(40); 
        const clientToken = generateClientToken();

        // Step 1: Request Token
        const tokenParams = new URLSearchParams();
        tokenParams.append('session_id', sessionId);
        tokenParams.append('token', clientToken);

        const tokenResponse = await client.post('/token.php', tokenParams);

        if (!tokenResponse.data || !tokenResponse.data.success) {
            throw new Error(`Gagal mendapatkan token: ${JSON.stringify(tokenResponse.data)}`);
        }

        const serverCapcha = tokenResponse.data.token;

        // Step 2: Kirim Pesan
        const chatParams = new URLSearchParams();
        chatParams.append('text', message);
        chatParams.append('capcha', serverCapcha);
        chatParams.append('model', CONFIG.model);
        chatParams.append('session_id', sessionId);

        const chatResponse = await client.post('/writing.php', chatParams);

        let cleanText = chatResponse.data;
        if (typeof cleanText === 'string') {
            cleanText = cleanText.replace(/\[model:\s*[^\]]+\]/g, '').trim(); 
        }

        return cleanText;

    } catch (error) {
        if (error.response) {
            throw new Error(`Grok API Error: ${error.response.status}`);
        }
        throw new Error(error.message);
    }
}

module.exports = { chatGrok };