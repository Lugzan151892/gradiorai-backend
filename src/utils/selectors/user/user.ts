import { USER_RATING_SELECT } from "@/utils/selectors/user/user-rating";
import { USER_FILES_SELECT } from "@/utils/selectors/user/user-files";

export const USER_COMMON_SELECT = {
  id: true,
  email: true,
  username: true,
  created_at: true,
  updated_at: true,
  admin: true,
  isGoogle: true,
  is_password_created: true,
} as const;

export const USER_FULL_PROFILE_SELECT = {
  ...USER_COMMON_SELECT,
  last_ip: true,
  last_login: true,
  ip_log: {
    take: 3,
    orderBy: {
      createdAt: 'desc',
    },
  },
  files: {
    select: USER_FILES_SELECT,
  },
  user_rating: {
    select: USER_RATING_SELECT,
  },
} as const;