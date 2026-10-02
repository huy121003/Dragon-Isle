# Game Balance Config

Folder này là **source of truth cho tham số gameplay/balance**.

| File | Sở hữu |
|---|---|
| `progression.js` | Player XP, level rewards, element unlock, skill unlock, Academy gates/caps, star requirements |
| `economy.js` | Starter resources, test resources, island/land/shop/resource exchange |
| `buildings.js` | Building price/max level/resale, upgrade timers, Habitat/Hatchery/Academy scaling |
| `farming.js` | Crop cost/yield/duration |
| `dragons.js` | Dragon lifecycle stages, resale scaling, legacy catalog XP helpers |
| `breeding.js` | Breeding chance, rare-tier caps, Double requirements, premium modifiers, breeding time |
| `hatching.js` | Incubation time |
| `combat.js` | Stats, defense scale, stars, armor, crit, variance, accuracy |
| `arena.js` | Team size, level gate, cooldown, max turns, rewards, defense-AI weights |
| `challenge.js` | Invite/heartbeat/reconnect/idle timings and phases |
| `world.js` | Offline cap, dragon care, passive income/Gem production, visual world timing |
| `timers.js` | Gem skip conversion |

## Quy tắc chỉnh sửa

1. Một parameter gameplay chỉ có **một nơi khai báo**.
2. Config chỉ chứa giá trị/metadata; công thức nằm trong `js/rules/`.
3. Client/server service phải gọi config/rule, không copy số balance.
4. Mọi probability dùng decimal và phải comment rõ, ví dụ `.15 = 15%`.
5. Mọi duration phải ghi rõ seconds hay milliseconds.
6. Khi thay balance, cập nhật/add unit test trước khi merge.
7. `data/game.json` chỉ giữ content/art/layout/static metadata; không đưa balance đã có ở đây trở lại JSON.
8. `data/economy.js` chỉ là compatibility facade cho code legacy; không thêm source-of-truth mới vào đó.

## Ví dụ

Muốn đổi Strong từ x2 sang x1.8:
- sửa `js/config/combat.js` / type-chart source tương ứng;
- không sửa UI/Arena riêng lẻ;
- chạy `npm test` và `npm run economy:audit`.

Muốn đổi Challenge reconnect grace:
- sửa `reconnectGraceMs` trong `challenge.js`;
- Presence/state machine tự dùng giá trị mới.
