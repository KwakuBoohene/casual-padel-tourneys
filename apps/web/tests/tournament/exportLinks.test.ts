import assert from "node:assert/strict";
import test from "node:test";

import { tournamentExportUrl } from "../../app/tournament/[id]/lib/exportLinks";

test("builds a public export url per format", () => {
  assert.equal(
    tournamentExportUrl("https://api.example.com", "public_abc123", "pdf"),
    "https://api.example.com/public/public_abc123/export?format=pdf"
  );
  assert.equal(
    tournamentExportUrl("https://api.example.com", "public_abc123", "csv"),
    "https://api.example.com/public/public_abc123/export?format=csv"
  );
});

test("a trailing slash on the base url does not double up", () => {
  assert.equal(
    tournamentExportUrl("https://api.example.com/", "public_abc", "csv"),
    "https://api.example.com/public/public_abc/export?format=csv"
  );
  assert.equal(
    tournamentExportUrl("https://api.example.com///", "public_abc", "csv"),
    "https://api.example.com/public/public_abc/export?format=csv"
  );
});

test("the share token is url-encoded", () => {
  assert.equal(
    tournamentExportUrl("https://api.example.com", "public a/b", "csv"),
    "https://api.example.com/public/public%20a%2Fb/export?format=csv"
  );
});

test("never points at an organizer-only route", () => {
  const url = tournamentExportUrl("https://api.example.com", "public_abc", "pdf");
  assert.doesNotMatch(url, /\/me\/players/);
  assert.match(url, /^https:\/\/api\.example\.com\/public\//);
});
