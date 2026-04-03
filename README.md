# EduTopS

Hệ thống quản lý vận hành trung tâm học tập, tập trung vào lịch giảng dạy, dữ liệu học vụ, chấm công và báo cáo.

Phiên bản hiện tại: v1.8.2

## Mục lục

1. [Tổng quan](#tổng-quan)
2. [Năng lực hệ thống](#năng-lực-hệ-thống)
3. [Kiến trúc và công nghệ](#kiến-trúc-và-công-nghệ)
4. [Cấu trúc thư mục](#cấu-trúc-thư-mục)
5. [Khởi chạy cục bộ](#khởi-chạy-cục-bộ)
6. [Cấu hình Firebase](#cấu-hình-firebase)
7. [Mô hình dữ liệu](#mô-hình-dữ-liệu)
8. [Phân quyền](#phân-quyền)
9. [Bảo mật và độ tin cậy](#bảo-mật-và-độ-tin-cậy)
10. [Quy chuẩn version và phát hành](#quy-chuẩn-version-và-phát-hành)
11. [Quy trình commit](#quy-trình-commit)
12. [Checklist QA trước khi push](#checklist-qa-trước-khi-push)
13. [Khắc phục sự cố](#khắc-phục-sự-cố)

## Tổng quan

EduTopS được thiết kế cho mô hình trung tâm học tập nhiều lớp, nhiều giáo viên và nhiều ca trong tuần.

Mục tiêu chính:

- Quản lý dữ liệu học vụ nhất quán.
- Xếp lịch nhanh, có kiểm soát quyền và chuyên môn.
- Chấm công có xác nhận, giảm sai lệch vận hành.
- Truy xuất báo cáo phục vụ quản trị và đối soát.

## Năng lực hệ thống

- Đăng nhập Google với Firebase Auth.
- Vai trò vận hành:
  - `admin`: toàn quyền quản trị.
  - `teacher`: thao tác trong phạm vi được cấp.
- Quản lý dữ liệu lõi:
  - Môn học.
  - Giáo viên và chuyên môn.
  - Học sinh theo khối/lớp.
  - Lớp/Nhóm học.
  - Tài khoản đăng nhập.
- Xếp lịch giảng dạy:
  - Theo tuần, ngày, khung giờ, địa điểm.
  - Lọc giáo viên theo môn học.
  - Hỗ trợ chọn nhiều giáo viên cùng chuyên môn cho cùng khung giờ (admin).
  - Chọn học sinh theo card, có thống kê sĩ số và số lượng đã chọn.
- Luồng duyệt lịch:
  - Giáo viên gửi yêu cầu tạo/sửa.
  - Admin duyệt hoặc từ chối.
- Chấm công QR cố định và duyệt bởi admin.
- Đánh giá học sinh theo từng ca dạy.
- Xuất báo cáo Excel (giáo viên, học sinh, lớp, lịch, chấm công).

## Kiến trúc và công nghệ

- Frontend: HTML + JavaScript module (không phụ thuộc framework nặng).
- UI: Tailwind CSS CDN + Lucide icons.
- Backend: Firebase Firestore + Firebase Auth.
- Báo cáo Excel: SheetJS (XLSX).

Định hướng kiến trúc:

- Tách module theo domain để giảm coupling.
- Partial HTML giúp tách view/layout rõ ràng.
- Luồng dữ liệu tập trung qua các hàm cloud save/delete để kiểm soát sanitize và validation.

## Cấu trúc thư mục

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
        data-management.js
        render-core.js
        reporting.js
        schedule-management.js
        security-utils.js
        student-grade-utils.js
        student-management.js
        subject-management.js
        teacher-management.js
        features/
          attendance/
            attendance-feature.js
  src/
    partials/
      layout/
      modals/
      overlays/
      views/
```

## Khởi chạy cục bộ

Lưu ý bắt buộc: không mở trực tiếp bằng `file://` vì ứng dụng dùng `fetch` để nạp partial.

### Cách 1: VS Code Live Server

1. Mở thư mục dự án trong VS Code.
2. Cài extension Live Server (nếu chưa có).
3. Mở `index.html` bằng Live Server.

### Cách 2: Python HTTP server

```bash
python -m http.server 5500
```

Truy cập: `http://127.0.0.1:5500`

## Cấu hình Firebase

File khởi tạo chính: `assets/js/app.js`.

Ứng dụng hỗ trợ 2 chế độ:

- Mặc định dùng `fallbackFirebaseConfig`.
- Tự động nhận biến môi trường khi host inject:
  - `__firebase_config`
  - `__app_id`
  - `__initial_auth_token`

Khuyến nghị production:

- Không hard-code config nhạy cảm ngoài phạm vi cần thiết.
- Đảm bảo Security Rules và custom claims là lớp kiểm soát chính.

## Mô hình dữ liệu

Các collection Firestore chính:

- `subjects`
- `teachers`
- `students`
- `classes`
- `schedules`
- `accounts`
- `attendanceRequests`

## Phân quyền

`admin`:

- Quản trị toàn bộ dữ liệu.
- Duyệt yêu cầu lịch/chấm công.
- Quản lý tài khoản và phân quyền.

`teacher`:

- Xem lịch trong phạm vi cá nhân.
- Gửi đề xuất tạo/sửa lịch.
- Thực hiện chấm công theo luồng được cấp.

Ghi chú quan trọng: kiểm tra quyền ở client chỉ là lớp bổ trợ UX. Quyền thực thi thật sự phải được enforce bằng Firestore Security Rules.

## Bảo mật và độ tin cậy

- Sanitize payload trước khi ghi cloud.
- Validate doc ID trước thao tác save/delete.
- Escape dữ liệu động trước khi render HTML.
- Giảm nguy cơ Excel formula injection khi export.
- Áp dụng CSP meta phù hợp để dùng CDN cần thiết.
- Loại bỏ thao tác dễ gây dữ liệu mồ côi:
  - Xóa học sinh có cascade cleanup lớp/lịch/đánh giá liên quan.

## Quy chuẩn version và phát hành

Quy ước version đang áp dụng:

- Sửa nhỏ/bugfix: tăng patch.
  - Ví dụ: `v1.8.1` -> `v1.8.2`.
- Thêm tính năng: tăng minor.
  - Ví dụ: `v1.8` -> `v1.9`.

Khi release:

1. Cập nhật version trong `assets/js/app.js`.
2. Đồng bộ version trong README.
3. Chạy kiểm tra lỗi trước commit/push.

## Quy trình commit

Khuyến nghị dùng Conventional Commits:

```text
<type>(<scope>): <summary>
```

Ví dụ:

- `feat(schedule): support multi-teacher slot assignment`
- `fix(board): stabilize weekly filter rendering`
- `docs(readme): rewrite operating documentation`

Nguyên tắc:

- Mỗi commit nên có một mục đích chính.
- Không trộn refactor, fix và docs không liên quan trong cùng commit nếu có thể tách.
- Message rõ phạm vi để dễ truy vết và rollback.

## Checklist QA trước khi push

1. Chạy app bằng web server, không dùng `file://`.
2. Kiểm tra đăng nhập và điều hướng tab.
3. Kiểm tra xếp lịch, duyệt lịch, chấm công, xuất Excel.
4. Kiểm tra trạng thái git.
5. Đảm bảo không còn lỗi compile/runtime mới.

Lệnh cơ bản:

```bash
git status --short
git add <files>
git commit -m "<message>"
git push
```

## Khắc phục sự cố

### Không tải CSS hoặc icon

- Đảm bảo đang chạy qua web server.
- Hard reload (`Ctrl + F5`).
- Kiểm tra Console để phát hiện lỗi CDN/CSP/CORS.

### Lỗi parse config Firebase

Triệu chứng thường gặp: lỗi parse JSON do biến inject không hợp lệ.

Cách xử lý:

- Kiểm tra giá trị `__firebase_config` trước khi inject.
- Đảm bảo biến không phải chuỗi rỗng/`undefined`/`null`.
- Kiểm tra extension hoặc script ngoài có can thiệp DOM/runtime hay không.
