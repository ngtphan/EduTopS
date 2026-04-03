# EduTops Management System

Ứng dụng web quản lý vận hành trung tâm học tập: quản lý môn học, giáo viên, học sinh, lớp học, xếp lịch dạy, chấm công, đánh giá và xuất báo cáo Excel.

Phiên bản hiện tại: v1.8

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
  assets/
    css/
      app.css
    js/
      app.js
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
  src/
    partials/
      layout/
      views/
      overlays/
      modals/
```

## 3. Công nghệ sử dụng

- Frontend: HTML + JS module
- UI: Tailwind CDN + Lucide CDN
- Backend as a service: Firebase Auth + Firestore
- Export file: SheetJS (XLSX)

## 4. Cách chạy dự án

Luu y: khong mo truc tiep bang `file://`. Du an dung `fetch` de nap partial HTML.

### Cach 1: VS Code Live Server

1. Mo folder du an trong VS Code.
2. Cai extension Live Server (neu chua co).
3. Right click `index.html` -> Open with Live Server.

### Cach 2: Python HTTP server

```bash
python -m http.server 5500
```

Truy cap: `http://127.0.0.1:5500`

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
