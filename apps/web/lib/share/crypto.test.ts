import { describe, expect, it } from "vitest";
import {
  decryptSharePayload,
  encryptSharePayload,
  fromBase64Url,
  openSharePayload,
  parseFragment,
  toBase64Url,
  type SharePayload,
} from "./crypto";

const PAYLOAD: SharePayload = {
  id: "abc123",
  title: "業務委託契約書",
  text: "第1条（目的）\n甲は乙に委託する。",
};

describe("Base64URL", () => {
  it("往復で元に戻る（パディング境界を含む）", () => {
    for (const len of [0, 1, 2, 3, 4, 15, 16, 17]) {
      const bytes = new Uint8Array(len).map((_, i) => (i * 37) % 256);
      expect(fromBase64Url(toBase64Url(bytes))).toEqual(bytes);
    }
  });

  it("不正な文字は同期的に例外を投げる", () => {
    expect(() => fromBase64Url("あ+/=")).toThrow();
  });
});

describe("共有リンクの暗号化・復号", () => {
  it("正常な発行→開封のラウンドトリップ", async () => {
    const { fragment, ciphertext } = await encryptSharePayload(PAYLOAD);
    expect(fragment.split(".")).toHaveLength(3);
    // フラグメントの3要素目がサーバー保存分の暗号文と一致（鍵・IVは含まれない）
    expect(fragment.split(".")[2]).toBe(ciphertext);
    const payload = await decryptSharePayload(fragment);
    expect(payload).toEqual(PAYLOAD);
  });

  it("暗号文に平文が含まれない", async () => {
    const { ciphertext } = await encryptSharePayload(PAYLOAD);
    expect(ciphertext).not.toContain("業務委託");
    expect(ciphertext).not.toContain("甲は乙");
  });

  it("openSharePayload: id不一致は bad_link として拒否される", async () => {
    const { fragment } = await encryptSharePayload(PAYLOAD);
    await expect(openSharePayload(fragment, "other-id")).rejects.toThrow(
      "bad_link",
    );
  });

  it("改ざんされたフラグメントは『同期例外ではなく』Promiseの拒否になる", async () => {
    const cases = [
      "",
      "#",
      "not-a-fragment",
      "a.b",
      "a.b.c.d",
      "!!!.###.$$$",
      "YWJj.YWJj.YWJj", // 鍵長・IV長が不正
    ];
    for (const bad of cases) {
      // 呼び出し自体が throw しないこと（try/catch でPromise拒否に変換されている）
      const p = openSharePayload(bad, "abc123");
      await expect(p).rejects.toBeInstanceOf(Error);
    }
  });

  it("暗号文の破損（ビット反転）は復号失敗として拒否される", async () => {
    const { fragment } = await encryptSharePayload(PAYLOAD);
    const [k, iv, ct] = fragment.split(".");
    const corrupted = `${k}.${iv}.${ct.slice(0, -2)}AA`;
    await expect(openSharePayload(corrupted, PAYLOAD.id)).rejects.toBeInstanceOf(
      Error,
    );
  });

  it("鍵が違えば復号できない", async () => {
    const a = await encryptSharePayload(PAYLOAD);
    const b = await encryptSharePayload(PAYLOAD);
    const [, ivA, ctA] = a.fragment.split(".");
    const [keyB] = b.fragment.split(".");
    await expect(
      openSharePayload(`${keyB}.${ivA}.${ctA}`, PAYLOAD.id),
    ).rejects.toBeInstanceOf(Error);
  });
});

describe("parseFragment", () => {
  it("正常形式を分解できる（#付き・#なし両対応）", async () => {
    const { fragment } = await encryptSharePayload(PAYLOAD);
    const withHash = parseFragment(`#${fragment}`);
    const withoutHash = parseFragment(fragment);
    expect(withHash.key).toEqual(withoutHash.key);
    expect(withHash.key).toHaveLength(16); // AES-128
    expect(withHash.iv).toHaveLength(12);
  });
});
