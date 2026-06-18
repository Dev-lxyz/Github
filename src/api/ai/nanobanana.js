module.exports = function (app) {
  const fs = require("fs");
  const path = require("path");
  const os = require("os");
  const crypto = require("crypto");

  const cookie = [
    '',
    '',
  ].join(';');

  const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

  async function init() {
    const res = await fetch(
      'https://gemini.google.com/app',
      {
        headers: {
          cookie,
          'user-agent': ua
        }
      }
    );

    const html = await res.text();

    const at =
      html.match(
        /"SNlM0e":"([^"]+)"/
      )?.[1];

    const fsid =
      html.match(
        /"FdrFJe":"(-?\d+)"/
      )?.[1];

    const bl =
      html.match(
        /"cfb2h":"([^"]+)"/
      )?.[1];

    if (!at || !fsid || !bl) {
      throw new Error(
        'failed get session'
      );
    }

    return {
      at,
      fsid,
      bl
    };
  }

  async function upload(filepath) {
    const filename =
      path.basename(filepath);

    const filebuf =
      fs.readFileSync(filepath);

    const filesize =
      filebuf.length;

    const mime =
      filepath.endsWith('.png')
        ? 'image/png'
        : 'image/jpeg';

    const startres = await fetch(
      'https://push.clients6.google.com/upload/',
      {
        method: 'POST',
        headers: {
          'push-id': 'feeds/mcudyrk2a4khkz',
          'x-tenant-id': 'bard-storage',
          'x-client-pctx': 'CgcSBWjK7pYx',
          'x-goog-upload-header-content-length': String(filesize),
          'x-goog-upload-protocol': 'resumable',
          'x-goog-upload-command': 'start',
          'content-type': 'application/x-www-form-urlencoded;charset=utf-8',
          cookie,
          'user-agent': ua
        },
        body: `File name: ${filename}`
      }
    );

    const uploadurl =
      startres.headers.get(
        'x-goog-upload-url'
      );

    if (!uploadurl) {
      throw new Error(
        'gagal dapat upload url'
      );
    }

    const finalres = await fetch(
      uploadurl,
      {
        method: 'POST',
        headers: {
          'push-id': 'feeds/mcudyrk2a4khkz',
          'x-tenant-id': 'bard-storage',
          'x-client-pctx': 'CgcSBWjK7pYx',
          'x-goog-upload-command': 'upload, finalize',
          'x-goog-upload-offset': '0',
          'content-type': mime,
          cookie,
          'user-agent': ua
        },
        body: filebuf
      }
    );

    const contribpath =
      await finalres.text();

    if (
      !contribpath.startsWith(
        '/contrib_service'
      )
    ) {
      throw new Error(
        'upload gagal: ' +
          contribpath
      );
    }

    return {
      contribpath:
        contribpath.trim(),
      filename,
      mime
    };
  }

  async function send(
    text,
    session,
    img = null
  ) {
    const {
      at,
      fsid,
      bl
    } = session;

    const reqid =
      Math.floor(
        Math.random() * 9000000
      ) + 100000;

    const uuid =
      crypto.randomUUID().toUpperCase();

    const imgdata = img
      ? [[[
          img.contribpath,
          1,
          null,
          img.mime
        ],
        img.filename,
        null,
        null,
        null,
        null,
        null,
        null,
        [0]]]
      : null;

    const msg = JSON.stringify([
      [
        text,
        0,
        null,
        imgdata,
        null,
        null,
        0
      ],
      ['id'],
      [
        '',
        '',
        '',
        null,
        null,
        null,
        null,
        null,
        null,
        ''
      ],
      '',
      '',
      null,
      [1],
      1,
      null,
      null,
      1,
      0,
      null,
      null,
      null,
      null,
      null,
      [[0]],
      0,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      1,
      null,
      null,
      [4],
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      [1],
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      0,
      null,
      null,
      null,
      null,
      null,
      uuid,
      null,
      [],
      null,
      null,
      null,
      null,
      null,
      null,
      2,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      5
    ]);

    const freq = JSON.stringify([
      null,
      msg
    ]);

    const body =
      new URLSearchParams();

    body.set('f.req', freq);
    body.set('at', at);

    const url = new URL(
      'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate'
    );

    url.searchParams.set(
      'bl',
      bl
    );

    url.searchParams.set(
      'f.sid',
      fsid
    );

    url.searchParams.set(
      'hl',
      'id'
    );

    url.searchParams.set(
      '_reqid',
      String(reqid)
    );

    url.searchParams.set(
      'rt',
      'c'
    );

    const res = await fetch(
      url.toString(),
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded;charset=utf-8',
          'user-agent': ua,
          cookie,
          'x-same-domain': '1',
          'x-goog-ext-73010989-jspb': '[0]',
          'x-goog-ext-73010990-jspb': '[0,0,0]',
          'x-goog-ext-525001261-jspb': `[1,null,null,null,"fbb127bbb056c959",null,null,0,[4],null,null,1,null,null,5,null,"${uuid}"]`
        },
        body: body.toString()
      }
    );

    return res.text();
  }

  function parse(raw) {
    const seen = new Set();
    const images = [];
    const thoughts = [];
    let text = '';

    for (const line of raw.split('\n')) {
      if (!line.startsWith('[[')) {
        continue;
      }

      try {
        const outer =
          JSON.parse(line);

        for (const item of outer) {
          if (
            item[0] !== 'wrb.fr' ||
            !item[2]
          ) {
            continue;
          }

          for (const [
            ,
            url
          ] of item[2].matchAll(
            /"(https:\/\/lh3\.googleusercontent\.com\/gg-dl\/[^"]+)"/g
          )) {
            if (!seen.has(url)) {
              seen.add(url);

              images.push({
                url
              });
            }
          }

          const inner =
            JSON.parse(item[2]);

          const t7 =
            inner?.[2]?.['7'];

          if (t7) {
            const tooltext =
              t7?.[1]?.[1]?.[2];

            if (
              typeof tooltext ===
                'string' &&
              !seen.has(tooltext)
            ) {
              seen.add(tooltext);

              thoughts.push(
                tooltext
              );
            }

            const finaltext =
              t7?.[5]?.[0];

            if (
              typeof finaltext ===
                'string' &&
              !seen.has(finaltext)
            ) {
              seen.add(finaltext);

              thoughts.push(
                finaltext
              );
            }
          }

          const candidates =
            inner?.[4]?.[0]?.[1]?.[0];

          if (!candidates) {
            continue;
          }

          for (const part of candidates) {
            const t =
              part?.[1]?.[0];

            if (
              typeof t === 'string'
            ) {
              text += t;
            }
          }
        }

      } catch {}
    }

    return {
      thinking: thoughts,
      result_url: images
    };
  }

  app.get("/ai/nanobanana", async (req, res) => {
      try {
        const {
          image,
          prompt
        } = req.query;

        if (!image) {
          return res.status(400).json({
            status: false,
            error:
              "Falta el parámetro ?image="
          });
        }

        if (!prompt) {
          return res.status(400).json({
            status: false,
            error:
              "Falta el parámetro ?prompt="
          });
        }

        const imgRes =
          await fetch(image);

        if (!imgRes.ok) {
          throw new Error(
            "Error al descargar imagen"
          );
        }

        const buffer =
          Buffer.from(
            await imgRes.arrayBuffer()
          );

        const ext =
          image.includes(".png")
            ? "png"
            : "jpg";

        const tempPath =
          path.join(
            os.tmpdir(),
            `${Date.now()}.${ext}`
          );

        fs.writeFileSync(
          tempPath,
          buffer
        );

        const session =
          await init();

        const img =
          await upload(tempPath);

        const raw = await send(
          prompt,
          session,
          img
        );

        const result =
          parse(raw);

        fs.unlinkSync(tempPath);

        res.json({
          status: true,
          result
        });

      } catch (err) {
        console.error(
          "[NANOBANANA]",
          err.message
        );

        res.status(500).json({
          status: false,
          error:
            err.message ||
            "Error al generar"
        });
      }
    }
  );
};