/**
 * Cache trong bộ nhớ tiến trình.
 *
 * NGUYÊN TẮC: đây chỉ là tối ưu, KHÔNG BAO GIỜ chứa state bắt buộc.
 * Xóa sạch cache, khởi động lại tiến trình, hay chạy thêm replica đều
 * không được làm sai kết quả — chỉ được làm chậm hơn.
 */

type Entry = { value: unknown; expiresAt: number };

/** Chặn rò rỉ bộ nhớ từ khóa động như `lb:unit:<id>` (114 giá trị khả dĩ). */
const MAX_ENTRIES = 500;

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

// Tăng mỗi khi invalidate()/clearAll() chạy, để một truy vấn đang bay biết
// dữ liệu nguồn đã đổi trong lúc nó chưa trả về và không ghi đè cache bằng
// kết quả cũ.
let generation = 0;

export function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  // ttlMs = 0: bỏ qua hoàn toàn. Không đọc, không ghi, không gộp request trùng.
  // Đây là đường đi của giai đoạn demo — phải giống hệt như chưa từng có cache.
  if (ttlMs <= 0) return fn();

  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    // LRU: đọc trúng thì đưa khóa về cuối hàng đợi, để khóa nóng không bị
    // khóa rác đánh bật ra. Không có bước này, một kẻ gọi ?unitId=1..600 sẽ
    // đẩy hết khóa nóng khỏi cache.
    store.delete(key);
    store.set(key, hit);
    return Promise.resolve(hit.value as T);
  }

  // Gộp request trùng: nếu đã có một lời gọi đang chạy cho khóa này,
  // mọi request đến sau chờ chung kết quả đó thay vì cùng lao xuống CSDL.
  const running = inflight.get(key);
  if (running) return running as Promise<T>;

  const startedAt = generation;

  const promise = fn()
    .then((value) => {
      // Chỉ ghi nếu chưa có invalidate nào chạy trong lúc truy vấn đang bay.
      // Không có bước này, một truy vấn bắt đầu TRƯỚC khi admin sửa dữ liệu
      // sẽ ghi đè kết quả cũ vào cache SAU khi lệnh xóa đã chạy.
      if (generation === startedAt) {
        setEntry(key, value, ttlMs);
      }
      inflight.delete(key);
      return value;
    })
    .catch((err) => {
      // KHÔNG lưu lỗi vào cache — lần gọi sau phải được thử lại.
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}

function setEntry(key: string, value: unknown, ttlMs: number): void {
  if (store.size >= MAX_ENTRIES && !store.has(key)) {
    // Map giữ thứ tự chèn, nên khóa đầu tiên là mục được thêm sớm nhất.
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Xóa mọi khóa bắt đầu bằng `prefix`. Dùng khi dữ liệu nguồn vừa thay đổi. */
export function invalidate(prefix: string): void {
  generation++;
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) store.delete(key);
  }
  for (const key of Array.from(inflight.keys())) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }
}

/** Chỉ dùng trong test. */
export function clearAll(): void {
  generation++;
  store.clear();
  inflight.clear();
}
