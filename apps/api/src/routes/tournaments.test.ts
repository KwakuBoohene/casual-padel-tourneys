import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { createApp } from "../app.js";

// Note: This test requires a PostgreSQL database to be running
// To run this test properly, set up:
// 1. DATABASE_URL pointing to a test database
// 2. Run: npm run db:push (to sync the schema)
// For now, we test tournament creation only (in-memory works without DB)

test("create tournament in-memory (without database persistence)", async () => {
  // Set required environment variables for test
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-secret-key-for-unit-tests";

  try {
    // Create a valid JWT token
    const token = jwt.sign(
      { sub: "test-user-id", email: "test@example.com", name: "Test User" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const app = await createApp();
    const createResponse = await app.inject({
      method: "POST",
      url: "/tournaments",
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: {
        name: "Friday Social",
        mode: "AMERICANO",
        variant: "CLASSIC",
        schedulingMode: "TARGET_GAMES",
        players: [
          { name: "A" },
          { name: "B" },
          { name: "C" },
          { name: "D" },
          { name: "E" },
          { name: "F" },
          { name: "G" },
          { name: "H" }
        ],
        courts: 2,
        pointsPerMatch: 24,
        targetGamesPerPlayer: 3
      }
    });

    // Tournament creation should succeed (in-memory)
    assert.equal(createResponse.statusCode, 200);
    const created = createResponse.json().data;
    assert.ok(created.id, "Tournament should have an ID");
    assert.ok(created.publicToken, "Tournament should have a public token");
    assert.equal(created.config.name, "Friday Social");
    assert.equal(created.players.length, 8);
    assert.ok(created.rounds.length > 0, "Tournament should have rounds");

    await app.close();
  } finally {
    // Restore original environment variables
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
  }
});
