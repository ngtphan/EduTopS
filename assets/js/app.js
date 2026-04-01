import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
// NHẬP THÊM MODULE GOOGLE AUTH PROVIDER
import {
  getAuth,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { registerAuthHandlers } from "./modules/auth.js";
import {
  registerTeacherActions,
  registerTeacherForms,
} from "./modules/teacher-management.js";
import { registerStudentAndClassForms } from "./modules/student-management.js";
import {
  registerScheduleActions,
  registerScheduleFormsAndFilters,
} from "./modules/schedule-management.js";
import { registerRenderCore } from "./modules/render-core.js";
import { registerDataManagement } from "./modules/data-management.js";
import { registerSubjectForm } from "./modules/subject-management.js";
import { registerReportingExports } from "./modules/reporting.js";
import {
  ATTENDANCE_MAX_WORKED_MINUTES,
  buildAttendanceRequestId,
  computeWorkedMinutes,
  isIsoDateToken,
  registerAttendanceFeature,
} from "./modules/features/attendance/attendance-feature.js";
import { sanitizeForStorage, isSafeDocId } from "./modules/security-utils.js";

const APP_VERSION = "v1.7.0";

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
    ["loadingOverlayHost", "./src/partials/overlays/loading-overlay.html"],
    ["loginOverlayHost", "./src/partials/overlays/login-overlay.html"],
    ["headerHost", "./src/partials/layout/header.html"],
    ["viewBoardHost", "./src/partials/views/view-board.html"],
    ["viewFormHost", "./src/partials/views/view-form.html"],
    ["viewMasterHost", "./src/partials/views/view-master.html"],
    ["viewAttendanceHost", "./src/partials/views/view-attendance.html"],
    ["evalModalHost", "./src/partials/modals/eval-modal.html"],
    ["syncStatusHost", "./src/partials/layout/sync-status-panel.html"],
    ["toastContainerHost", "./src/partials/layout/toast-container.html"],
    ["appDialogHost", "./src/partials/layout/app-dialog.html"],
  ];

  await Promise.all(
    partials.map(([hostId, filePath]) => injectPartial(hostId, filePath)),
  );
};

try {
  await mountLayoutPartials();
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
// CẤU HÌNH FIREBASE CHÍNH THỨC CỦA BẠN (EDUTOPS)
// -------------------------------------------------------------
const fallbackFirebaseConfig = {
  apiKey: "AIzaSyCQyeYypgYspNtJK5dYv7TNGtX80engR2U",
  authDomain: "edutops-8f3ac.firebaseapp.com",
  projectId: "edutops-8f3ac",
  storageBucket: "edutops-8f3ac.firebasestorage.app",
  messagingSenderId: "955439571406",
  appId: "1:955439571406:web:47acd32eac072d9fa68b9f",
  measurementId: "G-R7W8X9R46Q",
};

let firebaseConfig = fallbackFirebaseConfig;
let appId = "edutops-app";
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

const ADMIN_EMAIL = "ngoctaiphan.edu@gmail.com";
const normalizeEmail = (email) => (email || "").trim().toLowerCase();
const isFixedAdmin = () =>
  normalizeEmail(currentUser?.email) === normalizeEmail(ADMIN_EMAIL);

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
};

const parseEvaluationRecord = (raw) => {
  if (!raw) return null;
  if (typeof raw === "string") {
    const note = raw.trim();
    return note ? { level: "fair", note } : null;
  }
  if (typeof raw === "object" && raw.level) {
    return { level: raw.level, note: raw.note || "" };
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
  const weekFromAttendance = document.getElementById("attendanceWeek")?.value;
  const weekFromBoard = document.getElementById("filterWeek")?.value;
  return weekFromAttendance || weekFromBoard || "";
};

const formatDayOfWeek = (dayOfWeek) =>
  String(dayOfWeek) === "8" ? "Chủ nhật" : `Thứ ${dayOfWeek}`;

const getAttendanceStatusMeta = (status) => {
  if (status === "present") return { label: "Có mặt", sort: 1 };
  if (status === "absent") return { label: "Vắng", sort: 2 };
  return { label: "Chưa chấm", sort: 3 };
};

const getScheduleApprovalStatus = (schedule) => {
  const status = schedule?.approval?.status;
  if (status === "pending" || status === "rejected" || status === "approved") {
    return status;
  }
  return "approved";
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
    if (!grouped.has(gradeLevel)) grouped.set(gradeLevel, []);
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
  return globalThis.db.classes;
};

const getAttendanceWeekSchedules = (week) =>
  globalThis.db.schedules
    .filter(
      (s) => s.week === week && getScheduleApprovalStatus(s) === "approved",
    )
    .sort((a, b) => {
      const dayDiff = Number(a.dayOfWeek) - Number(b.dayOfWeek);
      if (dayDiff !== 0) return dayDiff;
      return String(a.startTime || "").localeCompare(String(b.startTime || ""));
    });

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
  const subjectsEl = document.getElementById("masterStatSubjects");
  const teachersEl = document.getElementById("masterStatTeachers");
  const studentsEl = document.getElementById("masterStatStudents");
  const schedulesWeekEl = document.getElementById("masterStatSchedulesWeek");

  if (!subjectsEl || !teachersEl || !studentsEl) return;

  subjectsEl.innerText = `${globalThis.db.subjects.length}`;
  teachersEl.innerText = `${globalThis.db.teachers.length}`;
  studentsEl.innerText = `${globalThis.db.students.length}`;

  if (schedulesWeekEl) {
    const weekCount = week
      ? globalThis.db.schedules.filter((s) => s.week === week).length
      : 0;
    schedulesWeekEl.innerText = `${weekCount}`;
  }
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
  title: document.getElementById("appDialogTitle"),
  message: document.getElementById("appDialogMessage"),
  inputWrap: document.getElementById("appDialogInputWrap"),
  input: document.getElementById("appDialogInput"),
  selectWrap: document.getElementById("appDialogSelectWrap"),
  select: document.getElementById("appDialogSelect"),
  btnCancel: document.getElementById("appDialogCancel"),
  btnConfirm: document.getElementById("appDialogConfirm"),
};

let dialogMode = "confirm";

const closeDialog = (result) => {
  if (!appDialog.root) return;
  appDialog.root.classList.add("hidden");
  appDialog.root.classList.remove("flex");
  if (appDialog.inputWrap) appDialog.inputWrap.classList.add("hidden");
  if (appDialog.selectWrap) appDialog.selectWrap.classList.add("hidden");
  if (dialogResolver) {
    dialogResolver(result);
    dialogResolver = null;
  }
};

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

    appDialog.root.classList.remove("hidden");
    appDialog.root.classList.add("flex");
    dialogResolver = resolve;
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
};

const getFormModalRefs = (() => {
  let refs = null;

  return () => {
    if (refs) return refs;

    const root = document.createElement("div");
    root.id = "appFormModal";
    root.className =
      "fixed inset-0 z-[165] hidden items-center justify-center p-4 bg-slate-900/50";
    root.innerHTML = `
      <div id="appFormModalPanel" class="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div class="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h3 id="appFormModalTitle" class="text-base font-bold text-slate-800">Biểu mẫu</h3>
            <p id="appFormModalDescription" class="text-[11px] text-slate-500 mt-1"></p>
          </div>
          <button type="button" id="appFormModalClose" class="text-slate-400 hover:text-slate-700 text-xl leading-none">&times;</button>
        </div>

        <form id="appFormModalForm" class="flex-1 min-h-0 flex flex-col">
          <div id="appFormModalBody" class="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-3"></div>
          <div class="px-4 py-3 border-t border-slate-200 bg-white flex items-center justify-end gap-2 shrink-0">
            <button type="button" id="appFormModalCancel" class="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium">Hủy</button>
            <button type="submit" id="appFormModalSubmit" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold">Lưu</button>
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

    const setSubmitting = (isSubmitting) => {
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

    const close = (result) => {
      if (formModalState.isSubmitting) return;
      setSubmitting(false);
      refs.root.classList.add("hidden");
      refs.root.classList.remove("flex");
      if (formModalState.resolve) {
        formModalState.resolve(result);
        formModalState.resolve = null;
      }
      formModalState.onSubmit = null;
    };

    refs.closeBtn?.addEventListener("click", () => close(null));
    refs.cancelBtn?.addEventListener("click", () => close(null));
    refs.root?.addEventListener("click", (event) => {
      if (event.target === refs.root) close(null);
    });

    refs.form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (formModalState.isSubmitting) return;

      const values = Object.fromEntries(new FormData(refs.form).entries());
      setSubmitting(true);

      try {
        if (typeof formModalState.onSubmit === "function") {
          const nextValue = await formModalState.onSubmit({
            form: refs.form,
            values,
            close,
          });
          if (nextValue === false) {
            setSubmitting(false);
            return;
          }
          setSubmitting(false);
          close(nextValue ?? values);
          return;
        }

        setSubmitting(false);
        close(values);
      } catch (error) {
        setSubmitting(false);
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
  const sizeMap = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  refs.panel.className =
    "bg-white w-full rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] " +
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

  refs.root.classList.remove("hidden");
  refs.root.classList.add("flex");

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
appDialog.root?.addEventListener("click", (e) => {
  if (e.target === appDialog.root) closeDialog(getDialogCancelValue());
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
        globalThis.db[colName] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        syncState.collectionMeta[colName] = {
          fromCache: snapshot.metadata.fromCache,
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
          docCount: snapshot.size,
          updatedAt: Date.now(),
          error: null,
        };

        syncState.loadedCollections.add(colName);
        if (isDataLoaded) {
          requestRenderAll();
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

  if (loginEmail === ADMIN_EMAIL || adminAccount) {
    currentUser = {
      id: user.uid,
      name: adminAccount?.name || user.displayName || "Quản trị viên",
      email: loginEmail,
    };
    currentRole = "admin";
  } else {
    const account = globalThis.db.accounts.find(
      (a) =>
        normalizeEmail(a.email) === loginEmail &&
        a.role === "teacher" &&
        a.active !== false,
    );
    if (!account) {
      pendingLoginError =
        "Email chưa được cấp quyền truy cập. Vui lòng liên hệ admin để cấp ở mục 5 - Tài khoản đăng nhập.";
      await signOut(auth);
      return;
    }

    const tea = globalThis.db.teachers.find(
      (t) => normalizeEmail(t.email) === loginEmail,
    );
    currentUser = tea || {
      id: account.teacherId || user.uid,
      name: account.name || user.displayName || "Giáo viên",
      email: loginEmail,
      phone: "",
    };
    currentRole = "teacher";
  }

  document.getElementById("headerUserName").innerText = currentUser.name;
  const badge = document.getElementById("headerRoleBadge");
  if (currentRole === "admin") {
    badge.innerText = "Admin";
    badge.className =
      "text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100";
  } else {
    badge.innerText = "Teacher";
    badge.className =
      "text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100";
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

const canWriteTable = (table, payload) => {
  if (currentRole === "admin") return true;
  if (currentRole !== "teacher") return false;
  if (table === "attendanceRequests") {
    return canTeacherWriteAttendanceRequest(payload);
  }
  if (table !== "schedules") return false;

  const scheduleTeacherId = String(payload?.teacherId || "");
  const isOwner =
    scheduleTeacherId && scheduleTeacherId === String(currentUser?.id || "");
  if (!isOwner) return false;

  const existingSchedule = globalThis.db.schedules.find(
    (s) => s.id === payload?.id,
  );
  if (!existingSchedule) {
    // Giáo viên tạo mới phải đi qua luồng chờ duyệt.
    return payload?.approval?.status === "pending";
  }

  const nextApprovalStatus = getScheduleApprovalStatus(payload);
  if (nextApprovalStatus === "pending") {
    // Cho phép giáo viên gửi yêu cầu chỉnh sửa/tạo lịch chờ admin duyệt.
    return true;
  }

  // Lịch đã duyệt: giáo viên chỉ được cập nhật đánh giá (không sửa thông tin vận hành).
  if (
    getScheduleApprovalStatus(existingSchedule) !== "approved" ||
    nextApprovalStatus !== "approved"
  ) {
    return false;
  }

  const existingApproval = existingSchedule?.approval || {};
  const payloadApproval = payload?.approval || {};
  if (
    String(existingApproval.requestType || "") !==
      String(payloadApproval.requestType || "") ||
    String(existingApproval.reviewedBy || "") !==
      String(payloadApproval.reviewedBy || "") ||
    Number(existingApproval.reviewedAt || 0) !==
      Number(payloadApproval.reviewedAt || 0)
  ) {
    return false;
  }

  const protectedFields = [
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
    "topic",
  ];

  return protectedFields.every(
    (field) =>
      JSON.stringify(payload?.[field]) ===
      JSON.stringify(existingSchedule?.[field]),
  );
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
const getSubjectInfo = (id) =>
  globalThis.db.subjects.find((s) => s.id === id) || {
    name: "Môn đã xóa",
    color: "slate",
  };
const getTeacherInfo = (id) =>
  globalThis.db.teachers.find((t) => t.id === id) || {
    name: "GV đã xóa",
    phone: "",
    email: "",
  };
const getStudentInfo = (id) =>
  globalThis.db.students.find((s) => s.id === id) || {
    name: "HS đã xóa",
    parentPhone: "",
  };
const getClassInfo = (id) =>
  getSelectableClasses().find((c) => String(c.id) === String(id));

// --- FORMS SUBMIT LOGIC ---
const attendanceFeature = registerAttendanceFeature({
  getCurrentRole: () => currentRole,
  getCurrentUser: () => currentUser,
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
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), 0, 1);
  return `${now.getFullYear()}-W${Math.ceil(
    ((now - firstDay) / 86400000 + firstDay.getDay() + 1) / 7,
  )
    .toString()
    .padStart(2, "0")}`;
};

const getCurrentMonthDefault = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const getCurrentDateDefault = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

document.getElementById("sch_week").value = getCurrentWeekDefault();
document.getElementById("filterWeek").value = getCurrentWeekDefault();
document.getElementById("attendanceWeek").value = getCurrentWeekDefault();
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
