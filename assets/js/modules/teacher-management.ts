// @ts-nocheck
const createId = (prefix) => {
  const uuid = String(globalThis.crypto?.randomUUID?.() || "").replaceAll(
    "-",
    "",
  );
  if (uuid) return `${prefix}_${uuid}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const isValidGmail = (normalizeEmail, value) =>
  normalizeEmail(value)?.endsWith("@gmail.com");

export const registerTeacherActions = ({
  ADMIN_EMAIL,
  normalizeEmail,
  isFixedAdmin,
  getCurrentRole,
}) => {
  globalThis.grantTeacherAccount = async (teacherId) => {
    if (getCurrentRole() !== "admin")
      return alert("Bạn không có quyền thực hiện thao tác này!");

    const teacher = globalThis.db.teachers.find((t) => t.id === teacherId);
    if (!teacher) return alert("Không tìm thấy giáo viên.");

    const email = normalizeEmail(teacher.email);
    if (!isValidGmail(normalizeEmail, teacher.email))
      return alert("Giáo viên cần có Gmail hợp lệ để tạo tài khoản.");
    if (email === ADMIN_EMAIL)
      return alert(
        "Email admin cố định, không thể cấp thành tài khoản giáo viên.",
      );
    if (globalThis.db.accounts.some((a) => normalizeEmail(a.email) === email))
      return alert("Email này đã có tài khoản đăng nhập.");

    await globalThis.cloudSave("accounts", {
      id: createId("acc"),
      teacherId: teacher.id,
      name: teacher.name,
      email,
      role: "teacher",
      active: true,
      createdAt: Date.now(),
    });
  };

  globalThis.grantAdminAccount = async (email, name = "Admin phụ") => {
    if (getCurrentRole() !== "admin" || !isFixedAdmin()) {
      return alert("Chỉ admin cố định mới có quyền thêm admin phụ!");
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isValidGmail(normalizeEmail, email)) {
      return alert("Vui lòng nhập Gmail hợp lệ cho admin phụ.");
    }
    if (normalizedEmail === ADMIN_EMAIL) {
      return alert("Email này đã là admin cố định.");
    }
    if (
      globalThis.db.accounts.some(
        (a) =>
          normalizeEmail(a.email) === normalizedEmail && a.role === "admin",
      )
    ) {
      return alert("Email này đã được cấp quyền admin.");
    }

    await globalThis.cloudSave("accounts", {
      id: createId("acc"),
      name,
      email: normalizedEmail,
      role: "admin",
      active: true,
      createdAt: Date.now(),
    });
  };
};

export const registerTeacherForms = ({
  ADMIN_EMAIL,
  normalizeEmail,
  isFixedAdmin,
  getCurrentRole,
}) => {
  const escapeHtml = (value) =>
    String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const openTeacherFormModal = ({ teacher = null } = {}) => {
    const isEdit = !!teacher;
    const selectedSubjects = new Set((teacher?.subjectIds || []).map(String));
    const bodyHtml = `
      <div>
        <label class="block text-[12px] font-bold text-slate-600 mb-1">Tên giáo viên</label>
        <input name="name" type="text" value="${escapeHtml(teacher?.name || "")}" required class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-[12px] font-bold text-slate-600 mb-1">Gmail</label>
          <input name="email" type="email" value="${escapeHtml(teacher?.email || "")}" required class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
        </div>
        <div>
          <label class="block text-[12px] font-bold text-slate-600 mb-1">Số điện thoại</label>
          <input name="phone" type="tel" value="${escapeHtml(teacher?.phone || "")}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
        </div>
      </div>
      <div>
        <label class="block text-[12px] font-bold text-slate-600 mb-1">Chuyên môn</label>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto custom-scrollbar p-2 border border-slate-200 rounded-lg bg-slate-50">
          ${globalThis.db.subjects
            .map((subject) => {
              const checked = selectedSubjects.has(String(subject.id))
                ? "checked"
                : "";
              return `<label class="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" name="subjectIds" value="${escapeHtml(subject.id)}" ${checked} class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /> <span>${escapeHtml(subject.name)}</span></label>`;
            })
            .join("")}
        </div>
      </div>
      ${
        isEdit
          ? ""
          : '<label class="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" name="grantLogin" checked class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /> Cấp login</label>'
      }
    `;

    return globalThis.appFormModal({
      title: isEdit ? "Chỉnh sửa giáo viên" : "Thêm giáo viên",
      description: "",
      submitText: isEdit ? "Lưu thay đổi" : "Thêm giáo viên",
      size: "lg",
      bodyHtml,
      onSubmit: ({ form, values }) => {
        const name = String(values.name || "").trim();
        const email = normalizeEmail(values.email || "");
        const phone = String(values.phone || "").trim();
        const subjectIds = Array.from(
          form.querySelectorAll("input[name='subjectIds']:checked"),
        ).map((input) => String(input.value || ""));
        const grantLogin =
          !isEdit && !!form.querySelector("input[name='grantLogin']")?.checked;

        if (!name) {
          alert("Vui lòng nhập tên giáo viên.");
          return false;
        }
        if (!isValidGmail(normalizeEmail, values.email || "")) {
          alert("Chỉ chấp nhận tài khoản Gmail hợp lệ.");
          return false;
        }
        if (email === ADMIN_EMAIL) {
          alert("Email admin cố định, không thể dùng cho giáo viên.");
          return false;
        }
        if (subjectIds.length === 0) {
          alert("Vui lòng chọn ít nhất 1 chuyên môn.");
          return false;
        }

        const teacherEmailConflict = globalThis.db.teachers.some(
          (item) =>
            normalizeEmail(item.email) === email &&
            (!isEdit || String(item.id) !== String(teacher.id)),
        );
        if (teacherEmailConflict) {
          alert("Email giáo viên đã tồn tại.");
          return false;
        }

        return { name, email, phone, subjectIds, grantLogin };
      },
    });
  };

  const openCreateTeacherModal = async () => {
    if (getCurrentRole() !== "admin") {
      return alert("Bạn không có quyền thực hiện thao tác này!");
    }

    const payload = await openTeacherFormModal();
    if (!payload) return;

    const hasAnyAccount = globalThis.db.accounts.some(
      (account) => normalizeEmail(account.email) === payload.email,
    );
    if (payload.grantLogin && hasAnyAccount) {
      return alert("Email này đã có tài khoản đăng nhập. Không thể cấp mới.");
    }

    const newTeacher = {
      id: createId("tea"),
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      subjectIds: payload.subjectIds,
    };
    await globalThis.cloudSave("teachers", newTeacher);

    if (payload.grantLogin) {
      await globalThis.cloudSave("accounts", {
        id: createId("acc"),
        teacherId: newTeacher.id,
        name: newTeacher.name,
        email: newTeacher.email,
        role: "teacher",
        active: true,
        createdAt: Date.now(),
      });
    }
  };

  const openEditTeacherModal = async (teacherId) => {
    if (getCurrentRole() !== "admin") {
      return alert("Bạn không có quyền thực hiện thao tác này!");
    }

    const teacher = globalThis.db.teachers.find(
      (item) => String(item.id) === String(teacherId),
    );
    if (!teacher) return alert("Không tìm thấy giáo viên.");

    const payload = await openTeacherFormModal({ teacher });
    if (!payload) return;

    const oldEmail = normalizeEmail(teacher.email);
    const nextEmail = payload.email;
    const linkedTeacherAccounts = globalThis.db.accounts.filter(
      (account) =>
        account.role === "teacher" &&
        (String(account.teacherId || "") === String(teacher.id) ||
          normalizeEmail(account.email) === oldEmail),
    );
    const linkedAccountIds = new Set(linkedTeacherAccounts.map((a) => a.id));

    const accountEmailConflict = globalThis.db.accounts.some(
      (account) =>
        normalizeEmail(account.email) === nextEmail &&
        !linkedAccountIds.has(account.id),
    );
    if (accountEmailConflict) {
      return alert("Email này đã được dùng bởi tài khoản khác.");
    }

    await globalThis.cloudSave("teachers", {
      ...teacher,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      subjectIds: payload.subjectIds,
    });

    for (const account of linkedTeacherAccounts) {
      await globalThis.cloudSave("accounts", {
        ...account,
        teacherId: teacher.id,
        name: payload.name,
        email: payload.email,
      });
    }
  };

  const openGrantTeacherAccountModal = async (preferredTeacherId = "") => {
    if (getCurrentRole() !== "admin") {
      return alert("Bạn không có quyền thực hiện thao tác này!");
    }

    const teacherAccounts = globalThis.db.accounts.filter(
      (account) => account.role === "teacher",
    );
    const teacherAccountEmails = new Set(
      teacherAccounts.map((account) => normalizeEmail(account.email)),
    );
    const availableTeachers = globalThis.db.teachers.filter((teacher) => {
      const email = normalizeEmail(teacher.email);
      return email && email !== ADMIN_EMAIL && !teacherAccountEmails.has(email);
    });

    if (availableTeachers.length === 0) {
      return alert("Tất cả giáo viên hợp lệ đã có tài khoản.");
    }

    const bodyHtml = `
      <div>
        <label class="block text-[12px] font-bold text-slate-600 mb-1">Chọn giáo viên</label>
        <select name="teacherId" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
          ${availableTeachers
            .map((teacher) => {
              const selected =
                String(teacher.id) === String(preferredTeacherId || "")
                  ? "selected"
                  : "";
              return `<option value="${escapeHtml(teacher.id)}" ${selected}>${escapeHtml(teacher.name)} (${escapeHtml(teacher.email)})</option>`;
            })
            .join("")}
        </select>
      </div>`;

    const result = await globalThis.appFormModal({
      title: "Cấp tài khoản giáo viên",
      description: "",
      submitText: "Cấp tài khoản",
      bodyHtml,
      onSubmit: ({ values }) => {
        const teacherId = String(values.teacherId || "").trim();
        if (!teacherId) {
          alert("Vui lòng chọn giáo viên.");
          return false;
        }
        return { teacherId };
      },
    });

    if (!result) return;
    await globalThis.grantTeacherAccount(result.teacherId);
  };

  const openGrantAdminAccountModal = async () => {
    if (getCurrentRole() !== "admin" || !isFixedAdmin()) {
      return alert("Chỉ admin cố định mới có quyền thêm admin phụ!");
    }

    const bodyHtml = `
      <div class="grid grid-cols-1 gap-3">
        <div>
          <label class="block text-[12px] font-bold text-slate-600 mb-1">Email admin phụ</label>
          <input name="email" type="email" required placeholder="example@gmail.com" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
        </div>
        <div>
          <label class="block text-[12px] font-bold text-slate-600 mb-1">Tên hiển thị</label>
          <input name="name" type="text" value="Admin phụ" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
        </div>
      </div>`;

    const result = await globalThis.appFormModal({
      title: "Thêm admin phụ",
      description: "",
      submitText: "Thêm admin",
      bodyHtml,
      onSubmit: ({ values }) => {
        const email = normalizeEmail(values.email || "");
        const name = String(values.name || "Admin phụ").trim() || "Admin phụ";
        if (!email) {
          alert("Vui lòng nhập email admin phụ.");
          return false;
        }
        return { email, name };
      },
    });

    if (!result) return;
    await globalThis.grantAdminAccount(result.email, result.name);
  };

  globalThis.openTeacherCreateModal = openCreateTeacherModal;
  globalThis.openTeacherEditModal = openEditTeacherModal;
  globalThis.openGrantTeacherAccountModal = openGrantTeacherAccountModal;
  globalThis.openGrantAdminAccountModal = openGrantAdminAccountModal;

  const openTeacherCreateBtn = document.getElementById(
    "btnOpenTeacherCreateModal",
  );
  openTeacherCreateBtn?.addEventListener("click", openCreateTeacherModal);

  const openGrantTeacherBtn = document.getElementById(
    "btnOpenGrantTeacherAccountModal",
  );
  openGrantTeacherBtn?.addEventListener("click", openGrantTeacherAccountModal);

  const openGrantAdminBtn = document.getElementById("btnOpenGrantAdminModal");
  openGrantAdminBtn?.addEventListener("click", openGrantAdminAccountModal);
};
