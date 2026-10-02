"use strict";

/* GUIDE: Getting-started guide section. */
function guideStart(){
  return '<h3>Vòng chơi cơ bản</h3>'+guideList([
    'Xây Chuồng theo hệ, đặt rồng có hệ phù hợp để sản xuất vàng và gem. Chạm Chuồng để thu tài nguyên.',
    'Trồng cây ở Nông trại để lấy thức ăn; cho rồng ăn để tăng cấp. Mở đất, đảo và công trình để mở rộng.',
    'Lai hai rồng trong Hang lai tạo, chuyển trứng sang Lồng ấp rồi chọn Chuồng phù hợp khi trứng nở.',
    'Khám phá giống mới trong Dragon Book; dùng rồng từ level '+window.DragonConfig.arena.minBattleLevel+' để lập đội Đấu trường.'
  ])+'<h3>Thao tác trên đảo</h3>'+guideList([
    'Chạm hoặc click công trình để mở thông tin. Nhấn giữ khoảng 0,5 giây rồi kéo để di chuyển; có thể dùng nút Move.',
    'Kéo nền để di chuyển bản đồ; dùng hai ngón hoặc con lăn chuột để thu phóng. Công trình phải nằm trọn trên đất đã mở.',
    'Mục Islands hiển thị thứ tự đảo và tiến độ mở rộng; Shop chia công trình đặc biệt, Chuồng, trang trí, trứng và thức ăn.'
  ])+'<div class="guide-callout">Các bảng phía dưới lấy level, chi phí, thời gian và bảng hệ từ dữ liệu đang dùng trong game.</div>';
}
