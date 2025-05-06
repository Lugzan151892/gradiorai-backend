import { Request } from 'express';

export const getIpFromRequest = (request: Request) => {
  const forwarded = request.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim() || request.socket.remoteAddress;

  if (ip === '::1' || !ip) {
    return undefined;
  }

  return ip;
};
