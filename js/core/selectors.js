"use strict";

/**
 * Small state selectors/lookups.
 */
function buildingById(id){return state.buildings.find(function(b){return b.id===id;});}
function dragonById(id){return state.dragons.find(function(d){return d.id===id;});}
function occupants(building){return state.dragons.filter(function(d){return d.habitatId===building.id;});}
function maxBuildingLevel(building){return DATA.buildings[building.type].maxLevel;}
