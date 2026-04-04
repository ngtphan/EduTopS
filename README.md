# CuiEduTop

Ứng dụng web quản lý vận hành trung tâm học tập: quản lý môn học, giáo viên, học sinh, lớp học, xếp lịch dạy, chấm công, đánh giá và xuất báo cáo Excel.

Phiên bản hiện tại: v1.11.9

Lich su thay doi theo version: xem file CHANGELOG.md

## 1. Tính năng chính

- Đăng nhập Google (Firebase Auth)
- Phân quyền `admin` và `teacher`
- Quản lý dữ liệu:
  - Môn học
  - Giáo viên
  - Học sinh
  - Lớp học
  - Tài khoản đăng nhập
- Xếp lịch theo tuần/ngày/khung giờ
- Luồng duyệt lịch dạy:
  - Giáo viên tạo mới/chỉnh sửa lịch theo cơ chế đề xuất
  - Admin duyệt hoặc từ chối yêu cầu lịch
  - Admin có thể chỉnh sửa trực tiếp lịch đã tạo
- Chấm công QR cố định: giáo viên quét mã, nhập giờ vào/ra, admin duyệt
- Đánh giá học sinh theo buổi học
- Xuất Excel:
  - Giáo viên
  - Học sinh
  - Chấm công
  - Báo cáo tổng hợp

## 2. Kiến trúc thư mục

```text
EduTopS/
  index.html
  package.json
  vite.config.ts
  tsconfig.json
  assets/
    css/
      app.css
    js/
      app.js                # legacy runtime (transitional)
      modules/
        auth.js
        teacher-management.js
        student-management.js
        schedule-management.js
        render-core.js
        data-management.js
        subject-management.js
        reporting.js
        security-utils.js
  public/
    partials/              # static partials for runtime fetch in production
  src/
    app/
      main.ts              # TypeScript entrypoint
    shared/
      types/
    entities/
      schedule/
        model/
    features/
      schedule-merge/
      teacher-guards/
  .github/
    workflows/
      deploy-gh-pages.yml
  docs/
    ARCHITECTURE_FSD.md
```

## 3. Công nghệ sử dụng

- Frontend: Vite + TypeScript (strict) + JS migration theo giai đoạn
- UI: Tailwind CDN + Lucide CDN
- Backend as a service: Firebase Auth + Firestore
- Export file: SheetJS (XLSX)
- Test: Vitest (unit test cho pure business modules)

## 4. Cách chạy dự án

Luu y: khong mo truc tiep bang `file://`. Du an dung runtime `fetch` de nap partial HTML.

### Cach khuyen nghi (Vite + TypeScript)

```bash
npm install
npm run dev
```

Build production:

```bash
npm run build
```

Preview ban build:

```bash
npm run preview
```

Kiem tra type va test:

```bash
npm run typecheck
npm run test
```

### Cach 1: VS Code Live Server

Khong con khuyen nghi cho nhanh migration TypeScript, vi entrypoint la TS qua Vite.

### Cach 2: Python HTTP server

Khong khuyen nghi o che do phat trien TypeScript.

## 4.1 Deploy GitHub Pages

- Workflow: `.github/workflows/deploy-gh-pages.yml`
- Trigger: push len nhanh `main`
- Pipeline: `npm ci` -> `npm run typecheck` -> `npm run build` -> deploy `dist/`
- Bat buoc trong GitHub Settings -> Pages -> Build and deployment -> Source: chon `GitHub Actions`.
  Neu de Source la branch (`main`/root), trang se tai truc tiep `index.html` goc va gay loi MIME voi `src/app/main.ts`.

## 5. Cau hinh Firebase

File khoi tao: `assets/js/app.js`.

- Mac dinh su dung `fallbackFirebaseConfig`.
- Neu chay trong moi truong co inject bien toan cuc:
  - `__firebase_config`
  - `__app_id`
  - `__initial_auth_token`
    thi app se tu dong su dung bien do.

## 6. Mo hinh du lieu (Firestore collections)

- `subjects`
- `teachers`
- `students`
- `classes`
- `schedules`
- `accounts`
- `attendanceRequests`

## 7. Quyen truy cap

- `admin`:
  - Toan quyen quan tri du lieu
  - Xoa du lieu
  - Cap quyen tai khoan
- `teacher`:
  - Xem lich day cua minh
  - Thao tac theo pham vi duoc cap trong app

Luu y quan trong: phan quyen phia client chi la lop bo sung. Can cau hinh Firestore Security Rules phia server de dam bao an toan that su.

## 8. Bao mat da harden

- Sanitize payload truoc khi ghi cloud
- Validate doc id truoc khi save/delete
- Escape du lieu truoc khi render HTML dong
- Giam nguy co Excel formula injection khi export
- CSP meta duoc cau hinh de dung duoc CDN can thiet

## 9. Loi thuong gap

### Mat CSS

- Kiem tra da mo bang web server (khong phai `file://`)
- Hard reload `Ctrl + F5`
- Kiem tra Console xem co loi CORS/CSP voi CDN hay khong

### `SyntaxError: "undefined" is not valid JSON`

- Da duoc harden trong `assets/js/app.js`
- Neu van gap, thu tat extension trinh duyet dang inject script vao trang

## 10. Quy trinh commit

Xem huong dan chi tiet tai: `docs/COMMIT_GUIDE.md`

## 10.1 Kien truc FSD + Clean Boundaries

Xem tai lieu chi tiet: `docs/ARCHITECTURE_FSD.md`

## 11. Cham cong QR co dinh va duyet admin

Luong moi:

- Giao vien bam nut `Quet QR cham cong` ngay tren tab Board (giao dien chinh).
- Quet ma QR co dinh cua trung tam.
- Sau khi QR hop le, he thong mo form nhap `ngay`, `gio vao`, `gio ra`, `ghi chu`.
- Ban ghi duoc gui vao trang thai `pending` cho admin duyet.
- Admin duyet/tu choi trong tab Cham cong.

Bao cao Excel cham cong:

- Ho tro xuat theo `ngay` hoac `thang`.
- Co 3 sheet mac dinh:
  - `ChamCong_ChiTiet`
  - `ChamCong_TongHop` (theo giao vien)
  - `ChamCong_TheoNgay`
- So lieu dua tren gio vao/ra thuc te da duyet.
