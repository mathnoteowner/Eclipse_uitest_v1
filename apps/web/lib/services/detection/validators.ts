/** 検査数字などの検証関数群（誤検知抑制の要） */

export function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/** クレジットカード番号（Luhnアルゴリズム） */
export function luhnValid(numStr: string): boolean {
  const digits = digitsOnly(numStr);
  if (digits.length < 13 || digits.length > 16) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/**
 * マイナンバー（12桁）。末尾1桁が検査数字。
 * q_n = n<=6 ? n+1 : n-5（nは検査数字を除く11桁の右からの位置）
 * 検査数字 = (Σ p_n×q_n mod 11) が1以下なら0、それ以外は 11 - 余り
 */
export function myNumberValid(numStr: string): boolean {
  const d = digitsOnly(numStr);
  if (d.length !== 12) return false;
  const body = d.slice(0, 11);
  const check = Number(d[11]);
  let sum = 0;
  for (let n = 1; n <= 11; n++) {
    const p = Number(body[11 - n]);
    const q = n <= 6 ? n + 1 : n - 5;
    sum += p * q;
  }
  const r = sum % 11;
  const expected = r <= 1 ? 0 : 11 - r;
  return check === expected;
}

/**
 * 法人番号（13桁）。先頭1桁が検査数字。
 * 検査数字 = 9 - (（偶数位置の和×2 + 奇数位置の和） mod 9)
 * （位置は検査数字を除く12桁の右から数える）
 */
export function corporateNumberValid(numStr: string): boolean {
  const d = digitsOnly(numStr);
  if (d.length !== 13) return false;
  const check = Number(d[0]);
  const body = d.slice(1);
  let evenSum = 0;
  let oddSum = 0;
  for (let n = 1; n <= 12; n++) {
    const p = Number(body[12 - n]);
    if (n % 2 === 0) evenSum += p;
    else oddSum += p;
  }
  const expected = 9 - ((evenSum * 2 + oddSum) % 9);
  return check === expected;
}

/** 日本の電話番号（0始まり・10〜11桁） */
export function jpPhoneValid(s: string): boolean {
  const d = digitsOnly(s);
  return (d.length === 10 || d.length === 11) && d.startsWith("0");
}

/** IPv4 の各オクテットが 0-255 */
export function ipValid(s: string): boolean {
  return s.split(".").every((o) => {
    if (o.length === 0 || o.length > 3) return false;
    const n = Number(o);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

/** 住所らしさ（市区町村郡のいずれかを含む） */
export function addressLikeValid(s: string): boolean {
  return /[市区町村郡]/.test(s);
}
