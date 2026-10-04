"use strict";

/* The guide reads balance values from the same catalog and rules as gameplay.
   Add a GUIDE_UPDATES entry and amend the relevant section when rules change. */
const GUIDE_UPDATES=[
  {date:"04/10/2026",title:"Apex Dragons và thành tựu",detail:"Thêm 15 rồng Apex, trứng thưởng khi khám phá đủ ba rồng Double cùng hệ chủ đạo, 15 chiêu Apex và danh mục đầy đủ skill trong hướng dẫn."},
  {date:"02/10/2026",title:"Cân bằng progression tổng thể",detail:"Rà soát XP Player Level, mốc mở 15 hệ, thời gian lai/ấp theo hệ và bậc, thời gian nâng cấp, cây trồng, sức chứa Habitat/Hatchery và kinh tế Gold/Food/Gem."},
  {date:"01/10/2026",title:"Nâng sao rồng",detail:"Mỗi rồng có 0–5 sao. Mỗi sao tăng 5% HP, tấn công và giáp; nâng sao tiêu hao vàng, thức ăn, gem và rồng cùng giống đạt level yêu cầu."},
  {date:"01/10/2026",title:"Giá Shop, thời gian lai/ấp và cẩm nang",detail:"Chuồng cấp cao chứa nhiều vàng hơn; giá Chuồng tăng theo số lần mua từng hệ, điều chỉnh giá Shop và tăng thời gian lai/ấp bậc cao. Thêm lối tắt Arena khi đã xây Arena, cờ xung khắc và mô tả Special Skill."},
  {date:"01/10/2026",title:"Sức chứa Chuồng và XP người chơi",detail:"Tăng sức chứa vàng theo level Chuồng; giảm XP cần ở các level đầu để mở hệ mới sớm hơn và hiện XP hiện tại / XP cần trên thanh tiến độ."},
  {date:"01/10/2026",title:"Thu nhập rồng",detail:"Cân bằng tốc độ tăng vàng theo level, chỉ tính rồng ở Chuồng đang hoạt động; chốt thu nhập trước khi bán, chuyển Chuồng hoặc cho ăn."},
  {date:"01/10/2026",title:"Chi tiết cẩm nang",detail:"Thêm bảng 30 Special Skill, giá trứng một hệ và các mốc XP/phần thưởng mẫu; làm rõ điều kiện nhận hệ khi lai."},
  {date:"01/10/2026",title:"Hướng dẫn và tỷ lệ lai",detail:"Thêm cẩm nang theo chủ đề và bảng tỷ lệ trong Hang lai: tổng từng bậc, tỷ lệ từng giống và xác suất hiếm."},
  {date:"01/10/2026",title:"Arena và chiến đấu",detail:"Đòn đánh hiển thị Strong, Weak, Crit; đội phòng thủ chọn skill theo sát thương và hiệu ứng thực tế."},
  {date:"01/10/2026",title:"15 hệ và Double Element",detail:"Bổ sung năm hệ War, Pure, Legend, Primal, Time và 30 rồng Double Element với skill đặc biệt."}
 ];
const GUIDE_SECTIONS=[
  ["start","🧭 Bắt đầu",guideStart],
  ["dragons","🐉 Rồng & cấp",guideDragons],
  ["breeding","🥚 Lai tạo & ấp",guideBreeding],
  ["islands","🗺️ Đảo & công trình",guideIslands],
  ["resources","🎒 Tài nguyên & vật phẩm",guideResources],
  ["arena","⚔️ Đấu trường",guideArena],
  ["challenge","🗡️ Thách đấu",guideChallenge],
  ["skills","✨ Skill",guideSpecialSkills],
  ["elements","🔰 Xung khắc hệ",guideElements],
  ["updates","✨ Cập nhật",guideUpdates]
];

function guideUpdates(){
  return '<h3>Thay đổi gần đây</h3><div class="guide-updates">'+GUIDE_UPDATES.map(function(item){
    return '<article><time>'+esc(item.date)+'</time><div><b>'+esc(item.title)+'</b><p>'+esc(item.detail)+'</p></div></article>';
  }).join('')+'</div><p class="muted">Các cập nhật cơ chế tiếp theo sẽ được ghi vào mục này và phần hướng dẫn tương ứng.</p>';
}

function renderGuide(){
  dom.title.textContent='📚 Hướng dẫn Dragon Isle';
  const active=GUIDE_SECTIONS.find(section=>section[0]===ui.guideTab)||GUIDE_SECTIONS[0];
  dom.body.innerHTML='<div class="guide"><p class="note">Cẩm nang cơ chế game và dữ liệu hiện tại.</p>'+ 
    '<div class="guide-tabs" role="tablist" aria-label="Chủ đề hướng dẫn">'+GUIDE_SECTIONS.map(function([id,label]){
      return '<button class="btn '+(id===active[0]?'active':'')+'" role="tab" aria-selected="'+
        (id===active[0])+'" data-action="guide-tab" data-tab="'+id+'">'+label+'</button>';
    }).join('')+'</div><section class="guide-section" role="tabpanel">'+active[2]()+'</section></div>';
}
