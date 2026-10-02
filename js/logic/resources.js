"use strict";

/**
 * Resource mutation helpers shared by multiple gameplay services.
 */
/** Spend Gold atomically; returns false and shows feedback when balance is insufficient. */
function spendGold(cost){if(state.gold<cost){toast("Not enough gold.");return false;}state.gold-=cost;return true;}
/* LOGIC: Gói thử nghiệm nạp đến mức tối thiểu, không cộng dồn vô hạn khi chạm nhiều lần. */
/** Raise test resources to configured minimums without stacking repeated grants. */
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
