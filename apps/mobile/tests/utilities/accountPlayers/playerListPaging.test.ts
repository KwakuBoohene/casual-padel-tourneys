import assert from "node:assert/strict";
import test from "node:test";

import { playerListPageSize } from "../../../src/utilities/accountPlayers/playerListPaging";

test("playerListPageSize fits fewer rows on a compact phone than on desktop", () => {
  const phone = playerListPageSize(390, 844);
  const desktop = playerListPageSize(1280, 900);
  assert.ok(phone <= 6);
  assert.ok(phone >= 4);
  assert.ok(desktop >= phone);
});

test("playerListPageSize keeps a short phone at the minimum", () => {
  assert.equal(playerListPageSize(375, 667), 4);
});
