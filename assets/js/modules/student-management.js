export const registerStudentAndClassForms = () => {
  const escapeHtml = (value) =>
    String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const gradeOptions = [
    "Lớp 6",
    "Lớp 7",
    "Lớp 8",
    "Lớp 9",
    "Lớp 10",
    "Lớp 11",
    "Lớp 12",
    "Khác",
  ];

  const openStudentFormModal = ({ student = null } = {}) => {
    const isEdit = !!student;
    const currentGrade = String(student?.gradeLevel || "").trim();
    const optionsHtml = gradeOptions
      .map((grade) => {
        const selected = grade === currentGrade ? "selected" : "";
        return `<option value="${escapeHtml(grade)}" ${selected}>${escapeHtml(grade)}</option>`;
      })
      .join("");

    return window.appFormModal({
      title: isEdit ? "Chỉnh sửa học sinh" : "Thêm học sinh",
      description: isEdit
        ? "Cập nhật hồ sơ học sinh bằng modal tập trung."
        : "Thêm mới học sinh bằng modal gọn và tối ưu.",
      submitText: isEdit ? "Lưu thay đổi" : "Thêm học sinh",
      bodyHtml: `
        <div>
          <label class="block text-[12px] font-bold text-slate-600 mb-1">Tên học sinh</label>
          <input name="name" type="text" required value="${escapeHtml(student?.name || "")}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
        </div>
        <div>
          <label class="block text-[12px] font-bold text-slate-600 mb-1">SĐT phụ huynh</label>
          <input name="parentPhone" type="tel" value="${escapeHtml(student?.parentPhone || "")}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
        </div>
        <div>
          <label class="block text-[12px] font-bold text-slate-600 mb-1">Lớp đang học</label>
          <select name="gradeLevel" required class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
            <option value="">-- Chọn lớp --</option>
            ${optionsHtml}
          </select>
        </div>
      `,
      onSubmit: ({ values }) => {
        const name = String(values.name || "").trim();
        const parentPhone = String(values.parentPhone || "").trim();
        const gradeLevel = String(values.gradeLevel || "").trim();

        if (!name) {
          alert("Vui lòng nhập tên học sinh.");
          return false;
        }
        if (!gradeLevel) {
          alert("Vui lòng chọn lớp đang học.");
          return false;
        }

        return { name, parentPhone, gradeLevel };
      },
    });
  };

  const openCreateStudentModal = async () => {
    const payload = await openStudentFormModal();
    if (!payload) return;
    await window.cloudSave("students", {
      id: "stu_" + Date.now(),
      ...payload,
    });
  };

  const openEditStudentModal = async (studentId) => {
    const student = window.db.students.find(
      (item) => String(item.id) === String(studentId),
    );
    if (!student) return alert("Không tìm thấy học sinh.");

    const payload = await openStudentFormModal({ student });
    if (!payload) return;

    await window.cloudSave("students", {
      ...student,
      ...payload,
    });
  };

  window.openStudentCreateModal = openCreateStudentModal;
  window.openStudentEditModal = openEditStudentModal;

  const openCreateBtn = document.getElementById("btnOpenStudentCreateModal");
  openCreateBtn?.addEventListener("click", openCreateStudentModal);

  const classForm = document.getElementById("classForm");
  classForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    alert(
      "Tính năng Ghép lớp đã được thay bằng thuộc tính lớp trong hồ sơ học sinh.",
    );
  });
};
