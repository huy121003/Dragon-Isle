"use strict";

/* GUIDE: Arena, Challenge, special-skill and element-matchup guide sections. */
function guideArena(){
  const arena=window.DragonConfig.arena,combat=window.DragonConfig.combat;
  const values=Object.values(DRAGON_DB.typeChart).flatMap(row=>Object.values(row));
  const strong=Math.max(...values),weak=Math.min(...values);
  const critChance=Math.round(combat.critical.chance*100);
  return '<h3>Đội hình và lượt đánh</h3>'+guideList([
    'Xây Arena để hiện nút Arena trên menu truy cập nhanh; chọn đúng '+arena.teamSize+' rồng từ level '+arena.minBattleLevel+' cho đội tấn công. Rồng đang lai không tham gia.',
    'Arena tạo năm đối thủ máy lần đầu bạn vào đấu trường. Danh sách giữ nguyên qua các mốc hồi lượt; hạ hết năm đối thủ sẽ tạo vòng mới và hồi đầy lượt. Mỗi khung 8 giờ có ba lượt, làm mới lúc 00:00, 08:00 và 16:00 theo giờ Việt Nam; bạn cũng có thể dùng gem để hồi đầy lượt ngay.',
    'Arena đánh theo lượt. Chạm avatar rồng dự bị để đổi rồng mà không mất lượt, rồi chọn skill; đối thủ chọn skill đang mở theo sát thương dự kiến sau giáp, xung khắc và hiệu ứng hữu ích.',
    'Bốn ô skill mở theo level '+window.DragonConfig.progression.skillUnlockLevels.join(', ')+'. Special Skill có cooldown; buff/hồi máu thuần không gây sát thương.',
    'Skill hệ dùng hệ của chính skill để khắc hệ chủ đạo của mục tiêu. ▲ Strong nhân '+strong+'; ▼ Weak nhân '+weak+'; skill thường không có hệ nên hệ số là 1.',
    'Sát thương còn chịu giáp, biến thiên ngẫu nhiên khoảng '+Math.round(combat.variance.min*100)+'–'+Math.round(combat.variance.max*100)+'%, trạng thái đang có và chí mạng. Xác suất crit '+critChance+'%, hệ số crit '+combat.critical.multiplier+'.',
    'Dưới HP có icon trạng thái và số lượt còn lại: tăng/giảm tấn công, giáp, giảm sát thương, độc, đóng băng, hồi phục, tăng HP và giảm chính xác.',
    'Special Skill có thể hồi máu, tẩy trạng thái xấu, tăng HP tối đa hoặc đánh 2–3 nhịp có tỷ lệ hụt từng nhịp. Hiệu ứng cùng loại không cộng dồn: làm mới thời gian theo giá trị lớn hơn và giữ mức tác dụng mạnh hơn.',
    'Thắng nhận vàng, thức ăn và gem; thua hoặc bỏ trận đều tiêu hao một lượt.'
  ])+'<div class="guide-callout">Chỉ báo Strong/Weak ở ô skill theo đối thủ đang đứng sân; khi đổi rồng, chúng được tính lại.</div>';
}

function guideChallenge(){
  const challenge=window.DragonConfig.challenge,arena=window.DragonConfig.arena;
  const onlineSeconds=Math.round(challenge.lobbySaveFreshMs/1000),inviteSeconds=Math.round(challenge.inviteMs/1000);
  return '<h3>Thách đấu trực tiếp</h3>'+guideList([
    'Có ít nhất '+challenge.teamSize+' rồng từ level '+arena.minBattleLevel+' để hiện nút Thách đấu. Không cần xây Arena.',
    'Danh sách chỉ hiển thị người chơi đủ điều kiện, bật nhận lời mời và còn online. Online được tính khi bản lưu tiến trình trên máy chủ mới hơn '+onlineSeconds+' giây; game tự lưu định kỳ.',
    'Gửi lời mời và chờ đối thủ xác nhận trong '+inviteSeconds+' giây. Nếu đối thủ từ chối hoặc hết thời gian, cả hai được thông báo.',
    'Sau khi đồng ý, mỗi bên chọn riêng '+challenge.teamSize+' rồng đủ level và không đang lai. Đối thủ chỉ thấy bạn đã sẵn sàng, không thấy đội hình cho đến lúc cả hai chốt.',
    'Trận đấu dùng skill và luật sát thương Arena, nhưng hai người chơi tự chọn lượt. Không có vàng, thức ăn, gem hoặc thời gian hồi sau trận.',
    'Đổi sang rồng dự bị không mất lượt; người chơi vẫn có thể chọn skill ngay sau khi đổi.',
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
  return '<p>Mỗi hệ có ba Double Element Special Skill ở ô thứ tư. Mỗi rồng Double Element đang mang một trong ba chiêu của hệ chủ đạo. Biểu tượng, tên và tác dụng lấy từ danh mục skill đang dùng trong Arena.</p>'+
    '<div class="guide-callout">Skill hỗ trợ thuần gây 0 sát thương. Skill có đòn đánh chịu giáp, hệ số khắc hệ và tỉ lệ chí mạng; đòn nhiều nhịp kiểm tra hụt riêng từng nhịp. Cùng một loại trạng thái không cộng dồn.</div>'+groups.join('');
}

function guideElements(){
  const ids=Object.keys(DATA.elements),chart=DRAGON_DB.typeChart;
  const values=ids.flatMap(attacker=>ids.map(target=>chart[attacker][target]??1));
  const strongMultiplier=Math.max(...values),weakMultiplier=Math.min(...values);
  const rows=ids.map(function(id){
    const strong=ids.filter(target=>chart[id][target]>1);
    const weak=ids.filter(source=>chart[source][id]>1);
    const flags=items=>'<span class="guide-flag-list">'+items.map(e=>elementFlag(e,false,'sm')).join('')+'</span>';
    return [elementFlag(id,true,'sm'),flags(strong),flags(weak)];
  });
  return '<p>Hệ của skill quyết định hệ mà rồng có thể khắc; hệ chủ đạo của mục tiêu quyết định nó bị khắc bởi hệ nào. Mỗi hệ khắc đúng hai hệ và bị đúng hai hệ khác khắc.</p>'+ 
    guideTable(['Hệ','Đánh mạnh vào ×'+strongMultiplier,'Bị khắc bởi ×'+strongMultiplier],rows)+
    '<p class="muted">Chạm hoặc rê chuột lên cờ để xem tên hệ. Đánh vào hệ khắc lại mình gây ×'+weakMultiplier+' sát thương. Các cặp còn lại ×1. Rồng đa hệ vẫn chỉ dùng hệ đầu tiên để nhận sát thương hệ.</p>';
}
