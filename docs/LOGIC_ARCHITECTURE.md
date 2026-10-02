# Dragon Isle Logic Architecture

## Mục tiêu

Logic game được chia thành bốn tầng. Khi sửa hoặc thêm tính năng, đi theo luồng:

```
js/config  ->  js/rules  ->  js/logic / server services  ->  UI
 tham số       công thức       thay đổi state                hiển thị
```

### 1. `js/config/` — tham số/source of truth

Chứa source-of-truth cho các tham số có thể thay đổi mà không nên chôn trong logic.

- Config domain gameplay: Strong/Weak multiplier, XP curve, giá nâng cấp, thời gian breeding,
  Arena team size, Challenge reconnect grace.
- `system.js`: save version/size, autosave, reconnect, session và rate-limit policy.

Không trộn công thức hoặc side effect vào config; logic tiêu thụ các tham số này ở tầng rule/service.

**Không đặt** `toast`, `fetch`, `Date.now()`, `Math.random()` hoặc mutation state trong config.

Mỗi giá trị quan trọng phải có comment giải thích:
- giá trị dùng cho việc gì;
- đơn vị (seconds/ms/percent/probability);
- phạm vi ảnh hưởng;
- nếu là xác suất, ghi rõ dạng decimal (.15 = 15%).

### 2. `js/rules/` — pure rules

Rule nhận input rõ ràng và trả output; không sửa global state.

Rule **không được**:
- gọi UI/toast/audio;
- gọi save/fetch;
- tự đọc thời gian/random nếu có thể inject;
- tự chứa balance number nếu số đó thuộc config.

Ví dụ:

```js
playerXPNeeded(level)
habitatPurchaseCost(baseCost, unlockLevel, purchased)
breeding.seconds(species, tier, elementUnlocks, parents, premium)
```

### 3. `js/logic/` và `server/*` — orchestration/services

Tầng này:
1. đọc state;
2. validate hành động;
3. gọi rule;
4. mutate state;
5. phát event/UI/audio/save nếu là client.

Mỗi file chỉ nên sở hữu **một domain**. Ví dụ:
- `world.js`: advance thời gian;
- `progression.js`: XP/level;
- `dragon-care.js`: feeding;
- `farms.js`: plant/harvest;
- `islands.js`: land/island;
- `selling.js`: resale.

Nếu file bắt đầu xử lý nhiều domain không liên quan, tách file trước khi thêm logic mới.

### 4. UI

React/legacy UI chỉ:
- đọc state/view-model;
- gửi action;
- hiển thị result/error.

Không copy công thức balance vào UI.

## Chuẩn comment/JSDoc

Hàm public hoặc rule quan trọng dùng JSDoc:

```js
/**
 * Calculate incubation duration in seconds.
 * @param {object} species - Catalog species.
 * @param {object} elementUnlocks - Element id -> unlock level.
 * @returns {number} Duration in seconds.
 */
```

Không comment kiểu “increment i” hoặc lặp lại đúng câu code đã nói. Comment phải giải thích
**why / contract / unit / side effect**.

## Clock và RNG

Logic cần thời gian/random phải ưu tiên injection:

```js
createService({ now = () => Date.now(), rng = Math.random })
```

Nhờ vậy test có thể tái lập 100%.

## Error/result

Pure rule không tạo toast text. Khi refactor action mới, ưu tiên result code:

```js
{ ok:false, code:'NOT_ENOUGH_GEMS', required:{gems:5} }
```

Presentation layer mới map code -> message. Legacy action có thể giữ toast trong giai đoạn migration.

## Backward compatibility

`data/economy.js` là facade tương thích cho code cũ. **Không thêm tham số mới vào đây.**
Tham số mới phải vào `js/config/*`, sau đó chỉ expose qua facade nếu caller legacy thực sự cần.

## Checklist khi thêm gameplay feature

1. Có tham số mới? -> `js/config/<domain>.js`; tham số vận hành/persistence/auth -> `js/config/system.js`.
2. Có công thức mới? -> `js/rules/<domain>.js`.
3. Có mutation/state transition? -> `js/logic/<domain>.js` hoặc server service.
4. Có network/persistence? -> service riêng, không nhét vào rule.
5. Thêm unit test cho rule.
6. Thêm regression/integration test cho mutation.
7. Comment contract, params, return, units và side effects quan trọng.
