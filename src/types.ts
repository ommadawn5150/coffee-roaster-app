export interface RoastData {
  time: number;
  temp: number;
  ror: number;
}

export interface RoastSession {
  id: string;
  name: string;
  beanName?: string;
  beanWeight?: number;
  roastedWeight?: number;
  tastingNote?: string;
  createdAt: string;
  totalTime: number;
  data: RoastData[];
}

export interface RoastComparisonSeries {
  id: string;
  name: string;
  color: string;
  data: RoastData[];
}
