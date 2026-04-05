// @ts-nocheck
import {
  STUDENT_GRADE_OPTIONS,
  normalizeStudentGradeLevel,
} from "./student-grade-utils";

export const registerStudentAndClassForms = () => {
  const escapeHtml = (value) =>
    String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const normalizeKeyword = (value) =>
    String(value || "")
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const includesKeyword = (value, keyword) => {
    if (!keyword) return true;
    return normalizeKeyword(value).includes(keyword);
  };

  const parseGradeNumber = (gradeLabel) => {
    const matched = /^Lớp\s+(\d{1,2})$/i.exec(String(gradeLabel || "").trim());
    return matched ? Number(matched[1]) : Number.NaN;
  };

  const suggestNextGrade = (sourceGrade) => {
    const sourceGradeNumber = parseGradeNumber(sourceGrade);
    if (!Number.isFinite(sourceGradeNumber)) return "";

    const nextGrade = `Lớp ${sourceGradeNumber + 1}`;
    return STUDENT_GRADE_OPTIONS.includes(nextGrade) ? nextGrade : "";
  };

  const getStudentsByGradeLevel = (gradeLevel) =>
    globalThis.db.students
      .filter((student) => {
        const normalizedGrade = normalizeStudentGradeLevel(
          student?.gradeLevel || student?.classLevel,
        );
        return normalizedGrade === gradeLevel;
      })
      .sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""), "vi"),
      );

  const getDefaultSourceGrade = () => {
    for (const grade of STUDENT_GRADE_OPTIONS) {
      if (getStudentsByGradeLevel(grade).length > 0) return grade;
    }
    return STUDENT_GRADE_OPTIONS[0];
  };

  const ensureDifferentTargetGrade = (sourceSelect, targetSelect) => {
    const sourceGrade = normalizeStudentGradeLevel(sourceSelect?.value);
    const targetGrade = normalizeStudentGradeLevel(targetSelect?.value);
    if (!sourceGrade || !targetSelect) return;
    if (targetGrade && targetGrade !== sourceGrade) return;

    const suggested = suggestNextGrade(sourceGrade);
    if (suggested && suggested !== sourceGrade) {
      targetSelect.value = suggested;
      return;
    }

    for (const grade of STUDENT_GRADE_OPTIONS) {
      if (grade !== sourceGrade) {
        targetSelect.value = grade;
        return;
      }
    }
    targetSelect.value = sourceGrade;
  };

  const updateBulkSummary = ({
    sourceCountEl,
    promoteCountEl,
    retainCountEl,
    totalCount,
    selectedCount,
  }) => {
    const total = Number.isFinite(totalCount) ? totalCount : 0;
    const selected = Number.isFinite(selectedCount) ? selectedCount : 0;

    if (sourceCountEl) sourceCountEl.innerText = String(total);
    if (promoteCountEl) promoteCountEl.innerText = String(selected);
    if (retainCountEl) retainCountEl.innerText = String(total - selected);
  };

  const renderBulkStudentCards = ({ listEl, students, selectedIds }) => {
    if (!students.length) {
      listEl.innerHTML =
        '<div class="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-[12px] text-slate-500">Không có học sinh khớp bộ lọc hiện tại.</div>';
      return;
    }

    let html = "";
    for (const student of students) {
      const checkedAttr = selectedIds.has(String(student.id)) ? "checked" : "";
      html += `
        <label class="block rounded-lg border border-slate-200 bg-white px-3 py-2 cursor-pointer hover:border-indigo-200">
          <div class="flex items-start gap-2">
            <input
              type="checkbox"
              name="bulkStudentIds"
              value="${escapeHtml(String(student.id))}"
              ${checkedAttr}
              class="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div class="min-w-0 flex-1">
              <div class="text-sm font-bold text-slate-800 truncate">${escapeHtml(student.name || "Chưa có tên")}</div>
              <div class="text-[11px] text-slate-500 truncate">SĐT PH: ${escapeHtml(student.parentPhone || "N/A")}</div>
            </div>
          </div>
        </label>
      `;
    }
    listEl.innerHTML = html;
  };

  const openStudentFormModal = ({ student = null } = {}) => {
    const isEdit = !!student;
    const currentGrade = normalizeStudentGradeLevel(student?.gradeLevel);
    const optionsHtml = STUDENT_GRADE_OPTIONS.map((grade) => {
      const selected = grade === currentGrade ? "selected" : "";
      return `<option value="${escapeHtml(grade)}" ${selected}>${escapeHtml(grade)}</option>`;
    }).join("");

    return globalThis.appFormModal({
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
        const gradeLevel = normalizeStudentGradeLevel(values.gradeLevel);

        if (!name) {
          alert("Vui lòng nhập tên học sinh.");
          return false;
        }
        if (!gradeLevel) {
          alert("Vui lòng chọn lớp từ Lớp 1 đến Lớp 12.");
          return false;
        }

        return { name, parentPhone, gradeLevel };
      },
    });
  };

  const openCreateStudentModal = async () => {
    const payload = await openStudentFormModal();
    if (!payload) return;
    await globalThis.cloudSave("students", {
      id: "stu_" + Date.now(),
      ...payload,
    });
  };

  const openEditStudentModal = async (studentId) => {
    const student = globalThis.db.students.find(
      (item) => String(item.id) === String(studentId),
    );
    if (!student) return alert("Không tìm thấy học sinh.");

    const payload = await openStudentFormModal({ student });
    if (!payload) return;

    await globalThis.cloudSave("students", {
      ...student,
      ...payload,
    });
  };

  const getBulkSelectedIdsFromForm = (form) => {
    const rawIds = String(form.dataset.bulkStudentSelectedIds || "").trim();
    if (!rawIds) return new Set();

    return new Set(
      rawIds
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    );
  };

  const handleBulkStudentModalOpen = ({ form }) => {
    const sourceSelect = form.querySelector("[name='sourceGradeLevel']");
    const targetSelect = form.querySelector("[name='targetGradeLevel']");
    const nameSearchInput = form.querySelector("#bulkStudentSearchName");
    const phoneSearchInput = form.querySelector("#bulkStudentSearchPhone");
    const listEl = form.querySelector("#bulkStudentUpdateList");
    const sourceCountEl = form.querySelector("#bulkStudentSourceCount");
    const promoteCountEl = form.querySelector("#bulkStudentPromoteCount");
    const retainCountEl = form.querySelector("#bulkStudentRetainCount");
    const selectAllBtn = form.querySelector("#bulkStudentSelectAllBtn");
    const clearAllBtn = form.querySelector("#bulkStudentClearAllBtn");

    if (!sourceSelect || !targetSelect || !listEl) return;

    const configuredNamePlaceholder = String(
      globalThis.APP_CONFIG?.ui?.placeholders?.bulkStudentNameSearch || "",
    ).trim();
    const configuredPhonePlaceholder = String(
      globalThis.APP_CONFIG?.ui?.placeholders?.bulkStudentPhoneSearch || "",
    ).trim();
    if (nameSearchInput && configuredNamePlaceholder) {
      nameSearchInput.placeholder = configuredNamePlaceholder;
    }
    if (phoneSearchInput && configuredPhonePlaceholder) {
      phoneSearchInput.placeholder = configuredPhonePlaceholder;
    }

    let sourceStudents = [];
    const selectedIds = new Set();

    const syncSelectionStore = () => {
      form.dataset.bulkStudentSelectedIds = Array.from(selectedIds).join(",");
      updateBulkSummary({
        sourceCountEl,
        promoteCountEl,
        retainCountEl,
        totalCount: sourceStudents.length,
        selectedCount: selectedIds.size,
      });
    };

    const applyModalFilters = () => {
      const nameKeyword = normalizeKeyword(nameSearchInput?.value || "");
      const phoneKeyword = normalizeKeyword(phoneSearchInput?.value || "");
      const visibleStudents = sourceStudents.filter((student) => {
        const byName = includesKeyword(student?.name, nameKeyword);
        const byPhone = includesKeyword(student?.parentPhone, phoneKeyword);
        return byName && byPhone;
      });

      renderBulkStudentCards({
        listEl,
        students: visibleStudents,
        selectedIds,
      });
    };

    const refreshSourceStudents = () => {
      const sourceGrade = normalizeStudentGradeLevel(sourceSelect.value);
      sourceStudents = getStudentsByGradeLevel(sourceGrade);
      selectedIds.clear();
      sourceStudents.forEach((student) => {
        selectedIds.add(String(student.id));
      });
      applyModalFilters();
      syncSelectionStore();
    };

    const syncSelectionFromDom = () => {
      const allVisibleInputs = listEl.querySelectorAll(
        "input[name='bulkStudentIds']",
      );
      for (const input of allVisibleInputs) {
        const studentId = String(input.value || "");
        if (input.checked) {
          selectedIds.add(studentId);
        } else {
          selectedIds.delete(studentId);
        }
      }
      syncSelectionStore();
    };

    sourceSelect.value = getDefaultSourceGrade();
    ensureDifferentTargetGrade(sourceSelect, targetSelect);
    refreshSourceStudents();

    sourceSelect.addEventListener("change", () => {
      ensureDifferentTargetGrade(sourceSelect, targetSelect);
      refreshSourceStudents();
    });

    targetSelect.addEventListener("change", () => {
      syncSelectionStore();
    });

    listEl.addEventListener("change", () => {
      syncSelectionFromDom();
    });

    selectAllBtn?.addEventListener("click", () => {
      sourceStudents.forEach((student) => {
        selectedIds.add(String(student.id));
      });
      applyModalFilters();
      syncSelectionStore();
    });

    clearAllBtn?.addEventListener("click", () => {
      sourceStudents.forEach((student) => {
        selectedIds.delete(String(student.id));
      });
      applyModalFilters();
      syncSelectionStore();
    });

    nameSearchInput?.addEventListener("input", () => {
      applyModalFilters();
      syncSelectionStore();
    });

    phoneSearchInput?.addEventListener("input", () => {
      applyModalFilters();
      syncSelectionStore();
    });
  };

  const handleBulkStudentModalSubmit = async ({ form }) => {
    const sourceGrade = normalizeStudentGradeLevel(
      form.querySelector("[name='sourceGradeLevel']")?.value,
    );
    const targetGrade = normalizeStudentGradeLevel(
      form.querySelector("[name='targetGradeLevel']")?.value,
    );

    if (!sourceGrade || !targetGrade) {
      alert("Vui lòng chọn đầy đủ lớp nguồn và lớp đích.");
      return false;
    }

    if (sourceGrade === targetGrade) {
      alert("Lớp nguồn và lớp đích phải khác nhau.");
      return false;
    }

    const sourceStudents = getStudentsByGradeLevel(sourceGrade);
    if (sourceStudents.length === 0) {
      alert("Không có học sinh để cập nhật trong lớp nguồn này.");
      return false;
    }

    const selectedIds = getBulkSelectedIdsFromForm(form);
    if (selectedIds.size === 0) {
      alert("Vui lòng chọn ít nhất 1 học sinh để lên lớp.");
      return false;
    }

    const selectedStudents = sourceStudents.filter((student) =>
      selectedIds.has(String(student.id)),
    );

    if (selectedStudents.length === 0) {
      alert("Không có học sinh hợp lệ để cập nhật lớp.");
      return false;
    }

    const retainedCount = sourceStudents.length - selectedStudents.length;
    const confirmText =
      `Sẽ cập nhật ${selectedStudents.length} học sinh từ ${sourceGrade} lên ${targetGrade}.` +
      `\n${retainedCount} học sinh sẽ ở lại lớp.` +
      "\nBạn có chắc chắn muốn tiếp tục?";

    const accepted = await globalThis.appConfirm(
      confirmText,
      "Xác nhận cập nhật lớp đồng loạt",
    );
    if (!accepted) return false;

    let successCount = 0;
    const failedStudents = [];

    for (const student of selectedStudents) {
      try {
        await globalThis.cloudSave("students", {
          ...student,
          gradeLevel: targetGrade,
          classLevel: targetGrade,
        });
        successCount += 1;
      } catch (error) {
        console.error("Cập nhật lớp học sinh thất bại:", error);
        failedStudents.push(student.name || student.id || "Không xác định");
      }
    }

    if (failedStudents.length > 0) {
      alert(
        `Đã cập nhật ${successCount}/${selectedStudents.length} học sinh.` +
          `\nLỗi ở: ${failedStudents.join(", ")}`,
      );
      return true;
    }

    alert(
      `Đã cập nhật thành công ${successCount} học sinh lên ${targetGrade}.` +
        `\n${retainedCount} học sinh được giữ lại ${sourceGrade}.`,
    );
    return true;
  };

  const openBulkStudentClassUpdateModal = async () => {
    if (typeof globalThis.appFormModal !== "function") {
      alert("Không thể mở biểu mẫu cập nhật lớp.");
      return;
    }

    const gradeOptionsHtml = STUDENT_GRADE_OPTIONS.map(
      (grade) =>
        `<option value="${escapeHtml(grade)}">${escapeHtml(grade)}</option>`,
    ).join("");

    await globalThis.appFormModal({
      title: "Cập nhật lớp đồng loạt",
      description:
        "Chọn lớp nguồn, lớp đích và bỏ chọn các học sinh cần ở lại lớp.",
      submitText: "Cập nhật lớp",
      size: "xl",
      bodyHtml: `
        <div class="space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-[12px] font-bold text-slate-600 mb-1">Lớp nguồn</label>
              <select name="sourceGradeLevel" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" required>
                ${gradeOptionsHtml}
              </select>
            </div>
            <div>
              <label class="block text-[12px] font-bold text-slate-600 mb-1">Lớp đích</label>
              <select name="targetGradeLevel" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" required>
                ${gradeOptionsHtml}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
              <div class="text-[10px] text-slate-500 font-bold uppercase">Lớp nguồn</div>
              <div id="bulkStudentSourceCount" class="text-base font-bold text-slate-800">0</div>
            </div>
            <div class="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-2">
              <div class="text-[10px] text-indigo-600 font-bold uppercase">Sẽ lên lớp</div>
              <div id="bulkStudentPromoteCount" class="text-base font-bold text-indigo-800">0</div>
            </div>
            <div class="rounded-lg border border-amber-200 bg-amber-50 px-2 py-2">
              <div class="text-[10px] text-amber-600 font-bold uppercase">Ở lại lớp</div>
              <div id="bulkStudentRetainCount" class="text-base font-bold text-amber-800">0</div>
            </div>
          </div>

          <div class="flex items-center justify-between gap-2">
            <div class="text-[11px] font-bold text-slate-600 uppercase">Danh sách học sinh lớp nguồn</div>
            <div class="flex items-center gap-1">
              <button type="button" id="bulkStudentSelectAllBtn" class="px-2 py-1 text-[11px] rounded border border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold">Chọn tất cả</button>
              <button type="button" id="bulkStudentClearAllBtn" class="px-2 py-1 text-[11px] rounded border border-slate-200 bg-slate-50 text-slate-600 font-semibold">Bỏ chọn tất cả</button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              id="bulkStudentSearchName"
              type="text"
              placeholder="Lọc nhanh theo tên học sinh"
              class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <input
              id="bulkStudentSearchPhone"
              type="text"
              placeholder="Lọc theo SĐT phụ huynh"
              class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div id="bulkStudentUpdateList" class="max-h-[320px] overflow-y-auto custom-scrollbar rounded-xl border border-slate-200 bg-slate-50 p-2 space-y-2"></div>

          <div class="text-[11px] text-slate-500">
            Học sinh bị bỏ chọn sẽ giữ nguyên lớp hiện tại.
          </div>
        </div>
      `,
      onOpen: handleBulkStudentModalOpen,
      onSubmit: handleBulkStudentModalSubmit,
    });
  };

  globalThis.openStudentCreateModal = openCreateStudentModal;
  globalThis.openStudentEditModal = openEditStudentModal;
  globalThis.openBulkStudentClassUpdateModal = openBulkStudentClassUpdateModal;

  const openCreateBtn = document.getElementById("btnOpenStudentCreateModal");
  const openBulkUpdateBtn = document.getElementById(
    "btnOpenBulkStudentClassUpdateModal",
  );
  openCreateBtn?.addEventListener("click", openCreateStudentModal);
  openBulkUpdateBtn?.addEventListener("click", openBulkStudentClassUpdateModal);

  const classForm = document.getElementById("classForm");
  classForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    alert(
      "Tính năng Ghép lớp đã được thay bằng thuộc tính lớp trong hồ sơ học sinh.",
    );
  });
};


