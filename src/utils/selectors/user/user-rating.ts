import { EUSER_FILES_TYPE } from "@prisma/client";

export const USER_RATING_SELECT = {
  id: true,
  tests_rating: true,
  interviews_rating: true,
  total_rating: true,
  last_activity: true,
  updated_at: true,
  created_at: true,
} as const;

export const USER_RATING_WITH_USER_SELECT = {
  ...USER_RATING_SELECT,
  user: {
    select: {
      id: true,
      username: true,
      email: true,
      files: {
        where: {
          type: EUSER_FILES_TYPE.AVATAR,
        },
      },
    },
  },
} as const;