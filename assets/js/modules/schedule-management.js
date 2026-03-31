export const registerScheduleActions = ({ getCurrentRole, getCurrentUser }) => {
  window.setAttendanceStatus = async (scheduleId, status) => {
    if (getCurrentRole() !== "admin")
      return alert("Bạn không có quyền thực hiện thao tác này!");
    const sch = window.db.schedules.find((s) => s.id === scheduleId);
    if (!sch) return;
    sch.attendance = {
      status,
      markedBy: getCurrentUser()?.email || "",
      markedAt: Date.now(),
    };
    await window.cloudSave("schedules", sch);
  };
};

export const registerScheduleFormsAndFilters = ({
  renderSchedules,
  renderMasterOverview,
  renderAttendance,
}) => {
  document
    .getElementById("scheduleForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const teacherId = document.getElementById("sch_teacherId").value;
      if (!teacherId) return alert("Chọn Giáo viên!");
      const btn = document.getElementById("btnSubmitSchedule");
      btn.innerHTML =
        '<i class="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full"></i> Đang lưu...';
      btn.disabled = true;

      const newSch = {
        id: "sch_" + Date.now(),
        week: document.getElementById("sch_week").value,
        dayOfWeek: document.getElementById("sch_day").value,
        startTime: document.getElementById("sch_start").value,
        endTime: document.getElementById("sch_end").value,
        location: document.getElementById("sch_location").value,
        classId: document.getElementById("sch_classId").value,
        teacherId: teacherId,
        topic: document.getElementById("sch_topic").value,
        evaluations: {},
        attendance: {
          status: "pending",
          markedBy: "",
          markedAt: null,
        },
      };
      await window.cloudSave("schedules", newSch);
      document.getElementById("filterWeek").value = newSch.week;
      document.getElementById("attendanceWeek").value = newSch.week;
      document.getElementById("sch_classId").value = "";
      document.getElementById("sch_topic").value = "";
      window.handleClassSelection();
      btn.innerHTML =
        '<i data-lucide="cloud-upload" class="w-4 h-4"></i> Lưu lên Cloud';
      btn.disabled = false;
      lucide.createIcons();
      window.switchTab("board");
    });

  document.getElementById("filterWeek").addEventListener("change", () => {
    document.getElementById("attendanceWeek").value =
      document.getElementById("filterWeek").value;
    renderSchedules();
    renderMasterOverview();
    renderAttendance();
  });

  document.getElementById("attendanceWeek").addEventListener("change", () => {
    const week = document.getElementById("attendanceWeek").value;
    document.getElementById("filterWeek").value = week;
    renderMasterOverview();
    renderSchedules();
    renderAttendance();
  });
};
