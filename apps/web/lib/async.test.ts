import { describe, expect, it } from "vitest";
import { withTimeout } from "./async";

describe("withTimeout", () => {
  it("期限内に解決すれば値を返す", async () => {
    await expect(withTimeout(Promise.resolve(42), 100)).resolves.toBe(42);
  });

  it("期限超過で reject する", async () => {
    await expect(withTimeout(new Promise(() => {}), 20)).rejects.toThrow();
  });

  it("元の reject を伝播する", async () => {
    await expect(
      withTimeout(Promise.reject(new Error("boom")), 100),
    ).rejects.toThrow("boom");
  });
});
