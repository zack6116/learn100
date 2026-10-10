export type Point = {
  text: string;
  keywords: string[];
  ask: string;
};

export type Concept = {
  id: number;
  title: string;
  definition: string;
  starter: boolean;
  lines: string[];
  points: [Point, Point, Point, Point];
  stretch: string;
};

export type Chapter = {
  title: string;
  blurb: string;
};

export type FieldOption = {
  id: string;
  name: string;
  ready: boolean;
};
