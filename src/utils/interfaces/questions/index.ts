export interface IQuestionResponse {
  answer: string;
  correct: boolean;
}

export interface IQuestion {
  id?: number;
  question: string;
  level: number[];
  responses: IQuestionResponse[];
  techs: number[];
}
