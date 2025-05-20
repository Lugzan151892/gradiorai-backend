export interface IGPTStreamMessageEvent {
  name: 'chunk' | 'done' | 'error';
  data: {
    text: string;
    type: 'chunk' | 'done' | 'error';
  };
}
