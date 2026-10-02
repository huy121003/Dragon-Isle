# Dragon Isle Config — Source of Truth

Folder này là **nguồn khai báo duy nhất** cho các tham số gameplay, balance và platform có thể thay đổi.
Công thức nằm trong `js/rules/`; state mutation nằm trong `js/logic/` hoặc server service; UI chỉ đọc cùng config để hiển thị.

## Bản đồ config

| File | Sở hữu | Đơn vị thường dùng |
|---|---|---|
| `progression.js` | Player XP, level reward, element/skill unlock, Academy, star upgrade, feeding cost | level, XP, Gold/Food/Gem |
| `economy.js` | Starter/test resources, island/land/shop/resource exchange | Gold/Food/Gem, multiplier |
| `buildings.js` | Giá, max level, resale, upgrade time, Habitat/Hatchery/Academy scaling | seconds, resource, multiplier |
| `farming.js` | Crop cost/yield/duration | seconds, Gold/Food |
| `dragons.js` | Lifecycle, resale, XP helper và giới hạn cấu trúc như `maxElementsPerDragon` | level, element slots, multiplier |
| `breeding.js` | Tỉ lệ lai, rare tier, Double requirements, premium modifier, breeding time | decimal probability, seconds |
| `hatching.js` | Incubation time | seconds |
| `combat.js` | Stat growth, defense/armor, star bonus, crit, variance, accuracy | decimal multiplier/probability |
| `arena.js` | Team size, level gate, cooldown, max turn, reward, defense-AI weights | level, ms, resource |
| `challenge.js` | Invite/presence/heartbeat/reconnect/idle và phase | milliseconds |
| `world.js` | Offline simulation, care, passive income/Gem, day/weather | ms, seconds, per-hour |
| `timers.js` | Gem skip conversion | seconds/Gem, Gems |
| `system.js` | Save/auth/API/runtime/reconnect/presentation limits; **không phải gameplay balance** | bytes, ms, count |

## Quy tắc chỉnh sửa

1. **Một parameter chỉ có một owner.** Nếu đã có trong config thì caller phải đọc lại, không copy số.
2. Config **không có side effect**: không `fetch`, `toast`, save state, `Date.now()` hay random roll.
3. Probability dùng decimal: `.15 = 15%`. Multiplier ghi theo dạng `1.5 = 1.5×`.
4. Duration phải rõ đơn vị qua tên/comment, ưu tiên suffix `Ms` hoặc `Seconds`.
5. UI text phải sinh từ cùng config dùng bởi logic/server validation; ví dụ team size, level gate, cooldown.
6. Test nên kiểm tra behavior hoặc import config/type chart, không lặp literal nếu literal đó là source-of-truth khác.
7. `data/game.json` chỉ giữ content/art/layout/static metadata; không đưa balance quay lại đây.
8. `data/economy.js` chỉ là **compatibility facade** cho legacy code; không thêm source-of-truth mới vào facade.
9. Thêm parameter gameplay mới → config domain tương ứng → pure rule nếu có công thức → logic/service nếu có mutation.
10. Thêm parameter vận hành/auth/persistence mới → `system.js`.

## Luồng chuẩn

```
js/config/<domain>.js
        ↓
js/rules/<domain>.js       (công thức thuần, nếu cần)
        ↓
js/logic/* hoặc server/*   (validate + mutate/orchestrate)
        ↓
UI / API DTO               (chỉ hiển thị kết quả)
```

## Ví dụ

Muốn đổi Arena team size:
- sửa `teamSize` trong `arena.js`;
- server eligibility, client Arena và text hướng dẫn phải tự dùng giá trị mới;
- không sửa riêng `length===3` ở service/UI.

Muốn đổi Challenge reconnect grace:
- sửa `reconnectGraceMs` trong `challenge.js`;
- presence/state machine tự dùng giá trị mới.

Muốn đổi autosave/reconnect retry:
- sửa `system.js`;
- không đưa các giá trị này vào config gameplay.

Sau mỗi thay đổi config: chạy `npm test`, `npm run economy:audit` và e2e trước khi merge.
