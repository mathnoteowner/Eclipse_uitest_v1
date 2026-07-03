/**
 * Promise にタイムアウトを付与する。期限超過で reject。
 * 生成API（本番Claude）が応答しない場合の保険。純粋・テスト可能。
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = "時間内に応答がありませんでした。もう一度お試しください。",
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
