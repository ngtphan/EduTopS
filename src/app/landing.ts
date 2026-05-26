/**
 * EduTopS Landing Page — TypeScript entry
 *
 * Renders interactive demo panels with MOCK DATA.
 * No Firebase dependency, no login required.
 */

import "../../assets/css/landing.css";

/* ================================================================
   MOCK DATA
   ================================================================ */

interface ScheduleEntry {
  id: string;
  subject: string;
  teacher: string;
  className: string;
  day: string;
  time: string;
  color: string;
  status: "approved" | "pending";
}

interface AttendanceEntry {
  teacher: string;
  date: string;
  checkIn: string;
  checkOut: string;
  note: string;
  status: "approved" | "pending" | "rejected";
}

const MOCK_SCHEDULES: ScheduleEntry[] = [
  { id: "s1", subject: "Toán Nâng Cao", teacher: "Nguyễn Văn An", className: "Lớp 10A", day: "Thứ 2", time: "08:00 – 09:30", color: "#4f46e5", status: "approved" },
  { id: "s2", subject: "Tiếng Anh Giao Tiếp", teacher: "Trần Thị Bích", className: "Lớp 11B", day: "Thứ 2", time: "10:00 – 11:30", color: "#06b6d4", status: "approved" },
  { id: "s3", subject: "Vật Lý", teacher: "Lê Hoàng Nam", className: "Lớp 12C", day: "Thứ 3", time: "14:00 – 15:30", color: "#f59e0b", status: "pending" },
  { id: "s4", subject: "Hóa Học", teacher: "Phạm Minh Tuấn", className: "Lớp 11A", day: "Thứ 4", time: "08:00 – 09:30", color: "#10b981", status: "approved" },
  { id: "s5", subject: "Ngữ Văn", teacher: "Đỗ Thanh Hương", className: "Lớp 10B", day: "Thứ 5", time: "10:00 – 11:30", color: "#8b5cf6", status: "approved" },
  { id: "s6", subject: "Tin Học", teacher: "Nguyễn Văn An", className: "Lớp 12A", day: "Thứ 6", time: "14:00 – 15:30", color: "#f43f5e", status: "pending" },
];

const MOCK_ATTENDANCE: AttendanceEntry[] = [
  { teacher: "Nguyễn Văn An", date: "26/05/2025", checkIn: "07:50", checkOut: "11:35", note: "Dạy 2 ca liên tiếp", status: "approved" },
  { teacher: "Trần Thị Bích", date: "26/05/2025", checkIn: "09:55", checkOut: "11:32", note: "", status: "approved" },
  { teacher: "Lê Hoàng Nam", date: "26/05/2025", checkIn: "13:45", checkOut: "15:40", note: "Đến trễ 15 phút", status: "pending" },
  { teacher: "Phạm Minh Tuấn", date: "25/05/2025", checkIn: "07:55", checkOut: "09:35", note: "", status: "approved" },
  { teacher: "Đỗ Thanh Hương", date: "25/05/2025", checkIn: "09:50", checkOut: "11:30", note: "", status: "rejected" },
  { teacher: "Nguyễn Văn An", date: "25/05/2025", checkIn: "13:50", checkOut: "15:35", note: "", status: "approved" },
];

/* ================================================================
   DOM HELPERS
   ================================================================ */

function $(selector: string): HTMLElement | null {
  return document.querySelector(selector);
}

function $$(selector: string): HTMLElement[] {
  return Array.from(document.querySelectorAll(selector));
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ================================================================
   DEMO TAB SWITCHER
   ================================================================ */

function initDemoTabs(): void {
  const tabs = $$(".ld-demo-tab");
  const panels = $$(".ld-demo-panel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-tab");
      if (!target) return;

      tabs.forEach((t) => t.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));

      tab.classList.add("active");
      const panel = $(`#demo-${target}`);
      if (panel) panel.classList.add("active");
    });
  });
}

/* ================================================================
   RENDERERS
   ================================================================ */

function renderScheduleBoard(): void {
  const container = $("#demo-board-list");
  if (!container) return;

  const html = MOCK_SCHEDULES.map((s) => `
    <div class="ld-schedule-card">
      <div class="sc-bar" style="background:${s.color}"></div>
      <div class="sc-info">
        <h4>${escapeHtml(s.subject)} — ${escapeHtml(s.className)}</h4>
        <div class="sc-meta">
          <i data-lucide="user" style="width:12px;height:12px;display:inline-block;vertical-align:-2px;margin-right:2px"></i>
          ${escapeHtml(s.teacher)} · ${escapeHtml(s.day)} · ${escapeHtml(s.time)}
        </div>
      </div>
      <span class="sc-badge ${s.status === "approved" ? "sc-badge-approved" : "sc-badge-pending"}">
        ${s.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}
      </span>
    </div>
  `).join("");

  container.innerHTML = html;
}

function renderDashboard(): void {
  /* Metrics are already in the HTML as static content — nothing to render dynamically.
     The progress bars need their widths animated after paint. */
  requestAnimationFrame(() => {
    const approvalBar = $("#pb-approval") as HTMLElement | null;
    const attendanceBar = $("#pb-attendance") as HTMLElement | null;
    if (approvalBar) approvalBar.style.width = "82%";
    if (attendanceBar) attendanceBar.style.width = "67%";
  });
}

function renderAttendance(): void {
  const container = $("#demo-att-list");
  if (!container) return;

  const statusLabel: Record<string, string> = {
    approved: "Đã duyệt",
    pending: "Chờ duyệt",
    rejected: "Từ chối",
  };
  const statusClass: Record<string, string> = {
    approved: "ld-att-badge-approved",
    pending: "ld-att-badge-pending",
    rejected: "ld-att-badge-rejected",
  };

  const html = MOCK_ATTENDANCE.map((a) => `
    <div class="ld-att-row">
      <div>
        <div class="ar-name">${escapeHtml(a.teacher)}</div>
        <div class="ar-detail">${escapeHtml(a.date)}${a.note ? " · " + escapeHtml(a.note) : ""}</div>
      </div>
      <div class="ar-time">${escapeHtml(a.checkIn)} → ${escapeHtml(a.checkOut)}</div>
      <span class="ld-att-badge ${statusClass[a.status]}">${statusLabel[a.status]}</span>
    </div>
  `).join("");

  container.innerHTML = html;
}

/* ================================================================
   SCROLL REVEAL
   ================================================================ */

function initScrollReveal(): void {
  const els = $$(".ld-reveal");
  if (!els.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  els.forEach((el) => observer.observe(el));
}

/* ================================================================
   LUCIDE ICONS INIT
   ================================================================ */

function initLucide(): void {
  if (typeof (window as any).lucide !== "undefined") {
    (window as any).lucide.createIcons();
  }
}

/* ================================================================
   CURRENT WEEK LABEL
   ================================================================ */

function setCurrentWeek(): void {
  const el = $("#board-week-label");
  if (!el) return;
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  el.textContent = `${now.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

/* ================================================================
   BOOTSTRAP
   ================================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initDemoTabs();
  renderScheduleBoard();
  renderDashboard();
  renderAttendance();
  setCurrentWeek();
  initScrollReveal();

  // Init lucide after a tiny delay to ensure the library is loaded
  setTimeout(initLucide, 100);
  // Re-init after dynamic content is rendered
  setTimeout(initLucide, 600);
});
