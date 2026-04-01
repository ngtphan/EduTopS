import { sanitizeExcelCell } from "./security-utils.js";

export const registerReportingExports = ({
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
  getAttendancePeriodSelection,
  getAttendanceDashboardData,
  getAttendancePeriodLabel,
  formatWorkedMinutes,
}) => {
  const ensureExcelLib = () => {
    if (typeof XLSX !== "undefined") return true;
    showToast(
      "Không tải được thư viện Excel. Vui lòng tải lại trang để thử lại.",
      "error",
      5000,
    );
    return false;
  };

  const sanitizeSheetName = (name) => {
    const invalidChars = new Set(["\\", "/", "?", "*", "[", "]", ":"]);
    return Array.from(String(name || "Sheet"))
      .map((char) => (invalidChars.has(char) ? "-" : char))
      .join("")
      .slice(0, 31);
  };

  const toSafeString = (value) => {
    if (value === null || value === undefined) return "";
    return String(value);
  };

  const sanitizeFileToken = (value, fallback = "TongHop") => {
    const token = String(value || fallback)
      .replaceAll(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .slice(0, 60);
    return token || fallback;
  };

  const autoWidthFromRows = (rows, min = 10, max = 45) => {
    if (!rows.length) return [];
    const colCount = rows[0].length;
    const result = [];
    for (let colIndex = 0; colIndex < colCount; colIndex += 1) {
      let maxLen = min;
      rows.forEach((row) => {
        const cell = toSafeString(sanitizeExcelCell(row[colIndex]));
        if (cell.length > maxLen) maxLen = cell.length;
      });
      result.push({ wch: Math.min(maxLen + 2, max) });
    }
    return result;
  };

  const buildSheet = ({ title, subtitle, columns, rows }) => {
    const headers = columns.map((c) => c.label);
    const dataRows = rows.map((row) =>
      columns.map((c) => sanitizeExcelCell(row[c.key] ?? "")),
    );
    const generatedAt = new Date().toLocaleString("vi-VN");
    const metaLine = `Xuất lúc: ${generatedAt}`;

    const aoa = [
      [title],
      [subtitle || ""],
      [metaLine],
      [],
      headers,
      ...dataRows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const headerRowIndex = 4;
    const colCount = headers.length;

    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(0, colCount - 1) } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(0, colCount - 1) } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: Math.max(0, colCount - 1) } },
    ];

    ws["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: headerRowIndex, c: 0 },
        e: {
          r: Math.max(headerRowIndex, headerRowIndex + dataRows.length),
          c: Math.max(0, colCount - 1),
        },
      }),
    };

    const widthRows = [headers, ...dataRows];
    const autoCols = autoWidthFromRows(widthRows);
    ws["!cols"] = columns.map((col, index) => ({
      wch: col.width || autoCols[index]?.wch || 12,
    }));

    return ws;
  };

  const appendSheetToWorkbook = (workbook, config) => {
    const ws = buildSheet(config);
    XLSX.utils.book_append_sheet(
      workbook,
      ws,
      sanitizeSheetName(config.sheetName),
    );
  };

  const exportWorkbook = (workbook, fileName) => {
    XLSX.writeFile(workbook, fileName, { compression: true });
  };

  const getTeacherReportRows = (week) => {
    const weekSchedules = getAttendanceWeekSchedules(week);
    return globalThis.db.teachers.map((teacher, index) => {
      const subjectNames = (teacher.subjectIds || [])
        .map((id) => getSubjectInfo(id).name)
        .join(", ");

      const classNames = Array.from(
        new Set(
          globalThis.db.schedules
            .filter((sch) => sch.teacherId === teacher.id)
            .map((sch) => {
              const cls = getClassInfo(sch.classId);
              return sch.classLabel || cls?.name || "";
            })
            .filter(Boolean),
        ),
      ).join(", ");

      const weekSessions = weekSchedules.filter(
        (sch) => sch.teacherId === teacher.id,
      );
      const allSessions = globalThis.db.schedules.filter(
        (sch) => sch.teacherId === teacher.id,
      );
      const weekPresentHours = weekSessions.reduce((sum, sch) => {
        if (sch.attendance?.status !== "present") return sum;
        return sum + getDurationHours(sch.startTime, sch.endTime);
      }, 0);

      return {
        stt: index + 1,
        maGiaoVien: teacher.id,
        hoTen: teacher.name,
        gmail: teacher.email || "",
        soDienThoai: teacher.phone || "",
        chuyenMon: subjectNames || "Chưa có môn",
        lopPhuTrach: classNames || "",
        caTuan: weekSessions.length,
        tongCa: allSessions.length,
        gioCoMatTuan: formatHours(weekPresentHours),
      };
    });
  };

  const getStudentReportRows = () =>
    globalThis.db.students.map((student, index) => {
      const classNames = String(
        student.gradeLevel || student.classLevel || "Chưa xếp lớp",
      );
      const latestEval = getLatestStudentEvaluation(student.id);
      return {
        stt: index + 1,
        maHocSinh: student.id,
        hoTen: student.name,
        sdtPhuHuynh: student.parentPhone || "",
        lopDangHoc: classNames,
        danhGiaGanNhat: latestEval
          ? getEvalLevelMeta(latestEval.level).label
          : "Chưa đánh giá",
        ghiChuDanhGia: latestEval?.note || "",
      };
    });

  const getMonthTokenFromWeek = (weekToken) => {
    const match = /^(\d{4})-W(\d{2})$/.exec(String(weekToken || ""));
    if (!match) return "";
    const year = Number(match[1]);
    const week = Number(match[2]);
    if (!year || !week) return "";

    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dayOfWeek = simple.getDay();
    const isoMonday = new Date(simple);
    if (dayOfWeek <= 4 && dayOfWeek > 0) {
      isoMonday.setDate(simple.getDate() - dayOfWeek + 1);
    } else {
      isoMonday.setDate(simple.getDate() + 8 - dayOfWeek);
    }

    return `${isoMonday.getFullYear()}-${String(isoMonday.getMonth() + 1).padStart(2, "0")}`;
  };

  const getLegacyAttendancePeriodSelection = () => {
    const selectedDate = String(
      document.getElementById("attendanceDate")?.value || "",
    );
    const mode =
      document.getElementById("attendancePeriod")?.value === "month"
        ? "month"
        : "day";
    const week = getSelectedWeek();
    const month = String(
      document.getElementById("attendanceMonth")?.value ||
        getMonthTokenFromWeek(week) ||
        "",
    );
    return { mode, date: selectedDate, week, month };
  };

  const getAttendancePeriodSelectionSafe = () => {
    if (typeof getAttendancePeriodSelection === "function") {
      return getAttendancePeriodSelection();
    }
    return getLegacyAttendancePeriodSelection();
  };

  const getAttendancePeriodLabelSafe = (period) => {
    if (typeof getAttendancePeriodLabel === "function") {
      return getAttendancePeriodLabel(period);
    }
    return getAttendancePeriodLabelLegacy(period);
  };

  const formatWorkedMinutesSafe = (minutes) => {
    if (typeof formatWorkedMinutes === "function") {
      return formatWorkedMinutes(minutes);
    }
    return formatHours(Number(minutes || 0) / 60);
  };

  const getAttendancePeriodLabelLegacy = ({ mode, week, month }) => {
    if (mode === "month") {
      if (!month) return "Thang chua chon";
      const [year, monthNumber] = month.split("-");
      return `Thang ${monthNumber}/${year}`;
    }
    return `Tuan ${week || "chua chon"}`;
  };

  const getAttendanceReportRows = (schedules) =>
    schedules.map((sch, index) => {
      const teacher = getTeacherInfo(sch.teacherId);
      const cls = getClassInfo(sch.classId);
      const subject = getSubjectInfo(sch.subjectId || cls?.subjectId || "");
      const attendance = sch.attendance || {};
      const statusMeta = getAttendanceStatusMeta(
        attendance.status || "pending",
      );
      const markedAtText = attendance.markedAt
        ? new Date(attendance.markedAt).toLocaleString("vi-VN")
        : "";
      return {
        stt: index + 1,
        tuan: sch.week,
        thu: formatDayOfWeek(sch.dayOfWeek),
        lop: sch.classLabel || cls?.name || "Lớp đã xóa",
        monHoc: subject.name || "Môn đã xóa",
        giaoVien: teacher.name,
        batDau: sch.startTime || "",
        ketThuc: sch.endTime || "",
        gioDay: formatHours(getDurationHours(sch.startTime, sch.endTime)),
        diaDiem: sch.location || "",
        trangThaiChamCong: statusMeta.label,
        nguoiChamCong: attendance.markedBy || "",
        thoiGianCham: markedAtText,
        noiDung: sch.topic || "",
      };
    });

  globalThis.exportTeachersExcel = () => {
    if (!ensureExcelLib()) return;
    const week = getSelectedWeek();
    const wb = XLSX.utils.book_new();
    const rows = getTeacherReportRows(week);

    appendSheetToWorkbook(wb, {
      sheetName: "GiaoVien",
      title: "Danh sach giao vien",
      subtitle: `Bao cao theo tuan: ${week || "Chua chon"}`,
      columns: [
        { key: "stt", label: "STT", width: 8 },
        { key: "maGiaoVien", label: "Ma GV", width: 20 },
        { key: "hoTen", label: "Ho va ten", width: 24 },
        { key: "gmail", label: "Gmail", width: 28 },
        { key: "soDienThoai", label: "So dien thoai", width: 16 },
        { key: "chuyenMon", label: "Chuyen mon", width: 26 },
        { key: "lopPhuTrach", label: "Lop phu trach", width: 30 },
        { key: "caTuan", label: "So ca tuan", width: 12 },
        { key: "tongCa", label: "Tong so ca", width: 12 },
        { key: "gioCoMatTuan", label: "Gio co mat tuan", width: 14 },
      ],
      rows,
    });

    exportWorkbook(
      wb,
      `BaoCao_GiaoVien_${sanitizeFileToken(week, "TongHop")}.xlsx`,
    );
    showToast("Da xuat file Excel giao vien thanh cong.", "success");
  };

  globalThis.exportStudentsExcel = () => {
    if (!ensureExcelLib()) return;
    const wb = XLSX.utils.book_new();
    const rows = getStudentReportRows();

    appendSheetToWorkbook(wb, {
      sheetName: "HocSinh",
      title: "Danh sach hoc sinh",
      subtitle: "Thong tin hoc sinh va danh gia gan nhat",
      columns: [
        { key: "stt", label: "STT", width: 8 },
        { key: "maHocSinh", label: "Ma HS", width: 20 },
        { key: "hoTen", label: "Ho va ten", width: 24 },
        { key: "sdtPhuHuynh", label: "SDT phu huynh", width: 18 },
        { key: "lopDangHoc", label: "Lop dang hoc", width: 30 },
        { key: "danhGiaGanNhat", label: "Danh gia gan nhat", width: 16 },
        { key: "ghiChuDanhGia", label: "Ghi chu danh gia", width: 34 },
      ],
      rows,
    });

    exportWorkbook(wb, "BaoCao_HocSinh.xlsx");
    showToast("Da xuat file Excel hoc sinh thanh cong.", "success");
  };

  globalThis.exportAttendanceExcel = () => {
    if (!ensureExcelLib()) return;
    const period = getAttendancePeriodSelectionSafe();
    const normalizedMode =
      String(period?.mode || "").toLowerCase() === "month" ? "month" : "day";
    const normalizedPeriod = {
      ...period,
      mode: normalizedMode,
    };

    if (normalizedMode === "day" && !normalizedPeriod.date) {
      showToast("Vui long chon ngay truoc khi xuat cham cong.", "warning");
      return;
    }
    if (normalizedMode === "month" && !normalizedPeriod.month) {
      showToast("Vui long chon thang truoc khi xuat cham cong.", "warning");
      return;
    }

    const dashboard =
      typeof getAttendanceDashboardData === "function"
        ? getAttendanceDashboardData(normalizedPeriod)
        : null;
    if (!dashboard) {
      showToast("Khong tai duoc du lieu cham cong de xuat bao cao.", "error");
      return;
    }

    const statusLabelMap = {
      pending: "Cho duyet",
      approved: "Da duyet",
      rejected: "Tu choi",
    };

    const detailRows = (dashboard.requests || []).map((item, index) => {
      const teacherEmail =
        String(item.teacherEmail || "").trim() ||
        String(getTeacherInfo(item.teacherId).email || "").trim();
      return {
        stt: index + 1,
        ngay: item.attendanceDate,
        giaoVien: item.teacherName,
        email: teacherEmail,
        gioVao: item.checkInTime,
        gioRa: item.checkOutTime,
        tongGio: formatWorkedMinutesSafe(item.workedMinutes),
        trangThai: statusLabelMap[item.status] || "Cho duyet",
        taoLuc: item.createdAt
          ? new Date(item.createdAt).toLocaleString("vi-VN")
          : "",
        duyetLuc: item.reviewedAt
          ? new Date(item.reviewedAt).toLocaleString("vi-VN")
          : "",
        nguoiDuyet: item.reviewedBy || "",
        ghiChu: item.note || "",
        ghiChuDuyet: item.reviewNote || "",
      };
    });

    const summaryRows = (dashboard.teacherSummary || []).map((item, index) => ({
      stt: index + 1,
      giaoVien: item.teacherName,
      soNgayChamCong: item.totalDays || item.totalRequests,
      soNgayDaDuyet: item.approvedDays || item.approvedCount,
      tongBanGhi: item.totalRequests,
      daDuyet: item.approvedCount,
      choDuyet: item.pendingCount,
      tuChoi: item.rejectedCount,
      tongGioDuyet: formatWorkedMinutesSafe(item.workedMinutes),
    }));

    const dailyRows = (dashboard.dailySummary || []).map((item, index) => ({
      stt: index + 1,
      ngay: item.attendanceDate,
      tongBanGhi: item.totalRequests,
      daDuyet: item.approvedCount,
      choDuyet: item.pendingCount,
      tuChoi: item.rejectedCount,
      tongGioDuyet: formatWorkedMinutesSafe(item.workedMinutes),
    }));

    const periodLabel = getAttendancePeriodLabelSafe(normalizedPeriod);
    const wb = XLSX.utils.book_new();

    appendSheetToWorkbook(wb, {
      sheetName: "ChamCong_ChiTiet",
      title: "Bao cao cham cong chi tiet",
      subtitle: periodLabel,
      columns: [
        { key: "stt", label: "STT", width: 8 },
        { key: "ngay", label: "Ngay", width: 12 },
        { key: "giaoVien", label: "Giao vien", width: 24 },
        { key: "email", label: "Email", width: 28 },
        { key: "gioVao", label: "Gio vao", width: 10 },
        { key: "gioRa", label: "Gio ra", width: 10 },
        { key: "tongGio", label: "Tong gio", width: 12 },
        { key: "trangThai", label: "Trang thai", width: 14 },
        { key: "taoLuc", label: "Tao luc", width: 20 },
        { key: "duyetLuc", label: "Duyet luc", width: 20 },
        { key: "nguoiDuyet", label: "Nguoi duyet", width: 24 },
        { key: "ghiChu", label: "Ghi chu", width: 30 },
        { key: "ghiChuDuyet", label: "Ghi chu duyet", width: 30 },
      ],
      rows: detailRows,
    });

    appendSheetToWorkbook(wb, {
      sheetName: "ChamCong_TongHop",
      title: "Tong hop cham cong theo giao vien",
      subtitle: periodLabel,
      columns: [
        { key: "stt", label: "STT", width: 8 },
        { key: "giaoVien", label: "Giao vien", width: 24 },
        { key: "soNgayChamCong", label: "So ngay cham cong", width: 16 },
        { key: "soNgayDaDuyet", label: "So ngay da duyet", width: 16 },
        { key: "tongBanGhi", label: "Tong ban ghi", width: 12 },
        { key: "daDuyet", label: "Da duyet", width: 10 },
        { key: "choDuyet", label: "Cho duyet", width: 10 },
        { key: "tuChoi", label: "Tu choi", width: 10 },
        { key: "tongGioDuyet", label: "Tong gio duyet", width: 16 },
      ],
      rows: summaryRows,
    });

    appendSheetToWorkbook(wb, {
      sheetName: "ChamCong_TheoNgay",
      title: "Tong hop cham cong theo ngay",
      subtitle: periodLabel,
      columns: [
        { key: "stt", label: "STT", width: 8 },
        { key: "ngay", label: "Ngay", width: 12 },
        { key: "tongBanGhi", label: "Tong ban ghi", width: 12 },
        { key: "daDuyet", label: "Da duyet", width: 10 },
        { key: "choDuyet", label: "Cho duyet", width: 10 },
        { key: "tuChoi", label: "Tu choi", width: 10 },
        { key: "tongGioDuyet", label: "Tong gio duyet", width: 16 },
      ],
      rows: dailyRows,
    });

    const fileToken =
      normalizedMode === "month"
        ? `Thang_${sanitizeFileToken(normalizedPeriod.month, "Thang")}`
        : `Ngay_${sanitizeFileToken(normalizedPeriod.date, "Ngay")}`;

    exportWorkbook(wb, `BaoCao_ChamCong_${fileToken}.xlsx`);
    showToast("Da xuat bao cao cham cong thanh cong.", "success");
  };

  globalThis.exportMasterExcel = () => {
    if (!ensureExcelLib()) return;
    const week = getSelectedWeek();
    const attendanceOverview = week
      ? getWeekAttendanceOverview(week)
      : {
          totalSessions: 0,
          presentCount: 0,
          absentCount: 0,
          totalPresentHours: 0,
        };

    const wb = XLSX.utils.book_new();

    appendSheetToWorkbook(wb, {
      sheetName: "TongQuan",
      title: "Bao cao tong quan he thong EduTops",
      subtitle: `Tuan bao cao: ${week || "Chua chon"}`,
      columns: [
        { key: "chiSo", label: "Chi so", width: 30 },
        { key: "giaTri", label: "Gia tri", width: 18 },
      ],
      rows: [
        { chiSo: "Tong so mon hoc", giaTri: globalThis.db.subjects.length },
        { chiSo: "Tong so giao vien", giaTri: globalThis.db.teachers.length },
        { chiSo: "Tong so hoc sinh", giaTri: globalThis.db.students.length },
        { chiSo: "Tong so lop hoc", giaTri: getSelectableClasses().length },
        { chiSo: "Tong so tai khoan", giaTri: globalThis.db.accounts.length },
        { chiSo: "Tong so ca da xep", giaTri: globalThis.db.schedules.length },
        {
          chiSo: "Tong so ca trong tuan",
          giaTri: attendanceOverview.totalSessions,
        },
        { chiSo: "So ca co mat", giaTri: attendanceOverview.presentCount },
        { chiSo: "So ca vang", giaTri: attendanceOverview.absentCount },
        {
          chiSo: "Tong gio co mat",
          giaTri: formatHours(attendanceOverview.totalPresentHours),
        },
      ],
    });

    appendSheetToWorkbook(wb, {
      sheetName: "MonHoc",
      title: "Danh muc mon hoc",
      subtitle: "Danh sach mon hoc hien tai",
      columns: [
        { key: "stt", label: "STT", width: 8 },
        { key: "maMon", label: "Ma mon", width: 20 },
        { key: "tenMon", label: "Ten mon", width: 28 },
        { key: "mau", label: "Mau hien thi", width: 14 },
      ],
      rows: globalThis.db.subjects.map((subject, index) => ({
        stt: index + 1,
        maMon: subject.id,
        tenMon: subject.name,
        mau: subject.color || "",
      })),
    });

    appendSheetToWorkbook(wb, {
      sheetName: "GiaoVien",
      title: "Danh sach giao vien",
      subtitle: `Tuan bao cao: ${week || "Chua chon"}`,
      columns: [
        { key: "stt", label: "STT", width: 8 },
        { key: "maGiaoVien", label: "Ma GV", width: 20 },
        { key: "hoTen", label: "Ho va ten", width: 24 },
        { key: "gmail", label: "Gmail", width: 28 },
        { key: "soDienThoai", label: "So dien thoai", width: 16 },
        { key: "chuyenMon", label: "Chuyen mon", width: 26 },
        { key: "lopPhuTrach", label: "Lop phu trach", width: 30 },
        { key: "caTuan", label: "So ca tuan", width: 12 },
        { key: "tongCa", label: "Tong so ca", width: 12 },
        { key: "gioCoMatTuan", label: "Gio co mat tuan", width: 14 },
      ],
      rows: getTeacherReportRows(week),
    });

    appendSheetToWorkbook(wb, {
      sheetName: "HocSinh",
      title: "Danh sach hoc sinh",
      subtitle: "Thong tin hoc sinh va danh gia gan nhat",
      columns: [
        { key: "stt", label: "STT", width: 8 },
        { key: "maHocSinh", label: "Ma HS", width: 20 },
        { key: "hoTen", label: "Ho va ten", width: 24 },
        { key: "sdtPhuHuynh", label: "SDT phu huynh", width: 18 },
        { key: "lopDangHoc", label: "Lop dang hoc", width: 30 },
        { key: "danhGiaGanNhat", label: "Danh gia gan nhat", width: 16 },
        { key: "ghiChuDanhGia", label: "Ghi chu danh gia", width: 34 },
      ],
      rows: getStudentReportRows(),
    });

    appendSheetToWorkbook(wb, {
      sheetName: "LopHoc",
      title: "Danh sach lop hoc",
      subtitle: "Thong tin lop va si so",
      columns: [
        { key: "stt", label: "STT", width: 8 },
        { key: "maLop", label: "Ma lop", width: 20 },
        { key: "tenLop", label: "Ten lop", width: 20 },
        { key: "nhom", label: "Nhom", width: 14 },
        { key: "monHoc", label: "Mon hoc", width: 20 },
        { key: "siSo", label: "Si so", width: 10 },
        { key: "danhSachHocSinh", label: "Danh sach hoc sinh", width: 40 },
      ],
      rows: getSelectableClasses().map((cls, index) => ({
        stt: index + 1,
        maLop: cls.id,
        tenLop: cls.name,
        nhom: cls.groupName || "Mặc định",
        monHoc: cls.subjectId
          ? getSubjectInfo(cls.subjectId).name
          : "Theo môn của từng lịch",
        siSo: (cls.studentIds || []).length,
        danhSachHocSinh: (cls.studentIds || [])
          .map((studentId) => getStudentInfo(studentId).name)
          .join(", "),
      })),
    });

    if (week) {
      appendSheetToWorkbook(wb, {
        sheetName: "ChamCong",
        title: "Bao cao cham cong theo tuan",
        subtitle: `Tuan: ${week}`,
        columns: [
          { key: "stt", label: "STT", width: 8 },
          { key: "tuan", label: "Tuan", width: 11 },
          { key: "thu", label: "Thu", width: 11 },
          { key: "lop", label: "Lop", width: 20 },
          { key: "monHoc", label: "Mon hoc", width: 18 },
          { key: "giaoVien", label: "Giao vien", width: 24 },
          { key: "batDau", label: "Bat dau", width: 10 },
          { key: "ketThuc", label: "Ket thuc", width: 10 },
          { key: "gioDay", label: "Gio day", width: 12 },
          { key: "diaDiem", label: "Dia diem", width: 20 },
          { key: "trangThaiChamCong", label: "Trang thai", width: 14 },
          { key: "nguoiChamCong", label: "Nguoi cham cong", width: 24 },
          { key: "thoiGianCham", label: "Thoi gian cham", width: 20 },
          { key: "noiDung", label: "Noi dung", width: 28 },
        ],
        rows: getAttendanceReportRows(getAttendanceWeekSchedules(week)),
      });
    }

    exportWorkbook(
      wb,
      `BaoCao_TongHop_${sanitizeFileToken(week, "HeThong")}.xlsx`,
    );
    showToast("Da xuat bao cao tong hop thanh cong.", "success");
  };
};
