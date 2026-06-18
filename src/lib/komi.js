const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

class KomikStation {
    constructor() {
        this.baseUrl = "https://komikstation.org";
        this.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        };
    }

    async #request(url) {
        const { data } = await axios.get(url, { headers: this.headers });
        return cheerio.load(data);
    }

    async search(query) {
        try {
            const url = `${this.baseUrl}/?s=${encodeURIComponent(query)}`;
            const $ = await this.#request(url);
            const results = [];

            $(".postbody .listupd .bs").each((i, el) => {
                results.push({
                    title: $(el).find(".tt").text().trim() || $(el).find("a").attr("title"),
                    link: $(el).find("a").attr("href"),
                    thumbnail: $(el).find("img.ts-post-image").attr("data-src"),
                    chapter: $(el).find(".epxs").text().trim(),
                    rating: $(el).find(".numscore").text().trim(),
                    type: $(el).find(".type").attr("class")?.split(" ")[1] || null,
                    status: $(el).find(".status").text().trim() || "Ongoing"
                });
            });

            return { status: true, query, total: results.length, results };
        } catch (err) {
            return { status: false, message: err.message };
        }
    }

    async trending() {
        try {
            const $ = await this.#request(this.baseUrl);
            const results = [];

            $(".hothome .popconslide .bs").each((i, el) => {
                results.push({
                    title: $(el).find(".tt").text().trim() || $(el).find("a").attr("title"),
                    link: $(el).find("a").attr("href"),
                    thumbnail: $(el).find("img.ts-post-image").attr("data-src"),
                    chapter: $(el).find(".epxs").text().trim(),
                    rating: $(el).find(".numscore").text().trim(),
                    type: $(el).find(".type").attr("class")?.split(" ")[1] || null
                });
            });

            return { status: true, total: results.length, results };
        } catch (err) {
            return { status: false, message: err.message };
        }
    }

    async detail(url) {
        try {
            const $ = await this.#request(url);
            const genres = [];
            $(".mgen a").each((i, el) => genres.push($(el).text().trim()));

            const chapters = [];
            $("#chapterlist ul li").each((i, el) => {
                chapters.push({
                    number: $(el).attr("data-num"),
                    title: $(el).find(".chapternum").text().trim(),
                    date: $(el).find(".chapterdate").text().trim(),
                    readUrl: $(el).find("a").first().attr("href"),
                    downloadUrl: $(el).find(".dload").attr("href") || null
                });
            });

            return {
                status: true,
                detail: {
                    title: $(".entry-title").text().replace(/[^\w\s]/gi, "").trim(),
                    altTitles: $(".wd-full span").first().text().trim(),
                    thumbnail: $(".thumb img").attr("src"),
                    status: $(".imptdt i").first().text().trim(),
                    type: $(".imptdt a").first().text().trim(),
                    rating: $(".num").text().trim(),
                    followers: $(".bmc").text().replace(/\D/g, "").trim(),
                    synopsis: $(".entry-content p").text().trim(),
                    author: $(".fmed span").eq(0).text().trim(),
                    artist: $(".fmed span").eq(1).text().trim(),
                    genres,
                    lastRelease: $("time").attr("datetime"),
                    totalChapters: chapters.length,
                    firstChapter: chapters[chapters.length - 1] || null,
                    latestChapter: chapters[0] || null
                },
                chapters
            };
        } catch (err) {
            return { status: false, message: err.message };
        }
    }

    async read(chapterUrl) {
        try {
            const $ = await this.#request(chapterUrl);
            const images = [];

            $("#readerarea img, .reader-area img, .rdimage img").each((i, el) => {
                const src = $(el).attr("data-src")
                if (src?.startsWith("http")) images.push(src);
            });

            if (images.length === 0) {
                $("img").each((i, el) => {
                    const src = $(el).attr("src") || $(el).attr("data-src");
                    if (src && (src.includes("wp-content/uploads") || src.includes("cdn")) && !src.includes("flag")) {
                        images.push(src);
                    }
                });
            }

            return {
                status: true,
                chapter: {
                    title: $(".entry-title, .headpost h1, h1.entry-title").first().text().trim(),
                    url: chapterUrl,
                    totalImages: images.length,
                    prevChapter: $(".nextprev a[rel='prev']").attr("href") || null,
                    nextChapter: $(".nextprev a[rel='next']").attr("href") || null
                },
                images
            };
        } catch (err) {
            return { status: false, message: err.message };
        }
    }

    async #downloadImage(imgUrl, savePath) {
        const res = await axios.get(imgUrl, {
            responseType: "stream",
            headers: { ...this.headers, "Referer": this.baseUrl }
        });
        await new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(savePath);
            res.data.pipe(writer);
            writer.on("finish", resolve);
            writer.on("error", reject);
        });
    }

    async download(chapterUrl, outDir = "./downloads") {
        try {
            const readData = await this.read(chapterUrl);
            if (!readData.status) throw new Error(readData.message);

            const { images, chapter } = readData;
            if (images.length === 0) throw new Error("Tidak ada gambar ditemukan");

            const folderName = (chapter.title || "chapter").replace(/[\\/:*?"<>|]/g, "").trim() || "chapter";
            const saveDir = path.join(outDir, folderName);
            if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });

            const downloaded = [];
            const failed = [];

            for (let i = 0; i < images.length; i++) {
                const imgUrl = images[i];
                const ext = path.extname(new URL(imgUrl).pathname) || ".jpg";
                const filename = `${String(i + 1).padStart(3, "0")}${ext}`;
                const savePath = path.join(saveDir, filename);

                try {
                    await this.#downloadImage(imgUrl, savePath);
                    downloaded.push({ index: i + 1, filename, url: imgUrl });
                } catch (e) {
                    failed.push({ index: i + 1, url: imgUrl, reason: e.message });
                }
            }

            return {
                status: true,
                chapter: chapter.title,
                saveDir,
                total: images.length,
                downloaded: downloaded.length,
                failed: failed.length,
                failedList: failed
            };
        } catch (err) {
            return { status: false, message: err.message };
        }
    }

    async downloadDirect(klikcdnUrl, outDir = "./downloads", filename = null) {
        try {
            if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

            const res = await axios.get(klikcdnUrl, {
                maxRedirects: 10,
                responseType: "stream",
                headers: { ...this.headers, "Referer": this.baseUrl }
            });

            const disposition = res.headers["content-disposition"] || "";
            let fname = filename;

            if (!fname) {
                const match = disposition.match(/filename[^;=\n]*=["']?([^"'\n;]+)/i);
                if (match) {
                    fname = match[1].trim();
                } else {
                    const finalUrl = res.request.res.responseUrl || klikcdnUrl;
                    fname = path.basename(new URL(finalUrl).pathname) || "download.zip";
                }
            }

            const savePath = path.join(outDir, fname);
            const total = parseInt(res.headers["content-length"] || "0");
            let downloaded = 0;

            await new Promise((resolve, reject) => {
                const writer = fs.createWriteStream(savePath);
                res.data.on("data", (chunk) => { downloaded += chunk.length; });
                res.data.pipe(writer);
                writer.on("finish", resolve);
                writer.on("error", reject);
            });

            return {
                status: true,
                file: fname,
                savePath,
                sizeMB: (fs.statSync(savePath).size / 1024 / 1024).toFixed(2)
            };
        } catch (err) {
            return { status: false, message: err.message };
        }
    }

    async downloadAllDirect(mangaUrl, outDir = "./downloads", limit = null) {
        try {
            const detailData = await this.detail(mangaUrl);
            if (!detailData.status) throw new Error(detailData.message);

            const { detail, chapters } = detailData;
            const title = detail.title.replace(/[\\/:*?"<>|]/g, "").trim();
            const saveDir = path.join(outDir, title);

            let targets = chapters.filter(ch => ch.downloadUrl);
            if (limit) targets = targets.slice(0, limit);

            const results = [];

            for (const ch of targets) {
                const fname = `${ch.title.replace(/[\\/:*?"<>|]/g, "").trim()}.zip`;
                const result = await this.downloadDirect(ch.downloadUrl, saveDir, fname);
                results.push({ chapter: ch.title, ...result });
            }

            return {
                status: true,
                manga: title,
                saveDir,
                total: targets.length,
                success: results.filter(r => r.status).length,
                failed: results.filter(r => !r.status).length,
                results
            };
        } catch (err) {
            return { status: false, message: err.message };
        }
    }
}

module.exports = KomikStation;
