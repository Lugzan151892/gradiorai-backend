export interface IQuestionResponse {
  answer: string;
  correct: boolean;
}

export interface IQuestion {
  question: string;
  type: number;
  level: number;
  responses: IQuestionResponse[];
  techs: number[];
}
