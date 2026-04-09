// @ts-nocheck
import {
  escapeHtml,
  toSafeDomToken,
  sanitizeForStorage,
} from "./security-utils";
import {
  STUDENT_GRADE_OPTIONS,
  normalizeStudentGradeLevel,
} from "./student-grade-utils";
import { isTeacherReferencedBySchedule } from "@/features/teacher-guards/model/can-delete-teacher";

export const registerDataManagement = ({
  ADMIN_EMAIL,
  normalizeEmail,
  isFixedAdmin,
  getCurrentRole,
  getCurrentUser,
  canCurrentUserAccessSchedule,
  getCurrentParentStudentIds,
  reportAccessDenied,
  getSubjectInfo,
  getStudentInfo,
  getClassInfo,
  parseEvaluationRecord,
}) => {
  const isDialogCancelled = (value) => value === null || value === false;

  const bringModalToFront = (modalRoot, baseZ = 170) => {
    const runtimeRaiseModal = globalThis.raiseModalToFront;
    if (typeof runtimeRaiseModal === "function") {
      runtimeRaiseModal(modalRoot, baseZ);
      return;
    }

    const parsedBase = Number.parseInt(String(baseZ || ""), 10);
    if (modalRoot?.style && Number.isFinite(parsedBase)) {
      modalRoot.style.zIndex = String(parsedBase);
    }
  };

  const closeTopLayerFormDialogIfNeeded = () => {
    const dismissRuntimeFormModal = globalThis.dismissAppFormModal;
    if (typeof dismissRuntimeFormModal === "function") {
      dismissRuntimeFormModal();
    }
  };

  const promptStudentGradeLevel = async (currentGrade) => {
    if (typeof globalThis.appSelect === "function") {
      const options = STUDENT_GRADE_OPTIONS.map((grade) => ({
        value: grade,
        label: grade,
      }));
      const selectedGrade = await globalThis.appSelect(
        "Chỉnh sửa học sinh",
        "Lớp đang học (Lớp 1 - Lớp 12):",
        options,
        currentGrade || "Lớp 1",
      );
      if (isDialogCancelled(selectedGrade)) return "";
      return normalizeStudentGradeLevel(selectedGrade);
    }

    const gradeInput = await globalThis.appPrompt(
      "Chỉnh sửa học sinh",
      "Lớp đang học (Lớp 1 - Lớp 12):",
      currentGrade || "Lớp 1",
    );
    if (isDialogCancelled(gradeInput)) return "";
    return normalizeStudentGradeLevel(gradeInput);
  };

  const editSubject = async (id) => {
    const item = globalThis.db.subjects.find((s) => s.id === id);
    if (!item) return;

    const name = await globalThis.appPrompt(
      "Chỉnh sửa môn học",
      "Tên môn học mới:",
      item.name,
    );
    if (!name?.trim()) return;

    const color = await globalThis.appPrompt(
      "Chỉnh sửa màu môn",
      "Màu môn (blue|rose|emerald|amber|purple|cyan):",
      item.color || "blue",
    );

    await globalThis.cloudSave("subjects", {
      ...item,
      name: name.trim(),
      color: color || item.color,
    });
  };

  const editTeacher = async (id) => {
    if (typeof globalThis.openTeacherEditModal === "function") {
      await globalThis.openTeacherEditModal(id);
      return;
    }

    const item = globalThis.db.teachers.find((t) => t.id === id);
    if (!item) return;

    const name = await globalThis.appPrompt(
      "Chỉnh sửa giáo viên",
      "Tên giáo viên:",
      item.name,
    );
    if (!name?.trim()) return;

    const phone =
      (await globalThis.appPrompt(
        "Chỉnh sửa giáo viên",
        "SĐT giáo viên:",
        item.phone || "",
      )) || "";

    await globalThis.cloudSave("teachers", {
      ...item,
      name: name.trim(),
      phone: phone.trim(),
    });
  };

  const editStudent = async (id) => {
    if (typeof globalThis.openStudentEditModal === "function") {
      await globalThis.openStudentEditModal(id);
      return;
    }

    const item = globalThis.db.students.find((s) => s.id === id);
    if (!item) return;

    const name = await globalThis.appPrompt(
      "Chỉnh sửa học sinh",
      "Tên học sinh:",
      item.name,
    );
    if (!name?.trim()) return;

    const parentPhoneInput = await globalThis.appPrompt(
      "Chỉnh sửa học sinh",
      "SĐT phụ huynh:",
      item.parentPhone || "",
    );
    if (isDialogCancelled(parentPhoneInput)) return;

    const gradeLevel = await promptStudentGradeLevel(
      normalizeStudentGradeLevel(item.gradeLevel),
    );
    if (!gradeLevel) {
      return alert(
        "Lớp đang học không hợp lệ. Vui lòng chọn từ Lớp 1 đến Lớp 12.",
      );
    }

    await globalThis.cloudSave("students", {
      ...item,
      name: name.trim(),
      parentPhone: String(parentPhoneInput || "").trim(),
      gradeLevel,
    });
  };

  const editAccount = async (id) => {
    const account = globalThis.db.accounts.find((item) => item.id === id);
    if (!account) return;

    if (normalizeEmail(account.email) === ADMIN_EMAIL) {
      return alert("Không thể chỉnh sửa tài khoản admin cố định.");
    }

    const roleOptions =
      account.role === "admin"
        ? '<option value="admin" selected>Admin</option>'
        : '<option value="teacher" selected>Teacher</option>';

    const result = await globalThis.appFormModal({
      title: "Chỉnh sửa tài khoản",
      description:
        "Cập nhật thông tin an toàn cho tài khoản, tránh ảnh hưởng luồng phân quyền.",
      submitText: "Lưu tài khoản",
      bodyHtml: `
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[12px] font-bold text-slate-600 mb-1">Vai trò</label>
              <select name="role" disabled class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-100 text-slate-600">${roleOptions}</select>
            </div>
            <div>
              <label class="block text-[12px] font-bold text-slate-600 mb-1">Trạng thái</label>
              <select name="active" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
                <option value="true" ${account.active === false ? "" : "selected"}>Đang hoạt động</option>
                <option value="false" ${account.active === false ? "selected" : ""}>Tạm khóa</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-[12px] font-bold text-slate-600 mb-1">Tên hiển thị</label>
            <input name="name" type="text" value="${escapeHtml(account.name || "")}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
          </div>
          <div>
            <label class="block text-[12px] font-bold text-slate-600 mb-1">Email đăng nhập</label>
            <input name="email" type="email" value="${escapeHtml(account.email || "")}" readonly class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-100 text-slate-600" />
          </div>
        `,
      onSubmit: ({ values }) => {
        const name = String(values.name || "").trim();
        const active = String(values.active || "true") === "true";
        return {
          name: name || account.name || "",
          active,
        };
      },
    });

    if (!result) return;

    await globalThis.cloudSave("accounts", {
      ...account,
      name: result.name,
      active: result.active,
    });

    if (account.role !== "teacher" || !account.teacherId) return;

    const teacher = globalThis.db.teachers.find(
      (item) => String(item.id) === String(account.teacherId),
    );
    if (teacher && result.name && result.name !== teacher.name) {
      await globalThis.cloudSave("teachers", {
        ...teacher,
        name: result.name,
      });
    }
  };

  const editClass = async (id) => {
    const item = globalThis.db.classes.find((c) => c.id === id);
    if (!item) return;

    const name = await globalThis.appPrompt(
      "Chỉnh sửa lớp học",
      "Tên lớp học (ví dụ: Lớp 7):",
      item.name,
    );
    if (!name?.trim()) return;

    const groupName = await globalThis.appPrompt(
      "Chỉnh sửa nhóm lớp",
      "Tên nhóm lớp (ví dụ: Nhóm A/Ca tối):",
      item.groupName || "Nhóm mặc định",
    );
    if (!groupName?.trim()) return alert("Thiếu tên nhóm lớp.");

    const currentDays = (item.defaultDays || []).join(",");
    const nextDaysRaw =
      (await globalThis.appPrompt(
        "Chỉnh sửa ngày học mặc định",
        "Nhập danh sách ngày học (2-8, phân tách bởi dấu phẩy). Để trống nếu chưa cấu hình:",
        currentDays,
      )) || "";
    const nextDefaultDays = Array.from(
      new Set(
        nextDaysRaw
          .split(",")
          .map((d) => d.trim())
          .filter((d) => ["2", "3", "4", "5", "6", "7", "8"].includes(d)),
      ),
    ).sort((a, b) => Number(a) - Number(b));

    const subjectHint = globalThis.db.subjects
      .map((s) => `${s.id}: ${s.name}`)
      .join(" | ");
    const nextSubjectId = await globalThis.appPrompt(
      "Chỉnh sửa lớp học",
      `Nhập subjectId mới (${subjectHint}):`,
      item.subjectId,
    );
    if (
      !nextSubjectId ||
      !globalThis.db.subjects.some((s) => s.id === nextSubjectId)
    ) {
      return alert("subjectId không hợp lệ.");
    }

    const currentStudents = (item.studentIds || []).join(",");
    const nextStudentIdsRaw =
      (await globalThis.appPrompt(
        "Chỉnh sửa danh sách học sinh",
        "Nhập danh sách studentId (phân tách bởi dấu phẩy):",
        currentStudents,
      )) || "";
    const nextStudentIds = nextStudentIdsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const hasInvalidStudent = nextStudentIds.some(
      (stuId) => !globalThis.db.students.some((s) => s.id === stuId),
    );
    if (nextStudentIds.length === 0 || hasInvalidStudent) {
      return alert("Danh sách studentId không hợp lệ.");
    }

    await globalThis.cloudSave("classes", {
      ...item,
      name: name.trim(),
      groupName: groupName.trim(),
      subjectId: nextSubjectId,
      studentIds: nextStudentIds,
      defaultDays: nextDefaultDays,
    });
  };

  const editDataHandlers = {
    subjects: editSubject,
    teachers: editTeacher,
    students: editStudent,
    accounts: editAccount,
    classes: editClass,
  };

  globalThis.editData = async (table, id) => {
    if (getCurrentRole() !== "admin") {
      return alert("Bạn không có quyền chỉnh sửa!");
    }

    const handler = editDataHandlers[table];
    if (!handler) return;
    await handler(id);
  };

  const normalizeIdList = (ids) =>
    Array.from(
      new Set((ids || []).map((itemId) => String(itemId || "").trim())),
    ).filter(Boolean);

  const getEffectiveScheduleStudentIds = (schedule) => {
    if (Array.isArray(schedule?.studentIds) && schedule.studentIds.length > 0) {
      return normalizeIdList(schedule.studentIds);
    }
    const classItem = globalThis.db.classes.find(
      (cls) => String(cls.id) === String(schedule?.classId || ""),
    );
    return normalizeIdList(classItem?.studentIds || []);
  };

  const removeStudentFromClasses = async (
    linkedClasses,
    normalizedStudentId,
  ) => {
    let updatedClassCount = 0;

    for (const cls of linkedClasses) {
      const nextStudentIds = normalizeIdList(
        (cls.studentIds || []).filter(
          (itemId) => String(itemId) !== normalizedStudentId,
        ),
      );
      if (nextStudentIds.length === (cls.studentIds || []).length) continue;

      await globalThis.cloudSave("classes", {
        ...cls,
        studentIds: nextStudentIds,
      });
      updatedClassCount += 1;
    }

    return updatedClassCount;
  };

  const removeStudentFromSchedules = async (
    linkedSchedules,
    normalizedStudentId,
  ) => {
    let updatedScheduleCount = 0;
    let deletedScheduleCount = 0;

    for (const schedule of linkedSchedules) {
      const currentStudentIds = getEffectiveScheduleStudentIds(schedule);
      const nextStudentIds = currentStudentIds.filter(
        (itemId) => String(itemId) !== normalizedStudentId,
      );

      const nextEvaluations = schedule.evaluations
        ? { ...schedule.evaluations }
        : {};
      const hasEvaluation = Object.hasOwn(nextEvaluations, normalizedStudentId);
      if (hasEvaluation) {
        delete nextEvaluations[normalizedStudentId];
      }

      if (nextStudentIds.length === 0) {
        await globalThis.cloudDelete("schedules", schedule.id);
        deletedScheduleCount += 1;
        continue;
      }

      const studentChanged = nextStudentIds.length !== currentStudentIds.length;
      if (!studentChanged && !hasEvaluation) continue;

      await globalThis.cloudSave("schedules", {
        ...schedule,
        studentIds: nextStudentIds,
        evaluations: nextEvaluations,
      });
      updatedScheduleCount += 1;
    }

    return { updatedScheduleCount, deletedScheduleCount };
  };

  const deleteStudentWithCascade = async (studentId) => {
    try {
      const normalizedStudentId = String(studentId || "").trim();
      if (!normalizedStudentId) return;

      const student = globalThis.db.students.find(
        (item) => String(item.id) === normalizedStudentId,
      );
      if (!student) return;

      const linkedClasses = globalThis.db.classes.filter((cls) =>
        (cls.studentIds || []).some(
          (itemId) => String(itemId) === normalizedStudentId,
        ),
      );

      const linkedSchedules = globalThis.db.schedules.filter((schedule) => {
        const effectiveStudentIds = getEffectiveScheduleStudentIds(schedule);
        const hasStudent = effectiveStudentIds.includes(normalizedStudentId);
        const hasEvaluation = Object.hasOwn(
          schedule?.evaluations || {},
          normalizedStudentId,
        );
        return hasStudent || hasEvaluation;
      });

      const updatedClassCount = await removeStudentFromClasses(
        linkedClasses,
        normalizedStudentId,
      );
      const { updatedScheduleCount, deletedScheduleCount } =
        await removeStudentFromSchedules(linkedSchedules, normalizedStudentId);

      await globalThis.cloudDelete("students", normalizedStudentId);

      const studentName = String(student.name || normalizedStudentId);
      const summaryParts = [
        `Đã xóa học sinh ${studentName}.`,
        `Lớp cập nhật: ${updatedClassCount}`,
        `Ca cập nhật: ${updatedScheduleCount}`,
      ];
      if (deletedScheduleCount > 0) {
        summaryParts.push(`Ca tự xóa do trống sĩ số: ${deletedScheduleCount}`);
      }
      alert(summaryParts.join(" "));
    } catch (error) {
      console.error("Xóa học sinh thất bại:", error);
      alert("Xóa học sinh thất bại. Vui lòng thử lại sau.");
    }
  };

  const getAccountDeleteGuard = (id) => {
    const acc = globalThis.db.accounts.find((item) => item.id === id);
    if (!acc) {
      return { skip: true, message: "" };
    }

    if (normalizeEmail(acc.email) === ADMIN_EMAIL) {
      return { skip: false, message: "Không thể xóa tài khoản admin cố định!" };
    }
    if (acc.role === "admin" && !isFixedAdmin()) {
      return {
        skip: false,
        message: "Chỉ admin cố định mới được xóa admin phụ.",
      };
    }
    if (
      acc.role === "admin" &&
      normalizeEmail(acc.email) === normalizeEmail(getCurrentUser()?.email)
    ) {
      return {
        skip: false,
        message: "Không thể tự xóa tài khoản admin đang đăng nhập.",
      };
    }

    return { skip: false, message: "" };
  };

  const getDeleteBlockedMessage = (table, id) => {
    if (
      table === "subjects" &&
      (globalThis.db.classes.some((c) => c.subjectId === id) ||
        globalThis.db.schedules.some((s) => s.subjectId === id) ||
        globalThis.db.teachers.some((t) => t.subjectIds.includes(id)))
    ) {
      return { skip: false, message: "Không thể xóa Môn đang sử dụng!" };
    }

    if (
      table === "teachers" &&
      globalThis.db.schedules.some((s) => isTeacherReferencedBySchedule(s, id))
    ) {
      return { skip: false, message: "Không thể xóa GV đang có lịch!" };
    }

    if (
      table === "classes" &&
      globalThis.db.schedules.some((s) => s.classId === id)
    ) {
      return { skip: false, message: "Không thể xóa Lớp đã xếp lịch!" };
    }

    if (table === "accounts") {
      return getAccountDeleteGuard(id);
    }

    return { skip: false, message: "" };
  };

  const deleteTeacherAndLinkedAccounts = async (id) => {
    const teacher = globalThis.db.teachers.find((item) => item.id === id);
    await globalThis.cloudDelete("teachers", id);

    if (!teacher?.email) return;

    const teacherEmail = normalizeEmail(teacher.email);
    const linkedAccounts = globalThis.db.accounts.filter(
      (account) => normalizeEmail(account.email) === teacherEmail,
    );
    for (const account of linkedAccounts) {
      await globalThis.cloudDelete("accounts", account.id);
    }
  };

  const executeDeleteByTable = async (table, id) => {
    if (table === "teachers") {
      await deleteTeacherAndLinkedAccounts(id);
      return;
    }
    if (table === "students") {
      await deleteStudentWithCascade(id);
      return;
    }

    await globalThis.cloudDelete(table, id);
  };

  globalThis.deleteData = async (table, id) => {
    if (getCurrentRole() !== "admin") {
      return alert("Bạn không có quyền thực hiện thao tác này!");
    }

    const shouldDelete = await globalThis.appConfirm(
      "Bạn có chắc chắn muốn xóa dữ liệu này?",
      "Xác nhận xóa",
    );
    if (!shouldDelete) return;

    const guard = getDeleteBlockedMessage(table, id);
    if (guard.skip) return;
    if (guard.message) {
      return alert(guard.message);
    }

    await executeDeleteByTable(table, id);
  };

  let activeEvalId = null;
  const evalModal = document.getElementById("evalModal");
  const reportEvalOpenDenied = (schId, reason, details) => {
    if (typeof reportAccessDenied !== "function") return;

    reportAccessDenied({
      action: "schedule.eval.open",
      reason,
      resourceType: "schedule",
      resourceId: String(schId || ""),
      details,
    });
  };

  const getParentStudentIdSet = (isParentReadOnly) => {
    if (!isParentReadOnly || typeof getCurrentParentStudentIds !== "function") {
      return new Set();
    }

    return new Set(
      (getCurrentParentStudentIds() || [])
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    );
  };

  const getVisibleScheduleStudentIds = ({
    sch,
    cls,
    isParentReadOnly,
    parentStudentIdSet,
  }) => {
    const scheduleStudentIds =
      Array.isArray(sch.studentIds) && sch.studentIds.length > 0
        ? sch.studentIds
        : cls?.studentIds || [];

    if (!isParentReadOnly) return scheduleStudentIds;

    return scheduleStudentIds.filter((stuId) =>
      parentStudentIdSet.has(String(stuId || "").trim()),
    );
  };

  const getEvalClassLabel = (sch, cls) => {
    if (!cls) {
      return sch.classLabel || "Lớp đã xóa";
    }

    if (!cls.groupName) {
      return cls.name;
    }

    return `${cls.name} - ${cls.groupName}`;
  };

  const renderEvalStudents = ({
    sch,
    scheduleStudentIds,
    controlDisabledAttr,
    textAreaReadOnlyAttr,
  }) => {
    return scheduleStudentIds
      .map((stuId) => {
        const stu = getStudentInfo(stuId);
        const currentEval = parseEvaluationRecord(sch.evaluations?.[stuId]);
        const fieldToken = toSafeDomToken(stuId);
        const currentAbsent =
          currentEval?.absent === true || currentEval?.level === "absent";
        const currentLevel =
          currentEval?.level && currentEval.level !== "absent"
            ? currentEval.level
            : "fair";
        const currentNote = currentEval?.note || "";
        return `<div class="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm"><div class="flex items-center gap-3 mb-3"><div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-sm uppercase">${escapeHtml(stu.name.charAt(0) || "?")}</div><div><h4 class="font-bold text-slate-800 text-sm">${escapeHtml(stu.name)}</h4><div class="text-[11px] text-slate-500">Phụ huynh: ${escapeHtml(stu.parentPhone || "N/A")}</div></div></div><div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2"><label class="flex items-center gap-2 text-[12px] border border-emerald-200 bg-emerald-50 rounded px-2 py-1.5"><input type="radio" name="eval_level_${fieldToken}" value="good" ${currentLevel === "good" ? "checked" : ""} ${controlDisabledAttr}> Tốt</label><label class="flex items-center gap-2 text-[12px] border border-amber-200 bg-amber-50 rounded px-2 py-1.5"><input type="radio" name="eval_level_${fieldToken}" value="fair" ${currentLevel === "fair" ? "checked" : ""} ${controlDisabledAttr}> Khá</label><label class="flex items-center gap-2 text-[12px] border border-rose-200 bg-rose-50 rounded px-2 py-1.5"><input type="radio" name="eval_level_${fieldToken}" value="watch" ${currentLevel === "watch" ? "checked" : ""} ${controlDisabledAttr}> Cần theo dõi</label></div><label class="flex items-center gap-2 text-[12px] border border-rose-200 bg-rose-50 rounded px-3 py-2 mb-2 text-rose-700 font-medium"><input type="checkbox" id="eval_absent_${fieldToken}" ${currentAbsent ? "checked" : ""} ${controlDisabledAttr} class="rounded border-rose-300 text-rose-600 focus:ring-rose-500"> Đánh dấu vắng buổi này</label><textarea id="eval_note_${fieldToken}" rows="2" placeholder="Ghi chú thêm (tuỳ chọn)..." ${textAreaReadOnlyAttr} class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500">${escapeHtml(currentNote)}</textarea></div>`;
      })
      .join("");
  };

  const toggleSaveEvalButton = (isParentReadOnly) => {
    const saveEvalBtn = document.getElementById("saveEvalBtn");
    if (!saveEvalBtn) return;
    saveEvalBtn.classList.toggle("hidden", isParentReadOnly);
    saveEvalBtn.disabled = isParentReadOnly;
  };

  globalThis.openEvalModal = (schId) => {
    closeTopLayerFormDialogIfNeeded();

    const role = getCurrentRole();
    const currentUser = getCurrentUser();
    const sch = globalThis.db.schedules.find((item) => item.id === schId);
    if (!sch) {
      return alert("Không tìm thấy ca dạy để xem đánh giá.");
    }

    const canOpenSchedule =
      typeof canCurrentUserAccessSchedule !== "function" ||
      canCurrentUserAccessSchedule(sch, role, currentUser);
    if (!canOpenSchedule) {
      reportEvalOpenDenied(schId, "schedule_not_visible_for_role", {
        role: String(role || ""),
      });
      return alert("Bạn không có quyền xem đánh giá của ca dạy này.");
    }

    activeEvalId = schId;
    const isParentReadOnly = role === "parent";
    const parentStudentIdSet = getParentStudentIdSet(isParentReadOnly);
    const cls = getClassInfo(sch.classId);
    const scheduleSubjectId = sch.subjectId || cls?.subjectId;
    const scheduleStudentIds = getVisibleScheduleStudentIds({
      sch,
      cls,
      isParentReadOnly,
      parentStudentIdSet,
    });

    if (isParentReadOnly && scheduleStudentIds.length === 0) {
      reportEvalOpenDenied(schId, "parent_not_linked_to_schedule_students", {
        role: String(role || ""),
        parentLinkedStudentCount: parentStudentIdSet.size,
      });
      activeEvalId = null;
      return alert("Không có dữ liệu đánh giá thuộc học sinh được liên kết.");
    }

    const controlDisabledAttr = isParentReadOnly ? "disabled" : "";
    const textAreaReadOnlyAttr = isParentReadOnly ? "readonly" : "";
    const classLabel = getEvalClassLabel(sch, cls);

    document.getElementById("evalModalSubtitle").innerText =
      `${classLabel} (${getSubjectInfo(scheduleSubjectId).name}) • ${sch.startTime} - ${sch.endTime}`;
    document.getElementById("evalStudentsContainer").innerHTML =
      renderEvalStudents({
        sch,
        scheduleStudentIds,
        controlDisabledAttr,
        textAreaReadOnlyAttr,
      });

    toggleSaveEvalButton(isParentReadOnly);
    bringModalToFront(evalModal, 172);
    evalModal.classList.remove("hidden");
    evalModal.classList.add("flex");
    lucide.createIcons();
  };

  globalThis.closeEvalModal = () => {
    evalModal.classList.add("hidden");
    evalModal.classList.remove("flex");
    activeEvalId = null;
  };

  document.getElementById("saveEvalBtn").addEventListener("click", async () => {
    if (getCurrentRole() === "parent") {
      if (typeof reportAccessDenied === "function") {
        reportAccessDenied({
          action: "schedule.eval.submit",
          reason: "read_only_parent_role",
          resourceType: "schedule",
          resourceId: String(activeEvalId || ""),
          details: {
            role: String(getCurrentRole() || ""),
          },
        });
      }
      return alert("Tài khoản phụ huynh chỉ có quyền xem đánh giá.");
    }
    if (!activeEvalId) return;
    const btn = document.getElementById("saveEvalBtn");
    btn.innerHTML =
      '<i class="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full"></i> Đang lưu...';
    btn.disabled = true;

    const sch = globalThis.db.schedules.find((s) => s.id === activeEvalId);
    if (!sch.evaluations) sch.evaluations = {};
    const cls = getClassInfo(sch.classId);
    const scheduleStudentIds =
      Array.isArray(sch.studentIds) && sch.studentIds.length > 0
        ? sch.studentIds
        : cls?.studentIds || [];
    scheduleStudentIds.forEach((stuId) => {
      const fieldToken = toSafeDomToken(stuId);
      const levelInput = document.querySelector(
        `input[name='eval_level_${fieldToken}']:checked`,
      );
      const isAbsent = !!document.getElementById(`eval_absent_${fieldToken}`)
        ?.checked;
      const level = levelInput ? levelInput.value : "fair";
      const normalizedLevel =
        level === "good" || level === "fair" || level === "watch"
          ? level
          : "fair";
      const note =
        document.getElementById(`eval_note_${fieldToken}`)?.value?.trim() || "";
      const sanitizedNote = sanitizeForStorage(note);
      const normalizedNote =
        typeof sanitizedNote === "string" ? sanitizedNote : "";
      sch.evaluations[stuId] = {
        level: isAbsent ? "absent" : normalizedLevel,
        absent: isAbsent,
        note: normalizedNote,
      };
    });

    await globalThis.cloudSave("schedules", sch);
    btn.innerHTML =
      '<i data-lucide="cloud-upload" class="w-4 h-4"></i> Lưu Cloud';
    btn.disabled = false;
    globalThis.closeEvalModal();
    lucide.createIcons();
  });
};
