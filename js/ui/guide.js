"use strict";

/* The guide reads balance values from the same catalog and rules as gameplay.
   Add a GUIDE_UPDATES entry and amend the relevant section when rules change. */
const GUIDE_UPDATES=[
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
  ["special","✦ Special Skill",guideSpecialSkills],
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
  const starRows=DATA.progression.starUpgrades.map((rule,index)=>[
    String(index+1)+' ★','+'+((index+1)*5)+'%',String(rule.dragons)+' rồng cùng giống, Lv'+rule.level+'+',
    money(rule.gold),money(rule.food),money(rule.gems)]);
  return '<h3>Giống, hệ và chỉ số</h3>'+guideList([
    'Game có '+Object.keys(DATA.elements).length+' hệ và '+BOOK_SPECIES_IDS.length+' giống trong Dragon Book. Hệ đầu tiên là hệ chủ đạo; rồng 2 hệ đảo thứ tự là hai giống khác nhau.',
    'Rồng 3 hệ giữ hệ chủ đạo và một cặp hệ phụ duy nhất; rồng 4 hệ có bốn hệ khác nhau. Double Element có bốn slot nhưng chỉ ba hệ thật: hệ chủ đạo lặp hai lần.',
    'HP, tấn công và phòng thủ lấy từ chỉ số từng hệ, trọng số vị trí hệ, bậc hiếm và level. Arena đánh theo lượt, không có chỉ số tốc độ.'
  ])+'<h3>Cho ăn và mở skill</h3>'+guideList([
    'Cho rồng ăn '+4+' lần để tăng một level. Mỗi lần ở level 1 tốn '+money(dragonFeedCost(1))+' thức ăn; ở level 30 tốn '+money(dragonFeedCost(30))+'. Chi phí tăng theo level.',
    'Bốn vị trí skill mở lần lượt ở level '+level.join(', ')+'. Skill thường dựa trên phần trăm tấn công gốc; skill hệ dùng tấn công gốc cộng phần sát thương hệ.',
    'Giới hạn level mặc định là 30; Dragon Academy nâng giới hạn lần lượt thành '+academy.join(', ')+'. Level tối đa của rồng là '+DATA.progression.dragonMaxLevel+'.',
    'Double Element có ba skill hệ và một special skill của hệ lặp. Special có hồi chiêu; skill hồi máu hoặc phòng thủ thuần không gây sát thương.'
  ])+'<h3>Nâng sao rồng</h3><p>Mỗi rồng bắt đầu với ☆☆☆☆☆. Mỗi sao cộng thêm 5% vào HP, tấn công và giáp theo chỉ số ở level hiện tại; tối đa ★★★★★ (+25%). Nâng sao không tăng sản lượng vàng hoặc gem.</p>'+
    guideTable(['Sao mới','Chỉ số','Rồng hiến tế','Vàng','Thức ăn','Gem'],starRows)+
    '<p>Rồng hiến tế phải cùng đúng giống, 0 sao, không đang lai và đạt level yêu cầu. Game chọn rồng chưa vào Chuồng trước, sau đó chọn level thấp nhất đủ điều kiện. Rồng được chọn sẽ mất vĩnh viễn; rồng nâng sao vẫn giữ nguyên level và Chuồng.</p>'+
    '<div class="guide-callout">Vào Dragons để xem thức ăn, skill, chỉ số và nâng sao của từng rồng; Dragon Book ghi thông tin giống đã khám phá.</div>';
}
function guideBreeding(){
  const rules=window.DragonEconomy.breeding;
  const tierRows=Object.entries(BREED_TIER_WEIGHTS).map(([parents,weights])=>[
    esc(parents.replace('+',' + ')),weights[0]+'% / '+weights[1]+'%']);
  const durationRows=Object.entries(DATA.breedingTimes).map(([id,seconds])=>[
    esc(DATA.rarities[id]?.name||id),duration(seconds),duration(DATA.rarities[id].incubate)]);
  return '<h3>Điều kiện và tỷ lệ</h3>'+guideList([
    'Hai cá thể khác nhau từ level '+DATA.progression.breedLevel+' có thể lai. Trứng được xác định ngay khi bấm Start breeding; tua thời gian không quay lại kết quả.',
    'Thông thường con chỉ dùng hệ có trong bố mẹ. Rồng 1 hệ có thể lấy một hệ từ bố hoặc mẹ; từ 2 hệ trở lên phải có ít nhất một hệ của mỗi bên. Rồng 2 hệ xét cả hai thứ tự hệ chủ đạo; rồng 3 hệ không lặp thứ tự hai hệ phụ. Double Element là ngoại lệ về hệ phụ.',
    'Nếu có kết quả 3 hệ: tỷ lệ gốc '+(rules.threeBase*100)+'%, cộng '+(rules.threePerTenLevels*100)+' điểm % mỗi 10 level trung bình, tối đa '+(rules.threeCap*100)+'%.',
    'Rồng 4 hệ cần đúng hai bố mẹ 3 hệ với ít nhất 4 hệ khác nhau khi gộp lại. Cả bốn hệ của con đều lấy từ bố mẹ và tra theo '+FOUR_IDS.length+' tổ hợp được ghi trong danh mục. Nếu bộ hệ của bố mẹ không chứa tổ hợp nào trong danh mục thì xác suất rồng 4 hệ bằng 0. Tỷ lệ '+(rules.fourBase*100)+'% ban đầu, tăng theo level trung bình từ '+rules.fourGrowthStartLevel+' và tối đa '+(rules.fourCap*100)+'%.',
    'Double Element cần hai bố mẹ đều có 4 ô hệ, mỗi bên có ít nhất 3 hệ khác nhau, cùng hệ chủ đạo và từ level '+rules.doubleMinParentLevel+'. Hai giống Double của hệ chủ đạo đó đều có cơ hội xuất hiện, kể cả khi hệ phụ không có trong bố mẹ. Tỷ lệ '+(rules.doubleBase*100)+'% ban đầu, tối đa '+(rules.doubleCap*100)+'%.',
    'Phần còn lại chia cho 1 và 2 hệ theo bảng dưới nếu có kết quả hợp lệ. Trong mỗi bậc, giống nhận hệ chung của bố mẹ có trọng số cao hơn; tỷ lệ từng giống có thể khác nhau.'
  ])+'<h3>Tỷ lệ chia phần còn lại cho 1 / 2 hệ</h3>'+guideTable(['Số hệ bố mẹ','1 hệ / 2 hệ'],tierRows)+
    '<h3>Thời gian lai và ấp theo bậc rồng con</h3>'+guideTable(['Bậc','Trong Hang','Trong Lồng ấp'],durationRows)+
    '<p class="muted">Thời gian mới áp dụng khi bắt đầu lượt lai hoặc ấp mới; đồng hồ của lượt đã bắt đầu giữ thời điểm hoàn tất đã lưu.</p><h3>Nhận trứng</h3>'+guideList([
      'Hang lai không thể mở lượt mới khi chưa lấy trứng của lượt trước. Trứng lai từ Hang đó phải được ấp xong hoặc bán trước khi dùng Hang cho lượt khác.',
      'Lồng ấp hiện chỉ nhận một trứng mỗi lượt: phải lấy hoặc bán trứng cũ, kể cả khi đồng hồ đã hoàn tất. Trứng dư nằm ở Inventory và chờ ô trống.',
      'Khi trứng nở, cần Chuồng còn chỗ và cùng ít nhất một hệ của rồng. Giống mới được ghi vào Dragon Book; công thức của cặp bố mẹ được lưu trong Recipes.'
    ])+'<div class="guide-callout">Trong Hang lai, tỷ lệ theo bậc là tổng các giống cùng bậc; mở từng nhóm để xem tỷ lệ chính xác của từng giống.</div>';
}
function guideIslands(){
  const islands=DATA.islands.map((island,index)=>[
    (index+1)+'. '+esc(island.name),esc(island.element?DATA.elements[island.element].name:'Khởi đầu'),
    island.playerLevel?'Lv'+island.playerLevel:'—',index?money(islandUnlockCost(index))+' 💎':'Có sẵn']);
  const unlocks=Object.entries(DATA.elementUnlocks).map(function([element,level]){
    const egg=DATA.species[element],price=egg?.detail.giaTrung?shopEggPrice(egg):null;
    return [esc(DATA.elements[element].name),String(level),price?
      (price.vang?money(price.vang)+' vàng':money(price.gem)+' gem'):'—'];
  });
  const buildings=Object.entries(DATA.buildings).map(([type,b])=>[
    esc(b.name),type==='hatchery'?'Có sẵn':type==='habitat'?'Theo hệ và lượt mua':money(b.cost)+' vàng',
    String(b.maxLevel),type==='habitat'?'Có thể bán/cất':type==='hatchery'?'Có sẵn; không bán':'Không bán/cất']);
  const capacityRows=Array.from({length:DATA.buildings.habitat.maxLevel},(_,index)=>{
    const level=index+1;
    return [String(level),money(habitatGoldCapacity({type:'habitat',element:'fire',level})),
      money(habitatGoldCapacity({type:'habitat',element:'time',level}))];
  });
  return '<h3>Đất, đảo và hệ mở khóa</h3>'+guideList([
    'Đảo mở tuần tự: cần mở hết vùng của đảo trước, đủ level người chơi và gem của đảo kế tiếp.',
    'Mở một vùng đất nhận '+window.DragonEconomy.progression.landXp+' XP người chơi; mua đảo mới nhận '+window.DragonEconomy.progression.islandXp+' XP.',
    'Chuồng và trứng 1 hệ trong Shop mở theo level hệ bên dưới. Vùng đất mở theo ô vuông và phải nối với vùng đã sở hữu.'
  ])+guideTable(['Đảo','Hệ','Level yêu cầu','Giá'],islands)+
    '<h3>Level mở Shop theo hệ</h3>'+guideTable(['Hệ','Player level','Giá trứng 1 hệ'],unlocks)+
    '<h3>Công trình</h3>'+guideTable(['Loại','Giá khởi điểm','Level tối đa','Kho / bán'],buildings)+
    '<h3>Sức chứa vàng mẫu theo cấp Chuồng</h3>'+guideTable(['Cấp Chuồng','Lửa','Time'],capacityRows)+
    guideList([
      'Giá Chuồng phụ thuộc hệ được mở khóa và tổng số Chuồng hệ đó từng mua, kể cả những Chuồng đã bán. Ví dụ Chuồng Lửa tiếp theo giá '+money(habitatPurchaseCost('fire'))+' vàng; Chuồng Time tiếp theo giá '+money(habitatPurchaseCost('time'))+' vàng. Shop hiển thị giá thực tế và số lần mua.',
      'Giá nâng cấp và tiền hoàn khi bán tính trên giá mua của chính Chuồng đó; mua thêm Chuồng không đổi chi phí nâng cấp hoặc giá bán của Chuồng cũ.',
      'Chỉ Chuồng được bán hoặc cất vào Inventory; phải chuyển hết rồng trước khi bán. Công trình khác chỉ được di chuyển hoặc nâng cấp nếu có hỗ trợ.',
      'Số Nông trại tối đa ở level hiện tại: '+farmLimit(state.player.level)+'. Mỗi '+window.DragonEconomy.progression.farmEveryLevels+' level người chơi mở thêm một ô, tối đa '+window.DragonEconomy.progression.maxFarms+'.',
      'Nâng cấp công trình cần đủ đất trống cho diện tích mới. Lồng ấp có thể nâng đến level '+DATA.buildings.hatchery.maxLevel+'; giới hạn mỗi lượt ấp vẫn là một trứng.'
    ]);
}
function guideResources(){
  const crops=DATA.crops.map((crop,index)=>[esc(crop.name),'Farm Lv'+(index+1),money(crop.cost)+' vàng',
    duration(crop.duration),money(crop.yield)+' thức ăn']);
  const progression=window.DragonEconomy.progression;
  const rarityEntries=Object.entries(DATA.rarities);
  const goldRows=[1,10,30,50,100].map(function(level){
    const steps=level-1,scale=1+progression.goldLevelLinear*steps+
      progression.goldLevelQuadratic*steps*steps;
    return [String(level),...rarityEntries.map(([,rarity])=>money(Math.round(rarity.income*scale)))];
  });
  const xpRows=[1,5,10,20,30,40,50].map(level=>[
    String(level)+' → '+(level+1),money(playerXPNeeded(level))+' XP',
    money(progression.levelGoldBase+progression.levelGoldStep*(level+1))+' vàng',
    money(progression.levelFoodBase+progression.levelFoodStep*(level+1))+' thức ăn',
    String(progression.levelGems+((level+1)%5===0?progression.milestoneGemBonus:0))+' gem']);
  return '<h3>Tiền, thức ăn và gem</h3>'+guideList([
    'Chỉ rồng đang ở Chuồng hoạt động trên đảo mới tạo vàng và gem. Chuồng đã cất, rồng chưa có Chuồng hoặc rồng đã bán không tạo thu nhập. Tài nguyên đã tích trong Chuồng vẫn giữ lại sau khi bán hoặc chuyển rồng.',
    'Vàng cơ sở dựa vào bậc hiếm và level rồng; hạnh phúc, đói và cấp Chuồng điều chỉnh tiếp. Khi Chuồng đầy vàng, phải thu trước khi sản xuất tiếp.',
    'Mỗi rồng trong Chuồng hoạt động tạo '+DATA.gemPerDragonPerHour+' gem mỗi giờ, không tăng theo level. Tiến độ gem theo từng rồng được giữ khi chuyển Chuồng; Chuồng đầy gem thì dừng tạo thêm.',
    'Thức ăn dùng để cho rồng ăn và một số nâng cấp. Shop bán với giá '+money(window.DragonEconomy.progression.foodGoldPrice)+' vàng / thức ăn; Nông trại trồng cây để thu hoạch.',
    'Shop tính giá trứng 1 hệ theo giá gốc của giống và mốc mở hệ; hệ mở muộn có giá cao hơn. Công trình có giá niêm yết; Chuồng tăng giá theo hệ và số lần đã mua, kể cả sau khi bán.',
    'Gem dùng mua đảo, một số trứng và tua thời gian; mỗi 5 phút còn lại khi tua tương ứng khoảng một gem.',
    'Mỗi lần tăng player level nhận vàng, thức ăn và gem; các level chia hết cho 5 có thêm gem.'
  ])+'<h3>Vàng cơ sở theo level rồng · mỗi giờ</h3>'+guideTable(
    ['Level',...rarityEntries.map(([,rarity])=>esc(rarity.name))],goldRows)+
    '<p class="muted">Các giá trị mẫu trước hệ số hạnh phúc, đói, cấp Chuồng và sức chứa; sản lượng thực tế hiện trên Chuồng và thẻ rồng.</p>'+
    '<h3>XP và thưởng khi lên Player Level</h3>'+guideTable(['Từ → đến','XP cần','Vàng thưởng','Thức ăn thưởng','Gem thưởng'],xpRows)+
    '<p class="muted">Các mốc mẫu lấy từ công thức hiện tại. Player Level tối đa là 60; trứng nở, thu hoạch, mở đất và đảo đều có thể cho XP.</p>'+
    '<h3>Cây trồng ở Nông trại</h3>'+guideTable(['Cây','Mở tại','Chi phí','Thời gian','Thu hoạch Lv1'],crops)+
    '<p class="muted">Nông trại cấp cao tăng lượng thu hoạch thêm 20% cho mỗi level trên 1.</p>'+ 
    '<h3>Inventory và trứng</h3>'+guideList([
      'Inventory hiện chứa trứng đang chờ ô ấp và các Chuồng đã cất. Chuồng cất giữ level, nhưng rồng trong đó ngừng tạo vàng và gem.',
      'Trứng mua trong Shop là rồng 1 hệ. Trứng chưa có ô ấp ở Inventory; trứng nở chỉ được đặt vào Chuồng có hệ phù hợp.',
      'Trứng đã ấp xong của giống từng khám phá có thể bán; trứng giống mới cần nở để ghi vào Dragon Book.'
    ]);
}
function guideArena(){
  return '<h3>Đội hình và lượt đánh</h3>'+guideList([
    'Xây Arena để hiện nút Arena trên menu truy cập nhanh; chọn đúng ba rồng từ level 10 cho đội tấn công và ba rồng cho đội phòng thủ. Rồng đang lai không tham gia.',
    'Arena đánh theo lượt. Người chơi chọn skill hoặc đổi rồng (tốn một lượt); đội phòng thủ chọn skill đang mở và không hồi chiêu theo sát thương dự kiến sau giáp, xung khắc và hiệu ứng hữu ích.',
    'Bốn ô skill mở theo level '+DATA.progression.skillUnlockLevels.join(', ')+'. Special Skill có cooldown; buff/hồi máu thuần không gây sát thương.',
    'Skill hệ dùng hệ của chính skill để khắc hệ chủ đạo của mục tiêu. ▲ Strong nhân 1,5; ▼ Weak nhân 0,75; skill thường không có hệ nên hệ số là 1.',
    'Sát thương còn chịu giáp, biến thiên ngẫu nhiên khoảng 90–110%, trạng thái đang có và chí mạng. Xác suất crit 10%, hệ số crit 1,5.',
    'Dưới HP có icon trạng thái và số lượt còn lại: tăng/giảm tấn công, giáp, giảm sát thương, độc, đóng băng, hồi phục, tăng HP và giảm chính xác.',
    'Special Skill có thể hồi máu, tẩy trạng thái xấu, tăng HP tối đa hoặc đánh 2–3 nhịp có tỷ lệ hụt từng nhịp. Hiệu ứng cùng loại không cộng dồn: làm mới thời gian theo giá trị lớn hơn và giữ mức tác dụng mạnh hơn.',
    'Thắng nhận vàng, thức ăn và gem; thua hoặc bỏ trận tính là thua và chờ 15 phút trước trận tiếp theo.'
  ])+'<div class="guide-callout">Chỉ báo Strong/Weak ở ô skill theo đối thủ đang đứng sân; khi đổi rồng, chúng được tính lại.</div>';
}
function guideChallenge(){
  return '<h3>Thách đấu trực tiếp</h3>'+guideList([
    'Có ít nhất ba rồng từ level 10 để hiện nút Thách đấu. Không cần xây Arena.',
    'Danh sách chỉ hiển thị người chơi đủ điều kiện, bật nhận lời mời và còn online. Online được tính khi bản lưu tiến trình trên máy chủ mới hơn 35 giây; game tự lưu khoảng mỗi 10 giây.',
    'Gửi lời mời và chờ đối thủ xác nhận trong 30 giây. Nếu đối thủ từ chối hoặc hết thời gian, cả hai được thông báo.',
    'Sau khi đồng ý, mỗi bên chọn riêng ba rồng đủ level và không đang lai. Đối thủ chỉ thấy bạn đã sẵn sàng, không thấy đội hình cho đến lúc cả hai chốt.',
    'Trận đấu dùng skill và luật sát thương Arena, nhưng hai người chơi tự chọn lượt. Không có vàng, thức ăn, gem hoặc thời gian hồi sau trận.',
    'Mỗi tài khoản chỉ nhận một lời mời hoặc tham gia một trận cùng lúc. Công tắc nhận thách đấu có thể bật/tắt; đăng xuất hoặc ngừng lưu tiến trình sẽ đưa tài khoản về offline.'
  ]);
}
function guideSpecialSkills(){
  const detail=function(skill){
    const e=skill.effect,percent=value=>+(value*100).toFixed(2)+'%',turns=e.duration+' lượt',
      attack=skill.power>0?'Đòn đánh gây sát thương hệ theo '+percent(skill.power)+' tấn công gốc + '+
        percent(skill.bonus||0)+' bổ sung, sau đó áp dụng khắc hệ, giáp và chí mạng. ':'Chiêu hỗ trợ thuần, không gây sát thương. ';
    const effect={
      poison:()=>`Gây độc lên mục tiêu, mất ${percent(e.value)} HP tối đa mỗi lượt trong ${turns}.`,
      regen:()=>`Hồi ${percent(e.value)} HP tối đa mỗi lượt trong ${turns}.`,
      heal:()=>`Hồi ngay ${percent(e.value)} HP tối đa.`,
      cleanse:()=>`Gỡ các trạng thái bất lợi và hồi ngay ${percent(e.value)} HP tối đa.`,
      vitality:()=>`Tăng HP tối đa ${percent(e.value)} trong ${turns} và hồi lượng HP tương ứng.`,
      freeze:()=>`Đóng băng mục tiêu trong ${turns}, khiến mục tiêu mất lượt hành động.`,
      multi:()=>`Tấn công ${e.hits} nhịp; mỗi nhịp có ${percent(e.missChance)} xác suất hụt và tính sát thương riêng.`,
      damage_up:()=>`Tăng sát thương gây ra ${percent(e.value)} trong ${turns}.`,
      damage_down:()=>`Giảm sát thương mục tiêu gây ra ${percent(e.value)} trong ${turns}.`,
      armor_up:()=>`Tăng giáp của bản thân ${percent(e.value)} trong ${turns}.`,
      armor_down:()=>`Giảm giáp mục tiêu ${percent(e.value)} trong ${turns}.`,
      damage_reduction:()=>`Giảm sát thương bản thân nhận vào ${percent(e.value)} trong ${turns}.`,
      accuracy_down:()=>`Giảm độ chính xác mục tiêu ${percent(e.value)} trong ${turns}.`
    };
    return attack+(effect[e.kind]?.()||esc(skill.description))+' Hồi chiêu '+skill.cooldown+' lượt.';
  };
  const groups=Object.keys(DATA.elements).map(function(element){
    const cards=DOUBLE_IDS.filter(id=>DATA.species[id].elements[0]===element).map(function(id){
      const skill=skillsForSpecies(DATA.species[id])[3];
      return '<article class="guide-special-card"><h4>'+skillHex(skill)+' '+esc(skill.name)+'</h4><p>'+detail(skill)+'</p></article>';
    });
    return '<details class="guide-special-group"><summary>'+elementFlag(element,false,'sm')+' '+
      esc(DATA.elements[element].name)+' · '+cards.length+' chiêu</summary><div class="guide-special-cards">'+cards.join('')+'</div></details>';
  });
  return '<p>Mỗi hệ Double Element có hai Special Skill ở ô thứ tư. Biểu tượng, tên và tác dụng lấy từ danh mục skill đang dùng trong Arena.</p>'+
    '<div class="guide-callout">Skill hỗ trợ thuần gây 0 sát thương. Skill có đòn đánh chịu giáp, hệ số khắc hệ và tỉ lệ chí mạng; đòn nhiều nhịp kiểm tra hụt riêng từng nhịp. Cùng một loại trạng thái không cộng dồn.</div>'+groups.join('');
}
function guideElements(){
  const ids=Object.keys(DATA.elements),chart=DRAGON_DB.typeChart;
  const rows=ids.map(function(id){
    const strong=ids.filter(target=>chart[id][target]>1);
    const weak=ids.filter(source=>chart[source][id]>1);
    const flags=items=>'<span class="guide-flag-list">'+items.map(e=>elementFlag(e,false,'sm')).join('')+'</span>';
    return [elementFlag(id,true,'sm'),flags(strong),flags(weak)];
  });
  return '<p>Hệ của skill quyết định hệ mà rồng có thể khắc; hệ chủ đạo của mục tiêu quyết định nó bị khắc bởi hệ nào. Mỗi hệ khắc đúng hai hệ và bị đúng hai hệ khác khắc.</p>'+ 
    guideTable(['Hệ','Đánh mạnh vào ×1,5','Bị khắc bởi ×1,5'],rows)+
    '<p class="muted">Chạm hoặc rê chuột lên cờ để xem tên hệ. Đánh vào hệ khắc lại mình gây ×0,75 sát thương. Các cặp còn lại ×1. Rồng đa hệ vẫn chỉ dùng hệ đầu tiên để nhận sát thương hệ.</p>';
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
