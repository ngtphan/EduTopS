// @ts-nocheck
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { registerAuthHandlers } from "./modules/auth";
import {
  registerTeacherActions,
  registerTeacherForms,
} from "./modules/teacher-management";
import { registerStudentAndClassForms } from "./modules/student-management";
import {
  registerScheduleActions,
  registerScheduleFormsAndFilters,
} from "./modules/schedule-management";
import { registerRenderCore } from "./modules/render-core";
import { registerDataManagement } from "./modules/data-management";
import { registerSubjectForm } from "./modules/subject-management";
import { registerReportingExports } from "./modules/reporting";
import {
  ATTENDANCE_MAX_WORKED_MINUTES,
  buildAttendanceRequestId,
  computeWorkedMinutes,
  isIsoDateToken,
  registerAttendanceFeature,
} from "./modules/features/attendance/attendance-feature";
import { normalizeScheduleApprovalStatus } from "@/entities/schedule/model/approval";
import { getScheduleTeacherIds } from "@/entities/schedule/model/teacher-assignment";
import { getParentStudentIds } from "@/entities/parent/model/student-access";
import { canParentAccessSchedule } from "@/features/parent-guards/model/access";
import {
  createAccessContextSnapshot,
  shouldResetAccessScopedCache,
} from "@/features/parent-guards/model/access-context";
import {
  appendAccessDeniedEvent,
  createAccessDeniedEvent,
  shouldDedupeAccessDeniedEvent,
} from "@/shared/lib/access-denied-telemetry";
import {
  normalizeWeekToken,
  toIsoWeekTokenFromDate,
} from "@/shared/lib/week-token";
import { buildAdminDashboardMetrics } from "@/shared/lib/admin-dashboard-metrics";
import { sanitizeForStorage, isSafeDocId } from "./modules/security-utils";
import { APP_CONFIG, getConfigByPath } from "./config/app-config";

const APP_VERSION = String(APP_CONFIG.version || "v0.0.0").trim();

const getAppConfigValue = (path, fallbackValue = "") =>
  getConfigByPath(path, fallbackValue);

const applyAppConfigBindings = (root = document) => {
  const applyTextBinding = (selector, attrName, setter) => {
    root.querySelectorAll(selector).forEach((element) => {
      const configPath = String(element.getAttribute(attrName) || "").trim();
      if (!configPath) return;
      const configuredValue = getAppConfigValue(configPath, "");
      const nextValue = String(configuredValue || "").trim();
      if (!nextValue) return;
      setter(element, nextValue);
    });
  };

  applyTextBinding(
    "[data-config-text]",
    "data-config-text",
    (element, value) => {
      element.textContent = value;
    },
  );

  applyTextBinding(
    "[data-config-placeholder]",
    "data-config-placeholder",
    (element, value) => {
      if ("placeholder" in element) {
        element.placeholder = value;
      }
    },
  );

  const pageTitle = String(getAppConfigValue("branding.pageTitle", "")).trim();
  if (pageTitle) {
    document.title = pageTitle;
  }
};

globalThis.APP_CONFIG = APP_CONFIG;

const injectPartial = async (hostId, filePath) => {
  const host = document.getElementById(hostId);
  if (!host) {
    throw new Error(`Không tìm thấy host: ${hostId}`);
  }

  const response = await fetch(filePath, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Không thể tải partial ${filePath} (${response.status})`);
  }

  host.innerHTML = await response.text();
};

const mountLayoutPartials = async () => {
  const partials = [
    ["loadingOverlayHost", "./partials/overlays/loading-overlay.html"],
    ["loginOverlayHost", "./partials/overlays/login-overlay.html"],
    ["headerHost", "./partials/layout/header.html"],
    ["viewBoardHost", "./partials/views/view-board.html"],
    ["viewFormHost", "./partials/views/view-form.html"],
    ["viewMasterHost", "./partials/views/view-master.html"],
    ["viewAttendanceHost", "./partials/views/view-attendance.html"],
    ["evalModalHost", "./partials/modals/eval-modal.html"],
    ["syncStatusHost", "./partials/layout/sync-status-panel.html"],
    ["toastContainerHost", "./partials/layout/toast-container.html"],
    ["appDialogHost", "./partials/layout/app-dialog.html"],
  ];

  await Promise.all(
    partials.map(([hostId, filePath]) => injectPartial(hostId, filePath)),
  );
};

try {
  await mountLayoutPartials();
  applyAppConfigBindings(document);
} catch (error) {
  console.error("Lỗi tải layout partials:", error);
  document.body.innerHTML =
    '<div class="min-h-screen flex items-center justify-center p-6 text-center text-slate-700"><div><h1 class="text-xl font-bold mb-2">Không thể tải giao diện</h1><p class="text-sm text-slate-500">Vui lòng chạy ứng dụng qua web server (ví dụ Live Server) và tải lại trang.</p></div></div>';
  throw error;
}

lucide.createIcons();
const headerAppVersion = document.getElementById("headerAppVersion");
if (headerAppVersion) {
  headerAppVersion.innerText = APP_VERSION;
}

// -------------------------------------------------------------
// CẤU HÌNH FIREBASE
// -------------------------------------------------------------
const fallbackFirebaseConfig = getAppConfigValue("firebase.fallbackConfig", {});

let firebaseConfig = fallbackFirebaseConfig;
let appId = String(getAppConfigValue("firebase.defaultAppId", "edutops-app"));
let isCanvasEnv = false;

if (typeof __firebase_config !== "undefined") {
  try {
    const raw = __firebase_config;
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed && trimmed !== "undefined" && trimmed !== "null") {
        firebaseConfig = JSON.parse(trimmed);
        isCanvasEnv = true;
      }
    } else if (raw && typeof raw === "object") {
      firebaseConfig = raw;
      isCanvasEnv = true;
    }
  } catch (error) {
    console.warn(
      "Bỏ qua __firebase_config không hợp lệ, dùng cấu hình fallback.",
      error,
    );
    firebaseConfig = fallbackFirebaseConfig;
    isCanvasEnv = false;
  }
}

if (isCanvasEnv && typeof __app_id !== "undefined") {
  const rawAppId = String(__app_id || "").trim();
  if (rawAppId && rawAppId !== "undefined" && rawAppId !== "null") {
    appId = rawAppId;
  }
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

let activeDataPathMode = isCanvasEnv ? "canvas" : "root";
let hasRetriedAlternateDataPath = false;

const getColRefByPathMode = (colName, pathMode = activeDataPathMode) => {
  if (pathMode === "canvas") {
    return collection(firestore, "artifacts", appId, "public", "data", colName);
  }
  return collection(firestore, colName);
};

const getColRef = (colName) => getColRefByPathMode(colName, activeDataPathMode);

globalThis.db = {
  subjects: [],
  teachers: [],
  students: [],
  classes: [],
  schedules: [],
  accounts: [],
  attendanceRequests: [],
  settings: [],
};

const DATA_COLLECTIONS = [
  "subjects",
  "teachers",
  "students",
  "classes",
  "schedules",
  "accounts",
  "attendanceRequests",
  "settings",
];
const dataRevision = Object.fromEntries(
  DATA_COLLECTIONS.map((collectionName) => [collectionName, 0]),
);

const bumpDataRevision = (collectionName) => {
  if (!Object.hasOwn(dataRevision, collectionName)) return;
  dataRevision[collectionName] = Number(dataRevision[collectionName] || 0) + 1;
};

let currentUser = null;
let currentRole = null;
let isDataLoaded = false;
globalThis.unsubscribes = [];
let pendingLoginError = "";
let applyRBAC = () => {};
let renderSchedules = () => {};
let renderAttendance = () => {};
let renderAll = () => {};
let renderAllFrame = null;
const syncState = {
  loadedCollections: new Set(),
  collectionMeta: {},
  initialLoadTimer: null,
};
const syncErrorNotified = new Set();

const normalizeEmail = (email) => (email || "").trim().toLowerCase();
const toToken = (value) =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean"
    ? String(value).trim()
    : "";
const uniqTokens = (values = []) =>
  Array.from(
    new Set((values || []).map((value) => toToken(value)).filter(Boolean)),
  );
const toBooleanFlag = (value, fallbackValue = false) => {
  if (typeof value === "boolean") return value;

  const token = toToken(value).toLowerCase();
  if (!token) return fallbackValue;
  if (token === "1" || token === "true" || token === "yes" || token === "on") {
    return true;
  }
  if (token === "0" || token === "false" || token === "no" || token === "off") {
    return false;
  }

  return fallbackValue;
};
const ADMIN_EMAIL = normalizeEmail(
  getAppConfigValue("auth.fixedAdminEmail", "ngoctaiphan.edu@gmail.com"),
);
const PARENT_DASHBOARD_FEATURE_ENABLED = toBooleanFlag(
  getAppConfigValue("features.parentDashboardEnabled", false),
  false,
);
const SECURITY_TELEMETRY_ENABLED = toBooleanFlag(
  getAppConfigValue("features.securityTelemetryEnabled", true),
  true,
);

let accessContextState = createAccessContextSnapshot({
  role: "",
  userId: "",
  parentStudentIds: [],
});
let accessDeniedEvents = [];
let lastAccessDeniedEvent = null;

const syncAccessContextState = () => {
  const nextState = createAccessContextSnapshot({
    role: currentRole,
    userId: currentUser?.id,
    parentStudentIds: Array.isArray(currentUser?.studentIds)
      ? currentUser.studentIds
      : [],
  });

  if (shouldResetAccessScopedCache(accessContextState, nextState)) {
    // Reset dedupe window when auth scope changes to avoid hiding critical deny logs.
    lastAccessDeniedEvent = null;
  }

  accessContextState = nextState;
};

const reportAccessDenied = ({
  action,
  reason,
  resourceType,
  resourceId,
  details,
  roleOverride,
  userIdOverride,
}) => {
  if (!SECURITY_TELEMETRY_ENABLED) return;

  const event = createAccessDeniedEvent({
    action,
    reason,
    resourceType,
    resourceId,
    details,
    role: roleOverride ?? currentRole,
    userId: userIdOverride ?? currentUser?.id,
  });

  if (shouldDedupeAccessDeniedEvent(lastAccessDeniedEvent, event)) {
    return;
  }

  accessDeniedEvents = appendAccessDeniedEvent(accessDeniedEvents, event, 300);
  lastAccessDeniedEvent = event;
  console.warn("[Security][AccessDenied]", event);
};

globalThis.getAccessDeniedEvents = () => {
  if (!Array.isArray(accessDeniedEvents)) return [];
  return [...accessDeniedEvents];
};
globalThis.clearAccessDeniedEvents = () => {
  const removedCount = Array.isArray(accessDeniedEvents)
    ? accessDeniedEvents.length
    : 0;
  accessDeniedEvents = [];
  lastAccessDeniedEvent = null;
  return removedCount;
};
globalThis.EDUTOPS_FEATURE_FLAGS = {
  parentDashboardEnabled: PARENT_DASHBOARD_FEATURE_ENABLED,
  securityTelemetryEnabled: SECURITY_TELEMETRY_ENABLED,
};

const isFixedAdmin = () =>
  normalizeEmail(currentUser?.email) === normalizeEmail(ADMIN_EMAIL);

const getParentIdFromAccount = ({ account, user, loginEmail }) =>
  toToken(account?.parentId) ||
  toToken(account?.id) ||
  toToken(user?.uid) ||
  toToken(loginEmail);

const getParentLinkRecordsFromAccounts = () =>
  (globalThis.db.accounts || [])
    .filter((account) => String(account?.role || "") === "parent")
    .filter((account) => account?.active !== false)
    .map((account) => {
      const parentId = getParentIdFromAccount({
        account,
        user: null,
        loginEmail: normalizeEmail(account?.email),
      });

      return {
        parentId,
        studentId: account?.studentId,
        studentIds: Array.isArray(account?.studentIds)
          ? account.studentIds
          : [],
      };
    });

const getParentStudentIdsByParentId = (parentId) =>
  getParentStudentIds(getParentLinkRecordsFromAccounts(), toToken(parentId));

const getCurrentParentStudentIds = () => {
  if (accessContextState.role !== "parent") return [];
  return accessContextState.parentStudentIds;
};

const EVAL_LEVELS = {
  good: {
    label: "Tốt",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  fair: {
    label: "Khá",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  watch: {
    label: "Cần theo dõi",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  absent: {
    label: "Vắng",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

const parseEvaluationRecord = (raw) => {
  if (!raw) return null;
  if (typeof raw === "string") {
    const note = raw.trim();
    return note ? { level: "fair", note } : null;
  }
  if (typeof raw === "object") {
    const rawLevel = String(raw.level || "").trim();
    const note = String(raw.note || "").trim();
    const absent = raw.absent === true || rawLevel === "absent";
    let normalizedLevel = "fair";
    if (absent) {
      normalizedLevel = "absent";
    } else if (
      rawLevel === "good" ||
      rawLevel === "fair" ||
      rawLevel === "watch"
    ) {
      normalizedLevel = rawLevel;
    }

    if (!rawLevel && !note && !absent) {
      return null;
    }

    return { level: normalizedLevel, note, absent };
  }
  return null;
};

const getEvalLevelMeta = (level) => EVAL_LEVELS[level] || EVAL_LEVELS.fair;

const getLatestStudentEvaluation = (studentId) => {
  let latest = null;
  let latestTime = 0;
  globalThis.db.schedules.forEach((sch) => {
    const evalRecord = parseEvaluationRecord(sch.evaluations?.[studentId]);
    if (!evalRecord) return;
    const timeKey =
      Number((sch.week || "").replace("-W", "")) * 10 +
      Number(sch.dayOfWeek || 0);
    if (timeKey >= latestTime) {
      latestTime = timeKey;
      latest = evalRecord;
    }
  });
  return latest;
};

const getDurationHours = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if ([sh, sm, eh, em].some((v) => Number.isNaN(v))) return 0;
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  const diff = end - start;
  return diff > 0 ? diff / 60 : 0;
};

const formatHours = (hours) => {
  if (!hours || hours <= 0) return "0h";
  if (Math.abs(hours - Math.round(hours)) < 0.001)
    return `${Math.round(hours)}h`;
  return `${hours.toFixed(1)}h`;
};

const getSelectedWeek = () => {
  const weekFromAttendance = normalizeWeekToken(
    document.getElementById("attendanceWeek")?.value,
  );
  const weekFromBoard = normalizeWeekToken(
    document.getElementById("filterWeek")?.value,
  );
  return weekFromAttendance || weekFromBoard || "";
};

globalThis.normalizeWeekToken = normalizeWeekToken;

const formatDayOfWeek = (dayOfWeek) =>
  String(dayOfWeek) === "8" ? "Chủ nhật" : `Thứ ${dayOfWeek}`;

const getAttendanceStatusMeta = (status) => {
  if (status === "present") return { label: "Có mặt", sort: 1 };
  if (status === "absent") return { label: "Vắng", sort: 2 };
  return { label: "Chưa chấm", sort: 3 };
};

const getScheduleApprovalStatus = (schedule) =>
  normalizeScheduleApprovalStatus(schedule);

const toClassToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "") || "unknown";

const getStudentGradeLevel = (student) =>
  String(student?.gradeLevel || student?.classLevel || "Chưa phân lớp").trim();

const createCollectionIndexCache = () => ({
  revision: -1,
  byId: new Map(),
});

const idLookupCache = {
  subjects: createCollectionIndexCache(),
  teachers: createCollectionIndexCache(),
  students: createCollectionIndexCache(),
  classes: createCollectionIndexCache(),
};

const getCollectionIndexById = (collectionName) => {
  const cache = idLookupCache[collectionName];
  if (!cache) return new Map();

  const revision = Number(dataRevision?.[collectionName] || 0);
  if (cache.revision === revision) {
    return cache.byId;
  }

  const nextMap = new Map();
  const rows = Array.isArray(globalThis.db?.[collectionName])
    ? globalThis.db[collectionName]
    : [];

  rows.forEach((row) => {
    const id = String(row?.id || "").trim();
    if (!id) return;
    nextMap.set(id, row);
  });

  cache.byId = nextMap;
  cache.revision = revision;
  return cache.byId;
};

const autoClassGroupsCache = {
  studentsRevision: -1,
  groups: [],
};

const selectableClassesCache = {
  studentsRevision: -1,
  classesRevision: -1,
  classes: [],
  byId: new Map(),
};

const buildAutoClassGroups = () => {
  const studentsRevision = Number(dataRevision.students || 0);
  if (autoClassGroupsCache.studentsRevision === studentsRevision) {
    return autoClassGroupsCache.groups;
  }

  const grouped = new Map();
  globalThis.db.students.forEach((student) => {
    const gradeLevel = getStudentGradeLevel(student);
    if (!grouped.has(gradeLevel)) grouped.set(gradeLevel, []);
    grouped.get(gradeLevel).push(student.id);
  });

  const groups = Array.from(grouped.entries())
    .map(([gradeLevel, studentIds]) => ({
      id: `grade_${toClassToken(gradeLevel)}`,
      name: gradeLevel,
      groupName: "",
      studentIds,
      defaultDays: [],
    }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  autoClassGroupsCache.studentsRevision = studentsRevision;
  autoClassGroupsCache.groups = groups;
  return groups;
};

const getSelectableClasses = () => {
  const studentsRevision = Number(dataRevision.students || 0);
  const classesRevision = Number(dataRevision.classes || 0);
  if (
    selectableClassesCache.studentsRevision === studentsRevision &&
    selectableClassesCache.classesRevision === classesRevision
  ) {
    return selectableClassesCache.classes;
  }

  const autoGroups = buildAutoClassGroups();
  const classes = autoGroups.length > 0 ? autoGroups : globalThis.db.classes;
  const byId = new Map();

  classes.forEach((item) => {
    const id = String(item?.id || "").trim();
    if (!id) return;
    byId.set(id, item);
  });

  selectableClassesCache.studentsRevision = studentsRevision;
  selectableClassesCache.classesRevision = classesRevision;
  selectableClassesCache.classes = classes;
  selectableClassesCache.byId = byId;

  return selectableClassesCache.classes;
};

const getSelectableClassById = (id) => {
  const normalizedId = String(id || "").trim();
  if (!normalizedId) return null;
  getSelectableClasses();
  return selectableClassesCache.byId.get(normalizedId) || null;
};

const getAttendanceWeekSchedules = (week) => {
  const normalizedWeek = normalizeWeekToken(week);
  if (!normalizedWeek) return [];

  return globalThis.db.schedules
    .filter(
      (s) =>
        normalizeWeekToken(s.week) === normalizedWeek &&
        getScheduleApprovalStatus(s) === "approved",
    )
    .sort((a, b) => {
      const dayDiff = Number(a.dayOfWeek) - Number(b.dayOfWeek);
      if (dayDiff !== 0) return dayDiff;
      return String(a.startTime || "").localeCompare(String(b.startTime || ""));
    });
};

const requestRenderAll = () => {
  if (renderAllFrame !== null) return;
  renderAllFrame = globalThis.requestAnimationFrame(() => {
    renderAllFrame = null;
    renderAll();
  });
};

const getWeekAttendanceOverview = (week) => {
  const schedules = getAttendanceWeekSchedules(week);
  let presentCount = 0;
  let absentCount = 0;
  let totalPresentHours = 0;

  schedules.forEach((sch) => {
    const status = sch.attendance?.status || "pending";
    if (status === "present") {
      presentCount += 1;
      totalPresentHours += getDurationHours(sch.startTime, sch.endTime);
    } else if (status === "absent") {
      absentCount += 1;
    }
  });

  return {
    totalSessions: schedules.length,
    presentCount,
    absentCount,
    totalPresentHours,
    schedules,
  };
};

const renderMasterOverview = () => {
  const week = getSelectedWeek();

  const metrics = buildAdminDashboardMetrics({
    weekToken: week,
    db: globalThis.db,
    accessDeniedEvents:
      typeof globalThis.getAccessDeniedEvents === "function"
        ? globalThis.getAccessDeniedEvents()
        : [],
    getDurationHours,
  });

  const subjectsEl = document.getElementById("masterStatSubjects");
  const teachersEl = document.getElementById("masterStatTeachers");
  const studentsEl = document.getElementById("masterStatStudents");
  const classesEl = document.getElementById("masterStatClasses");
  const accountsEl = document.getElementById("masterStatAccounts");
  const teacherAccountsEl = document.getElementById(
    "masterStatTeacherAccounts",
  );
  const schedulesWeekEl = document.getElementById("masterStatSchedulesWeek");
  const pendingSchedulesWeekEl = document.getElementById(
    "masterStatPendingSchedulesWeek",
  );
  const attendancePendingEl = document.getElementById(
    "masterStatAttendancePending",
  );
  const weekLabelEl = document.getElementById("masterOverviewWeekLabel");
  const healthScoreEl = document.getElementById("masterOverviewHealthScore");
  const healthLevelEl = document.getElementById("masterOverviewHealthLevel");
  const healthSummaryEl = document.getElementById(
    "masterOverviewHealthSummary",
  );
  const healthChipEl = document.getElementById("masterOverviewHealthChip");
  const approvalProgressTextEl = document.getElementById(
    "masterOverviewApprovalProgressText",
  );
  const approvalProgressBarEl = document.getElementById(
    "masterOverviewApprovalProgressBar",
  );
  const attendanceProgressTextEl = document.getElementById(
    "masterOverviewAttendanceProgressText",
  );
  const attendanceProgressBarEl = document.getElementById(
    "masterOverviewAttendanceProgressBar",
  );
  const attendancePresentTextEl = document.getElementById(
    "masterOverviewPresentRateText",
  );
  const plannedHoursEl = document.getElementById("masterOverviewPlannedHours");
  const activeTeachersEl = document.getElementById(
    "masterOverviewActiveTeachers",
  );
  const activeClassesEl = document.getElementById(
    "masterOverviewActiveClasses",
  );
  const teacherCoverageTextEl = document.getElementById(
    "masterOverviewTeacherCoverageText",
  );
  const teacherCoverageBarEl = document.getElementById(
    "masterOverviewTeacherCoverageBar",
  );
  const classActivationTextEl = document.getElementById(
    "masterOverviewClassActivationText",
  );
  const classActivationBarEl = document.getElementById(
    "masterOverviewClassActivationBar",
  );
  const attendanceBacklogTextEl = document.getElementById(
    "masterOverviewAttendanceBacklogText",
  );
  const attendanceBacklogBarEl = document.getElementById(
    "masterOverviewAttendanceBacklogBar",
  );
  const topTeacherListEl = document.getElementById(
    "masterOverviewTopTeacherList",
  );
  const alertListEl = document.getElementById("masterOverviewAlertList");
  const actionQueueListEl = document.getElementById(
    "masterOverviewActionQueueList",
  );
  const securityPanel = document.getElementById("masterSecurityTelemetryPanel");
  const securityTotalEl = document.getElementById(
    "masterSecurityTelemetryTotal",
  );
  const securityActionListEl = document.getElementById(
    "masterSecurityTelemetryActionList",
  );
  const securityReasonListEl = document.getElementById(
    "masterSecurityTelemetryReasonList",
  );
  const securityDistinctActionsEl = document.getElementById(
    "masterSecurityTelemetryDistinctActions",
  );
  const securityDistinctReasonsEl = document.getElementById(
    "masterSecurityTelemetryDistinctReasons",
  );
  const securityRecentListEl = document.getElementById(
    "masterSecurityTelemetryRecentList",
  );
  const securityEmptyEl = document.getElementById(
    "masterSecurityTelemetryEmpty",
  );
  const securityClearBtn = document.getElementById(
    "btnMasterSecurityTelemetryClear",
  );

  if (!subjectsEl || !teachersEl || !studentsEl) return;

  subjectsEl.innerText = `${metrics.totals.subjects}`;
  teachersEl.innerText = `${metrics.totals.teachers}`;
  studentsEl.innerText = `${metrics.totals.students}`;

  if (classesEl) {
    classesEl.innerText = `${metrics.totals.classes}`;
  }

  if (accountsEl) {
    accountsEl.innerText = `${metrics.totals.accounts}`;
  }

  if (teacherAccountsEl) {
    teacherAccountsEl.innerText = `${metrics.totals.teacherAccounts}`;
  }

  if (schedulesWeekEl) {
    schedulesWeekEl.innerText = `${metrics.week.schedulesTotal}`;
  }

  if (pendingSchedulesWeekEl) {
    pendingSchedulesWeekEl.innerText = `${metrics.week.schedulesPending}`;
  }

  if (attendancePendingEl) {
    attendancePendingEl.innerText = `${metrics.attendanceRequests.pending}`;
  }

  if (weekLabelEl) {
    weekLabelEl.innerText = metrics.week.token || "Chưa chọn tuần";
  }

  const setProgressBarWidth = (element, value) => {
    if (!element) return;
    const percent = Math.max(0, Math.min(100, Number(value || 0)));
    element.style.width = `${percent}%`;
  };

  if (healthScoreEl) {
    healthScoreEl.innerText = `${metrics.health.score}`;
  }
  if (healthLevelEl) {
    healthLevelEl.innerText = metrics.health.level;
  }
  if (healthSummaryEl) {
    const pendingLabel = `${metrics.week.schedulesPending} lịch chờ duyệt`;
    const backlogLabel = `${metrics.attendanceRequests.overduePending} chấm công quá hạn`;
    healthSummaryEl.innerText = `Health score ${metrics.health.score}/100 • ${pendingLabel} • ${backlogLabel}.`;
  }
  if (healthChipEl) {
    const levelToken =
      metrics.health.score >= 85
        ? "stable"
        : metrics.health.score >= 70
          ? "watch"
          : metrics.health.score >= 50
            ? "warning"
            : "critical";
    healthChipEl.dataset.level = levelToken;
  }

  if (approvalProgressTextEl) {
    approvalProgressTextEl.innerText = `${metrics.week.schedulesApproved} duyệt • ${metrics.week.schedulesRejected} từ chối • ${metrics.week.schedulesPending} chờ duyệt`;
  }

  if (approvalProgressBarEl) {
    setProgressBarWidth(
      approvalProgressBarEl,
      metrics.week.approvalCompletionPercent,
    );
  }

  if (attendanceProgressTextEl) {
    attendanceProgressTextEl.innerText = `${metrics.week.approvedAttendancePresent} có mặt • ${metrics.week.approvedAttendanceAbsent} vắng • ${metrics.week.approvedAttendancePending} chưa chấm`;
  }

  if (attendanceProgressBarEl) {
    setProgressBarWidth(
      attendanceProgressBarEl,
      metrics.week.attendanceCompletionPercent,
    );
  }

  if (attendancePresentTextEl) {
    attendancePresentTextEl.innerText = `${Math.round(metrics.week.attendancePresentPercent)}% tỉ lệ có mặt trên số ca đã chấm`;
  }

  if (plannedHoursEl) {
    plannedHoursEl.innerText = `${formatHours(metrics.week.plannedHours)}`;
  }

  if (activeTeachersEl) {
    activeTeachersEl.innerText = `${metrics.week.activeTeachers}`;
  }

  if (activeClassesEl) {
    activeClassesEl.innerText = `${metrics.week.activeClasses}`;
  }

  if (teacherCoverageTextEl) {
    teacherCoverageTextEl.innerText = `${Math.round(metrics.coverage.teacherAccountCoveragePercent)}%`;
  }
  if (teacherCoverageBarEl) {
    setProgressBarWidth(
      teacherCoverageBarEl,
      metrics.coverage.teacherAccountCoveragePercent,
    );
  }

  if (classActivationTextEl) {
    classActivationTextEl.innerText = `${Math.round(metrics.coverage.classActivationPercent)}%`;
  }
  if (classActivationBarEl) {
    setProgressBarWidth(
      classActivationBarEl,
      metrics.coverage.classActivationPercent,
    );
  }

  if (attendanceBacklogTextEl) {
    attendanceBacklogTextEl.innerText = `${Math.round(metrics.attendanceRequests.backlogRatePercent)}%`;
  }
  if (attendanceBacklogBarEl) {
    setProgressBarWidth(
      attendanceBacklogBarEl,
      metrics.attendanceRequests.backlogRatePercent,
    );
  }

  if (topTeacherListEl) {
    topTeacherListEl.innerHTML =
      metrics.week.topTeachers.length > 0
        ? metrics.week.topTeachers
            .map((item, index) => {
              const teacherName = escapeHtml(
                getTeacherInfo(item.teacherId).name || item.teacherId,
              );
              return `<div class="rounded-lg border border-slate-200 bg-white px-2.5 py-2 flex items-center justify-between gap-2"><div class="min-w-0"><div class="text-xs font-bold text-slate-800 truncate">#${index + 1} ${teacherName}</div><div class="text-[11px] text-slate-500">${item.totalSessions} ca • ${formatHours(item.totalHours)}</div></div><span class="text-[10px] font-bold px-1.5 py-0.5 rounded border border-indigo-200 bg-indigo-50 text-indigo-700">Load</span></div>`;
            })
            .join("")
        : '<div class="text-[11px] text-slate-400 italic">Chưa có dữ liệu tải giảng dạy trong tuần đã chọn.</div>';
  }

  if (actionQueueListEl) {
    const actionClassBySeverity = {
      info: "border-cyan-200 bg-cyan-50/70 text-cyan-800",
      warning: "border-amber-200 bg-amber-50 text-amber-800",
      critical: "border-rose-200 bg-rose-50 text-rose-800",
    };
    actionQueueListEl.innerHTML = metrics.actions
      .map((actionItem) => {
        const rowClass =
          actionClassBySeverity[actionItem.severity] ||
          actionClassBySeverity.info;
        return `<div class="rounded-lg border px-2.5 py-2 ${rowClass}"><div class="text-[11px] font-bold">${escapeHtml(actionItem.title)}</div><div class="text-[11px] opacity-90 mt-0.5">${escapeHtml(actionItem.detail)}</div></div>`;
      })
      .join("");
  }

  if (alertListEl) {
    const alertClassBySeverity = {
      info: "border-cyan-200 bg-cyan-50/60 text-cyan-800",
      warning: "border-amber-200 bg-amber-50 text-amber-800",
      critical: "border-rose-200 bg-rose-50 text-rose-800",
    };
    alertListEl.innerHTML = metrics.alerts
      .map((alert) => {
        const rowClass =
          alertClassBySeverity[alert.severity] || alertClassBySeverity.info;
        return `<div class="rounded-lg border px-2.5 py-2 text-xs font-medium ${rowClass}">${escapeHtml(alert.message)}</div>`;
      })
      .join("");
  }

  if (
    !securityPanel ||
    !securityTotalEl ||
    !securityActionListEl ||
    !securityReasonListEl ||
    !securityRecentListEl ||
    !securityEmptyEl
  ) {
    return;
  }

  const canShowSecurityTelemetry =
    currentRole === "admin" && SECURITY_TELEMETRY_ENABLED;
  securityPanel.classList.toggle("hidden", !canShowSecurityTelemetry);
  if (!canShowSecurityTelemetry) {
    return;
  }

  if (securityClearBtn && securityClearBtn.dataset.boundClick !== "1") {
    securityClearBtn.addEventListener("click", () => {
      if (typeof globalThis.clearAccessDeniedEvents === "function") {
        globalThis.clearAccessDeniedEvents();
        renderMasterOverview();
      }
    });
    securityClearBtn.dataset.boundClick = "1";
  }

  const events =
    typeof globalThis.getAccessDeniedEvents === "function"
      ? globalThis.getAccessDeniedEvents()
      : [];

  securityTotalEl.innerText = `${events.length}`;
  if (securityDistinctActionsEl) {
    securityDistinctActionsEl.innerText = `${metrics.security.denyDistinctActions}`;
  }
  if (securityDistinctReasonsEl) {
    securityDistinctReasonsEl.innerText = `${metrics.security.denyDistinctReasons}`;
  }

  const toTopCountRows = (items, keyName) => {
    const grouped = new Map();
    (items || []).forEach((item) => {
      const key = toToken(item?.[keyName]) || "unknown";
      grouped.set(key, Number(grouped.get(key) || 0) + 1);
    });

    return Array.from(grouped.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5);
  };

  const actionRows = toTopCountRows(events, "action");
  securityActionListEl.innerHTML =
    actionRows.length > 0
      ? actionRows
          .map(
            ([action, count]) =>
              `<div class="flex items-center justify-between gap-2"><span class="text-[11px] text-slate-700 truncate">${escapeHtml(action)}</span><span class="text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700">${count}</span></div>`,
          )
          .join("")
      : '<div class="text-[11px] text-slate-400 italic">Chưa có dữ liệu.</div>';

  const reasonRows = toTopCountRows(events, "reason");
  securityReasonListEl.innerHTML =
    reasonRows.length > 0
      ? reasonRows
          .map(
            ([reason, count]) =>
              `<div class="flex items-center justify-between gap-2"><span class="text-[11px] text-slate-700 truncate">${escapeHtml(reason)}</span><span class="text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700">${count}</span></div>`,
          )
          .join("")
      : '<div class="text-[11px] text-slate-400 italic">Chưa có dữ liệu.</div>';

  const recentRows = [...events]
    .sort((left, right) => Number(right?.at || 0) - Number(left?.at || 0))
    .slice(0, 8);

  securityRecentListEl.innerHTML =
    recentRows.length > 0
      ? recentRows
          .map((eventItem) => {
            const action = escapeHtml(
              toToken(eventItem?.action) || "unknown_action",
            );
            const reason = escapeHtml(
              toToken(eventItem?.reason) || "unspecified",
            );
            const resourceType = escapeHtml(
              toToken(eventItem?.resourceType) || "unknown_resource",
            );
            const resourceId = escapeHtml(
              toToken(eventItem?.resourceId) || "-",
            );
            const role = escapeHtml(toToken(eventItem?.role) || "guest");
            const atLabel = Number.isFinite(Number(eventItem?.at || 0))
              ? new Date(Number(eventItem.at)).toLocaleString("vi-VN")
              : "N/A";
            return `<div class="rounded-lg border border-slate-200 bg-white px-2.5 py-2"><div class="text-[11px] font-bold text-slate-800 truncate">${action}</div><div class="text-[10px] text-slate-500 mt-0.5">${reason} • role: ${role}</div><div class="text-[10px] text-slate-500">${resourceType}: ${resourceId}</div><div class="text-[10px] text-slate-400 mt-0.5">${escapeHtml(atLabel)}</div></div>`;
          })
          .join("")
      : "";

  securityEmptyEl.classList.toggle("hidden", recentRows.length > 0);
};

const syncStatusUI = {
  panel: document.getElementById("syncStatusPanel"),
  dot: document.getElementById("syncStatusDot"),
  title: document.getElementById("syncStatusTitle"),
  detail: document.getElementById("syncStatusDetail"),
};

const updateSyncStatus = (status, title, detail) => {
  if (!syncStatusUI.panel) return;
  const dotClassMap = {
    loading: "bg-amber-500 animate-pulse",
    live: "bg-emerald-500",
    syncing: "bg-indigo-500 animate-pulse",
    cache: "bg-slate-400",
    offline: "bg-rose-500",
    error: "bg-red-500",
    idle: "bg-slate-300",
  };
  const normalizedTitle = String(title || "").trim();
  const normalizedDetail = String(detail || "").trim();
  const hasTitle = normalizedTitle.length > 0;
  const hasDetail = normalizedDetail.length > 0;
  syncStatusUI.dot.className = `w-2.5 h-2.5 rounded-full ${dotClassMap[status] || dotClassMap.idle}`;
  if (syncStatusUI.title) {
    syncStatusUI.title.innerText = normalizedTitle;
    syncStatusUI.title.classList.toggle("hidden", !hasTitle);
  }
  if (syncStatusUI.detail) {
    syncStatusUI.detail.innerText = normalizedDetail;
    syncStatusUI.detail.classList.toggle("hidden", !hasDetail);
  }
};

const recomputeSyncStatus = () => {
  const metas = Object.values(syncState.collectionMeta);
  const loadedCount = syncState.loadedCollections.size;
  const total = DATA_COLLECTIONS.length;

  if (!navigator.onLine) {
    updateSyncStatus(
      "offline",
      "Mất kết nối Internet",
      "Đang dùng dữ liệu cache cục bộ. Sẽ tự đồng bộ khi có mạng.",
    );
    return;
  }

  if (!isDataLoaded) {
    updateSyncStatus(
      "loading",
      `Đang tải dữ liệu (${loadedCount}/${total})`,
      "Hệ thống đang đồng bộ dữ liệu ban đầu từ Cloud.",
    );
    return;
  }

  const hasError = metas.some((m) => m.error);
  if (hasError) {
    const errCount = metas.filter((m) => m.error).length;
    updateSyncStatus(
      "error",
      "Đồng bộ gặp lỗi",
      `${errCount} bảng dữ liệu đang lỗi. Hệ thống sẽ tự thử lại.`,
    );
    return;
  }

  const hasPendingWrites = metas.some((m) => m.hasPendingWrites);
  if (hasPendingWrites) {
    updateSyncStatus(
      "syncing",
      "Đang đồng bộ thay đổi",
      "Dữ liệu mới đang được gửi lên Cloud...",
    );
    return;
  }

  const allFromCache = metas.length > 0 && metas.every((m) => m.fromCache);
  if (allFromCache) {
    updateSyncStatus(
      "cache",
      "Đang hiển thị cache",
      "Kết nối server chưa ổn định. Dữ liệu có thể chưa mới nhất.",
    );
    return;
  }

  updateSyncStatus("live", "", "");
};

const toastContainer = document.getElementById("toastContainer");
const showToast = (message, type = "info", duration = 3600) => {
  if (!toastContainer || !message) return;
  const typeStyles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    info: "border-slate-200 bg-white text-slate-800",
  };
  const toast = document.createElement("div");
  toast.className = `toast-item border rounded-xl shadow-sm px-3 py-2.5 text-sm leading-relaxed ${typeStyles[type] || typeStyles.info}`;
  toast.innerText = String(message);
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-out");
    setTimeout(() => {
      toast.remove();
    }, 220);
  }, duration);
};

let dialogResolver = null;
const appDialog = {
  root: document.getElementById("appDialog"),
  panel: document.getElementById("appDialogPanel"),
  title: document.getElementById("appDialogTitle"),
  message: document.getElementById("appDialogMessage"),
  inputWrap: document.getElementById("appDialogInputWrap"),
  input: document.getElementById("appDialogInput"),
  selectWrap: document.getElementById("appDialogSelectWrap"),
  select: document.getElementById("appDialogSelect"),
  btnCancel: document.getElementById("appDialogCancel"),
  btnConfirm: document.getElementById("appDialogConfirm"),
};

const MODAL_LAYER_BASE_Z_INDEX = 160;
const MODAL_LAYER_STRIDE = 1000;
let modalLayerStep = 0;
let dialogModalServiceInstanceSeq = 0;

const modalViewportLockState = {
  owners: new Set(),
  count: 0,
  bodyOverflow: "",
  bodyPaddingRight: "",
  bodyTouchAction: "",
  htmlOverflow: "",
};

const lockModalViewport = (ownerId) => {
  if (!ownerId || modalViewportLockState.owners.has(ownerId)) return;

  modalViewportLockState.owners.add(ownerId);
  modalViewportLockState.count += 1;
  if (modalViewportLockState.count > 1) return;

  const body = document.body;
  const html = document.documentElement;
  if (!body || !html) return;

  modalViewportLockState.bodyOverflow = body.style.overflow;
  modalViewportLockState.bodyPaddingRight = body.style.paddingRight;
  modalViewportLockState.bodyTouchAction = body.style.touchAction;
  modalViewportLockState.htmlOverflow = html.style.overflow;

  const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth);
  body.style.overflow = "hidden";
  body.style.touchAction = "none";
  html.style.overflow = "hidden";
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }
};

const unlockModalViewport = (ownerId) => {
  if (!ownerId || !modalViewportLockState.owners.has(ownerId)) return;

  modalViewportLockState.owners.delete(ownerId);
  modalViewportLockState.count = Math.max(0, modalViewportLockState.count - 1);
  if (modalViewportLockState.count > 0) return;

  const body = document.body;
  const html = document.documentElement;
  if (!body || !html) return;

  body.style.overflow = modalViewportLockState.bodyOverflow;
  body.style.paddingRight = modalViewportLockState.bodyPaddingRight;
  body.style.touchAction = modalViewportLockState.bodyTouchAction;
  html.style.overflow = modalViewportLockState.htmlOverflow;
};

const raiseModalToFront = (modalRoot, baseZ = MODAL_LAYER_BASE_Z_INDEX) => {
  if (!modalRoot?.style) return;

  const parsedBase = Number.parseInt(String(baseZ || ""), 10);
  const safeBase = Number.isFinite(parsedBase)
    ? parsedBase
    : MODAL_LAYER_BASE_Z_INDEX;

  // Keep modal roots at the end of <body> to avoid parent stacking-context traps.
  if (modalRoot.parentElement !== document.body) {
    document.body.appendChild(modalRoot);
  }

  // Newer modal must always be above older ones, independent of base z-index.
  modalLayerStep += 1;
  modalRoot.style.zIndex = String(
    modalLayerStep * MODAL_LAYER_STRIDE + safeBase,
  );
};

globalThis.raiseModalToFront = raiseModalToFront;

class DialogModalService {
  constructor({ root, panel, baseZ = MODAL_LAYER_BASE_Z_INDEX }) {
    this.root = root;
    this.panel = panel;
    this.baseZ = baseZ;
    this.instanceId = `dialog-modal-${++dialogModalServiceInstanceSeq}`;
    this.lastFocusedEl = null;
    this.dismissHandler = null;
    this.isProgrammaticClose = false;
    this.isOpen = false;
    this.isFallbackEscBound = false;
    this.handleFallbackEscape = (event) => {
      if (event.key !== "Escape") return;
      if (!this.isOpen || this.canUseNative()) return;
      if (!this.isTopMostOpenDialog()) return;

      event.preventDefault();
      event.stopPropagation();
      this.handleDismiss();
    };
    this.bindEvents();
  }

  isTopMostOpenDialog() {
    if (!this.root) return false;
    const openDialogs = Array.from(document.querySelectorAll("dialog[open]"));
    if (openDialogs.length === 0) return false;
    return openDialogs.at(-1) === this.root;
  }

  bindFallbackEscape() {
    if (this.isFallbackEscBound) return;
    document.addEventListener("keydown", this.handleFallbackEscape, true);
    this.isFallbackEscBound = true;
  }

  unbindFallbackEscape() {
    if (!this.isFallbackEscBound) return;
    document.removeEventListener("keydown", this.handleFallbackEscape, true);
    this.isFallbackEscBound = false;
  }

  canUseNative() {
    return (
      typeof HTMLDialogElement !== "undefined" &&
      this.root instanceof HTMLDialogElement &&
      typeof this.root.showModal === "function"
    );
  }

  setDismissHandler(handler) {
    this.dismissHandler = typeof handler === "function" ? handler : null;
  }

  captureFocus() {
    if (document.activeElement instanceof HTMLElement) {
      this.lastFocusedEl = document.activeElement;
    } else {
      this.lastFocusedEl = null;
    }
  }

  restoreFocus() {
    if (!this.lastFocusedEl?.isConnected) return;
    try {
      this.lastFocusedEl.focus({ preventScroll: true });
    } catch {
      // Ignore focus restore failures on detached/disabled elements.
    }
  }

  handleDismiss() {
    if (typeof this.dismissHandler === "function") {
      this.dismissHandler();
    }
  }

  show() {
    if (!this.root) return;

    this.captureFocus();
    this.unbindFallbackEscape();

    if (this.canUseNative()) {
      if (this.root.open) {
        this.close({ skipDismiss: true, skipRestoreFocus: true });
      }

      try {
        raiseModalToFront(this.root, this.baseZ);
        this.root.showModal();
        this.isOpen = true;
        lockModalViewport(this.instanceId);
        return;
      } catch (error) {
        console.warn(
          "Không thể mở modal bằng <dialog>, fallback về open attribute:",
          error,
        );
      }
    }

    raiseModalToFront(this.root, this.baseZ);
    this.root.setAttribute("open", "open");
    this.isOpen = true;
    this.bindFallbackEscape();
    lockModalViewport(this.instanceId);
  }

  close({ skipDismiss = false, skipRestoreFocus = false } = {}) {
    if (!this.root) return;

    if (this.canUseNative()) {
      if (this.root.open) {
        this.isProgrammaticClose = true;
        this.root.close();
        this.isProgrammaticClose = false;
      }
    } else {
      this.root.removeAttribute("open");
    }

    this.isOpen = false;
    this.unbindFallbackEscape();
    unlockModalViewport(this.instanceId);

    if (!skipRestoreFocus) {
      this.restoreFocus();
    }

    if (!skipDismiss) {
      this.handleDismiss();
    }
  }

  bindEvents() {
    if (!this.root) return;

    this.root.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.handleDismiss();
    });

    this.root.addEventListener("close", () => {
      if (this.isProgrammaticClose) return;
      this.handleDismiss();
    });

    this.root.addEventListener("click", (event) => {
      if (event.target !== this.root) return;

      const panelEl = this.panel;
      if (!panelEl) {
        this.handleDismiss();
        return;
      }

      const bounds = panelEl.getBoundingClientRect();
      const clickedOutsidePanel =
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom;

      if (clickedOutsidePanel) {
        this.handleDismiss();
      }
    });
  }
}

let dialogMode = "confirm";
const appDialogService = new DialogModalService({
  root: appDialog.root,
  panel: appDialog.panel,
  baseZ: 160,
});

const resolveDialogResult = (result) => {
  if (!dialogResolver) return;
  const resolve = dialogResolver;
  dialogResolver = null;
  resolve(result);
};

const closeDialog = (result) => {
  if (!appDialog.root) return;

  resolveDialogResult(result);
  appDialogService.close({ skipDismiss: true });
  if (appDialog.inputWrap) appDialog.inputWrap.classList.add("hidden");
  if (appDialog.selectWrap) appDialog.selectWrap.classList.add("hidden");
};

appDialogService.setDismissHandler(() => {
  if (!dialogResolver) return;
  closeDialog(getDialogCancelValue());
});

const getDialogCancelValue = () => (dialogMode === "confirm" ? false : null);

const normalizeDialogOptions = (options) =>
  Array.isArray(options) ? options : [];

const resolveDialogFallback = ({
  resolve,
  mode,
  message,
  defaultValue,
  options,
}) => {
  if (mode === "prompt") {
    resolve(globalThis.prompt(message, defaultValue));
    return;
  }

  if (mode === "select") {
    const normalizedOptions = normalizeDialogOptions(options);
    const fallbackValue =
      defaultValue || String(normalizedOptions[0]?.value || "");
    resolve(globalThis.prompt(message, fallbackValue));
    return;
  }

  resolve(globalThis.confirm(message));
};

const renderPromptDialogFields = (defaultValue) => {
  appDialog.inputWrap?.classList.remove("hidden");
  appDialog.selectWrap?.classList.add("hidden");
  if (appDialog.input) {
    appDialog.input.value = defaultValue || "";
    setTimeout(() => appDialog.input?.focus(), 20);
  }
};

const renderSelectDialogFields = (defaultValue, options) => {
  appDialog.inputWrap?.classList.add("hidden");
  appDialog.selectWrap?.classList.remove("hidden");
  if (!appDialog.select) return;

  const normalizedOptions = normalizeDialogOptions(options);
  appDialog.select.innerHTML = "";
  normalizedOptions.forEach((option) => {
    const optionEl = document.createElement("option");
    optionEl.value = String(option?.value || "");
    optionEl.textContent = String(option?.label || option?.value || "");
    appDialog.select.appendChild(optionEl);
  });

  const safeDefault = String(defaultValue || "");
  const hasDefault = normalizedOptions.some(
    (option) => String(option?.value || "") === safeDefault,
  );
  appDialog.select.value = hasDefault
    ? safeDefault
    : String(normalizedOptions[0]?.value || "");
  setTimeout(() => appDialog.select?.focus(), 20);
};

const renderConfirmDialogFields = () => {
  appDialog.inputWrap?.classList.add("hidden");
  appDialog.selectWrap?.classList.add("hidden");
  if (appDialog.input) appDialog.input.value = "";
  if (appDialog.select) appDialog.select.innerHTML = "";
};

const openDialog = ({
  message,
  title = "Xác nhận thao tác",
  mode = "confirm",
  defaultValue = "",
  confirmText = "Đồng ý",
  options = [],
} = {}) =>
  new Promise((resolve) => {
    if (!appDialog.root) {
      resolveDialogFallback({
        resolve,
        mode,
        message,
        defaultValue,
        options,
      });
      return;
    }

    dialogMode = mode;
    appDialog.title.innerText = title;
    appDialog.message.innerText = message;
    appDialog.btnConfirm.innerText = confirmText;

    if (mode === "prompt") {
      renderPromptDialogFields(defaultValue);
    } else if (mode === "select") {
      renderSelectDialogFields(defaultValue, options);
    } else {
      renderConfirmDialogFields();
    }

    if (dialogResolver) {
      closeDialog(getDialogCancelValue());
    }

    dialogResolver = resolve;
    appDialogService.show();
  });

globalThis.appConfirm = (message, title = "Xác nhận thao tác") =>
  openDialog({ message, title, mode: "confirm", confirmText: "Đồng ý" });

globalThis.appPrompt = (title, message, defaultValue = "") =>
  openDialog({
    title,
    message,
    mode: "prompt",
    defaultValue,
    confirmText: "Lưu",
  });

globalThis.appSelect = (
  title,
  message,
  options = [],
  defaultValue = "",
  confirmText = "Chọn",
) =>
  openDialog({
    title,
    message,
    mode: "select",
    options,
    defaultValue,
    confirmText,
  });

const formModalState = {
  resolve: null,
  onSubmit: null,
  isSubmitting: false,
  submitText: "Lưu",
  activeSessionId: 0,
};

const resolveFormModalResult = (result) => {
  if (!formModalState.resolve) return;
  const resolve = formModalState.resolve;
  formModalState.resolve = null;
  resolve(result);
};

const getFormModalRefs = (() => {
  let refs = null;

  return () => {
    if (refs) return refs;

    const root = document.createElement("dialog");
    root.id = "appFormModal";
    root.className = "app-form-dialog-shell";
    root.innerHTML = `
      <div id="appFormModalPanel" class="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[92vh]">
        <div class="px-4 sm:px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h3 id="appFormModalTitle" class="text-base font-bold text-slate-800">Biểu mẫu</h3>
            <p id="appFormModalDescription" class="text-[11px] text-slate-500 mt-1"></p>
          </div>
          <button type="button" id="appFormModalClose" class="text-slate-400 hover:text-slate-700 text-xl leading-none">&times;</button>
        </div>

        <form id="appFormModalForm" class="flex-1 min-h-0 flex flex-col">
          <div id="appFormModalBody" class="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-3"></div>
          <div class="px-3 sm:px-4 py-3 border-t border-slate-200 bg-white flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
            <button type="button" id="appFormModalCancel" class="w-full sm:w-auto px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium">Hủy</button>
            <button type="submit" id="appFormModalSubmit" class="w-full sm:w-auto px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold">Lưu</button>
          </div>
        </form>
      </div>`;

    document.body.appendChild(root);

    refs = {
      root,
      panel: root.querySelector("#appFormModalPanel"),
      title: root.querySelector("#appFormModalTitle"),
      description: root.querySelector("#appFormModalDescription"),
      closeBtn: root.querySelector("#appFormModalClose"),
      form: root.querySelector("#appFormModalForm"),
      body: root.querySelector("#appFormModalBody"),
      cancelBtn: root.querySelector("#appFormModalCancel"),
      submitBtn: root.querySelector("#appFormModalSubmit"),
    };

    const modalService = new DialogModalService({
      root: refs.root,
      panel: refs.panel,
      baseZ: 165,
    });

    refs.modalService = modalService;

    const isSessionActive = (sessionId) =>
      Number(sessionId) === Number(formModalState.activeSessionId);

    const setSubmitting = (
      isSubmitting,
      sessionId = formModalState.activeSessionId,
    ) => {
      if (!isSessionActive(sessionId)) return;

      formModalState.isSubmitting = !!isSubmitting;
      if (refs.submitBtn) {
        refs.submitBtn.disabled = !!isSubmitting;
        refs.submitBtn.innerText = isSubmitting
          ? "Đang lưu..."
          : formModalState.submitText || "Lưu";
        refs.submitBtn.classList.toggle("opacity-70", !!isSubmitting);
        refs.submitBtn.classList.toggle("cursor-not-allowed", !!isSubmitting);
      }
      if (refs.cancelBtn) {
        refs.cancelBtn.disabled = !!isSubmitting;
        refs.cancelBtn.classList.toggle("opacity-70", !!isSubmitting);
        refs.cancelBtn.classList.toggle("cursor-not-allowed", !!isSubmitting);
      }
      if (refs.closeBtn) {
        refs.closeBtn.disabled = !!isSubmitting;
        refs.closeBtn.classList.toggle("opacity-70", !!isSubmitting);
        refs.closeBtn.classList.toggle("cursor-not-allowed", !!isSubmitting);
      }
    };

    const close = (result, sessionId = formModalState.activeSessionId) => {
      if (!isSessionActive(sessionId)) return false;
      if (formModalState.isSubmitting) return;
      setSubmitting(false, sessionId);
      formModalState.onSubmit = null;
      resolveFormModalResult(result);
      refs.modalService.close({ skipDismiss: true });
      return true;
    };

    refs.modalService.setDismissHandler(() => {
      if (!formModalState.resolve) return;
      if (formModalState.isSubmitting) return;
      close(null);
    });

    refs.closeBtn?.addEventListener("click", () => close(null));
    refs.cancelBtn?.addEventListener("click", () => close(null));

    refs.form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (formModalState.isSubmitting) return;
      const submitSessionId = formModalState.activeSessionId;

      const values = Object.fromEntries(new FormData(refs.form).entries());
      const closeFromSubmit = (result) => close(result, submitSessionId);
      setSubmitting(true, submitSessionId);

      try {
        if (typeof formModalState.onSubmit === "function") {
          const nextValue = await formModalState.onSubmit({
            form: refs.form,
            values,
            close: closeFromSubmit,
          });
          if (!isSessionActive(submitSessionId)) {
            return;
          }
          if (nextValue === false) {
            setSubmitting(false, submitSessionId);
            return;
          }
          setSubmitting(false, submitSessionId);
          close(nextValue ?? values, submitSessionId);
          return;
        }

        if (!isSessionActive(submitSessionId)) {
          return;
        }
        setSubmitting(false, submitSessionId);
        close(values, submitSessionId);
      } catch (error) {
        if (!isSessionActive(submitSessionId)) {
          return;
        }
        setSubmitting(false, submitSessionId);
        console.error("appFormModal submit error:", error);
        alert("Không thể lưu dữ liệu. Vui lòng thử lại.");
      }
    });

    return refs;
  };
})();

globalThis.appFormModal = ({
  title = "Biểu mẫu",
  description = "",
  submitText = "Lưu",
  size = "md",
  bodyHtml = "",
  onOpen,
  onSubmit,
} = {}) => {
  const refs = getFormModalRefs();
  const sessionId = formModalState.activeSessionId + 1;
  formModalState.activeSessionId = sessionId;
  const sizeMap = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  refs.panel.className =
    "bg-white w-full rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[92vh] " +
    (sizeMap[size] || sizeMap.md);
  refs.title.innerText = title;
  refs.description.innerText = description || "";
  refs.submitBtn.innerText = submitText;
  refs.body.innerHTML = bodyHtml;
  formModalState.submitText = submitText;
  formModalState.isSubmitting = false;
  refs.submitBtn.disabled = false;
  refs.cancelBtn.disabled = false;
  refs.closeBtn.disabled = false;
  refs.submitBtn.classList.remove("opacity-70", "cursor-not-allowed");
  refs.cancelBtn.classList.remove("opacity-70", "cursor-not-allowed");
  refs.closeBtn.classList.remove("opacity-70", "cursor-not-allowed");

  if (formModalState.resolve) {
    formModalState.onSubmit = null;
    formModalState.isSubmitting = false;
    resolveFormModalResult(null);
    refs.modalService.close({ skipDismiss: true, skipRestoreFocus: true });
  }

  refs.modalService.show();

  const firstInput = refs.body.querySelector(
    "input, select, textarea, button:not([type='button'])",
  );
  if (firstInput && typeof firstInput.focus === "function") {
    setTimeout(() => firstInput.focus(), 20);
  }

  if (typeof onOpen === "function") {
    onOpen({ form: refs.form, body: refs.body, panel: refs.panel });
  }

  return new Promise((resolve) => {
    formModalState.resolve = resolve;
    formModalState.onSubmit = onSubmit;
  });
};

globalThis.dismissAppFormModal = () => {
  if (!formModalState.resolve || formModalState.isSubmitting) {
    return false;
  }

  formModalState.onSubmit = null;
  formModalState.isSubmitting = false;
  resolveFormModalResult(null);

  const refs = getFormModalRefs();
  refs.modalService.close({ skipDismiss: true, skipRestoreFocus: true });
  return true;
};

appDialog.btnCancel?.addEventListener("click", () => {
  closeDialog(getDialogCancelValue());
});
appDialog.btnConfirm?.addEventListener("click", () => {
  if (dialogMode === "prompt") {
    closeDialog(appDialog.input?.value ?? "");
    return;
  }
  if (dialogMode === "select") {
    closeDialog(appDialog.select?.value ?? "");
    return;
  }
  closeDialog(true);
});
appDialog.input?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    closeDialog(appDialog.input?.value ?? "");
  }
});
appDialog.select?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    closeDialog(appDialog.select?.value ?? "");
  }
});

globalThis.alert = (message) => {
  showToast(message || "Có thông báo mới", "warning", 4200);
};

globalThis.addEventListener("online", () => {
  showToast("Đã có kết nối Internet. Hệ thống đang đồng bộ lại.", "success");
  recomputeSyncStatus();
});
globalThis.addEventListener("offline", () => {
  showToast("Mất kết nối Internet. Chế độ cache đã được bật.", "warning", 5000);
  recomputeSyncStatus();
});

const showLoginError = (message) => {
  const errorBox = document.getElementById("loginError");
  document.getElementById("loginErrorText").innerText = message;
  errorBox.classList.remove("hidden");
  showToast(message, "error", 5200);
};

// BƯỚC 1: LẮNG NGHE ĐỒNG BỘ DỮ LIỆU
const setupRealtimeSync = () => {
  const collections = DATA_COLLECTIONS;

  const switchToAlternatePathAndRetry = () => {
    if (!isCanvasEnv) return false;
    if (hasRetriedAlternateDataPath) return false;
    hasRetriedAlternateDataPath = true;
    activeDataPathMode = activeDataPathMode === "root" ? "canvas" : "root";
    showToast(
      "Không tìm thấy dữ liệu ở nguồn hiện tại, đang thử nguồn đồng bộ dự phòng...",
      "warning",
      5200,
    );
    setupRealtimeSync();
    return true;
  };

  if (globalThis.unsubscribes?.length) {
    globalThis.unsubscribes.forEach((u) => {
      try {
        u();
      } catch (error) {
        console.warn("Không thể hủy listener cũ:", error);
      }
    });
  }

  syncState.loadedCollections = new Set();
  syncState.collectionMeta = {};
  syncErrorNotified.clear();
  updateSyncStatus(
    "loading",
    `Đang tải dữ liệu (0/${collections.length})`,
    "Khởi tạo đồng bộ realtime từ Firebase.",
  );

  if (syncState.initialLoadTimer) {
    clearTimeout(syncState.initialLoadTimer);
  }

  // Tránh treo overlay khi một collection gặp lỗi quyền/truy cập.
  syncState.initialLoadTimer = setTimeout(() => {
    if (!isDataLoaded) {
      const metas = Object.values(syncState.collectionMeta);
      const totalLoadedDocs = metas.reduce(
        (sum, meta) => sum + Number(meta?.docCount || 0),
        0,
      );
      const hasAnyServerSnapshot = metas.some(
        (meta) => meta?.fromCache === false,
      );

      if (
        !hasAnyServerSnapshot &&
        totalLoadedDocs === 0 &&
        switchToAlternatePathAndRetry()
      ) {
        return;
      }
      isDataLoaded = true;
      document.getElementById("loadingOverlay").classList.add("hidden");
      showToast(
        "Mất nhiều thời gian để tải toàn bộ dữ liệu. Hệ thống đã vào chế độ xem tạm thời và sẽ tự đồng bộ tiếp.",
        "warning",
        6500,
      );
      checkAuthAndMapRole(auth.currentUser);
      recomputeSyncStatus();
    }
  }, 10000);

  globalThis.unsubscribes = [];

  collections.forEach((colName) => {
    const unsub = onSnapshot(
      getColRef(colName),
      { includeMetadataChanges: true },
      (snapshot) => {
        const wasCollectionLoaded = syncState.loadedCollections.has(colName);
        const hasDocumentDataChanges = snapshot.docChanges().length > 0;
        const shouldRefreshCollectionData =
          hasDocumentDataChanges || !wasCollectionLoaded;

        if (shouldRefreshCollectionData) {
          globalThis.db[colName] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          bumpDataRevision(colName);
        }

        syncState.collectionMeta[colName] = {
          fromCache: snapshot.metadata.fromCache,
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
          docCount: snapshot.size,
          updatedAt: Date.now(),
          error: null,
        };

        syncState.loadedCollections.add(colName);
        if (isDataLoaded) {
          if (hasDocumentDataChanges) {
            requestRenderAll();
          }
        } else if (syncState.loadedCollections.size === collections.length) {
          const totalLoadedDocs = Object.values(
            syncState.collectionMeta,
          ).reduce((sum, meta) => sum + Number(meta?.docCount || 0), 0);
          const hasAnyServerSnapshot = Object.values(
            syncState.collectionMeta,
          ).some((meta) => meta?.fromCache === false);

          // Đợt snapshot đầu có thể chỉ là cache rỗng; chờ thêm server snapshot hoặc timeout.
          if (!hasAnyServerSnapshot && totalLoadedDocs === 0) {
            recomputeSyncStatus();
            return;
          }

          isDataLoaded = true;
          if (syncState.initialLoadTimer) {
            clearTimeout(syncState.initialLoadTimer);
            syncState.initialLoadTimer = null;
          }
          document.getElementById("loadingOverlay").classList.add("hidden");
          showToast(
            "Kết nối dữ liệu thành công. Đã bật đồng bộ realtime.",
            "success",
            2600,
          );
          checkAuthAndMapRole(auth.currentUser);
        }
        recomputeSyncStatus();
      },
      (error) => {
        console.error(`Lỗi đồng bộ ${colName}:`, error);
        syncState.collectionMeta[colName] = {
          fromCache: true,
          hasPendingWrites: false,
          docCount: 0,
          updatedAt: Date.now(),
          error: error?.code || "sync-error",
        };
        syncState.loadedCollections.add(colName);

        if (!syncErrorNotified.has(colName)) {
          syncErrorNotified.add(colName);
          showToast(
            `Bảng ${colName} đang lỗi đồng bộ (${error?.code || "unknown"}). Hệ thống sẽ tự thử lại.`,
            "error",
            6200,
          );
        }

        if (
          !isDataLoaded &&
          syncState.loadedCollections.size === collections.length
        ) {
          isDataLoaded = true;
          if (syncState.initialLoadTimer) {
            clearTimeout(syncState.initialLoadTimer);
            syncState.initialLoadTimer = null;
          }
          document.getElementById("loadingOverlay").classList.add("hidden");
          checkAuthAndMapRole(auth.currentUser);
        }

        recomputeSyncStatus();
      },
    );

    globalThis.unsubscribes.push(unsub);
  });
};

// BƯỚC 2: KHỞI TẠO QUY TRÌNH
const initApp = async () => {
  if (isCanvasEnv) {
    try {
      if (typeof __initial_auth_token !== "undefined" && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    } catch (e) {
      console.error("Lỗi Auth Canvas:", e);
    }
  }

  onAuthStateChanged(auth, (user) => {
    if (user) {
      if (isDataLoaded) checkAuthAndMapRole(user);
      else setupRealtimeSync();
    } else {
      if (globalThis.unsubscribes) {
        globalThis.unsubscribes.forEach((u) => u());
        globalThis.unsubscribes = [];
      }
      isDataLoaded = false;
      currentUser = null;
      currentRole = null;
      syncAccessContextState();
      accessDeniedEvents = [];
      lastAccessDeniedEvent = null;
      syncState.loadedCollections = new Set();
      syncState.collectionMeta = {};
      if (syncState.initialLoadTimer) {
        clearTimeout(syncState.initialLoadTimer);
        syncState.initialLoadTimer = null;
      }
      syncErrorNotified.clear();
      updateSyncStatus(
        "idle",
        "Chưa đăng nhập",
        "Đăng nhập Google để bắt đầu đồng bộ dữ liệu.",
      );

      document.getElementById("loadingOverlay").classList.add("hidden");
      const loginOverlay = document.getElementById("loginOverlay");
      loginOverlay.classList.remove("hidden");
      setTimeout(() => {
        loginOverlay.style.opacity = "1";
        document.getElementById("loginBox").classList.remove("scale-95");
        document.getElementById("loginBox").classList.add("scale-100");
      }, 50);

      const btn = document.getElementById("btnGoogleLogin");
      btn.innerHTML = `
                        <svg class="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 15.02 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        Đăng nhập bằng Google
                    `;
      btn.disabled = false;

      if (pendingLoginError) {
        showLoginError(pendingLoginError);
        pendingLoginError = "";
      } else {
        document.getElementById("loginError").classList.add("hidden");
      }
      document.getElementById("mainBody").classList.add("overflow-hidden");
    }
  });
};

// BƯỚC 3: MAPPING QUYỀN HẠN
const checkAuthAndMapRole = async (user) => {
  if (!user) return;

  const loginEmail = normalizeEmail(user.email);
  if (!loginEmail) {
    reportAccessDenied({
      action: "auth.signin",
      reason: "missing_login_email",
      resourceType: "auth_session",
      resourceId: toToken(user?.uid),
      details: {
        provider: "google",
      },
      roleOverride: "guest",
      userIdOverride: toToken(user?.uid),
    });
    pendingLoginError =
      "Không lấy được email từ tài khoản Google. Vui lòng dùng tài khoản Gmail hợp lệ.";
    await signOut(auth);
    return;
  }

  const adminAccount = globalThis.db.accounts.find(
    (a) =>
      normalizeEmail(a.email) === loginEmail &&
      a.role === "admin" &&
      a.active !== false,
  );
  const teacherAccount = globalThis.db.accounts.find(
    (a) =>
      normalizeEmail(a.email) === loginEmail &&
      a.role === "teacher" &&
      a.active !== false,
  );
  const parentAccount = globalThis.db.accounts.find(
    (a) =>
      normalizeEmail(a.email) === loginEmail &&
      a.role === "parent" &&
      a.active !== false,
  );

  if (loginEmail === ADMIN_EMAIL || adminAccount) {
    currentUser = {
      id: user.uid,
      name: adminAccount?.name || user.displayName || "Quản trị viên",
      email: loginEmail,
    };
    currentRole = "admin";
  } else if (teacherAccount) {
    const tea = globalThis.db.teachers.find(
      (t) => normalizeEmail(t.email) === loginEmail,
    );
    currentUser = tea || {
      id: teacherAccount.teacherId || user.uid,
      name: teacherAccount.name || user.displayName || "Giáo viên",
      email: loginEmail,
      phone: "",
    };
    currentRole = "teacher";
  } else if (parentAccount) {
    const parentId = getParentIdFromAccount({
      account: parentAccount,
      user,
      loginEmail,
    });
    const linkedStudentIds = uniqTokens([
      ...getParentStudentIdsByParentId(parentId),
      ...(Array.isArray(parentAccount.studentIds)
        ? parentAccount.studentIds
        : []),
      parentAccount.studentId,
    ]);

    if (!parentId || linkedStudentIds.length === 0) {
      reportAccessDenied({
        action: "auth.signin",
        reason: "parent_account_without_linked_students",
        resourceType: "parent_account",
        resourceId:
          toToken(parentAccount.id) ||
          parentId ||
          normalizeEmail(parentAccount.email),
        details: {
          linkedStudentCount: linkedStudentIds.length,
          loginEmail,
        },
        roleOverride: "parent",
        userIdOverride: parentId || toToken(parentAccount.id) || loginEmail,
      });
      pendingLoginError =
        "Tai khoan phu huynh chua duoc lien ket hoc sinh. Vui long lien he admin de cau hinh.";
      await signOut(auth);
      return;
    }

    currentUser = {
      id: parentId,
      name: parentAccount.name || user.displayName || "Phụ huynh",
      email: loginEmail,
      studentIds: linkedStudentIds,
      parentAccountId: toToken(parentAccount.id),
    };
    currentRole = "parent";
  } else {
    reportAccessDenied({
      action: "auth.signin",
      reason: "account_not_granted",
      resourceType: "account",
      resourceId: loginEmail,
      details: {
        loginEmail,
      },
      roleOverride: "guest",
      userIdOverride: toToken(user?.uid),
    });
    pendingLoginError =
      "Email chưa được cấp quyền truy cập. Vui lòng liên hệ admin để cấp ở mục 5 - Tài khoản đăng nhập.";
    await signOut(auth);
    return;
  }

  syncAccessContextState();

  document.getElementById("headerUserName").innerText = currentUser.name;
  const badge = document.getElementById("headerRoleBadge");
  if (currentRole === "admin") {
    badge.innerText = "Admin";
    badge.className =
      "text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100";
  } else if (currentRole === "teacher") {
    badge.innerText = "Teacher";
    badge.className =
      "text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100";
  } else {
    badge.innerText = "Parent";
    badge.className =
      "text-[10px] font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-100";
  }

  const loginOverlay = document.getElementById("loginOverlay");
  loginOverlay.style.opacity = "0";
  setTimeout(() => {
    loginOverlay.classList.add("hidden");
    document.getElementById("mainBody").classList.remove("overflow-hidden");
  }, 300);

  applyRBAC();
  // Trigger a full, throttled render once user role is resolved.
  requestRenderAll();
  globalThis.switchTab("board");
};

registerAuthHandlers({ auth, showToast });

// --- CÁC HÀM CRUD CLOUD ---
const ALLOWED_TABLES = new Set([
  "subjects",
  "teachers",
  "students",
  "classes",
  "schedules",
  "accounts",
  "attendanceRequests",
  "settings",
]);

const canTeacherWriteAttendanceRequest = (payload) => {
  const ownerTeacherId = String(payload?.teacherId || "");
  if (!ownerTeacherId || ownerTeacherId !== String(currentUser?.id || "")) {
    return false;
  }

  const existing = globalThis.db.attendanceRequests.find(
    (item) => String(item.id) === String(payload?.id || ""),
  );

  const dateToken = String(payload?.attendanceDate || "").trim();
  const checkIn = String(payload?.checkInTime || "").trim();
  const checkOut = String(payload?.checkOutTime || "").trim();
  const workedMinutes = Number(payload?.workedMinutes || 0);
  const createdAt = Number(payload?.createdAt || 0);
  const note = String(payload?.note || "").trim();
  const reviewNote = String(payload?.reviewNote || "").trim();

  if (
    payload?.submittedAtServer ||
    payload?.reviewedAtServer ||
    payload?.updatedAtServer
  ) {
    return false;
  }

  if (String(payload?.status || "") !== "pending") return false;
  if (payload?.reviewedBy || payload?.reviewedAt || reviewNote) return false;
  if (!isIsoDateToken(dateToken)) return false;
  if (note.length > 1000) return false;
  if (
    !Number.isFinite(createdAt) ||
    createdAt <= 0 ||
    createdAt > Date.now() + 5 * 60 * 1000
  ) {
    return false;
  }

  if (
    String(payload?.id || "") !==
    buildAttendanceRequestId(ownerTeacherId, dateToken)
  ) {
    return false;
  }

  const computedWorkedMinutes = computeWorkedMinutes(checkIn, checkOut);
  if (computedWorkedMinutes === null) {
    return false;
  }
  if (
    !Number.isFinite(workedMinutes) ||
    workedMinutes <= 0 ||
    workedMinutes > ATTENDANCE_MAX_WORKED_MINUTES ||
    workedMinutes !== computedWorkedMinutes
  ) {
    return false;
  }

  if (existing) {
    const isSafeRejectedResubmission =
      String(existing.teacherId || "") === ownerTeacherId &&
      String(existing.attendanceDate || "") === dateToken &&
      String(existing.status || "") === "rejected";
    if (!isSafeRejectedResubmission) return false;
  }

  const hasDuplicateActiveRecord = globalThis.db.attendanceRequests.some(
    (item) =>
      String(item.id || "") !== String(existing?.id || "") &&
      String(item.teacherId || "") === ownerTeacherId &&
      String(item.attendanceDate || "") === dateToken &&
      ["pending", "approved"].includes(String(item.status || "pending")),
  );
  if (hasDuplicateActiveRecord) return false;

  return true;
};

const hasMatchingFields = (payload, source, fields) =>
  fields.every(
    (field) =>
      JSON.stringify(payload?.[field]) === JSON.stringify(source?.[field]),
  );

const PENDING_PROTECTED_SCHEDULE_FIELDS = [
  "week",
  "dayOfWeek",
  "startTime",
  "endTime",
  "location",
  "classId",
  "classLabel",
  "studentIds",
  "subjectId",
  "topic",
  "attendance",
  "evaluations",
];

const APPROVED_PROTECTED_SCHEDULE_FIELDS = [
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

const canTeacherCreatePendingSchedule = (payload, currentTeacherId) =>
  payload?.approval?.status === "pending" &&
  String(payload?.teacherId || "") === currentTeacherId;

const canTeacherUpdatePendingSchedule = (
  payload,
  existingSchedule,
  currentTeacherId,
) => {
  if (
    !hasMatchingFields(
      payload,
      existingSchedule,
      PENDING_PROTECTED_SCHEDULE_FIELDS,
    )
  ) {
    return false;
  }

  const existingTeacherIds = getScheduleTeacherIds(existingSchedule);
  const payloadTeacherIds = getScheduleTeacherIds(payload);
  const hasRemovedTeacher = existingTeacherIds.some(
    (teacherId) => !payloadTeacherIds.includes(teacherId),
  );
  if (hasRemovedTeacher) return false;

  const wasAssignedBefore = existingTeacherIds.includes(currentTeacherId);
  return wasAssignedBefore || payloadTeacherIds.includes(currentTeacherId);
};

const canTeacherUpdateApprovedSchedule = (
  payload,
  existingSchedule,
  nextApprovalStatus,
) => {
  if (
    getScheduleApprovalStatus(existingSchedule) !== "approved" ||
    nextApprovalStatus !== "approved"
  ) {
    return false;
  }

  const existingApproval = existingSchedule?.approval || {};
  const payloadApproval = payload?.approval || {};
  const isReviewMetaUnchanged =
    String(existingApproval.requestType || "") ===
      String(payloadApproval.requestType || "") &&
    String(existingApproval.reviewedBy || "") ===
      String(payloadApproval.reviewedBy || "") &&
    Number(existingApproval.reviewedAt || 0) ===
      Number(payloadApproval.reviewedAt || 0);

  if (!isReviewMetaUnchanged) return false;

  return hasMatchingFields(
    payload,
    existingSchedule,
    APPROVED_PROTECTED_SCHEDULE_FIELDS,
  );
};

const canTeacherWriteSchedule = (payload, currentTeacherId) => {
  const isOwner = getScheduleTeacherIds(payload).includes(currentTeacherId);
  if (!isOwner) return false;

  const existingSchedule = globalThis.db.schedules.find(
    (s) => s.id === payload?.id,
  );

  if (!existingSchedule) {
    return canTeacherCreatePendingSchedule(payload, currentTeacherId);
  }

  const nextApprovalStatus = getScheduleApprovalStatus(payload);
  if (nextApprovalStatus === "pending") {
    return canTeacherUpdatePendingSchedule(
      payload,
      existingSchedule,
      currentTeacherId,
    );
  }

  return canTeacherUpdateApprovedSchedule(
    payload,
    existingSchedule,
    nextApprovalStatus,
  );
};

const canWriteTable = (table, payload) => {
  if (currentRole === "admin") return true;
  if (currentRole !== "teacher") return false;
  if (table === "attendanceRequests") {
    return canTeacherWriteAttendanceRequest(payload);
  }
  if (table !== "schedules") return false;

  const currentTeacherId = String(currentUser?.id || "");
  return canTeacherWriteSchedule(payload, currentTeacherId);
};

globalThis.cloudSave = async (table, data) => {
  try {
    if (!ALLOWED_TABLES.has(table)) {
      throw new Error(`Bảng không hợp lệ: ${table}`);
    }

    const sanitized = sanitizeForStorage(data);
    if (!sanitized || typeof sanitized !== "object") {
      throw new Error("Payload dữ liệu không hợp lệ.");
    }

    const recordId = String(sanitized.id || "");
    if (!isSafeDocId(recordId)) {
      throw new Error("ID dữ liệu không hợp lệ.");
    }
    if (!canWriteTable(table, sanitized)) {
      throw new Error("Bạn không có quyền ghi dữ liệu này.");
    }

    let payloadForSave = sanitized;
    if (table === "attendanceRequests") {
      const status = String(sanitized?.status || "").trim();
      if (status === "pending") {
        payloadForSave = {
          ...sanitized,
          submittedAtServer: serverTimestamp(),
          updatedAtServer: serverTimestamp(),
        };
      } else if (status === "approved" || status === "rejected") {
        payloadForSave = {
          ...sanitized,
          reviewedAtServer: serverTimestamp(),
          updatedAtServer: serverTimestamp(),
        };
      }
    }

    await setDoc(doc(getColRef(table), recordId), payloadForSave);
  } catch (e) {
    console.error("Lỗi lưu:", e);
    showToast(
      "Lưu dữ liệu thất bại. Vui lòng kiểm tra kết nối và thử lại.",
      "error",
    );
  }
};

globalThis.cloudDelete = async (table, id) => {
  try {
    if (!ALLOWED_TABLES.has(table)) {
      throw new Error(`Bảng không hợp lệ: ${table}`);
    }
    if (currentRole !== "admin") {
      throw new Error("Bạn không có quyền xóa dữ liệu.");
    }
    if (!isSafeDocId(String(id || ""))) {
      throw new Error("ID dữ liệu không hợp lệ.");
    }
    await deleteDoc(doc(getColRef(table), id));
  } catch (e) {
    console.error("Lỗi xóa:", e);
    showToast("Xóa dữ liệu thất bại. Vui lòng thử lại.", "error");
  }
};

// --- GIAO DIỆN & LOGIC UI ---
const colorStyles = {
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  rose: "bg-rose-100 text-rose-800 border-rose-200",
  emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  purple: "bg-purple-100 text-purple-800 border-purple-200",
  cyan: "bg-cyan-100 text-cyan-800 border-cyan-200",
};
const dotColors = {
  blue: "bg-blue-500",
  rose: "bg-rose-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  purple: "bg-purple-500",
  cyan: "bg-cyan-500",
};

// --- RENDER LOGIC ---
const SUBJECT_DELETED_INFO = Object.freeze({
  name: "Môn đã xóa",
  color: "slate",
});
const TEACHER_DELETED_INFO = Object.freeze({
  name: "GV đã xóa",
  phone: "",
  email: "",
});
const STUDENT_DELETED_INFO = Object.freeze({
  name: "HS đã xóa",
  parentPhone: "",
});

const getSubjectInfo = (id) =>
  getCollectionIndexById("subjects").get(String(id || "").trim()) ||
  SUBJECT_DELETED_INFO;
const getTeacherInfo = (id) =>
  getCollectionIndexById("teachers").get(String(id || "").trim()) ||
  TEACHER_DELETED_INFO;
const getStudentInfo = (id) =>
  getCollectionIndexById("students").get(String(id || "").trim()) ||
  STUDENT_DELETED_INFO;
const getClassInfo = (id) => getSelectableClassById(id);

const getClassStudentIdsForAccess = (classId) => {
  const cls = getClassInfo(classId);
  if (!Array.isArray(cls?.studentIds)) return [];
  return uniqTokens(cls.studentIds);
};

const canCurrentUserAccessSchedule = (schedule) => {
  if (currentRole === "admin") return true;

  if (currentRole === "teacher") {
    return isTeacherAssignedToSchedule(schedule, currentUser?.id);
  }

  if (currentRole === "parent") {
    return canParentAccessSchedule({
      schedule,
      parentStudentIds: getCurrentParentStudentIds(),
      resolveClassStudentIds: getClassStudentIdsForAccess,
    });
  }

  return false;
};

// --- FORMS SUBMIT LOGIC ---
const attendanceFeature = registerAttendanceFeature({
  getCurrentRole: () => currentRole,
  getCurrentUser: () => currentUser,
  canCurrentUserAccessSchedule,
  getCurrentParentStudentIds,
  showToast,
});

const renderCore = registerRenderCore({
  colorStyles,
  dotColors,
  normalizeEmail,
  ADMIN_EMAIL,
  isFixedAdmin,
  getCurrentRole: () => currentRole,
  getCurrentUser: () => currentUser,
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
  getAttendancePeriodSelection: attendanceFeature.getAttendancePeriodSelection,
  getAttendancePeriodLabel: attendanceFeature.getAttendancePeriodLabel,
  getAttendanceDashboardData: attendanceFeature.getAttendanceDashboardData,
  formatWorkedMinutes: attendanceFeature.formatWorkedMinutes,
  getBoardTeacherAttendanceSummary:
    attendanceFeature.getBoardTeacherAttendanceSummary,
  canCurrentUserAccessSchedule,
  getCurrentParentStudentIds,
  reportAccessDenied,
  isParentDashboardFeatureEnabled: () => PARENT_DASHBOARD_FEATURE_ENABLED,
});

applyRBAC = renderCore.applyRBAC;
renderSchedules = renderCore.renderSchedules;
renderAttendance = renderCore.renderAttendance;
renderAll = renderCore.renderAll;

registerSubjectForm();

registerTeacherActions({
  ADMIN_EMAIL,
  normalizeEmail,
  isFixedAdmin,
  getCurrentRole: () => currentRole,
  getCurrentUser: () => currentUser,
});
registerTeacherForms({
  ADMIN_EMAIL,
  normalizeEmail,
  isFixedAdmin,
  getCurrentRole: () => currentRole,
});
registerStudentAndClassForms();

registerScheduleActions({
  getCurrentRole: () => currentRole,
  getCurrentUser: () => currentUser,
});
registerScheduleFormsAndFilters({
  getCurrentRole: () => currentRole,
  getCurrentUser: () => currentUser,
  renderSchedules,
  renderMasterOverview,
  renderAttendance,
});

registerDataManagement({
  ADMIN_EMAIL,
  normalizeEmail,
  isFixedAdmin,
  getCurrentRole: () => currentRole,
  getCurrentUser: () => currentUser,
  canCurrentUserAccessSchedule,
  getCurrentParentStudentIds,
  reportAccessDenied,
  getSubjectInfo,
  getStudentInfo,
  getClassInfo,
  parseEvaluationRecord,
});

registerReportingExports({
  showToast,
  getSelectedWeek,
  getAttendanceWeekSchedules,
  getSelectableClasses,
  getTeacherInfo,
  getClassInfo,
  getSubjectInfo,
  getStudentInfo,
  getAttendanceStatusMeta,
  formatDayOfWeek,
  getDurationHours,
  formatHours,
  getLatestStudentEvaluation,
  getEvalLevelMeta,
  getWeekAttendanceOverview,
  getAttendancePeriodSelection: attendanceFeature.getAttendancePeriodSelection,
  getAttendanceDashboardData: attendanceFeature.getAttendanceDashboardData,
  getAttendancePeriodLabel: attendanceFeature.getAttendancePeriodLabel,
  formatWorkedMinutes: attendanceFeature.formatWorkedMinutes,
});

// INIT
const getCurrentWeekDefault = () => {
  const isoWeek = toIsoWeekTokenFromDate(new Date());
  if (isoWeek) return isoWeek;

  const now = new Date();
  const fallbackWeek = Math.max(1, Math.min(53, Math.ceil(now.getDate() / 7)));
  return `${now.getFullYear()}-W${String(fallbackWeek).padStart(2, "0")}`;
};

const getCurrentMonthDefault = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const getCurrentDateDefault = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const currentWeekDefault = getCurrentWeekDefault();
const scheduleWeekInput = document.getElementById("sch_week");
if (scheduleWeekInput) {
  scheduleWeekInput.value = currentWeekDefault;
}
const filterWeekInput = document.getElementById("filterWeek");
if (filterWeekInput) {
  filterWeekInput.value = currentWeekDefault;
}
const attendanceWeekInput = document.getElementById("attendanceWeek");
if (attendanceWeekInput) {
  attendanceWeekInput.value = currentWeekDefault;
}
if (document.getElementById("attendanceMonth")) {
  document.getElementById("attendanceMonth").value = getCurrentMonthDefault();
}
if (document.getElementById("attendanceDate")) {
  document.getElementById("attendanceDate").value = getCurrentDateDefault();
}
if (document.getElementById("attendancePeriod")) {
  document.getElementById("attendancePeriod").value = "day";
}

recomputeSyncStatus();

initApp(); // Khởi chạy ứng dụng và lắng nghe đăng nhập
