import assert from "node:assert/strict";
import test from "node:test";
import { buildTip, coveredIndexes, emptyTranscriptCopy } from "./score.ts";

const concept = {
  definition: "吃进去的热量和消耗掉的热量之差，长期决定体重往哪走",
  stretch: "一顿吃多会怎样？",
  points: [
    { text: "看差额", keywords: ["差额", "之差"] },
    { text: "会储存", keywords: ["储存", "脂肪"] },
    { text: "看总账", keywords: ["总账", "一段时间"] },
    { text: "吃什么影响饱腹", keywords: ["饱腹", "身体成分"] },
  ],
};

test("empty retelling covers nothing", () => {
  assert.deepEqual(coveredIndexes(concept, "   "), []);
  assert.match(buildTip(concept, "", []), /换你讲/);
  assert.match(emptyTranscriptCopy(), /还没开口/);
});

test("a full retelling covers every point", () => {
  const text = "看吃和消耗的差额。多的会储存成脂肪。要看一段时间的总账。吃什么影响饱腹和身体成分。";
  assert.deepEqual(coveredIndexes(concept, text), [0, 1, 2, 3]);
  assert.match(buildTip(concept, text, [0, 1, 2, 3]), /四个要点/);
});

test("one keyword does not light unrelated points", () => {
  assert.deepEqual(coveredIndexes(concept, "我只记得差额"), [0]);
});
