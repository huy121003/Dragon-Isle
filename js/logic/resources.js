"use strict";

/**
 * Resource mutation helpers shared by multiple gameplay services.
 */
function spendGold(cost){if(state.gold<cost){toast("Not enough gold.");return false;}state.gold-=cost;return true;}
/* LOGIC: Gói thử nghiệm nạp đến mức tối thiểu, không cộng dồn vô hạn khi chạm nhiều lần. */
function topUpTestResources(showNotice){
  const amounts=DATA.testResources;
  state.gold=Math.max(state.gold,amounts.gold);
  state.food=Math.max(state.food,amounts.food);
  state.gems=Math.max(state.gems,amounts.gems);
  if(showNotice){
    toast("Test resources granted: 10 million gold, 100,000 food and 10,000 gems.");
    updateUI();saveGame();
  }
}
