export interface IGPTStreamMessageChunk {
  name: 'chunk';
  data: {
    text: string;
    type: 'chunk';
  };
}

export interface IGPTStreamMessageDone {
  name: 'done';
  data: {
    type: 'done';
    result: string;
  };
}

export interface IGPTStreamMessageData {
  name: 'data';
  data: {
    type: 'data' | 'result';
    interview: IInterview;
  };
}

export type IGPTStreamMessageEvent = IGPTStreamMessageChunk | IGPTStreamMessageDone | IGPTStreamMessageData;

export interface IInterview {
  id: string;
  created_at: Date;
  updated_at: Date;
  user_prompt: string;
  user_id: number;
  recomendations: string;
  finished: boolean;
  messages: {
    id: number;
    created_at: Date;
    updated_at: Date;
    is_human: boolean;
    text: string;
    interview_id: string;
  }[];
}

export enum EGPT_SETTINGS_TYPE {
  TEST = 'TEST',
  INTERVIEW = 'INTERVIEW',
  RESUME_CHECK = 'RESUME_CHECK',
  RESUME_CREATE = 'RESUME_CREATE',
  GPT_ANALYZE = 'GPT_ANALYZE',
}
