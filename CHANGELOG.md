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

## [v1.15.6] - 2026-04-05

### Added

- Bo sung khoa viewport theo co che dem modal dang mo (nested-safe), dam bao khong leak scroll lock khi dong/mo nhanh va khi co nhieu modal long nhau.

### Changed

- Tang cuong `DialogModalService` voi fallback ESC cho duong khong native `<dialog>`, dong bo hanh vi huy modal voi luong native.
- Tang version metadata va version hien thi len `v1.15.6`.

### Fixed

- Sua race async trong `appFormModal`: ket qua submit cua session cu khong con the resolve/close nham session moi khi reopen nhanh.
- Giam rui ro roi trang thai nut submit/cancel/close khi co submit dang cho va nguoi dung mo lai modal lien tiep.

## [v1.15.5] - 2026-04-05

### Added

- Bo sung service dung chung `DialogModalService` de chuan hoa lifecycle modal cho ca `appDialog` va `appFormModal` (open/close/dismiss/focus/restore-focus).

### Changed

- Loai bo logic trung lap giua hai he modal, dua xu ly native `<dialog>` va fallback ve mot lop truu tuong duy nhat de de bao tri, de mo rong.
- Dong bo duong dong modal (ESC, click backdrop, dong chuong trinh) theo mot co che nhat quan, han che drift hanh vi theo thoi gian.
- Cap nhat version metadata va version hien thi len `v1.15.5`.

### Fixed

- Giam nguy co resolve promise khong dong nhat khi modal bi dong tu nhieu nguon khac nhau o hai he modal.
- Giam rui ro mat focus/khong phuc hoi focus khi dong modal do viec tich hop nhieu implementation rieng le.

## [v1.15.4] - 2026-04-05

### Added

- Migrate `appFormModal` sang native `<dialog>` theo cung kien truc service da ap dung cho `appConfirm/appPrompt/appSelect`.
- Bo sung style dialog form hien dai, dong bo backdrop blur va animation vao/ra, co ho tro `prefers-reduced-motion`.

### Changed

- Giu nguyen API nghiep vu `appFormModal(...)` de tranh pha vo code hien tai, chi thay engine ben duoi.
- Nang cap luong dong modal form de xu ly an toan cho cac truong hop: ESC, click backdrop, dong bang code, submit thanh cong/that bai.
- Cap nhat version metadata va version hien thi len `v1.15.4`.

### Fixed

- Giam rui ro xung dot z-index cho modal form chuan bang top-layer cua `<dialog>` thay vi phu thuoc hoan toan vao stack manager thu cong.
- Tranh resolve promise trung lap khi modal form bi dong tu nhieu duong khac nhau (programmatic close, cancel, close event).

## [v1.15.3] - 2026-04-05

### Added

- Chuyen engine `appConfirm/appPrompt/appSelect` sang native `<dialog>` (top layer) de giam xung dot xep lop modal ve mat nen tang.
- Bo sung phong cach hien dai cho dialog shell: backdrop blur nhe, panel animation vao, va ton trong `prefers-reduced-motion`.

### Changed

- Giu nguyen API nghiep vu hien tai (`appConfirm`, `appPrompt`, `appSelect`) nhung thay implementation ben duoi de tranh pha vo cac module dang su dung.
- Nang cap xu ly dong dialog theo huong an toan hon: ESC, click backdrop, dong chuong trinh va fallback native khi `showModal()` khong kha dung.
- Cap nhat version metadata va version hien thi len `v1.15.3`.

### Fixed

- Loai bo nhom rui ro tiem an do z-index stack manager doi voi confirm/prompt/select bang top-layer cua browser.
- Tranh double-resolve trong luong dong dialog, han che loi ngat quang promise khi modal dong bang nhieu duong khac nhau.

## [v1.15.2] - 2026-04-05

### Added

- Nang cap runtime modal layer manager theo thu tu mo modal tuyet doi, dam bao modal mo sau luon noi len tren modal mo truoc bat ke base z-index.

### Changed

- Dieu chinh cong thuc xep lop modal tu cong don truc tiep sang co che stride lon theo so lan mo modal de tranh xung dot giua cac nhom base z-index (160/165/170/...).
- Bo sung buoc dua modal root ve cuoi `body` truoc khi nang lop de giam rui ro stacking-context khi modal duoc gan trong host container.
- Cap nhat version metadata va version hien thi len `v1.15.2`.

### Fixed

- Sua triệt de truong hop bam `Sua nhom` trong modal chi tiet nhom day nhung modal xac nhan/cong cu sua van nam duoi modal chi tiet.
- Giam nguy co loi tiem an cho cac modal khac khi mo long nhau (dialog, form, eval, QR, schedule editor).

## [v1.15.1] - 2026-04-05

### Added

- Bo sung co che nang modal len lop hien thi truoc (runtime stack manager) de dam bao modal mo sau luon nam tren modal dang mo.

### Changed

- Tich hop co che stack modal cho cac luong mo modal quan trong: app dialog, app form, sua ca day, sua nhom ca day, danh gia buoi hoc va modal QR cham cong.
- Dong bo baseline z-index cua eval modal partial ve nhom modal nghiep vu de tranh xung dot lop hien thi khi khoi tao.
- Cap nhat version metadata va version hien thi len `v1.15.1`.

### Fixed

- Sua loi thu tu modal khi mo modal `Sua` tu modal chi tiet (modal moi bi nam duoi modal cu).
- Giam rui ro loi tiem an do z-index cung phan tan o nhieu module bang co che nang lop dong theo thu tu mo modal.

## [v1.15.0] - 2026-04-05

### Added

- Bo sung modal chinh sua `nhom ca day` chuyen biet, ho tro chon nhieu giao vien trong mot lan cap nhat.
- Bo sung reconcile nhom/lop khi sua nhom ca day (admin): co the them nhom/lop moi hoac bo nhom/lop khong con ap dung ngay trong mot lan luu.

### Changed

- Toi uu luong sua nhom ca day theo huong helper nho va typed-safe de giam do phuc tap ham, han che loi tiem an khi mo rong ve sau.
- Toi uu giao dien Board: thong nhat cach goi `Ca day`, bo cuc card gon hon, gom thao tac vao menu `Tac vu`, giam roi khi co nhieu nut.
- Cap nhat version metadata va version hien thi len `v1.15.0`.

### Fixed

- Loai bo cac canh bao static-analysis trong module quan ly lich sau refactor (bao gom complexity va string coercion risk).
- Duy tri day du hanh vi sua/xoa nhom ca day trong khi giu rang buoc an toan theo role.

## [v1.14.7] - 2026-04-05

### Added

- Chua co.

### Changed

- Cap nhat version metadata va version hien thi len `v1.14.7`.

### Fixed

- Sua triet de loi mojibake tieng Viet tren toan bo app (bao gom danh sach va cac view ngoai che do `TKB tuan`) bang bo loc phuc hoi cp1252 an toan.
- Quet lai marker mojibake toan workspace va xac nhan khong con chuoi loi trong runtime TS.
- Xac nhan full gate `typecheck`, `test`, `build` pass sau khi sua.

## [v1.14.6] - 2026-04-05

### Added

- Chua co.

### Changed

- Cap nhat version metadata va version hien thi len `v1.14.6`.

### Fixed

- Sua loi hien thi tieng Viet o Trang chinh khi xem `Ca day` dang `TKB tuan` bang cach bo sung lop phuc hoi chuoi mojibake ngay tai tang render.
- Co che phuc hoi chi kich hoat khi phat hien marker encoding loi va chi chap nhan ket qua khi marker giam va co ky tu tieng Viet, tranh lam bien dang chuoi hop le.
- Xac nhan full gate `typecheck`, `test`, `build` pass sau khi sua.

## [v1.14.5] - 2026-04-05

### Added

- Chua co.

### Changed

- Cap nhat version metadata va version hien thi len `v1.14.5`.

### Fixed

- Sua loi mojibake tieng Viet tren runtime TS sau dot migration JS -> TS (cau hinh app va cac module runtime).
- Chuan hoa lai encoding UTF-8 cho cac file anh huong de tranh loi hien thi chuoi UI.
- Xac nhan full gate `typecheck`, `test`, `build` pass sau khi sua encoding.

## [v1.14.4] - 2026-04-05

### Added

- Chua co.

### Changed

- Don dep `package.json`: xoa block cau hinh `ts-node` khong con su dung de giu metadata gon va dong nhat.
- Cap nhat version metadata va version hien thi len `v1.14.4`.

### Fixed

- On dinh lai toolchain test bang cach giu `postcss.config.js` (tranh loi nap config TypeScript trong Vitest).
- Xac nhan full gate `typecheck`, `test`, `build` deu pass sau cleanup.

## [v1.14.3] - 2026-04-05

### Added

- Them component helper `src/widgets/schedule-board/components/render-schedule-group-class-chips.ts` de tach renderer chip lop hoc khoi `render-core`.
- Them tai lieu roadmap migration `docs/COMPONENT_TS_MIGRATION_ROADMAP.md` de lap ke hoach chuyen toan bo JS sang TS va tach component theo pha.
- Them module TypeScript moi cho nhom helper rui ro thap:
  - `assets/js/modules/security-utils.ts`
  - `assets/js/modules/student-grade-utils.ts`
  - `assets/js/modules/subject-management.ts`

### Changed

- `render-core` da su dung component helper cho class chips, giam duplicate va tang kha nang tai su dung khi doi UI framework.
- Cap nhat import tai cac module de dung utility TypeScript thay vi JS o batch migration dau tien.
- Mo rong `tsconfig` include voi `assets/js/**/*.ts` de bat loi sớm cho cac module da migrate.
- Cap nhat version metadata va version hien thi len `v1.14.3`.

### Fixed

- Giam coupling renderer lon trong `render-core`, giam nguy co drift khi tiep tuc tach component.

## [v1.14.2] - 2026-04-05

### Added

- Them boundary model thuần TypeScript `src/entities/schedule/model/compact-group.ts` de gom identity ca day va tong hop trang thai duyet theo nhom.
- Them test `src/entities/schedule/model/compact-group.test.ts` de khoa hanh vi grouping/approval summary, giam rui ro regression khi doi UI framework.

### Changed

- Tach logic nhom lich khoi `render-core` ve model co test, giu `render-core` tap trung vao render va thao tac UI.
- Chuan hoa them type `ScheduleRecord` (classLabel, studentIds, topic, attendance, evaluations) de tang do an toan migration sang React.
- Cap nhat version metadata va version hien thi len `v1.14.2`.

### Fixed

- Giam coupling giua business logic va giao dien legacy, han che loi tiem an khi tai su dung logic lich o nhieu tang UI.

## [v1.14.1] - 2026-04-05

### Added

- Them tai lieu `docs/GIOI_THIEU_TRANG_WEB.md` tong hop phan tich chuc nang va luong su dung de gioi thieu website cho phu huynh/doi tac/doi van hanh.

### Changed

- Cap nhat version metadata va version hien thi len `v1.14.1` de dong bo voi tai lieu gioi thieu moi.

### Fixed

- Chua co.

## [v1.14.0] - 2026-04-05

### Changed

- Bo sung thao tac cap nhom cho lich da gom: card nhom tren Board co them nut `Sua nhom` va `Xoa nhom` (theo phan quyen).
- Bo sung thao tac nhanh trong popup `Chi tiet nhom ca day` de sua/xoa ca nhom ma khong can mo tung ca rieng le.
- Chuan hoa luong sua nhom: patch cap nhat dong loat chi tac dong cac truong chung (tuan, thu, gio, phong, mon, giao vien, noi dung), giu nguyen nhom/lop va hoc sinh tung ca.

### Fixed

- Giam rui ro ghi de du lieu lop/hoc sinh sai khi sua nhom nhieu ca bang cach gioi han pham vi cap nhat.
- Them canh bao va chan thao tac khi nguoi dung khong du quyen sua toan bo cac ca trong nhom.

## [v1.13.2] - 2026-04-05

### Changed

- Tiep tuc tinh gon giao dien theo huong toan cuc (khong chi man hinh xep lich): rut gon nhan tab dieu huong de de quet nhanh tren mobile/desktop.
- Tinh gon man hinh Master: dua cac thao tac phu (cap nhat lop dong loat, quan tri nang cao) vao khoi thu gon `Tac vu them` de giu bo cuc chinh gon va de tap trung hon.
- Tinh gon form xep lich: chuyen truong `Noi dung bai hoc` vao khoi `Tuy chon bo sung`, giu nguyen hanh vi submit va cau truc du lieu.

### Fixed

- Giam nguy co sai thao tac do qua nhieu nut hanh dong hien dong thoi o cac man hinh quan tri.
- Duy tri dong bo giao dien giua `public/partials` va `src/partials` de tranh lech hanh vi/dev-build.

## [v1.13.1] - 2026-04-05

### Changed

- Bo sung lai vung chon hoc sinh trong form xep lich sau khi chon nhom/lop, theo huong mac dinh chon tat ca nhung cho phep bo chon tung hoc sinh nghi ca.
- Them thao tac nhanh `Chon tat ca` / `Bo tat ca` va bo dem so hoc sinh duoc chon de giao vien/admin kiem soat nhanh truoc khi luu lich.

### Fixed

- Sua luong submit de uu tien danh sach hoc sinh da duoc tick trong form, khong con bat buoc lay toan bo hoc sinh cua nhom/lop trong moi truong hop.

## [v1.13.0] - 2026-04-05

### Changed

- Tiep tuc tinh gon giao dien tren nhieu man hinh: Board giu bo loc chinh, Master/Attendance dua thao tac phu vao khu `Tac vu` de giam nhieu nut hien thi dong thoi.
- Tinh gon form xep lich: bo buoc/toggle chon hoc sinh thu cong; he thong tu dong lay danh sach hoc sinh theo tung nhom/lop da chon.
- Cap nhat luong giao vien xep lich: cho phep giao vien chon nhieu nhom/lop trong mot lan tao lich va chon them dong giang cung chuyen mon, sau do gui tat ca de admin duyet.
- Dong bo huong dan va thong diep giao dien cho ca role `admin` va `teacher` de giam nham lan thao tac.

### Fixed

- Loai bo rang buoc cu chan giao vien tao nhieu nhom/lop trong mot lan submit, tranh phat sinh thao tac lap lai khong can thiet.
- Giam rui ro sai lech layout/hanh vi giua ban phat trien va ban build bang cach dong bo thay doi giua `public/partials` va `src/partials`.

## [v1.12.0] - 2026-04-05

### Changed

- Toi gian man hinh Board: dua tim kiem va chuyen doi che do xem vao khu `Bo loc nang cao`, giu bo loc tuan la thao tac chinh.
- Toi uu render lich theo huong gop ca: cac lich trung `thu + khung gio + mon + giao vien + dia diem` duoc gom thanh nhom de giam roi giao dien.
- Bo sung popup chi tiet cho nhom ca gop, cho phep mo tung ca con de xem chi tiet/cham danh gia/chinh sua/xoa theo quyen hien tai.
- Toi gian form tao lich: them che do mac dinh tu dong lay hoc sinh theo nhom/lop, an danh sach chon thu cong khi khong can.
- Rut gon phan tom tat nhom/lop tren form de giam luong thong tin hien thi ngay khi bat dau tao lich.

### Fixed

- Giam nguy co sai thao tac do danh sach card lich qua dai, dong thoi giu nguyen luong validation va approval hien co.
- Dong bo thay doi giao dien giua `public/partials` va `src/partials` de tranh lech layout giua cac moi truong.

## [v1.11.11] - 2026-04-04

### Changed

- Bo sung co che `data-control-trigger` cho wrapper bo loc o Board, cho phep tap vao toan bo vung icon/nen de mo dung control (`scheduleViewMode`, `filterWeek`) thay vi chi bam trung vao input/select.
- Them helper bind trigger idempotent trong `schedule-management` de giam nguy co duplicate listener khi co su thay doi mount flow ve sau.

### Fixed

- Sua loi tap vao wrapper bo loc "xem lich theo tuan" khong kich hoat picker o mobile; hanh vi mo picker/dropdown gio da on dinh qua fallback `showPicker -> focus/click`.

## [v1.11.10] - 2026-04-04

### Changed

- Toi uu giao dien mobile: ap dung dynamic viewport (`dvh`) cho cac tab board/master/attendance va modal dung chung de giam nhay layout khi thanh dia chi thay doi.
- Cai thien bo cuc mobile cho header, bo loc board, form len lich va nhom nut action trong modal theo huong de cham va de doc hon.
- Dong bo partial giua `public/partials` va `src/partials` de tranh lech giao dien giua moi truong dev/build.

### Fixed

- Giam hien tuong input bi zoom ngoai y muon tren iOS/Android bang cach chuan hoa `font-size` cho `input/select/textarea` o man hinh nho.
- Bo sung khoang dem safe-area ben duoi cho cac danh sach cuon de han che bi che mat noi dung.

## [v1.11.9] - 2026-04-04

### Changed

- Dong bo module dang nhap Google sang cung nguon SDK `firebase/auth` voi phan con lai cua ung dung de tranh sai lech context auth.
- Bo sung fallback tu popup sang redirect khi trinh duyet chan popup/khong ho tro popup auth.
- Nang cap map thong bao loi dang nhap de hien thi ro nhom loi `invalid action`, `operation-not-allowed`, `unauthorized-domain`.

### Fixed

- Giam loi dang nhap Google voi thong diep `The requested action is invalid.` bang cach bat va xu ly redirect-result/error code on dinh hon.

## [v1.11.8] - 2026-04-04

### Added

- Them cau hinh Tailwind build-time (`tailwind.config.js`, `postcss.config.js`) de sinh CSS qua pipeline Vite thay vi runtime CDN.

### Changed

- Chuyen nap `assets/css/app.css` vao entrypoint `src/app/main.ts` de CSS duoc bundle/optimize trong build production.
- Bo sung buoc xac thuc `dist/index.html` trong workflow deploy de chan truong hop artifact van tro den `src/app/main.ts`.
- Cap nhat huong dan deploy trong README: Pages Source phai la `GitHub Actions` de tranh publish nham source branch.
- Siết CSP, loai bo quyen khong can thiet toi `cdn.tailwindcss.com` sau khi da bo CDN script.

### Fixed

- Loai bo canh bao production `cdn.tailwindcss.com should not be used in production` tren ban build moi.
- Ngan nguy co tai nham entrypoint TypeScript trong artifact deploy (giam xac suat loi MIME khi phat hanh).

## [v1.11.7] - 2026-04-04

### Added

- Them helper dung chung `src/shared/lib/week-token.ts` + unit test de chuan hoa week token, format label va tinh ISO week tu date token.

### Changed

- Dong bo toan bo luong loc/xu ly tuan trong `app.js`, `schedule-management.js`, `render-core.js`, `attendance-feature.js` sang normalize week token truoc khi so sanh.
- Chuan hoa gia tri `type=week` khi dong bo giua `filterWeek` va `attendanceWeek`, bo sung bind listener idempotent cho `change` + `input` de giam loi khi thao tac nhanh.

### Fixed

- Sua triet de loi loc tim theo tuan khong on dinh (khong ra lich/ra sai lich) do lech dinh dang token tuan va cac diem so sanh chuoi truc tiep.
- Sua cong thuc lay tuan mac dinh ve ISO week de tranh sai lech theo nam/tuan, giam nguy co loi tiem an ve sau.

## [v1.11.6] - 2026-04-04

### Changed

- Cap nhat workflow GitHub Pages sang `actions/upload-pages-artifact@v4`, khai bao ro `name: github-pages` va tang `retention-days` de giam nguy co mat artifact khi deploy tre.
- Bo sung `permissions` ro rang cho job `deploy` de dam bao tuong thich voi yeu cau hien tai cua `actions/deploy-pages@v4`.

### Fixed

- Sua nguyen nhan deploy loi `No artifacts named "github-pages" were found` trong luong phat hanh Pages.

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
