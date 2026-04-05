export const STUDENT_GRADE_MIN = 1;
export const STUDENT_GRADE_MAX = 12;

export const STUDENT_GRADE_OPTIONS = Object.freeze(
  Array.from(
    { length: STUDENT_GRADE_MAX - STUDENT_GRADE_MIN + 1 },
    (_, index) => {
      const gradeNumber = STUDENT_GRADE_MIN + index;
      return `Lớp ${gradeNumber}`;
    },
  ),
);

export const isValidStudentGradeLevel = (value: unknown): boolean =>
  STUDENT_GRADE_OPTIONS.includes(String(value || "").trim());

export const normalizeStudentGradeLevel = (value: unknown): string => {
  const normalized = String(value || "").trim();
  return isValidStudentGradeLevel(normalized) ? normalized : "";
};

