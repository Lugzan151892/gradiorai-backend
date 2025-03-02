import { ESKILL_LEVEL, ETEST_SPEC } from 'src/utils/interfaces/enums';

export const getSkillLevel = (level: ESKILL_LEVEL) => {
  switch (level) {
    case ESKILL_LEVEL.JUNIOR:
      return 'junior';
    case ESKILL_LEVEL.MIDDLE:
      return 'middle';
    case ESKILL_LEVEL.SENIOR:
      return 'senior';
  }
};

export const getSpecText = (spec: ETEST_SPEC) => {
  switch (spec) {
    case ETEST_SPEC.FRONT:
      return 'frontend developer';
    case ETEST_SPEC.BACK:
      return 'backend developer';
    case ETEST_SPEC.QA:
      return 'qa engineer';
  }
};
