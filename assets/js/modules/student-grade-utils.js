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

export const isValidStudentGradeLevel = (value) =>
  STUDENT_GRADE_OPTIONS.includes(String(value || "").trim());

export const normalizeStudentGradeLevel = (value) => {
  const normalized = String(value || "").trim();
  return isValidStudentGradeLevel(normalized) ? normalized : "";
};
