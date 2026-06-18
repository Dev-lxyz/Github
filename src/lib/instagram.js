/***
  @ Base: https://www.instagram.com/
  @ Author: Shannz (Updated)
  @ Note: Instagram video and image slide downloader with complete metadata, including slide support.
***/

const axios = require('axios');
const cheerio = require('cheerio');
const { XMLParser } = require('fast-xml-parser');

const instagram = {
    video: async (url) => {
        if (!url) return { status: false, error: 'URL tidak valid atau kosong.' };
    
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'cache-control': 'max-age=0',
                    'dpr': '2',
                    'viewport-width': '980',
                    'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
                    'sec-ch-ua-mobile': '?1',
                    'sec-ch-ua-platform': '"Android"',
                    'sec-ch-ua-platform-version': '"15.0.0"',
                    'sec-ch-ua-model': '"25028RN03A"',
                    'sec-ch-ua-full-version-list': '"Chromium";v="136.0.7103.125", "Google Chrome";v="136.0.7103.125", "Not.A/Brand";v="99.0.0.0"',
                    'sec-ch-prefers-color-scheme': 'light',
                    'dnt': '1',
                    'upgrade-insecure-requests': '1',
                    'sec-fetch-site': 'same-origin',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-user': '?1',
                    'sec-fetch-dest': 'document',
                    'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                    'priority': 'u=0, i'
                },
                timeout: 10000
            });
    
            const $ = cheerio.load(response.data);
            let scriptJson = null;
    
            $('script[type="application/json"]').each((_, el) => {
                const content = $(el).html();
                if (content && content.includes('xdt_api__v1__media__shortcode__web_info')) {
                    try {
                        scriptJson = JSON.parse(content);
                    } catch (parseError) {
                        console.error('JSON Parse Error:', parseError.message);
                    }
                }
            });
    
            if (!scriptJson) throw new Error('Data script tidak ditemukan (Mungkin IP Blocked atau bukan Reels).');
    
            const item = scriptJson.require?.[0]?.[3]?.[0]?.__bbox?.require?.[0]?.[3]?.[1]?.__bbox?.result?.data?.xdt_api__v1__media__shortcode__web_info?.items?.[0];
    
            if (!item) throw new Error('Struct item tidak ditemukan dalam JSON.');
    
            const dashXml = item.video_dash_manifest;
            if (!dashXml) throw new Error('Manifest XML tidak ditemukan.');
    
            const parser = new XMLParser({ ignoreAttributes: false });
            let manifest;
            try {
                manifest = parser.parse(dashXml);
            } catch (xmlError) {
                throw new Error(`Gagal parsing DASH manifest: ${xmlError.message}`);
            }
    
            const period = manifest.MPD?.Period;
            if (!period) throw new Error('Tag Period tidak ditemukan di XML.');
    
            const adaptationSets = Array.isArray(period.AdaptationSet) ? period.AdaptationSet : [period.AdaptationSet];
            let videoTracks = [];
            let audioTracks = [];
    
            adaptationSets.forEach((set) => {
                if (!set) return;
    
                const isVideo = set['@_contentType'] === 'video';
                const isAudio = set['@_contentType'] === 'audio';
                const representations = Array.isArray(set.Representation) ? set.Representation : [set.Representation];
    
                representations.forEach((rep) => {
                    if (!rep) return;
    
                    const track = {
                        url: rep.BaseURL,
                        bandwidth: parseInt(rep['@_bandwidth']) || 0,
                        codecs: rep['@_codecs'] || '',
                        mimeType: rep['@_mimeType'] || '',
                    };
    
                    if (isVideo) {
                        videoTracks.push({
                            ...track,
                            resolution: `${rep['@_width']}x${rep['@_height']}`,
                            qualityLabel: rep['@_FBQualityLabel'] || ''
                        });
                    } else if (isAudio) {
                        audioTracks.push(track);
                    }
                });
            });
    
            videoTracks.sort((a, b) => b.bandwidth - a.bandwidth);
    
            const finalResult = {
                metadata: {
                    id: item.id,
                    code: item.code,
                    caption: item.caption?.text || '',
                    createTime: new Date(item.taken_at * 1000).toLocaleString(),
                },
                author: {
                    id: item.user?.pk,
                    username: item.user?.username || 'N/A',
                    fullName: item.user?.full_name || '',
                    profilePic: item.user?.hd_profile_pic_url_info?.url || '',
                    verified: item.user?.is_verified
                },
                media: {
                    thumbnails: (item.image_versions2?.candidates || []).map(img => ({
                        url: img.url,
                        resolution: `${img.width}x${img.height}`
                    })),
                    videos: videoTracks,
                    audios: audioTracks
                }
            };
    
            return {
                status: true,
                result: finalResult
            };
    
        } catch (error) {
            return { status: false, error: error.message };
        }
    },

    slide: async (url) => {
        if (!url) return { status: false, error: 'URL tidak valid atau kosong.' };
    
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'cache-control': 'max-age=0',
                    'dpr': '2',
                    'viewport-width': '980',
                    'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
                    'sec-ch-ua-mobile': '?1',
                    'sec-ch-ua-platform': '"Android"',
                    'sec-ch-ua-platform-version': '"15.0.0"',
                    'sec-ch-ua-model': '"25028RN03A"',
                    'sec-ch-ua-full-version-list': '"Chromium";v="136.0.7103.125", "Google Chrome";v="136.0.7103.125", "Not.A/Brand";v="99.0.0.0"',
                    'sec-ch-prefers-color-scheme': 'light',
                    'dnt': '1',
                    'upgrade-insecure-requests': '1',
                    'sec-fetch-site': 'same-origin',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-user': '?1',
                    'sec-fetch-dest': 'document',
                    'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                    'priority': 'u=0, i'
                },
                timeout: 10000
            });
    
            const $ = cheerio.load(response.data);
            let scriptJson = null;
    
            $('script[type="application/json"]').each((_, el) => {
                const content = $(el).html();
                if (content && content.includes('xdt_api__v1__media__shortcode__web_info')) {
                    try {
                        scriptJson = JSON.parse(content);
                    } catch (parseError) {
                        console.error('JSON Parse Error:', parseError.message);
                    }
                }
            });
    
            if (!scriptJson) throw new Error('Data script tidak ditemukan (Mungkin IP Blocked atau URL salah).');
    
            const item = scriptJson.require?.[0]?.[3]?.[0]?.__bbox?.require?.[0]?.[3]?.[1]?.__bbox?.result?.data?.xdt_api__v1__media__shortcode__web_info?.items?.[0];
    
            if (!item) throw new Error('Struct item tidak ditemukan dalam JSON.');
    
            let slides = [];

            if (item.carousel_media && item.carousel_media.length > 0) {
                slides = item.carousel_media.map((slideItem, index) => {
                    return {
                        slide_id: slideItem.id,
                        index: index + 1,
                        images: (slideItem.image_versions2?.candidates || []).map(img => ({
                            url: img.url,
                            resolution: `${img.width}x${img.height}`
                        })),
                        videos: slideItem.video_versions ? slideItem.video_versions.map(v => ({
                            url: v.url,
                            resolution: `${v.width}x${v.height}`,
                            type: v.type || 'video/mp4'
                        })) : []
                    };
                });
            } else if (item.image_versions2) {
                slides.push({
                    slide_id: item.id,
                    index: 1,
                    images: (item.image_versions2?.candidates || []).map(img => ({
                        url: img.url,
                        resolution: `${img.width}x${img.height}`
                    })),
                    videos: []
                });
            } else {
                throw new Error('Tidak ada media gambar/slide yang ditemukan pada post ini.');
            }
    
            const finalResult = {
                metadata: {
                    id: item.id,
                    code: item.code,
                    caption: item.caption?.text || '',
                    createTime: new Date(item.taken_at * 1000).toLocaleString(),
                },
                author: {
                    id: item.user?.pk,
                    username: item.user?.username || 'N/A',
                    fullName: item.user?.full_name || '',
                    profilePic: item.user?.hd_profile_pic_url_info?.url || '',
                    verified: item.user?.is_verified
                },
                media: {
                    total_slides: slides.length,
                    slides: slides
                }
            };
    
            return {
                status: true,
                result: finalResult
            };
    
        } catch (error) {
            return { status: false, error: error.message };
        }
    }
};

module.exports = { instagram };