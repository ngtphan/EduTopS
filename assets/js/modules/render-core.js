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

  const renderSubjects = () => {
    const list = document.getElementById("subjectList");
    const selectCls = document.getElementById("cls_subjectId");
    const teaTagsContainer = document.getElementById("tea_subjectTags");
    list.innerHTML = window.db.subjects
      .map(
        (sub) => `
                <div class="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg group border border-slate-100 hover:border-slate-200">
                    <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full ${dotColors[safeColorKey(sub.color)] || "bg-slate-400"} shadow-sm"></span><span class="text-sm font-bold text-slate-700">${safeText(sub.name)}</span></div>
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button onclick="window.editData('subjects', '${safeAttr(sub.id)}')" class="text-slate-300 hover:text-indigo-500"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                    <button onclick="window.deleteData('subjects', '${safeAttr(sub.id)}')" class="text-slate-300 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                  </div>
                </div>
            `,
      )
      .join("");
    selectCls.innerHTML =
      '<option value="">-- Chọn môn --</option>' +
      window.db.subjects
        .map(
          (sub) =>
            `<option value="${safeAttr(sub.id)}">${safeText(sub.name)}</option>`,
        )
        .join("");
    teaTagsContainer.innerHTML = window.db.subjects
      .map(
        (sub) => `
                <label class="cursor-pointer relative"><input type="checkbox" value="${safeAttr(sub.id)}" class="peer sr-only">
                    <div class="px-2.5 py-1 text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-md peer-checked:bg-indigo-50 peer-checked:text-indigo-700 peer-checked:border-indigo-300 hover:bg-slate-200">${safeText(sub.name)}</div>
                </label>
            `,
      )
      .join("");
    lucide.createIcons();
  };

  const renderTeachers = () => {
    document.getElementById("teacherList").innerHTML = window.db.teachers
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
                                  <button onclick="window.editData('teachers', '${safeAttr(tea.id)}')" class="text-slate-300 hover:text-indigo-500"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
                                  <button onclick="window.deleteData('teachers', '${safeAttr(tea.id)}')" class="text-slate-300 hover:text-red-500"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
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
    lucide.createIcons();
  };

  const renderAccounts = () => {
    const teacherSelect = document.getElementById("acc_teacherId");
    const pendingList = document.getElementById("accountPendingList");
    const adminList = document.getElementById("accountAdminList");
    const grantedList = document.getElementById("accountGrantedList");
    const adminCount = document.getElementById("accountAdminCount");
    const pendingCount = document.getElementById("accountPendingCount");
    const grantedCount = document.getElementById("accountGrantedCount");
    if (!teacherSelect || !pendingList || !grantedList || !adminList) return;

    const adminAccounts = window.db.accounts.filter(
      (acc) =>
        acc.role === "admin" && normalizeEmail(acc.email) !== ADMIN_EMAIL,
    );

    const teacherAccounts = window.db.accounts.filter(
      (acc) => acc.role === "teacher",
    );
    const teacherAccountEmails = new Set(
      teacherAccounts.map((acc) => normalizeEmail(acc.email)),
    );

    const availableTeachers = window.db.teachers.filter((tea) => {
      const email = normalizeEmail(tea.email);
      return email && email !== ADMIN_EMAIL && !teacherAccountEmails.has(email);
    });

    teacherSelect.innerHTML =
      '<option value="">-- Chọn giáo viên để cấp quyền --</option>' +
      availableTeachers
        .map(
          (tea) =>
            `<option value="${safeAttr(tea.id)}">${safeText(tea.name)} (${safeText(tea.email)})</option>`,
        )
        .join("");

    const pendingCards = availableTeachers
      .map((tea) => {
        return `
                <div class="border border-slate-200 bg-white rounded-lg p-2 flex items-center justify-between gap-2">
                    <div class="min-w-0">
                      <div class="text-[11px] font-bold text-slate-800 truncate">${safeText(tea.name)}</div>
                      <div class="text-[11px] text-slate-500 truncate">${safeText(tea.email)}</div>
                    </div>
                    <button onclick="window.grantTeacherAccount('${safeAttr(tea.id)}')" class="text-[11px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 px-2 py-1 rounded">Cấp</button>
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
                  ${canDelete ? `<button onclick="window.deleteData('accounts', '${safeAttr(acc.id)}')" class="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>` : ""}
                </div>
            `;
      })
      .join("");

    const grantedCards = teacherAccounts
      .map((acc) => {
        const teacher =
          window.db.teachers.find((t) => t.id === acc.teacherId) ||
          window.db.teachers.find(
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
                      <button onclick="window.deleteData('accounts', '${safeAttr(acc.id)}')" class="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                    </div>
                `;
      })
      .join("");

    pendingList.innerHTML =
      pendingCards ||
      '<div class="text-[11px] text-slate-400 italic p-1">Tất cả giáo viên đã được cấp quyền.</div>';

    adminList.innerHTML =
      adminCards ||
      '<div class="text-[11px] text-slate-400 italic p-1">Chưa có admin phụ.</div>';

    grantedList.innerHTML =
      grantedCards ||
      '<div class="text-[11px] text-slate-400 italic p-1">Chưa có tài khoản giáo viên nào.</div>';

    adminCount.innerText = `${adminAccounts.length}`;
    pendingCount.innerText = `${availableTeachers.length}`;
    grantedCount.innerText = `${teacherAccounts.length}`;
    lucide.createIcons();
  };

  const renderStudents = () => {
    document.getElementById("studentList").innerHTML = window.db.students
      .map((stu) => {
        const latest = getLatestStudentEvaluation(stu.id);
        const evalBadge = latest
          ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded border ${getEvalLevelMeta(latest.level).className}">${getEvalLevelMeta(latest.level).label}</span>`
          : '<span class="text-[10px] text-slate-400 italic">Chưa đánh giá</span>';
        return `
                <div class="bg-white border border-slate-200 p-3 rounded-lg shadow-sm flex justify-between items-center group hover:border-blue-200">
                    <div>
                      <div class="text-sm font-bold text-slate-800">${safeText(stu.name)}</div>
                      <div class="text-[11px] text-slate-500 mt-0.5"><i data-lucide="phone" class="w-3 h-3 inline"></i> ${safeText(stu.parentPhone || "N/A")}</div>
                      <div class="mt-1">${evalBadge}</div>
                    </div>
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <button onclick="window.editData('students', '${safeAttr(stu.id)}')" class="text-slate-300 hover:text-indigo-500"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                      <button onclick="window.deleteData('students', '${safeAttr(stu.id)}')" class="text-slate-300 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </div>`;
      })
      .join("");
    document.getElementById("cls_studentCheckboxes").innerHTML =
      window.db.students
        .map(
          (stu) => `
                <label class="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer border border-transparent hover:border-slate-200">
                  <input type="checkbox" value="${safeAttr(stu.id)}" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"><span class="text-[12px] text-slate-700 font-medium">${safeText(stu.name)}</span>
                </label>`,
        )
        .join("");
    lucide.createIcons();
  };

  const renderClasses = () => {
    document.getElementById("classList").innerHTML = window.db.classes
      .map((cls) => {
        const sub = getSubjectInfo(cls.subjectId);
        const colorClass =
          colorStyles[safeColorKey(sub.color)] ||
          "bg-slate-100 text-slate-800 border-slate-200";
        const stripeColor =
          dotColors[safeColorKey(sub.color)] || "bg-slate-400";
        return `
                <div class="bg-white border border-slate-200 p-3 rounded-xl shadow-sm relative group overflow-hidden hover:border-indigo-200">
                    <div class="absolute left-0 top-0 bottom-0 w-1 ${stripeColor}"></div>
                    <div class="flex justify-between items-start mb-2 pl-2">
                        <div><h3 class="font-bold text-slate-900 text-sm leading-tight">${safeText(cls.name)}</h3><span class="text-[10px] font-bold px-1.5 py-0.5 rounded border ${colorClass} mt-1 inline-block">${safeText(sub.name)}</span></div>
                        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          <button onclick="window.editData('classes', '${safeAttr(cls.id)}')" class="text-slate-300 hover:text-indigo-500"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
                          <button onclick="window.deleteData('classes', '${safeAttr(cls.id)}')" class="text-slate-300 hover:text-red-500"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                        </div>
                    </div>
                    <div class="text-[11px] text-slate-500 pl-2 line-clamp-2"><span class="font-semibold text-slate-600">${cls.studentIds.length} HS:</span> ${cls.studentIds.map((id) => safeText(getStudentInfo(id).name)).join(", ")}</div>
                </div>`;
      })
      .join("");
    document.getElementById("sch_classId").innerHTML =
      '<option value="">-- Chọn Lớp --</option>' +
      window.db.classes
        .map(
          (cls) =>
            `<option value="${safeAttr(cls.id)}">${safeText(cls.name)} (${safeText(getSubjectInfo(cls.subjectId).name)})</option>`,
        )
        .join("");
    lucide.createIcons();
  };

  window.handleClassSelection = () => {
    const classId = document.getElementById("sch_classId").value;
    const hintDiv = document.getElementById("sch_classHint");
    const teacherSelect = document.getElementById("sch_teacherId");
    const filterHint = document.getElementById("teacherFilterHint");
    if (!classId) {
      hintDiv.classList.add("hidden");
      teacherSelect.disabled = true;
      teacherSelect.innerHTML =
        '<option value="">-- Vui lòng chọn Lớp trước --</option>';
      filterHint.classList.add("hidden");
      return;
    }
    const cls = getClassInfo(classId);
    if (cls) {
      hintDiv.innerHTML = `<span class="font-bold text-indigo-800">Sĩ số ${cls.studentIds.length} HS:</span> ${cls.studentIds.map((id) => safeText(getStudentInfo(id).name)).join(", ")}`;
      hintDiv.classList.remove("hidden");
      const availableTeachers = window.db.teachers.filter((t) =>
        t.subjectIds.includes(cls.subjectId),
      );
      teacherSelect.disabled = false;
      filterHint.classList.remove("hidden");
      if (availableTeachers.length > 0)
        teacherSelect.innerHTML =
          '<option value="">-- Chọn Giáo viên --</option>' +
          availableTeachers
            .map(
              (t) =>
                `<option value="${safeAttr(t.id)}">${safeText(t.name)}</option>`,
            )
            .join("");
      else
        teacherSelect.innerHTML =
          '<option value="">-- Không có GV chuyên môn này --</option>';
    }
  };

  const renderSchedules = () => {
    const currentUser = getCurrentUser();
    const currentRole = getCurrentRole();
    if (!currentUser) return;
    const filterWeek = document.getElementById("filterWeek").value;
    const container = document.getElementById("scheduleContainer");
    let filtered = window.db.schedules.filter((s) => s.week === filterWeek);
    if (currentRole === "teacher")
      filtered = filtered.filter((s) => s.teacherId === currentUser.id);

    if (filtered.length === 0) {
      container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-400 py-20"><i data-lucide="${currentRole === "teacher" ? "coffee" : "inbox"}" class="w-16 h-16 mb-4 opacity-30"></i><p class="text-lg font-bold text-slate-600">${currentRole === "teacher" ? "Tuần này bạn không có ca dạy nào." : "Lịch tuần này đang trống."}</p></div>`;
      lucide.createIcons();
      return;
    }

    const grouped = {};
    filtered.forEach((s) => {
      if (!grouped[s.dayOfWeek]) grouped[s.dayOfWeek] = [];
      grouped[s.dayOfWeek].push(s);
    });
    const sortedDays = Object.keys(grouped).sort(
      (a, b) => parseInt(a) - parseInt(b),
    );

    let html = "";
    sortedDays.forEach((day) => {
      const dayStr = day === "8" ? "Chủ nhật" : `Thứ ${day}`;
      grouped[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
      html += `<div class="mb-8 relative"><div class="flex items-center gap-3 mb-4 sticky top-0 bg-slate-50/90 backdrop-blur-sm py-2 z-10 border-b border-slate-200"><span class="bg-indigo-600 text-white text-sm font-bold px-3 py-1 rounded-md shadow-sm">${dayStr}</span><span class="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full">${grouped[day].length} ca</span></div><div class="space-y-3">`;

      grouped[day].forEach((sch) => {
        const cls = getClassInfo(sch.classId);
        if (!cls) return;
        const subInfo = getSubjectInfo(cls.subjectId);
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
          cls.studentIds.length > 0 && evalCount === cls.studentIds.length;
        const attendanceState = sch.attendance?.status || "pending";
        const attendanceMeta =
          attendanceState === "present"
            ? {
                label: "Đã chấm công",
                className: "bg-emerald-50 text-emerald-700 border-emerald-200",
              }
            : attendanceState === "absent"
              ? {
                  label: "Vắng",
                  className: "bg-rose-50 text-rose-700 border-rose-200",
                }
              : {
                  label: "Chưa chấm công",
                  className: "bg-slate-50 text-slate-600 border-slate-200",
                };
        const badges = cls.studentIds
          .map((id) => {
            const evalRecord = parseEvaluationRecord(
              sch.evaluations && sch.evaluations[id],
            );
            const levelMeta = evalRecord
              ? getEvalLevelMeta(evalRecord.level)
              : null;
            return `<span class="text-[10px] font-medium px-2 py-0.5 rounded border ${levelMeta ? levelMeta.className : "bg-slate-50 text-slate-600 border-slate-200"}">${safeText(getStudentInfo(id).name)}${levelMeta ? ` • ${safeText(levelMeta.label)}` : ""}</span>`;
          })
          .join(" ");
        const deleteBtnHtml =
          currentRole === "admin"
            ? `<button onclick="window.deleteData('schedules', '${safeAttr(sch.id)}')" class="p-2 w-full sm:w-auto flex justify-center items-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`
            : "";

        html += `
                        <div class="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div class="absolute left-0 top-0 bottom-0 w-1.5 ${stripeColor}"></div>
                          <div class="sm:w-32 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-100 pb-3 sm:pb-0 pl-1"><div class="text-lg font-bold text-slate-800 flex items-center gap-1.5"><i data-lucide="clock" class="w-4 h-4 text-slate-400"></i> ${safeText(sch.startTime)}</div><div class="text-[11px] text-slate-500 font-medium pl-5 mb-2">- ${safeText(sch.endTime)}</div><div class="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-100 px-2 py-1 rounded inline-block line-clamp-1"><i data-lucide="map-pin" class="w-3 h-3 inline text-slate-400"></i> ${safeText(sch.location)}</div></div>
                            <div class="flex-1 flex flex-col justify-center min-w-0">
                            <div class="flex items-center gap-2 mb-1.5 flex-wrap"><span class="bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">${safeText(cls.name)}</span><span class="text-[11px] font-bold px-2 py-0.5 rounded border ${colorClass}">${safeText(subInfo.name)}</span>${sch.topic ? `<span class="text-slate-400 text-xs">|</span> <span class="text-slate-500 italic text-xs truncate max-w-[150px]">${safeText(sch.topic)}</span>` : ""}</div>
                            <div class="text-sm font-medium text-slate-700 bg-slate-50 self-start px-2 py-0.5 rounded flex items-center gap-1.5 mb-2 border border-slate-100"><i data-lucide="graduation-cap" class="w-3.5 h-3.5 text-slate-400"></i> GV: ${safeText(teacher.name)}</div>
                                <div class="text-[10px] font-bold px-2 py-0.5 rounded border self-start mb-2 ${attendanceMeta.className}">${attendanceMeta.label}</div>
                                <div class="flex flex-wrap gap-1 mt-auto">${badges}</div>
                            </div>
                            <div class="flex sm:flex-col justify-end gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-3">
                            <button onclick="window.openEvalModal('${safeAttr(sch.id)}')" class="p-2 w-full sm:w-auto flex justify-center items-center ${isDone ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-slate-600 bg-slate-50 border-slate-200"} rounded-lg transition-colors group/btn"><i data-lucide="${isDone ? "clipboard-check" : "clipboard-pen"}" class="w-4 h-4 group-hover/btn:scale-110 transition-transform"></i></button>
                                ${deleteBtnHtml}
                            </div>
                        </div>`;
      });
      html += `</div></div>`;
    });
    container.innerHTML = html;
    lucide.createIcons();
  };

  const renderAttendance = () => {
    const weekInput = document.getElementById("attendanceWeek");
    const summaryEl = document.getElementById("attendanceSummary");
    const listEl = document.getElementById("attendanceList");
    const sessionsEl = document.getElementById("attendanceStatSessions");
    const presentEl = document.getElementById("attendanceStatPresent");
    const absentEl = document.getElementById("attendanceStatAbsent");
    const hoursEl = document.getElementById("attendanceStatHours");
    if (!weekInput || !summaryEl || !listEl) return;

    const resetAttendanceStats = () => {
      if (sessionsEl) sessionsEl.innerText = "0";
      if (presentEl) presentEl.innerText = "0";
      if (absentEl) absentEl.innerText = "0";
      if (hoursEl) hoursEl.innerText = "0h";
    };

    const selectedWeek =
      weekInput.value || document.getElementById("filterWeek").value;
    if (!selectedWeek) {
      listEl.innerHTML =
        '<div class="text-sm text-slate-400">Chưa chọn tuần.</div>';
      summaryEl.innerHTML = "";
      resetAttendanceStats();
      return;
    }

    const overview = getWeekAttendanceOverview(selectedWeek);
    const weekSchedules = overview.schedules;
    if (sessionsEl) sessionsEl.innerText = `${overview.totalSessions}`;
    if (presentEl) presentEl.innerText = `${overview.presentCount}`;
    if (absentEl) absentEl.innerText = `${overview.absentCount}`;
    if (hoursEl) hoursEl.innerText = formatHours(overview.totalPresentHours);

    const stats = {};
    weekSchedules.forEach((sch) => {
      const teacher = getTeacherInfo(sch.teacherId);
      const key = sch.teacherId;
      if (!stats[key]) {
        stats[key] = { name: teacher.name, sessions: 0, hours: 0 };
      }
      if (sch.attendance?.status === "present") {
        stats[key].sessions += 1;
        stats[key].hours += getDurationHours(sch.startTime, sch.endTime);
      }
    });

    const summaryRows = Object.values(stats)
      .map(
        (s) =>
          `<div class="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1"><span class="font-bold text-slate-700">${safeText(s.name)}</span>: ${s.sessions} ca • ${formatHours(s.hours)}</div>`,
      )
      .join(" ");

    summaryEl.innerHTML =
      summaryRows ||
      '<span class="text-sm text-slate-400">Tuần này chưa có dữ liệu chấm công.</span>';

    if (weekSchedules.length === 0) {
      listEl.innerHTML =
        '<div class="text-sm text-slate-400">Không có ca dạy trong tuần này.</div>';
      return;
    }

    listEl.innerHTML = weekSchedules
      .map((sch) => {
        const teacher = getTeacherInfo(sch.teacherId);
        const cls = getClassInfo(sch.classId);
        const status = sch.attendance?.status || "pending";
        const statusBadge =
          status === "present"
            ? '<span class="text-[10px] px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">Có mặt</span>'
            : status === "absent"
              ? '<span class="text-[10px] px-2 py-0.5 rounded border bg-rose-50 text-rose-700 border-rose-200 font-bold">Vắng</span>'
              : '<span class="text-[10px] px-2 py-0.5 rounded border bg-slate-50 text-slate-600 border-slate-200 font-bold">Chưa chấm</span>';
        const durationHours = getDurationHours(sch.startTime, sch.endTime);
        return `
              <div class="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-bold text-slate-800">${safeText(teacher.name)} • ${safeText(cls?.name || "Lớp đã xóa")}</div>
                  <div class="text-[11px] text-slate-500">${safeText(formatDayOfWeek(sch.dayOfWeek))} • ${safeText(sch.startTime)} - ${safeText(sch.endTime)} • ${formatHours(durationHours)}</div>
                </div>
                <div class="flex items-center gap-2">
                  ${statusBadge}
                  <button onclick="window.setAttendanceStatus('${safeAttr(sch.id)}', 'present')" class="text-[11px] font-bold px-2 py-1 rounded border bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200">Có mặt</button>
                  <button onclick="window.setAttendanceStatus('${safeAttr(sch.id)}', 'absent')" class="text-[11px] font-bold px-2 py-1 rounded border bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200">Vắng</button>
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
        "Vui lòng hoàn thành đánh giá sau mỗi ca học.";
    } else {
      document.getElementById("boardTitle").innerText =
        "Bảng điều phối Vận hành";
      document.getElementById("boardSubtitle").innerText =
        "Đồng bộ liên tục từ Cloud Database";
    }
    renderSchedules();
  };

  window.switchTab = (tabName) => {
    const currentRole = getCurrentRole();
    if (currentRole === "teacher" && tabName !== "board") return;
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
      tabName === "board"
        ? activeClass
        : inactiveClass + (currentRole === "teacher" ? "" : " admin-only");
    document.getElementById("tabBtn_form").className =
      tabName === "form" ? activeClass : inactiveClass + " admin-only";
    document.getElementById("tabBtn_master").className =
      tabName === "master" ? activeClass : inactiveClass + " admin-only";
    document.getElementById("tabBtn_attendance").className =
      tabName === "attendance" ? activeClass : inactiveClass + " admin-only";

    if (tabName === "attendance") renderAttendance();
  };

  return {
    applyRBAC,
    renderSchedules,
    renderAttendance,
    renderAll,
  };
};
