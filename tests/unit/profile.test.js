import {describe,it,expect} from 'vitest';
import economyConfig from '../../js/config/economy.js';
import buildingConfig from '../../js/config/buildings.js';
import worldConfig from '../../js/config/world.js';
import profileModule from '../../server/profile.cjs';

const {newProfile}=profileModule;

describe('server new profile',()=>{
  it('uses centralized starter resources and building prices',()=>{
    const profile=newProfile();
    expect({
      gold:profile.gold,
      food:profile.food,
      gems:profile.gems
    }).toEqual(economyConfig.starting);

    const habitat=profile.buildings.find(building=>building.type==='habitat');
    expect(habitat).toBeTruthy();
    expect(habitat.purchaseCost).toBe(buildingConfig.definitions.habitat.cost);
    expect(Number.isFinite(habitat.purchaseCost)).toBe(true);
  });

  it('starts new admin profiles at level 100 with one million of each resource',()=>{
    const profile=newProfile({admin:true});
    expect(profile.player).toEqual({level:100,xp:0});
    expect({gold:profile.gold,food:profile.food,gems:profile.gems})
      .toEqual({gold:1_000_000,food:1_000_000,gems:1_000_000});
  });

  it('creates a valid starter footprint without balance data from game.json',()=>{
    const profile=newProfile();
    expect(profile.land.length).toBeGreaterThan(0);
    expect(profile.dragons).toHaveLength(1);
    expect(profile.dragons[0].species).toBe('fire');
    expect(profile.habitatPurchases.fire).toBe(1);
    expect({
      hunger:profile.dragons[0].hunger,
      happiness:profile.dragons[0].happiness
    }).toEqual(worldConfig.initialDragon);
  });
});
