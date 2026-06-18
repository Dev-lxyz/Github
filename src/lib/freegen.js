const axios = require("axios");
const WebSocket = require("ws");
const FormData = require("form-data");

const SIGNER_URL = "https://prompt-signer.freegen.app";
const GENERATOR_URL = "https://image-generator.freegen.app";
const WEBSOCKET_URL = "wss://websocket-bridge.freegen.app/ws";

const RATIO_ID = "1:1";
const browserHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
  "Content-Type": "application/json",
  Accept: "*/*",
  Origin: "https://freegen.app",
  Referer: "https://freegen.app/",
  "Accept-Language":
    "id-ID,id;q=0.9",
};

async function generateImageWithLink(
  promptText
) {
  try {
    const signerRes = await axios.post(
      SIGNER_URL,
      {
        prompt: promptText,
      },
      {
        timeout: 30000,
        headers: browserHeaders,
      }
    );

    const { ts, sig } =
      signerRes.data || {};

    if (!ts || !sig) {
      throw new Error("Signer gagal");
    }

    const genRes = await axios.post(
      GENERATOR_URL,
      {
        prompt: promptText,
        ts,
        sig,
        ratio_id: RATIO_ID,
      },
      {
        timeout: 30000,
        headers: browserHeaders,
      }
    );

    const jobId = genRes.data?.job_id;

    if (!jobId) {
      throw new Error(
        "job_id tidak ditemukan"
      );
    }

    const rawImageBase64 =
      await listenForResults(jobId);

    if (!rawImageBase64) {
      throw new Error(
        "Image data kosong"
      );
    }

    const resultLink =
      await uploadToUguu(
        rawImageBase64
      );

    return {
      result: {
        id: jobId,
        prompt: promptText,
        url: resultLink,
      },
    };
  } catch (error) {
    return {
      result: {
        prompt: promptText,
        url: "",
        error:
          getErrorMessage(error),
      },
    };
  }
}

function listenForResults(jobId) {
  return new Promise(
    (resolve, reject) => {
      let done = false;

      const ws = new WebSocket(
        WEBSOCKET_URL,
        {
          headers: {
            Origin:
              "https://freegen.app",

            "User-Agent":
              browserHeaders[
                "User-Agent"
              ],
          },
        }
      );

      const timeout = setTimeout(
        () => {
          if (done) return;

          done = true;

          try {
            ws.close();
          } catch {}

          reject(
            new Error("Timeout")
          );
        },
        120000
      );

      ws.on("open", () => {
        ws.send(
          JSON.stringify({
            type: "subscribe",
            job_id: jobId,
          })
        );
      });

      ws.on("message", (data) => {
        try {
          const msg = JSON.parse(
            data.toString()
          );

          if (
            msg.type === "result" &&
            msg.image_data
          ) {
            if (done) return;

            done = true;

            clearTimeout(timeout);

            try {
              ws.close();
            } catch {}

            resolve(msg.image_data);

            return;
          }

          if (msg.type === "error") {
            if (done) return;

            done = true;

            clearTimeout(timeout);

            try {
              ws.close();
            } catch {}

            reject(
              new Error(
                msg.message ||
                  "WebSocket error"
              )
            );
          }
        } catch (err) {
          if (done) return;

          done = true;

          clearTimeout(timeout);

          try {
            ws.close();
          } catch {}

          reject(err);
        }
      });

      ws.on("error", (err) => {
        if (done) return;

        done = true;

        clearTimeout(timeout);

        reject(err);
      });

      ws.on("close", () => {
        if (done) return;

        done = true;

        clearTimeout(timeout);

        reject(
          new Error(
            "WebSocket closed"
          )
        );
      });
    }
  );
}

async function uploadToUguu(
  base64String
) {
  const base64Data =
    base64String.includes("base64,")
      ? base64String.split(
          "base64,"
        )[1]
      : base64String;

  const buffer = Buffer.from(
    base64Data,
    "base64"
  );

  if (!buffer.length) {
    throw new Error(
      "Base64 tidak valid"
    );
  }

  const form = new FormData();

  form.append("files[]", buffer, {
    filename: `result-${Date.now()}.jpg`,
    contentType: "image/jpeg",
  });

  const res = await axios.post(
    "https://uguu.se/upload",
    form,
    {
      timeout: 60000,

      headers: {
        ...form.getHeaders(),

        "User-Agent":
          browserHeaders[
            "User-Agent"
          ],

        Accept:
          "application/json",
      },
    }
  );

  const data = res.data;

  if (typeof data === "string") {
    const text = data.trim();

    if (
      text.startsWith("https://")
    ) {
      return text;
    }

    try {
      const parsed =
        JSON.parse(text);

      const url =
        parsed?.files?.[0]?.url;

      if (url) {
        return String(url).replaceAll(
          "\\",
          ""
        );
      }
    } catch {}

    throw new Error(
      "Upload Uguu gagal: " +
        text
    );
  }

  const url =
    data?.files?.[0]?.url;

  if (!url) {
    throw new Error(
      "Upload Uguu gagal: " +
        JSON.stringify(data)
    );
  }

  return String(url).replaceAll(
    "\\",
    ""
  );
}

function getErrorMessage(error) {
  if (error.response?.data) {
    if (
      typeof error.response.data ===
      "string"
    ) {
      return error.response.data;
    }

    return JSON.stringify(
      error.response.data
    );
  }

  return (
    error.message ||
    "Unknown error"
  );
}

module.exports = {
  generateImageWithLink,
};