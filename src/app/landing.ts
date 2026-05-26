/**
 * EduTopS Landing Page — TypeScript entry
 *
 * Renders interactive demo panels with MOCK DATA.
 * No Firebase dependency, no login required.
 */

import "../../assets/css/landing.css";
import "../../assets/css/app.css";

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

interface SubjectEntry {
  id: string;
  name: string;
  color: string;
}

interface TeacherEntry {
  id: string;
  name: string;
  email: string;
  phone: string;
  subjects: string[];
}

interface StudentEntry {
  id: string;
  name: string;
  class: string;
  parent: string;
  parentPhone: string;
}

const MOCK_SUBJECTS: SubjectEntry[] = [
  { id: "sub1", name: "Toán Nâng Cao", color: "blue" },
  { id: "sub2", name: "Tiếng Anh Giao Tiếp", color: "cyan" },
  { id: "sub3", name: "Vật Lý", color: "amber" },
  { id: "sub4", name: "Hóa Học", color: "emerald" },
  { id: "sub5", name: "Ngữ Văn", color: "purple" },
  { id: "sub6", name: "Tin Học", color: "rose" }
];

const MOCK_TEACHERS: TeacherEntry[] = [
  { id: "t1", name: "Nguyễn Văn An", email: "an.nguyen@edutops.edu.vn", phone: "0901 234 567", subjects: ["Toán Nâng Cao", "Tin Học"] },
  { id: "t2", name: "Trần Thị Bích", email: "bich.tran@edutops.edu.vn", phone: "0912 345 678", subjects: ["Tiếng Anh Giao Tiếp"] },
  { id: "t3", name: "Lê Hoàng Nam", email: "nam.le@edutops.edu.vn", phone: "0923 456 789", subjects: ["Vật Lý"] },
  { id: "t4", name: "Phạm Minh Tuấn", email: "tuan.pham@edutops.edu.vn", phone: "0934 567 890", subjects: ["Hóa Học"] },
  { id: "t5", name: "Đỗ Thanh Hương", email: "huong.do@edutops.edu.vn", phone: "0945 678 901", subjects: ["Ngữ Văn"] }
];

const MOCK_STUDENTS: StudentEntry[] = [
  { id: "st1", name: "Nguyễn Hoàng Long", class: "Lớp 10A", parent: "Nguyễn Hoàng Hùng", parentPhone: "0909 999 888" },
  { id: "st2", name: "Trần Bảo Ngọc", class: "Lớp 11B", parent: "Trần Văn Minh", parentPhone: "0919 888 777" },
  { id: "st3", name: "Lê Minh Triết", class: "Lớp 12C", parent: "Lê Hữu Đạt", parentPhone: "0929 777 666" },
  { id: "st4", name: "Phạm Thùy Chi", class: "Lớp 11A", parent: "Phạm Hùng Sơn", parentPhone: "0939 666 555" },
  { id: "st5", name: "Đỗ Minh Khang", class: "Lớp 10B", parent: "Đỗ Hoàng Gia", parentPhone: "0949 555 444" }
];

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

  const searchInput = $("#demoScheduleSearchInput") as HTMLInputElement | null;
  const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";

  // Wire up search event listener dynamically
  if (searchInput && !(searchInput as any)._hasListener) {
    (searchInput as any)._hasListener = true;
    searchInput.addEventListener("input", () => {
      renderScheduleBoard();
      setTimeout(() => {
        if (typeof (window as any).lucide !== "undefined") {
          (window as any).lucide.createIcons();
        }
      }, 50);
    });
  }

  let filtered = MOCK_SCHEDULES;
  if (keyword) {
    filtered = MOCK_SCHEDULES.filter(s => 
      s.subject.toLowerCase().includes(keyword) ||
      s.teacher.toLowerCase().includes(keyword) ||
      s.className.toLowerCase().includes(keyword)
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400">
        <i data-lucide="calendar-x" class="w-10 h-10 mx-auto mb-2 text-slate-300"></i>
        <p class="text-sm font-semibold">Không tìm thấy lịch giảng dạy phù hợp</p>
      </div>
    `;
    return;
  }

  const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
  const grouped: Record<string, ScheduleEntry[]> = {};
  filtered.forEach(s => {
    if (!grouped[s.day]) grouped[s.day] = [];
    grouped[s.day].push(s);
  });

  const activeDays = days.filter(d => grouped[d] && grouped[d].length > 0);

  const html = activeDays.map(day => {
    const daySchedules = grouped[day];
    const totalClassesInDay = daySchedules.length;

    const cardsHtml = daySchedules.map(s => {
      const startTime = s.time.split(" – ")[0] || s.time;
      const endTime = s.time.split(" – ")[1] || "";
      const statusClass = s.status === "approved"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-amber-50 text-amber-700 border-amber-200";
      const statusLabel = s.status === "approved" ? "Đã duyệt" : "Chờ duyệt";

      return `
        <div class="bg-white border border-slate-200 rounded-xl p-3 sm:p-3.5 hover:shadow-sm transition-shadow schedule-card content-auto text-left mb-2.5 last:mb-0">
          <div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div class="sm:w-28 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-100 pb-2 sm:pb-0 sm:pr-3">
              <div class="text-base font-bold text-slate-800">${escapeHtml(startTime)}</div>
              <div class="text-[11px] text-slate-500">- ${escapeHtml(endTime)}</div>
              <div class="text-[10px] mt-1 text-slate-600 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 inline-block">Phòng 102</div>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-50 text-slate-700 border-slate-200">Ca dạy</span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700 border-slate-200">Ca dạy lẻ</span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded border" style="border-color:${s.color}60; color:${s.color}; background-color:${s.color}15">${escapeHtml(s.subject)}</span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded border ${statusClass}">${escapeHtml(statusLabel)}</span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-50 text-slate-700 border-slate-200">1 lớp</span>
              </div>
              <div class="text-sm font-semibold text-slate-800 mt-1 truncate">${escapeHtml(s.teacher)}</div>
              <div class="flex flex-wrap gap-1 mt-2">
                <span class="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">${escapeHtml(s.className)}</span>
              </div>
            </div>

            <div class="flex sm:flex-col flex-wrap gap-1.5 sm:w-auto sm:min-w-[122px] shrink-0">
              <button type="button" class="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-[11px] font-bold hover:bg-slate-100 cursor-default">Chi tiết</button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="mb-5 sm:mb-8 relative text-left">
        <div class="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 sticky top-0 bg-slate-50/90 backdrop-blur-sm py-2 z-10 border-b border-slate-200">
          <span class="bg-indigo-600 text-white text-sm font-bold px-3 py-1 rounded-md shadow-sm">${day}</span>
          <span class="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full">${daySchedules.length} ca dạy</span>
          <span class="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full">${totalClassesInDay} lớp</span>
        </div>
        <div class="space-y-2.5">
          ${cardsHtml}
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = html;
}

function renderDashboard(): void {
  requestAnimationFrame(() => {
    const approvalBar = $("#pb-approval") as HTMLElement | null;
    const attendanceBar = $("#pb-attendance") as HTMLElement | null;
    if (approvalBar) approvalBar.style.width = "82%";
    if (attendanceBar) attendanceBar.style.width = "67%";
  });

  const container = $("#demo-top-teachers");
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-3 text-left">
      <div class="space-y-1">
        <div class="flex items-center justify-between gap-2 text-[11px]">
          <span class="font-medium text-slate-700">Nguyễn Văn An</span>
          <span class="font-bold text-slate-800">6 ca · 9h giảng dạy</span>
        </div>
        <div class="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div class="h-full rounded-full bg-amber-500" style="width: 85%"></div>
        </div>
      </div>
      <div class="space-y-1">
        <div class="flex items-center justify-between gap-2 text-[11px]">
          <span class="font-medium text-slate-700">Trần Thị Bích</span>
          <span class="font-bold text-slate-800">4 ca · 6h giảng dạy</span>
        </div>
        <div class="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div class="h-full rounded-full bg-cyan-500" style="width: 60%"></div>
        </div>
      </div>
      <div class="space-y-1">
        <div class="flex items-center justify-between gap-2 text-[11px]">
          <span class="font-medium text-slate-700">Lê Hoàng Nam</span>
          <span class="font-bold text-slate-800">3 ca · 4.5h giảng dạy</span>
        </div>
        <div class="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div class="h-full rounded-full bg-violet-500" style="width: 45%"></div>
        </div>
      </div>
    </div>
  `;
}

function renderAttendance(): void {
  const container = $("#demo-att-list");
  if (!container) return;

  const statusMetaMap: Record<string, { label: string; className: string }> = {
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

  // Group by teacher
  const grouped: Record<string, {
    teacherName: string;
    requests: AttendanceEntry[];
    approvedCount: number;
    pendingCount: number;
    rejectedCount: number;
  }> = {};

  MOCK_ATTENDANCE.forEach(a => {
    if (!grouped[a.teacher]) {
      grouped[a.teacher] = {
        teacherName: a.teacher,
        requests: [],
        approvedCount: 0,
        pendingCount: 0,
        rejectedCount: 0
      };
    }
    const g = grouped[a.teacher];
    g.requests.push(a);
    if (a.status === "approved") g.approvedCount++;
    else if (a.status === "rejected") g.rejectedCount++;
    else g.pendingCount++;
  });

  const teacherNames = Object.keys(grouped).sort();

  const html = teacherNames.map(name => {
    const g = grouped[name];
    const latestDate = g.requests[0]?.date || "";

    const dayRowsHtml = g.requests.map(a => {
      const meta = statusMetaMap[a.status] || statusMetaMap.pending;
      const noteLine = a.note
        ? `<div class="text-[10px] text-slate-500 mt-1 italic truncate">${escapeHtml(a.note)}</div>`
        : "";

      return `
        <div class="w-full sm:w-[290px] xl:w-[320px] bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col gap-1.5 text-left shrink-0">
          <div class="min-w-0">
            <div class="flex items-center justify-between gap-2">
              <div class="text-[12px] font-bold text-slate-800 truncate">${escapeHtml(a.date)}</div>
              <span class="text-[10px] px-2 py-0.5 rounded border font-bold shrink-0 ${meta.className}">${escapeHtml(meta.label)}</span>
            </div>
            <div class="text-[11px] text-slate-500 truncate">${escapeHtml(a.checkIn)} - ${escapeHtml(a.checkOut)}</div>
            <div class="text-[11px] text-slate-500 truncate">Dạy ca sáng • Lớp mẫu</div>
            ${noteLine}
          </div>
        </div>
      `;
    }).join("");

    return `
      <details class="group rounded-lg border border-slate-200 bg-white open:shadow-sm mb-3 last:mb-0" open>
        <summary class="list-none cursor-pointer px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 rounded-lg text-left">
          <div class="min-w-0">
            <div class="text-sm font-bold text-slate-800 truncate">${escapeHtml(g.teacherName)}</div>
            <div class="text-[11px] text-slate-500 truncate">${g.requests.length} ngày • Mới nhất: ${escapeHtml(latestDate)}</div>
          </div>
          <div class="flex items-center gap-1.5 text-[10px] font-bold shrink-0">
            <span class="px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700">Duyệt ${g.approvedCount}</span>
            <span class="px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700">Chờ ${g.pendingCount}</span>
            <span class="px-2 py-0.5 rounded border border-rose-200 bg-rose-50 text-rose-700">Từ chối ${g.rejectedCount}</span>
          </div>
        </summary>
        <div class="px-3 pb-3 pt-2 flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/50">
          ${dayRowsHtml}
        </div>
      </details>
    `;
  }).join("");

  container.innerHTML = html;
}

function renderSubjects(): void {
  const container = $("#demo-subjects-list");
  if (!container) return;

  const colorMeta: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-200"
  };

  const html = MOCK_SUBJECTS.map(s => {
    const cMeta = colorMeta[s.color] || colorMeta.blue;
    return `
      <div class="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3 shadow-sm hover:shadow-md transition-shadow">
        <div class="min-w-0">
          <span class="text-xs font-bold px-2 py-1 rounded border ${cMeta}">${escapeHtml(s.name)}</span>
          <div class="text-[10px] text-slate-500 mt-2">Mã môn học: ${escapeHtml(s.id.toUpperCase())}</div>
        </div>
        <button type="button" class="text-rose-500 hover:text-rose-700 opacity-60 hover:opacity-100 cursor-default"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
      </div>
    `;
  }).join("");

  container.innerHTML = html;

  // Add Subject button listener
  const addBtn = $("#btnDemoAddSubject");
  if (addBtn && !(addBtn as any)._hasListener) {
    (addBtn as any)._hasListener = true;
    addBtn.addEventListener("click", () => {
      const nameInput = $("#demoSubNameInput") as HTMLInputElement | null;
      const colorSelect = $("#demoSubColorSelect") as HTMLSelectElement | null;
      if (nameInput && colorSelect && nameInput.value.trim()) {
        const newSub: SubjectEntry = {
          id: "sub" + (MOCK_SUBJECTS.length + 1),
          name: nameInput.value.trim(),
          color: colorSelect.value
        };
        MOCK_SUBJECTS.push(newSub);
        nameInput.value = "";
        renderSubjects();
        setTimeout(() => {
          if (typeof (window as any).lucide !== "undefined") {
            (window as any).lucide.createIcons();
          }
        }, 50);
      }
    });
  }
}

function renderTeachers(): void {
  const container = $("#demo-teachers-list");
  const countBadge = $("#demo-teachers-count");
  if (!container) return;

  const searchInput = $("#demoTeacherSearchInput") as HTMLInputElement | null;
  const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";

  // Wire up search event listener
  if (searchInput && !(searchInput as any)._hasListener) {
    (searchInput as any)._hasListener = true;
    searchInput.addEventListener("input", () => {
      renderTeachers();
      setTimeout(() => {
        if (typeof (window as any).lucide !== "undefined") {
          (window as any).lucide.createIcons();
        }
      }, 50);
    });
  }

  let filtered = MOCK_TEACHERS;
  if (keyword) {
    filtered = MOCK_TEACHERS.filter(t => 
      t.name.toLowerCase().includes(keyword) || 
      t.email.toLowerCase().includes(keyword)
    );
  }

  if (countBadge) countBadge.textContent = String(filtered.length);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400">
        <i data-lucide="user-x" class="w-10 h-10 mx-auto mb-2 text-slate-300"></i>
        <p class="text-sm font-semibold">Không tìm thấy giáo viên phù hợp</p>
      </div>
    `;
    return;
  }

  const html = filtered.map(t => {
    const subjectBadges = t.subjects.map(s => `
      <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 font-medium">${escapeHtml(s)}</span>
    `).join("");

    return `
      <div class="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:shadow-md transition-shadow">
        <div class="min-w-0">
          <div class="text-sm font-bold text-slate-800">${escapeHtml(t.name)}</div>
          <div class="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <span><i data-lucide="mail" class="w-3 h-3 inline-block mr-1"></i>${escapeHtml(t.email)}</span>
            <span><i data-lucide="phone" class="w-3 h-3 inline-block mr-1"></i>${escapeHtml(t.phone)}</span>
          </div>
          <div class="flex flex-wrap gap-1 mt-2.5">${subjectBadges}</div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button type="button" class="px-2 py-1 rounded border border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100 text-xs font-bold cursor-default">Sửa</button>
          <button type="button" class="px-2 py-1 rounded border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 text-xs font-bold cursor-default">Xóa</button>
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = html;
}

function renderStudents(): void {
  const container = $("#demo-students-list");
  const countBadge = $("#demo-students-count");
  if (!container) return;

  const searchInput = $("#demoStudentSearchInput") as HTMLInputElement | null;
  const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";

  // Wire up search event listener
  if (searchInput && !(searchInput as any)._hasListener) {
    (searchInput as any)._hasListener = true;
    searchInput.addEventListener("input", () => {
      renderStudents();
      setTimeout(() => {
        if (typeof (window as any).lucide !== "undefined") {
          (window as any).lucide.createIcons();
        }
      }, 50);
    });
  }

  let filtered = MOCK_STUDENTS;
  if (keyword) {
    filtered = MOCK_STUDENTS.filter(st => 
      st.name.toLowerCase().includes(keyword) || 
      st.class.toLowerCase().includes(keyword)
    );
  }

  if (countBadge) countBadge.textContent = String(filtered.length);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400">
        <i data-lucide="user-x" class="w-10 h-10 mx-auto mb-2 text-slate-300"></i>
        <p class="text-sm font-semibold">Không tìm thấy học sinh phù hợp</p>
      </div>
    `;
    return;
  }

  const html = filtered.map(st => `
    <div class="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <div class="text-sm font-bold text-slate-800">${escapeHtml(st.name)}</div>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-bold">${escapeHtml(st.class)}</span>
        </div>
        <div class="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
          <span><i data-lucide="user" class="w-3 h-3 inline-block mr-1"></i>Phụ huynh: ${escapeHtml(st.parent)}</span>
          <span><i data-lucide="phone" class="w-3 h-3 inline-block mr-1"></i>SĐT: ${escapeHtml(st.parentPhone)}</span>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <button type="button" class="px-2 py-1 rounded border border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100 text-xs font-bold cursor-default">Đánh giá</button>
        <button type="button" class="px-2 py-1 rounded border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 text-xs font-bold cursor-default">Xóa</button>
      </div>
    </div>
  `).join("");

  container.innerHTML = html;
}

/* ================================================================
   MOCK ACCOUNTS & SUBTAB SWITCHER
   ================================================================ */

interface AccountEntry {
  email: string;
  role: "admin" | "teacher" | "parent" | "guest";
  granted: boolean;
  grantedAt?: string;
}

const MOCK_ACCOUNTS: AccountEntry[] = [
  { email: "ngoctaiphan.edu@gmail.com", role: "admin", granted: true, grantedAt: "20/05/2026" },
  { email: "an.nguyen@edutops.edu.vn", role: "teacher", granted: true, grantedAt: "21/05/2026" },
  { email: "bich.tran@edutops.edu.vn", role: "teacher", granted: true, grantedAt: "22/05/2026" },
  { email: "nam.le@edutops.edu.vn", role: "teacher", granted: true, grantedAt: "23/05/2026" },
  { email: "tuan.pham@edutops.edu.vn", role: "teacher", granted: false },
  { email: "huong.do@edutops.edu.vn", role: "teacher", granted: false }
];

function renderAccounts(): void {
  const container = $("#demo-accounts-list");
  const countBadge = $("#demo-accounts-count");
  if (!container) return;

  const searchInput = $("#demoAccountSearchInput") as HTMLInputElement | null;
  const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";

  // Wire up search event listener
  if (searchInput && !(searchInput as any)._hasListener) {
    (searchInput as any)._hasListener = true;
    searchInput.addEventListener("input", () => {
      renderAccounts();
      setTimeout(() => {
        if (typeof (window as any).lucide !== "undefined") {
          (window as any).lucide.createIcons();
        }
      }, 50);
    });
  }

  let filtered = MOCK_ACCOUNTS;
  if (keyword) {
    filtered = MOCK_ACCOUNTS.filter(a => 
      a.email.toLowerCase().includes(keyword) || 
      a.role.toLowerCase().includes(keyword)
    );
  }

  if (countBadge) countBadge.textContent = String(filtered.length);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400">
        <i data-lucide="shield-alert" class="w-10 h-10 mx-auto mb-2 text-slate-300"></i>
        <p class="text-sm font-semibold">Không tìm thấy tài khoản phù hợp</p>
      </div>
    `;
    return;
  }

  const roleLabels: Record<string, string> = {
    admin: "Admin",
    teacher: "Giáo viên",
    parent: "Phụ huynh",
    guest: "Khách"
  };

  const roleColors: Record<string, string> = {
    admin: "bg-purple-100 text-purple-700 border-purple-200",
    teacher: "bg-amber-100 text-amber-700 border-amber-200",
    parent: "bg-blue-100 text-blue-700 border-blue-200",
    guest: "bg-slate-100 text-slate-700 border-slate-200"
  };

  const html = filtered.map(a => {
    const roleLabel = roleLabels[a.role] || a.role;
    const roleColor = roleColors[a.role] || roleColors.guest;
    const statusBadge = a.granted
      ? `<span class="text-[10px] px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">Đã cấp: ${a.grantedAt || ""}</span>`
      : `<span class="text-[10px] px-2 py-0.5 rounded border bg-rose-50 text-rose-700 border-rose-200 font-semibold">Chưa cấp quyền</span>`;

    return `
      <div class="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:shadow-md transition-shadow">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold px-2 py-0.5 rounded border ${roleColor}">${escapeHtml(roleLabel)}</span>
            <div class="text-sm font-bold text-slate-800 truncate">${escapeHtml(a.email)}</div>
          </div>
          <div class="flex flex-wrap gap-2 mt-2.5">
            ${statusBadge}
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          ${a.granted 
            ? `<button type="button" class="px-2 py-1 rounded border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 text-xs font-bold cursor-default">Thu hồi</button>` 
            : `<button type="button" class="px-2 py-1 rounded border border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold cursor-default">Cấp quyền</button>`
          }
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = html;
}

function initDemoSubtabs(): void {
  const subtabs = $$(".master-tab-btn, .demo-quick-access-btn");
  const subpanels = $$(".demo-subpanel");

  subtabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-subtab");
      if (!target) return;

      // update active classes on rail buttons
      const railButtons = $$(".ops-master-rail-tabs .master-tab-btn");
      railButtons.forEach((btn) => {
        const btnTarget = btn.getAttribute("data-subtab");
        if (btnTarget === target) {
          btn.classList.add("master-tab-btn-active");
          btn.classList.remove("master-tab-btn-inactive");
        } else {
          btn.classList.remove("master-tab-btn-active");
          btn.classList.add("master-tab-btn-inactive");
        }
      });

      // show/hide panel
      subpanels.forEach((p) => p.classList.add("hidden"));
      const panel = $(`#demo-subpanel-${target}`);
      if (panel) {
        panel.classList.remove("hidden");
      }

      // Re-trigger icon render
      setTimeout(initLucide, 50);
    });
  });
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
  initDemoSubtabs();
  renderScheduleBoard();
  renderDashboard();
  renderSubjects();
  renderTeachers();
  renderStudents();
  renderAccounts();
  renderAttendance();
  setCurrentWeek();
  initScrollReveal();

  // Init lucide after a tiny delay to ensure the library is loaded
  setTimeout(initLucide, 100);
  // Re-init after dynamic content is rendered
  setTimeout(initLucide, 600);
});
