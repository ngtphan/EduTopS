export const registerTeacherActions = ({
  ADMIN_EMAIL,
  normalizeEmail,
  isFixedAdmin,
  getCurrentRole,
  getCurrentUser,
}) => {
  window.grantTeacherAccount = async (teacherId) => {
    if (getCurrentRole() !== "admin")
      return alert("Bạn không có quyền thực hiện thao tác này!");

    const teacher = window.db.teachers.find((t) => t.id === teacherId);
    if (!teacher) return alert("Không tìm thấy giáo viên.");

    const email = normalizeEmail(teacher.email);
    if (!email || !email.endsWith("@gmail.com"))
      return alert("Giáo viên cần có Gmail hợp lệ để tạo tài khoản.");
    if (email === ADMIN_EMAIL)
      return alert(
        "Email admin cố định, không thể cấp thành tài khoản giáo viên.",
      );
    if (window.db.accounts.some((a) => normalizeEmail(a.email) === email))
      return alert("Email này đã có tài khoản đăng nhập.");

    await window.cloudSave("accounts", {
      id: "acc_" + Date.now(),
      teacherId: teacher.id,
      name: teacher.name,
      email,
      role: "teacher",
      active: true,
      createdAt: Date.now(),
    });
  };

  window.grantAdminAccount = async (email, name = "Admin phụ") => {
    if (getCurrentRole() !== "admin" || !isFixedAdmin()) {
      return alert("Chỉ admin cố định mới có quyền thêm admin phụ!");
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !normalizedEmail.endsWith("@gmail.com")) {
      return alert("Vui lòng nhập Gmail hợp lệ cho admin phụ.");
    }
    if (normalizedEmail === ADMIN_EMAIL) {
      return alert("Email này đã là admin cố định.");
    }
    if (
      window.db.accounts.some(
        (a) =>
          normalizeEmail(a.email) === normalizedEmail && a.role === "admin",
      )
    ) {
      return alert("Email này đã được cấp quyền admin.");
    }

    await window.cloudSave("accounts", {
      id: "acc_" + Date.now(),
      name,
      email: normalizedEmail,
      role: "admin",
      active: true,
      createdAt: Date.now(),
    });
  };

  // Keep reference to ensure closures include current user state when module initializes.
  void getCurrentUser;
};

export const registerTeacherForms = ({
  ADMIN_EMAIL,
  normalizeEmail,
  getCurrentRole,
}) => {
  document
    .getElementById("teacherForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("tea_name").value.trim();
      const email = normalizeEmail(document.getElementById("tea_email").value);
      const phone = document.getElementById("tea_phone").value.trim();
      const grantLogin = document.getElementById("tea_grantLogin").checked;
      const subjectIds = Array.from(
        document.querySelectorAll("#tea_subjectTags input:checked"),
      ).map((cb) => cb.value);

      if (subjectIds.length === 0) return alert("Vui lòng cấp chuyên môn!");
      if (!email.endsWith("@gmail.com"))
        return alert("Chỉ chấp nhận tài khoản Gmail hợp lệ.");
      if (email === ADMIN_EMAIL)
        return alert("Email admin cố định, không thể dùng cho giáo viên.");
      if (window.db.teachers.some((t) => normalizeEmail(t.email) === email))
        return alert("Email giáo viên đã tồn tại!");
      if (name && email) {
        const newTeacher = {
          id: "tea_" + Date.now(),
          name,
          email,
          phone,
          subjectIds,
        };

        await window.cloudSave("teachers", newTeacher);

        if (
          grantLogin &&
          !window.db.accounts.some((a) => normalizeEmail(a.email) === email)
        ) {
          await window.cloudSave("accounts", {
            id: "acc_" + Date.now(),
            teacherId: newTeacher.id,
            name: newTeacher.name,
            email,
            role: "teacher",
            active: true,
            createdAt: Date.now(),
          });
        }

        document.getElementById("teacherForm").reset();
        document.getElementById("tea_grantLogin").checked = true;
      }
    });

  document
    .getElementById("accountForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      if (getCurrentRole() !== "admin")
        return alert("Bạn không có quyền thực hiện thao tác này!");

      const teacherId = document.getElementById("acc_teacherId").value;
      if (!teacherId) return alert("Vui lòng chọn giáo viên để cấp tài khoản.");

      const teacher = window.db.teachers.find((t) => t.id === teacherId);
      if (!teacher) return alert("Không tìm thấy giáo viên.");

      const email = normalizeEmail(teacher.email);
      if (!email || !email.endsWith("@gmail.com"))
        return alert("Giáo viên cần có Gmail hợp lệ để tạo tài khoản.");
      if (email === ADMIN_EMAIL)
        return alert(
          "Email admin cố định, không thể cấp thành tài khoản giáo viên.",
        );
      if (window.db.accounts.some((a) => normalizeEmail(a.email) === email))
        return alert("Email này đã có tài khoản đăng nhập.");

      await window.grantTeacherAccount(teacher.id);

      document.getElementById("accountForm").reset();
    });

  document
    .getElementById("adminAccountForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("new_admin_email").value;
      if (!email) return alert("Vui lòng nhập email admin phụ.");
      await window.grantAdminAccount(email, "Admin phụ");
      document.getElementById("adminAccountForm").reset();
    });
};
