import test from "node:test";
import assert from "node:assert/strict";

import { createApp } from "../app.js";

test("create tournament and fetch public view", async () => {
  const app = await createApp();
  const createResponse = await app.inject({
    method: "POST",
    url: "/tournaments",
    payload: {
      name: "Friday Social",
      mode: "AMERICANO",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      players: ["A", "B", "C", "D", "E", "F", "G", "H"],
      courts: 2,
      pointsPerMatch: 24,
      targetGamesPerPlayer: 3
    }
  });
  assert.equal(createResponse.statusCode, 200);
  const created = createResponse.json().data;
  const publicResponse = await app.inject({
    method: "GET",
    url: `/public/${created.publicToken}`
  });
  assert.equal(publicResponse.statusCode, 200);
  await app.close();
});
