import { normalizeScheduleApprovalStatus } from "@/entities/schedule/model/approval";
import { isTeacherAssignedToSchedule } from "@/entities/schedule/model/teacher-assignment";
import {
  normalizeWeekToken,
  toIsoWeekTokenFromDateToken,
} from "@/shared/lib/week-token";

const FIXED_ATTENDANCE_QR_TOKEN = "EDUTOPS_FIXED_ATTENDANCE_QR_V1";
const QR_SCANNER_LIB_URLS = [
  "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js",
  "https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js",
];
const QR_IMAGE_API_URL = "https://api.qrserver.com/v1/create-qr-code/";
const ATTENDANCE_QR_CONFIG_ID = "attendance_qr_config";
const ATTENDANCE_QR_PAYLOAD_TYPE = "edutops_attendance_qr";
const ATTENDANCE_QR_PAYLOAD_VERSION = "json_v1";

const DAY_MS = 24 * 60 * 60 * 1000;
export const ATTENDANCE_MAX_WORKED_MINUTES = 16 * 60;

const pad2 = (value) => String(value).padStart(2, "0");

const toDateToken = (date = new Date()) => {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
};

const toTimeToken = (date = new Date()) => {
  const hour = pad2(date.getHours());
  const minute = pad2(date.getMinutes());
  return `${hour}:${minute}`;
};

const addMinutesToTimeToken = (timeToken, minutesToAdd = 0) => {
  const minutes = parseTimeToMinutes(timeToken);
  if (minutes === null) return "";
  const next = Math.max(0, minutes + Number(minutesToAdd || 0));
  return `${pad2(Math.floor(next / 60) % 24)}:${pad2(next % 60)}`;
};

export const parseTimeToMinutes = (timeToken) => {
  const raw = String(timeToken || "").trim();
  if (!/^\d{2}:\d{2}$/.test(raw)) return null;
  const [hour, minute] = raw.split(":").map(Number);
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return hour * 60 + minute;
};

export const buildAttendanceRequestId = (teacherId, attendanceDate) => {
  const safeTeacherId = String(teacherId || "")
    .trim()
    .replaceAll(/[^a-zA-Z0-9_-]+/g, "_");
  const safeDate = String(attendanceDate || "").trim();
  return `attreq_${safeTeacherId}_${safeDate}`;
};

export const computeWorkedMinutes = (checkInTime, checkOutTime) => {
  const inMinutes = parseTimeToMinutes(checkInTime);
  const outMinutes = parseTimeToMinutes(checkOutTime);
  if (inMinutes === null || outMinutes === null) return null;
  const diff = outMinutes - inMinutes;
  if (diff <= 0) return null;
  if (diff > ATTENDANCE_MAX_WORKED_MINUTES) return null;
  return diff;
};

const formatWorkedMinutes = (minutes) => {
  const normalized = Number(minutes || 0);
  if (!Number.isFinite(normalized) || normalized <= 0) return "0h";
  const hours = normalized / 60;
  if (Math.abs(hours - Math.round(hours)) < 0.001) {
    return `${Math.round(hours)}h`;
  }
  return `${hours.toFixed(1)}h`;
};

const createAttendanceQrToken = () => {
  const randomPart = globalThis.crypto?.randomUUID
    ? globalThis.crypto
        .randomUUID()
        .replaceAll(/[^a-zA-Z0-9]/g, "")
        .slice(0, 18)
        .toUpperCase()
    : `${Math.random()}${Date.now()}`
        .replaceAll(/[^a-zA-Z0-9]/g, "")
        .slice(0, 18)
        .toUpperCase();

  const timestampPart = Date.now().toString(36).toUpperCase();
  return `EDUTOPS_ATT_${timestampPart}_${randomPart}`;
};

const getAttendanceQrConfigRecord = () => {
  const raw = (globalThis.db.settings || []).find(
    (item) => String(item.id || "") === ATTENDANCE_QR_CONFIG_ID,
  );
  if (!raw) return null;

  const token = String(raw.token || "").trim();
  if (!token) return null;

  return {
    id: ATTENDANCE_QR_CONFIG_ID,
    token,
    payloadVersion:
      String(raw.payloadVersion || "").trim() || ATTENDANCE_QR_PAYLOAD_VERSION,
    updatedAt: Number(raw.updatedAt || 0),
    updatedBy: String(raw.updatedBy || "").trim(),
    updatedByName: String(raw.updatedByName || "").trim(),
  };
};

const getActiveAttendanceQrToken = () => {
  const config = getAttendanceQrConfigRecord();
  if (config?.token) return config.token;
  return FIXED_ATTENDANCE_QR_TOKEN;
};

const getAttendanceQrPayload = (token = getActiveAttendanceQrToken()) =>
  JSON.stringify({
    type: ATTENDANCE_QR_PAYLOAD_TYPE,
    token: String(token || "").trim(),
    version: ATTENDANCE_QR_PAYLOAD_VERSION,
  });

const getAttendanceQrImageUrl = (payload) => {
  const data = encodeURIComponent(String(payload || ""));
  return `${QR_IMAGE_API_URL}?size=300x300&data=${data}`;
};

const copyTextToClipboard = async (text) => {
  const value = String(text || "").trim();
  if (!value) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    return false;
  }

  return false;
};

const extractTokenFromJsonPayload = (raw) => {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return "";

    const type = String(parsed.type || "").trim();
    const token = String(
      parsed.token || parsed.qrToken || parsed.value || "",
    ).trim();

    if (type && type !== ATTENDANCE_QR_PAYLOAD_TYPE) return "";
    return token;
  } catch {
    return "";
  }
};

const extractTokenFromUrlPayload = (raw) => {
  try {
    if (!/^(https?:\/\/|edutops:\/\/)/i.test(raw)) return "";
    const url = new URL(raw);
    return String(
      url.searchParams.get("token") ||
        url.searchParams.get("qr") ||
        url.searchParams.get("value") ||
        "",
    ).trim();
  } catch {
    return "";
  }
};

const extractTokenFromQueryStringPayload = (raw) => {
  if (!/^\w+=/.test(raw)) return "";
  const params = new URLSearchParams(raw.replaceAll(";", "&"));
  return String(
    params.get("token") || params.get("qr") || params.get("value") || "",
  ).trim();
};

const parseFixedAttendanceQrPayload = (rawPayload) => {
  const raw = String(rawPayload || "").trim();
  if (!raw) return { isValid: false, raw };

  const activeToken = getActiveAttendanceQrToken();
  const isTokenMatch = (token) => String(token || "").trim() === activeToken;

  const matchedSource = [
    { source: "token", token: raw },
    { source: "json", token: extractTokenFromJsonPayload(raw) },
    { source: "url", token: extractTokenFromUrlPayload(raw) },
    { source: "params", token: extractTokenFromQueryStringPayload(raw) },
  ].find((candidate) => isTokenMatch(candidate.token));

  if (matchedSource) {
    return { isValid: true, source: matchedSource.source, raw };
  }

  return { isValid: false, raw };
};

const loadQrScannerLibrary = (() => {
  let loaderPromise = null;
  const SCRIPT_TIMEOUT_MS = 12000;

  const loadScriptFromUrl = (url) =>
    new Promise((resolve) => {
      const selector = `script[data-lib="html5-qrcode"][data-src="${url}"]`;
      const existingScript = document.querySelector(selector);

      if (existingScript?.dataset?.state === "loaded") {
        resolve(true);
        return;
      }
      if (existingScript?.dataset?.state === "error") {
        existingScript.remove();
      }

      const script =
        existingScript && existingScript.dataset?.state === "loading"
          ? existingScript
          : document.createElement("script");

      if (script !== existingScript) {
        script.src = url;
        script.async = true;
        script.dataset.lib = "html5-qrcode";
        script.dataset.src = url;
        script.dataset.state = "loading";
        script.crossOrigin = "anonymous";
        document.head.appendChild(script);
      }

      let settled = false;
      const finalize = (ok) => {
        if (settled) return;
        settled = true;
        script.dataset.state = ok ? "loaded" : "error";
        if (!ok) {
          script.remove();
        }
        resolve(ok);
      };

      const timeoutId = setTimeout(() => finalize(false), SCRIPT_TIMEOUT_MS);
      script.addEventListener(
        "load",
        () => {
          clearTimeout(timeoutId);
          finalize(true);
        },
        { once: true },
      );
      script.addEventListener(
        "error",
        () => {
          clearTimeout(timeoutId);
          finalize(false);
        },
        { once: true },
      );
    });

  return async () => {
    if (globalThis.Html5Qrcode) return true;
    if (loaderPromise) return loaderPromise;

    loaderPromise = (async () => {
      for (const url of QR_SCANNER_LIB_URLS) {
        const loaded = await loadScriptFromUrl(url);
        if (loaded && globalThis.Html5Qrcode) {
          return true;
        }
      }
      return false;
    })();

    const loaded = await loaderPromise;
    if (!loaded) loaderPromise = null;
    return loaded;
  };
})();

const normalizePeriodMode = (mode) =>
  ["day", "week", "month"].includes(
    String(mode || "")
      .trim()
      .toLowerCase(),
  )
    ? String(mode || "")
        .trim()
        .toLowerCase()
    : "day";

const toMonthFromDate = (dateToken) => {
  const raw = String(dateToken || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  return raw.slice(0, 7);
};

export const isIsoDateToken = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

const toMillisFromUnknownTimestamp = (value) => {
  if (!value) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value?.toMillis === "function") {
    const millis = Number(value.toMillis());
    return Number.isFinite(millis) ? millis : 0;
  }
  if (typeof value?.toDate === "function") {
    const millis = Number(value.toDate().getTime());
    return Number.isFinite(millis) ? millis : 0;
  }
  if (typeof value === "object" && Number.isFinite(value?.seconds)) {
    return Number(value.seconds) * 1000;
  }
  return 0;
};

const isCameraSecureContext = () => {
  if (globalThis.isSecureContext) return true;
  const host = String(globalThis.location?.hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
};

const toDayOfWeekValueFromDateToken = (dateToken) => {
  if (!isIsoDateToken(dateToken)) return "";
  const [year, month, day] = String(dateToken).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const jsDay = date.getDay();
  return jsDay === 0 ? "8" : String(jsDay + 1);
};

const getScheduleApprovalStatus = (schedule) =>
  normalizeScheduleApprovalStatus(schedule);

const getSubjectNameById = (subjectId) => {
  const subject = (globalThis.db.subjects || []).find(
    (item) => String(item.id) === String(subjectId || ""),
  );
  return String(subject?.name || "Môn không xác định");
};

const getScheduleSubjectName = (schedule) => {
  const classInfo = (globalThis.db.classes || []).find(
    (item) => String(item.id) === String(schedule?.classId || ""),
  );
  const subjectId = schedule?.subjectId || classInfo?.subjectId || "";
  return getSubjectNameById(subjectId);
};

const getTeachingContextForTeacherDate = ({ teacherId, attendanceDate }) => {
  const weekToken = toIsoWeekTokenFromDateToken(attendanceDate);
  const dayToken = toDayOfWeekValueFromDateToken(attendanceDate);
  if (!teacherId || !weekToken || !dayToken) {
    return {
      teachingSubjects: [],
      teachingSubjectsText: "Không có dữ liệu môn dạy trong ngày.",
      teachingSessionsText: "",
    };
  }

  const sessions = (globalThis.db.schedules || [])
    .filter((item) => isTeacherAssignedToSchedule(item, teacherId))
    .filter((item) => normalizeWeekToken(item.week) === weekToken)
    .filter((item) => String(item.dayOfWeek || "") === dayToken)
    .filter((item) => getScheduleApprovalStatus(item) === "approved")
    .sort((a, b) =>
      String(a.startTime || "").localeCompare(String(b.startTime || "")),
    );

  const teachingSubjects = Array.from(
    new Set(sessions.map((session) => getScheduleSubjectName(session))),
  ).filter(Boolean);

  const teachingSessionsText = sessions
    .map((session) => {
      const subjectName = getScheduleSubjectName(session);
      const startTime = String(session.startTime || "").trim();
      const endTime = String(session.endTime || "").trim();
      if (!startTime || !endTime) return subjectName;
      return `${subjectName} (${startTime}-${endTime})`;
    })
    .join(" • ");

  return {
    teachingSubjects,
    teachingSubjectsText:
      teachingSubjects.length > 0
        ? teachingSubjects.join(", ")
        : "Không có lịch dạy đã duyệt trong ngày.",
    teachingSessionsText,
  };
};

const getAttendancePeriodSelection = () => {
  const periodSelect = document.getElementById("attendancePeriod");
  const dateInput = document.getElementById("attendanceDate");
  const weekInput = document.getElementById("attendanceWeek");
  const monthInput = document.getElementById("attendanceMonth");

  const mode = normalizePeriodMode(periodSelect?.value || "day");
  const fallbackDate = toDateToken();
  const selectedDate = isIsoDateToken(dateInput?.value)
    ? String(dateInput.value)
    : fallbackDate;
  const fallbackWeek = normalizeWeekToken(
    toIsoWeekTokenFromDateToken(selectedDate),
  );
  const selectedWeek = normalizeWeekToken(weekInput?.value) || fallbackWeek;
  const selectedMonth =
    String(monthInput?.value || "").trim() || toMonthFromDate(selectedDate);

  if (dateInput && dateInput.value !== selectedDate) {
    dateInput.value = selectedDate;
  }
  if (weekInput && weekInput.value !== selectedWeek) {
    weekInput.value = selectedWeek;
  }
  if (monthInput && monthInput.value !== selectedMonth) {
    monthInput.value = selectedMonth;
  }
  if (periodSelect && periodSelect.value !== mode) {
    periodSelect.value = mode;
  }

  return {
    mode,
    date: selectedDate,
    week: selectedWeek,
    month: selectedMonth,
  };
};

const getAttendancePeriodLabel = (selection) => {
  const mode = normalizePeriodMode(selection?.mode);
  if (mode === "week") {
    const weekToken = normalizeWeekToken(selection?.week);
    const match = /^(\d{4})-W(\d{2})$/.exec(weekToken);
    if (!match) return "Tuần chưa chọn";
    return `Tuần ${Number(match[2])}/${match[1]}`;
  }

  if (mode === "month") {
    const [year, month] = String(selection?.month || "").split("-");
    if (!year || !month) return "Tháng chưa chọn";
    return `Tháng ${month}/${year}`;
  }

  const [year, month, day] = String(selection?.date || "").split("-");
  if (!year || !month || !day) return "Ngày chưa chọn";
  return `Ngày ${day}/${month}/${year}`;
};

const isRequestInSelection = (request, selection) => {
  const attendanceDate = String(request?.attendanceDate || "").trim();
  if (!attendanceDate) return false;

  const mode = normalizePeriodMode(selection?.mode);

  if (mode === "week") {
    const weekToken = normalizeWeekToken(selection?.week);
    if (!weekToken) return false;
    return toIsoWeekTokenFromDateToken(attendanceDate) === weekToken;
  }

  if (mode === "month") {
    const monthToken = String(selection?.month || "").trim();
    return monthToken ? attendanceDate.startsWith(`${monthToken}-`) : false;
  }

  return attendanceDate === String(selection?.date || "").trim();
};

const getTeacherNameById = (teacherId) => {
  const teacher = (globalThis.db.teachers || []).find(
    (item) => String(item.id) === String(teacherId),
  );
  return teacher?.name || "Giáo viên";
};

const normalizeAttendanceRequest = (request) => {
  const submittedAtServerMs = toMillisFromUnknownTimestamp(
    request?.submittedAtServer,
  );
  const reviewedAtServerMs = toMillisFromUnknownTimestamp(
    request?.reviewedAtServer,
  );
  const fallbackCreatedAt = Number(request?.createdAt || 0);
  const fallbackReviewedAt = Number(request?.reviewedAt || 0);

  const createdAt = submittedAtServerMs || fallbackCreatedAt;
  const reviewedAt = reviewedAtServerMs || fallbackReviewedAt;

  const attendanceDateFromServer = createdAt
    ? toDateToken(new Date(createdAt))
    : "";
  const attendanceDate = String(
    attendanceDateFromServer || request?.attendanceDate || "",
  ).trim();
  const checkInTime = String(request?.checkInTime || "").trim();
  const checkOutTime = String(request?.checkOutTime || "").trim();
  const calculatedMinutes = computeWorkedMinutes(checkInTime, checkOutTime);
  const workedMinutes =
    Number(request?.workedMinutes || 0) > 0
      ? Number(request.workedMinutes)
      : calculatedMinutes || 0;

  return {
    ...request,
    attendanceDate,
    createdAt,
    reviewedAt,
    submittedAtServerMs,
    reviewedAtServerMs,
    checkInTime,
    checkOutTime,
    workedMinutes,
    status: ["pending", "approved", "rejected"].includes(request?.status)
      ? request.status
      : "pending",
    teacherName:
      String(request?.teacherName || "").trim() ||
      getTeacherNameById(request?.teacherId),
  };
};

const getAttendanceDashboardData = (selectionInput) => {
  const selection = selectionInput || getAttendancePeriodSelection();
  const teachingContextCache = new Map();

  const withTeachingContext = (item) => {
    const key = `${String(item.teacherId || "")}|${String(item.attendanceDate || "")}`;
    if (!teachingContextCache.has(key)) {
      teachingContextCache.set(
        key,
        getTeachingContextForTeacherDate({
          teacherId: item.teacherId,
          attendanceDate: item.attendanceDate,
        }),
      );
    }

    return {
      ...item,
      ...teachingContextCache.get(key),
    };
  };

  const requests = (globalThis.db.attendanceRequests || [])
    .map((item) => normalizeAttendanceRequest(item))
    .map((item) => withTeachingContext(item))
    .filter((item) => isRequestInSelection(item, selection))
    .sort((a, b) => {
      const dateDiff = String(b.attendanceDate).localeCompare(
        String(a.attendanceDate),
      );
      if (dateDiff !== 0) return dateDiff;
      const timeDiff = String(a.checkInTime).localeCompare(
        String(b.checkInTime),
      );
      if (timeDiff !== 0) return timeDiff;
      return Number(b.createdAt || 0) - Number(a.createdAt || 0);
    });

  const stats = {
    totalRequests: requests.length,
    approvedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    totalWorkedMinutes: 0,
    approvalRate: "0%",
  };

  const teacherSummaryMap = new Map();
  const dailySummaryMap = new Map();

  requests.forEach((item) => {
    if (item.status === "approved") {
      stats.approvedCount += 1;
      stats.totalWorkedMinutes += item.workedMinutes;
    } else if (item.status === "rejected") {
      stats.rejectedCount += 1;
    } else {
      stats.pendingCount += 1;
    }

    const teacherKey = String(item.teacherId || "unknown");
    if (!teacherSummaryMap.has(teacherKey)) {
      teacherSummaryMap.set(teacherKey, {
        teacherId: teacherKey,
        teacherName: item.teacherName,
        totalRequests: 0,
        approvedCount: 0,
        pendingCount: 0,
        rejectedCount: 0,
        workedMinutes: 0,
        _allDates: new Set(),
        _approvedDates: new Set(),
      });
    }
    const teacherSummary = teacherSummaryMap.get(teacherKey);
    teacherSummary.totalRequests += 1;
    teacherSummary._allDates.add(item.attendanceDate);
    if (item.status === "approved") {
      teacherSummary.approvedCount += 1;
      teacherSummary.workedMinutes += item.workedMinutes;
      teacherSummary._approvedDates.add(item.attendanceDate);
    } else if (item.status === "rejected") {
      teacherSummary.rejectedCount += 1;
    } else {
      teacherSummary.pendingCount += 1;
    }

    const dayKey = String(item.attendanceDate || "");
    if (!dailySummaryMap.has(dayKey)) {
      dailySummaryMap.set(dayKey, {
        attendanceDate: dayKey,
        totalRequests: 0,
        approvedCount: 0,
        pendingCount: 0,
        rejectedCount: 0,
        workedMinutes: 0,
      });
    }
    const daySummary = dailySummaryMap.get(dayKey);
    daySummary.totalRequests += 1;
    if (item.status === "approved") {
      daySummary.approvedCount += 1;
      daySummary.workedMinutes += item.workedMinutes;
    } else if (item.status === "rejected") {
      daySummary.rejectedCount += 1;
    } else {
      daySummary.pendingCount += 1;
    }
  });

  stats.approvalRate =
    stats.totalRequests > 0
      ? `${((stats.approvedCount / stats.totalRequests) * 100).toFixed(1).replaceAll(".0", "")}%`
      : "0%";

  const teacherSummary = Array.from(teacherSummaryMap.values())
    .map((item) => {
      const { _allDates, _approvedDates, ...rest } = item;
      return {
        ...rest,
        totalDays: _allDates.size,
        approvedDays: _approvedDates.size,
      };
    })
    .sort((a, b) => b.totalRequests - a.totalRequests);

  const dailySummary = Array.from(dailySummaryMap.values()).sort((a, b) =>
    String(a.attendanceDate).localeCompare(String(b.attendanceDate)),
  );

  return {
    selection,
    periodLabel: getAttendancePeriodLabel(selection),
    requests,
    stats,
    teacherSummary,
    dailySummary,
    pendingRequests: requests.filter((item) => item.status === "pending"),
  };
};

const getBoardTeacherAttendanceSummary = (teacherId) => {
  const teacherRequests = (globalThis.db.attendanceRequests || [])
    .map((item) => normalizeAttendanceRequest(item))
    .filter((item) => String(item.teacherId) === String(teacherId));

  const sinceDate = new Date(Date.now() - 30 * DAY_MS);
  const sinceToken = toDateToken(sinceDate);
  const recentRequests = teacherRequests.filter(
    (item) => item.attendanceDate >= sinceToken,
  );

  const summary = {
    total: recentRequests.length,
    approved: 0,
    pending: 0,
    rejected: 0,
    workedMinutes: 0,
  };

  recentRequests.forEach((item) => {
    if (item.status === "approved") {
      summary.approved += 1;
      summary.workedMinutes += item.workedMinutes;
    } else if (item.status === "rejected") {
      summary.rejected += 1;
    } else {
      summary.pending += 1;
    }
  });

  return summary;
};

const getTeacherQrAttendanceModalController = (() => {
  let controller = null;

  return ({ onSubmitRequest }) => {
    if (controller) return controller;

    const root = document.createElement("div");
    root.id = "teacherQrAttendanceModal";
    root.className =
      "fixed inset-0 z-[190] hidden items-center justify-center p-3 sm:p-4 bg-slate-900/60";
    root.innerHTML = `
      <div class="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[92vh]">
        <div class="px-4 sm:px-5 py-3 border-b border-slate-200 bg-cyan-50 flex items-start justify-between gap-3">
          <div>
            <h3 class="text-base font-bold text-cyan-900">Chấm công bằng QR cố định</h3>
            <p class="text-[11px] text-cyan-700/80 mt-1">Quét đúng mã QR cố định của trung tâm để mở biểu mẫu giờ vào/ra.</p>
          </div>
          <button type="button" id="teacherQrCloseBtn" class="text-slate-400 hover:text-slate-700 text-xl leading-none">&times;</button>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-3">
          <div id="teacherQrScannerPanel" class="space-y-3">
            <div id="teacherQrReader" class="rounded-xl border border-slate-200 bg-slate-50 p-2 min-h-[200px] sm:min-h-[240px]"></div>
            <div id="teacherQrStatus" class="text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 px-3 py-2">Đang khởi động camera...</div>
            <div class="flex flex-wrap items-center justify-end gap-2">
              <button type="button" id="teacherQrManualBtn" class="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100">Nhập mã thủ công</button>
            </div>
          </div>

          <form id="teacherAttendanceForm" class="hidden space-y-3">
            <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">QR hợp lệ. Vui lòng điền giờ vào/ra để gửi duyệt.</div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Ngày chấm công</label>
                <input id="teacherAttendanceDate" type="date" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50 text-slate-600 pointer-events-none" readonly />
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Giờ vào</label>
                <input id="teacherAttendanceCheckIn" type="time" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" required />
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Giờ ra</label>
                <input id="teacherAttendanceCheckOut" type="time" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" required />
              </div>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Ghi chú (tuỳ chọn)</label>
              <textarea id="teacherAttendanceNote" rows="2" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" placeholder="Ví dụ: dạy bù ca tối, trực CLB STEM..."></textarea>
            </div>
            <div class="text-xs text-slate-500" id="teacherAttendanceWorkedPreview"></div>
          </form>
        </div>

        <div class="px-3 sm:px-4 py-3 border-t border-slate-200 bg-white flex flex-col-reverse sm:flex-row flex-wrap items-stretch sm:items-center justify-end gap-2">
          <button type="button" id="teacherQrRescanBtn" class="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold hidden">Quét lại</button>
          <button type="button" id="teacherQrSubmitBtn" class="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold hidden">Gửi admin duyệt</button>
          <button type="button" id="teacherQrCloseFooterBtn" class="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold">Đóng</button>
        </div>
      </div>`;

    document.body.appendChild(root);

    const refs = {
      root,
      scannerPanel: root.querySelector("#teacherQrScannerPanel"),
      reader: root.querySelector("#teacherQrReader"),
      status: root.querySelector("#teacherQrStatus"),
      form: root.querySelector("#teacherAttendanceForm"),
      attendanceDate: root.querySelector("#teacherAttendanceDate"),
      checkIn: root.querySelector("#teacherAttendanceCheckIn"),
      checkOut: root.querySelector("#teacherAttendanceCheckOut"),
      note: root.querySelector("#teacherAttendanceNote"),
      workedPreview: root.querySelector("#teacherAttendanceWorkedPreview"),
      closeBtn: root.querySelector("#teacherQrCloseBtn"),
      closeFooterBtn: root.querySelector("#teacherQrCloseFooterBtn"),
      manualBtn: root.querySelector("#teacherQrManualBtn"),
      rescanBtn: root.querySelector("#teacherQrRescanBtn"),
      submitBtn: root.querySelector("#teacherQrSubmitBtn"),
    };

    const state = {
      scanner: null,
      isRunning: false,
      isProcessing: false,
      hasValidScan: false,
      lastDecodedRaw: "",
      lastDecodedAt: 0,
      isOpen: false,
      sessionId: 0,
    };

    const setStatus = (message, type = "info") => {
      const classMap = {
        info: "border-slate-200 bg-slate-50 text-slate-600",
        success: "border-emerald-200 bg-emerald-50 text-emerald-700",
        error: "border-rose-200 bg-rose-50 text-rose-700",
      };
      refs.status.className = `text-xs rounded-lg px-3 py-2 border ${classMap[type] || classMap.info}`;
      refs.status.innerText = String(message || "");
    };

    const syncWorkedPreview = () => {
      const workedMinutes = computeWorkedMinutes(
        refs.checkIn.value,
        refs.checkOut.value,
      );
      if (workedMinutes === null) {
        refs.workedPreview.innerText =
          "Giờ vào/ra chưa hợp lệ. Giờ ra cần lớn hơn giờ vào và không quá 16h.";
        refs.workedPreview.className = "text-xs text-rose-600";
        return;
      }

      refs.workedPreview.innerText = `Tổng giờ công dự kiến: ${formatWorkedMinutes(workedMinutes)} (${workedMinutes} phút).`;
      refs.workedPreview.className = "text-xs text-emerald-700";
    };

    const resetFormValues = () => {
      const now = new Date();
      const inTime = toTimeToken(now);
      const outTime = addMinutesToTimeToken(inTime, 120);
      refs.attendanceDate.value = toDateToken(now);
      refs.checkIn.value = inTime;
      refs.checkOut.value = outTime || inTime;
      refs.note.value = "";
      syncWorkedPreview();
    };

    const showForm = (visible) => {
      refs.form.classList.toggle("hidden", !visible);
      refs.rescanBtn.classList.toggle("hidden", !visible);
      refs.submitBtn.classList.toggle("hidden", !visible);
      refs.scannerPanel.classList.toggle("hidden", visible);
    };

    const stopScanner = async () => {
      if (!state.scanner) return;
      try {
        if (state.isRunning) {
          await state.scanner.stop();
        }
      } catch {
        // Ignore stop errors while closing modal.
      }

      try {
        await state.scanner.clear();
      } catch {
        // Ignore clear errors.
      }

      state.scanner = null;
      state.isRunning = false;
      refs.reader.innerHTML = "";
    };

    const close = async () => {
      state.isOpen = false;
      state.sessionId += 1;
      await stopScanner();
      state.isProcessing = false;
      state.hasValidScan = false;
      showForm(false);
      refs.root.classList.add("hidden");
      refs.root.classList.remove("flex");
    };

    const handleDecodedRaw = async (decodedRaw) => {
      if (!state.isOpen) return;
      if (state.isProcessing) return;

      const now = Date.now();
      if (
        state.lastDecodedRaw === decodedRaw &&
        now - state.lastDecodedAt < 1200
      ) {
        return;
      }

      state.lastDecodedRaw = decodedRaw;
      state.lastDecodedAt = now;
      state.isProcessing = true;

      try {
        const parsed = parseFixedAttendanceQrPayload(decodedRaw);
        if (!parsed.isValid) {
          setStatus(
            "Mã QR không hợp lệ. Vui lòng quét đúng mã cố định.",
            "error",
          );
          return;
        }

        state.hasValidScan = true;
        await stopScanner();
        resetFormValues();
        showForm(true);
        setStatus("Mã QR hợp lệ. Điền giờ vào/ra để gửi duyệt.", "success");
      } finally {
        setTimeout(() => {
          state.isProcessing = false;
        }, 220);
      }
    };

    const startScanner = async (sessionId) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus(
          "Trình duyệt không hỗ trợ camera. Hãy nhập mã thủ công.",
          "error",
        );
        return;
      }

      if (!isCameraSecureContext()) {
        setStatus(
          "Thiết bị di động yêu cầu HTTPS để mở camera. Hãy mở web qua HTTPS hoặc dùng Nhập mã thủ công.",
          "error",
        );
        return;
      }

      const isLoaded = await loadQrScannerLibrary();
      if (!state.isOpen || sessionId !== state.sessionId) return;
      if (!isLoaded || !globalThis.Html5Qrcode) {
        setStatus(
          "Không tải được thư viện quét QR. Vui lòng kiểm tra mạng.",
          "error",
        );
        return;
      }

      await stopScanner();
      if (!state.isOpen || sessionId !== state.sessionId) return;

      const cameraAttempts = [
        {
          camera: { facingMode: { exact: "environment" } },
          config: { fps: 10, qrbox: { width: 220, height: 220 } },
        },
        {
          camera: { facingMode: "environment" },
          config: { fps: 10, qrbox: { width: 220, height: 220 } },
        },
        {
          camera: { facingMode: "user" },
          config: { fps: 8, qrbox: { width: 200, height: 200 } },
        },
      ];

      let started = false;
      for (const attempt of cameraAttempts) {
        try {
          state.scanner = new globalThis.Html5Qrcode("teacherQrReader");
          await state.scanner.start(
            attempt.camera,
            attempt.config,
            (decodedText) => {
              handleDecodedRaw(decodedText);
            },
            () => {},
          );
          if (!state.isOpen || sessionId !== state.sessionId) {
            await stopScanner();
            return;
          }
          state.isRunning = true;
          started = true;
          break;
        } catch {
          await stopScanner();
        }
      }

      if (!started) {
        setStatus(
          "Không thể mở camera trên thiết bị này. Hãy cấp quyền camera, dùng HTTPS, hoặc nhập mã thủ công.",
          "error",
        );
        return;
      }

      setStatus("Đưa mã QR vào giữa khung camera để quét.", "info");
    };

    refs.checkIn.addEventListener("change", syncWorkedPreview);
    refs.checkOut.addEventListener("change", syncWorkedPreview);

    refs.closeBtn.addEventListener("click", () => {
      close();
    });
    refs.closeFooterBtn.addEventListener("click", () => {
      close();
    });
    refs.root.addEventListener("click", (event) => {
      if (event.target === refs.root) {
        close();
      }
    });

    refs.manualBtn.addEventListener("click", async () => {
      const raw = await globalThis.appPrompt(
        "Nhập dữ liệu QR",
        "Dán nội dung mã QR đang hiệu lực để xác thực.",
        getActiveAttendanceQrToken(),
      );
      if (raw === null || raw === false) return;
      await handleDecodedRaw(raw);
    });

    refs.rescanBtn.addEventListener("click", async () => {
      state.hasValidScan = false;
      showForm(false);
      await startScanner(state.sessionId);
    });

    refs.submitBtn.addEventListener("click", async () => {
      if (!state.hasValidScan) {
        setStatus("Bạn cần quét QR hợp lệ trước khi gửi duyệt.", "error");
        return;
      }

      const result = await onSubmitRequest({
        attendanceDate: refs.attendanceDate.value,
        checkInTime: refs.checkIn.value,
        checkOutTime: refs.checkOut.value,
        note: refs.note.value,
      });

      if (!result?.ok) {
        setStatus(result?.message || "Không thể gửi chấm công.", "error");
        return;
      }

      setStatus("Đã gửi chấm công thành công. Chờ admin duyệt.", "success");
      setTimeout(() => {
        close();
      }, 760);
    });

    controller = {
      open: async () => {
        state.isOpen = true;
        state.sessionId += 1;
        const activeSessionId = state.sessionId;
        state.lastDecodedAt = 0;
        state.lastDecodedRaw = "";
        state.hasValidScan = false;
        showForm(false);

        refs.root.classList.remove("hidden");
        refs.root.classList.add("flex");

        await startScanner(activeSessionId);
      },
      close,
    };

    return controller;
  };
})();

const getAttendanceQrAdminModalController = (() => {
  let controller = null;

  return ({ getCurrentRole, getCurrentUser, showToast }) => {
    if (controller) return controller;

    const root = document.createElement("div");
    root.id = "attendanceQrAdminModal";
    root.className =
      "fixed inset-0 z-[195] hidden items-center justify-center p-3 sm:p-4 bg-slate-900/60";
    root.innerHTML = `
      <div class="bg-white w-full max-w-3xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[92vh]">
        <div class="px-4 sm:px-5 py-3 border-b border-slate-200 bg-cyan-50 flex items-start justify-between gap-3">
          <div>
            <h3 class="text-base font-bold text-cyan-900">Quản lý mã QR chấm công</h3>
            <p class="text-[11px] text-cyan-700/80 mt-1">Admin tạo và xoay vòng mã QR. Giáo viên chỉ quét được mã đang hiệu lực.</p>
          </div>
          <button type="button" id="attendanceQrAdminCloseBtn" class="text-slate-400 hover:text-slate-700 text-xl leading-none">&times;</button>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="space-y-3">
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div class="text-[11px] font-bold text-slate-600 uppercase">Token hiện hành</div>
              <div id="attendanceQrAdminToken" class="mt-1 text-xs font-mono break-all text-slate-800"></div>
              <div id="attendanceQrAdminMeta" class="mt-1 text-[11px] text-slate-500"></div>
              <div id="attendanceQrAdminLegacyNote" class="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 hidden">
                Đang dùng mã mặc định. Nên khởi tạo mã riêng để admin chủ động quản lý.
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Payload để tạo QR</label>
              <textarea id="attendanceQrAdminPayload" rows="4" readonly class="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-slate-50 text-slate-700"></textarea>
            </div>

            <div class="flex flex-wrap gap-2">
              <button type="button" id="attendanceQrAdminRotateBtn" class="text-xs font-bold px-3 py-1.5 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100">Khởi tạo mã QR riêng</button>
              <button type="button" id="attendanceQrAdminCopyTokenBtn" class="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">Sao chép token</button>
              <button type="button" id="attendanceQrAdminCopyPayloadBtn" class="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">Sao chép payload</button>
            </div>
          </div>

          <div class="rounded-xl border border-slate-200 p-3 bg-white flex flex-col">
            <div class="text-[11px] font-bold text-slate-600 uppercase mb-2">Mã QR đang phát hành</div>
            <div class="flex-1 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg p-2 min-h-[220px] sm:min-h-[280px]">
              <img id="attendanceQrAdminImage" alt="QR chấm công" class="max-w-full max-h-[220px] sm:max-h-[280px] rounded" />
            </div>
            <a id="attendanceQrAdminDownload" href="#" target="_blank" rel="noopener" class="mt-2 text-xs font-bold text-cyan-700 hover:text-cyan-800 self-start">Mở ảnh QR ở tab mới</a>
          </div>
        </div>

        <div class="px-3 sm:px-4 py-3 border-t border-slate-200 bg-white flex flex-col-reverse sm:flex-row flex-wrap items-stretch sm:items-center justify-end gap-2">
          <button type="button" id="attendanceQrAdminCloseFooterBtn" class="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold">Đóng</button>
        </div>
      </div>`;

    document.body.appendChild(root);

    const refs = {
      root,
      tokenEl: root.querySelector("#attendanceQrAdminToken"),
      metaEl: root.querySelector("#attendanceQrAdminMeta"),
      payloadEl: root.querySelector("#attendanceQrAdminPayload"),
      legacyNoteEl: root.querySelector("#attendanceQrAdminLegacyNote"),
      imageEl: root.querySelector("#attendanceQrAdminImage"),
      downloadEl: root.querySelector("#attendanceQrAdminDownload"),
      rotateBtn: root.querySelector("#attendanceQrAdminRotateBtn"),
      copyTokenBtn: root.querySelector("#attendanceQrAdminCopyTokenBtn"),
      copyPayloadBtn: root.querySelector("#attendanceQrAdminCopyPayloadBtn"),
      closeBtn: root.querySelector("#attendanceQrAdminCloseBtn"),
      closeFooterBtn: root.querySelector("#attendanceQrAdminCloseFooterBtn"),
    };

    const close = () => {
      refs.root.classList.add("hidden");
      refs.root.classList.remove("flex");
    };

    const toUpdatedMetaText = (config) => {
      if (!config) {
        return "Chưa khởi tạo mã riêng. Hệ thống đang dùng mã mặc định.";
      }
      const updatedAt = config.updatedAt
        ? new Date(config.updatedAt).toLocaleString("vi-VN")
        : "N/A";
      const updatedBy = config.updatedByName || config.updatedBy || "Admin";
      return `Cập nhật: ${updatedAt} • bởi ${updatedBy}`;
    };

    const renderQrData = () => {
      const config = getAttendanceQrConfigRecord();
      const token = getActiveAttendanceQrToken();
      const payload = getAttendanceQrPayload(token);
      const imageUrl = getAttendanceQrImageUrl(payload);

      refs.tokenEl.innerText = token;
      refs.metaEl.innerText = toUpdatedMetaText(config);
      refs.payloadEl.value = payload;
      refs.imageEl.src = `${imageUrl}&t=${Date.now()}`;
      refs.downloadEl.href = imageUrl;
      refs.legacyNoteEl.classList.toggle("hidden", Boolean(config));
      refs.rotateBtn.innerText = config
        ? "Tạo mã QR mới"
        : "Khởi tạo mã QR riêng";
    };

    const rotateQrToken = async () => {
      if (getCurrentRole() !== "admin") {
        return globalThis.alert("Bạn không có quyền quản lý mã QR.");
      }

      const shouldRotate = await globalThis.appConfirm(
        "Tạo mã QR mới? Mã cũ sẽ không còn quét được ngay sau khi lưu.",
        "Xoay vòng mã QR",
      );
      if (!shouldRotate) return;

      const user = getCurrentUser();
      const payload = {
        id: ATTENDANCE_QR_CONFIG_ID,
        token: createAttendanceQrToken(),
        payloadVersion: ATTENDANCE_QR_PAYLOAD_VERSION,
        updatedAt: Date.now(),
        updatedBy: String(user?.email || ""),
        updatedByName: String(user?.name || ""),
      };

      await globalThis.cloudSave("settings", payload);
      showToast("Đã cập nhật mã QR chấm công mới.", "success");
      renderQrData();
    };

    const copyToken = async () => {
      const copied = await copyTextToClipboard(refs.tokenEl.innerText);
      if (!copied) {
        showToast("Không sao chép được token QR.", "error");
        return;
      }
      showToast("Đã sao chép token QR.", "success");
    };

    const copyPayload = async () => {
      const copied = await copyTextToClipboard(refs.payloadEl.value);
      if (!copied) {
        showToast("Không sao chép được payload QR.", "error");
        return;
      }
      showToast("Đã sao chép payload QR.", "success");
    };

    refs.rotateBtn.addEventListener("click", rotateQrToken);
    refs.copyTokenBtn.addEventListener("click", copyToken);
    refs.copyPayloadBtn.addEventListener("click", copyPayload);
    refs.closeBtn.addEventListener("click", close);
    refs.closeFooterBtn.addEventListener("click", close);
    refs.root.addEventListener("click", (event) => {
      if (event.target === refs.root) {
        close();
      }
    });

    controller = {
      open: async () => {
        if (getCurrentRole() !== "admin") {
          return globalThis.alert("Bạn không có quyền quản lý mã QR.");
        }

        renderQrData();
        refs.root.classList.remove("hidden");
        refs.root.classList.add("flex");
      },
      close,
    };

    return controller;
  };
})();

const buildAttendanceRequestPayload = ({
  teacher,
  checkInTime,
  checkOutTime,
  note,
}) => {
  if (!teacher?.id) {
    return {
      ok: false,
      message: "Không tìm thấy thông tin giáo viên đăng nhập.",
    };
  }
  const effectiveAttendanceDate = toDateToken(new Date());
  if (!isIsoDateToken(effectiveAttendanceDate)) {
    return { ok: false, message: "Ngày chấm công không hợp lệ." };
  }

  const workedMinutes = computeWorkedMinutes(checkInTime, checkOutTime);
  if (workedMinutes === null) {
    return {
      ok: false,
      message:
        "Giờ vào/ra không hợp lệ. Giờ ra phải lớn hơn giờ vào và không quá 16h.",
    };
  }

  const existing = (globalThis.db.attendanceRequests || []).find((item) => {
    const sameTeacher = String(item.teacherId || "") === String(teacher.id);
    const sameDate =
      String(item.attendanceDate || "") === String(effectiveAttendanceDate);
    const activeStatus = ["pending", "approved"].includes(
      String(item.status || "pending"),
    );
    return sameTeacher && sameDate && activeStatus;
  });

  if (existing) {
    return {
      ok: false,
      message:
        "Bạn đã có bản ghi chấm công đang chờ duyệt hoặc đã duyệt cho ngày này.",
    };
  }

  const createdAt = Date.now();
  const qrConfig = getAttendanceQrConfigRecord();
  const payload = {
    id: buildAttendanceRequestId(teacher.id, effectiveAttendanceDate),
    teacherId: String(teacher.id),
    teacherName: String(teacher.name || "Giáo viên"),
    teacherEmail: String(teacher.email || ""),
    attendanceDate: effectiveAttendanceDate,
    checkInTime: String(checkInTime),
    checkOutTime: String(checkOutTime),
    workedMinutes,
    note: String(note || "").trim(),
    qrTokenVersion:
      qrConfig?.payloadVersion || "legacy_fixed_attendance_qr_token",
    status: "pending",
    createdAt,
    reviewedAt: null,
    reviewedBy: "",
    reviewNote: "",
  };

  return { ok: true, payload };
};

export const registerAttendanceFeature = ({
  getCurrentRole,
  getCurrentUser,
  showToast,
}) => {
  const submitTeacherAttendanceRequest = async ({
    checkInTime,
    checkOutTime,
    note,
  }) => {
    if (getCurrentRole() !== "teacher") {
      return {
        ok: false,
        message: "Chỉ tài khoản giáo viên mới được gửi chấm công bằng QR.",
      };
    }

    const teacher = getCurrentUser();
    const built = buildAttendanceRequestPayload({
      teacher,
      checkInTime,
      checkOutTime,
      note,
    });
    if (!built.ok) return built;

    await globalThis.cloudSave("attendanceRequests", built.payload);
    return { ok: true, payload: built.payload };
  };

  globalThis.openTeacherAttendanceQrModal = async () => {
    if (getCurrentRole() !== "teacher") {
      return globalThis.alert(
        "Chức năng quét QR chấm công chỉ dành cho tài khoản giáo viên.",
      );
    }

    const modal = getTeacherQrAttendanceModalController({
      onSubmitRequest: submitTeacherAttendanceRequest,
    });
    await modal.open();
  };

  globalThis.openAttendanceQrAdminModal = async () => {
    if (getCurrentRole() !== "admin") {
      return globalThis.alert("Bạn không có quyền quản lý mã QR chấm công.");
    }

    const modal = getAttendanceQrAdminModalController({
      getCurrentRole,
      getCurrentUser,
      showToast,
    });
    await modal.open();
  };

  globalThis.reviewAttendanceRequest = async (requestId, action) => {
    if (getCurrentRole() !== "admin") {
      return globalThis.alert("Bạn không có quyền duyệt chấm công.");
    }

    const request = (globalThis.db.attendanceRequests || []).find(
      (item) => String(item.id) === String(requestId),
    );
    if (!request) {
      return globalThis.alert("Không tìm thấy yêu cầu chấm công.");
    }

    const normalizedRequest = normalizeAttendanceRequest(request);

    if (String(normalizedRequest.status || "pending") !== "pending") {
      return globalThis.alert("Yêu cầu này đã được xử lý trước đó.");
    }

    const isApprove = action === "approve";
    const teachingContext = getTeachingContextForTeacherDate({
      teacherId: normalizedRequest.teacherId,
      attendanceDate: normalizedRequest.attendanceDate,
    });
    const shouldProceed = await globalThis.appConfirm(
      isApprove
        ? `Xác nhận duyệt bản ghi chấm công này?\nMôn trong ngày: ${teachingContext.teachingSubjectsText}`
        : `Xác nhận từ chối bản ghi chấm công này?\nMôn trong ngày: ${teachingContext.teachingSubjectsText}`,
      isApprove ? "Duyệt chấm công" : "Từ chối chấm công",
    );
    if (!shouldProceed) return;

    const reviewPromptTitle = isApprove ? "Ghi chú duyệt" : "Lý do từ chối";
    const reviewPromptMessage = isApprove
      ? "Nhập ghi chú cho giáo viên (tuỳ chọn)."
      : "Nhập lý do để giáo viên biết cần điều chỉnh gì (tuỳ chọn):";
    const reviewPromptDefault = isApprove
      ? "Đã duyệt."
      : "Giờ vào/ra chưa phù hợp.";

    const reviewInput = await globalThis.appPrompt(
      reviewPromptTitle,
      reviewPromptMessage,
      reviewPromptDefault,
    );
    if (reviewInput === null || reviewInput === false) return;
    const reviewNote = String(reviewInput || "").trim();

    const reviewer = getCurrentUser();
    const updated = {
      ...normalizedRequest,
      status: isApprove ? "approved" : "rejected",
      reviewedAt: Date.now(),
      reviewedBy: String(reviewer?.email || ""),
      reviewNote: reviewNote || (isApprove ? "Đã duyệt." : "Đã từ chối."),
    };

    await globalThis.cloudSave("attendanceRequests", updated);
    showToast(
      isApprove
        ? "Đã duyệt bản ghi chấm công thành công."
        : "Đã từ chối bản ghi chấm công.",
      isApprove ? "success" : "warning",
    );
  };

  globalThis.getAttendanceFixedQrToken = () => getActiveAttendanceQrToken();
  globalThis.getAttendanceQrPayload = () => getAttendanceQrPayload();

  return {
    FIXED_ATTENDANCE_QR_TOKEN,
    getActiveAttendanceQrToken,
    getAttendanceQrPayload,
    formatWorkedMinutes,
    getAttendancePeriodSelection,
    getAttendancePeriodLabel,
    getAttendanceDashboardData,
    getBoardTeacherAttendanceSummary,
  };
};
