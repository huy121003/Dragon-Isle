import {describe,it,expect} from 'vitest';
import missions from '../../server/daily-missions.cjs';
import missionConfig from '../../js/config/daily-missions.js';

describe('server daily missions',()=>{
  it('uses 05:00 Asia/Ho_Chi_Minh as the daily boundary',()=>{
    const before=Date.parse('2026-10-02T04:59:59+07:00');
    const after=Date.parse('2026-10-02T05:00:00+07:00');
    expect(missions.dayKey(before)).not.toBe(missions.dayKey(after));
    expect(missions.nextResetAt(before)).toBe(Date.parse('2026-10-02T05:00:00+07:00'));
    expect(missions.nextResetAt(after)).toBe(Date.parse('2026-10-03T05:00:00+07:00'));
  });

  it('derives capped action progress from saved game state changes',()=>{
    const old={gold:100,food:100,dragons:[{id:1,level:1,feedProgress:0}],
      eggs:[{id:8,hatcheryId:3,readyAt:1}],buildings:[{id:2,type:'farm',level:1,crop:null},
        {id:3,type:'habitat',storedGold:1200},{id:4,type:'cave',breeding:{readyAt:1}}]};
    const next={gold:1300,food:400,dragons:[{id:1,level:1,feedProgress:1},{id:4,level:1,feedProgress:0}],
      eggs:[{id:5,source:'breed',caveId:4}],buildings:[{id:2,type:'farm',level:1,crop:null},
        {id:3,type:'habitat',storedGold:0},{id:4,type:'cave',breeding:null}]};
    expect(missions.delta(old,next)).toEqual({hatch:1,breed:1,feed:1,plant:0,collectGold:1200,collectFood:0});
    const daily=missions.trackSave(null,old,next,Date.parse('2026-10-02T12:00:00+07:00'));
    expect(daily.progress.hatch).toBe(1);
    expect(daily.progress.collectGold).toBe(missionConfig.objectives.collectGold.goal);
  });

  it('ignores the daily progress supplied by the client and resets from server time',()=>{
    const saved={dayKey:'2026-10-01',progress:{hatch:1},claimed:['hatch']};
    const now=Date.parse('2026-10-02T06:00:00+07:00');
    expect(missions.trackSave(saved,{gold:0,food:0,dragons:[],eggs:[],buildings:[]},
      {gold:0,food:0,dragons:[],eggs:[],buildings:[],dailyMissions:{progress:{hatch:99}}},now))
      .toMatchObject({dayKey:'2026-10-02',progress:{hatch:0},claimed:[]});
  });

  it('grants mission rewards once on the server and advances XP correctly',()=>{
    const profile={gold:0,food:0,gems:0,player:{level:1,xp:0},
      dailyMissions:{dayKey:missions.dayKey(),progress:{hatch:1},claimed:[]}};
    const result=missions.claim(profile,'hatch');
    expect(result.profile.gold).toBe(missionConfig.objectives.hatch.reward.gold);
    expect(result.profile.food).toBe(missionConfig.objectives.hatch.reward.food);
    expect(result.profile.player.xp).toBe(missionConfig.objectives.hatch.reward.xp);
    expect(result.profile.dailyMissions.claimed).toContain('hatch');
    expect(()=>missions.claim(result.profile,'hatch')).toThrow(/already claimed/);
  });
});
