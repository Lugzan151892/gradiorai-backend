import { EUSER_ACTION_TYPE } from '../enums';

export interface IActionsLogData {
  type: EUSER_ACTION_TYPE;
  userIp?: string;
  interviewId?: string;
  userId?: number;
  content?: string;
}
