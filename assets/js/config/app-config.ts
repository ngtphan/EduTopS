// @ts-nocheck
const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const deepMerge = (base, override) => {
  if (!isPlainObject(base)) {
    return override === undefined ? base : override;
  }

  const result = { ...base };
  const overrideObj = isPlainObject(override) ? override : {};

  Object.keys(overrideObj).forEach((key) => {
    const baseValue = base[key];
    const overrideValue = overrideObj[key];

    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      result[key] = deepMerge(baseValue, overrideValue);
      return;
    }

    result[key] = overrideValue;
  });

  return result;
};

const deepFreeze = (value) => {
  if (!isPlainObject(value) && !Array.isArray(value)) return value;
  Object.freeze(value);
  Object.getOwnPropertyNames(value).forEach((key) => {
    const next = value[key];
    if (
      (isPlainObject(next) || Array.isArray(next)) &&
      !Object.isFrozen(next)
    ) {
      deepFreeze(next);
    }
  });
  return value;
};

export const DEFAULT_APP_CONFIG = {
  version: "v1.22.2",
  branding: {
    shortName: "EduTopS",
    fullName: "EduTopS",
    acronym: "ETS",
    pageTitle: "EduTopS",
    loadingSecureConnectText: "Kết nối an toàn đến hệ thống EduTopS",
  },
  auth: {
    fixedAdminEmail: "ngoctaiphan.edu@gmail.com",
  },
  board: {
    adminTitle: "Lịch giảng dạy EduTopS",
    adminSubtitle: "Đồng bộ Cloud theo thời gian thực",
    teacherTitlePrefix: "Lịch giảng dạy của",
    teacherSubtitle:
      "Tạo lịch hoặc gửi đề xuất để admin duyệt. Quét QR để gửi giờ công.",
  },
  features: {
    parentDashboardEnabled: false,
    securityTelemetryEnabled: true,
  },
  ui: {
    placeholders: {
      teacherSearch: "Tìm giáo viên theo tên, email, SĐT, chuyên môn...",
      studentSearch: "Tìm học sinh theo tên, SĐT phụ huynh, lớp...",
      accountSearch: "Tìm tài khoản theo tên, email, vai trò...",
      scheduleSearch:
        "Tìm lịch theo lớp, giáo viên, môn, địa điểm, nội dung...",
      bulkStudentNameSearch: "Lọc nhanh theo tên học sinh",
      bulkStudentPhoneSearch: "Lọc theo SĐT phụ huynh",
    },
  },
  firebase: {
    defaultAppId: "edutops-app",
    fallbackConfig: {
      apiKey: "AIzaSyCQyeYypgYspNtJK5dYv7TNGtX80engR2U",
      authDomain: "edutops-8f3ac.firebaseapp.com",
      projectId: "edutops-8f3ac",
      storageBucket: "edutops-8f3ac.firebasestorage.app",
      messagingSenderId: "955439571406",
      appId: "1:955439571406:web:47acd32eac072d9fa68b9f",
      measurementId: "G-R7W8X9R46Q",
    },
  },
};

const runtimeOverrideRaw = globalThis.__EDUTOPS_APP_CONFIG;
const runtimeOverride = isPlainObject(runtimeOverrideRaw)
  ? runtimeOverrideRaw
  : {};

export const APP_CONFIG = deepFreeze(
  deepMerge(DEFAULT_APP_CONFIG, runtimeOverride),
);

export const getConfigByPath = (path, fallbackValue = "") => {
  const keys = String(path || "")
    .split(".")
    .map((item) => item.trim())
    .filter(Boolean);
  if (keys.length === 0) return fallbackValue;

  let cursor = APP_CONFIG;
  for (const key of keys) {
    if (!isPlainObject(cursor) && !Array.isArray(cursor)) return fallbackValue;
    if (!Object.hasOwn(cursor, key)) return fallbackValue;
    cursor = cursor[key];
  }

  return cursor ?? fallbackValue;
};
