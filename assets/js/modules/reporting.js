import { sanitizeExcelCell } from "./security-utils.js";

export const registerReportingExports = ({
  showToast,
  getSelectedWeek,
  getAttendanceWeekSchedules,
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
      .replace(/[<>:\"/\\|?*\x00-\x1F]/g, "_")
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
    return window.db.teachers.map((teacher, index) => {
      const subjectNames = (teacher.subjectIds || [])
        .map((id) => getSubjectInfo(id).name)
        .join(", ");

      const classNames = Array.from(
        new Set(
          window.db.classes
            .filter((cls) =>
              window.db.schedules.some(
                (sch) => sch.teacherId === teacher.id && sch.classId === cls.id,
              ),
            )
            .map((cls) => cls.name),
        ),
      ).join(", ");

      const weekSessions = weekSchedules.filter(
        (sch) => sch.teacherId === teacher.id,
      );
      const allSessions = window.db.schedules.filter(
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
    window.db.students.map((student, index) => {
      const classNames = window.db.classes
        .filter((cls) => (cls.studentIds || []).includes(student.id))
        .map((cls) => cls.name)
        .join(", ");
      const latestEval = getLatestStudentEvaluation(student.id);
      return {
        stt: index + 1,
        maHocSinh: student.id,
        hoTen: student.name,
        sdtPhuHuynh: student.parentPhone || "",
        lopDangHoc: classNames || "Chưa xếp lớp",
        danhGiaGanNhat: latestEval
          ? getEvalLevelMeta(latestEval.level).label
          : "Chưa đánh giá",
        ghiChuDanhGia: latestEval?.note || "",
      };
    });

  const getAttendanceReportRows = (week) =>
    getAttendanceWeekSchedules(week).map((sch, index) => {
      const teacher = getTeacherInfo(sch.teacherId);
      const cls = getClassInfo(sch.classId);
      const subject = cls ? getSubjectInfo(cls.subjectId) : { name: "" };
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
        lop: cls?.name || "Lớp đã xóa",
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

  const getAttendanceSummaryRows = (week) => {
    const schedules = getAttendanceWeekSchedules(week);
    const statsByTeacher = {};

    schedules.forEach((sch) => {
      const teacher = getTeacherInfo(sch.teacherId);
      if (!statsByTeacher[sch.teacherId]) {
        statsByTeacher[sch.teacherId] = {
          giaoVien: teacher.name,
          tongCa: 0,
          coMat: 0,
          vang: 0,
          chuaCham: 0,
          gioCoMat: 0,
        };
      }
      const row = statsByTeacher[sch.teacherId];
      row.tongCa += 1;
      const status = sch.attendance?.status || "pending";
      if (status === "present") {
        row.coMat += 1;
        row.gioCoMat += getDurationHours(sch.startTime, sch.endTime);
      } else if (status === "absent") {
        row.vang += 1;
      } else {
        row.chuaCham += 1;
      }
    });

    return Object.values(statsByTeacher)
      .sort((a, b) => b.tongCa - a.tongCa)
      .map((row, index) => ({
        stt: index + 1,
        giaoVien: row.giaoVien,
        tongCa: row.tongCa,
        coMat: row.coMat,
        vang: row.vang,
        chuaCham: row.chuaCham,
        gioCoMat: formatHours(row.gioCoMat),
      }));
  };

  window.exportTeachersExcel = () => {
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

  window.exportStudentsExcel = () => {
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

  window.exportAttendanceExcel = () => {
    if (!ensureExcelLib()) return;
    const week = getSelectedWeek();
    if (!week) {
      showToast("Vui long chon tuan truoc khi xuat cham cong.", "warning");
      return;
    }

    const detailRows = getAttendanceReportRows(week);
    const summaryRows = getAttendanceSummaryRows(week);
    const wb = XLSX.utils.book_new();

    appendSheetToWorkbook(wb, {
      sheetName: "ChamCong_ChiTiet",
      title: "Bao cao cham cong chi tiet",
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
      rows: detailRows,
    });

    appendSheetToWorkbook(wb, {
      sheetName: "ChamCong_TongHop",
      title: "Tong hop cham cong theo giao vien",
      subtitle: `Tuan: ${week}`,
      columns: [
        { key: "stt", label: "STT", width: 8 },
        { key: "giaoVien", label: "Giao vien", width: 24 },
        { key: "tongCa", label: "Tong ca", width: 10 },
        { key: "coMat", label: "Co mat", width: 10 },
        { key: "vang", label: "Vang", width: 10 },
        { key: "chuaCham", label: "Chua cham", width: 12 },
        { key: "gioCoMat", label: "Gio co mat", width: 14 },
      ],
      rows: summaryRows,
    });

    exportWorkbook(wb, `BaoCao_ChamCong_${sanitizeFileToken(week)}.xlsx`);
    showToast("Da xuat bao cao cham cong thanh cong.", "success");
  };

  window.exportMasterExcel = () => {
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
        { chiSo: "Tong so mon hoc", giaTri: window.db.subjects.length },
        { chiSo: "Tong so giao vien", giaTri: window.db.teachers.length },
        { chiSo: "Tong so hoc sinh", giaTri: window.db.students.length },
        { chiSo: "Tong so lop hoc", giaTri: window.db.classes.length },
        { chiSo: "Tong so tai khoan", giaTri: window.db.accounts.length },
        { chiSo: "Tong so ca da xep", giaTri: window.db.schedules.length },
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
      rows: window.db.subjects.map((subject, index) => ({
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
        { key: "monHoc", label: "Mon hoc", width: 20 },
        { key: "siSo", label: "Si so", width: 10 },
        { key: "danhSachHocSinh", label: "Danh sach hoc sinh", width: 40 },
      ],
      rows: window.db.classes.map((cls, index) => ({
        stt: index + 1,
        maLop: cls.id,
        tenLop: cls.name,
        monHoc: getSubjectInfo(cls.subjectId).name,
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
        rows: getAttendanceReportRows(week),
      });
    }

    exportWorkbook(
      wb,
      `BaoCao_TongHop_${sanitizeFileToken(week, "HeThong")}.xlsx`,
    );
    showToast("Da xuat bao cao tong hop thanh cong.", "success");
  };
};
