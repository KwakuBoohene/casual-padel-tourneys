import test from "node:test";
import assert from "node:assert/strict";

import {
  careerShareBlurb,
  careerShareStatus,
  careerShareUrl,
  careerShareWarning
} from "../../../src/utilities/accountPlayers/careerShareUrl";

test("the share url points at the public viewer page", () => {
  assert.equal(
    careerShareUrl("https://play.example.com", "career_abc123"),
    "https://play.example.com/c/career_abc123"
  );
});

test("a trailing slash on the viewer base does not double up", () => {
  assert.equal(careerShareUrl("https://play.example.com/", "career_abc"), "https://play.example.com/c/career_abc");
  assert.equal(careerShareUrl("https://play.example.com///", "career_abc"), "https://play.example.com/c/career_abc");
});

test("the token is url-encoded", () => {
  assert.equal(careerShareUrl("https://x.com", "a b/c"), "https://x.com/c/a%20b%2Fc");
});

test("status reflects whether a link exists", () => {
  assert.equal(careerShareStatus(null), "off");
  assert.equal(careerShareStatus(undefined), "off");
  assert.equal(careerShareStatus(""), "off");
  assert.equal(careerShareStatus("career_abc"), "on");
});

test("the blurb states exactly what becomes public, in both states", () => {
  for (const status of ["off", "on"] as const) {
    const blurb = careerShareBlurb(status);
    assert.match(blurb, /no match history/i, status);
    assert.match(blurb, /tournaments/i, status);
    assert.match(blurb, /edited|read-only/i, status);
  }
});

test("destructive actions warn that the current link dies immediately", () => {
  assert.match(careerShareWarning("replace"), /stops working immediately/i);
  assert.match(careerShareWarning("stop"), /stops working immediately/i);
  assert.match(careerShareWarning("stop"), /private/i);
});
