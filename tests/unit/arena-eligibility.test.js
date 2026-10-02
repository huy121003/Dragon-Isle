import {describe,it,expect} from 'vitest';
import eligibility from '../../server/arena/eligibility.cjs';

const {createEligibility}=eligibility;
const {eligible,ownedTeam,summary}=createEligibility();
const dragons=[1,2,3].map(id=>({id,level:10,species:'fire'}));

describe('battle eligibility during breeding',()=>{
  for(const type of ['cave','premiumCave']){
    it(`keeps parents in a ${type} unavailable until their egg is collected`,()=>{
      const profile={dragons,buildings:[{type,breeding:{fatherId:1,motherId:2,
        readyAt:Date.now()-3600000}}]};
      expect(eligible(profile,dragons[0])).toBe(false);
      expect(eligible(profile,dragons[1])).toBe(false);
      expect(eligible(profile,dragons[2])).toBe(true);
      expect(ownedTeam(profile,[1,2,3])).toBe(false);
      expect(summary(profile,[1])[0]).toMatchObject({canBattle:false,battleReason:'Breeding'});
      profile.buildings[0].breeding=null;
      expect(ownedTeam(profile,[1,2,3])).toBe(true);
    });
  }

  it('explains the upper level limit to the roster',()=>{
    const profile={dragons:[{...dragons[0],level:101}],buildings:[]};
    expect(summary(profile,[1])[0]).toMatchObject({canBattle:false,battleReason:'Maximum level 100'});
  });
});
