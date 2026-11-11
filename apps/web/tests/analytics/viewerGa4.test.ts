import assert from "node:assert/strict";
import { test } from "node:test";
import { isViewerAnalyticsRoute, viewerAcquisition } from "../../lib/viewerGa4";

test("only approved tournament paths are measured and referral URLs become coarse labels", () => {
  assert.equal(isViewerAnalyticsRoute("/tournament/share-token"), true);
  assert.equal(isViewerAnalyticsRoute("/tournament/share-token/leaderboard"), true);
  for (const path of ["/", "/admin", "/admin/sign-in", "/auth/magic", "/c/share-token", "/tournament/token/edit"])
    assert.equal(isViewerAnalyticsRoute(path), false, path);
  const own = "https://viewer.example";
  assert.equal(viewerAcquisition("https://www.google.com/private?q=private@example.test", own), "google");
  assert.equal(viewerAcquisition("https://google.com.evil.example/path?private=secret", own), "other_referral");
  assert.equal(viewerAcquisition(own + "/tournament/private-token#secret", own), "direct");
});
