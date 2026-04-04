import { escapeHtml, escapeAttr } from "./security-utils.js";
import { getConfigByPath } from "../config/app-config.js";
import { normalizeScheduleApprovalStatus } from "@/entities/schedule/model/approval";
import {
  getScheduleTeacherIds,
  isTeacherAssignedToSchedule,
} from "@/entities/schedule/model/teacher-assignment";

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
  getAttendancePeriodSelection,
  getAttendancePeriodLabel,
  getAttendanceDashboardData,
  formatWorkedMinutes,
  getBoardTeacherAttendanceSummary,
}) => {
  const safeText = (value) => escapeHtml(value);
  const safeAttr = (value) => escapeAttr(value);
  const safeColorKey = (value) =>
    Object.hasOwn(colorStyles, value) ? value : "blue";
  const getConfigValue = (path, fallbackValue = "") =>
    getConfigByPath(path, fallbackValue);
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
  const getSearchKeyword = (inputId) =>
    normalizeKeyword(document.getElementById(inputId)?.value || "");
  const toCountLabel = (filteredCount, totalCount) =>
    filteredCount === totalCount
      ? `${totalCount}`
      : `${filteredCount}/${totalCount}`;
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
        groupName: "",
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

  const getScheduleTeacherLabel = (schedule) => {
    const names = getScheduleTeacherIds(schedule)
      .map((teacherId) => getTeacherInfo(teacherId).name)
      .map((name) => String(name || "").trim())
      .filter(Boolean);
    if (names.length === 0) return "Giáo viên không xác định";
    return names.join(", ");
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

  const boardActionDelegationRoots = new WeakSet();

  const invokeGlobalAction = (actionName, ...args) => {
    const actionFn = globalThis?.[actionName];
    if (typeof actionFn === "function") {
      return actionFn(...args);
    }
    console.warn(`Không tìm thấy action global: ${actionName}`);
    return undefined;
  };

  const boardScheduleActionExecutors = {
    "open-detail": (scheduleId) => {
      if (scheduleId) {
        invokeGlobalAction("openTimetableScheduleDetail", scheduleId);
      }
    },
    "open-eval": (scheduleId) => {
      if (scheduleId) {
        invokeGlobalAction("openEvalModal", scheduleId);
      }
    },
    "open-editor": (scheduleId) => {
      if (scheduleId) {
        invokeGlobalAction("openScheduleEditor", scheduleId);
      }
    },
    "delete-schedule": (scheduleId) => {
      if (scheduleId) {
        invokeGlobalAction("deleteData", "schedules", scheduleId);
      }
    },
    "add-student": (scheduleId) => {
      if (scheduleId) {
        invokeGlobalAction("addStudentToScheduleClass", scheduleId);
      }
    },
    "review-approve": (scheduleId) => {
      if (scheduleId) {
        invokeGlobalAction("reviewScheduleRequest", scheduleId, "approve");
      }
    },
    "review-reject": (scheduleId) => {
      if (scheduleId) {
        invokeGlobalAction("reviewScheduleRequest", scheduleId, "reject");
      }
    },
  };

  const runBoardScheduleAction = (action, scheduleId) => {
    const executor = boardScheduleActionExecutors[action];
    if (!executor) return;
    executor(scheduleId);
  };

  const handleBoardActionClick = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const actionEl = target.closest("[data-schedule-action]");
    if (!actionEl) return;

    const action = String(actionEl.dataset.scheduleAction || "").trim();
    const scheduleId = String(actionEl.dataset.scheduleId || "").trim();
    if (!action) return;

    event.preventDefault();
    event.stopPropagation();

    runBoardScheduleAction(action, scheduleId);
  };

  const bindBoardActionDelegation = (element) => {
    if (!element || boardActionDelegationRoots.has(element)) return;
    element.addEventListener("click", handleBoardActionClick);
    boardActionDelegationRoots.add(element);
  };

  const ensureBoardActionDelegation = () => {
    const scheduleContainer = document.getElementById("scheduleContainer");
    const scheduleApprovalList = document.getElementById(
      "scheduleApprovalList",
    );

    bindBoardActionDelegation(scheduleContainer);
    bindBoardActionDelegation(scheduleApprovalList);
  };

  const getScheduleApprovalStatus = (schedule) =>
    normalizeScheduleApprovalStatus(schedule);

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

  const getClassGroupName = (cls) => String(cls?.groupName || "").trim();

  const getClassDefaultDays = (cls) =>
    Array.from(new Set((cls?.defaultDays || []).map(String)))
      .filter((d) => ["2", "3", "4", "5", "6", "7", "8"].includes(d))
      .sort((a, b) => Number(a) - Number(b));

  const getClassDefaultDaysText = (cls) => {
    const days = getClassDefaultDays(cls);
    if (days.length === 0) return "Chưa cấu hình ngày học mặc định";
    return days.map((d) => formatDayOfWeek(d)).join(", ");
  };

  const getClassDisplayName = (cls) => {
    const className = String(cls?.name || "Lớp").trim();
    const groupName = getClassGroupName(cls);
    return groupName ? `${className} - ${groupName}` : className;
  };

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

    const keyword = getSearchKeyword("masterTeacherSearchInput");
    const filteredTeachers = globalThis.db.teachers.filter((teacher) => {
      if (!keyword) return true;
      const subjectNames = (teacher.subjectIds || [])
        .map((subjectId) => getSubjectInfo(subjectId).name)
        .join(" ");

      return (
        includesKeyword(teacher.name, keyword) ||
        includesKeyword(teacher.email, keyword) ||
        includesKeyword(teacher.phone, keyword) ||
        includesKeyword(subjectNames, keyword)
      );
    });

    if (filteredTeachers.length === 0) {
      teacherList.innerHTML =
        '<div class="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-5 text-center text-xs text-slate-500">Không tìm thấy giáo viên phù hợp bộ lọc hiện tại.</div>';
      if (teacherListCount) {
        teacherListCount.innerText = toCountLabel(
          0,
          globalThis.db.teachers.length,
        );
      }
      refreshIcons();
      return;
    }

    teacherList.innerHTML = filteredTeachers
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
      teacherListCount.innerText = toCountLabel(
        filteredTeachers.length,
        globalThis.db.teachers.length,
      );
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
    const accountSearchEmptyHint = document.getElementById(
      "accountSearchEmptyHint",
    );
    const adminCount = document.getElementById("accountAdminCount");
    const pendingCount = document.getElementById("accountPendingCount");
    const grantedCount = document.getElementById("accountGrantedCount");
    if (!pendingList || !grantedList || !adminList) return;

    const keyword = getSearchKeyword("masterAccountSearchInput");

    const adminAccountsRaw = globalThis.db.accounts.filter(
      (acc) =>
        acc.role === "admin" && normalizeEmail(acc.email) !== ADMIN_EMAIL,
    );

    const teacherAccountsRaw = globalThis.db.accounts.filter(
      (acc) => acc.role === "teacher",
    );
    const teacherAccountEmails = new Set(
      teacherAccountsRaw.map((acc) => normalizeEmail(acc.email)),
    );

    const availableTeachersRaw = globalThis.db.teachers.filter((tea) => {
      const email = normalizeEmail(tea.email);
      return email && email !== ADMIN_EMAIL && !teacherAccountEmails.has(email);
    });

    const accountMatchesKeyword = (name, email, roleLabel = "") =>
      includesKeyword(name, keyword) ||
      includesKeyword(email, keyword) ||
      includesKeyword(roleLabel, keyword);

    const availableTeachers = availableTeachersRaw.filter((teacher) =>
      accountMatchesKeyword(teacher.name, teacher.email, "chua cap quyen"),
    );
    const adminAccounts = adminAccountsRaw.filter((account) =>
      accountMatchesKeyword(account.name, account.email, "admin"),
    );
    const teacherAccounts = teacherAccountsRaw.filter((account) => {
      const teacher =
        globalThis.db.teachers.find((t) => t.id === account.teacherId) ||
        globalThis.db.teachers.find(
          (t) => normalizeEmail(t.email) === normalizeEmail(account.email),
        );
      const teacherName = teacher ? teacher.name : account.name || "Giáo viên";
      return accountMatchesKeyword(teacherName, account.email, "teacher");
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
    const hasGrantedAccounts = teacherAccounts.length > 0;

    pendingList.innerHTML = hasPendingTeachers
      ? pendingCards
      : '<div class="text-[11px] text-slate-400 italic p-1">Không có giáo viên phù hợp.</div>';
    adminList.innerHTML = hasSubAdmins
      ? adminCards
      : '<div class="text-[11px] text-slate-400 italic p-1">Không có admin phụ phù hợp.</div>';

    grantedList.innerHTML =
      grantedCards ||
      '<div class="text-[11px] text-slate-400 italic p-1">Không có tài khoản giáo viên phù hợp.</div>';

    adminCount.innerText = toCountLabel(
      adminAccounts.length,
      adminAccountsRaw.length,
    );
    pendingCount.innerText = toCountLabel(
      availableTeachers.length,
      availableTeachersRaw.length,
    );
    grantedCount.innerText = toCountLabel(
      teacherAccounts.length,
      teacherAccountsRaw.length,
    );

    pendingCard?.classList.toggle("hidden", !hasPendingTeachers && !keyword);
    adminCard?.classList.toggle("hidden", !hasSubAdmins && !keyword);
    secondaryEmptyHint?.classList.toggle(
      "hidden",
      hasPendingTeachers || hasSubAdmins || hasGrantedAccounts,
    );

    if (secondaryEmptyHint && keyword) {
      secondaryEmptyHint.innerText =
        "Không có giáo viên chờ cấp quyền hoặc admin phụ phù hợp từ khóa tìm kiếm.";
    }

    accountSearchEmptyHint?.classList.toggle(
      "hidden",
      hasPendingTeachers || hasSubAdmins || hasGrantedAccounts || !keyword,
    );

    refreshIcons();
  };

  const renderStudents = () => {
    const studentList = document.getElementById("studentList");
    if (!studentList) return;

    const keyword = getSearchKeyword("masterStudentSearchInput");
    const filteredStudents = globalThis.db.students.filter((student) => {
      if (!keyword) return true;
      const gradeLabel = String(
        student.gradeLevel || student.classLevel || "Chưa phân lớp",
      );
      return (
        includesKeyword(student.name, keyword) ||
        includesKeyword(student.parentPhone, keyword) ||
        includesKeyword(gradeLabel, keyword)
      );
    });

    if (filteredStudents.length === 0) {
      studentList.innerHTML =
        '<div class="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-5 text-center text-xs text-slate-500">Không tìm thấy học sinh phù hợp bộ lọc hiện tại.</div>';
    } else {
      studentList.innerHTML = filteredStudents
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
    }
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
      const selectedClassIds = new Set(
        Array.from(scheduleClassSelect.selectedOptions || [])
          .map((option) => String(option.value || "").trim())
          .filter(Boolean),
      );
      const previousSingleClassId = Array.from(selectedClassIds)[0] || "";
      if (sortedClasses.length === 0) {
        scheduleClassSelect.innerHTML =
          '<option value="">-- Chưa có nhóm/lớp từ hồ sơ học sinh --</option>';
      } else if (scheduleClassSelect.multiple) {
        scheduleClassSelect.innerHTML = sortedClasses
          .map(
            (cls) =>
              `<option value="${safeAttr(cls.id)}">${safeText(getClassDisplayName(cls))} | ${safeText(String(cls.studentIds.length))} HS: ${safeText(getClassStudentPreview(cls, 2))}</option>`,
          )
          .join("");
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

      if (scheduleClassSelect.multiple) {
        Array.from(scheduleClassSelect.options || []).forEach((option) => {
          option.selected = selectedClassIds.has(String(option.value || ""));
        });
      } else {
        const selectedClassId = String(previousSingleClassId || "").trim();
        if (
          selectedClassId &&
          sortedClasses.some(
            (cls) => String(cls.id) === String(selectedClassId),
          )
        ) {
          scheduleClassSelect.value = selectedClassId;
        }
      }
    }

    refreshIcons();
  };

  const getSelectedClassIdsForCreateForm = () => {
    const classSelect = document.getElementById("sch_classId");
    if (!classSelect) return [];

    if (classSelect.multiple) {
      return Array.from(classSelect.selectedOptions || [])
        .map((option) => String(option.value || "").trim())
        .filter(Boolean);
    }

    const selectedClassId = String(classSelect.value || "").trim();
    return selectedClassId ? [selectedClassId] : [];
  };

  const areIdSetsEqual = (a, b) => {
    if (a.size !== b.size) return false;
    for (const id of a) {
      if (!b.has(id)) return false;
    }
    return true;
  };

  const getUniqueStudentIdsFromClasses = (classes) => {
    const idSet = new Set();
    (classes || []).forEach((cls) => {
      (cls?.studentIds || []).forEach((studentId) => {
        const normalizedId = String(studentId || "").trim();
        if (normalizedId) idSet.add(normalizedId);
      });
    });
    return Array.from(idSet);
  };

  globalThis.updateScheduleStudentSelection = () => {
    const studentWrap = document.getElementById("sch_studentPickerWrap");
    const checkboxContainer = document.getElementById("sch_studentCheckboxes");
    const summaryEl = document.getElementById("sch_studentSummary");
    const countBadge = document.getElementById("sch_selectedStudentCount");
    const statsEl = document.getElementById("sch_studentStats");
    if (!studentWrap || !checkboxContainer || !summaryEl || !countBadge) return;

    const all = checkboxContainer.querySelectorAll("input[type='checkbox']");
    const checked = checkboxContainer.querySelectorAll(
      "input[type='checkbox']:checked",
    );
    const totalCount = all.length;
    const selectedCount = checked.length;
    const className = String(studentWrap.dataset.className || "Lớp đã chọn");

    countBadge.innerText = `${selectedCount}/${totalCount}`;

    if (statsEl) {
      const remaining = Math.max(totalCount - selectedCount, 0);
      statsEl.innerHTML = `
        <div class="rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-2">
          <div class="text-[10px] uppercase font-bold text-indigo-700">Sĩ số lớp</div>
          <div class="text-sm font-bold text-indigo-900 mt-0.5">${safeText(String(totalCount))} HS</div>
        </div>
        <div class="rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-2">
          <div class="text-[10px] uppercase font-bold text-emerald-700">Đã chọn</div>
          <div class="text-sm font-bold text-emerald-900 mt-0.5">${safeText(String(selectedCount))} HS</div>
        </div>
        <div class="rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-2">
          <div class="text-[10px] uppercase font-bold text-amber-700">Chưa chọn</div>
          <div class="text-sm font-bold text-amber-900 mt-0.5">${safeText(String(remaining))} HS</div>
        </div>`;
    }

    if (checked.length === 0) {
      summaryEl.innerText = `${className}: chưa chọn học sinh nào. Vui lòng chọn ít nhất 1 học sinh.`;
      summaryEl.className = "text-[11px] text-rose-600 mb-1.5 font-medium";
      return;
    }
    summaryEl.innerText = `${className}: đã chọn ${selectedCount}/${totalCount} học sinh cho ca dạy.`;
    summaryEl.className = "text-[11px] text-slate-500 mb-1.5";
  };

  const clearClassStudentPicker = (studentWrap, studentCheckboxes) => {
    const statsEl = document.getElementById("sch_studentStats");
    if (studentWrap) {
      studentWrap.classList.add("hidden");
      delete studentWrap.dataset.classId;
      delete studentWrap.dataset.classIds;
      delete studentWrap.dataset.className;
    }
    if (studentCheckboxes) {
      studentCheckboxes.innerHTML = "";
    }
    if (statsEl) {
      statsEl.innerHTML = "";
    }
  };

  const renderClassStudentPicker = (
    selectedClasses,
    studentWrap,
    studentCheckboxes,
  ) => {
    const prevSelectedIds = new Set(
      Array.from(
        document.querySelectorAll("#sch_studentCheckboxes input:checked"),
      ).map((el) => String(el.value || "")),
    );

    const currentClassIds = new Set(
      (selectedClasses || [])
        .map((cls) => String(cls?.id || ""))
        .filter(Boolean),
    );

    const previousClassIds = new Set(
      String(studentWrap?.dataset.classIds || "")
        .split(",")
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    );

    const combinedStudentIds = getUniqueStudentIdsFromClasses(selectedClasses);

    const defaultSelectedIds =
      areIdSetsEqual(previousClassIds, currentClassIds) &&
      prevSelectedIds.size > 0
        ? prevSelectedIds
        : new Set(combinedStudentIds);

    const classNameMap = new Map(
      (selectedClasses || []).map((cls) => [
        String(cls?.id || ""),
        getClassDisplayName(cls),
      ]),
    );

    if (studentCheckboxes) {
      studentCheckboxes.innerHTML = combinedStudentIds
        .map((id) => {
          const student = getStudentInfo(id);
          const checkedAttr = defaultSelectedIds.has(String(id))
            ? "checked"
            : "";
          const gradeLabel = getStudentGradeLevel(student);
          const parentPhone = student?.parentPhone
            ? ` • PH: ${safeText(student.parentPhone)}`
            : "";
          const memberClassNames = (selectedClasses || [])
            .filter((cls) =>
              (cls?.studentIds || []).map(String).includes(String(id)),
            )
            .map((cls) => classNameMap.get(String(cls?.id || "")) || "")
            .filter(Boolean)
            .join(", ");
          return `<label class="block cursor-pointer"><input type="checkbox" value="${safeAttr(id)}" ${checkedAttr} onchange="globalThis.updateScheduleStudentSelection()" class="peer sr-only"><div class="rounded-lg border border-slate-200 bg-white p-2 transition-all peer-checked:border-indigo-300 peer-checked:bg-indigo-50 hover:border-indigo-200"><div class="text-[12px] font-bold text-slate-800">${safeText(student.name)}</div><div class="text-[11px] text-slate-500 mt-0.5">${safeText(gradeLabel)}${parentPhone}</div><div class="text-[10px] text-indigo-600 mt-1 line-clamp-1">${safeText(memberClassNames || "Không xác định lớp")}</div></div></label>`;
        })
        .join("");
    }

    const classNameSummary =
      (selectedClasses || []).length <= 1
        ? getClassDisplayName((selectedClasses || [])[0] || {})
        : `${selectedClasses.length} nhóm/lớp đã chọn`;

    if (studentWrap) {
      studentWrap.classList.remove("hidden");
      studentWrap.dataset.classIds = Array.from(currentClassIds).join(",");
      studentWrap.dataset.className = classNameSummary;
    }

    if (typeof globalThis.updateScheduleStudentSelection === "function") {
      globalThis.updateScheduleStudentSelection();
    }
  };

  const renderClassHint = (hintDiv, selectedClasses) => {
    if (!hintDiv) return;

    const uniqueStudentIds = getUniqueStudentIdsFromClasses(selectedClasses);
    const classChips = (selectedClasses || [])
      .map(
        (cls) =>
          `<span class="text-[11px] font-bold px-2 py-0.5 rounded border bg-white border-indigo-200 text-indigo-700">${safeText(getClassDisplayName(cls))} (${safeText(String((cls?.studentIds || []).length))} HS)</span>`,
      )
      .join(" ");
    const studentChips = uniqueStudentIds
      .slice(0, 20)
      .map(
        (id) =>
          `<span class="text-[11px] font-medium px-2 py-0.5 rounded border bg-white border-indigo-200 text-slate-700">${safeText(getStudentInfo(id).name)}</span>`,
      )
      .join(" ");
    const hiddenCount = Math.max(uniqueStudentIds.length - 20, 0);
    const studentChipsHtml =
      studentChips ||
      '<span class="text-[11px] italic text-slate-500">Chưa có học sinh.</span>';
    const hiddenCountText =
      hiddenCount > 0
        ? `<div class="text-[11px] text-slate-500">... và ${safeText(String(hiddenCount))} học sinh khác</div>`
        : "";

    hintDiv.innerHTML = `<div class="space-y-1"><div><span class="font-bold text-indigo-800">Nhóm lớp đã chọn:</span> ${safeText(String((selectedClasses || []).length))}</div><div class="flex flex-wrap gap-1">${classChips}</div><div><span class="font-bold text-indigo-800">Tổng sĩ số hợp nhất:</span> ${safeText(String(uniqueStudentIds.length))} HS</div><div class="flex flex-wrap gap-1">${studentChipsHtml}</div>${hiddenCountText}</div>`;
    hintDiv.classList.remove("hidden");
  };

  const applyTeacherClassSelection = (
    currentUser,
    subjectId,
    teacherSelect,
    filterHint,
  ) => {
    const currentTeacher = getTeacherInfo(currentUser?.id);
    const currentTeacherId = String(
      currentUser?.id || currentTeacher?.id || "",
    );
    const teacherName =
      currentTeacher?.name || currentUser?.name || "Giáo viên";
    const subjectSelected = subjectId.length > 0;
    const selectedTeacherIds = new Set(
      Array.from(teacherSelect.selectedOptions || [])
        .map((option) => String(option.value || "").trim())
        .filter(Boolean),
    );

    teacherSelect.multiple = true;
    teacherSelect.size = 5;

    if (!subjectSelected) {
      teacherSelect.disabled = true;
      teacherSelect.innerHTML =
        '<option value="">-- Vui lòng chọn Môn học trước --</option>';
      if (filterHint) {
        filterHint.classList.remove("hidden");
        filterHint.innerText = "Chọn môn để lọc giáo viên đồng giảng";
      }
      return;
    }

    const availableTeachers = globalThis.db.teachers.filter((teacher) =>
      (teacher.subjectIds || []).includes(subjectId),
    );
    const hasSubjectMatch = availableTeachers.some(
      (teacher) => String(teacher.id) === currentTeacherId,
    );

    if (!hasSubjectMatch) {
      teacherSelect.disabled = true;
      teacherSelect.innerHTML = `<option value="${safeAttr(currentTeacherId)}">${safeText(teacherName)}</option>`;
      if (teacherSelect.options.length > 0) {
        teacherSelect.options[0].selected = true;
      }
      if (filterHint) {
        filterHint.classList.remove("hidden");
        filterHint.innerText = "Môn đã chọn không thuộc chuyên môn của bạn";
      }
      return;
    }

    teacherSelect.disabled = availableTeachers.length === 0;
    if (availableTeachers.length === 0) {
      teacherSelect.innerHTML =
        '<option value="">-- Không có GV chuyên môn này --</option>';
      if (filterHint) {
        filterHint.classList.remove("hidden");
        filterHint.innerText = "Không có giáo viên phù hợp môn đã chọn";
      }
      return;
    }

    teacherSelect.innerHTML = availableTeachers
      .map(
        (teacher) =>
          `<option value="${safeAttr(teacher.id)}">${safeText(teacher.name)}</option>`,
      )
      .join("");

    Array.from(teacherSelect.options).forEach((option) => {
      if (selectedTeacherIds.has(String(option.value || ""))) {
        option.selected = true;
      }
    });

    const currentTeacherOption = Array.from(teacherSelect.options).find(
      (option) => String(option.value || "") === currentTeacherId,
    );
    if (currentTeacherOption) {
      currentTeacherOption.selected = true;
    }

    if (
      teacherSelect.selectedOptions.length === 0 &&
      teacherSelect.options.length > 0
    ) {
      teacherSelect.options[0].selected = true;
    }

    if (filterHint) {
      filterHint.classList.remove("hidden");
      filterHint.innerText =
        "Có thể chọn thêm đồng giảng cùng chuyên môn. Bạn luôn là giáo viên chính.";
    }
  };

  const applyAdminClassSelection = (subjectId, teacherSelect, filterHint) => {
    const selectedTeacherIds = new Set(
      Array.from(teacherSelect.selectedOptions || [])
        .map((option) => String(option.value || ""))
        .filter(Boolean),
    );
    teacherSelect.multiple = true;
    teacherSelect.size = 5;

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
    teacherSelect.disabled = availableTeachers.length === 0;
    filterHint?.classList.remove("hidden");
    if (availableTeachers.length > 0) {
      teacherSelect.innerHTML = availableTeachers
        .map(
          (t) =>
            `<option value="${safeAttr(t.id)}">${safeText(t.name)}</option>`,
        )
        .join("");

      let restored = false;
      Array.from(teacherSelect.options).forEach((option) => {
        if (selectedTeacherIds.has(String(option.value || ""))) {
          option.selected = true;
          restored = true;
        }
      });
      if (!restored && teacherSelect.options.length > 0) {
        teacherSelect.options[0].selected = true;
      }

      if (filterHint) {
        filterHint.innerText = "Đã lọc theo môn, có thể chọn nhiều giáo viên";
      }
      return;
    }

    teacherSelect.innerHTML =
      '<option value="">-- Không có GV chuyên môn này --</option>';
    if (filterHint) {
      filterHint.innerText = "Không có giáo viên phù hợp môn đã chọn";
    }
  };

  const handleClassSelectionWithoutClass = (
    hintDiv,
    teacherSelect,
    filterHint,
    studentWrap,
    studentCheckboxes,
  ) => {
    hintDiv?.classList.add("hidden");
    teacherSelect.disabled = true;
    teacherSelect.innerHTML =
      '<option value="">-- Vui lòng chọn Nhóm/Lớp trước --</option>';
    clearClassStudentPicker(studentWrap, studentCheckboxes);
    filterHint?.classList.add("hidden");
    if (typeof globalThis.syncScheduleFormByRole === "function") {
      globalThis.syncScheduleFormByRole();
    }
  };

  const handleClassSelectionWithInvalidClass = (
    hintDiv,
    teacherSelect,
    filterHint,
    studentWrap,
    studentCheckboxes,
  ) => {
    if (hintDiv) {
      hintDiv.innerHTML =
        '<span class="text-[11px] text-rose-700">Không tìm thấy nhóm/lớp cho lịch này. Vui lòng chọn lại.</span>';
      hintDiv.classList.remove("hidden");
    }
    clearClassStudentPicker(studentWrap, studentCheckboxes);
    teacherSelect.disabled = true;
    teacherSelect.innerHTML =
      '<option value="">-- Nhóm/Lớp không hợp lệ --</option>';
    if (filterHint) {
      filterHint.classList.remove("hidden");
      filterHint.innerText = "Hãy chọn lại nhóm/lớp";
    }
  };

  globalThis.handleClassSelection = () => {
    const currentRole = getCurrentRole();
    const currentUser = getCurrentUser();
    const selectedClassIds = getSelectedClassIdsForCreateForm();
    const subjectId = document.getElementById("sch_subjectId")?.value || "";
    const hintDiv = document.getElementById("sch_classHint");
    const teacherSelect = document.getElementById("sch_teacherId");
    const filterHint = document.getElementById("teacherFilterHint");
    const studentWrap = document.getElementById("sch_studentPickerWrap");
    const studentCheckboxes = document.getElementById("sch_studentCheckboxes");

    if (!teacherSelect) return;
    if (selectedClassIds.length === 0) {
      handleClassSelectionWithoutClass(
        hintDiv,
        teacherSelect,
        filterHint,
        studentWrap,
        studentCheckboxes,
      );
      return;
    }

    const selectedClasses = selectedClassIds
      .map((classId) => getClassInfoSafe(classId))
      .filter(Boolean);
    if (selectedClasses.length !== selectedClassIds.length) {
      handleClassSelectionWithInvalidClass(
        hintDiv,
        teacherSelect,
        filterHint,
        studentWrap,
        studentCheckboxes,
      );
      return;
    }

    renderClassStudentPicker(selectedClasses, studentWrap, studentCheckboxes);
    renderClassHint(hintDiv, selectedClasses);

    if (currentRole === "teacher") {
      applyTeacherClassSelection(
        currentUser,
        subjectId,
        teacherSelect,
        filterHint,
      );
      return;
    }
    applyAdminClassSelection(subjectId, teacherSelect, filterHint);
  };

  const formatWeekLabel = (weekToken) => {
    const match = /^(\d{4})-W(\d{2})$/.exec(String(weekToken || ""));
    if (!match) return String(weekToken || "");
    return `Tuần ${Number(match[2])}, ${match[1]}`;
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
    const teacherLabel = getScheduleTeacherLabel(schedule);
    const approvalMeta = getScheduleApprovalMeta(schedule);
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
          <div class="text-[12px] text-slate-600">Giáo viên: <span class="font-semibold">${safeText(teacherLabel)}</span></div>
          <div class="text-[12px] text-slate-600">Địa điểm: <span class="font-semibold">${safeText(schedule.location || "N/A")}</span></div>
          <div class="text-[12px] text-slate-600">Nội dung: <span class="font-semibold">${safeText(schedule.topic || "Chưa cập nhật")}</span></div>
        </div>

        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-[11px] font-bold px-2 py-0.5 rounded border ${approvalMeta.className}">${safeText(approvalMeta.label)}</span>
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

  const canCurrentUserEditSchedule = (schedule, currentRole, currentUser) =>
    currentRole === "admin" ||
    (currentRole === "teacher" &&
      isTeacherAssignedToSchedule(schedule, currentUser?.id));

  const renderTimetableScheduleCard = (schedule, currentRole, currentUser) => {
    const cls = getClassInfoSafe(schedule.classId);
    const classLabel = getScheduleClassLabel(schedule, cls);
    const subInfo = getScheduleSubjectInfo(schedule);
    const teacherLabel = getScheduleTeacherLabel(schedule);
    const approvalMeta = getScheduleApprovalMeta(schedule);
    const canEditSchedule = canCurrentUserEditSchedule(
      schedule,
      currentRole,
      currentUser,
    );
    const canOpenEvaluation = approvalMeta.status === "approved";
    const subjectClass =
      colorStyles[safeColorKey(subInfo.color)] ||
      "bg-slate-100 text-slate-800 border-slate-200";
    const editBtn = canEditSchedule
      ? `<button type="button" data-schedule-action="open-editor" data-schedule-id="${safeAttr(schedule.id)}" class="text-slate-400 hover:text-indigo-600"><i data-lucide="pencil-line" class="w-3.5 h-3.5"></i></button>`
      : "";
    const deleteBtn =
      currentRole === "admin"
        ? `<button type="button" data-schedule-action="delete-schedule" data-schedule-id="${safeAttr(schedule.id)}" class="text-slate-400 hover:text-rose-600"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>`
        : "";

    return `
      <div data-schedule-action="open-detail" data-schedule-id="${safeAttr(schedule.id)}" class="rounded-lg border border-slate-200 bg-white p-2.5 mb-1.5 last:mb-0 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all" title="Bấm để xem chi tiết ca dạy">
        <div class="flex items-start justify-between gap-1.5">
          <div class="min-w-0">
            <div class="text-[11px] font-bold text-slate-800 truncate">${safeText(classLabel)}</div>
            <div class="text-[10px] text-slate-500 truncate">${safeText(teacherLabel)}</div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button type="button" data-schedule-action="open-eval" data-schedule-id="${safeAttr(schedule.id)}" ${canOpenEvaluation ? "" : "disabled"} class="text-slate-400 hover:text-emerald-600 ${canOpenEvaluation ? "" : "opacity-40 cursor-not-allowed"}"><i data-lucide="clipboard-check" class="w-3.5 h-3.5"></i></button>
            ${editBtn}
            ${deleteBtn}
          </div>
        </div>
        <div class="flex items-center gap-1 flex-wrap mt-1.5">
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border ${subjectClass}">${safeText(subInfo.name)}</span>
        </div>
        ${schedule.topic ? `<div class="text-[10px] text-slate-500 mt-1 line-clamp-2">${safeText(schedule.topic)}</div>` : ""}
      </div>`;
  };

  const renderTimetableCellItems = (scheduleList, currentRole, currentUser) => {
    let html = "";
    for (const schedule of scheduleList) {
      html += renderTimetableScheduleCard(schedule, currentRole, currentUser);
    }
    return html;
  };

  const getScheduleEvaluationCount = (evaluations) => {
    let count = 0;
    for (const value of Object.values(evaluations || {})) {
      if (parseEvaluationRecord(value)) {
        count += 1;
      }
    }
    return count;
  };

  const renderScheduleStudentBadges = (scheduleStudentIds, evaluations) => {
    let badges = "";
    for (const id of scheduleStudentIds || []) {
      const evalRecord = parseEvaluationRecord(evaluations?.[id]);
      const levelMeta = evalRecord ? getEvalLevelMeta(evalRecord.level) : null;
      const badgeClass = levelMeta
        ? levelMeta.className
        : "bg-slate-50 text-slate-600 border-slate-200";
      const levelSuffix = levelMeta ? ` • ${safeText(levelMeta.label)}` : "";
      badges += `<span class="text-[10px] font-medium px-2 py-0.5 rounded border ${badgeClass}">${safeText(getStudentInfo(id).name)}${levelSuffix}</span>`;
    }
    return badges;
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
        const teacherLabel = getScheduleTeacherLabel(sch);
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
              <div class="text-[12px] font-bold text-slate-800 truncate">${safeText(classLabel)} • ${safeText(subject.name)} • ${safeText(teacherLabel)}</div>
              <div class="text-[11px] text-slate-500">${safeText(formatDayOfWeek(sch.dayOfWeek))} • ${safeText(sch.startTime)} - ${safeText(sch.endTime)} • ${safeText(sch.location || "N/A")}</div>
              <div class="text-[10px] mt-1 text-amber-700 font-bold">${safeText(typeText)} • ${safeText(sch.approval?.requestedBy || "N/A")}</div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button type="button" data-schedule-action="open-editor" data-schedule-id="${safeAttr(sch.id)}" class="text-[11px] font-bold px-2 py-1 rounded border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100">Sửa</button>
              <button type="button" data-schedule-action="review-reject" data-schedule-id="${safeAttr(sch.id)}" class="text-[11px] font-bold px-2 py-1 rounded border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100">Từ chối</button>
              <button type="button" data-schedule-action="review-approve" data-schedule-id="${safeAttr(sch.id)}" class="text-[11px] font-bold px-2 py-1 rounded border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100">Duyệt</button>
            </div>
          </div>`;
      })
      .join("");
  };

  const filterSchedulesByKeyword = (schedules, keyword) => {
    if (!keyword) return schedules;
    return schedules.filter((schedule) => {
      const cls = getClassInfoSafe(schedule.classId);
      const classLabel = getScheduleClassLabel(schedule, cls);
      const subject = getScheduleSubjectInfo(schedule);
      const teacherLabel = getScheduleTeacherLabel(schedule);
      const studentNames = getScheduleStudentIds(schedule, cls)
        .map((studentId) => getStudentInfo(studentId).name)
        .filter(Boolean)
        .join(" ");

      const aggregateSearchText = [
        classLabel,
        subject.name,
        teacherLabel,
        schedule.location,
        schedule.topic,
        formatDayOfWeek(schedule.dayOfWeek),
        schedule.startTime,
        schedule.endTime,
        studentNames,
      ].join(" ");

      return includesKeyword(aggregateSearchText, keyword);
    });
  };

  const getScheduleEmptyMessage = ({
    scheduleKeyword,
    currentRole,
    weekLabel,
  }) => {
    if (scheduleKeyword) {
      return `${weekLabel} không có lịch khớp từ khóa tìm kiếm.`;
    }
    if (currentRole === "teacher") {
      return `${weekLabel} bạn không có ca dạy.`;
    }
    return `${weekLabel} chưa có lịch.`;
  };

  const renderSchedules = () => {
    const currentUser = getCurrentUser();
    const currentRole = getCurrentRole();
    if (!currentUser) return;
    const filterWeek = document.getElementById("filterWeek").value;
    const scheduleKeyword = getSearchKeyword("boardScheduleSearchInput");
    const container = document.getElementById("scheduleContainer");
    if (!container) return;

    renderScheduleApprovalPanel(filterWeek, currentRole);

    let filtered = globalThis.db.schedules.filter((s) => s.week === filterWeek);
    if (currentRole === "teacher") {
      filtered = filtered.filter((s) =>
        isTeacherAssignedToSchedule(s, currentUser.id),
      );
    }

    filtered = filterSchedulesByKeyword(filtered, scheduleKeyword);

    const scheduleViewMode =
      document.getElementById("scheduleViewMode")?.value === "timetable"
        ? "timetable"
        : "list";
    const weekLabel = formatWeekLabel(filterWeek);

    if (filtered.length === 0) {
      const emptyIcon = currentRole === "teacher" ? "coffee" : "inbox";
      const safeWeekLabel = safeText(weekLabel);
      const emptyMessage = getScheduleEmptyMessage({
        scheduleKeyword,
        currentRole,
        weekLabel: safeWeekLabel,
      });
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

              const items = renderTimetableCellItems(
                list,
                currentRole,
                currentUser,
              );

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
        const canEditSchedule = canCurrentUserEditSchedule(
          sch,
          currentRole,
          currentUser,
        );
        const canOpenEvaluation = approvalMeta.status === "approved";
        const colorClass =
          colorStyles[safeColorKey(subInfo.color)] ||
          "bg-slate-100 text-slate-800 border-slate-200";
        const stripeColor =
          dotColors[safeColorKey(subInfo.color)] || "bg-slate-400";
        const teacherLabel = getScheduleTeacherLabel(sch);
        const evalCount = getScheduleEvaluationCount(sch.evaluations);
        const isDone =
          scheduleStudentIds.length > 0 &&
          evalCount === scheduleStudentIds.length;
        const badges = renderScheduleStudentBadges(
          scheduleStudentIds,
          sch.evaluations,
        );
        const deleteBtnHtml =
          currentRole === "admin"
            ? `<button type="button" data-schedule-action="delete-schedule" data-schedule-id="${safeAttr(sch.id)}" class="p-2 w-full sm:w-auto flex justify-center items-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`
            : "";

        const editBtnHtml = canEditSchedule
          ? `<button type="button" data-schedule-action="open-editor" data-schedule-id="${safeAttr(sch.id)}" class="p-2 w-full sm:w-auto flex justify-center items-center text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"><i data-lucide="pencil-line" class="w-4 h-4"></i></button>`
          : "";

        const addStudentBtnHtml = canEditSchedule
          ? `<button type="button" data-schedule-action="add-student" data-schedule-id="${safeAttr(sch.id)}" class="p-2 w-full sm:w-auto flex justify-center items-center text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors" title="Thêm học sinh vào lớp"><i data-lucide="user-plus" class="w-4 h-4"></i></button>`
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
                            <div class="text-sm font-medium text-slate-700 bg-slate-50 self-start px-2 py-0.5 rounded flex items-center gap-1.5 mb-2 border border-slate-100"><i data-lucide="graduation-cap" class="w-3.5 h-3.5 text-slate-400"></i> GV: ${safeText(teacherLabel)}</div>
                                <div class="flex items-center gap-1.5 flex-wrap mb-2">
                                  <div class="text-[10px] font-bold px-2 py-0.5 rounded border self-start ${approvalMeta.className}">${approvalMeta.label}</div>
                                </div>
                                ${approvalNote}
                                <div class="flex flex-wrap gap-1 mt-auto">${badges}</div>
                            </div>
                            <div class="flex sm:flex-col justify-end gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-3">
                              <button type="button" data-schedule-action="open-eval" data-schedule-id="${safeAttr(sch.id)}" ${canOpenEvaluation ? "" : "disabled"} class="p-2 w-full sm:w-auto flex justify-center items-center ${isDone ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-slate-600 bg-slate-50 border-slate-200"} ${canOpenEvaluation ? "" : "opacity-50 cursor-not-allowed"} rounded-lg transition-colors group/btn" title="${canOpenEvaluation ? "Đánh giá học sinh" : "Lịch chưa duyệt, chưa thể đánh giá"}"><i data-lucide="${isDone ? "clipboard-check" : "clipboard-pen"}" class="w-4 h-4 group-hover/btn:scale-110 transition-transform"></i></button>
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
    const controls = {
      periodSelect: document.getElementById("attendancePeriod"),
      dateInput: document.getElementById("attendanceDate"),
      weekInput: document.getElementById("attendanceWeek"),
      monthInput: document.getElementById("attendanceMonth"),
      dateWrap: document.getElementById("attendanceDateWrap"),
      weekWrap: document.getElementById("attendanceWeekWrap"),
      monthWrap: document.getElementById("attendanceMonthWrap"),
      periodLabelEl: document.getElementById("attendancePeriodLabel"),
      approvalPanel: document.getElementById("attendanceApprovalPanel"),
      approvalSummaryEl: document.getElementById("attendanceApprovalSummary"),
      approvalBadgeEl: document.getElementById("attendanceApprovalBadge"),
      approvalListEl: document.getElementById("attendanceApprovalList"),
      listEl: document.getElementById("attendanceList"),
      sessionsEl: document.getElementById("attendanceStatSessions"),
      presentEl: document.getElementById("attendanceStatPresent"),
      absentEl: document.getElementById("attendanceStatAbsent"),
      pendingEl: document.getElementById("attendanceStatPending"),
      rateEl: document.getElementById("attendanceStatRate"),
      weeklyPanelEl: document.getElementById("attendanceWeeklyPanel"),
      weeklyLabelEl: document.getElementById("attendanceWeeklyLabel"),
      weeklyTotalEl: document.getElementById("attendanceWeeklyTotal"),
      weeklyApprovedEl: document.getElementById("attendanceWeeklyApproved"),
      weeklyRateEl: document.getElementById("attendanceWeeklyRate"),
    };
    if (!controls.listEl) return;

    const statusMetaMap = {
      pending: {
        label: "Chờ duyệt",
        className: "bg-amber-50 text-amber-700 border-amber-200",
      },
      approved: {
        label: "Đã duyệt",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      },
      rejected: {
        label: "Từ chối",
        className: "bg-rose-50 text-rose-700 border-rose-200",
      },
    };

    const toDateLabel = (dateToken) => {
      const [year, month, day] = String(dateToken || "").split("-");
      if (!year || !month || !day) return String(dateToken || "");
      return `${day}/${month}/${year}`;
    };

    const getSelection = () =>
      typeof getAttendancePeriodSelection === "function"
        ? getAttendancePeriodSelection()
        : {
            mode: String(controls.periodSelect?.value || "")
              .trim()
              .toLowerCase(),
            date: String(controls.dateInput?.value || "").trim(),
            week: String(controls.weekInput?.value || "").trim(),
            month: String(controls.monthInput?.value || "").trim(),
          };

    const normalizeMode = (mode) =>
      ["day", "week", "month"].includes(
        String(mode || "")
          .trim()
          .toLowerCase(),
      )
        ? String(mode || "")
            .trim()
            .toLowerCase()
        : "day";

    const isIsoWeekToken = (value) =>
      /^\d{4}-W\d{2}$/.test(String(value || "").trim());

    const toIsoWeekTokenFromDateToken = (dateToken) => {
      const raw = String(dateToken || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
      const [year, month, day] = raw.split("-").map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      const dayNum = date.getUTCDay() || 7;
      date.setUTCDate(date.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
      return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
    };

    const applySelection = (selection) => {
      const mode = normalizeMode(selection?.mode);
      if (controls.periodSelect) controls.periodSelect.value = mode;
      if (controls.dateInput && selection.date) {
        controls.dateInput.value = selection.date;
      }
      if (controls.weekInput && selection.week) {
        controls.weekInput.value = selection.week;
      }
      if (controls.monthInput && selection.month) {
        controls.monthInput.value = selection.month;
      }

      if (controls.dateWrap) {
        controls.dateWrap.classList.toggle("hidden", mode !== "day");
        controls.dateWrap.classList.toggle("flex", mode === "day");
      }
      if (controls.weekWrap) {
        controls.weekWrap.classList.toggle("hidden", mode !== "week");
        controls.weekWrap.classList.toggle("flex", mode === "week");
      }
      if (controls.monthWrap) {
        controls.monthWrap.classList.toggle("hidden", mode !== "month");
        controls.monthWrap.classList.toggle("flex", mode === "month");
      }
    };

    const getDashboard = (selection) =>
      typeof getAttendanceDashboardData === "function"
        ? getAttendanceDashboardData(selection)
        : {
            periodLabel: "Kỳ thống kê",
            requests: [],
            pendingRequests: [],
            stats: {
              totalRequests: 0,
              approvedCount: 0,
              rejectedCount: 0,
              pendingCount: 0,
              approvalRate: "0%",
            },
            teacherSummary: [],
          };

    const getPeriodLabelSafe = (selection, dashboard) =>
      typeof getAttendancePeriodLabel === "function"
        ? getAttendancePeriodLabel(selection)
        : dashboard.periodLabel || "Kỳ thống kê";

    const renderStats = (stats) => {
      const totalRequests = Number(stats?.totalRequests || 0);
      const approvedCount = Number(stats?.approvedCount || 0);
      const rejectedCount = Number(stats?.rejectedCount || 0);
      const pendingCount = Number(stats?.pendingCount || 0);
      const approvalRate = String(stats?.approvalRate || "0%");

      if (controls.sessionsEl)
        controls.sessionsEl.innerText = `${totalRequests}`;
      if (controls.presentEl) controls.presentEl.innerText = `${approvedCount}`;
      if (controls.absentEl) controls.absentEl.innerText = `${rejectedCount}`;
      if (controls.pendingEl) controls.pendingEl.innerText = `${pendingCount}`;
      if (controls.rateEl) controls.rateEl.innerText = approvalRate;
    };

    const renderDetailDisclosure = (detailItems) => {
      if (!detailItems.length) return "";
      let detailLinesHtml = "";
      detailItems.forEach((line) => {
        detailLinesHtml += `<div>${line}</div>`;
      });
      return `<details class="mt-1"><summary class="text-[10px] text-slate-500 cursor-pointer select-none">Chi tiết</summary><div class="mt-1 text-[10px] text-slate-500 space-y-1">${detailLinesHtml}</div></details>`;
    };

    const ATTENDANCE_DAY_CARD_WIDTH_CLASS = "w-full sm:w-[290px] xl:w-[320px]";

    const isMonthToken = (value) =>
      /^\d{4}-\d{2}$/.test(String(value || "").trim());

    const getMonthDateTokens = (monthToken) => {
      const normalized = String(monthToken || "").trim();
      if (!isMonthToken(normalized)) return [];
      const [yearRaw, monthRaw] = normalized.split("-");
      const year = Number(yearRaw);
      const month = Number(monthRaw);
      if (!year || !month) return [];

      const daysInMonth = new Date(year, month, 0).getDate();
      const result = [];
      for (let day = 1; day <= daysInMonth; day += 1) {
        result.push(
          `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        );
      }
      return result;
    };

    const renderCompactPendingItem = (item) => {
      const noteSuffix = item.note ? ` • ${safeText(item.note)}` : "";
      return `
            <div class="rounded-lg border border-amber-200 bg-white p-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div class="min-w-0">
                <div class="text-[12px] font-bold text-slate-800 truncate">${safeText(item.teacherName)} • ${safeText(toDateLabel(item.attendanceDate))}</div>
                <div class="text-[11px] text-slate-500 truncate">${safeText(item.checkInTime)} - ${safeText(item.checkOutTime)}${noteSuffix}</div>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <button onclick="globalThis.reviewAttendanceRequest('${safeAttr(item.id)}', 'reject')" class="text-[11px] font-bold px-2 py-1 rounded border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100">Từ chối</button>
                <button onclick="globalThis.reviewAttendanceRequest('${safeAttr(item.id)}', 'approve')" class="text-[11px] font-bold px-2 py-1 rounded border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100">Duyệt</button>
              </div>
            </div>`;
    };

    const renderAttendanceDayItem = (item, currentRole) => {
      const statusMeta = statusMetaMap[item.status] || statusMetaMap.pending;
      const createdAtText = item.createdAt
        ? new Date(item.createdAt).toLocaleString("vi-VN")
        : "";
      const reviewedAtText = item.reviewedAt
        ? new Date(item.reviewedAt).toLocaleString("vi-VN")
        : "";
      const compactTeachingInfo =
        String(item.teachingSubjectsText || "").trim() ||
        "Không có dữ liệu môn dạy trong ngày.";
      const adminActions =
        currentRole === "admin" && item.status === "pending"
          ? `<div class="flex items-center gap-1.5 mt-2"><button onclick="globalThis.reviewAttendanceRequest('${safeAttr(item.id)}', 'reject')" class="text-[11px] font-bold px-2 py-1 rounded border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100">Từ chối</button><button onclick="globalThis.reviewAttendanceRequest('${safeAttr(item.id)}', 'approve')" class="text-[11px] font-bold px-2 py-1 rounded border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100">Duyệt</button></div>`
          : "";

      const detailItems = [
        createdAtText ? `Tạo: ${safeText(createdAtText)}` : "",
        reviewedAtText ? `Duyệt: ${safeText(reviewedAtText)}` : "",
        item.reviewNote ? `Ghi chú duyệt: ${safeText(item.reviewNote)}` : "",
      ].filter(Boolean);

      const noteLine = item.note
        ? `<div class="text-[10px] text-slate-500 mt-1 italic truncate">${safeText(item.note)}</div>`
        : "";

      return `
            <div class="${ATTENDANCE_DAY_CARD_WIDTH_CLASS} bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col gap-1.5">
              <div class="min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <div class="text-[12px] font-bold text-slate-800 truncate">${safeText(toDateLabel(item.attendanceDate))}</div>
                  <span class="text-[10px] px-2 py-0.5 rounded border font-bold shrink-0 ${statusMeta.className}">${statusMeta.label}</span>
                </div>
                <div class="text-[11px] text-slate-500 truncate">${safeText(item.checkInTime)} - ${safeText(item.checkOutTime)}</div>
                <div class="text-[11px] text-slate-500 truncate">${safeText(compactTeachingInfo)}</div>
                ${noteLine}
                ${renderDetailDisclosure(detailItems)}
              </div>
              ${adminActions}
            </div>`;
    };

    const renderAttendanceDayPlaceholder = (dateToken) => `
            <div class="${ATTENDANCE_DAY_CARD_WIDTH_CLASS} bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col gap-1.5">
              <div class="min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <div class="text-[12px] font-bold text-slate-700 truncate">${safeText(toDateLabel(dateToken))}</div>
                  <span class="text-[10px] px-2 py-0.5 rounded border font-bold shrink-0 bg-slate-100 text-slate-500 border-slate-200">Trống</span>
                </div>
                <div class="text-[11px] text-slate-400 truncate">--:-- - --:--</div>
                <div class="text-[11px] text-slate-400 truncate">Chưa có bản ghi chấm công</div>
              </div>
            </div>`;

    const compareAttendanceItems = (a, b) => {
      const dateDiff = String(b.attendanceDate || "").localeCompare(
        String(a.attendanceDate || ""),
      );
      if (dateDiff !== 0) return dateDiff;
      return String(a.checkInTime || "").localeCompare(
        String(b.checkInTime || ""),
      );
    };

    const compareTeacherGroups = (a, b) =>
      String(a.teacherName || "").localeCompare(
        String(b.teacherName || ""),
        "vi",
      );

    const groupAttendanceByTeacher = (requests) => {
      const grouped = new Map();
      for (const item of requests || []) {
        const teacherKey = String(
          item?.teacherId || item?.teacherName || "unknown",
        );
        if (!grouped.has(teacherKey)) {
          grouped.set(teacherKey, {
            teacherName: String(item?.teacherName || "Giáo viên"),
            requests: [],
            approvedCount: 0,
            pendingCount: 0,
            rejectedCount: 0,
          });
        }

        const group = grouped.get(teacherKey);
        group.requests.push(item);
        if (item.status === "approved") {
          group.approvedCount += 1;
        } else if (item.status === "rejected") {
          group.rejectedCount += 1;
        } else {
          group.pendingCount += 1;
        }
      }

      const groups = Array.from(grouped.values());
      for (const group of groups) {
        group.requests.sort(compareAttendanceItems);
      }

      groups.sort(compareTeacherGroups);

      return groups;
    };

    const buildTeacherAttendanceDayRows = (group, currentRole, selection) => {
      const mode = normalizeMode(selection?.mode);
      if (mode !== "month") {
        return (group.requests || [])
          .map((item) => renderAttendanceDayItem(item, currentRole))
          .join("");
      }

      const byDate = new Map();
      for (const request of group.requests || []) {
        const key = String(request?.attendanceDate || "").trim();
        if (key && !byDate.has(key)) {
          byDate.set(key, request);
        }
      }

      const monthDates = getMonthDateTokens(selection?.month);
      let monthRows = "";
      for (const dateToken of monthDates) {
        const request = byDate.get(dateToken);
        monthRows += request
          ? renderAttendanceDayItem(request, currentRole)
          : renderAttendanceDayPlaceholder(dateToken);
      }
      return monthRows;
    };

    const renderTeacherAttendanceGroup = (group, currentRole, selection) => {
      const totalCount = Number(group.requests?.length || 0);
      const latestDate = group.requests[0]?.attendanceDate
        ? toDateLabel(group.requests[0].attendanceDate)
        : "";
      const dayRows = buildTeacherAttendanceDayRows(
        group,
        currentRole,
        selection,
      );

      return `
        <details class="group rounded-lg border border-slate-200 bg-white open:shadow-sm" ${totalCount <= 2 ? "open" : ""}>
          <summary class="list-none cursor-pointer px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 rounded-lg">
            <div class="min-w-0">
              <div class="text-sm font-bold text-slate-800 truncate">${safeText(group.teacherName)}</div>
              <div class="text-[11px] text-slate-500 truncate">${totalCount} ngày • ${safeText(latestDate ? `Mới nhất: ${latestDate}` : "")}</div>
            </div>
            <div class="flex items-center gap-1.5 text-[10px] font-bold shrink-0">
              <span class="px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700">Duyệt ${group.approvedCount}</span>
              <span class="px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700">Chờ ${group.pendingCount}</span>
              <span class="px-2 py-0.5 rounded border border-rose-200 bg-rose-50 text-rose-700">Từ chối ${group.rejectedCount}</span>
            </div>
          </summary>
          <div class="px-3 pb-3 pt-2 flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50">${dayRows}</div>
        </details>`;
    };

    const getWeeklySelection = (selection) => {
      const explicitWeek = String(selection?.week || "").trim();
      if (isIsoWeekToken(explicitWeek)) {
        return { ...selection, mode: "week", week: explicitWeek };
      }

      const weekFromInput = String(controls.weekInput?.value || "").trim();
      if (isIsoWeekToken(weekFromInput)) {
        return { ...selection, mode: "week", week: weekFromInput };
      }

      const fromDate = toIsoWeekTokenFromDateToken(selection?.date);
      if (isIsoWeekToken(fromDate)) {
        return { ...selection, mode: "week", week: fromDate };
      }

      return { ...selection, mode: "week", week: "" };
    };

    const renderWeeklyPanel = (selection, currentRole) => {
      if (
        !controls.weeklyPanelEl ||
        !controls.weeklyLabelEl ||
        !controls.weeklyTotalEl ||
        !controls.weeklyApprovedEl ||
        !controls.weeklyRateEl
      ) {
        return;
      }

      if (currentRole !== "admin") {
        controls.weeklyPanelEl.classList.add("hidden");
        return;
      }

      const weekSelection = getWeeklySelection(selection);
      const weekDashboard = getDashboard(weekSelection);
      const weekToken = String(weekSelection.week || "").trim();
      const weekMatch = /^(\d{4})-W(\d{2})$/.exec(weekToken);
      controls.weeklyLabelEl.innerText = weekMatch
        ? `Tuần ${Number(weekMatch[2])}/${weekMatch[1]}`
        : "Tuần chưa chọn";
      controls.weeklyTotalEl.innerText = `${Number(weekDashboard?.stats?.totalRequests || 0)}`;
      controls.weeklyApprovedEl.innerText = `${Number(weekDashboard?.stats?.approvedCount || 0)}`;
      controls.weeklyRateEl.innerText = String(
        weekDashboard?.stats?.approvalRate || "0%",
      );
      controls.weeklyPanelEl.classList.remove("hidden");
    };

    const renderApprovalPanel = (pendingRequests, periodLabel, currentRole) => {
      if (
        !controls.approvalPanel ||
        !controls.approvalSummaryEl ||
        !controls.approvalBadgeEl ||
        !controls.approvalListEl
      ) {
        return;
      }

      if (currentRole !== "admin" || pendingRequests.length === 0) {
        controls.approvalPanel.classList.add("hidden");
        controls.approvalBadgeEl.innerText = "0";
        controls.approvalListEl.innerHTML = "";
        return;
      }

      controls.approvalPanel.classList.remove("hidden");
      controls.approvalSummaryEl.innerText = `${periodLabel} có ${pendingRequests.length} yêu cầu chờ duyệt.`;
      controls.approvalBadgeEl.innerText = `${pendingRequests.length}`;
      controls.approvalListEl.innerHTML = pendingRequests
        .map((item) => renderCompactPendingItem(item))
        .join("");
    };

    const renderAttendanceList = (requests, currentRole, selection) => {
      if ((requests || []).length === 0) {
        controls.listEl.innerHTML =
          '<div class="text-sm text-slate-400">Không có bản ghi chấm công trong kỳ đã chọn.</div>';
        return;
      }

      const teacherGroups = groupAttendanceByTeacher(requests);
      controls.listEl.innerHTML = teacherGroups
        .map((group) =>
          renderTeacherAttendanceGroup(group, currentRole, selection),
        )
        .join("");
    };

    const selection = getSelection();
    applySelection(selection);

    const dashboard = getDashboard(selection);
    const periodLabel = getPeriodLabelSafe(selection, dashboard);
    if (controls.periodLabelEl) {
      controls.periodLabelEl.innerText = `Kỳ thống kê: ${periodLabel}`;
    }

    renderStats(dashboard.stats || {});
    const currentRole = getCurrentRole();
    renderWeeklyPanel(selection, currentRole);
    renderApprovalPanel(
      dashboard.pendingRequests || [],
      periodLabel,
      currentRole,
    );
    renderAttendanceList(dashboard.requests || [], currentRole, selection);
  };

  const createFrameRunner = (callback) => {
    let frameId = null;
    return () => {
      if (frameId !== null) return;
      frameId = globalThis.requestAnimationFrame(() => {
        frameId = null;
        callback();
      });
    };
  };

  const bindSearchInput = (inputId, handler) => {
    const input = document.getElementById(inputId);
    if (!input || input.dataset.boundSearchInput === "1") return;
    input.addEventListener("input", handler);
    input.dataset.boundSearchInput = "1";
  };

  const bindSearchInputs = () => {
    bindSearchInput(
      "masterTeacherSearchInput",
      createFrameRunner(() => renderTeachers()),
    );
    bindSearchInput(
      "masterStudentSearchInput",
      createFrameRunner(() => renderStudents()),
    );
    bindSearchInput(
      "masterAccountSearchInput",
      createFrameRunner(() => renderAccounts()),
    );
    bindSearchInput(
      "boardScheduleSearchInput",
      createFrameRunner(() => renderSchedules()),
    );
  };

  const renderAll = () => {
    bindSearchInputs();
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

  const getRoleDisplay = (el, fallback = "block") =>
    String(el?.dataset?.roleDisplay || fallback || "block");

  const toggleRoleElements = (selector, isVisible, fallbackDisplay) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      el.classList.toggle("hidden", !isVisible);
      el.style.display = isVisible
        ? getRoleDisplay(el, fallbackDisplay)
        : "none";
    });
  };

  const updateFixedAdminElements = (isVisible) => {
    const fixedAdminOnlyElements =
      document.querySelectorAll(".fixed-admin-only");
    fixedAdminOnlyElements.forEach((el) => {
      el.style.display = isVisible ? "block" : "none";
    });
  };

  const renderTeacherQuickSummary = (summaryEl, teacherId) => {
    if (!summaryEl || typeof getBoardTeacherAttendanceSummary !== "function") {
      return;
    }
    const summary = getBoardTeacherAttendanceSummary(teacherId);
    const workedText =
      typeof formatWorkedMinutes === "function"
        ? formatWorkedMinutes(summary.workedMinutes)
        : formatHours(Number(summary.workedMinutes || 0) / 60);
    summaryEl.innerHTML = `<span class="font-bold">30 ngày gần nhất:</span> ${summary.approved}/${summary.total} bản ghi đã duyệt • ${summary.pending} chờ duyệt • ${summary.rejected} từ chối • ${workedText}`;
  };

  const renderBoardHeaderByRole = (currentRole, currentUser, summaryEl) => {
    const boardTitleEl = document.getElementById("boardTitle");
    const boardSubtitleEl = document.getElementById("boardSubtitle");
    const teacherTitlePrefix = getConfigValue(
      "board.teacherTitlePrefix",
      "Lịch giảng dạy của",
    );
    const teacherSubtitle = getConfigValue(
      "board.teacherSubtitle",
      "Tạo lịch hoặc gửi đề xuất để admin duyệt. Quét QR để gửi giờ công.",
    );
    const adminTitle = getConfigValue(
      "board.adminTitle",
      "Lịch giảng dạy trung tâm",
    );
    const adminSubtitle = getConfigValue(
      "board.adminSubtitle",
      "Đồng bộ Cloud theo thời gian thực",
    );

    if (currentRole === "teacher") {
      if (boardTitleEl) {
        boardTitleEl.innerText =
          `${teacherTitlePrefix} ${String(currentUser?.name || "")}`.trim();
      }
      if (boardSubtitleEl) {
        boardSubtitleEl.innerText = teacherSubtitle;
      }
      renderTeacherQuickSummary(summaryEl, currentUser?.id);
      return;
    }

    if (boardTitleEl) {
      boardTitleEl.innerText = adminTitle;
    }
    if (boardSubtitleEl) {
      boardSubtitleEl.innerText = adminSubtitle;
    }
    if (summaryEl) {
      summaryEl.innerHTML = "";
    }
  };

  const applyRBAC = () => {
    ensureBoardActionDelegation();
    const currentRole = getCurrentRole();
    const currentUser = getCurrentUser();
    toggleRoleElements(".admin-only", currentRole === "admin", "flex");
    updateFixedAdminElements(currentRole === "admin" && isFixedAdmin());
    toggleRoleElements(".teacher-only", currentRole === "teacher", "block");

    const teacherAttendanceSummaryEl = document.getElementById(
      "teacherAttendanceQuickSummary",
    );
    renderBoardHeaderByRole(
      currentRole,
      currentUser,
      teacherAttendanceSummaryEl,
    );
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
