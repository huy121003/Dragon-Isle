"use strict";

/* The guide reads balance values from the same catalog and rules as gameplay.
   Add a GUIDE_UPDATES entry and amend the relevant section when rules change. */
const GUIDE_UPDATES=[
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
  ["elements","🔰 Xung khắc hệ",guideElements],
  ["updates","✨ Cập nhật",guideUpdates]
];
function guideList(items){return '<ul class="guide-list">'+items.map(item=>'<li>'+item+'</li>').join('')+'</ul>';}
function guideTable(headers,rows){
  return '<div class="guide-table-scroll"><table class="guide-table"><thead><tr>'+headers.map(h=>'<th scope="col">'+h+'</th>').join('')+
    '</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(cell=>'<td>'+cell+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
function guideStart(){
  return '<h3>Vòng chơi cơ bản</h3>'+guideList([
    'Xây Chuồng theo hệ, đặt rồng có hệ phù hợp để sản xuất vàng và gem. Chạm Chuồng để thu tài nguyên.',
    'Trồng cây ở Nông trại để lấy thức ăn; cho rồng ăn để tăng cấp. Mở đất, đảo và công trình để mở rộng.',
    'Lai hai rồng trong Hang lai tạo, chuyển trứng sang Lồng ấp rồi chọn Chuồng phù hợp khi trứng nở.',
    'Khám phá giống mới trong Dragon Book; dùng rồng từ level 10 để lập đội Đấu trường.'
  ])+'<h3>Thao tác trên đảo</h3>'+guideList([
    'Chạm hoặc click công trình để mở thông tin. Nhấn giữ khoảng 0,5 giây rồi kéo để di chuyển; có thể dùng nút Move.',
    'Kéo nền để di chuyển bản đồ; dùng hai ngón hoặc con lăn chuột để thu phóng. Công trình phải nằm trọn trên đất đã mở.',
    'Mục Islands hiển thị thứ tự đảo và tiến độ mở rộng; Shop chia công trình đặc biệt, Chuồng, trang trí, trứng và thức ăn.'
  ])+'<div class="guide-callout">Các bảng phía dưới lấy level, chi phí, thời gian và bảng hệ từ dữ liệu đang dùng trong game.</div>';
}
function guideDragons(){
  const level=DATA.progression.skillUnlockLevels,academy=DATA.progression.academyCaps;
  return '<h3>Giống, hệ và chỉ số</h3>'+guideList([
    'Game có '+Object.keys(DATA.elements).length+' hệ và '+BOOK_SPECIES_IDS.length+' giống trong Dragon Book. Hệ đầu tiên là hệ chủ đạo; rồng 2 hệ đảo thứ tự là hai giống khác nhau.',
    'Rồng 3 hệ giữ hệ chủ đạo và một cặp hệ phụ duy nhất; rồng 4 hệ có bốn hệ khác nhau. Double Element có bốn slot nhưng chỉ ba hệ thật: hệ chủ đạo lặp hai lần.',
    'HP, tấn công và phòng thủ lấy từ chỉ số từng hệ, trọng số vị trí hệ, bậc hiếm và level. Arena đánh theo lượt, không có chỉ số tốc độ.'
  ])+'<h3>Cho ăn và mở skill</h3>'+guideList([
    'Cho rồng ăn '+4+' lần để tăng một level. Mỗi lần ở level 1 tốn '+money(dragonFeedCost(1))+' thức ăn; ở level 30 tốn '+money(dragonFeedCost(30))+'. Chi phí tăng theo level.',
    'Bốn vị trí skill mở lần lượt ở level '+level.join(', ')+'. Skill thường dựa trên phần trăm tấn công gốc; skill hệ dùng tấn công gốc cộng phần sát thương hệ.',
    'Giới hạn level mặc định là 30; Dragon Academy nâng giới hạn lần lượt thành '+academy.join(', ')+'. Level tối đa của rồng là '+DATA.progression.dragonMaxLevel+'.',
    'Double Element có ba skill hệ và một special skill của hệ lặp. Special có hồi chiêu; skill hồi máu hoặc phòng thủ thuần không gây sát thương.'
  ])+'<div class="guide-callout">Vào Dragons để xem thức ăn, skill và chỉ số của rồng; Dragon Book ghi thông tin từng giống đã khám phá.</div>';
}
function guideBreeding(){
  const rules=window.DragonEconomy.breeding;
  const tierRows=Object.entries(BREED_TIER_WEIGHTS).map(([parents,weights])=>[
    esc(parents.replace('+',' + ')),weights[0]+'% / '+weights[1]+'%']);
  const durationRows=Object.entries(DATA.breedingTimes).map(([id,seconds])=>[
    esc(DATA.rarities[id]?.name||id),duration(seconds),duration(DATA.rarities[id].incubate)]);
  return '<h3>Điều kiện và tỷ lệ</h3>'+guideList([
    'Hai cá thể khác nhau từ level '+DATA.progression.breedLevel+' có thể lai. Trứng được xác định ngay khi bấm Start breeding; tua thời gian không quay lại kết quả.',
    'Con chỉ dùng hệ có trong bố mẹ và nhận ít nhất một hệ từ mỗi bên. Rồng 2 hệ xét cả hai thứ tự hệ chủ đạo; rồng 3 hệ không lặp thứ tự hai hệ phụ.',
    'Nếu có kết quả 3 hệ: tỷ lệ gốc '+(rules.threeBase*100)+'%, cộng '+(rules.threePerTenLevels*100)+' điểm % mỗi 10 level trung bình, tối đa '+(rules.threeCap*100)+'%.',
    'Rồng 4 hệ cần đúng hai bố mẹ 3 hệ không trùng hệ, cả hai từ level '+rules.fourMinParentLevel+'. Tỷ lệ '+(rules.fourBase*100)+'% ban đầu, tối đa '+(rules.fourCap*100)+'%.',
    'Double Element cần hai bố mẹ từ level '+rules.doubleMinParentLevel+', mỗi bên có ít nhất 3 hệ khác nhau, cùng mang hệ Double và đủ hệ phụ của một giống trong danh mục. Tỷ lệ '+(rules.doubleBase*100)+'% ban đầu, tối đa '+(rules.doubleCap*100)+'%.',
    'Phần còn lại chia cho 1 và 2 hệ theo bảng dưới nếu có kết quả hợp lệ. Trong mỗi bậc, giống nhận hệ chung của bố mẹ có trọng số cao hơn; tỷ lệ từng giống có thể khác nhau.'
  ])+'<h3>Tỷ lệ chia phần còn lại cho 1 / 2 hệ</h3>'+guideTable(['Số hệ bố mẹ','1 hệ / 2 hệ'],tierRows)+
    '<h3>Thời gian lai và ấp theo bậc rồng con</h3>'+guideTable(['Bậc','Trong Hang','Trong Lồng ấp'],durationRows)+
    '<h3>Nhận trứng</h3>'+guideList([
      'Hang lai không thể mở lượt mới khi chưa lấy trứng của lượt trước. Trứng lai từ Hang đó phải được ấp xong hoặc bán trước khi dùng Hang cho lượt khác.',
      'Lồng ấp hiện chỉ nhận một trứng mỗi lượt: phải lấy hoặc bán trứng cũ, kể cả khi đồng hồ đã hoàn tất. Trứng dư nằm ở Inventory và chờ ô trống.',
      'Khi trứng nở, cần Chuồng còn chỗ và cùng ít nhất một hệ của rồng. Giống mới được ghi vào Dragon Book; công thức của cặp bố mẹ được lưu trong Recipes.'
    ])+'<div class="guide-callout">Trong Hang lai, tỷ lệ theo bậc là tổng các giống cùng bậc; mở từng nhóm để xem tỷ lệ chính xác của từng giống.</div>';
}
function guideIslands(){
  const islands=DATA.islands.map((island,index)=>[
    (index+1)+'. '+esc(island.name),esc(island.element?DATA.elements[island.element].name:'Khởi đầu'),
    island.playerLevel?'Lv'+island.playerLevel:'—',index?money(island.gemCost)+' 💎':'Có sẵn']);
  const unlocks=Object.entries(DATA.elementUnlocks).map(([element,level])=>[
    esc(DATA.elements[element].name),String(level)]);
  const buildings=Object.entries(DATA.buildings).map(([type,b])=>[
    esc(b.name),String(b.maxLevel),type==='habitat'?'Có thể bán/cất':type==='hatchery'?'Có sẵn; không bán':'Không bán/cất']);
  return '<h3>Đất, đảo và hệ mở khóa</h3>'+guideList([
    'Đảo mở tuần tự: cần mở hết vùng của đảo trước, đủ level người chơi và gem của đảo kế tiếp.',
    'Mở một vùng đất nhận '+window.DragonEconomy.progression.landXp+' XP người chơi; mua đảo mới nhận '+window.DragonEconomy.progression.islandXp+' XP.',
    'Chuồng và trứng 1 hệ trong Shop mở theo level hệ bên dưới. Vùng đất mở theo ô vuông và phải nối với vùng đã sở hữu.'
  ])+guideTable(['Đảo','Hệ','Level yêu cầu','Giá'],islands)+
    '<h3>Level mở Shop theo hệ</h3>'+guideTable(['Hệ','Player level'],unlocks)+
    '<h3>Công trình</h3>'+guideTable(['Loại','Level tối đa','Kho / bán'],buildings)+
    guideList([
      'Chỉ Chuồng được bán hoặc cất vào Inventory; phải chuyển hết rồng trước khi bán. Công trình khác chỉ được di chuyển hoặc nâng cấp nếu có hỗ trợ.',
      'Số Nông trại tối đa ở level hiện tại: '+farmLimit(state.player.level)+'. Mỗi '+window.DragonEconomy.progression.farmEveryLevels+' level người chơi mở thêm một ô, tối đa '+window.DragonEconomy.progression.maxFarms+'.',
      'Nâng cấp công trình cần đủ đất trống cho diện tích mới. Lồng ấp có thể nâng đến level '+DATA.buildings.hatchery.maxLevel+'; giới hạn mỗi lượt ấp vẫn là một trứng.'
    ]);
}
function guideResources(){
  const crops=DATA.crops.map((crop,index)=>[esc(crop.name),'Farm Lv'+(index+1),money(crop.cost)+' vàng',
    duration(crop.duration),money(crop.yield)+' thức ăn']);
  return '<h3>Tiền, thức ăn và gem</h3>'+guideList([
    'Chuồng chứa vàng và gem do rồng tạo ra; phải thu khi đầy để sản xuất tiếp. Vàng chịu ảnh hưởng bởi level/bậc rồng, hạnh phúc, level Chuồng và tình trạng đói.',
    'Mỗi rồng tạo '+DATA.gemPerDragonPerHour+' gem mỗi giờ khi ở Chuồng đang hoạt động và còn sức chứa gem.',
    'Thức ăn dùng để cho rồng ăn và một số nâng cấp. Shop bán với giá '+money(window.DragonEconomy.progression.foodGoldPrice)+' vàng / thức ăn; Nông trại trồng cây để thu hoạch.',
    'Gem dùng mua đảo, một số trứng và tua thời gian; mỗi 5 phút còn lại khi tua tương ứng khoảng một gem.',
    'Mỗi lần tăng player level nhận vàng, thức ăn và gem; các level chia hết cho 5 có thêm gem.'
  ])+'<h3>Cây trồng ở Nông trại</h3>'+guideTable(['Cây','Mở tại','Chi phí','Thời gian','Thu hoạch Lv1'],crops)+
    '<p class="muted">Nông trại cấp cao tăng lượng thu hoạch thêm 20% cho mỗi level trên 1.</p>'+ 
    '<h3>Inventory và trứng</h3>'+guideList([
      'Inventory hiện chứa trứng đang chờ ô ấp và các Chuồng đã cất. Chuồng cất giữ level, nhưng rồng trong đó ngừng tạo vàng và gem.',
      'Trứng mua trong Shop là rồng 1 hệ. Trứng chưa có ô ấp ở Inventory; trứng nở chỉ được đặt vào Chuồng có hệ phù hợp.',
      'Trứng đã ấp xong của giống từng khám phá có thể bán; trứng giống mới cần nở để ghi vào Dragon Book.'
    ]);
}
function guideArena(){
  return '<h3>Đội hình và lượt đánh</h3>'+guideList([
    'Xây Arena, chọn đúng ba rồng từ level 10 cho đội tấn công và ba rồng cho đội phòng thủ. Rồng đang lai không tham gia.',
    'Arena đánh theo lượt. Người chơi chọn skill hoặc đổi rồng (tốn một lượt); đội phòng thủ chọn skill đang mở và không hồi chiêu theo sát thương dự kiến sau giáp, xung khắc và hiệu ứng hữu ích.',
    'Bốn ô skill mở theo level '+DATA.progression.skillUnlockLevels.join(', ')+'. Special Skill có cooldown; buff/hồi máu thuần không gây sát thương.',
    'Skill hệ dùng hệ của chính skill để khắc hệ chủ đạo của mục tiêu. ▲ Strong nhân 1,5; ▼ Weak nhân 0,75; skill thường không có hệ nên hệ số là 1.',
    'Sát thương còn chịu giáp, biến thiên ngẫu nhiên khoảng 90–110%, trạng thái đang có và chí mạng. Xác suất crit 10%, hệ số crit 1,5.',
    'Dưới HP có icon trạng thái và số lượt còn lại: tăng/giảm tấn công, giáp, giảm sát thương, độc, đóng băng, hồi phục, tăng HP và giảm chính xác.',
    'Special Skill có thể hồi máu, tẩy trạng thái xấu, tăng HP tối đa hoặc đánh 2–3 nhịp có tỷ lệ hụt từng nhịp. Hiệu ứng cùng loại không cộng dồn: làm mới thời gian theo giá trị lớn hơn và giữ mức tác dụng mạnh hơn.',
    'Thắng nhận vàng, thức ăn và gem; thua hoặc bỏ trận tính là thua và chờ 15 phút trước trận tiếp theo.'
  ])+'<div class="guide-callout">Chỉ báo Strong/Weak ở ô skill theo đối thủ đang đứng sân; khi đổi rồng, chúng được tính lại.</div>';
}
function guideElements(){
  const ids=Object.keys(DATA.elements),chart=DRAGON_DB.typeChart;
  const rows=ids.map(function(id){
    const strong=ids.filter(target=>chart[id][target]>1);
    const weak=ids.filter(source=>chart[source][id]>1);
    const flags=items=>items.map(e=>'<span class="guide-element" style="--guide-element:'+esc(DATA.elements[e].color)+'">'+
      esc(DATA.elements[e].name)+'</span>').join(' ');
    return ['<b>'+esc(DATA.elements[id].name)+'</b>',flags(strong),flags(weak)];
  });
  return '<p>Hệ của skill quyết định hệ mà rồng có thể khắc; hệ chủ đạo của mục tiêu quyết định nó bị khắc bởi hệ nào. Mỗi hệ khắc đúng hai hệ và bị đúng hai hệ khác khắc.</p>'+ 
    guideTable(['Hệ','Đánh mạnh vào ×1,5','Bị khắc bởi ×1,5'],rows)+
    '<p class="muted">Đánh vào hệ khắc lại mình gây ×0,75 sát thương. Các cặp còn lại ×1. Rồng đa hệ vẫn chỉ dùng hệ đầu tiên để nhận sát thương hệ.</p>';
}
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
