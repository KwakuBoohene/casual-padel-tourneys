import test from "node:test";
import assert from "node:assert/strict";

import {
  filterPlayerNameSuggestions,
  mergePlayerSuggestionNames
} from "../../src/utils/playerNameSuggestions.js";

test("mergePlayerSuggestionNames prefers career spelling", () => {
  const names = mergePlayerSuggestionNames(["frank a.", "Bea"], ["Frank A.", "Ada"]);
  assert.deepEqual(names, ["Ada", "Bea", "Frank A."]);
});

test("filterPlayerNameSuggestions matches first word of a saved name", () => {
  const names = ["Frank A.", "Francesca", "Bea"];
  assert.deepEqual(filterPlayerNameSuggestions("fran", names, []), ["Frank A.", "Francesca"]);
  assert.deepEqual(filterPlayerNameSuggestions("frank", names, []), ["Frank A."]);
});

test("filterPlayerNameSuggestions skips names already on the roster", () => {
  assert.deepEqual(filterPlayerNameSuggestions("fr", ["Frank A.", "Fred"], ["Frank A."]), ["Fred"]);
});
