import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomStore } from '../prototype/domain.mjs';

test('members contribute a union of nominations before shared constraints are applied', () => {
  const store = new RoomStore();
  const room = store.create({clientId:'alice',nickname:'甲',filters:{customNames:['一起想去的地方','甲想去的地方']}});
  const joined = store.join(room.inviteCode, {clientId:'bob',nickname:'乙',filters:{customNames:['一起想去的地方','乙想去的地方']}});
  assert.deepEqual(joined.candidates.map(item => item.name).sort(), ['一起想去的地方','乙想去的地方','甲想去的地方'].sort());
});
