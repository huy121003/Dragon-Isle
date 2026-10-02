"use strict";

/* GUIDE: Breeding and incubation guide section. */
function guideBreeding(){
  const rules=window.DragonConfig.breeding;
  const percent=value=>(value*100).toLocaleString('vi-VN',{maximumFractionDigits:2});
  const tierRows=Object.entries(window.DragonConfig.breeding.tierWeights).map(([parents,weights])=>[
    esc(parents.replace('+',' + ')),weights[0]+'% / '+weights[1]+'%']);
  const samples=[
    ['Fire Dragon',DATA.species.fire],
    ['Water Dragon',DATA.species.water],
    ['Rồng 2 hệ mẫu',DATA.species[Object.keys(DATA.species).find(id=>DATA.species[id].elements.length===2)]],
    ['Rồng 3 hệ mẫu',DATA.species[TRIPLE_IDS[0]]],
    ['Rồng 4 hệ mẫu',DATA.species[FOUR_IDS[0]]],
    ['Double Element mẫu',DATA.species[DOUBLE_IDS[0]]]
  ].filter(row=>row[1]);
  const durationRows=samples.map(([label,species])=>[
    label,duration(breedingSeconds(species,1,null)),
    duration(breedingSeconds(species,1,{type:'premiumCave'})),duration(hatchingSeconds(species))]);
  return '<h3>Điều kiện và tỷ lệ</h3>'+guideList([
    'Hai cá thể khác nhau từ level '+window.DragonConfig.progression.breedLevel+' có thể lai. Trứng được xác định ngay khi bấm Start breeding; tua thời gian không quay lại kết quả.',
    'Thời gian lai tăng theo bậc rồng có thể sinh ra, độ muộn của các hệ và độ phức tạp của cặp bố mẹ. Tổ hợp có nhiều hệ khác nhau hoặc bố mẹ khác bậc sẽ cộng thêm thời gian; Hang Premium vẫn nhanh hơn '+Math.round((1-rules.premium.timeFactor)*100)+'%.',
    'Thông thường con chỉ dùng hệ có trong bố mẹ. Rồng 1 hệ có thể lấy một hệ từ bố hoặc mẹ; từ 2 hệ trở lên phải có ít nhất một hệ của mỗi bên. Rồng 2 hệ xét cả hai thứ tự hệ chủ đạo; rồng 3 hệ không lặp thứ tự hai hệ phụ. Double Element là ngoại lệ về hệ phụ.',
    'Nếu có kết quả 3 hệ: tỷ lệ gốc '+percent(rules.three.base)+'%, cộng '+percent(rules.three.perTenLevels)+' điểm % mỗi 10 level trung bình, tối đa '+percent(rules.three.cap)+'%.',
    'Rồng 4 hệ cần đúng hai bố mẹ 3 hệ với ít nhất 4 hệ khác nhau khi gộp lại. Cả bốn hệ của con đều lấy từ bố mẹ và tra theo '+FOUR_IDS.length+' tổ hợp được ghi trong danh mục. Nếu bộ hệ của bố mẹ không chứa tổ hợp nào trong danh mục thì xác suất rồng 4 hệ bằng 0. Tỷ lệ '+percent(rules.four.base)+'% ban đầu, tăng theo level trung bình từ '+rules.four.growthStartLevel+' và tối đa '+percent(rules.four.cap)+'%.',
    'Double Element cần hai bố mẹ đều có 4 ô hệ, mỗi bên có ít nhất 3 hệ khác nhau, cùng hệ chủ đạo và từ level '+rules.double.minParentLevel+'. Hai giống Double của hệ chủ đạo đó đều có cơ hội xuất hiện, kể cả khi hệ phụ không có trong bố mẹ. Tỷ lệ '+percent(rules.double.base)+'% ban đầu, tối đa '+percent(rules.double.cap)+'%.',
    'Phần còn lại chia cho 1 và 2 hệ theo bảng dưới nếu có kết quả hợp lệ. Trong mỗi bậc, giống nhận hệ chung của bố mẹ có trọng số cao hơn; tỷ lệ từng giống có thể khác nhau.',
    'Hang Lai Tinh Tú mua một lần với '+money(window.DragonConfig.buildings.definitions.premiumCave.cost)+' gem, không bán hay cất kho. Tỷ lệ của mỗi kết quả từ 3 hệ trở lên nhân '+rules.premium.rareFactor+' (ví dụ 2% thành '+(2*rules.premium.rareFactor).toLocaleString('vi-VN')+'%), phần tăng lấy từ nhóm 1–2 hệ để tổng vẫn là 100%. Thời gian lai giảm '+Math.round((1-rules.premium.timeFactor)*100)+'%.'
  ])+'<h3>Tỷ lệ chia phần còn lại cho 1 / 2 hệ</h3>'+guideTable(['Số hệ bố mẹ','1 hệ / 2 hệ'],tierRows)+
    '<h3>Thời gian lai và ấp theo bậc rồng con</h3>'+guideTable(['Bậc','Hang thường','Hang xịn','Trong Lồng ấp'],durationRows)+
    '<p class="muted">Thời gian mới áp dụng khi bắt đầu lượt lai hoặc ấp mới; đồng hồ của lượt đã bắt đầu giữ thời điểm hoàn tất đã lưu.</p><h3>Nhận trứng</h3>'+guideList([
      'Hang lai không thể mở lượt mới khi chưa lấy trứng của lượt trước. Trứng lai từ Hang đó phải được ấp xong hoặc bán trước khi dùng Hang cho lượt khác.',
      'Lồng ấp có 1–'+window.DragonConfig.buildings.definitions.hatchery.maxLevel+' ô theo level, mỗi ô ấp một trứng độc lập. Trứng hoàn tất vẫn chiếm ô cho đến khi nở hoặc được bán; trứng dư ở Inventory tự vào ô trống.',
      'Khi trứng nở, cần Chuồng còn chỗ và cùng ít nhất một hệ của rồng. Giống mới được ghi vào Dragon Book; công thức của cặp bố mẹ được lưu trong Recipes.'
    ])+'<div class="guide-callout">Trong Hang lai, tỷ lệ theo bậc là tổng các giống cùng bậc; mở từng nhóm để xem tỷ lệ chính xác của từng giống.</div>';
}
