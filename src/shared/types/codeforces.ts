export interface CfProblem {
  index: string;
  name: string;
}

export interface Submission {
  id: number;
  contestId?: number;
  verdict: string;
  programmingLanguage: string;
  problem: CfProblem;
}
