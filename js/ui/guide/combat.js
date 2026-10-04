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
    'Chiêu không hệ gây 50% hoặc 70% tấn công gốc; chiêu hệ gây 90% hoặc 110% tấn công gốc trước khắc hệ. Hệ của skill khắc hệ chủ đạo của mục tiêu. ▲ Strong nhân '+strong+'; ▼ Weak nhân '+weak+'; skill không có hệ dùng hệ số 1.',
    'Sát thương còn chịu giáp, biến thiên ngẫu nhiên khoảng '+Math.round(combat.variance.min*100)+'–'+Math.round(combat.variance.max*100)+'%, trạng thái đang có và chí mạng. Xác suất crit '+critChance+'%, hệ số crit '+combat.critical.multiplier+'.',
    'Dưới HP của cả rồng trên sân và dự bị có biểu tượng trạng thái cùng số lượt còn lại. Độc, thiêu đốt và nguyền vẫn tác dụng lên rồng dự bị; tổng sát thương này tối đa 10% HP tối đa mỗi lượt.',
    'Hiệu ứng cùng loại không cộng dồn và không kéo dài thời gian đang có. Đổi rồng không chuyển trạng thái sang rồng mới. Hồi sinh chỉ dùng một lần cho cả đội mỗi trận.',
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
  function skillCard(skill,element){
    const copy={...skill,element:skill.element||element||null};
    const damage=skill.power>0?'Gây '+Math.round(skill.power*100)+'% ATK trước giáp, biến thiên và khắc hệ.':'Không gây sát thương trực tiếp.';
    const description=skill.special?(skill.descriptionVi||skill.description||'')+' Hồi chiêu '+skill.cooldown+' lượt.':
      (skill.descriptionVi||skill.description||damage);
    return '<article class="guide-skill-card"><h4>'+skillHex(copy)+'<span class="skill-name" title="'+esc(skill.name)+'">'+esc(skill.name)+'</span></h4><p class="guide-skill-desc" title="'+esc(description)+'">'+esc(description)+'</p>'+
      '<small>'+(skill.special?(skill.apex?'Apex signature skill':'Double special skill'):skill.power>0?'Sát thương '+Math.round(skill.power*100)+'% ATK':'Hỗ trợ')+
      (skill.special?' · hồi chiêu '+skill.cooldown+' lượt':'')+'</small></article>';
  }
  const normal=(DATA.skills.neutral||[]).map(skill=>skillCard(skill,null)).join('');
  const groups=Object.keys(DATA.elements).map(function(element){
    const skills=(DATA.skills.elemental[element]||[]).map(skill=>skillCard(skill,element));
    return '<details class="guide-special-group"><summary>'+elementFlag(element,false,'sm')+' '+
      esc(DATA.elements[element].name)+' · '+skills.length+' chiêu</summary><div class="guide-special-cards">'+skills.join('')+'</div></details>';
  });
  return '<p>Danh mục dưới đây gồm toàn bộ đòn đánh thường, đòn đánh hệ, chiêu đặc biệt Double và chiêu đặc biệt Apex. Sát thương được tính theo ATK của rồng trước giáp, biến thiên, chí mạng và khắc hệ; chiêu hỗ trợ có thể không gây sát thương trực tiếp.</p>'+
    '<h3>Đòn đánh thường</h3><div class="guide-special-cards">'+normal+'</div>'+
    '<div class="guide-callout">Skill hệ có hai mức sát thương 90% và 110% ATK. Mỗi rồng Double có một chiêu đặc biệt ở ô thứ tư; mỗi rồng Apex có ba chiêu Double và một chiêu Apex riêng ở bốn ô.</div>'+
    groups.join('');
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
