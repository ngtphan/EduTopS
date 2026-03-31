import {
  escapeHtml,
  toSafeDomToken,
  sanitizeForStorage,
} from "./security-utils.js";

export const registerDataManagement = ({
  ADMIN_EMAIL,
  normalizeEmail,
  isFixedAdmin,
  getCurrentRole,
  getCurrentUser,
  getSubjectInfo,
  getStudentInfo,
  getClassInfo,
  parseEvaluationRecord,
}) => {
  window.editData = async (table, id) => {
    if (getCurrentRole() !== "admin")
      return alert("Bạn không có quyền chỉnh sửa!");

    if (table === "subjects") {
      const item = window.db.subjects.find((s) => s.id === id);
      if (!item) return;
      const name = await window.appPrompt(
        "Chỉnh sửa môn học",
        "Tên môn học mới:",
        item.name,
      );
      if (!name || !name.trim()) return;
      const color = await window.appPrompt(
        "Chỉnh sửa màu môn",
        "Màu môn (blue|rose|emerald|amber|purple|cyan):",
        item.color || "blue",
      );
      await window.cloudSave("subjects", {
        ...item,
        name: name.trim(),
        color: color || item.color,
      });
      return;
    }

    if (table === "teachers") {
      const item = window.db.teachers.find((t) => t.id === id);
      if (!item) return;
      const name = await window.appPrompt(
        "Chỉnh sửa giáo viên",
        "Tên giáo viên:",
        item.name,
      );
      if (!name || !name.trim()) return;
      const phone =
        (await window.appPrompt(
          "Chỉnh sửa giáo viên",
          "SĐT giáo viên:",
          item.phone || "",
        )) || "";
      await window.cloudSave("teachers", {
        ...item,
        name: name.trim(),
        phone: phone.trim(),
      });
      return;
    }

    if (table === "students") {
      const item = window.db.students.find((s) => s.id === id);
      if (!item) return;
      const name = await window.appPrompt(
        "Chỉnh sửa học sinh",
        "Tên học sinh:",
        item.name,
      );
      if (!name || !name.trim()) return;
      const parentPhone =
        (await window.appPrompt(
          "Chỉnh sửa học sinh",
          "SĐT phụ huynh:",
          item.parentPhone || "",
        )) || "";
      await window.cloudSave("students", {
        ...item,
        name: name.trim(),
        parentPhone: parentPhone.trim(),
      });
      return;
    }

    if (table === "classes") {
      const item = window.db.classes.find((c) => c.id === id);
      if (!item) return;
      const name = await window.appPrompt(
        "Chỉnh sửa lớp học",
        "Tên lớp học:",
        item.name,
      );
      if (!name || !name.trim()) return;
      const subjectHint = window.db.subjects
        .map((s) => `${s.id}: ${s.name}`)
        .join(" | ");
      const nextSubjectId = await window.appPrompt(
        "Chỉnh sửa lớp học",
        `Nhập subjectId mới (${subjectHint}):`,
        item.subjectId,
      );
      if (
        !nextSubjectId ||
        !window.db.subjects.some((s) => s.id === nextSubjectId)
      ) {
        return alert("subjectId không hợp lệ.");
      }

      const currentStudents = (item.studentIds || []).join(",");
      const nextStudentIdsRaw =
        (await window.appPrompt(
          "Chỉnh sửa danh sách học sinh",
          "Nhập danh sách studentId (phân tách bởi dấu phẩy):",
          currentStudents,
        )) || "";
      const nextStudentIds = nextStudentIdsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (
        nextStudentIds.length === 0 ||
        nextStudentIds.some(
          (stuId) => !window.db.students.some((s) => s.id === stuId),
        )
      ) {
        return alert("Danh sách studentId không hợp lệ.");
      }

      await window.cloudSave("classes", {
        ...item,
        name: name.trim(),
        subjectId: nextSubjectId,
        studentIds: nextStudentIds,
      });
    }
  };

  window.deleteData = async (table, id) => {
    if (getCurrentRole() !== "admin")
      return alert("Bạn không có quyền thực hiện thao tác này!");
    const shouldDelete = await window.appConfirm(
      "Bạn có chắc chắn muốn xóa dữ liệu này?",
      "Xác nhận xóa",
    );
    if (shouldDelete) {
      if (
        table === "subjects" &&
        (window.db.classes.some((c) => c.subjectId === id) ||
          window.db.teachers.some((t) => t.subjectIds.includes(id)))
      )
        return alert("Không thể xóa Môn đang sử dụng!");
      if (
        table === "teachers" &&
        window.db.schedules.some((s) => s.teacherId === id)
      )
        return alert("Không thể xóa GV đang có lịch!");
      if (
        table === "students" &&
        window.db.classes.some((c) => c.studentIds.includes(id))
      )
        return alert("Không thể xóa HS đang học Lớp!");
      if (
        table === "classes" &&
        window.db.schedules.some((s) => s.classId === id)
      )
        return alert("Không thể xóa Lớp đã xếp lịch!");
      if (table === "accounts") {
        const acc = window.db.accounts.find((a) => a.id === id);
        if (!acc) return;
        if (normalizeEmail(acc.email) === ADMIN_EMAIL)
          return alert("Không thể xóa tài khoản admin cố định!");
        if (acc.role === "admin" && !isFixedAdmin())
          return alert("Chỉ admin cố định mới được xóa admin phụ.");
        if (
          acc.role === "admin" &&
          normalizeEmail(acc.email) === normalizeEmail(getCurrentUser()?.email)
        )
          return alert("Không thể tự xóa tài khoản admin đang đăng nhập.");
      }

      if (table === "teachers") {
        const tea = window.db.teachers.find((t) => t.id === id);
        await window.cloudDelete("teachers", id);
        if (tea && tea.email) {
          const email = normalizeEmail(tea.email);
          const linkedAccounts = window.db.accounts.filter(
            (a) => normalizeEmail(a.email) === email,
          );
          for (const acc of linkedAccounts) {
            await window.cloudDelete("accounts", acc.id);
          }
        }
        return;
      }

      await window.cloudDelete(table, id);
    }
  };

  let activeEvalId = null;
  const evalModal = document.getElementById("evalModal");
  window.openEvalModal = (schId) => {
    activeEvalId = schId;
    const sch = window.db.schedules.find((s) => s.id === schId);
    const cls = getClassInfo(sch.classId);
    document.getElementById("evalModalSubtitle").innerText =
      `${cls.name} (${getSubjectInfo(cls.subjectId).name}) • ${sch.startTime} - ${sch.endTime}`;
    document.getElementById("evalStudentsContainer").innerHTML = cls.studentIds
      .map((stuId) => {
        const stu = getStudentInfo(stuId);
        const currentEval = parseEvaluationRecord(
          sch.evaluations && sch.evaluations[stuId],
        );
        const fieldToken = toSafeDomToken(stuId);
        const currentLevel = currentEval?.level || "fair";
        const currentNote = currentEval?.note || "";
        return `<div class="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm"><div class="flex items-center gap-3 mb-3"><div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-sm uppercase">${escapeHtml(stu.name.charAt(0) || "?")}</div><div><h4 class="font-bold text-slate-800 text-sm">${escapeHtml(stu.name)}</h4><div class="text-[11px] text-slate-500">Phụ huynh: ${escapeHtml(stu.parentPhone || "N/A")}</div></div></div><div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2"><label class="flex items-center gap-2 text-[12px] border border-emerald-200 bg-emerald-50 rounded px-2 py-1.5"><input type="radio" name="eval_level_${fieldToken}" value="good" ${currentLevel === "good" ? "checked" : ""}> Tốt</label><label class="flex items-center gap-2 text-[12px] border border-amber-200 bg-amber-50 rounded px-2 py-1.5"><input type="radio" name="eval_level_${fieldToken}" value="fair" ${currentLevel === "fair" ? "checked" : ""}> Khá</label><label class="flex items-center gap-2 text-[12px] border border-rose-200 bg-rose-50 rounded px-2 py-1.5"><input type="radio" name="eval_level_${fieldToken}" value="watch" ${currentLevel === "watch" ? "checked" : ""}> Cần theo dõi</label></div><textarea id="eval_note_${fieldToken}" rows="2" placeholder="Ghi chú thêm (tuỳ chọn)..." class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500">${escapeHtml(currentNote)}</textarea></div>`;
      })
      .join("");
    evalModal.classList.remove("hidden");
    evalModal.classList.add("flex");
    lucide.createIcons();
  };

  window.closeEvalModal = () => {
    evalModal.classList.add("hidden");
    evalModal.classList.remove("flex");
    activeEvalId = null;
  };

  document.getElementById("saveEvalBtn").addEventListener("click", async () => {
    if (!activeEvalId) return;
    const btn = document.getElementById("saveEvalBtn");
    btn.innerHTML =
      '<i class="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full"></i> Đang lưu...';
    btn.disabled = true;

    const sch = window.db.schedules.find((s) => s.id === activeEvalId);
    if (!sch.evaluations) sch.evaluations = {};
    getClassInfo(sch.classId).studentIds.forEach((stuId) => {
      const fieldToken = toSafeDomToken(stuId);
      const levelInput = document.querySelector(
        `input[name='eval_level_${fieldToken}']:checked`,
      );
      const level = levelInput ? levelInput.value : "fair";
      const normalizedLevel =
        level === "good" || level === "fair" || level === "watch"
          ? level
          : "fair";
      const note =
        document.getElementById(`eval_note_${fieldToken}`)?.value?.trim() || "";
      sch.evaluations[stuId] = {
        level: normalizedLevel,
        note: String(sanitizeForStorage(note) || ""),
      };
    });

    await window.cloudSave("schedules", sch);
    btn.innerHTML =
      '<i data-lucide="cloud-upload" class="w-4 h-4"></i> Lưu Cloud';
    btn.disabled = false;
    window.closeEvalModal();
    lucide.createIcons();
  });
};
