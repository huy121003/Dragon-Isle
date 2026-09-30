# Dragon Isle

Game nuôi và lai rồng với **React 19 + Ant Design 6**, Canvas 2D và máy chủ **Node.js**. Tài khoản, phiên đăng nhập và tiến trình từng người nằm trên máy chủ. Giao diện đăng nhập, tài nguyên, các cửa sổ thao tác và quản trị dùng Ant Design; logic đảo, rồng, ấp/lai và họa hình vẫn nằm trong các module Canvas hiện có.

## Cài trên Kali / chạy máy chủ

Cần Node.js **20.19+ hoặc 22.12+** và npm. Trong thư mục `dragon-isle`:

```sh
npm ci
npm run build
node server.cjs
```

Trên máy Kali, mở `http://127.0.0.1:8080` và đăng ký tài khoản quản trị trước. Sau đó dừng server và cho thiết bị khác truy cập:

```sh
node server.cjs --host 0.0.0.0 --port 8080
```

Mở `http://IP-máy-Kali:8080`. Tài khoản được đăng ký **đầu tiên** là quản trị viên, thấy nút **Quản trị** trên thanh đầu. Trong bảng quản trị có thể xem tiến trình, khóa/mở tài khoản và đặt lại tiến trình của người chơi; các thao tác này thu hồi phiên đăng nhập cũ. Quản trị viên không thể tự khóa hoặc tự xóa tiến trình qua bảng quản trị. Nút **Cửa hàng → Dữ liệu → Khôi phục game mới** vẫn đặt lại đảo của tài khoản đang đăng nhập.

Trong **Quản trị**, bấm **Chỉnh tài nguyên** ở từng người chơi để đặt số dư Vàng, Thức ăn, Gem, hoặc nhập các ô ở khung **Đặt số dư cho tất cả tài khoản**. Ô để trống sẽ giữ nguyên; nhập `0` để đặt về không. Giới hạn lần lượt là 1.000 tỷ vàng, 1 tỷ thức ăn và 1 tỷ gem. Tài khoản đã sửa cần đăng nhập lại để đọc bản lưu mới, kể cả tài khoản admin nếu chỉnh chính mình hoặc áp dụng cho tất cả. Người chưa vào game vẫn nhận một đảo khởi đầu đầy đủ khi admin cấp tài nguyên. API tài nguyên chỉ chấp nhận quyền quản trị và ghi vào hồ sơ JSON của từng người.

Thư mục `dist/` được tạo khi chạy `npm run build` và không lưu trong repository. Sau khi sửa `src/` hoặc CSS, chạy lại lệnh build. Khi nâng cấp máy chủ đang dùng, giữ nguyên `data/users.json`, `data/sessions.json` và `data/profiles/` để không mất tài khoản/tiến trình. Đặt HTTPS reverse proxy nếu mở ra Internet và thêm cờ `--secure-cookies` khi chạy sau HTTPS.

## Đăng ký, đăng nhập và lưu riêng từng người

Sau khi cài và build theo phần trên, mở terminal tại thư mục `dragon-isle`, chạy:

```sh
node server.cjs
```

Mở `http://127.0.0.1:8080` và đăng ký tài khoản (tên 3–24 ký tự chữ/số/gạch dưới; mật khẩu ít nhất 8 ký tự). Đăng nhập lần đầu sẽ tạo **đảo mới với 500 vàng, 50 thức ăn, 10 gem**. Mỗi người có bản lưu riêng trong `data/profiles/<id>.json`; `data/users.json` giữ tài khoản và mật khẩu đã băm, `data/sessions.json` giữ phiên đăng nhập. Đăng xuất bằng nút tên tài khoản trên thanh đầu. Bản lưu dùng chung `data/progress.json` đã được xóa; bản `localStorage` cũ cũng không tự nhập vào tài khoản mới.

Để chơi trên điện thoại cùng mạng Wi-Fi với máy chạy server:

```sh
node server.cjs --host 0.0.0.0 --port 8080
```

Trên điện thoại mở `http://IP-của-máy-tính:8080`; mỗi thiết bị đăng nhập cùng tài khoản sẽ đọc cùng hồ sơ. Cùng một trình duyệt đăng nhập tài khoản khác ở tab mới thì tab cũ sẽ bị từ chối lưu để tránh ghi nhầm hồ sơ; hãy tải lại tab cũ. Mở `index.html` trực tiếp qua `file://` sẽ chỉ hiện hướng dẫn chạy máy chủ vì game cần xác thực tài khoản.

Máy chủ HTTP phù hợp để thử trên máy cá nhân hoặc mạng nội bộ đáng tin cậy. Nếu đưa ra Internet, đặt sau HTTPS reverse proxy và khởi động với `--secure-cookies` để cookie chỉ đi qua HTTPS. Sao lưu cả `data/users.json` và thư mục `data/profiles/` cùng nhau để giữ tài khoản và tiến trình.

## Cấu trúc dự án

| File / thư mục | Nội dung |
| --- | --- |
| `data/dragons.json`, `data/elements-expansion.json`, `data/double-elements.json` | Loài gốc, 5 hệ mở rộng và 30 thiết kế Double Element; bộ sinh danh mục dùng lại công thức rồng hiện tại |
| `data/game.json`, `data/economy.js` | Bản đồ 16 đảo sau khi mở rộng, vùng đất 24×24, công trình và hệ số cân bằng |
| `data/users.json`, `data/sessions.json` | Máy chủ tự tạo tài khoản và phiên; không lưu trong repository và không cho tải trực tiếp qua web |
| `data/profiles/` | Một file JSON tiến trình riêng cho từng tài khoản |
| `server/auth.cjs`, `server/store.cjs`, `server/profile.cjs` | Xác thực, ghi JSON nguyên tử và tạo hồ sơ đầu tiên khi admin cấp tài nguyên |
| `js/data/dragon-rules.js` | Quy tắc sinh rồng lai, tính chỉ số và pha màu từ JSON |
| `js/data/catalog.js` | Nạp dữ liệu JSON vào cấu trúc game |
| `js/data/db-cache.js` | Bản cache tạo từ JSON để `file://` vẫn chạy |
| `js/core/`, `js/logic/` | Trạng thái, tiền vàng, trứng, lai, công trình, chiêu và đồng hồ |
| `js/render/`, `js/ui/` | Canvas đảo/rồng và giao diện thông tin, Sổ tay, chuồng; `dragon-anatomy.js` vẽ dáng gốc, `dragon-tertiary.js` vẽ lớp hình thể của hệ thứ ba |
| `js/auth.js`, `js/save.js`, `js/audio.js`, `js/main.js` | Đăng nhập, lưu hồ sơ, âm thanh, vòng lặp game |
| `src/main.jsx`, `src/ui.css` | Giao diện React và theme Ant Design, màn hình quản trị, bộ nối thao tác Canvas |
| `dist/` | Đầu ra do Vite build, không lưu trong repository; Node phục vụ trực tiếp |
| `server.cjs` | Máy chủ Node.js đọc/ghi JSON, xác thực và API quản trị |
| `package.json`, `vite.config.mjs` | Gói React/Ant Design/Vite và lệnh build |
| `tests/` | Kiểm thử game và máy chủ |

Dữ liệu loài được quản lý trong các tệp JSON thuộc `data/`; `scripts/extend-catalog.cjs` mở rộng danh mục khi build và khi Arena tải dữ liệu. `npm run build` tự tạo cache và build React; `npm test` cũng build trước khi kiểm tra. Chạy `node server.cjs` để thử game; mở `/debug/gallery.html` để xem rồng theo hệ và tuổi.

## Bản cập nhật đảo và rồng

- **16 đảo trên cùng Canvas**, gồm 11 đảo gốc và 5 đảo theo thứ tự War, Pure, Legend, Primal, Time. Mỗi đảo rộng 72×72 ô, chia **3×3 vùng 24×24**; đảo gốc mở vùng giữa và tám vùng còn lại mua dần. Phải mở hết đảo hiện tại để mua đảo tiếp. Kéo và chụm hai ngón để di chuyển và thu phóng; bảng Islands có nút xem toàn cảnh. Đảo có mặt vuông, vách nổi, bóng, trang trí và hiệu ứng thời tiết theo hệ.
- Chu kỳ ngày đêm chạy trong 8 phút và đổi màu trời, nước, đảo, công trình. Có thể mở trang `/debug/gallery.html` để xem mười dáng rồng cơ bản và các bản lai ở các tuổi; nút Pause và Quality hỗ trợ kiểm tra hoạt ảnh.
- Dragon Academy có thể kéo hoặc dùng nút Move như công trình khác. Công trình giới hạn cấp rồng ở 30 khi chưa nâng cấp; mỗi cấp Academy tăng chi phí vàng, thức ăn, gem và thời gian theo `data/economy.js`, đồng thời yêu cầu cấp người chơi.
- Hang lai có **hai cột Father/Mother**, mỗi cột có lọc tối đa bốn hệ và tìm tên riêng. Hệ được chọn có viền và dấu ✓; rồng phải có đủ tất cả hệ được chọn. Bộ lọc kho rồng, Sổ tay và chọn đội đấu trường cũng theo quy tắc này. Danh sách đối thủ không có bộ lọc hệ. Rồng đã chọn ở một cột bị khóa ở cột kia. Danh sách hiển thị chân dung, tên tiếng Anh, cờ hệ nhỏ và độ hiếm.
- Danh mục sau khi mở rộng có **1.770 loài**: 15 rồng một hệ, 210 rồng hai hệ (mỗi cặp có đủ hai hệ chủ đạo), 1.365 rồng ba hệ (mỗi hệ chủ đạo đi với một cặp hệ phụ không thứ tự), 150 rồng bốn hệ (mỗi hệ chủ đạo có 10 con) và 30 rồng Double Element. Mỗi hệ xuất hiện đúng 30 lần với vai trò hệ phụ của rồng bốn hệ; trong từng nhóm chủ đạo, mỗi hệ phụ khác xuất hiện 2–3 lần. Giữ nguyên ID của 50 rồng bốn hệ gốc để bảo toàn bản lưu. Bộ lọc Double Element tách khỏi 4 hệ thông thường.
- Lai tạo chỉ lấy các hệ có trong hai bố mẹ. Rồng ba hệ chỉ có khi kết hợp được ít nhất ba hệ, tỉ lệ **4–8%** tùy cấp. Rồng bốn hệ chỉ có khi hai bố mẹ đều ba hệ, **không trùng hệ**, đạt ít nhất cấp 30 và danh mục có loài phù hợp; tỉ lệ **0,5–1%**. Hệ trùng trong bố mẹ tăng trọng số thừa hưởng. Các hệ số ở `data/economy.js`.
- Kỹ năng dùng icon lục giác với màu và hình hệ tương ứng; chiêu thường có icon riêng. Cờ hệ trong bộ lọc, thẻ rồng, Sổ tay và bảng thông tin có các kích cỡ thống nhất.
- Rồng có chuyển động đuôi lò xo, nhịp thở, cánh và phần đầu theo trạng thái. Bậc 2/3/4 có phần cánh, áo giáp, vây hoặc trường năng lượng của các hệ phụ. Công trình được vẽ lại từ đầu bằng hình khối nhìn nghiêng. Mười chuồng có địa hình và hình dáng riêng: Lửa có núi dung nham, Nước có hồ san hô, Đất có cột đá, Gió có cối gió trên mây, Băng có tinh thể và nhũ băng, Sét có mây điện, Thiên nhiên có tán cây, Bóng tối có trăng và tháp mộ, Ánh sáng có đền mặt trời, Kim loại có lò rèn và bánh răng. Nông trại có ruộng bậc và kho gỗ, lò ấp là vỏ trứng bao lấy buồng kính và ổ ấp, Dragon Academy là tháp chính với hai cánh, Đấu trường có khán đài và hai cờ, Hang Lai là cổng đá cùng tinh thể. Rồng, trứng, cây trồng, quá trình lai và ánh sáng đêm vẫn đổi theo trạng thái thực tế.

## Đấu trường và tiến trình

Đấu trường yêu cầu ba rồng từ cấp 10 trở lên trong mỗi đội tấn công và phòng thủ; rồng đang lai không thể tham chiến. Chọn đội trước khi xem đối thủ. Trong trận, chọn một trong các chiêu của rồng hoặc đổi rồng; lượt của đội tấn công diễn ra trước. Đội phòng thủ do máy chủ điều khiển. Thắng được vàng, thức ăn và gem; thua phải chờ 15 phút. Số trận thắng/thua và tiến trình được lưu theo tài khoản.

Rồng lên cấp sau bốn lần cho ăn; lượng thức ăn mỗi lần tăng theo cấp với phần tăng mạnh hơn ở cấp cao. EXP người chơi nhận khi ấp nở, lai thành công, mua/nâng cấp chuồng, thu hoạch thức ăn, mở vùng đất và mua đảo. Chuồng đang nâng cấp hoặc chứa rồng không bán được; rồng trong chuồng có thể bán từ trang thông tin. Lò ấp cấp 1 có sẵn ở tài khoản mới, không bán trong cửa hàng nhưng có thể di chuyển kể cả khi có trứng.

### Cân bằng tiến trình

- EXP cần cho cấp người chơi 1–20 bằng 38% công thức cũ; từ cấp 21 tăng dần và trở về mức cũ ở cấp 40. Mỗi lần lên cấp nhận vàng, thức ăn và gem; cấp chia hết cho 5 có thêm 2 gem.
- Mở một vùng đất nhận 80 EXP; mua một đảo nhận 300 EXP. Số Farm tối đa là 1 ở cấp 1–4, thêm 1 ở mỗi mốc cấp 5, 10, 15… và tối đa 12 Farm. Farm đã cất kho vẫn tính vào giới hạn.
- Trứng lai 3 và 4 hệ giữ mức xác suất 4–8% và 0,5–1%; phần còn lại ưu tiên rồng 2 hệ. Giao diện hiển thị xác suất theo hai chữ số thập phân.
- Rồng **Double Element** có bốn slot nhưng chỉ ba hệ: hai slot đầu là hệ chủ đạo trùng nhau. Có hai loài riêng cho mỗi hệ, thuộc bậc Transcendent với chỉ số nằm giữa rồng 3 hệ và 4 hệ. Bố mẹ đều cần cấp 35, đều mang hệ chủ đạo và mỗi con có ít nhất ba hệ riêng; tỉ lệ xuất hiện 0,2–0,4%, thấp hơn rồng 4 hệ. Trứng và hình thể theo hai dạng riêng, màu/chi tiết phụ thuộc các hệ thành phần; Sổ tay có tab riêng. Danh sách 30 thiết kế, kỹ năng và các thông số nằm tại `data/double-elements.json`.
- Shop Food bán 10, 100 hoặc 500 thức ăn với giá 5 vàng mỗi thức ăn. Các tham số EXP, thưởng, giới hạn Farm, giá cho ăn và tỉ lệ lai nằm trong `data/economy.js`.

### Chiến đấu

- Mỗi hệ khắc đúng hai hệ và bị đúng hai hệ khắc. Hệ đầu tiên quyết định điểm yếu phòng thủ; các hệ còn lại cho phép dùng chiêu của hệ đó để khắc đối thủ. Đòn hệ mạnh gây ×1,5, đòn bị kháng gây ×0,75; chiêu thường không có hệ.
- HP, tấn công và giáp được pha từ các hệ của rồng theo thứ tự, nhân bậc hiếm rồi tăng dần theo cấp 1–100. Đấu trường đánh theo lượt với bên chủ động đi trước, không còn chỉ số tốc độ.
- Chiêu thường bằng một phần trăm tấn công gốc; chiêu hệ bằng 100% tấn công gốc cộng thêm sát thương hệ tính theo phần trăm tấn công gốc. Sau đó áp dụng khắc hệ, giảm theo giáp, sai số ±10% và chí mạng ×1,5. Máy chủ và giao diện dùng chung `js/data/combat-rules.js`.
- Slot kỹ năng thứ tư của Double Element là chiêu đặc biệt hệ chủ đạo, có hồi chiêu 3–4 lượt. Arena lưu trạng thái và lượt còn lại cho tăng/giảm sát thương hoặc giáp, giảm sát thương nhận, độc, hồi máu theo lượt, đóng băng, tăng HP và đòn nhiều nhịp có xác suất hụt; hiệu ứng cùng loại làm mới thời gian và lấy giá trị cao hơn thay vì cộng dồn. Kỹ năng hỗ trợ thuần không gây sát thương. Biểu tượng trạng thái hiện dưới thanh HP.

Khi cập nhật máy chủ đang dùng, giữ nguyên `data/users.json`, `data/sessions.json`, `data/profiles/` và `data/arena/`. Chạy `npm ci && npm run build && npm test`, sau đó `node server.cjs --host 0.0.0.0 --port 8080`. Bản lưu v7–v10 được nâng lên v11; đất và công trình đi theo đảo tương ứng khi tọa độ đảo thay đổi.
