import { conceptsA } from "./concepts-a";
import { conceptsB } from "./concepts-b";
import type { Chapter, Concept, FieldOption } from "./types";

export const TRACK_ID = "fitness";
export const TRACK_NAME = "健身和营养";
export const CONCEPT_COUNT = 100;

export const chapters: Chapter[] = [
  { title: "一、能量与体重", blurb: "体重为什么会变" },
  { title: "二、三大营养素", blurb: "吃进去的东西都是什么" },
  { title: "三、微量营养素与水", blurb: "量小但不能缺的东西" },
  { title: "四、怎么吃", blurb: "把知识变成一日三餐" },
  { title: "五、力量训练", blurb: "让肌肉有理由留下" },
  { title: "六、有氧和走动", blurb: "消耗不止在健身房" },
  { title: "七、睡眠和恢复", blurb: "进步发生在练完之后" },
  { title: "八、减脂", blurb: "让脂肪下去，尽量留住肌肉" },
  { title: "九、增肌", blurb: "给原料，也给刺激" },
  { title: "十、习惯和判断", blurb: "能看懂建议，也能识破胡说" },
];

export const fields: FieldOption[] = [
  { id: TRACK_ID, name: TRACK_NAME, ready: true },
  { id: "value", name: "价值投资", ready: false },
  { id: "study", name: "学习", ready: false },
  { id: "seo", name: "SEO", ready: false },
  { id: "web3", name: "Web3", ready: false },
  { id: "business", name: "商业知识", ready: false },
];

export const concepts: Concept[] = [...conceptsA, ...conceptsB];

function assertTrack(list: Concept[]) {
  if (list.length !== CONCEPT_COUNT) {
    throw new Error(`Learn100 需要 100 个概念，现在是 ${list.length} 个`);
  }
  const ids = new Set<number>();
  let starters = 0;
  list.forEach((concept, index) => {
    if (concept.id !== index + 1) {
      throw new Error(`概念顺序断开：第 ${index + 1} 位的编号是 ${concept.id}`);
    }
    if (ids.has(concept.id)) throw new Error(`概念编号重复：${concept.id}`);
    ids.add(concept.id);
    if (concept.points.length !== 4) {
      throw new Error(`${concept.title} 的要点不是 4 条`);
    }
    if (concept.starter) starters += 1;
    if (!concept.definition || concept.lines.length < 2) {
      throw new Error(`${concept.title} 缺少讲解`);
    }
  });
  if (starters !== 20) throw new Error(`入门概念应是 20 个，现在是 ${starters} 个`);
  if (chapters.length !== 10) throw new Error("应有 10 章");
}

assertTrack(concepts);

export function getConcept(id: number): Concept | undefined {
  return concepts.find((concept) => concept.id === id);
}

export function chapterOf(id: number): Chapter {
  return chapters[Math.floor((id - 1) / 10)] ?? chapters[0];
}

export function conceptsInChapter(index: number): Concept[] {
  const start = index * 10 + 1;
  return concepts.filter((concept) => concept.id >= start && concept.id < start + 10);
}

export const starterConcepts = concepts.filter((concept) => concept.starter);

export function handoffLine(): string {
  return "换你讲。用你自己的话讲一遍，哪怕只讲一两句。";
}

export function greetingLine(concept: Concept): string {
  return `嗨，我是小练。今天我们学第 ${concept.id} 个概念：${concept.title}。`;
}
