"use strict";

/* GUIDE: Dragon progression/care guide section. */
function guideDragons(){
  const progression=window.DragonConfig.progression,combat=window.DragonConfig.combat,world=window.DragonConfig.world;
  const level=progression.skillUnlockLevels,academy=progression.academyCaps;
  const maxStars=combat.star.max,starPct=Math.round(combat.star.statBonusPerStar*100);
  const academyRows=academy.map((cap,index)=>{
    if(index===0)return ['1',String(cap),'—','—','—','—','Có sẵn sau khi xây'];
    const cost=academyUpgradeCost(index);
    return [String(index+1),String(cap),'Lv'+cost.playerLevel,
      cost.requiredDragons+' rồng Lv'+cost.requiredDragonLevel+'+',
      money(cost.gold),money(cost.food),money(cost.gems)+' · '+duration(window.DragonConfig.buildings.upgradeTimes.academy[index-1])];
  });
  const starRows=progression.starUpgrades.map((rule,index)=>[
    String(index+1)+' ★','+'+((index+1)*starPct)+'%',String(rule.dragons)+' rồng cùng giống, Lv'+rule.level+'+',
    money(rule.gold),money(rule.food),money(rule.gems)]);
  return '<h3>Giống, hệ và chỉ số</h3>'+guideList([
    'Game có '+Object.keys(DATA.elements).length+' hệ và '+BOOK_SPECIES_IDS.length+' giống trong Dragon Book. Hệ đầu tiên là hệ chủ đạo; rồng 2 hệ đảo thứ tự là hai giống khác nhau.',
    'Rồng 3 hệ giữ hệ chủ đạo và một cặp hệ phụ duy nhất; rồng 4 hệ có bốn hệ khác nhau. Double Element có bốn slot nhưng chỉ ba hệ thật: hệ chủ đạo lặp hai lần.',
    'HP, tấn công và phòng thủ lấy từ chỉ số từng hệ, trọng số vị trí hệ, bậc hiếm và level. Arena đánh theo lượt, không có chỉ số tốc độ.'
  ])+'<h3>Cho ăn và mở skill</h3>'+guideList([
    'Cho rồng ăn '+world.feeding.feedsPerLevel+' lần để tăng một level. Mỗi lần ở level 1 tốn '+money(dragonFeedCost(1))+' thức ăn; ở level 30 tốn '+money(dragonFeedCost(30))+'. Chi phí tăng theo level.',
    'Bốn vị trí skill mở lần lượt ở level '+level.join(', ')+'. Skill thường dựa trên phần trăm tấn công gốc; skill hệ dùng tấn công gốc cộng phần sát thương hệ.',
    'Giới hạn level mặc định là '+window.DragonConfig.dragons.initialLevelCapWithoutAcademy+'; Dragon Academy nâng giới hạn lần lượt thành '+academy.join(', ')+'. Level tối đa của rồng là '+progression.dragonMaxLevel+'.',
    'Double Element có ba skill hệ và một special skill của hệ lặp. Special có hồi chiêu; skill hồi máu hoặc phòng thủ thuần không gây sát thương.'
  ])+'<h3>Dragon Academy</h3>'+
    guideTable(['Cấp Academy','Cap rồng','Player Lv','Rồng sở hữu yêu cầu','Gold','Food','Gem · thời gian'],academyRows)+
    '<p class="muted">Rồng dùng làm điều kiện Academy chỉ cần đang thuộc sở hữu và đạt level yêu cầu; không bị tiêu hao khi nâng cấp. Muốn nâng cấp tiếp phải phát triển đủ số rồng chạm cap của cấp Academy hiện tại.</p>'+
    '<h3>Nâng sao rồng</h3><p>Mỗi rồng bắt đầu với '+('☆'.repeat(maxStars))+'. Mỗi sao cộng thêm '+starPct+'% vào HP, tấn công và giáp theo chỉ số ở level hiện tại; tối đa '+('★'.repeat(maxStars))+' (+'+(maxStars*starPct)+'%). Nâng sao không tăng sản lượng vàng hoặc gem.</p>'+
    guideTable(['Sao mới','Chỉ số','Rồng hiến tế','Vàng','Thức ăn','Gem'],starRows)+
    '<p>Rồng hiến tế phải cùng đúng giống, 0 sao, không đang lai và đạt level yêu cầu. Game chọn rồng chưa vào Chuồng trước, sau đó chọn level thấp nhất đủ điều kiện. Rồng được chọn sẽ mất vĩnh viễn; rồng nâng sao vẫn giữ nguyên level và Chuồng.</p>'+
    '<div class="guide-callout">Vào Dragons để xem thức ăn, skill, chỉ số và nâng sao của từng rồng; Dragon Book ghi thông tin giống đã khám phá.</div>';
}
