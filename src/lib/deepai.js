const crypto = require("node:crypto");

const BASE_URL =
  "https://api.deepai.org";
const ORIGIN =
  "https://deepai.org";

const MODEL = "text2img";

function md5Like(input) {
  const a = [];

  for (
    let b = 0;
    b < 64;

  ) {
    a[b] =
      0 |
      (4294967296 *
        Math.sin(
          ++b % Math.PI
        ));
  }

  let d;
  let e;
  let f;

  let g = [
    (d = 1732584193),
    (e = 4023233417),
    ~d,
    ~e,
  ];

  const h = [];

  let l =
    unescape(
      encodeURI(input)
    ) + "\u0080";

  let k = l.length;

  let c =
    ((--k / 4 + 2) | 15);

  h[--c] = 8 * k;

  while (~k) {
    h[k >> 2] |=
      l.charCodeAt(k) <<
      (8 * k--);
  }

  for (
    let b = 0,
      l = 0;
    b < c;
    b += 16
  ) {
    for (
      k = g;
      l < 64;
      k = [
        (f = k[3]),

        d +
          (((f =
            k[0] +
            [
              (d & e) |
                (~d & f),

              (f & d) |
                (~f & e),

              d ^ e ^ f,

              e ^
                (d | ~f),
            ][(k = l >> 4)] +
            a[l] +
            ~~h[
              b |
                ([
                  l,
                  5 * l + 1,
                  3 * l + 5,
                  7 * l,
                ][k] &
                  15)
            ]) <<
            (k =
              [
                7,
                12,
                17,
                22,
                5,
                9,
                14,
                20,
                4,
                11,
                16,
                23,
                6,
                10,
                15,
                21,
              ][
                4 * k +
                  (l++ % 4)
              ])) |
            (f >>> -k)),

        d,
        e,
      ]
    ) {
      d = k[1] | 0;
      e = k[2];
    }

    for (
      l = 4;
      l;

    ) {
      g[--l] += k[l];
    }
  }

  let result = "";

  for (
    let l = 0;
    l < 32;

  ) {
    result += (
      (g[l >> 3] >>
        (4 *
          (1 ^ l++))) &
      15
    ).toString(16);
  }

  return result
    .split("")
    .reverse()
    .join("");
}

function generateIslandKey() {
  const userAgent =
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

  const randomNumber =
    Math.round(
      Math.random() *
        100000000000
    ).toString();

  const hash = md5Like(
    userAgent +
      md5Like(
        userAgent +
          md5Like(
            userAgent +
              randomNumber +
              "hackers_become_a_little_stinkier_every_time_they_hack"
          )
      )
  );

  return `tryit-${randomNumber}-${hash}`;
}

function createFormData(
  fields
) {
  const form =
    new FormData();

  for (const [
    key,
    value,
  ] of Object.entries(
    fields
  )) {
    form.append(
      key,
      value
    );
  }

  return form;
}

function baseHeaders(
  extra = {}
) {
  return {
    "user-agent":
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
    accept: "*/*",
    "accept-language":
      "id-ID,id;q=0.9",
    origin: ORIGIN,
    "sec-ch-ua-platform":
      `"Android"`,
    "sec-ch-ua":
      `"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"`,
    "sec-ch-ua-mobile":
      "?1",
    "sec-fetch-site":
      "same-site",
    "sec-fetch-mode":
      "cors",
    "sec-fetch-dest":
      "empty",
    priority: "u=1, i",
    ...extra,
  };
}

async function generateImage(
  prompt
) {
  const apiKey =
    generateIslandKey();

  const form =
    createFormData({
      text: prompt,
      width: "640",
      height: "640",
      image_generator_version:
        "hd",
      use_new_model:
        "false",
      use_old_model:
        "false",
      quality: "true",
      generation_source:
        "img",
    });

  const res = await fetch(
    `${BASE_URL}/api/text2img`,
    {
      method: "POST",

      headers: baseHeaders({
        "api-key":
          apiKey,
      }),

      body: form,
    }
  );

  const text =
    await res.text();

  let json = null;

  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return {
    result: {
      model: MODEL,
      prompt,
      id:
        json?.id || "",
      url:
        json?.output_url ||
        "",
      backendRequestId:
        json?.backend_request_id ||
        "",
      raw:
        json || text,
    },
  };
}

module.exports = {
  generateImage,
};