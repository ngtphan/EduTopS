import {
  normalizeScheduleApprovalStatus,
  isActiveScheduleStatus,
} from "@/entities/schedule/model/approval";
import {
  getScheduleTeacherIds as getScheduleTeacherIdsEntity,
  normalizeScheduleTeachers as normalizeScheduleTeachersEntity,
  isTeacherAssignedToSchedule as isTeacherAssignedToScheduleEntity,
} from "@/entities/schedule/model/teacher-assignment";
import {
  buildScheduleConflictKey as buildScheduleConflictKeyEntity,
  hasScheduleConflictIdentity as hasScheduleConflictIdentityEntity,
} from "@/entities/schedule/model/conflict-key";
import { pickConflictTarget } from "@/features/schedule-merge/model/pick-conflict-target";

const SCHEDULE_EDITABLE_FIELDS = [
  "week",
  "dayOfWeek",
  "startTime",
  "endTime",
  "location",
  "classId",
  "classLabel",
  "studentIds",
  "subjectId",
  "teacherId",
  "coTeacherIds",
  "topic",
];

const normalizeApprovalStatus = (schedule) => {
  return normalizeScheduleApprovalStatus(schedule);
};

const isValidTimeRange = (startTime, endTime) =>
  !!startTime && !!endTime && startTime < endTime;

const isValidDayValue = (day) => {
  const dayNum = Number(day);
  return Number.isInteger(dayNum) && dayNum >= 2 && dayNum <= 8;
};

const toClassToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "") || "unknown";

const getStudentGradeLevel = (student) =>
  String(student?.gradeLevel || student?.classLevel || "Chưa phân lớp").trim();

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

const resolveClassById = (classId) =>
  getSelectableClasses().find((cls) => String(cls.id) === String(classId));

const uniqIds = (ids) =>
  Array.from(
    new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean)),
  );

const getScheduleTeacherIds = (schedule, { fallbackTeacherId = "" } = {}) =>
  getScheduleTeacherIdsEntity(schedule, { fallbackTeacherId });

const normalizeScheduleTeachers = (schedule, fallbackTeacherId = "") => {
  return normalizeScheduleTeachersEntity(schedule, fallbackTeacherId);
};

const isTeacherAssignedToSchedule = (schedule, teacherId) =>
  isTeacherAssignedToScheduleEntity(schedule, teacherId);

const buildScheduleConflictKey = (schedule) =>
  buildScheduleConflictKeyEntity(schedule);

const hasScheduleConflictIdentity = (schedule) =>
  hasScheduleConflictIdentityEntity(schedule);

const findScheduleConflicts = (schedule, { excludeScheduleId = "" } = {}) => {
  if (!hasScheduleConflictIdentity(schedule)) return [];
  const key = buildScheduleConflictKey(schedule);

  return (globalThis.db.schedules || []).filter((item) => {
    if (String(item?.id || "") === String(excludeScheduleId || "")) {
      return false;
    }
    if (!isActiveScheduleStatus(item)) {
      return false;
    }
    return buildScheduleConflictKey(item) === key;
  });
};

const pickConflictSchedule = (schedules = []) => pickConflictTarget(schedules);

const buildScheduleRequestId = () =>
  `sch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const getScheduleStudentIds = (schedule) => {
  const classItem = resolveClassById(schedule?.classId);
  if (Array.isArray(schedule?.studentIds) && schedule.studentIds.length > 0) {
    return uniqIds(schedule.studentIds);
  }
  return uniqIds(classItem?.studentIds || []);
};

const getScheduleClassLabel = (schedule) => {
  if (schedule?.classLabel) return String(schedule.classLabel).trim();
  const classItem = resolveClassById(schedule?.classId);
  if (classItem?.name) return String(classItem.name).trim();
  return String(schedule?.classId || "").trim();
};

const getClassGroupSuffix = (cls) => {
  const groupName = String(cls?.groupName || "").trim();
  return groupName ? ` - ${groupName}` : "";
};

const formatClassOptionLabel = (cls) => {
  const name = String(cls?.name || "Lớp").trim();
  const studentCount = Array.isArray(cls?.studentIds)
    ? cls.studentIds.length
    : 0;
  return `${name}${getClassGroupSuffix(cls)} (${studentCount} HS)`;
};

const getSubjectHint = () =>
  globalThis.db.subjects
    .map((sub) => `${sub.id}: ${sub.name}`)
    .slice(0, 16)
    .join(" | ");

const getClassHint = () =>
  getSelectableClasses()
    .map((cls) => `${cls.id}: ${cls.name}${getClassGroupSuffix(cls)}`)
    .slice(0, 16)
    .join(" | ");

const getTeacherHint = () =>
  globalThis.db.teachers
    .map((tea) => `${tea.id}: ${tea.name}`)
    .slice(0, 16)
    .join(" | ");

const isDialogCancelled = (value) => value === null || value === false;

const uniqueSortedValues = (values) =>
  Array.from(new Set(values.map((value) => String(value || "").trim())))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

const buildTimeOptions = () => {
  const options = [];
  for (let hour = 6; hour <= 22; hour += 1) {
    for (const minute of [0, 30]) {
      if (hour === 22 && minute > 0) continue;
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      options.push({ value, label: value });
    }
  }
  return options;
};

const TIME_OPTIONS = buildTimeOptions();

const DAY_OPTIONS = [
  { value: "2", label: "Thứ 2" },
  { value: "3", label: "Thứ 3" },
  { value: "4", label: "Thứ 4" },
  { value: "5", label: "Thứ 5" },
  { value: "6", label: "Thứ 6" },
  { value: "7", label: "Thứ 7" },
  { value: "8", label: "Chủ nhật" },
];

const pickByDropdown = async ({
  title,
  message,
  options,
  defaultValue = "",
  confirmText = "Chọn",
}) => {
  const normalized = (options || [])
    .map((option) => ({
      value: String(option?.value || ""),
      label: String(option?.label || option?.value || ""),
    }))
    .filter((option) => option.value);
  if (normalized.length === 0) return null;

  const initialDefault = String(defaultValue || "");
  const safeDefault = normalized.some(
    (option) => option.value === initialDefault,
  )
    ? initialDefault
    : normalized[0].value;

  if (typeof globalThis.appSelect === "function") {
    const selected = await globalThis.appSelect(
      title,
      message,
      normalized,
      safeDefault,
      confirmText,
    );
    if (isDialogCancelled(selected)) return null;
    return String(selected || "").trim();
  }

  const fallback = await globalThis.appPrompt(title, message, safeDefault);
  if (isDialogCancelled(fallback)) return null;
  return String(fallback || "").trim();
};

const getWeekOptions = (defaultWeek = "") => {
  const weekValues = [
    ...globalThis.db.schedules.map((schedule) => schedule.week),
    defaultWeek,
    document.getElementById("sch_week")?.value,
    document.getElementById("filterWeek")?.value,
    document.getElementById("attendanceWeek")?.value,
  ];
  return uniqueSortedValues(weekValues).map((week) => ({
    value: week,
    label: week,
  }));
};

const getLocationOptions = (defaultLocation = "") => {
  const values = uniqueSortedValues([
    ...globalThis.db.schedules.map((schedule) => schedule.location),
    defaultLocation,
  ]);
  const normalized = values.length > 0 ? values : ["Phòng 1"];
  return normalized.map((location) => ({
    value: location,
    label: location,
  }));
};

const getClassOptions = () =>
  getSelectableClasses().map((cls) => ({
    value: String(cls.id),
    label: formatClassOptionLabel(cls),
  }));

const getSubjectOptions = ({ isAdmin, teacherId }) => {
  if (isAdmin) {
    return globalThis.db.subjects.map((subject) => ({
      value: String(subject.id),
      label: String(subject.name || "Môn học"),
    }));
  }

  const teacher = globalThis.db.teachers.find(
    (item) => String(item.id) === String(teacherId || ""),
  );
  const allowedIds = new Set((teacher?.subjectIds || []).map(String));
  return globalThis.db.subjects
    .filter((subject) => allowedIds.has(String(subject.id)))
    .map((subject) => ({
      value: String(subject.id),
      label: String(subject.name || "Môn học"),
    }));
};

const getTeacherOptions = (subjectId = "") => {
  const filtered = subjectId
    ? globalThis.db.teachers.filter((teacher) =>
        (teacher.subjectIds || []).includes(subjectId),
      )
    : globalThis.db.teachers;
  const source = filtered.length > 0 ? filtered : globalThis.db.teachers;
  return source.map((teacher) => ({
    value: String(teacher.id),
    label: String(teacher.name || "Giáo viên"),
  }));
};

const getTopicOptions = ({ defaultTopic = "", subjectId = "" }) => {
  const topicValues = uniqueSortedValues(
    globalThis.db.schedules
      .filter(
        (schedule) =>
          !subjectId || String(schedule.subjectId || "") === String(subjectId),
      )
      .map((schedule) => schedule.topic),
  );
  if (defaultTopic && !topicValues.includes(defaultTopic)) {
    topicValues.unshift(defaultTopic);
  }
  return [
    { value: "__EMPTY__", label: "(Để trống)" },
    ...topicValues.map((topic) => ({ value: topic, label: topic })),
  ];
};

const setSelectOptions = (selectEl, options, selectedValue = "") => {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  const normalized = (options || []).map((option) => ({
    value: String(option?.value || ""),
    label: String(option?.label || option?.value || ""),
  }));

  normalized.forEach((option) => {
    const optionEl = document.createElement("option");
    optionEl.value = option.value;
    optionEl.textContent = option.label;
    selectEl.appendChild(optionEl);
  });

  const desired = String(selectedValue || "");
  if (normalized.some((option) => option.value === desired)) {
    selectEl.value = desired;
  } else if (normalized[0]) {
    selectEl.value = normalized[0].value;
  }
};

const getStudentMetaText = (student) => {
  if (!student) return "Không xác định";
  const gradeLevel = getStudentGradeLevel(student);
  const parentPhone = String(student.parentPhone || "").trim();
  return parentPhone ? `${gradeLevel} • ${parentPhone}` : gradeLevel;
};

const findStudentById = (studentId) =>
  globalThis.db.students.find(
    (student) => String(student.id) === String(studentId),
  );

const getScheduleEditModalController = (() => {
  let controller = null;

  return () => {
    if (controller) return controller;

    const root = document.createElement("div");
    root.id = "scheduleEditModal";
    root.className =
      "fixed inset-0 z-[170] hidden items-center justify-center p-4 bg-slate-900/50";
    root.innerHTML = `
      <div class="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        <div class="px-5 py-3 border-b border-slate-200 bg-indigo-50 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h3 class="text-base font-bold text-indigo-900">Chỉnh sửa lịch dạy đã xếp</h3>
            <p id="scheduleEditCurrentSummary" class="text-[11px] text-indigo-700/80 mt-1"></p>
          </div>
          <button type="button" id="scheduleEditCloseBtn" class="text-slate-400 hover:text-slate-700 text-xl leading-none">&times;</button>
        </div>

        <form id="scheduleEditForm" class="flex-1 min-h-0 flex flex-col">
          <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tuần</label><select id="scheduleEditWeek" class="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg"></select></div>
              <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Thứ</label><select id="scheduleEditDay" class="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg"></select></div>
              <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Bắt đầu</label><select id="scheduleEditStart" class="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg"></select></div>
              <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Kết thúc</label><select id="scheduleEditEnd" class="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg"></select></div>
              <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Cơ sở/Phòng</label><select id="scheduleEditLocation" class="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg"></select></div>
              <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nhóm/Lớp</label><select id="scheduleEditClass" class="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg"></select></div>
              <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Môn học</label><select id="scheduleEditSubject" class="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg"></select></div>
              <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Giáo viên</label><select id="scheduleEditTeacher" class="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg"></select></div>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nội dung bài học</label>
              <input id="scheduleEditTopic" list="scheduleEditTopicList" type="text" class="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg" placeholder="Nhập nội dung bài học" />
              <datalist id="scheduleEditTopicList"></datalist>
            </div>

            <div class="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <div class="flex items-center justify-between gap-2 mb-2">
                <div class="text-xs font-bold text-slate-700 uppercase">Học sinh tham gia ca học</div>
                <div id="scheduleEditStudentCount" class="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">0/0</div>
              </div>
              <p class="text-[11px] text-slate-500 mb-2">Chạm vào card để chọn/bỏ học sinh trong ca này.</p>
              <div id="scheduleEditStudentCards" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"></div>
            </div>
          </div>

          <div class="px-4 py-3 border-t border-slate-200 bg-white flex items-center justify-end gap-2 shrink-0">
            <button type="button" id="scheduleEditCancelBtn" class="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium">Hủy</button>
            <button type="submit" id="scheduleEditSaveBtn" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold">Lưu chỉnh sửa</button>
          </div>
        </form>
      </div>`;

    document.body.appendChild(root);

    const refs = {
      root,
      form: root.querySelector("#scheduleEditForm"),
      closeBtn: root.querySelector("#scheduleEditCloseBtn"),
      cancelBtn: root.querySelector("#scheduleEditCancelBtn"),
      summary: root.querySelector("#scheduleEditCurrentSummary"),
      week: root.querySelector("#scheduleEditWeek"),
      day: root.querySelector("#scheduleEditDay"),
      start: root.querySelector("#scheduleEditStart"),
      end: root.querySelector("#scheduleEditEnd"),
      location: root.querySelector("#scheduleEditLocation"),
      classId: root.querySelector("#scheduleEditClass"),
      subjectId: root.querySelector("#scheduleEditSubject"),
      teacherId: root.querySelector("#scheduleEditTeacher"),
      topic: root.querySelector("#scheduleEditTopic"),
      topicList: root.querySelector("#scheduleEditTopicList"),
      studentCards: root.querySelector("#scheduleEditStudentCards"),
      studentCount: root.querySelector("#scheduleEditStudentCount"),
    };

    const state = {
      resolve: null,
      schedule: null,
      isAdmin: false,
      user: null,
      originalClassId: "",
      originalStudentIds: [],
      selectedStudentIds: new Set(),
    };

    const getCurrentClassStudentIds = () => {
      const classItem = resolveClassById(refs.classId.value);
      return uniqIds(classItem?.studentIds || []);
    };

    const renderStudentCards = () => {
      const classStudentIds = getCurrentClassStudentIds();
      const poolIds = uniqIds([
        ...classStudentIds,
        ...Array.from(state.selectedStudentIds),
      ]);

      refs.studentCards.innerHTML = "";
      for (const studentId of poolIds) {
        const student = findStudentById(studentId);
        const selected = state.selectedStudentIds.has(String(studentId));
        const isOutside = !classStudentIds.includes(String(studentId));

        const card = document.createElement("button");
        card.type = "button";
        card.dataset.studentId = String(studentId);
        card.className = selected
          ? "text-left border rounded-lg p-2 bg-indigo-50 border-indigo-300"
          : "text-left border rounded-lg p-2 bg-white border-slate-200 hover:border-indigo-200";

        const name = document.createElement("div");
        name.className = "text-sm font-bold text-slate-800";
        name.textContent = student?.name || "HS đã xóa";
        card.appendChild(name);

        const meta = document.createElement("div");
        meta.className = "text-[11px] text-slate-500 mt-0.5";
        meta.textContent = getStudentMetaText(student);
        card.appendChild(meta);

        if (isOutside) {
          const badge = document.createElement("div");
          badge.className =
            "mt-1 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700";
          badge.textContent = "Ngoài nhóm";
          card.appendChild(badge);
        }

        refs.studentCards.appendChild(card);
      }

      refs.studentCount.textContent = `${state.selectedStudentIds.size}/${poolIds.length}`;
    };

    const updateEndTimeOptions = () => {
      const startTime = String(refs.start.value || "");
      const endOptions = TIME_OPTIONS.filter(
        (option) => String(option.value) > startTime,
      );
      setSelectOptions(
        refs.end,
        endOptions.length > 0 ? endOptions : TIME_OPTIONS,
        refs.end.value,
      );
    };

    const updateTeacherOptions = () => {
      if (!state.isAdmin) {
        const teacherName = state.user?.name || "Giáo viên";
        setSelectOptions(
          refs.teacherId,
          [{ value: String(state.user?.id || ""), label: teacherName }],
          String(state.user?.id || ""),
        );
        refs.teacherId.disabled = true;
        return;
      }

      refs.teacherId.disabled = false;
      const options = getTeacherOptions(refs.subjectId.value);
      setSelectOptions(
        refs.teacherId,
        options,
        refs.teacherId.value || state.schedule?.teacherId,
      );
    };

    const updateTopicOptions = () => {
      const topicOptions = getTopicOptions({
        defaultTopic: String(state.schedule?.topic || ""),
        subjectId: refs.subjectId.value,
      })
        .map((option) => String(option.value || "").trim())
        .filter((value) => value && value !== "__EMPTY__");

      refs.topicList.innerHTML = "";
      topicOptions.forEach((value) => {
        const optionEl = document.createElement("option");
        optionEl.value = value;
        refs.topicList.appendChild(optionEl);
      });

      if (!String(refs.topic.value || "").trim()) {
        refs.topic.value = String(state.schedule?.topic || "");
      }
    };

    const updateStudentSelectionByClass = () => {
      const classId = String(refs.classId.value || "");
      const classStudentIds = getCurrentClassStudentIds();
      const isOriginalClass = classId === String(state.originalClassId || "");

      if (isOriginalClass && state.originalStudentIds.length > 0) {
        state.selectedStudentIds = new Set(
          state.originalStudentIds.map(String),
        );
      } else {
        state.selectedStudentIds = new Set(classStudentIds.map(String));
      }

      renderStudentCards();
    };

    const close = (result) => {
      refs.root.classList.add("hidden");
      refs.root.classList.remove("flex");
      if (state.resolve) {
        state.resolve(result);
        state.resolve = null;
      }
    };

    refs.closeBtn.addEventListener("click", () => close(null));
    refs.cancelBtn.addEventListener("click", () => close(null));
    refs.root.addEventListener("click", (event) => {
      if (event.target === refs.root) close(null);
    });

    refs.start.addEventListener("change", () => {
      updateEndTimeOptions();
    });

    refs.subjectId.addEventListener("change", () => {
      updateTeacherOptions();
      updateTopicOptions();
    });

    refs.classId.addEventListener("change", () => {
      updateStudentSelectionByClass();
    });

    refs.studentCards.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-student-id]");
      if (!button) return;
      const studentId = String(button.dataset.studentId || "");
      if (!studentId) return;

      if (state.selectedStudentIds.has(studentId)) {
        state.selectedStudentIds.delete(studentId);
      } else {
        state.selectedStudentIds.add(studentId);
      }
      renderStudentCards();
    });

    refs.form.addEventListener("submit", (event) => {
      event.preventDefault();
      const patch = {
        week: String(refs.week.value || "").trim(),
        dayOfWeek: String(refs.day.value || "").trim(),
        startTime: String(refs.start.value || "").trim(),
        endTime: String(refs.end.value || "").trim(),
        location: String(refs.location.value || "").trim(),
        classId: String(refs.classId.value || "").trim(),
        studentIds: uniqIds(Array.from(state.selectedStudentIds)),
        subjectId: String(refs.subjectId.value || "").trim(),
        teacherId: state.isAdmin
          ? String(refs.teacherId.value || "").trim()
          : String(state.user?.id || state.schedule?.teacherId || "").trim(),
        topic: String(refs.topic.value || "").trim(),
      };

      if (patch.studentIds.length === 0) {
        alert("Vui lòng chọn ít nhất 1 học sinh cho ca dạy.");
        return;
      }

      close(patch);
    });

    controller = {
      open: ({ schedule, isAdmin, user }) => {
        state.schedule = schedule;
        state.isAdmin = !!isAdmin;
        state.user = user;
        state.originalClassId = String(schedule?.classId || "");
        state.originalStudentIds = getScheduleStudentIds(schedule);
        state.selectedStudentIds = new Set(
          state.originalStudentIds.map(String),
        );

        refs.summary.textContent = `Hiện tại: Tuần ${String(schedule.week || "")} • ${String(schedule.startTime || "")} - ${String(schedule.endTime || "")} • ${getScheduleClassLabel(schedule)}`;

        setSelectOptions(
          refs.week,
          getWeekOptions(schedule.week || ""),
          schedule.week || "",
        );
        setSelectOptions(
          refs.day,
          DAY_OPTIONS,
          String(schedule.dayOfWeek || "2"),
        );
        setSelectOptions(
          refs.start,
          TIME_OPTIONS,
          String(schedule.startTime || ""),
        );
        setSelectOptions(
          refs.location,
          getLocationOptions(schedule.location || ""),
          String(schedule.location || ""),
        );
        setSelectOptions(
          refs.classId,
          getClassOptions(),
          String(schedule.classId || ""),
        );

        const teacherBasis = isAdmin
          ? String(schedule.teacherId || "")
          : String(user?.id || "");
        setSelectOptions(
          refs.subjectId,
          getSubjectOptions({ isAdmin, teacherId: teacherBasis }),
          String(schedule.subjectId || ""),
        );

        refs.topic.value = String(schedule.topic || "");

        updateEndTimeOptions();
        updateTeacherOptions();
        updateTopicOptions();
        updateStudentSelectionByClass();

        refs.root.classList.remove("hidden");
        refs.root.classList.add("flex");

        return new Promise((resolve) => {
          state.resolve = resolve;
        });
      },
    };

    return controller;
  };
})();

const validateSchedulePatch = (
  patch,
  baseSchedule,
  { allowSubjectMismatch = false } = {},
) => {
  const classId = String(patch.classId || baseSchedule.classId || "");
  const subjectId = String(patch.subjectId || baseSchedule.subjectId || "");
  const hasCoTeacherIdsInPatch = Object.hasOwn(patch, "coTeacherIds");
  const teacherFields = normalizeScheduleTeachers(
    {
      teacherId: patch.teacherId,
      coTeacherIds: hasCoTeacherIdsInPatch
        ? patch.coTeacherIds
        : baseSchedule.coTeacherIds,
    },
    baseSchedule.teacherId,
  );
  const teacherId = String(teacherFields.teacherId || "");
  const classItem = resolveClassById(classId);
  const subjectItem = globalThis.db.subjects.find((s) => s.id === subjectId);
  const assignedTeachers = teacherFields.teacherIds.reduce((items, id) => {
    const teacher = globalThis.db.teachers.find(
      (item) => String(item.id) === String(id),
    );
    if (teacher) items.push(teacher);
    return items;
  }, []);

  if (!teacherId || teacherFields.teacherIds.length === 0) {
    alert("Vui lòng chọn ít nhất 1 giáo viên phụ trách ca dạy.");
    return false;
  }

  const missingTeacherIds = teacherFields.teacherIds.filter(
    (id) =>
      !globalThis.db.teachers.some(
        (teacher) => String(teacher.id) === String(id),
      ),
  );

  if (missingTeacherIds.length > 0) {
    alert("Danh sách giáo viên có dữ liệu không hợp lệ. Vui lòng chọn lại.");
    return false;
  }

  if (!classItem) {
    alert("Lớp không tồn tại. Vui lòng chọn classId hợp lệ.");
    return false;
  }
  if (!subjectItem) {
    alert("Môn học không tồn tại. Vui lòng chọn subjectId hợp lệ.");
    return false;
  }

  if (!allowSubjectMismatch) {
    const invalidTeachers = assignedTeachers.filter(
      (teacher) => !(teacher.subjectIds || []).includes(subjectItem.id),
    );

    if (invalidTeachers.length > 0) {
      const invalidNames = invalidTeachers
        .map((teacher) => String(teacher.name || teacher.id || ""))
        .filter(Boolean)
        .join(", ");
      alert(
        `Giáo viên chưa có chuyên môn phù hợp với lớp này: ${invalidNames || "Không xác định"}.`,
      );
      return false;
    }
  }

  if (!isValidTimeRange(patch.startTime, patch.endTime)) {
    alert(
      "Khung giờ không hợp lệ. Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc.",
    );
    return false;
  }
  if (!isValidDayValue(patch.dayOfWeek)) {
    alert("Thứ không hợp lệ. Chỉ chấp nhận từ 2 đến 8.");
    return false;
  }

  const selectedStudentIds = Array.isArray(patch?.studentIds)
    ? uniqIds(patch.studentIds)
    : uniqIds(baseSchedule?.studentIds || classItem?.studentIds || []);
  if (selectedStudentIds.length === 0) {
    alert("Vui lòng chọn ít nhất 1 học sinh cho ca dạy.");
    return false;
  }

  patch.teacherId = teacherFields.teacherId;
  patch.coTeacherIds = teacherFields.coTeacherIds;

  return true;
};

const promptSchedulePatch = async ({ schedule, isAdmin, user }) => {
  return getScheduleEditModalController().open({ schedule, isAdmin, user });
};

export const registerScheduleActions = ({ getCurrentRole, getCurrentUser }) => {
  globalThis.setAttendanceStatus = async (scheduleId, status) => {
    if (getCurrentRole() !== "admin") {
      return alert("Bạn không có quyền thực hiện thao tác này!");
    }
    const sch = globalThis.db.schedules.find((s) => s.id === scheduleId);
    if (!sch) return;
    if (normalizeApprovalStatus(sch) !== "approved") {
      return alert("Ca dạy chưa được duyệt nên chưa thể chấm công.");
    }
    sch.attendance = {
      status,
      markedBy: getCurrentUser()?.email || "",
      markedAt: Date.now(),
    };
    await globalThis.cloudSave("schedules", sch);
  };

  const hasScheduleWritePermission = (role, schedule, userId) =>
    role === "admin" ||
    (role === "teacher" && isTeacherAssignedToSchedule(schedule, userId));

  const getAdminEditedStudentIds = (schedule, nextPatch) => {
    const selectedClass = resolveClassById(nextPatch.classId);
    const hasPatchedStudentIds = Array.isArray(nextPatch.studentIds);
    const isSameClass =
      String(nextPatch.classId) === String(schedule.classId || "");
    const preservedStudentIds = Array.isArray(schedule.studentIds)
      ? uniqIds(schedule.studentIds)
      : [];

    if (hasPatchedStudentIds) {
      return {
        selectedClass,
        nextStudentIds: uniqIds(nextPatch.studentIds || []),
      };
    }

    if (isSameClass && preservedStudentIds.length > 0) {
      return {
        selectedClass,
        nextStudentIds: preservedStudentIds,
      };
    }

    return {
      selectedClass,
      nextStudentIds: uniqIds(selectedClass?.studentIds || []),
    };
  };

  const saveAdminEditedSchedule = async ({ schedule, nextPatch, user }) => {
    const { selectedClass, nextStudentIds } = getAdminEditedStudentIds(
      schedule,
      nextPatch,
    );

    const updated = {
      ...schedule,
      ...nextPatch,
      classLabel: selectedClass?.name || nextPatch.classId,
      studentIds: nextStudentIds,
      approval: {
        ...schedule.approval,
        status: "approved",
        requestType: null,
        requestedBy: schedule.approval?.requestedBy || "",
        requestedAt: schedule.approval?.requestedAt || null,
        reviewedBy: user?.email || "",
        reviewedAt: Date.now(),
        note: "Admin đã chỉnh sửa và duyệt lịch.",
        changeRequest: null,
      },
    };

    await globalThis.cloudSave("schedules", updated);
  };

  const saveTeacherScheduleEditRequest = async ({ schedule, nextPatch, user }) => {
    const updated = {
      ...schedule,
      approval: {
        ...schedule.approval,
        status: "pending",
        requestType: "edit",
        requestedBy: user?.email || "",
        requestedAt: Date.now(),
        reviewedBy: "",
        reviewedAt: null,
        note: "Giáo viên đề xuất chỉnh sửa lịch.",
        changeRequest: nextPatch,
      },
    };

    await globalThis.cloudSave("schedules", updated);
  };

  const getTargetSchedulesForStudentUpdate = ({ classId, isAdmin, userId }) =>
    globalThis.db.schedules.filter((sch) => {
      if (String(sch.classId) !== String(classId)) return false;
      if (isAdmin) return true;
      return isTeacherAssignedToSchedule(sch, userId);
    });

  const applyStudentAdditionAsAdmin = async ({
    targetSchedules,
    normalizedStudentId,
    classLabel,
    student,
  }) => {
    const nextGrade = classLabel || student.gradeLevel || "";
    if (nextGrade && String(student.gradeLevel || "") !== String(nextGrade)) {
      await globalThis.cloudSave("students", {
        ...student,
        gradeLevel: nextGrade,
      });
    }

    let updatedCount = 0;
    for (const sch of targetSchedules) {
      const baseIds = getScheduleStudentIds(sch);
      const nextIds = uniqIds([...baseIds, normalizedStudentId]);
      if (nextIds.length === baseIds.length) continue;
      await globalThis.cloudSave("schedules", {
        ...sch,
        classLabel: getScheduleClassLabel(sch) || classLabel,
        studentIds: nextIds,
      });
      updatedCount += 1;
    }

    return updatedCount;
  };

  const requestStudentAdditionAsTeacher = async ({
    targetSchedules,
    normalizedStudentId,
    classLabel,
    student,
    user,
  }) => {
    let requestCount = 0;
    const now = Date.now();

    for (const sch of targetSchedules) {
      if (normalizeApprovalStatus(sch) === "pending") continue;
      const baseIds = getScheduleStudentIds(sch);
      const nextIds = uniqIds([...baseIds, normalizedStudentId]);
      if (nextIds.length === baseIds.length) continue;

      await globalThis.cloudSave("schedules", {
        ...sch,
        approval: {
          ...sch.approval,
          status: "pending",
          requestType: "edit",
          requestedBy: user?.email || "",
          requestedAt: now,
          reviewedBy: "",
          reviewedAt: null,
          note: `Giáo viên đề xuất thêm học sinh ${student.name} vào lớp ${classLabel}.`,
          changeRequest: {
            studentIds: nextIds,
            classLabel: getScheduleClassLabel(sch) || classLabel,
          },
        },
      });
      requestCount += 1;
    }

    return requestCount;
  };

  globalThis.openScheduleEditor = async (scheduleId) => {
    const role = getCurrentRole();
    const user = getCurrentUser();
    const schedule = globalThis.db.schedules.find((s) => s.id === scheduleId);
    if (!schedule) return;

    const isAdmin = role === "admin";
    if (!hasScheduleWritePermission(role, schedule, user?.id)) {
      return alert("Bạn không có quyền chỉnh sửa lịch này.");
    }

    const nextPatch = await promptSchedulePatch({ schedule, isAdmin, user });
    if (!nextPatch) return;
    if (!validateSchedulePatch(nextPatch, schedule)) {
      return;
    }

    if (isAdmin) {
      await saveAdminEditedSchedule({ schedule, nextPatch, user });
      return;
    }

    await saveTeacherScheduleEditRequest({ schedule, nextPatch, user });
    alert("Đã gửi đề xuất chỉnh sửa. Vui lòng chờ admin duyệt.");
  };

  globalThis.addStudentToScheduleClass = async (scheduleId) => {
    const role = getCurrentRole();
    const user = getCurrentUser();
    const schedule = globalThis.db.schedules.find((s) => s.id === scheduleId);
    if (!schedule) return;

    const isAdmin = role === "admin";
    if (!hasScheduleWritePermission(role, schedule, user?.id)) {
      return alert("Bạn không có quyền thêm học sinh cho lớp này.");
    }

    const classLabel = getScheduleClassLabel(schedule);
    const currentStudentIds = getScheduleStudentIds(schedule);
    const candidates = globalThis.db.students.filter(
      (stu) => !currentStudentIds.includes(String(stu.id)),
    );

    if (candidates.length === 0) {
      return alert("Không còn học sinh để thêm vào lớp này.");
    }

    const candidateOptions = candidates.map((stu) => {
      const grade = String(stu.gradeLevel || "Chưa phân lớp").trim();
      return {
        value: String(stu.id),
        label: `${stu.name} (${grade})`,
      };
    });

    const inputStudentId =
      typeof globalThis.appSelect === "function"
        ? await globalThis.appSelect(
            "Thêm học sinh vào ca dạy",
            `Chọn học sinh để thêm vào lớp ${classLabel}:`,
            candidateOptions,
            String(candidates[0]?.id || ""),
            "Thêm",
          )
        : await globalThis.appPrompt(
            "Thêm học sinh vào lớp",
            "Nhập studentId:",
            String(candidates[0]?.id || ""),
          );

    if (!inputStudentId || !String(inputStudentId).trim()) return;

    const student = findStudentById(String(inputStudentId).trim());
    if (!student) {
      return alert("studentId không hợp lệ.");
    }

    const normalizedStudentId = String(student.id);
    if (currentStudentIds.includes(normalizedStudentId)) {
      return alert("Học sinh đã có trong lớp này.");
    }

    const targetSchedules = getTargetSchedulesForStudentUpdate({
      classId: schedule.classId,
      isAdmin,
      userId: user?.id,
    });

    if (targetSchedules.length === 0) {
      return alert("Không tìm thấy ca dạy phù hợp để cập nhật.");
    }

    if (isAdmin) {
      const updatedCount = await applyStudentAdditionAsAdmin({
        targetSchedules,
        normalizedStudentId,
        classLabel,
        student,
      });

      if (updatedCount === 0) {
        return alert("Không có ca dạy nào cần cập nhật.");
      }

      alert(
        `Đã thêm ${student.name} vào lớp ${classLabel} (${updatedCount} ca dạy).`,
      );
      return;
    }

    const requestCount = await requestStudentAdditionAsTeacher({
      targetSchedules,
      normalizedStudentId,
      classLabel,
      student,
      user,
    });

    if (requestCount === 0) {
      return alert(
        "Không có ca dạy nào đủ điều kiện gửi yêu cầu (có thể đang chờ duyệt).",
      );
    }

    alert(
      `Đã gửi ${requestCount} yêu cầu thêm học sinh. Chờ admin duyệt trước khi áp dụng.`,
    );
  };

  const buildFinalPatchFromRequest = (schedule) => {
    const incomingPatch = schedule.approval?.changeRequest || {};
    const approvedPatch = SCHEDULE_EDITABLE_FIELDS.reduce((acc, key) => {
      if (incomingPatch[key] !== undefined) {
        acc[key] = incomingPatch[key];
      }
      return acc;
    }, {});

    const finalPatch = {
      ...schedule,
      ...approvedPatch,
    };

    const selectedClass = resolveClassById(finalPatch.classId);
    finalPatch.classLabel = selectedClass?.name || finalPatch.classLabel || "";
    finalPatch.studentIds = Array.isArray(approvedPatch.studentIds)
      ? uniqIds(approvedPatch.studentIds)
      : selectedClass?.studentIds || finalPatch.studentIds || [];

    return finalPatch;
  };

  const createMergedTeacherApplier = (mergedTeacherIds) => {
    return (baseSchedule, fallbackTeacherId = "") => {
      const preferredTeacherId =
        String(baseSchedule?.teacherId || "").trim() ||
        String(fallbackTeacherId || "").trim() ||
        String(mergedTeacherIds[0] || "").trim();
      const normalized = normalizeScheduleTeachers(
        {
          teacherId: preferredTeacherId,
          coTeacherIds: mergedTeacherIds.filter((id) => id !== preferredTeacherId),
        },
        preferredTeacherId,
      );

      return {
        ...baseSchedule,
        teacherId: normalized.teacherId,
        coTeacherIds: normalized.coTeacherIds,
      };
    };
  };

  const rejectScheduleAsMerged = async ({
    baseSchedule,
    targetScheduleId,
    reviewedBy,
    reviewedAt,
  }) => {
    await globalThis.cloudSave("schedules", {
      ...baseSchedule,
      approval: {
        ...baseSchedule.approval,
        status: "rejected",
        requestType: null,
        reviewedBy,
        reviewedAt,
        note: `Đã hợp nhất vào lịch ${targetScheduleId} để tránh trùng ca.`,
        changeRequest: null,
      },
    });
  };

  const syncAddedStudentGrades = async (previousSchedule, nextSchedule) => {
    const nextClassLabel = String(nextSchedule.classLabel || "").trim();
    if (!nextClassLabel) return;

    const previousStudentIds = getScheduleStudentIds(previousSchedule);
    const nextStudentIds = uniqIds(nextSchedule.studentIds);
    const addedStudentIds = nextStudentIds.filter(
      (id) => !previousStudentIds.includes(id),
    );

    for (const studentId of addedStudentIds) {
      const student = findStudentById(studentId);
      if (!student) continue;
      if (String(student.gradeLevel || "") === nextClassLabel) continue;
      await globalThis.cloudSave("students", {
        ...student,
        gradeLevel: nextClassLabel,
      });
    }
  };

  const approveScheduleRequest = async (schedule) => {
    const reviewedBy = getCurrentUser()?.email || "";
    const reviewedAt = Date.now();
    const finalPatch = buildFinalPatchFromRequest(schedule);

    if (!validateSchedulePatch(finalPatch, schedule)) return;

    const duplicateSchedules = findScheduleConflicts(finalPatch, {
      excludeScheduleId: schedule.id,
    });
    const mergedTeacherIds = uniqIds([
      ...getScheduleTeacherIds(finalPatch),
      ...duplicateSchedules.flatMap((item) => getScheduleTeacherIds(item)),
    ]);
    const applyMergedTeacherIds = createMergedTeacherApplier(mergedTeacherIds);

    const approvedDuplicate = duplicateSchedules.find(
      (item) => normalizeApprovalStatus(item) === "approved",
    );

    if (approvedDuplicate) {
      const mergedApprovedSchedule = applyMergedTeacherIds(
        approvedDuplicate,
        approvedDuplicate.teacherId || finalPatch.teacherId,
      );
      await globalThis.cloudSave("schedules", {
        ...mergedApprovedSchedule,
        approval: {
          ...approvedDuplicate.approval,
          status: "approved",
          requestType: null,
          reviewedBy,
          reviewedAt,
          note: "Admin đã duyệt và hợp nhất giáo viên đồng giảng.",
          changeRequest: null,
        },
      });

      await rejectScheduleAsMerged({
        baseSchedule: schedule,
        targetScheduleId: approvedDuplicate.id,
        reviewedBy,
        reviewedAt,
      });

      for (const duplicate of duplicateSchedules) {
        if (String(duplicate.id || "") === String(approvedDuplicate.id)) {
          continue;
        }
        await rejectScheduleAsMerged({
          baseSchedule: duplicate,
          targetScheduleId: approvedDuplicate.id,
          reviewedBy,
          reviewedAt,
        });
      }
      return;
    }

    const mergedFinalPatch = applyMergedTeacherIds(
      finalPatch,
      finalPatch.teacherId || schedule.teacherId,
    );

    await syncAddedStudentGrades(schedule, mergedFinalPatch);

    const approvalNote =
      duplicateSchedules.length > 0
        ? "Admin đã duyệt và hợp nhất giáo viên đồng giảng."
        : "Admin đã duyệt lịch.";

    await globalThis.cloudSave("schedules", {
      ...mergedFinalPatch,
      approval: {
        ...schedule.approval,
        status: "approved",
        requestType: null,
        reviewedBy,
        reviewedAt,
        note: approvalNote,
        changeRequest: null,
      },
    });

    for (const duplicate of duplicateSchedules) {
      await rejectScheduleAsMerged({
        baseSchedule: duplicate,
        targetScheduleId: mergedFinalPatch.id,
        reviewedBy,
        reviewedAt,
      });
    }
  };

  const rejectScheduleRequest = async (schedule) => {
    const rejectReason =
      (await globalThis.appPrompt(
        "Từ chối yêu cầu",
        "Lý do từ chối (tuỳ chọn):",
        "",
      )) || "Admin từ chối yêu cầu thay đổi lịch.";

    await globalThis.cloudSave("schedules", {
      ...schedule,
      approval: {
        ...schedule.approval,
        status: "rejected",
        requestType: null,
        reviewedBy: getCurrentUser()?.email || "",
        reviewedAt: Date.now(),
        note: rejectReason.trim() || "Admin từ chối yêu cầu thay đổi lịch.",
        changeRequest: null,
      },
    });
  };

  globalThis.reviewScheduleRequest = async (scheduleId, action) => {
    if (getCurrentRole() !== "admin") {
      return alert("Bạn không có quyền duyệt lịch.");
    }

    const schedule = globalThis.db.schedules.find((s) => s.id === scheduleId);
    if (!schedule) return;
    if (normalizeApprovalStatus(schedule) !== "pending") {
      return alert("Lịch này không còn ở trạng thái chờ duyệt.");
    }

    const isApprove = action === "approve";
    const shouldProceed = await globalThis.appConfirm(
      isApprove
        ? "Xác nhận duyệt lịch dạy này?"
        : "Xác nhận từ chối yêu cầu lịch dạy này?",
      isApprove ? "Duyệt lịch" : "Từ chối lịch",
    );
    if (!shouldProceed) return;

    if (isApprove) {
      await approveScheduleRequest(schedule);
      return;
    }

    await rejectScheduleRequest(schedule);
  };
};

export const registerScheduleFormsAndFilters = ({
  getCurrentRole,
  getCurrentUser,
  renderSchedules,
  renderMasterOverview,
  renderAttendance,
}) => {
  const teacherSelect = document.getElementById("sch_teacherId");
  const teacherMultiHelp = document.getElementById("teacherMultiSelectHelp");
  const classSelect = document.getElementById("sch_classId");
  const classMultiHelp = document.getElementById("classMultiSelectHelp");
  const subjectSelect = document.getElementById("sch_subjectId");
  const roleHint = document.getElementById("scheduleFormRoleHint");
  const startTimeSelect = document.getElementById("sch_start");
  const endTimeSelect = document.getElementById("sch_end");

  const getDefaultEndTimeFromStart = (startTime) => {
    const index = TIME_OPTIONS.findIndex(
      (option) => String(option.value) === String(startTime || ""),
    );
    if (index < 0) return String(TIME_OPTIONS[1]?.value || "");

    const preferredIndex = Math.min(index + 3, TIME_OPTIONS.length - 1);
    if (preferredIndex > index) {
      return String(TIME_OPTIONS[preferredIndex]?.value || "");
    }

    return String(TIME_OPTIONS[index + 1]?.value || "");
  };

  const updateCreateFormEndOptions = ({ preserveCurrent = true } = {}) => {
    if (!startTimeSelect || !endTimeSelect) return;

    const startTime = String(startTimeSelect.value || "");
    const currentEnd = String(endTimeSelect.value || "");
    const options = TIME_OPTIONS.filter(
      (option) => String(option.value) > startTime,
    );

    const selectedEnd =
      preserveCurrent &&
      options.some((option) => String(option.value) === currentEnd)
        ? currentEnd
        : getDefaultEndTimeFromStart(startTime);

    setSelectOptions(
      endTimeSelect,
      options.length > 0 ? options : TIME_OPTIONS,
      selectedEnd,
    );
  };

  const initCreateFormTimeDropdowns = () => {
    if (!startTimeSelect || !endTimeSelect) return;

    const initialStart = String(startTimeSelect.value || "08:00");
    setSelectOptions(startTimeSelect, TIME_OPTIONS, initialStart);
    updateCreateFormEndOptions({ preserveCurrent: false });

    startTimeSelect.addEventListener("change", () => {
      updateCreateFormEndOptions({ preserveCurrent: false });
    });
  };

  const syncScheduleFormByRole = () => {
    const role = getCurrentRole();
    if (!teacherSelect || !classSelect) return;

    if (role === "teacher") {
      teacherSelect.multiple = true;
      teacherSelect.size = 5;
      if (teacherMultiHelp) {
        teacherMultiHelp.classList.remove("hidden");
        teacherMultiHelp.innerText =
          "Giáo viên: có thể chọn thêm đồng giảng cùng chuyên môn. Bạn luôn là giáo viên chính.";
      }

      const previousSelectedClassIds = uniqIds(
        Array.from(classSelect.selectedOptions || []).map((option) =>
          String(option.value || "").trim(),
        ),
      );
      classSelect.multiple = false;
      classSelect.size = 1;
      if (previousSelectedClassIds.length > 0) {
        classSelect.value = previousSelectedClassIds[0];
      }
      if (classMultiHelp) classMultiHelp.classList.add("hidden");

      if (roleHint) {
        roleHint.innerText =
          "Giáo viên có thể chọn đồng giảng cùng chuyên môn. Yêu cầu sẽ ở trạng thái chờ admin duyệt.";
      }
      return;
    }

    teacherSelect.multiple = true;
    teacherSelect.size = 5;
    if (teacherMultiHelp) {
      teacherMultiHelp.classList.remove("hidden");
      teacherMultiHelp.innerText =
        "Admin: Giữ Ctrl/Command để chọn nhiều giáo viên cùng chuyên môn.";
    }

    classSelect.multiple = true;
    classSelect.size = 6;
    if (classMultiHelp) classMultiHelp.classList.remove("hidden");

    if (roleHint) {
      roleHint.innerText = "Admin tạo lịch sẽ được áp dụng ngay.";
    }
  };

  globalThis.syncScheduleFormByRole = syncScheduleFormByRole;

  initCreateFormTimeDropdowns();

  subjectSelect?.addEventListener("change", () => {
    if (typeof globalThis.handleClassSelection === "function") {
      globalThis.handleClassSelection();
    }
  });

  const getSelectedStudentIdsFromForm = () =>
    Array.from(
      document.querySelectorAll("#sch_studentCheckboxes input:checked"),
    ).map((el) => String(el.value || ""));

  const getSelectedClassIdsFromForm = () => {
    const classEl = document.getElementById("sch_classId");
    if (!classEl) return [];

    if (classEl.multiple) {
      return Array.from(classEl.selectedOptions || [])
        .map((option) => String(option.value || "").trim())
        .filter(Boolean);
    }

    const singleClassId = String(classEl.value || "").trim();
    return singleClassId ? [singleClassId] : [];
  };

  const getSelectedTeacherIdsFromForm = () => {
    const role = getCurrentRole();
    const currentUser = getCurrentUser();
    const teacherEl = document.getElementById("sch_teacherId");
    if (role === "teacher") {
      const selected = teacherEl
        ? Array.from(teacherEl.selectedOptions || [])
            .map((option) => String(option.value || "").trim())
            .filter(Boolean)
        : [];
      return uniqIds([String(currentUser?.id || ""), ...selected]);
    }

    if (!teacherEl) return [];

    return Array.from(teacherEl.selectedOptions || [])
      .map((option) => String(option.value || "").trim())
      .filter(Boolean);
  };

  const submitButtonIdleHtml =
    '<i data-lucide="cloud-upload" class="w-4 h-4"></i> Lưu lên Cloud';

  const setSubmitButtonLoading = (btn) => {
    if (!btn) return;
    btn.innerHTML =
      '<i class="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full"></i> Đang lưu...';
    btn.disabled = true;
  };

  const resetSubmitButton = (btn) => {
    if (!btn) return;
    btn.innerHTML = submitButtonIdleHtml;
    btn.disabled = false;
    lucide.createIcons();
  };

  const buildBaseScheduleForSubmission = ({ role, currentUser }) => {
    const now = Date.now();
    const isAdmin = role === "admin";

    return {
      week: document.getElementById("sch_week").value,
      dayOfWeek: document.getElementById("sch_day").value,
      startTime: document.getElementById("sch_start").value,
      endTime: document.getElementById("sch_end").value,
      location: document.getElementById("sch_location").value,
      subjectId: document.getElementById("sch_subjectId").value,
      topic: document.getElementById("sch_topic").value,
      evaluations: {},
      attendance: {
        status: "pending",
        markedBy: "",
        markedAt: null,
      },
      createdByRole: role || "unknown",
      createdByEmail: currentUser?.email || "",
      createdAt: now,
      approval: isAdmin
        ? {
            status: "approved",
            requestType: null,
            requestedBy: currentUser?.email || "",
            requestedAt: now,
            reviewedBy: currentUser?.email || "",
            reviewedAt: now,
            note: "Tạo mới bởi admin.",
            changeRequest: null,
          }
        : {
            status: "pending",
            requestType: "create",
            requestedBy: currentUser?.email || "",
            requestedAt: now,
            reviewedBy: "",
            reviewedAt: null,
            note: "Giáo viên gửi lịch mới chờ admin duyệt.",
            changeRequest: null,
          },
    };
  };

  const collectScheduleSubmissionContext = ({ role, currentUser }) => {
    const requestedTeacherIds = uniqIds(getSelectedTeacherIdsFromForm());
    const primaryTeacherId =
      role === "teacher"
        ? String(currentUser?.id || "")
        : String(requestedTeacherIds[0] || "");
    const teacherFields = normalizeScheduleTeachers(
      {
        teacherId: primaryTeacherId,
        coTeacherIds: requestedTeacherIds.filter(
          (id) => String(id || "") !== primaryTeacherId,
        ),
      },
      primaryTeacherId,
    );

    if (teacherFields.teacherIds.length === 0) {
      alert("Chọn ít nhất 1 giáo viên!");
      return null;
    }

    const selectedClassIds = uniqIds(getSelectedClassIdsFromForm());
    if (selectedClassIds.length === 0) {
      alert("Chọn ít nhất 1 nhóm/lớp!");
      return null;
    }
    if (role === "teacher" && selectedClassIds.length > 1) {
      alert("Giáo viên chỉ được tạo lịch cho 1 nhóm/lớp mỗi lần.");
      return null;
    }

    const selectedClasses = selectedClassIds
      .map((classId) => resolveClassById(classId))
      .filter(Boolean);
    if (selectedClasses.length !== selectedClassIds.length) {
      alert("Có nhóm/lớp không hợp lệ. Vui lòng chọn lại.");
      return null;
    }

    const selectedStudentIds = uniqIds(getSelectedStudentIdsFromForm());
    if (selectedStudentIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 học sinh trước khi lưu lịch.");
      return null;
    }

    const classToStudentIds = new Map();
    const classesWithoutStudents = [];
    for (const classItem of selectedClasses) {
      const classStudentIds = uniqIds(classItem?.studentIds || []);
      const classStudentSet = new Set(classStudentIds.map(String));
      const filteredIds = selectedStudentIds.filter((studentId) =>
        classStudentSet.has(String(studentId)),
      );
      if (filteredIds.length === 0) {
        classesWithoutStudents.push(
          String(classItem?.name || classItem?.id || "Không xác định"),
        );
      }
      classToStudentIds.set(String(classItem.id), filteredIds);
    }

    if (classesWithoutStudents.length > 0) {
      alert(
        `Những nhóm/lớp sau chưa có học sinh được chọn: ${classesWithoutStudents.join(", ")}. Vui lòng kiểm tra lại.`,
      );
      return null;
    }

    const baseSchedule = buildBaseScheduleForSubmission({ role, currentUser });
    if (role === "teacher") {
      const teacher = globalThis.db.teachers.find(
        (item) => String(item.id) === String(currentUser?.id || ""),
      );
      const hasSubjectMatch = (teacher?.subjectIds || []).includes(
        baseSchedule.subjectId,
      );
      if (!hasSubjectMatch) {
        alert("Bạn chỉ được chọn môn học đúng với chuyên môn của mình.");
        return null;
      }
    }

    return {
      baseSchedule,
      teacherFields,
      selectedClasses,
      classToStudentIds,
    };
  };

  const buildSchedulesToCreate = ({
    baseSchedule,
    teacherFields,
    selectedClasses,
    classToStudentIds,
  }) => {
    const creationSeed = Date.now();
    return selectedClasses.map((selectedClass, classIndex) => ({
      ...baseSchedule,
      id: `sch_${creationSeed}_${classIndex}`,
      teacherId: teacherFields.teacherId,
      coTeacherIds: teacherFields.coTeacherIds,
      classId: String(selectedClass.id),
      classLabel: selectedClass?.name || "",
      studentIds: classToStudentIds.get(String(selectedClass.id)) || [],
    }));
  };

  const getConflictCandidatesByRole = ({
    role,
    conflicts,
    approvedConflicts,
    pendingConflicts,
  }) => {
    if (role === "admin") {
      if (approvedConflicts.length > 0) return approvedConflicts;
      if (pendingConflicts.length > 0) return pendingConflicts;
      return conflicts;
    }

    if (pendingConflicts.length > 0) return pendingConflicts;
    return conflicts;
  };

  const buildTeacherMergeRequestSchedule = ({
    scheduleItem,
    approvedTarget,
    currentUser,
  }) => {
    const mergedTeacherIds = uniqIds([
      ...getScheduleTeacherIds(approvedTarget),
      ...getScheduleTeacherIds(scheduleItem),
    ]);
    const requestOwnerId =
      String(currentUser?.id || "").trim() ||
      String(mergedTeacherIds[0] || "").trim();
    const requestTeacherFields = normalizeScheduleTeachers(
      {
        teacherId: requestOwnerId,
        coTeacherIds: mergedTeacherIds.filter(
          (teacherId) => teacherId !== requestOwnerId,
        ),
      },
      requestOwnerId,
    );

    return {
      ...scheduleItem,
      id: buildScheduleRequestId(),
      teacherId: requestTeacherFields.teacherId,
      coTeacherIds: requestTeacherFields.coTeacherIds,
      approval: {
        ...scheduleItem.approval,
        status: "pending",
        requestType: "edit",
        requestedBy: currentUser?.email || "",
        requestedAt: Date.now(),
        reviewedBy: "",
        reviewedAt: null,
        note: `Đề xuất bổ sung đồng giảng cho lịch ${approvedTarget.id}.`,
        changeRequest: {
          teacherId: requestTeacherFields.teacherId,
          coTeacherIds: requestTeacherFields.coTeacherIds,
        },
      },
    };
  };

  const buildMergedScheduleFromConflict = ({
    targetConflict,
    scheduleItem,
    role,
    currentUser,
  }) => {
    const mergedTeacherIds = uniqIds([
      ...getScheduleTeacherIds(targetConflict),
      ...getScheduleTeacherIds(scheduleItem),
    ]);
    const preferredTeacherId =
      String(targetConflict?.teacherId || "").trim() ||
      String(scheduleItem?.teacherId || "").trim() ||
      String(mergedTeacherIds[0] || "").trim();
    const mergedTeacherFields = normalizeScheduleTeachers(
      {
        teacherId: preferredTeacherId,
        coTeacherIds: mergedTeacherIds.filter(
          (id) => String(id || "") !== preferredTeacherId,
        ),
      },
      preferredTeacherId,
    );

    const hasTeacherChange =
      String(targetConflict.teacherId || "") !==
        String(mergedTeacherFields.teacherId || "") ||
      JSON.stringify(uniqIds(targetConflict.coTeacherIds || [])) !==
        JSON.stringify(mergedTeacherFields.coTeacherIds);

    if (!hasTeacherChange) return null;

    const existingStatus = normalizeApprovalStatus(targetConflict);
    let nextRequestType = "edit";
    if (role === "admin") {
      nextRequestType = null;
    } else if (
      existingStatus === "pending" &&
      String(targetConflict?.approval?.requestType || "") === "create"
    ) {
      nextRequestType = "create";
    }

    return {
      ...targetConflict,
      teacherId: mergedTeacherFields.teacherId,
      coTeacherIds: mergedTeacherFields.coTeacherIds,
      approval:
        role === "admin"
          ? {
              ...targetConflict.approval,
              status: "approved",
              requestType: null,
              requestedBy:
                targetConflict.approval?.requestedBy || currentUser?.email || "",
              requestedAt: targetConflict.approval?.requestedAt || Date.now(),
              reviewedBy: currentUser?.email || "",
              reviewedAt: Date.now(),
              note: "Admin đã hợp nhất giáo viên đồng giảng cho ca dạy.",
              changeRequest: null,
            }
          : {
              ...targetConflict.approval,
              status: "pending",
              requestType: nextRequestType,
              requestedBy: currentUser?.email || "",
              requestedAt: Date.now(),
              reviewedBy: "",
              reviewedAt: null,
              note: "Giáo viên đề xuất bổ sung giáo viên đồng giảng cho ca dạy.",
              changeRequest: null,
            },
    };
  };

  const processScheduleCreationItem = async ({
    scheduleItem,
    role,
    currentUser,
    btn,
  }) => {
    const conflicts = findScheduleConflicts(scheduleItem);
    if (conflicts.length === 0) {
      await globalThis.cloudSave("schedules", scheduleItem);
      return { created: 1, merged: 0, unchanged: 0, abort: false };
    }

    const approvedConflicts = conflicts.filter(
      (item) => normalizeApprovalStatus(item) === "approved",
    );
    const pendingConflicts = conflicts.filter(
      (item) => normalizeApprovalStatus(item) === "pending",
    );

    if (
      role === "teacher" &&
      pendingConflicts.length === 0 &&
      approvedConflicts.length > 0
    ) {
      const approvedTarget = pickConflictSchedule(approvedConflicts);
      if (!approvedTarget) {
        return { created: 0, merged: 0, unchanged: 1, abort: false };
      }

      const mergeRequestSchedule = buildTeacherMergeRequestSchedule({
        scheduleItem,
        approvedTarget,
        currentUser,
      });
      if (!validateSchedulePatch(mergeRequestSchedule, scheduleItem)) {
        resetSubmitButton(btn);
        return { created: 0, merged: 0, unchanged: 0, abort: true };
      }

      await globalThis.cloudSave("schedules", mergeRequestSchedule);
      return { created: 1, merged: 0, unchanged: 0, abort: false };
    }

    const targetConflict = pickConflictSchedule(
      getConflictCandidatesByRole({
        role,
        conflicts,
        approvedConflicts,
        pendingConflicts,
      }),
    );
    if (!targetConflict) {
      return { created: 0, merged: 0, unchanged: 1, abort: false };
    }

    const mergedSchedule = buildMergedScheduleFromConflict({
      targetConflict,
      scheduleItem,
      role,
      currentUser,
    });
    if (!mergedSchedule) {
      return { created: 0, merged: 0, unchanged: 1, abort: false };
    }

    if (!validateSchedulePatch(mergedSchedule, targetConflict)) {
      resetSubmitButton(btn);
      return { created: 0, merged: 0, unchanged: 0, abort: true };
    }

    await globalThis.cloudSave("schedules", mergedSchedule);
    return { created: 0, merged: 1, unchanged: 0, abort: false };
  };

  const resetScheduleCreateForm = (weekValue) => {
    document.getElementById("filterWeek").value = weekValue;
    document.getElementById("attendanceWeek").value = weekValue;
    const classEl = document.getElementById("sch_classId");
    if (classEl?.multiple) {
      Array.from(classEl.options || []).forEach((option) => {
        option.selected = false;
      });
    } else if (classEl) {
      classEl.value = "";
    }

    document.getElementById("sch_subjectId").value = "";
    document.getElementById("sch_topic").value = "";
    globalThis.handleClassSelection();
    syncScheduleFormByRole();
  };

  const notifyScheduleSubmissionResult = ({
    role,
    createdCount,
    mergedCount,
    unchangedCount,
  }) => {
    const skippedSummary =
      unchangedCount > 0 ? `, bỏ qua ${unchangedCount} ca trùng` : "";

    if (role === "teacher") {
      if (createdCount === 0 && mergedCount === 0) {
        alert(
          "Lịch trùng đã tồn tại với cùng danh sách giáo viên. Không có thay đổi mới.",
        );
      } else {
        alert(
          `Đã gửi lịch: tạo mới ${createdCount} ca, hợp nhất ${mergedCount} ca${skippedSummary}. Vui lòng chờ admin duyệt trước khi áp dụng.`,
        );
      }
      return;
    }

    if (createdCount > 0 || mergedCount > 0) {
      alert(
        `Đã xử lý lịch: tạo mới ${createdCount} ca, hợp nhất ${mergedCount} ca${skippedSummary}.`,
      );
    }
  };

  document
    .getElementById("scheduleForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const role = getCurrentRole();
      const currentUser = getCurrentUser();
      const submissionContext = collectScheduleSubmissionContext({
        role,
        currentUser,
      });
      if (!submissionContext) return;

      const schedulesToCreate = buildSchedulesToCreate(submissionContext);

      for (const scheduleItem of schedulesToCreate) {
        if (!validateSchedulePatch(scheduleItem, scheduleItem)) {
          return;
        }
      }

      const btn = document.getElementById("btnSubmitSchedule");
      setSubmitButtonLoading(btn);

      let createdCount = 0;
      let mergedCount = 0;
      let unchangedCount = 0;

      for (const scheduleItem of schedulesToCreate) {
        const result = await processScheduleCreationItem({
          scheduleItem,
          role,
          currentUser,
          btn,
        });
        if (result.abort) return;
        createdCount += result.created;
        mergedCount += result.merged;
        unchangedCount += result.unchanged;
      }

      resetScheduleCreateForm(submissionContext.baseSchedule.week);
      resetSubmitButton(btn);
      notifyScheduleSubmissionResult({
        role,
        createdCount,
        mergedCount,
        unchangedCount,
      });
      globalThis.switchTab("board");
    });

  document.getElementById("filterWeek").addEventListener("change", () => {
    const attendanceWeekInput = document.getElementById("attendanceWeek");
    if (attendanceWeekInput) {
      attendanceWeekInput.value = document.getElementById("filterWeek").value;
    }
    renderSchedules();
    renderMasterOverview();
    renderAttendance();
  });

  document.getElementById("attendanceWeek")?.addEventListener("change", () => {
    const week = document.getElementById("attendanceWeek")?.value || "";
    if (week) {
      document.getElementById("filterWeek").value = week;
      renderSchedules();
    }
    renderMasterOverview();
    renderAttendance();
  });

  document.getElementById("attendanceDate")?.addEventListener("change", () => {
    renderMasterOverview();
    renderAttendance();
  });

  const scheduleViewModeSelect = document.getElementById("scheduleViewMode");
  if (scheduleViewModeSelect) {
    try {
      const savedMode =
        globalThis.localStorage?.getItem("scheduleViewMode") || "";
      if (["list", "timetable"].includes(savedMode)) {
        scheduleViewModeSelect.value = savedMode;
      }
    } catch {
      // Ignore storage read errors and keep default mode.
    }

    scheduleViewModeSelect.addEventListener("change", () => {
      try {
        globalThis.localStorage?.setItem(
          "scheduleViewMode",
          scheduleViewModeSelect.value,
        );
      } catch {
        // Ignore storage write errors.
      }
      renderSchedules();
    });
  }

  document
    .getElementById("attendancePeriod")
    ?.addEventListener("change", () => {
      const mode = document.getElementById("attendancePeriod")?.value;
      if (mode === "week") {
        const week = document.getElementById("attendanceWeek")?.value || "";
        if (week) {
          document.getElementById("filterWeek").value = week;
          renderSchedules();
        }
      } else if (mode === "day") {
        const selectedDate = document.getElementById("attendanceDate")?.value;
        if (selectedDate) {
          const fallbackWeek = document.getElementById("filterWeek")?.value;
          if (fallbackWeek && document.getElementById("attendanceWeek")) {
            document.getElementById("attendanceWeek").value = fallbackWeek;
          }
        }
      }
      renderMasterOverview();
      renderAttendance();
    });

  document.getElementById("attendanceMonth")?.addEventListener("change", () => {
    renderMasterOverview();
    renderAttendance();
  });

  syncScheduleFormByRole();
};
