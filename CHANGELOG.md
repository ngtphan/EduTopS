# Changelog

Tat ca thay doi quan trong cua du an se duoc ghi tai day.

Dinh dang tham khao: Keep a Changelog
Quy uoc version: Semantic Versioning (MAJOR.MINOR.PATCH)

## [Unreleased]

### Added

- Chua co.

### Changed

- Chua co.

### Fixed

- Chua co.

## [v1.11.5] - 2026-04-04

### Changed

- Cung co xu ly thao tac lich o Board bang delegated action handler (`data-schedule-action`) de tranh mat su kien sau cac lan rerender dong.
- Tach logic kiem tra quyen ghi lich cua giao vien trong `app.js` thanh cac helper nho, giu nguyen hanh vi nhung giam do phuc tap va rui ro bao tri.
- Cap nhat tuong thich cau hinh TypeScript bang alias `@/* -> ./src/*` va xu ly deprecation phu hop voi phien ban hien tai.

### Fixed

- Sua loi chon tuan/loc lich o man hinh chinh khong phan hoi on dinh bang cach lang nghe ca `change` va `input` cho `filterWeek`.
- Loai bo nguy co bo sot listener hanh dong lich khi container duoc mount tre bang co che bind idempotent theo tung phan tu trong `render-core`.
- Ngan conflict key nhan token rac tu object bang normalize token an toan trong `conflict-key.ts`.

## [v1.11.4] - 2026-04-04

### Changed

- Dong bo format `schedule-management` de code de doc hon va on dinh style trong qua trinh refactor tiep.

### Fixed

- Dong bo lai EOF cho `package.json` va `package-lock.json` de tranh phat sinh noise diff giua cac moi truong.

## [v1.11.3] - 2026-04-04

### Changed

- Hardening `schedule-management`: chuyen toan bo truy cap runtime global sang `globalThis` de giam phu thuoc moi truong va tranh drift khi build.
- Chuan hoa luong xu ly submit/duyet/merge lich bang helper tach nho, giam do phuc tap ham lon va de bao tri ve sau.
- Chuan hoa helper hien thi/lua chon lop-hoc sinh-giao vien, bo sung xu ly null-safe cho du lieu giao vien/hoc sinh trong cac luong cap nhat.

### Fixed

- Loai bo cac mau code de gay loi tiem an (`replace` regex cu, ternary long, `hasOwnProperty.call`), giam canh bao static-analysis tren module lich.
- Tang do an toan cho `validateSchedulePatch` voi danh sach `coTeacherIds`, chan du lieu giao vien khong hop le truoc khi ghi cloud.

## [v1.11.2] - 2026-04-04

### Added

- Them unit test `conflict-key` de khoa hanh vi normalize conflict key va phat hien key rong.

### Changed

- Loai bo magic sentinel conflict key trong `schedule-management`, thay bang helper boundary `hasScheduleConflictIdentity` de giam drift logic.
- Dong bo chon conflict target qua `pickConflictTarget` thay vi truy cap `[0]` thu cong.
- Toi uu reporting: hien thi day du danh sach giao vien (teacher + coTeacherIds), va chi tinh tong hop giao vien tren lich trang thai active (`pending|approved`).
- Toi uu build Vite bang cach tach chunk `firebase` va `vendor`, giam nguy co bundle phinh to khong can thiet.

### Fixed

- Chan merge/xu ly conflict khi key conflict thieu truong dinh danh, tranh phat sinh hanh vi bat dinh khi du lieu lich chua day du.

## [v1.11.1] - 2026-04-04

### Changed

- Tiep tuc tai cau truc legacy modules de tai su dung boundary TypeScript cho schedule teacher assignment, giam duplicate helper giua `app`, `render-core`, `reporting`, `attendance-feature`.
- Dong bo hoa logic approval status ve helper chung `normalizeScheduleApprovalStatus` de tranh drift khi mo rong nghiep vu.

### Fixed

- Loai bo helper trung lap/dead code trong `schedule-management`, giam rui ro sai lech logic khi maintain.

## [v1.11.0] - 2026-04-04

### Added

- Thiet lap nen tang TypeScript + Vite voi entrypoint moi `src/app/main.ts`.
- Bo sung cau truc Feature-Sliced + Clean Boundaries tai `src/shared`, `src/entities`, `src/features`.
- Them workflow deploy GitHub Pages tu dong qua `.github/workflows/deploy-gh-pages.yml`.
- Them unit test cho logic nghiep vu quan trong (teacher assignment, conflict target, teacher delete guard).

### Changed

- Chuyen import Firebase sang package `firebase/*` de build on dinh trong pipeline Vite.
- Chuyen nguon partial runtime sang `public/partials` de bao toan fetch path tren ban build.
- Module legacy (`schedule-management`, `data-management`) da goi qua boundary TS cho cac quy tac nghiep vu nhay cam.

### Fixed

- Giam rui ro xung dot logic bang conflict strategy uu tien ro rang theo trang thai va thoi diem.
- Chan xoa giao vien khi con duoc tham chieu o ca `teacherId` va `coTeacherIds`.

## [v1.10.2] - 2026-04-04

### Changed

- Toi uu chien luoc xu ly xung dot khi tao lich trung: uu tien conflict target theo trang thai, giam nguy co ghi de khong mong muon.

### Fixed

- Khong cho teacher merge truc tiep vao ca da duyet theo cach lam mat trang thai `approved`; thay vao do tao yeu cau `pending` rieng de admin duyet hop nhat an toan.
- Chan xoa giao vien neu giao vien van duoc gan trong lich o `teacherId` hoac `coTeacherIds`, tranh mo coi du lieu lich.

## [v1.10.1] - 2026-04-04

### Added

- Ho tro ca day nhieu giao vien voi truong `coTeacherIds` trong du lieu lich.
- Cho phep giao vien chon them dong giang cung chuyen mon khi tao lich.
- Bo sung logic hop nhat danh sach giao vien khi gap ca trung thay vi tao ban ghi moi.

### Changed

- Cap nhat bo loc va hien thi Board de giao vien thay ca neu nam trong `teacherId` hoac `coTeacherIds`.
- Cap nhat quyen ghi du lieu lich de ho tro luong gui de xuat hop nhat dong giang an toan.
- Cap nhat thong ke/reporting va ngu canh attendance de tinh ca day co dong giang.

### Fixed

- Sua xung dot khi hai giao vien cung tao mot lich giong nhau va cung them doi phuong.
- Chan trung theo nhom trang thai `pending` + `approved` va xu ly hop nhat tai buoc duyet admin.

## [v1.10.0]

### Added

- Ban phat hanh co so cho bo tinh nang quan ly hoc tap, lich day, duyet lich, cham cong QR va bao cao.

### Note

- Muc nay duoc ghi nhan trong tai lieu du an va trong lich su file cau hinh hien tai, nhung chua co commit release rieng co dinh danh version.

## [v1.8] - 2026-04-03

### Added

- Ho tro xep lich da giao vien va cai thien luong quan ly lich day.
- Ho tro xoa hoc sinh theo luong xu ly cascade trong du lieu lien quan.

### Changed

- Cap nhat README va cac module board/schedule/data theo pham vi phat hanh.

### Source

- Git commit: 87ba11a (release v1.8)

## [v1.7.1] - 2026-04-02

### Added

- Nang cap trai nghiem cham cong va bo sung nang luc reporting.

### Changed

- Cap nhat cac module attendance, render-core, reporting, student-management va README.

### Source

- Git commit: e306e8c (bump v1.7.1)

## [Legacy] - truoc v1.7.1

### Note

- Cac phien ban cu hon chua co thong tin version ro rang trong commit message/tag, nen hien tai chua the dien day du ten phien ban mot cach chinh xac.
- Khi co them moc (tag release, ghi chu release, hoac commit bump version), changelog se duoc bo sung tiep.

---

## Huong dan cap nhat moi lan release

1. Tang version trong cau hinh ung dung.
2. Them muc moi len tren `Unreleased` theo format `vX.Y.Z - YYYY-MM-DD`.
3. Chuyen cac muc trong `Unreleased` sang version vua release.
4. Giu lai `Unreleased` rong cho vong phat trien tiep theo.
