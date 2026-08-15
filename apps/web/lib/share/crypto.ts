/**
 * 共有リンクの端末内暗号化（Web Crypto API / AES-GCM 128bit）。
 *
 * リンク形式: <URL>#<鍵>.<IV>.<暗号文>（各 Base64URL）
 * 鍵・IV・暗号文は URLフラグメント（#以降）に置く。フラグメントはサーバーに
 * 送信されない領域であり、これが「サーバーは中身を復号できない」という主張の
 * 技術的根拠になる。サーバー側には id と暗号文だけを保存してよいが、
 * 鍵はいかなる形でもサーバーに送らない・保存しない。
 *
 * ★注意: 復号系の関数は不正なBase64・破損した鍵長などで「同期的に」例外を
 * 投げる経路を持つ。呼び出し側は openSharePayload のように try/catch で
 * Promise の拒否へ変換すること（そうしないと改ざんリンクで例外がページに漏れる）。
 */

/** 共有リンクで暗号化されるペイロード（端末内でのみ平文になる） */
export interface SharePayload {
  /** 改ざん・取り違え検知用。開封時にURLの id と一致確認する */
  id: string;
  title: string;
  text: string;
}

const ALG = "AES-GCM";
const KEY_BITS = 128;
const IV_BYTES = 12;

export function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 不正な文字・不正な長さは例外を投げる（呼び出し側で捕捉すること） */
export function fromBase64Url(s: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) {
    throw new Error("invalid_base64url");
  }
  if (s.length === 0) return new Uint8Array(0);
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export interface EncryptedShare {
  /** URLフラグメントに載せる文字列: <鍵>.<IV>.<暗号文> */
  fragment: string;
  /** サーバー（モックDB）に保存してよい暗号文（Base64URL） */
  ciphertext: string;
}

/** 発行時: 鍵・IVをランダム生成し、ペイロードを暗号化してフラグメントを作る */
export async function encryptSharePayload(
  payload: SharePayload,
): Promise<EncryptedShare> {
  const key = await crypto.subtle.generateKey(
    { name: ALG, length: KEY_BITS },
    true,
    ["encrypt", "decrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plain = new TextEncoder().encode(JSON.stringify(payload));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: ALG, iv }, key, plain),
  );
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  const ciphertext = toBase64Url(cipher);
  const fragment = `${toBase64Url(rawKey)}.${toBase64Url(iv)}.${ciphertext}`;
  return { fragment, ciphertext };
}

/**
 * フラグメントを分解する。形式不正は同期的に例外を投げる。
 * （エラーメッセージに本文・フラグメント内容は含めない）
 */
export function parseFragment(fragment: string): {
  key: Uint8Array;
  iv: Uint8Array;
  cipher: Uint8Array;
} {
  const raw = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  const parts = raw.split(".");
  if (parts.length !== 3) throw new Error("invalid_fragment");
  const key = fromBase64Url(parts[0]);
  const iv = fromBase64Url(parts[1]);
  const cipher = fromBase64Url(parts[2]);
  if (key.length !== KEY_BITS / 8 || iv.length !== IV_BYTES) {
    throw new Error("invalid_fragment");
  }
  return { key, iv, cipher };
}

/** 開封時: フラグメントから鍵・IV・暗号文を取り出して復号する */
export async function decryptSharePayload(
  fragment: string,
): Promise<SharePayload> {
  const { key, iv, cipher } = parseFragment(fragment);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as unknown as BufferSource,
    { name: ALG },
    false,
    ["decrypt"],
  );
  const plain = await crypto.subtle.decrypt(
    { name: ALG, iv: iv as unknown as BufferSource },
    cryptoKey,
    cipher as unknown as BufferSource,
  );
  const parsed = JSON.parse(new TextDecoder().decode(plain)) as SharePayload;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof parsed.id !== "string" ||
    typeof parsed.text !== "string"
  ) {
    throw new Error("bad_link");
  }
  return parsed;
}

/**
 * 開封の入口。復号処理は同期例外の経路（不正Base64・鍵長不正・JSON破損）を
 * 必ず持つため、try/catch で Promise の拒否に変換する。
 * 呼び出し側は .catch()（または await + try/catch）だけで全エラーを扱える。
 */
export function openSharePayload(
  fragment: string,
  expectedId: string,
): Promise<SharePayload> {
  try {
    return decryptSharePayload(fragment).then((payload) => {
      if (payload.id !== expectedId) throw new Error("bad_link");
      return payload;
    });
  } catch (e) {
    return Promise.reject(e);
  }
}
