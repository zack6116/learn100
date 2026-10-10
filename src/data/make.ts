import type { Concept } from "./types";

type RawPoint = [text: string, keywords: string[], ask: string];

export function c(
  id: number,
  title: string,
  definition: string,
  starter: boolean,
  lines: string[],
  points: [RawPoint, RawPoint, RawPoint, RawPoint],
  stretch: string,
): Concept {
  return {
    id,
    title,
    definition,
    starter,
    lines,
    stretch,
    points: points.map(([text, keywords, ask]) => ({ text, keywords, ask })) as Concept["points"],
  };
}
