import { escapeHtml, escapeAttr } from "./security-utils.js";

export const registerRenderCore = ({
  colorStyles,
  dotColors,
  normalizeEmail,
  ADMIN_EMAIL,
  isFixedAdmin,
  getCurrentRole,
  getCurrentUser,
  getSubjectInfo,
  getTeacherInfo,
  getStudentInfo,
  getClassInfo,
  parseEvaluationRecord,
  getEvalLevelMeta,
  getLatestStudentEvaluation,
  getDurationHours,
  formatHours,
  formatDayOfWeek,
  getWeekAttendanceOverview,
  renderMasterOverview,
}) => {
  const safeText = (value) => escapeHtml(value);
  const safeAttr = (value) => escapeAttr(value);
  const safeColorKey = (value) =>
    Object.hasOwn(colorStyles, value) ? value : "blue";
  const toClassToken = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replaceAll(/^-+|-+$/g, "") || "unknown";

  const getStudentGradeLevel = (student) =>
    String(
      student?.gradeLevel || student?.classLevel || "Chưa phân lớp",
    ).trim();

  const buildAutoClassGroups = () => {
    const grouped = new Map();
    globalThis.db.students.forEach((student) => {
      const gradeLevel = getStudentGradeLevel(student);
      if (!grouped.has(gradeLevel)) {
        grouped.set(gradeLevel, []);
      }
      grouped.get(gradeLevel).push(student.id);
    });

    return Array.from(grouped.entries())
      .map(([gradeLevel, studentIds]) => ({
        id: `grade_${toClassToken(gradeLevel)}`,
        name: gradeLevel,
        groupName: "Tự động",
        studentIds,
        defaultDays: [],
      }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  };

  const getSelectableClasses = () => {
    const autoGroups = buildAutoClassGroups();
    if (autoGroups.length > 0) return autoGroups;
    return globalThis.db.classes || [];
  };

  const getClassInfoSafe = (id) => {
    const fromDb = getClassInfo(id);
    if (fromDb) return fromDb;
    return getSelectableClasses().find((c) => String(c.id) === String(id));
  };

  const getScheduleSubjectInfo = (schedule) => {
    const classInfo = getClassInfoSafe(schedule?.classId);
    const subjectId = schedule?.subjectId || classInfo?.subjectId || "";
    return getSubjectInfo(subjectId);
  };

  const getScheduleStudentIds = (schedule, cls) => {
    if (Array.isArray(schedule?.studentIds) && schedule.studentIds.length > 0) {
      return schedule.studentIds;
    }
    return cls?.studentIds || [];
  };

  const getScheduleClassLabel = (schedule, cls) => {
    if (schedule?.classLabel) return schedule.classLabel;
    if (!cls) return "Lớp đã xóa";
    return getClassDisplayName(cls);
  };

  const masterTabKeys = [
    "overview",
    "subjects",
    "teachers",
    "students",
    "accounts",
  ];

  const switchMasterTab = (tabName = "overview") => {
    const nextTab = masterTabKeys.includes(tabName) ? tabName : "overview";
    globalThis.currentMasterTab = nextTab;

    masterTabKeys.forEach((key) => {
      const panel = document.getElementById(`masterPanel_${key}`);
      const btn = document.getElementById(`masterTabBtn_${key}`);
      if (panel) {
        panel.classList.toggle("hidden", key !== nextTab);
      }
      if (btn) {
        const isActive = key === nextTab;
        btn.className = isActive
          ? "master-tab-btn px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap bg-indigo-100 text-indigo-700"
          : "master-tab-btn px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap text-slate-600 hover:bg-slate-100";
      }
    });

    refreshIcons();
  };

  globalThis.switchMasterTab = switchMasterTab;

  let iconRenderFrame = null;

  const refreshIcons = () => {
    if (iconRenderFrame !== null) return;
    iconRenderFrame = globalThis.requestAnimationFrame(() => {
      iconRenderFrame = null;
      lucide.createIcons();
    });
  };

  const getScheduleApprovalStatus = (schedule) => {
    const status = schedule?.approval?.status;
    if (
      status === "pending" ||
      status === "rejected" ||
      status === "approved"
    ) {
      return status;
    }
    return "approved";
  };

  const getScheduleApprovalMeta = (schedule) => {
    const status = getScheduleApprovalStatus(schedule);
    if (status === "pending") {
      return {
        status,
        label: "Chờ duyệt",
        className: "bg-amber-50 text-amber-700 border-amber-200",
      };
    }
    if (status === "rejected") {
      return {
        status,
        label: "Từ chối",
        className: "bg-rose-50 text-rose-700 border-rose-200",
      };
    }
    return {
      status,
      label: "Đã duyệt",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  };

  const getClassGroupName = (cls) =>
    String(cls?.groupName || "Nhóm mặc định").trim();

  const getClassDefaultDays = (cls) =>
    Array.from(new Set((cls?.defaultDays || []).map(String)))
      .filter((d) => ["2", "3", "4", "5", "6", "7", "8"].includes(d))
      .sort((a, b) => Number(a) - Number(b));

  const getClassDefaultDaysText = (cls) => {
    const days = getClassDefaultDays(cls);
    if (days.length === 0) return "Chưa cấu hình ngày học mặc định";
    return days.map((d) => formatDayOfWeek(d)).join(", ");
  };

  const getClassDisplayName = (cls) =>
    `${String(cls?.name || "Lớp").trim()} - ${getClassGroupName(cls)}`;

  const getClassStudentPreview = (cls, limit = 3) => {
    const names = (cls?.studentIds || [])
      .map((id) => getStudentInfo(id).name)
      .filter(Boolean);
    if (names.length <= limit) return names.join(", ");
    return `${names.slice(0, limit).join(", ")} +${names.length - limit}`;
  };

  const renderSubjects = () => {
    const list = document.getElementById("subjectList");
    const selectCls = document.getElementById("cls_subjectId");
    const scheduleSubjectSelect = document.getElementById("sch_subjectId");
    const teaTagsContainer = document.getElementById("tea_subjectTags");
    if (list) {
      list.innerHTML = globalThis.db.subjects
        .map(
          (sub) => `
                <div class="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg group border border-slate-100 hover:border-slate-200">
                    <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full ${dotColors[safeColorKey(sub.color)] || "bg-slate-400"} shadow-sm"></span><span class="text-sm font-bold text-slate-700">${safeText(sub.name)}</span></div>
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button onclick="globalThis.editData('subjects', '${safeAttr(sub.id)}')" class="text-slate-300 hover:text-indigo-500"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                    <button onclick="globalThis.deleteData('subjects', '${safeAttr(sub.id)}')" class="text-slate-300 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                  </div>
                </div>
            `,
        )
        .join("");
    }

    const subjectOptions =
      '<option value="">-- Chọn môn --</option>' +
      globalThis.db.subjects
        .map(
          (sub) =>
            `<option value="${safeAttr(sub.id)}">${safeText(sub.name)}</option>`,
        )
        .join("");

    if (selectCls) {
      selectCls.innerHTML = subjectOptions;
    }
    if (scheduleSubjectSelect) {
      const role = getCurrentRole();
      const currentUser = getCurrentUser();
      const currentTeacher = getTeacherInfo(currentUser?.id);
      const allowedTeacherSubjectIds = new Set(
        (currentTeacher?.subjectIds || []).map(String),
      );
      const selectableSubjects =
        role === "teacher"
          ? globalThis.db.subjects.filter((sub) =>
              allowedTeacherSubjectIds.has(String(sub.id)),
            )
          : globalThis.db.subjects;

      const selected = scheduleSubjectSelect.value;
      scheduleSubjectSelect.innerHTML =
        '<option value="">-- Chọn môn học --</option>' +
        selectableSubjects
          .map(
            (sub) =>
              `<option value="${safeAttr(sub.id)}">${safeText(sub.name)}</option>`,
          )
          .join("");
      if (
        selected &&
        selectableSubjects.some((sub) => String(sub.id) === String(selected))
      ) {
        scheduleSubjectSelect.value = selected;
      } else {
        scheduleSubjectSelect.value = "";
      }
    }
    if (teaTagsContainer) {
      teaTagsContainer.innerHTML = globalThis.db.subjects
        .map(
          (sub) => `
                <label class="cursor-pointer relative"><input type="checkbox" value="${safeAttr(sub.id)}" class="peer sr-only">
                    <div class="px-2.5 py-1 text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-md peer-checked:bg-indigo-50 peer-checked:text-indigo-700 peer-checked:border-indigo-300 hover:bg-slate-200">${safeText(sub.name)}</div>
                </label>
            `,
        )
        .join("");
    }
    refreshIcons();
  };

  const renderTeachers = () => {
    const teacherList = document.getElementById("teacherList");
    const teacherListCount = document.getElementById("teacherListCount");
    if (!teacherList) return;

    teacherList.innerHTML = globalThis.db.teachers
      .map((tea) => {
        const subjectsTags = tea.subjectIds
          .map((id) => {
            const sub = getSubjectInfo(id);
            const colorClass =
              colorStyles[safeColorKey(sub.color)] ||
              "bg-slate-100 text-slate-800 border-slate-200";
            return `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded border ${colorClass}">${safeText(sub.name)}</span>`;
          })
          .join(" ");
        return `
                <div class="bg-white border border-slate-200 p-3 rounded-xl shadow-sm group hover:border-amber-200 relative overflow-hidden">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0 border border-amber-200">${safeText(tea.name.charAt(0) || "?")}</div>
                        <div class="flex-1 min-w-0">
                            <div class="flex justify-between items-start mb-0.5"><h3 class="font-bold text-slate-800 text-sm truncate pr-2">${safeText(tea.name)}</h3>
                                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                                  <button onclick="globalThis.editData('teachers', '${safeAttr(tea.id)}')" class="text-slate-300 hover:text-indigo-500"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
                                  <button onclick="globalThis.deleteData('teachers', '${safeAttr(tea.id)}')" class="text-slate-300 hover:text-red-500"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                                </div>
                            </div>
                            <div class="text-[10px] text-slate-500 mb-0.5 font-medium"><i data-lucide="mail" class="w-3 h-3 inline"></i> ${safeText(tea.email)}</div>
                            <div class="text-[10px] text-slate-400 mb-2"><i data-lucide="phone" class="w-3 h-3 inline"></i> ${safeText(tea.phone || "N/A")}</div>
                            <div class="flex flex-wrap gap-1">${subjectsTags || '<span class="text-[10px] text-slate-400 italic">Chưa có môn</span>'}</div>
                        </div>
                    </div>
                </div>`;
      })
      .join("");
    if (teacherListCount) {
      teacherListCount.innerText = `${globalThis.db.teachers.length}`;
    }
    refreshIcons();
  };

  const renderAccounts = () => {
    const pendingList = document.getElementById("accountPendingList");
    const adminList = document.getElementById("accountAdminList");
    const grantedList = document.getElementById("accountGrantedList");
    const pendingCard = document.getElementById("accountPendingCard");
    const adminCard = document.getElementById("accountAdminCard");
    const secondaryEmptyHint = document.getElementById(
      "accountSecondaryEmptyHint",
    );
    const adminCount = document.getElementById("accountAdminCount");
    const pendingCount = document.getElementById("accountPendingCount");
    const grantedCount = document.getElementById("accountGrantedCount");
    if (!pendingList || !grantedList || !adminList) return;

    const adminAccounts = globalThis.db.accounts.filter(
      (acc) =>
        acc.role === "admin" && normalizeEmail(acc.email) !== ADMIN_EMAIL,
    );

    const teacherAccounts = globalThis.db.accounts.filter(
      (acc) => acc.role === "teacher",
    );
    const teacherAccountEmails = new Set(
      teacherAccounts.map((acc) => normalizeEmail(acc.email)),
    );

    const availableTeachers = globalThis.db.teachers.filter((tea) => {
      const email = normalizeEmail(tea.email);
      return email && email !== ADMIN_EMAIL && !teacherAccountEmails.has(email);
    });

    const pendingCards = availableTeachers
      .map((tea) => {
        return `
                <div class="border border-slate-200 bg-white rounded-lg p-2 flex items-center justify-between gap-2">
                    <div class="min-w-0">
                      <div class="text-[11px] font-bold text-slate-800 truncate">${safeText(tea.name)}</div>
                      <div class="text-[11px] text-slate-500 truncate">${safeText(tea.email)}</div>
                    </div>
                    <button onclick="globalThis.openGrantTeacherAccountModal('${safeAttr(tea.id)}')" class="text-[11px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 px-2 py-1 rounded">Cấp</button>
                </div>
            `;
      })
      .join("");

    const adminCards = adminAccounts
      .map((acc) => {
        const canDelete = isFixedAdmin();
        return `
                <div class="border border-slate-200 bg-white rounded-lg p-2.5 flex items-start justify-between gap-2 group">
                    <div class="min-w-0">
                    <div class="text-[11px] font-bold text-slate-800 truncate">${safeText(acc.name || "Admin")}</div>
                    <div class="text-[11px] text-slate-500 truncate">${safeText(acc.email)}</div>
                        <span class="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase">Admin</span>
                    </div>
                  <div class="flex items-center gap-1">
                    <button onclick="globalThis.editData('accounts', '${safeAttr(acc.id)}')" class="text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
                    ${canDelete ? `<button onclick="globalThis.deleteData('accounts', '${safeAttr(acc.id)}')" class="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>` : ""}
                  </div>
                </div>
            `;
      })
      .join("");

    const grantedCards = teacherAccounts
      .map((acc) => {
        const teacher =
          globalThis.db.teachers.find((t) => t.id === acc.teacherId) ||
          globalThis.db.teachers.find(
            (t) => normalizeEmail(t.email) === normalizeEmail(acc.email),
          );
        const teacherName = teacher ? teacher.name : acc.name || "Giáo viên";
        return `
                    <div class="border border-slate-200 bg-white rounded-lg p-2.5 flex items-start justify-between gap-2 group">
                        <div class="min-w-0">
                        <div class="text-[11px] font-bold text-slate-800 truncate">${safeText(teacherName)}</div>
                        <div class="text-[11px] text-slate-500 truncate">${safeText(acc.email)}</div>
                            <span class="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-bold uppercase">Teacher</span>
                        </div>
                      <div class="flex items-center gap-1">
                        <button onclick="globalThis.editData('accounts', '${safeAttr(acc.id)}')" class="text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
                        <button onclick="globalThis.deleteData('accounts', '${safeAttr(acc.id)}')" class="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                      </div>
                    </div>
                `;
      })
      .join("");

    const hasPendingTeachers = availableTeachers.length > 0;
    const hasSubAdmins = adminAccounts.length > 0;

    pendingList.innerHTML = hasPendingTeachers ? pendingCards : "";
    adminList.innerHTML = hasSubAdmins ? adminCards : "";

    grantedList.innerHTML =
      grantedCards ||
      '<div class="text-[11px] text-slate-400 italic p-1">Chưa có tài khoản giáo viên nào.</div>';

    adminCount.innerText = `${adminAccounts.length}`;
    pendingCount.innerText = `${availableTeachers.length}`;
    grantedCount.innerText = `${teacherAccounts.length}`;

    pendingCard?.classList.toggle("hidden", !hasPendingTeachers);
    adminCard?.classList.toggle("hidden", !hasSubAdmins);
    secondaryEmptyHint?.classList.toggle(
      "hidden",
      hasPendingTeachers || hasSubAdmins,
    );

    refreshIcons();
  };

  const renderStudents = () => {
    const studentList = document.getElementById("studentList");
    if (!studentList) return;

    studentList.innerHTML = globalThis.db.students
      .map((stu) => {
        const latest = getLatestStudentEvaluation(stu.id);
        const gradeLabel = safeText(
          String(stu.gradeLevel || stu.classLevel || "Chưa phân lớp"),
        );
        const evalBadge = latest
          ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded border ${getEvalLevelMeta(latest.level).className}">${getEvalLevelMeta(latest.level).label}</span>`
          : '<span class="text-[10px] text-slate-400 italic">Chưa đánh giá</span>';
        return `
                <div class="bg-white border border-slate-200 p-3 rounded-lg shadow-sm flex justify-between items-center group hover:border-blue-200">
                    <div>
                      <div class="text-sm font-bold text-slate-800">${safeText(stu.name)} <span class="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5 ml-1">${gradeLabel}</span></div>
                      <div class="text-[11px] text-slate-500 mt-0.5"><i data-lucide="phone" class="w-3 h-3 inline"></i> ${safeText(stu.parentPhone || "N/A")}</div>
                      <div class="mt-1">${evalBadge}</div>
                    </div>
                    <div class="flex items-center gap-1 opacity-100">
                      <button onclick="globalThis.editData('students', '${safeAttr(stu.id)}')" title="Chỉnh sửa thông tin học sinh" class="text-slate-300 hover:text-indigo-500"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                      <button onclick="globalThis.deleteData('students', '${safeAttr(stu.id)}')" title="Xóa học sinh" class="text-slate-300 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </div>`;
      })
      .join("");
    const studentCheckboxes = document.getElementById("cls_studentCheckboxes");
    if (studentCheckboxes) {
      studentCheckboxes.innerHTML = globalThis.db.students
        .map(
          (stu) => `
                <label class="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer border border-transparent hover:border-slate-200">
                  <input type="checkbox" value="${safeAttr(stu.id)}" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"><span class="text-[12px] text-slate-700 font-medium">${safeText(stu.name)}</span>
                </label>`,
        )
        .join("");
    }
    refreshIcons();
  };

  const renderClasses = () => {
    const classListEl = document.getElementById("classList");
    const scheduleClassSelect = document.getElementById("sch_classId");
    const sortedClasses = [...getSelectableClasses()].sort((a, b) => {
      const byName = String(a.name || "").localeCompare(String(b.name || ""));
      if (byName !== 0) return byName;
      return getClassGroupName(a).localeCompare(getClassGroupName(b));
    });

    if (classListEl) {
      classListEl.innerHTML = sortedClasses
        .map((cls) => {
          const daysText = getClassDefaultDaysText(cls);
          return `
                <div class="bg-white border border-slate-200 p-3 rounded-xl shadow-sm relative group overflow-hidden hover:border-indigo-200">
                    <div class="flex justify-between items-start mb-2 pl-2">
                        <div><h3 class="font-bold text-slate-900 text-sm leading-tight">${safeText(getClassDisplayName(cls))}</h3><span class="text-[10px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded mt-1 inline-block">${safeText(daysText)}</span></div>
                    </div>
                    <div class="text-[11px] text-slate-500 pl-2 line-clamp-2"><span class="font-semibold text-slate-600">${cls.studentIds.length} HS:</span> ${cls.studentIds.map((id) => safeText(getStudentInfo(id).name)).join(", ")}</div>
                </div>`;
        })
        .join("");
    }

    if (scheduleClassSelect) {
      const selectedClassId = scheduleClassSelect.value;
      if (sortedClasses.length === 0) {
        scheduleClassSelect.innerHTML =
          '<option value="">-- Chưa có nhóm/lớp từ hồ sơ học sinh --</option>';
      } else {
        scheduleClassSelect.innerHTML =
          '<option value="">-- Chọn Nhóm/Lớp --</option>' +
          sortedClasses
            .map(
              (cls) =>
                `<option value="${safeAttr(cls.id)}">${safeText(getClassDisplayName(cls))} | ${safeText(String(cls.studentIds.length))} HS: ${safeText(getClassStudentPreview(cls, 2))}</option>`,
            )
            .join("");
      }
      if (
        selectedClassId &&
        sortedClasses.some((cls) => String(cls.id) === String(selectedClassId))
      ) {
        scheduleClassSelect.value = selectedClassId;
      }
    }

    refreshIcons();
  };

  globalThis.updateScheduleStudentSelection = () => {
    const studentWrap = document.getElementById("sch_studentPickerWrap");
    const checkboxContainer = document.getElementById("sch_studentCheckboxes");
    const summaryEl = document.getElementById("sch_studentSummary");
    const countBadge = document.getElementById("sch_selectedStudentCount");
    if (!studentWrap || !checkboxContainer || !summaryEl || !countBadge) return;

    const all = checkboxContainer.querySelectorAll("input[type='checkbox']");
    const checked = checkboxContainer.querySelectorAll(
      "input[type='checkbox']:checked",
    );
    countBadge.innerText = `${checked.length}/${all.length}`;
    if (checked.length === 0) {
      summaryEl.innerText =
        "Chưa chọn học sinh nào cho ca này. Vui lòng chọn ít nhất 1 học sinh.";
      summaryEl.className = "text-[11px] text-rose-600 mb-1.5 font-medium";
      return;
    }
    summaryEl.innerText = `Đã chọn ${checked.length} học sinh cho ca dạy.`;
    summaryEl.className = "text-[11px] text-slate-500 mb-1.5";
  };

  globalThis.handleClassSelection = () => {
    const currentRole = getCurrentRole();
    const currentUser = getCurrentUser();
    const classId = document.getElementById("sch_classId").value;
    const subjectId = document.getElementById("sch_subjectId")?.value || "";
    const hintDiv = document.getElementById("sch_classHint");
    const teacherSelect = document.getElementById("sch_teacherId");
    const filterHint = document.getElementById("teacherFilterHint");
    const studentWrap = document.getElementById("sch_studentPickerWrap");
    const studentCheckboxes = document.getElementById("sch_studentCheckboxes");
    if (!teacherSelect) return;
    if (!classId) {
      hintDiv?.classList.add("hidden");
      teacherSelect.disabled = true;
      teacherSelect.innerHTML =
        '<option value="">-- Vui lòng chọn Nhóm/Lớp trước --</option>';
      if (studentWrap) {
        studentWrap.classList.add("hidden");
        delete studentWrap.dataset.classId;
      }
      if (studentCheckboxes) {
        studentCheckboxes.innerHTML = "";
      }
      filterHint?.classList.add("hidden");
      if (typeof globalThis.syncScheduleFormByRole === "function") {
        globalThis.syncScheduleFormByRole();
      }
      return;
    }

    const cls = getClassInfoSafe(classId);
    if (cls) {
      const prevSelectedIds = new Set(
        Array.from(
          document.querySelectorAll("#sch_studentCheckboxes input:checked"),
        ).map((el) => String(el.value || "")),
      );
      const previousClassId = String(studentWrap?.dataset.classId || "");
      const defaultSelectedIds =
        previousClassId === String(cls.id) && prevSelectedIds.size > 0
          ? prevSelectedIds
          : new Set((cls.studentIds || []).map(String));

      if (studentCheckboxes) {
        studentCheckboxes.innerHTML = (cls.studentIds || [])
          .map((id) => {
            const student = getStudentInfo(id);
            const checkedAttr = defaultSelectedIds.has(String(id))
              ? "checked"
              : "";
            return `<label class="flex items-center gap-2 p-1.5 rounded border border-transparent hover:border-indigo-200 hover:bg-white cursor-pointer"><input type="checkbox" value="${safeAttr(id)}" ${checkedAttr} onchange="globalThis.updateScheduleStudentSelection()" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"><span class="text-[12px] text-slate-700 font-medium">${safeText(student.name)}</span></label>`;
          })
          .join("");
      }
      if (studentWrap) {
        studentWrap.classList.remove("hidden");
        studentWrap.dataset.classId = String(cls.id);
      }

      const studentChips = (cls.studentIds || [])
        .map(
          (id) =>
            `<span class="text-[11px] font-medium px-2 py-0.5 rounded border bg-white border-indigo-200 text-slate-700">${safeText(getStudentInfo(id).name)}</span>`,
        )
        .join(" ");
      if (hintDiv) {
        hintDiv.innerHTML = `<div class="space-y-1"><div><span class="font-bold text-indigo-800">Nhóm lớp:</span> ${safeText(getClassDisplayName(cls))}</div><div><span class="font-bold text-indigo-800">Sĩ số ${safeText(String(cls.studentIds.length))} HS:</span></div><div class="flex flex-wrap gap-1">${studentChips || '<span class="text-[11px] italic text-slate-500">Chưa có học sinh.</span>'}</div></div>`;
        hintDiv.classList.remove("hidden");
      }
      if (typeof globalThis.updateScheduleStudentSelection === "function") {
        globalThis.updateScheduleStudentSelection();
      }

      if (currentRole === "teacher") {
        const currentTeacher = getTeacherInfo(currentUser?.id);
        const teacherName =
          currentTeacher?.name || currentUser?.name || "Giáo viên";
        const subjectSelected = subjectId.length > 0;
        let hasSubjectMatch = true;
        if (subjectSelected) {
          hasSubjectMatch = (currentTeacher?.subjectIds || []).includes(
            subjectId,
          );
        }

        teacherSelect.disabled = true;
        teacherSelect.innerHTML = `<option value="${safeAttr(String(currentUser?.id || ""))}">${safeText(teacherName)}</option>`;
        teacherSelect.value = String(currentUser?.id || "");
        if (filterHint) {
          filterHint.classList.remove("hidden");
          let teacherHint = "Chọn môn để kiểm tra chuyên môn";
          if (subjectSelected) {
            teacherHint = "Môn đã chọn không thuộc chuyên môn của bạn";
            if (hasSubjectMatch) {
              teacherHint = "Đã khóa theo giáo viên đăng nhập";
            }
          }
          filterHint.innerText = teacherHint;
        }
        return;
      }

      if (!subjectId) {
        teacherSelect.disabled = true;
        teacherSelect.innerHTML =
          '<option value="">-- Vui lòng chọn Môn học trước --</option>';
        if (filterHint) {
          filterHint.classList.remove("hidden");
          filterHint.innerText = "Chọn môn để lọc giáo viên";
        }
        return;
      }

      const availableTeachers = globalThis.db.teachers.filter((t) =>
        t.subjectIds.includes(subjectId),
      );

      teacherSelect.disabled = false;
      filterHint?.classList.remove("hidden");
      if (availableTeachers.length > 0) {
        teacherSelect.innerHTML =
          '<option value="">-- Chọn Giáo viên --</option>' +
          availableTeachers
            .map(
              (t) =>
                `<option value="${safeAttr(t.id)}">${safeText(t.name)}</option>`,
            )
            .join("");
        if (filterHint) filterHint.innerText = "Đã lọc theo môn";
      } else {
        teacherSelect.innerHTML =
          '<option value="">-- Không có GV chuyên môn này --</option>';
        if (filterHint) {
          filterHint.innerText = "Không có giáo viên phù hợp môn đã chọn";
        }
      }
      return;
    }

    if (hintDiv) {
      hintDiv.innerHTML =
        '<span class="text-[11px] text-rose-700">Không tìm thấy nhóm/lớp cho lịch này. Vui lòng chọn lại.</span>';
      hintDiv.classList.remove("hidden");
    }
    if (studentWrap) {
      studentWrap.classList.add("hidden");
      delete studentWrap.dataset.classId;
    }
    if (studentCheckboxes) {
      studentCheckboxes.innerHTML = "";
    }
    teacherSelect.disabled = true;
    teacherSelect.innerHTML =
      '<option value="">-- Nhóm/Lớp không hợp lệ --</option>';
    if (filterHint) {
      filterHint.classList.remove("hidden");
      filterHint.innerText = "Hãy chọn lại nhóm/lớp";
    }
  };

  const formatWeekLabel = (weekToken) => {
    const match = /^(\d{4})-W(\d{2})$/.exec(String(weekToken || ""));
    if (!match) return String(weekToken || "");
    return `Tuần ${Number(match[2])}, ${match[1]}`;
  };

  const getAttendanceBadgeMeta = (attendanceState) => {
    if (attendanceState === "present") {
      return {
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: "Có mặt",
      };
    }
    if (attendanceState === "absent") {
      return {
        className: "bg-rose-50 text-rose-700 border-rose-200",
        label: "Vắng",
      };
    }
    return {
      className: "bg-slate-50 text-slate-600 border-slate-200",
      label: "Chưa chấm",
    };
  };

  globalThis.openTimetableScheduleDetail = async (scheduleId) => {
    const schedule = globalThis.db.schedules.find(
      (item) => String(item.id) === String(scheduleId),
    );
    if (!schedule) {
      alert("Không tìm thấy ca dạy.");
      return;
    }

    const cls = getClassInfoSafe(schedule.classId);
    const classLabel = getScheduleClassLabel(schedule, cls);
    const subjectInfo = getScheduleSubjectInfo(schedule);
    const teacher = getTeacherInfo(schedule.teacherId);
    const approvalMeta = getScheduleApprovalMeta(schedule);
    const attendanceMeta = getAttendanceBadgeMeta(
      schedule.attendance?.status || "pending",
    );
    const studentChips = getScheduleStudentIds(schedule, cls)
      .map(
        (studentId) =>
          `<span class="text-[11px] px-2 py-0.5 rounded border bg-white border-slate-200 text-slate-700">${safeText(getStudentInfo(studentId).name)}</span>`,
      )
      .join(" ");

    const bodyHtml = `
      <div class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div class="text-[10px] font-bold uppercase text-slate-500">Tuần</div>
            <div class="text-sm font-bold text-slate-800">${safeText(formatWeekLabel(schedule.week || ""))}</div>
          </div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div class="text-[10px] font-bold uppercase text-slate-500">Thời gian</div>
            <div class="text-sm font-bold text-slate-800">${safeText(formatDayOfWeek(schedule.dayOfWeek))} • ${safeText(schedule.startTime || "")} - ${safeText(schedule.endTime || "")}</div>
          </div>
        </div>

        <div class="rounded-lg border border-slate-200 bg-white px-3 py-2 space-y-1.5">
          <div class="text-xs font-bold text-slate-800">${safeText(classLabel)}</div>
          <div class="text-[12px] text-slate-600">Môn: <span class="font-semibold">${safeText(subjectInfo.name)}</span></div>
          <div class="text-[12px] text-slate-600">Giáo viên: <span class="font-semibold">${safeText(teacher.name)}</span></div>
          <div class="text-[12px] text-slate-600">Địa điểm: <span class="font-semibold">${safeText(schedule.location || "N/A")}</span></div>
          <div class="text-[12px] text-slate-600">Nội dung: <span class="font-semibold">${safeText(schedule.topic || "Chưa cập nhật")}</span></div>
        </div>

        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-[11px] font-bold px-2 py-0.5 rounded border ${approvalMeta.className}">${safeText(approvalMeta.label)}</span>
          <span class="text-[11px] font-bold px-2 py-0.5 rounded border ${attendanceMeta.className}">${safeText(attendanceMeta.label)}</span>
          <span class="text-[11px] font-bold px-2 py-0.5 rounded border bg-slate-50 text-slate-700 border-slate-200">${safeText(formatHours(getDurationHours(schedule.startTime, schedule.endTime)))}</span>
        </div>

        <div>
          <div class="text-[11px] font-bold uppercase text-slate-500 mb-1">Học sinh</div>
          <div class="flex flex-wrap gap-1.5">${studentChips || '<span class="text-[12px] text-slate-400 italic">Chưa có học sinh.</span>'}</div>
        </div>
      </div>`;

    if (typeof globalThis.appFormModal === "function") {
      await globalThis.appFormModal({
        title: "Chi tiết ca dạy",
        description: "Thông tin chi tiết từ thời khóa biểu tuần.",
        submitText: "Đóng",
        size: "lg",
        bodyHtml,
        onSubmit: () => true,
      });
      return;
    }

    await globalThis.appConfirm(
      "Không thể mở popup chi tiết ở phiên này.",
      "Thông báo",
    );
  };

  const renderScheduleApprovalPanel = (week, currentRole) => {
    const panel = document.getElementById("scheduleApprovalPanel");
    const listEl = document.getElementById("scheduleApprovalList");
    const summaryEl = document.getElementById("scheduleApprovalSummary");
    const badgeEl = document.getElementById("scheduleApprovalBadge");
    if (!panel || !listEl || !summaryEl || !badgeEl) return;

    if (currentRole !== "admin" || !week) {
      panel.classList.add("hidden");
      return;
    }

    const pendingSchedules = globalThis.db.schedules
      .filter(
        (sch) =>
          sch.week === week && getScheduleApprovalStatus(sch) === "pending",
      )
      .sort((a, b) => {
        const dayDiff = Number(a.dayOfWeek) - Number(b.dayOfWeek);
        if (dayDiff !== 0) return dayDiff;
        return String(a.startTime || "").localeCompare(
          String(b.startTime || ""),
        );
      });

    if (pendingSchedules.length === 0) {
      panel.classList.add("hidden");
      return;
    }

    panel.classList.remove("hidden");

    badgeEl.innerText = `${pendingSchedules.length}`;
    summaryEl.innerText = `${formatWeekLabel(week)} • ${pendingSchedules.length} yêu cầu cần duyệt`;

    listEl.innerHTML = pendingSchedules
      .map((sch) => {
        const teacher = getTeacherInfo(sch.teacherId);
        const cls = getClassInfoSafe(sch.classId);
        const classLabel = getScheduleClassLabel(sch, cls);
        const subject = getScheduleSubjectInfo(sch);
        const typeText =
          sch.approval?.requestType === "create"
            ? "Yêu cầu tạo lịch"
            : "Yêu cầu chỉnh sửa";
        return `
          <div class="rounded-lg border border-amber-200 bg-white p-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div class="min-w-0">
              <div class="text-[12px] font-bold text-slate-800 truncate">${safeText(classLabel)} • ${safeText(subject.name)} • ${safeText(teacher.name)}</div>
              <div class="text-[11px] text-slate-500">${safeText(formatDayOfWeek(sch.dayOfWeek))} • ${safeText(sch.startTime)} - ${safeText(sch.endTime)} • ${safeText(sch.location || "N/A")}</div>
              <div class="text-[10px] mt-1 text-amber-700 font-bold">${safeText(typeText)} • ${safeText(sch.approval?.requestedBy || "N/A")}</div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button onclick="globalThis.openScheduleEditor('${safeAttr(sch.id)}')" class="text-[11px] font-bold px-2 py-1 rounded border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100">Sửa</button>
              <button onclick="globalThis.reviewScheduleRequest('${safeAttr(sch.id)}', 'reject')" class="text-[11px] font-bold px-2 py-1 rounded border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100">Từ chối</button>
              <button onclick="globalThis.reviewScheduleRequest('${safeAttr(sch.id)}', 'approve')" class="text-[11px] font-bold px-2 py-1 rounded border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100">Duyệt</button>
            </div>
          </div>`;
      })
      .join("");
  };

  const renderSchedules = () => {
    const currentUser = getCurrentUser();
    const currentRole = getCurrentRole();
    if (!currentUser) return;
    const filterWeek = document.getElementById("filterWeek").value;
    const container = document.getElementById("scheduleContainer");
    if (!container) return;

    renderScheduleApprovalPanel(filterWeek, currentRole);

    let filtered = globalThis.db.schedules.filter((s) => s.week === filterWeek);
    if (currentRole === "teacher") {
      filtered = filtered.filter((s) => s.teacherId === currentUser.id);
    }

    const scheduleViewMode =
      document.getElementById("scheduleViewMode")?.value === "timetable"
        ? "timetable"
        : "list";
    const weekLabel = formatWeekLabel(filterWeek);

    if (filtered.length === 0) {
      const emptyIcon = currentRole === "teacher" ? "coffee" : "inbox";
      const safeWeekLabel = safeText(weekLabel);
      const emptyMessage =
        currentRole === "teacher"
          ? `${safeWeekLabel} bạn không có ca dạy.`
          : `${safeWeekLabel} chưa có lịch.`;
      container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-400 py-20"><i data-lucide="${emptyIcon}" class="w-16 h-16 mb-4 opacity-30"></i><p class="text-lg font-bold text-slate-600">${emptyMessage}</p></div>`;
      refreshIcons();
      return;
    }

    if (scheduleViewMode === "timetable") {
      const dayOrder = ["2", "3", "4", "5", "6", "7", "8"];
      const slotOrder = Array.from(
        new Set(
          filtered
            .map(
              (s) => `${String(s.startTime || "")}|${String(s.endTime || "")}`,
            )
            .filter((slot) => !slot.startsWith("|")),
        ),
      ).sort((a, b) => {
        const [aStart] = a.split("|");
        const [bStart] = b.split("|");
        return String(aStart).localeCompare(String(bStart));
      });

      if (slotOrder.length === 0) {
        container.innerHTML =
          '<div class="flex flex-col items-center justify-center h-full text-slate-400 py-20"><i data-lucide="calendar-x2" class="w-16 h-16 mb-4 opacity-30"></i><p class="text-lg font-bold text-slate-600">Dữ liệu lịch thiếu khung giờ để dựng thời khóa biểu.</p></div>';
        refreshIcons();
        return;
      }

      const byDayAndSlot = {};
      filtered.forEach((sch) => {
        const dayKey = String(sch.dayOfWeek || "");
        const slotKey = `${String(sch.startTime || "")}|${String(sch.endTime || "")}`;
        if (!dayOrder.includes(dayKey) || !slotOrder.includes(slotKey)) return;
        if (!byDayAndSlot[dayKey]) byDayAndSlot[dayKey] = {};
        if (!byDayAndSlot[dayKey][slotKey]) byDayAndSlot[dayKey][slotKey] = [];
        byDayAndSlot[dayKey][slotKey].push(sch);
      });

      const dayHeaders = dayOrder
        .map((dayKey) => {
          const dayCount = filtered.filter(
            (sch) => String(sch.dayOfWeek) === dayKey,
          ).length;
          return `<th class="p-2 border-b border-slate-200 bg-slate-50 text-left align-top"><div class="flex items-center justify-between gap-1"><span class="text-[11px] font-bold text-slate-700">${safeText(formatDayOfWeek(dayKey))}</span><span class="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-semibold">${dayCount}</span></div></th>`;
        })
        .join("");

      const rowsHtml = slotOrder
        .map((slotKey) => {
          const [start, end] = slotKey.split("|");
          const cells = dayOrder
            .map((dayKey) => {
              const list = byDayAndSlot[dayKey]?.[slotKey] || [];
              if (list.length === 0) {
                return '<td class="p-1.5 border-b border-slate-100 align-top"><div class="h-14 rounded-md border border-dashed border-slate-200 bg-slate-50/60"></div></td>';
              }

              const items = list
                .map((sch) => {
                  const cls = getClassInfoSafe(sch.classId);
                  const classLabel = getScheduleClassLabel(sch, cls);
                  const subInfo = getScheduleSubjectInfo(sch);
                  const teacher = getTeacherInfo(sch.teacherId);
                  const approvalMeta = getScheduleApprovalMeta(sch);
                  const canEditSchedule =
                    currentRole === "admin" ||
                    (currentRole === "teacher" &&
                      String(sch.teacherId) === String(currentUser?.id || ""));
                  const canOpenEvaluation = approvalMeta.status === "approved";
                  const attendanceState = sch.attendance?.status || "pending";
                  const attendanceMeta =
                    getAttendanceBadgeMeta(attendanceState);
                  const subjectClass =
                    colorStyles[safeColorKey(subInfo.color)] ||
                    "bg-slate-100 text-slate-800 border-slate-200";
                  const editBtn = canEditSchedule
                    ? `<button onclick="event.stopPropagation(); globalThis.openScheduleEditor('${safeAttr(sch.id)}')" class="text-slate-400 hover:text-indigo-600"><i data-lucide="pencil-line" class="w-3.5 h-3.5"></i></button>`
                    : "";
                  const deleteBtn =
                    currentRole === "admin"
                      ? `<button onclick="event.stopPropagation(); globalThis.deleteData('schedules', '${safeAttr(sch.id)}')" class="text-slate-400 hover:text-rose-600"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>`
                      : "";

                  return `
                    <div onclick="globalThis.openTimetableScheduleDetail('${safeAttr(sch.id)}')" class="rounded-lg border border-slate-200 bg-white p-2.5 mb-1.5 last:mb-0 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all" title="Bấm để xem chi tiết ca dạy">
                      <div class="flex items-start justify-between gap-1.5">
                        <div class="min-w-0">
                          <div class="text-[11px] font-bold text-slate-800 truncate">${safeText(classLabel)}</div>
                          <div class="text-[10px] text-slate-500 truncate">${safeText(teacher.name)}</div>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                          <button onclick="event.stopPropagation(); globalThis.openEvalModal('${safeAttr(sch.id)}')" ${canOpenEvaluation ? "" : "disabled"} class="text-slate-400 hover:text-emerald-600 ${canOpenEvaluation ? "" : "opacity-40 cursor-not-allowed"}"><i data-lucide="clipboard-check" class="w-3.5 h-3.5"></i></button>
                          ${editBtn}
                          ${deleteBtn}
                        </div>
                      </div>
                      <div class="flex items-center gap-1 flex-wrap mt-1.5">
                        <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border ${subjectClass}">${safeText(subInfo.name)}</span>
                        <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border ${attendanceMeta.className}">${attendanceMeta.label}</span>
                      </div>
                      ${sch.topic ? `<div class="text-[10px] text-slate-500 mt-1 line-clamp-2">${safeText(sch.topic)}</div>` : ""}
                    </div>`;
                })
                .join("");

              return `<td class="p-1.5 border-b border-slate-100 align-top">${items}</td>`;
            })
            .join("");

          return `<tr><td class="p-2 border-b border-slate-200 bg-slate-50 align-top w-[108px]"><div class="text-[11px] font-bold text-slate-700">${safeText(start)}</div><div class="text-[10px] text-slate-500">${safeText(end)}</div></td>${cells}</tr>`;
        })
        .join("");

      container.innerHTML = `
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="text-xs font-bold text-slate-700">${safeText(weekLabel)} • TKB tuần</div>
            <div class="text-[11px] text-slate-500">${safeText(String(filtered.length))} ca</div>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white overflow-x-auto custom-scrollbar">
            <table class="min-w-[980px] w-full border-collapse table-fixed">
              <thead>
                <tr>
                  <th class="p-2 border-b border-slate-200 bg-slate-50 text-left w-[108px]"><span class="text-[11px] font-bold text-slate-700">Khung giờ</span></th>
                  ${dayHeaders}
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </div>`;

      refreshIcons();
      return;
    }

    const grouped = {};
    filtered.forEach((s) => {
      if (!grouped[s.dayOfWeek]) grouped[s.dayOfWeek] = [];
      grouped[s.dayOfWeek].push(s);
    });
    const sortedDays = Object.keys(grouped).sort(
      (a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10),
    );

    let html = "";
    sortedDays.forEach((day) => {
      const dayStr = day === "8" ? "Chủ nhật" : `Thứ ${day}`;
      grouped[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
      html += `<div class="mb-8 relative"><div class="flex items-center gap-3 mb-4 sticky top-0 bg-slate-50/90 backdrop-blur-sm py-2 z-10 border-b border-slate-200"><span class="bg-indigo-600 text-white text-sm font-bold px-3 py-1 rounded-md shadow-sm">${dayStr}</span><span class="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full">${grouped[day].length} ca</span></div><div class="space-y-3">`;

      grouped[day].forEach((sch) => {
        const cls = getClassInfoSafe(sch.classId);
        const classLabel = getScheduleClassLabel(sch, cls);
        const subInfo = getScheduleSubjectInfo(sch);
        const scheduleStudentIds = getScheduleStudentIds(sch, cls);
        const approvalMeta = getScheduleApprovalMeta(sch);
        const canEditSchedule =
          currentRole === "admin" ||
          (currentRole === "teacher" &&
            String(sch.teacherId) === String(currentUser?.id || ""));
        const canOpenEvaluation = approvalMeta.status === "approved";
        const colorClass =
          colorStyles[safeColorKey(subInfo.color)] ||
          "bg-slate-100 text-slate-800 border-slate-200";
        const stripeColor =
          dotColors[safeColorKey(subInfo.color)] || "bg-slate-400";
        const teacher = getTeacherInfo(sch.teacherId);
        const evalCount = Object.keys(sch.evaluations || {}).filter((k) => {
          const evalRecord = parseEvaluationRecord(sch.evaluations[k]);
          return !!evalRecord;
        }).length;
        const isDone =
          scheduleStudentIds.length > 0 &&
          evalCount === scheduleStudentIds.length;
        const attendanceState = sch.attendance?.status || "pending";
        let attendanceMeta = {
          label: "Chưa chấm công",
          className: "bg-slate-50 text-slate-600 border-slate-200",
        };
        if (attendanceState === "present") {
          attendanceMeta = {
            label: "Đã chấm công",
            className: "bg-emerald-50 text-emerald-700 border-emerald-200",
          };
        } else if (attendanceState === "absent") {
          attendanceMeta = {
            label: "Vắng",
            className: "bg-rose-50 text-rose-700 border-rose-200",
          };
        }
        const badges = scheduleStudentIds
          .map((id) => {
            const evalRecord = parseEvaluationRecord(sch.evaluations?.[id]);
            const levelMeta = evalRecord
              ? getEvalLevelMeta(evalRecord.level)
              : null;
            const badgeClass = levelMeta
              ? levelMeta.className
              : "bg-slate-50 text-slate-600 border-slate-200";
            const levelSuffix = levelMeta
              ? ` • ${safeText(levelMeta.label)}`
              : "";
            return `<span class="text-[10px] font-medium px-2 py-0.5 rounded border ${badgeClass}">${safeText(getStudentInfo(id).name)}${levelSuffix}</span>`;
          })
          .join(" ");
        const deleteBtnHtml =
          currentRole === "admin"
            ? `<button onclick="globalThis.deleteData('schedules', '${safeAttr(sch.id)}')" class="p-2 w-full sm:w-auto flex justify-center items-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`
            : "";

        const editBtnHtml = canEditSchedule
          ? `<button onclick="globalThis.openScheduleEditor('${safeAttr(sch.id)}')" class="p-2 w-full sm:w-auto flex justify-center items-center text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"><i data-lucide="pencil-line" class="w-4 h-4"></i></button>`
          : "";

        const addStudentBtnHtml = canEditSchedule
          ? `<button onclick="globalThis.addStudentToScheduleClass('${safeAttr(sch.id)}')" class="p-2 w-full sm:w-auto flex justify-center items-center text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors" title="Thêm học sinh vào lớp"><i data-lucide="user-plus" class="w-4 h-4"></i></button>`
          : "";

        const approvalNote = sch.approval?.note
          ? `<div class="text-[10px] text-slate-500 mt-1 italic">${safeText(sch.approval.note)}</div>`
          : "";

        html += `
                        <div class="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 hover:shadow-md transition-shadow relative overflow-hidden group schedule-card content-auto">
                            <div class="absolute left-0 top-0 bottom-0 w-1.5 ${stripeColor}"></div>
                          <div class="sm:w-32 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-100 pb-3 sm:pb-0 pl-1"><div class="text-lg font-bold text-slate-800 flex items-center gap-1.5"><i data-lucide="clock" class="w-4 h-4 text-slate-400"></i> ${safeText(sch.startTime)}</div><div class="text-[11px] text-slate-500 font-medium pl-5 mb-2">- ${safeText(sch.endTime)}</div><div class="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-100 px-2 py-1 rounded inline-block line-clamp-1"><i data-lucide="map-pin" class="w-3 h-3 inline text-slate-400"></i> ${safeText(sch.location)}</div></div>
                            <div class="flex-1 flex flex-col justify-center min-w-0">
                            <div class="flex items-center gap-2 mb-1.5 flex-wrap"><span class="bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">${safeText(classLabel)}</span>${cls?.groupName ? `<span class="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold px-2 py-0.5 rounded">${safeText(getClassGroupName(cls))}</span>` : ""}<span class="text-[11px] font-bold px-2 py-0.5 rounded border ${colorClass}">${safeText(subInfo.name)}</span>${sch.topic ? `<span class="text-slate-400 text-xs">|</span> <span class="text-slate-500 italic text-xs truncate max-w-[150px]">${safeText(sch.topic)}</span>` : ""}</div>
                            <div class="text-sm font-medium text-slate-700 bg-slate-50 self-start px-2 py-0.5 rounded flex items-center gap-1.5 mb-2 border border-slate-100"><i data-lucide="graduation-cap" class="w-3.5 h-3.5 text-slate-400"></i> GV: ${safeText(teacher.name)}</div>
                                <div class="flex items-center gap-1.5 flex-wrap mb-2">
                                  <div class="text-[10px] font-bold px-2 py-0.5 rounded border self-start ${attendanceMeta.className}">${attendanceMeta.label}</div>
                                  <div class="text-[10px] font-bold px-2 py-0.5 rounded border self-start ${approvalMeta.className}">${approvalMeta.label}</div>
                                </div>
                                ${approvalNote}
                                <div class="flex flex-wrap gap-1 mt-auto">${badges}</div>
                            </div>
                            <div class="flex sm:flex-col justify-end gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-3">
                                <button onclick="globalThis.openEvalModal('${safeAttr(sch.id)}')" ${canOpenEvaluation ? "" : "disabled"} class="p-2 w-full sm:w-auto flex justify-center items-center ${isDone ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-slate-600 bg-slate-50 border-slate-200"} ${canOpenEvaluation ? "" : "opacity-50 cursor-not-allowed"} rounded-lg transition-colors group/btn" title="${canOpenEvaluation ? "Đánh giá học sinh" : "Lịch chưa duyệt, chưa thể đánh giá"}"><i data-lucide="${isDone ? "clipboard-check" : "clipboard-pen"}" class="w-4 h-4 group-hover/btn:scale-110 transition-transform"></i></button>
                                ${addStudentBtnHtml}
                                ${editBtnHtml}
                                ${deleteBtnHtml}
                            </div>
                        </div>`;
      });
      html += `</div></div>`;
    });
    container.innerHTML = html;
    refreshIcons();
  };

  const renderAttendance = () => {
    const periodSelect = document.getElementById("attendancePeriod");
    const weekInput = document.getElementById("attendanceWeek");
    const monthInput = document.getElementById("attendanceMonth");
    const weekWrap = document.getElementById("attendanceWeekWrap");
    const monthWrap = document.getElementById("attendanceMonthWrap");
    const periodLabelEl = document.getElementById("attendancePeriodLabel");
    const summaryEl = document.getElementById("attendanceSummary");
    const listEl = document.getElementById("attendanceList");
    const sessionsEl = document.getElementById("attendanceStatSessions");
    const presentEl = document.getElementById("attendanceStatPresent");
    const absentEl = document.getElementById("attendanceStatAbsent");
    const hoursEl = document.getElementById("attendanceStatHours");
    const pendingEl = document.getElementById("attendanceStatPending");
    const rateEl = document.getElementById("attendanceStatRate");
    if (!weekInput || !summaryEl || !listEl) return;

    const getMonthTokenFromWeek = (weekToken) => {
      const match = /^(\d{4})-W(\d{2})$/.exec(String(weekToken || ""));
      if (!match) return "";
      const year = Number(match[1]);
      const week = Number(match[2]);
      if (!year || !week) return "";

      const simple = new Date(year, 0, 1 + (week - 1) * 7);
      const dayOfWeek = simple.getDay();
      const isoMonday = new Date(simple);
      if (dayOfWeek <= 4 && dayOfWeek > 0) {
        isoMonday.setDate(simple.getDate() - dayOfWeek + 1);
      } else {
        isoMonday.setDate(simple.getDate() + 8 - dayOfWeek);
      }

      return `${isoMonday.getFullYear()}-${String(
        isoMonday.getMonth() + 1,
      ).padStart(2, "0")}`;
    };

    const summarizeSchedules = (schedules) => {
      let presentCount = 0;
      let absentCount = 0;
      let pendingCount = 0;
      let totalPresentHours = 0;

      schedules.forEach((sch) => {
        const status = sch.attendance?.status || "pending";
        if (status === "present") {
          presentCount += 1;
          totalPresentHours += getDurationHours(sch.startTime, sch.endTime);
          return;
        }
        if (status === "absent") {
          absentCount += 1;
          return;
        }
        pendingCount += 1;
      });

      const totalSessions = schedules.length;
      const attendanceRate =
        totalSessions > 0
          ? `${((presentCount / totalSessions) * 100).toFixed(1).replaceAll(".0", "")}%`
          : "0%";

      return {
        totalSessions,
        presentCount,
        absentCount,
        pendingCount,
        totalPresentHours,
        attendanceRate,
      };
    };

    const getMonthSchedules = (monthToken) => {
      const weekMonthCache = new Map();
      return globalThis.db.schedules
        .filter((sch) => {
          if (getScheduleApprovalStatus(sch) !== "approved") return false;
          const weekToken = String(sch.week || "");
          if (!weekToken) return false;
          if (!weekMonthCache.has(weekToken)) {
            weekMonthCache.set(weekToken, getMonthTokenFromWeek(weekToken));
          }
          return weekMonthCache.get(weekToken) === monthToken;
        })
        .sort((a, b) => {
          const weekDiff = String(a.week || "").localeCompare(
            String(b.week || ""),
          );
          if (weekDiff !== 0) return weekDiff;
          const dayDiff = Number(a.dayOfWeek) - Number(b.dayOfWeek);
          if (dayDiff !== 0) return dayDiff;
          return String(a.startTime || "").localeCompare(
            String(b.startTime || ""),
          );
        });
    };

    const resetAttendanceStats = () => {
      if (sessionsEl) sessionsEl.innerText = "0";
      if (presentEl) presentEl.innerText = "0";
      if (absentEl) absentEl.innerText = "0";
      if (hoursEl) hoursEl.innerText = "0h";
      if (pendingEl) pendingEl.innerText = "0";
      if (rateEl) rateEl.innerText = "0%";
    };

    const mode = periodSelect?.value === "month" ? "month" : "week";
    if (periodSelect && periodSelect.value !== mode) {
      periodSelect.value = mode;
    }

    if (weekWrap) {
      weekWrap.classList.toggle("hidden", mode !== "week");
      weekWrap.classList.toggle("flex", mode === "week");
    }
    if (monthWrap) {
      monthWrap.classList.toggle("hidden", mode !== "month");
      monthWrap.classList.toggle("flex", mode === "month");
    }

    let schedules = [];
    let selectedPeriodText = "";

    if (mode === "month") {
      const fallbackMonth = getMonthTokenFromWeek(weekInput.value || "");
      const selectedMonth = String(monthInput?.value || fallbackMonth || "");
      if (monthInput && !monthInput.value && selectedMonth) {
        monthInput.value = selectedMonth;
      }

      if (!selectedMonth) {
        listEl.innerHTML =
          '<div class="text-sm text-slate-400">Chưa chọn tháng.</div>';
        summaryEl.innerHTML = "";
        if (periodLabelEl) periodLabelEl.innerText = "Kỳ thống kê: Tháng";
        resetAttendanceStats();
        return;
      }

      schedules = getMonthSchedules(selectedMonth);
      const [year, month] = selectedMonth.split("-");
      selectedPeriodText = `Tháng ${month}/${year}`;
    } else {
      const selectedWeek =
        weekInput.value || document.getElementById("filterWeek").value;
      if (!selectedWeek) {
        listEl.innerHTML =
          '<div class="text-sm text-slate-400">Chưa chọn tuần.</div>';
        summaryEl.innerHTML = "";
        if (periodLabelEl) periodLabelEl.innerText = "Kỳ thống kê: Tuần";
        resetAttendanceStats();
        return;
      }
      schedules = getWeekAttendanceOverview(selectedWeek).schedules;
      selectedPeriodText = `Tuần ${selectedWeek}`;
    }

    const overview = summarizeSchedules(schedules);
    if (sessionsEl) sessionsEl.innerText = `${overview.totalSessions}`;
    if (presentEl) presentEl.innerText = `${overview.presentCount}`;
    if (absentEl) absentEl.innerText = `${overview.absentCount}`;
    if (hoursEl) hoursEl.innerText = formatHours(overview.totalPresentHours);
    if (pendingEl) pendingEl.innerText = `${overview.pendingCount}`;
    if (rateEl) rateEl.innerText = overview.attendanceRate;
    if (periodLabelEl) {
      periodLabelEl.innerText = `Kỳ thống kê: ${selectedPeriodText}`;
    }

    const stats = {};
    schedules.forEach((sch) => {
      const teacher = getTeacherInfo(sch.teacherId);
      const key = sch.teacherId;
      if (!stats[key]) {
        stats[key] = {
          name: teacher.name,
          total: 0,
          present: 0,
          absent: 0,
          pending: 0,
          hours: 0,
        };
      }
      const teacherStat = stats[key];
      teacherStat.total += 1;
      const status = sch.attendance?.status || "pending";
      if (status === "present") {
        teacherStat.present += 1;
        teacherStat.hours += getDurationHours(sch.startTime, sch.endTime);
      } else if (status === "absent") {
        teacherStat.absent += 1;
      } else {
        teacherStat.pending += 1;
      }
    });

    const summaryRows = Object.values(stats)
      .sort((a, b) => b.total - a.total)
      .map(
        (s) =>
          `<div class="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1"><span class="font-bold text-slate-700">${safeText(s.name)}</span>: ${s.present}/${s.total} ca có mặt • ${s.absent} vắng • ${s.pending} chưa chấm • ${formatHours(s.hours)}</div>`,
      )
      .join(" ");

    summaryEl.innerHTML =
      summaryRows ||
      `<span class="text-sm text-slate-400">${mode === "month" ? "Tháng này" : "Tuần này"} chưa có dữ liệu chấm công.</span>`;

    if (schedules.length === 0) {
      listEl.innerHTML = `<div class="text-sm text-slate-400">Không có ca dạy trong ${mode === "month" ? "tháng" : "tuần"} đã chọn.</div>`;
      return;
    }

    listEl.innerHTML = schedules
      .map((sch) => {
        const teacher = getTeacherInfo(sch.teacherId);
        const cls = getClassInfoSafe(sch.classId);
        const classLabel = getScheduleClassLabel(sch, cls);
        const status = sch.attendance?.status || "pending";
        let statusBadge =
          '<span class="text-[10px] px-2 py-0.5 rounded border bg-slate-50 text-slate-600 border-slate-200 font-bold">Chưa chấm</span>';
        if (status === "present") {
          statusBadge =
            '<span class="text-[10px] px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">Có mặt</span>';
        } else if (status === "absent") {
          statusBadge =
            '<span class="text-[10px] px-2 py-0.5 rounded border bg-rose-50 text-rose-700 border-rose-200 font-bold">Vắng</span>';
        }
        const durationHours = getDurationHours(sch.startTime, sch.endTime);
        const weekBadge =
          mode === "month"
            ? `<span class="text-[10px] px-1.5 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200 font-bold">${safeText(sch.week || "")}</span>`
            : "";
        return `
              <div class="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-bold text-slate-800">${safeText(teacher.name)} • ${safeText(classLabel)}</div>
                  <div class="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">${weekBadge}${safeText(formatDayOfWeek(sch.dayOfWeek))} • ${safeText(sch.startTime)} - ${safeText(sch.endTime)} • ${formatHours(durationHours)}</div>
                </div>
                <div class="flex items-center gap-2">
                  ${statusBadge}
                  <button onclick="globalThis.setAttendanceStatus('${safeAttr(sch.id)}', 'present')" class="text-[11px] font-bold px-2 py-1 rounded border bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200">Có mặt</button>
                  <button onclick="globalThis.setAttendanceStatus('${safeAttr(sch.id)}', 'absent')" class="text-[11px] font-bold px-2 py-1 rounded border bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200">Vắng</button>
                </div>
              </div>`;
      })
      .join("");
  };

  const renderAll = () => {
    renderSubjects();
    renderTeachers();
    renderStudents();
    renderClasses();
    switchMasterTab(globalThis.currentMasterTab || "overview");
    if (typeof globalThis.handleClassSelection === "function") {
      globalThis.handleClassSelection();
    }
    renderAccounts();
    renderMasterOverview();
    renderAttendance();
    if (getCurrentUser()) renderSchedules();
  };

  const applyRBAC = () => {
    const currentRole = getCurrentRole();
    const currentUser = getCurrentUser();
    const adminOnlyElements = document.querySelectorAll(".admin-only");
    adminOnlyElements.forEach((el) => {
      el.style.display = currentRole === "admin" ? "flex" : "none";
    });
    const fixedAdminOnlyElements =
      document.querySelectorAll(".fixed-admin-only");
    fixedAdminOnlyElements.forEach((el) => {
      el.style.display =
        currentRole === "admin" && isFixedAdmin() ? "block" : "none";
    });
    if (currentRole === "teacher") {
      document.getElementById("boardTitle").innerText =
        `Lịch giảng dạy của ${String(currentUser.name || "")}`;
      document.getElementById("boardSubtitle").innerText =
        "Tạo lịch hoặc gửi đề xuất để admin duyệt.";
    } else {
      document.getElementById("boardTitle").innerText =
        "Lịch giảng dạy trung tâm";
      document.getElementById("boardSubtitle").innerText =
        "Đồng bộ Cloud theo thời gian thực";
    }
    if (typeof globalThis.syncScheduleFormByRole === "function") {
      globalThis.syncScheduleFormByRole();
    }
    renderSchedules();
  };

  globalThis.switchTab = (tabName) => {
    const currentRole = getCurrentRole();
    if (currentRole === "teacher" && tabName !== "board" && tabName !== "form")
      return;
    document
      .getElementById("view_board")
      .classList.toggle("hidden", tabName !== "board");
    document
      .getElementById("view_form")
      .classList.toggle("hidden", tabName !== "form");
    document
      .getElementById("view_master")
      .classList.toggle("hidden", tabName !== "master");
    document
      .getElementById("view_attendance")
      .classList.toggle("hidden", tabName !== "attendance");

    const activeClass =
      "py-3 px-2 border-b-2 border-indigo-600 text-indigo-700 font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap";
    const inactiveClass =
      "py-3 px-2 border-b-2 border-transparent text-slate-500 hover:text-slate-800 font-medium text-sm flex items-center gap-2 transition-colors whitespace-nowrap";

    document.getElementById("tabBtn_board").className =
      tabName === "board" ? activeClass : inactiveClass;
    document.getElementById("tabBtn_form").className =
      tabName === "form" ? activeClass : inactiveClass;
    document.getElementById("tabBtn_master").className =
      tabName === "master" ? activeClass : inactiveClass + " admin-only";
    document.getElementById("tabBtn_attendance").className =
      tabName === "attendance" ? activeClass : inactiveClass + " admin-only";

    if (tabName === "attendance") renderAttendance();
    if (tabName === "master") switchMasterTab("overview");
    if (
      tabName === "form" &&
      typeof globalThis.syncScheduleFormByRole === "function"
    ) {
      globalThis.syncScheduleFormByRole();
    }
  };

  return {
    applyRBAC,
    renderSchedules,
    renderAttendance,
    renderAll,
  };
};
