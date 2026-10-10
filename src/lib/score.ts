export type ScorePoint = {
  text: string;
  keywords: string[];
  ask?: string;
};

export type ScoreConcept = {
  definition: string;
  points: ScorePoint[];
  stretch: string;
};

export function coveredIndexes(concept: ScoreConcept, text: string): number[] {
  const norm = text.replace(/\s+/g, "");
  if (!norm) return [];
  const hits: number[] = [];
  concept.points.forEach((point, index) => {
    if (point.keywords.some((keyword) => keyword.length >= 2 && norm.includes(keyword))) {
      hits.push(index);
    }
  });
  return hits;
}

export function buildTip(concept: ScoreConcept, userText: string, covered: number[]): string {
  const spoke = userText.trim().length > 0;
  if (!spoke) {
    return "下次在小练说“换你讲”之后，用自己的话讲一遍，哪怕只讲一两句。";
  }
  if (covered.length >= concept.points.length) {
    return "四个要点都碰到了。下次加一个你自己的例子，会记得更牢。";
  }
  if (covered.length === 0) {
    return "你开口了，但要点还没碰到。试着用概念卡里的那句话当开头。";
  }
  const missing = concept.points.find((_, index) => !covered.includes(index));
  const left = concept.points.length - covered.length;
  return `还差 ${left} 个要点。下次先把这句用自己的话说出来：${missing?.text ?? ""}`;
}

export function emptyTranscriptCopy(): string {
  return "这次还没开口讲。下次试试在小练说“换你讲”之后，用自己的话讲一遍。";
}

export function followUpFor(concept: ScoreConcept, userText: string): string {
  const covered = coveredIndexes(concept, userText);
  if (!userText.trim()) {
    return `没事，我们用一句话试试。${concept.points[0]?.ask ?? "这个概念在说什么？"}`;
  }
  const missing = concept.points.find((_, index) => !covered.includes(index));
  if (!missing) return concept.stretch;
  return missing.ask ?? `用你自己的话再说说：${missing.text}`;
}

export function answerQuestion(concept: ScoreConcept, question: string): string {
  const q = question.trim();
  if (!q) return "你直接问就行，我听着。";
  const hit = concept.points.find((point) =>
    point.keywords.some((keyword) => keyword.length >= 2 && q.includes(keyword)),
  );
  if (hit) return `好，这一点可以这么记：${hit.text}`;
  return `好问题。先抓住这一句：${concept.definition}。还有想问的，还是换你讲？`;
}
