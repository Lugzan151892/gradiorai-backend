export interface IQuestionResponse {
  answer: string;
  correct: boolean;
}

export interface IQuestion {
  id?: number;
  question: string;
  type: number;
  level: number[];
  responses: IQuestionResponse[];
  techs: number[];
}
