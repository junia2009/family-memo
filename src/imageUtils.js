// メモの画像URL一覧を取得する。
// 旧形式（imageUrl: 単一文字列）と新形式（imageUrls: 配列）の両方に対応。
export const getMemoImages = (memo) => {
  if (Array.isArray(memo?.imageUrls) && memo.imageUrls.length > 0) {
    return memo.imageUrls
  }
  return memo?.imageUrl ? [memo.imageUrl] : []
}
