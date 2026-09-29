import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanGroupName,
  groupNameKey,
  groupSlug,
  areGroupNamesTooSimilar
} from "../src/services/groups.js";

test("group names normalize consistently", () => {
  assert.equal(cleanGroupName("  Study   Room  "), "Study Room");
  assert.equal(groupNameKey("Study Room"), "studyroom");
  assert.equal(groupNameKey("study-room"), "studyroom");
  assert.equal(groupNameKey("STUDY_room"), "studyroom");
  assert.equal(groupSlug("Study Room"), "study-room");
});

test("formatting variants are treated as the same group name", () => {
  assert.equal(areGroupNamesTooSimilar("Study Room", "study-room"), true);
  assert.equal(areGroupNamesTooSimilar("Gaming", "GAMING"), true);
});

test("very close names are rejected", () => {
  assert.equal(areGroupNamesTooSimilar("General", "Generall"), true);
  assert.equal(areGroupNamesTooSimilar("Coursework", "Coursework1"), true);
  assert.equal(areGroupNamesTooSimilar("Gaming", "Gamming"), true);
});

test("clearly different group names remain allowed", () => {
  assert.equal(areGroupNamesTooSimilar("Gaming", "Coursework"), false);
  assert.equal(areGroupNamesTooSimilar("General", "Random"), false);
});

test("invalid group names are rejected", () => {
  assert.equal(cleanGroupName(""), null);
  assert.equal(cleanGroupName("a"), null);
  assert.equal(cleanGroupName("group!"), null);
});
