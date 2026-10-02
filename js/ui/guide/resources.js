"use strict";

/* GUIDE: Economy/resource guide section. */
function guideResources(){
  const crops=DATA.crops.map((crop,index)=>[esc(crop.name),'Farm Lv'+(index+1),money(crop.cost)+' vàng',
    duration(crop.duration),money(crop.yield)+' thức ăn']);
  const progression=window.DragonConfig.progression,rewards=progression.rewards,income=progression.incomeGrowth;
  const rarityEntries=Object.entries(DATA.rarities);
  const goldRows=[1,10,30,50,100].map(function(level){
    const steps=level-1,scale=1+income.linear*steps+
      income.quadratic*steps*steps;
    return [String(level),...rarityEntries.map(([,rarity])=>money(Math.round(rarity.income*scale)))];
  });
  const xpLevels=[1,2,3,4,5,10,15,20,30,40,50,60,75,100,150,200];
  const xpRows=xpLevels.map(level=>[
    String(level)+' → '+(level+1),money(playerXPNeeded(level))+' XP',
    money(rewards.goldBase+rewards.goldStep*(level+1))+' vàng',
    money(rewards.foodBase+rewards.foodStep*(level+1))+' thức ăn',
    String(rewards.gems+((level+1)%rewards.milestoneEvery===0?rewards.milestoneGemBonus:0))+' gem']);
  const source=progression.xpSources;
  const xpSourceRows=[
    ['Xây công trình',Object.entries(source.buildingBuild).map(([type,xp])=>type+' '+xp).join(' · ')+' XP'],
    ['Nâng cấp công trình',''+source.buildingUpgradeBase+' + '+source.buildingUpgradePerLevel+' × cấp mới'],
    ['Mở vùng đất',source.land+' XP'],
    ['Mở đảo',source.island+' XP'],
    ['Thu hoạch cây',source.crop.join(' / ')+' XP theo bậc cây'],
    ['Ấp rồng đã biết',source.hatchKnown+' XP'],
    ['Khám phá rồng mới',source.hatchNew+' XP'],
    ['Hoàn tất lai tạo',source.breed+' XP'],
    ['Rồng tăng level',source.dragonLevelBase+' + '+source.dragonLevelPerTen+' XP mỗi 10 level rồng']
  ];
  return '<h3>Tiền, thức ăn và gem</h3>'+guideList([
    'Chỉ rồng đang ở Chuồng hoạt động trên đảo mới tạo vàng và gem. Chuồng đã cất, rồng chưa có Chuồng hoặc rồng đã bán không tạo thu nhập. Tài nguyên đã tích trong Chuồng vẫn giữ lại sau khi bán hoặc chuyển rồng.',
    'Vàng cơ sở dựa vào bậc hiếm và level rồng; hạnh phúc, đói và cấp Chuồng điều chỉnh tiếp. Khi Chuồng đầy vàng, phải thu trước khi sản xuất tiếp.',
    'Mỗi rồng trong Chuồng hoạt động tạo '+window.DragonConfig.world.gemPerDragonPerHour+' gem mỗi giờ, không tăng theo level. Tiến độ gem theo từng rồng được giữ khi chuyển Chuồng; Chuồng đầy gem thì dừng tạo thêm.',
    'Thức ăn dùng để cho rồng ăn và một số nâng cấp. Shop bán với giá '+money(window.DragonConfig.progression.foodGoldPrice)+' vàng / thức ăn; Nông trại trồng cây để thu hoạch.',
    'Shop tính giá trứng 1 hệ theo giá gốc của giống và mốc mở hệ; hệ mở muộn có giá cao hơn. Công trình có giá niêm yết; Chuồng tăng giá theo hệ và số lần đã mua, kể cả sau khi bán.',
    'Gem dùng mua đảo, một số trứng và tua thời gian; hiện tại khoảng '+Math.round(window.DragonConfig.timers.secondsPerGem/60)+' phút còn lại tương ứng một gem, có giới hạn chi phí tua tối đa.',
    'Mỗi lần tăng player level nhận vàng, thức ăn và gem; các level chia hết cho 5 có thêm gem.'
  ])+'<h3>Vàng cơ sở theo level rồng · mỗi giờ</h3>'+guideTable(
    ['Level',...rarityEntries.map(([,rarity])=>esc(rarity.name))],goldRows)+
    '<p class="muted">Các giá trị mẫu trước hệ số hạnh phúc, đói, cấp Chuồng và sức chứa; sản lượng thực tế hiện trên Chuồng và thẻ rồng.</p>'+
    '<h3>XP và thưởng khi lên Player Level</h3>'+guideTable(['Từ → đến','XP cần','Vàng thưởng','Thức ăn thưởng','Gem thưởng'],xpRows)+
    '<p class="muted">Các mốc mẫu lấy từ công thức hiện tại. Player Level không có giới hạn. Mọi yêu cầu gameplay dừng ở Lv'+progression.contentLevelCap+'; từ đó trở lên level tiếp tục tăng để nhận thưởng Gold/Food/Gem và XP cần vẫn tăng theo công thức.</p>'+
    '<h3>Nguồn XP Player Level</h3>'+guideTable(['Hoạt động','XP'],xpSourceRows)+
    '<h3>Cây trồng ở Nông trại</h3>'+guideTable(['Cây','Mở tại','Chi phí','Thời gian','Thu hoạch Lv1'],crops)+
    '<p class="muted">Nông trại cấp cao tăng lượng thu hoạch thêm 20% cho mỗi level trên 1.</p>'+ 
    '<h3>Inventory và trứng</h3>'+guideList([
      'Inventory hiện chứa trứng đang chờ ô ấp và các Chuồng đã cất. Chuồng cất giữ level, nhưng rồng trong đó ngừng tạo vàng và gem.',
      'Trứng mua trong Shop là rồng 1 hệ. Trứng chưa có ô ấp ở Inventory; trứng nở chỉ được đặt vào Chuồng có hệ phù hợp.',
      'Trứng đã ấp xong của giống từng khám phá có thể bán; trứng giống mới cần nở để ghi vào Dragon Book.'
    ]);
}
