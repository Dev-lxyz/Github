const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');
const crypto = require('crypto');

class AppleMusicDownloader {
    constructor() {
        this.baseUrl = 'https://aaplmusicdownloader.com';
        this.cookies = {};
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];
        this.currentUserAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
        this.headers = {
            'User-Agent': this.currentUserAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Origin': this.baseUrl,
            'Referer': `${this.baseUrl}/`,
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Linux"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    generatePHPSESSID() {
        return crypto.randomBytes(16).toString('hex');
    }

    setCookie(name, value, expiryHours = 24) {
        this.cookies[name] = {
            value: value,
            expiry: Date.now() + (expiryHours * 60 * 60 * 1000)
        };
    }

    getCookieString() {
        const validCookies = [];
        const now = Date.now();
        
        for (const [name, data] of Object.entries(this.cookies)) {
            if (data.expiry > now) {
                validCookies.push(`${name}=${data.value}`);
            }
        }
        
        return validCookies.join('; ');
    }

    async initSession() {
        const phpsessid = this.generatePHPSESSID();
        this.setCookie('PHPSESSID', phpsessid, 24);
        this.setCookie('_ga', `GA1.1.${parseInt(Math.random() * 1000000000)}.${Math.floor(Date.now() / 1000)}`, 720);
        return true;
    }

    async generateAuthCookie() {
        const timestamp = Math.floor(Date.now() / 1000);
        const randomStr = crypto.randomBytes(32).toString('hex');
        const authHash = crypto.createHash('sha256')
            .update(`${timestamp}${randomStr}${Math.random()}`)
            .digest('hex');
        
        const authValue = `${authHash}|${timestamp}|127.0.0.1|${crypto.randomBytes(32).toString('hex')}`;
        this.setCookie('auth_cookie', authValue, 1);
        return authValue;
    }

    async getInitialPage() {
        await this.sleep(2000);
        
        const response = await axios.get(this.baseUrl, {
            headers: {
                ...this.headers,
                'Cookie': this.getCookieString()
            }
        });
        
        const setCookies = response.headers['set-cookie'];
        if (setCookies) {
            setCookies.forEach(cookie => {
                const match = cookie.match(/([^=]+)=([^;]+)/);
                if (match) {
                    this.setCookie(match[1], match[2], 24);
                }
            });
        }
        
        return response.data;
    }

    async searchSong(appleMusicUrl) {
        await this.sleep(3000);
        
        const form = new FormData();
        
        const urlMatch = appleMusicUrl.match(/\/song\/([^\/]+)\/(\d+)/);
        
        const requestData = [
            decodeURIComponent(urlMatch[1].replace(/-/g, ' ')),
            '',
            '',
            '',
            null,
            appleMusicUrl
        ];
        
        form.append('data', JSON.stringify(requestData));
        
        const response = await axios.post(`${this.baseUrl}/song.php`, form, {
            headers: {
                ...this.headers,
                'Cookie': this.getCookieString(),
                ...form.getHeaders()
            },
            maxRedirects: 0,
            validateStatus: (status) => status === 200
        });
        
        const setCookies = response.headers['set-cookie'];
        if (setCookies) {
            setCookies.forEach(cookie => {
                const match = cookie.match(/([^=]+)=([^;]+)/);
                if (match && match[1] !== 'zip') {
                    this.setCookie(match[1], match[2], 1);
                }
            });
        }
        
        return response.data;
    }

    async generateDownloadLink(trackName, artist, appleMusicUrl, quality = '256') {
        await this.sleep(2000);
        
        this.setCookie('quality', quality, 0.25);
        
        const formData = new FormData();
        formData.append('song_name', trackName);
        formData.append('artist_name', artist);
        formData.append('url', appleMusicUrl);
        formData.append('token', 'none');
        formData.append('zip_download', 'false');
        formData.append('quality', quality);
        
        const response = await axios.post(`${this.baseUrl}/api/composer/swd.php`, formData, {
            headers: {
                ...this.headers,
                'Cookie': this.getCookieString(),
                'X-Requested-With': 'XMLHttpRequest',
                ...formData.getHeaders()
            }
        });
        
        return response.data;
    }

    async getFinalDownloadUrl(downloadUrl) {
        await this.sleep(1000);
        
        const response = await axios.get(`${this.baseUrl}/api/composer/ffmpeg/redirect.php`, {
            params: { url: downloadUrl },
            headers: {
                ...this.headers,
                'Cookie': this.getCookieString()
            },
            maxRedirects: 0,
            validateStatus: (status) => status === 302 || status === 200
        });
        
        if (response.status === 302 && response.headers.location) {
            return response.headers.location;
        }
        
        return downloadUrl;
    }

    async getSong(appleMusicUrl, quality = '256') {
        await this.initSession();
        await this.generateAuthCookie();
        await this.getInitialPage();
        
        const html = await this.searchSong(appleMusicUrl);
        const $ = cheerio.load(html);
        
        const title = $('h2').first().text().trim().replace(/[^\w\s]/g, '').trim();
        const artistText = $('.media-info p').first().text().trim();
        const artist = artistText.split('|')[0].replace(/[^\w\s]/g, '').trim();
        
        const album = $('td:contains("Album:")').next('td').text().trim();
        const duration = $('td:contains("Duration:")').next('td').text().trim();
        const thumbnail = $('.image.is-square img').attr('src');
        
        const trackName = title;
        const artistName = artist;
        
        const downloadResult = await this.generateDownloadLink(trackName, artistName, appleMusicUrl, quality);
        
        let downloadUrl = null;
        if (downloadResult.status === 'success' && downloadResult.dlink) {
            downloadUrl = await this.getFinalDownloadUrl(downloadResult.dlink);
        }
        
        const allQualities = {};
        const qualities = ['64', '128', '192', '256', '320', 'm4a'];
        
        for (const q of qualities) {
            if (q !== quality) {
                const result = await this.generateDownloadLink(trackName, artistName, appleMusicUrl, q);
                if (result.status === 'success' && result.dlink) {
                    const url = await this.getFinalDownloadUrl(result.dlink);
                    allQualities[q] = url;
                } else {
                    allQualities[q] = null;
                }
                await this.sleep(1500);
            } else {
                allQualities[q] = downloadUrl;
            }
        }
        const ogImage = $('meta[property="og:image"]').attr('content');
        
        //const flashingText = $('.flashing-text').text().trim();
        
        const result = {
            title: title,
            artist: artist,
            album: album,
            duration: duration,
            thumbnail: thumbnail || ogImage,
            appleMusicUrl: appleMusicUrl,
            downloadUrl: downloadUrl,
            selectedQuality: quality,
            allQualities: allQualities
        };
        
        return result;
    }
}

(async () => {
    const scraper = new AppleMusicDownloader();
    const appleMusicUrl = 'https://music.apple.com/us/song/be-with-you/1885607727';
    const result = await scraper.getSong(appleMusicUrl, '128');
    console.log(JSON.stringify(result, null, 2));
})();
