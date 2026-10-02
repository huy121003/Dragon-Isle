"use strict";

/* GUIDE: Island, land and building guide section. */
function guideIslands(){
  const islands=DATA.islands.map((island,index)=>{
    const level=island.element?contentRequirementLevel(Math.max(island.playerLevel||1,DATA.elementUnlocks[island.element]||1)):1;
    return [(index+1)+'. '+esc(island.name),esc(island.element?DATA.elements[island.element].name:'Khởi đầu'),
      index?'Lv'+level:'—',index?money(islandUnlockCost(index))+' 💎':'Có sẵn'];
  });
  const unlocks=Object.entries(DATA.elementUnlocks).map(function([element,level]){
    level=contentRequirementLevel(level);
    const egg=DATA.species[element],price=egg?.detail.giaTrung?shopEggPrice(egg):null;
    return [esc(DATA.elements[element].name),String(level),price?
      (price.vang?money(price.vang)+' vàng':money(price.gem)+' gem'):'—'];
  });
  const buildings=Object.entries(DATA.buildings).map(([type,b])=>{
    const balance=window.DragonConfig.buildings.definitions[type];
    return [esc(b.name),type==='hatchery'?'Có sẵn':type==='habitat'?'Theo hệ và lượt mua':
      money(balance.cost)+(type==='premiumCave'?' gem':' vàng'),
      String(balance.maxLevel),type==='habitat'?'Có thể bán/cất':type==='hatchery'?'Có sẵn; không bán':'Không bán/cất'];
  });
  const capacityRows=Array.from({length:window.DragonConfig.buildings.definitions.habitat.maxLevel},(_,index)=>{
    const level=index+1,fire={type:'habitat',element:'fire',level},time={type:'habitat',element:'time',level};
    return [String(level),String(habitatCapacity(level)),
      money(habitatGoldCapacity(fire)),money(habitatGoldCapacity(time)),
      money(habitatGemCapacity(fire)),money(habitatGemCapacity(time))];
  });
  const habitatBalanceRows=Object.keys(DATA.elements).map(element=>{
    const sample={type:'habitat',element,level:1};
    const lv2={type:'habitat',element,level:1};
    const lv3={type:'habitat',element,level:2};
    const lv4={type:'habitat',element,level:3};
    return [esc(DATA.elements[element].name),
      'Lv'+contentRequirementLevel(DATA.elementUnlocks[element]||1),
      money(habitatPurchaseCost(element,0)),
      (money(standardUpgradeCost(lv2).gold)+'G + '+money(standardUpgradeCost(lv2).gems)+'💎')+' / '+
      (money(standardUpgradeCost(lv3).gold)+'G + '+money(standardUpgradeCost(lv3).gems)+'💎')+' / '+
      (money(standardUpgradeCost(lv4).gold)+'G + '+money(standardUpgradeCost(lv4).gems)+'💎'),
      duration(upgradeSeconds(lv2))+' / '+duration(upgradeSeconds(lv3))+' / '+duration(upgradeSeconds(lv4))];
  });
  const hatcheryRows=window.DragonConfig.buildings.hatchery.nests.map((nests,index)=>[
    String(index+1),String(nests),index<window.DragonConfig.progression.hatcheryUpgradeLevels.length?
      'Player Lv'+window.DragonConfig.progression.hatcheryUpgradeLevels[index]:'—']);
  return '<h3>Đất, đảo và hệ mở khóa</h3>'+guideList([
    'Đảo mở tuần tự: cần mở hết vùng của đảo trước, đạt level mua trứng hệ đảo, sở hữu ít nhất một rồng có hệ đó và đủ gem. Rồng lai có chứa hệ đảo cũng được tính.',
    'Mở một vùng đất nhận '+window.DragonConfig.progression.xpSources.land+' XP người chơi; mua đảo mới nhận '+window.DragonConfig.progression.xpSources.island+' XP.',
    'Chuồng và trứng 1 hệ trong Shop mở theo level hệ bên dưới. Vùng đất mở theo ô vuông và phải nối với vùng đã sở hữu.'
  ])+guideTable(['Đảo','Hệ','Level yêu cầu','Giá'],islands)+
    '<h3>Level mở Shop theo hệ</h3>'+guideTable(['Hệ','Player level','Giá trứng 1 hệ'],unlocks)+
    '<h3>Công trình</h3>'+guideTable(['Loại','Giá khởi điểm','Level tối đa','Kho / bán'],buildings)+
    '<h3>Giá và thời gian Habitat theo hệ</h3>'+guideTable(['Hệ','Mở','Giá mua đầu','Nâng Lv2 / Lv3 / Lv4','Thời gian Lv2 / Lv3 / Lv4'],habitatBalanceRows)+
    '<h3>Sức chứa Habitat theo cấp</h3>'+guideTable(['Cấp','Rồng','Vàng Lửa','Vàng Time','Gem Lửa','Gem Time'],capacityRows)+
    '<h3>Sức chứa Hatchery</h3>'+guideTable(['Cấp','Nest','Level nâng cấp yêu cầu'],hatcheryRows)+
    guideList([
      'Chuồng cấp 1–4 chứa lần lượt '+window.DragonConfig.buildings.habitat.dragonCapacity.join(', ')+' rồng cùng hệ phù hợp. Sức chứa vàng và gem cũng tăng theo cấp Chuồng.',
      'Giá Chuồng phụ thuộc hệ được mở khóa và tổng số Chuồng hệ đó từng mua, kể cả những Chuồng đã bán. Ví dụ Chuồng Lửa tiếp theo giá '+money(habitatPurchaseCost('fire'))+' vàng; Chuồng Time tiếp theo giá '+money(habitatPurchaseCost('time'))+' vàng. Shop hiển thị giá thực tế và số lần mua.',
      'Giá mua Chuồng tăng theo số lần mua cùng hệ. Giá nâng cấp không phụ thuộc số thứ tự mua mà phụ thuộc hệ và cấp Chuồng; hệ mở càng muộn thì giá, Gem yêu cầu và thời gian nâng càng cao. Các nâng cấp trước đây chỉ tốn vàng nay đều yêu cầu cả Gold + Gem; Dragon Academy vẫn giữ Gold + Food + Gem. Tiền bán vẫn dựa trên giá mua thực tế của Chuồng đó.',
      'Chỉ Chuồng được bán hoặc cất vào Inventory; phải chuyển hết rồng trước khi bán. Công trình khác chỉ được di chuyển hoặc nâng cấp nếu có hỗ trợ.',
      'Tất cả yêu cầu mở khóa và nâng cấp chỉ xét đến Player Lv'+window.DragonConfig.progression.contentLevelCap+'. Từ Lv'+window.DragonConfig.progression.contentLevelCap+' trở lên không mở thêm quyền mới; level tiếp tục tăng và chỉ nhận thưởng Gold/Food/Gem. Số Nông trại tối đa là '+window.DragonConfig.progression.farms.maxFarms+'.',
      'Nâng cấp công trình cần đủ đất trống cho diện tích mới. Lồng ấp có thể nâng đến level '+window.DragonConfig.buildings.definitions.hatchery.maxLevel+'; mỗi level mở thêm một ô ấp trứng.'
    ]);
}
