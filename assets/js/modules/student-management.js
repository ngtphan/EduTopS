export const registerStudentAndClassForms = () => {
  document
    .getElementById("studentForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("stu_name").value.trim();
      const parentPhone = document.getElementById("stu_phone").value.trim();
      if (name) {
        await window.cloudSave("students", {
          id: "stu_" + Date.now(),
          name,
          parentPhone,
        });
        document.getElementById("studentForm").reset();
      }
    });

  document.getElementById("classForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("cls_name").value.trim();
    const subjectId = document.getElementById("cls_subjectId").value;
    const studentIds = Array.from(
      document.querySelectorAll("#cls_studentCheckboxes input:checked"),
    ).map((cb) => cb.value);
    if (!subjectId || studentIds.length === 0)
      return alert("Thiếu môn học hoặc học sinh!");
    if (name) {
      await window.cloudSave("classes", {
        id: "cls_" + Date.now(),
        name,
        subjectId,
        studentIds,
      });
      document.getElementById("classForm").reset();
    }
  });
};
