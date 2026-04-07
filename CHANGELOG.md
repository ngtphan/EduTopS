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

## [v1.21.4] - 2026-04-07

### Changed

- Tinh chinh vi mo typography/padding cho rail mobile tren toan bo 4 man hinh:
  - `Lich day` (Board)
  - `Du lieu` (Master)
  - `Xep lich` (Form)
  - `Cham cong` (Attendance)
- Refactor block CSS mobile rail theo huong token hoa (`--ops-rail-mobile-*`) de:
  - Giam duplicate gia tri le.
  - Tranh sai lech style khi mo rong them man hinh.
  - De bao tri va review regression theo mot he scale thong nhat.
- Chuan hoa cung mot scale cho title/label/input/action (font-size, padding, gap), sau do giu lai cac ngoai le can thiet theo tung view.

### Fixed

- Khac phuc lech nhip typography/padding nho giua 4 rail tren mobile (cam giac khong deu pixel-level).
- Giam rui ro no ky thuat do hard-code nhieu con so style tai nhieu block rieng le.

### Metadata

- Dong bo version metadata/runtime/docs/package lock len `v1.21.4`.

## [v1.21.3] - 2026-04-07

### Changed

- Mo rong pattern compact rail mobile cho 2 man hinh con lai de dong nhat toan app:
  - `Xếp lịch` (Form)
  - `Chấm công` (Attendance)
- Bo sung class hook co nghia theo view (`ops-form-*`, `ops-attendance-*`) de CSS mobile duoc quan ly theo chinh sach, khong sua roi rac.
- Chuan hoa mat do control mobile o rail:
  - Rut gon tieu de/phu de rail.
  - Giam padding, font-size va khoang cach de uu tien khung noi dung chinh.
  - Group lai checklist/tac vu theo bo cuc gon hon de thao tac bang ngon tay de hon.

### Fixed

- Khac phuc do lech style mobile giua Board/Master voi Form/Attendance.
- Loai bo cam giac rail Chấm công/Xếp lịch qua dai va roi tren man hinh nho.
- Dam bao toan bo 4 man hinh quan tri chay cung mot he quy tac compact rail tren mobile.

### Metadata

- Dong bo version metadata/runtime/docs/package lock len `v1.21.3`.

## [v1.21.2] - 2026-04-06

### Changed

- Tinh gon va chuan hoa rail mobile cho 2 man hinh trong tam:
  - `Lịch dạy` (Board)
  - `Dữ liệu` (Master)
- Thay doi rail mobile theo mot mau dong deu:
  - Bo cuc field/filter gon hon, giam khoang trang du.
  - Nhom tab du lieu chuyen sang dang pill ngang (de quet nhanh, de thao tac bang ngon tay).
  - Giu nguyen hook id/onclick de tranh roi logic runtime.
- Loai bo cach dan rail mobile gay roi o ban truoc (khong con cam giac bo cuc bi "lap ghep").

### Fixed

- Khac phuc tinh trang mobile giao dien "rối và không đồng đều" o khu rail cua Lich day + Du lieu.
- Giam chieu cao rail chiem dung tren dau man hinh, uu tien dien tich hien thi noi dung chinh.
- Tang tinh nhat quan visual va kha nang mo rong: rail compact co class muc tieu ro rang, de tai su dung cho cac man khac.

### Metadata

- Dong bo version metadata/runtime/docs/package lock len `v1.21.2`.

## [v1.21.1] - 2026-04-06

### Added

- Bo sung "mobile scroll policy" o tang CSS cho toan bo admin views:
  - Ưu tien page-level scroll tren mobile/tablet nho.
  - Loai bo nested-scroll o cac container van hanh chinh (`schedule`, `attendance`, `master lists`).
- Bo sung quy tac compact rail cho mobile o Board/Attendance de giam dien tich chiem cho khu dieu huong.

### Changed

- Chuan hoa responsive behavior theo huong de bao tri:
  - Huy lock chieu cao viewport (`h-[calc(...)]`) o mobile bang override tap trung, giu desktop behavior.
  - Chuyen cac vung `ops-admin-scroll` va list co `max-height` ve che do mo rong theo noi dung tren mobile.
- Dong bo version metadata/package/docs len `v1.21.1`.

### Fixed

- Khac phuc hien tuong "khung nho cuon trong khung nho" tren mobile (nested-scroll khien noi dung kho theo doi).
- Khac phuc tinh trang rail chiem qua nhieu dien tich doc o mobile, lam man hinh hien thi noi dung qua hep.
- Dam bao cac man quan tri co the cuon toan trang de quan sat du lieu day du tren dien thoai.

## [v1.21.0] - 2026-04-06

### Added

- Bo sung bo class layout tai su dung cho kieu bo cuc rail:
  - `.ops-workspace`
  - `.ops-workspace-rail`
  - `.ops-workspace-main`
- Bo sung khu thao tac ngay trong popup chi tiet ca day (Them HS / Sua / Xoa theo quyen), de gom hanh vi mutating ve mot diem.

### Changed

- Tai cau truc 3 man hinh admin theo huong rail trai + noi dung ben phai:
  - `view-board`
  - `view-form`
  - `view-attendance`
- Dong bo template giua `public/partials` va `src/partials` cho cac view tren de tranh lech giao dien theo moi truong.
- Chuan hoa luong thao tac lich day:
  - Ngoai card uu tien "Chi tiet" va thao tac can thiet.
  - Loai bo nut `Sua`/`Xoa` trung lap o cac card va menu ngoai khi da co trong chi tiet.

### Fixed

- Giam no ky thuat giao dien do lap lai bo cuc ngang/tren giua cac man admin.
- Giam rui ro thao tac nham va UX roi rac do trung nghia hanh dong sua/xoa giua card va popup chi tiet.
- Tang kha nang bao tri/mo rong: them man admin moi co the tai dung truc tiep pattern rail ma khong can copy-paste bo cuc.

## [v1.20.0] - 2026-04-06

### Added

- Mo rong bo metrics dashboard admin theo huong van hanh thuc te:
  - health score + health level
  - do phu du lieu (tai khoan giao vien, kich hoat lop)
  - backlog rate cho cham cong
  - hang doi uu tien xu ly (`actions`) cho admin.
- Bo sung cac widget moi trong tab `Master`:
  - khung health chip/succinct summary
  - KPI `TK giáo viên`
  - thanh progress do phu + ap luc ton dong
  - danh sach uu tien xu ly trong ngay.

### Changed

- Thiet ke lai ky hon dashboard Dữ liệu (`Master`) theo huong control-center:
  - bo cuc hero + health summary + KPI + coverage + action queue.
  - toi uu visual hierarchy de admin nhin nhanh trang thai van hanh va bien dong rui ro.
- Refactor tang render dashboard trong `assets/js/app.ts`:
  - bo sung helper set progress an toan
  - tach ro nhom render: KPI, health, coverage, action queue, telemetry.
- Mo rong test cho `admin-dashboard-metrics` de giam rui ro hoi quy khi tiep tuc mo rong KPI sau nay.
- Dong bo template `view-master` giua `public/partials` va `src/partials`.
- Dong bo version metadata/runtime/docs len `v1.20.0`.

### Fixed

- Giam rui ro dashboard chi dung o muc “hien thi so lieu thuan”, thieu bo phan uu tien xu ly va danh gia suc khoe tong the.
- Giam rui ro no ky thuat tang Data dashboard: metrics/logic da dat tai shared helper + test thay vi tiep tuc tang logic ad-hoc o runtime.

## [v1.19.0] - 2026-04-06

### Added

- Bo sung design system giao dien admin theo huong tai su dung (ops shell/panel/navigation/tab state), gom cac class dung chung trong `assets/css/app.css` de dam bao de mo rong va de bao tri.
- Bo sung nhan dien role runtime tren `body` (`data-app-role`) de ho tro them style/co che dieu kien theo role ma khong can chen logic trung lap vao tung view.

### Changed

- Thiet ke lai toan bo giao dien phan admin theo huong web app van hanh thuc te:
  - Header + nav tabs duoc chuan hoa thanh bo navigation state-based, dong nhat active/inactive state.
  - Board/Form/Master/Attendance duoc dua ve cung mot he bo cuc shell + panel + toolbar de giam roi mat va de dinh huong thao tac.
  - Master tab bo sung class state chuan (`master-tab-btn-active`/`master-tab-btn-inactive`) va dong bo render runtime.
- Tai cau truc logic class state trong `assets/js/modules/render-core.ts`:
  - Loai bo hard-code class dai trong nhieu nhanh.
  - Giu class `admin-only` o tab admin ngay ca khi active de tranh roi RBAC marker trong role-switch session.
- Dong bo partial giao dien giua `public/partials` va `src/partials` cho cac khu vuc:
  - `layout/header.html`
  - `views/view-board.html`
  - `views/view-form.html`
  - `views/view-master.html`
  - `views/view-attendance.html`
- Dong bo version metadata/runtime/docs len `v1.19.0`.

### Fixed

- Giam rui ro no ky thuat giao dien do duplicate style-pattern va class hard-code phan tan.
- Giam rui ro loi an role-toggle cho cac tab admin do mat class marker khi chuyen tab.
- Tang kha nang bao hanh, mo rong them man admin moi ma khong can copy-paste style cac man hinh cu.

## [v1.18.0] - 2026-04-06

### Added

- Bo sung bo helper thuần de tinh toan KPI dashboard admin theo tuan:
  - `src/shared/lib/admin-dashboard-metrics.ts`
  - `src/shared/lib/admin-dashboard-metrics.test.ts`
- Bo sung cac chi so van hanh moi trong tab `Master`:
  - tong quan tai nguyen (mon hoc, giao vien, hoc sinh, lop, tai khoan)
  - KPI tuan (tong ca, ca cho duyet, tai gio giang, giao vien/lop hoat dong)
  - tien do duyet lich + tien do cham cong + ti le co mat
  - danh sach canh bao van hanh va top tai giang day theo giao vien.

### Changed

- Nang cap giao dien `overview` thanh dashboard admin rieng, bo cuc ro vai tro va uu tien thong tin van hanh thuc te:
  - `public/partials/views/view-master.html`
  - `src/partials/views/view-master.html`
- Refactor `renderMasterOverview` theo huong tach data-logic/render:
  - Runtime render lay metrics tu helper thuần, giam duplicate logic va de mo rong KPI ve sau.
- Mo rong security telemetry panel voi summary distinct (`action`/`reason`) ben canh tong deny event.
- Dong bo version metadata/runtime/docs len `v1.18.0`.

### Fixed

- Giam rui ro no ky thuat o tang giao dien admin: loai bo tinh trang UI tong hop qua don gian, kho theo doi van hanh theo tuan.
- Tang do ben vung bao tri: KPI duoc tinh qua helper co test, han che hoi quy khi them chi so moi o cac release sau.

## [v1.17.2] - 2026-04-05

### Added

- Hoan tat Step E dot 2: bo sung mini dashboard telemetry cho admin tai tab Tong (`Master`) de theo doi nhanh deny event theo action/reason va danh sach su kien gan nhat.
- Bo sung thao tac xoa log deny trong phien hien tai (`clearAccessDeniedEvents`) de admin debug nhanh tren runtime.
- Bo sung test tich hop role-switch + realtime snapshot update:
  - `src/features/parent-guards/model/runtime-role-switch.test.ts`

### Changed

- Mo rong `renderMasterOverview` de render security telemetry panel co dieu kien theo role `admin` va feature flag `securityTelemetryEnabled`.
- Dong bo partial giao dien `view-master` (ca `src/partials` va `public/partials`) voi khu vuc telemetry moi.

### Fixed

- Giam rui ro bo sot su kien deny khi van hanh: admin co the quan sat phan bo su kien theo action/reason va timeline su kien ngay trong UI.
- Tang do tin cay regression role-switch khi snapshot lien ket parent-student thay doi trong session realtime.

## [v1.17.1] - 2026-04-05

### Added

- Bo sung telemetry su kien `access_denied` cho cac luong deny quyen quan trong (dang nhap, mo chi tiet lich, mo tab khong du quyen, mo/submit danh gia).
- Bo sung helper runtime access-context de chuan hoa scope role-user-parentStudents va ho tro reset cache theo role switch.
- Bo sung unit test cho:
  - `src/shared/lib/access-denied-telemetry.ts`
  - `src/features/parent-guards/model/access-context.ts`

### Changed

- Dong bo scaffolding feature flag:
  - `features.securityTelemetryEnabled`
  - `features.parentDashboardEnabled`
- Runtime board RBAC gan `data-parent-dashboard-enabled` tren `body` de mo rong parent dashboard o release sau ma khong pha hanh vi hien tai.

### Fixed

- Giam rui ro mat dau vet security deny do spam event lap lai (dedupe theo fingerprint + cua so thoi gian ngan).
- Chan nguy co leak state role-scoped khi chuyen nguoi dung/role bang access scope key reset ro rang.

## [v1.17.0] - 2026-04-05

### Added

- Hoan tat Step C/D cua Feature 1 (Cong phu huynh): map role `parent` o runtime va bo guard doc du lieu theo hoc sinh duoc lien ket.
- Bo sung model guard thuần cho parent visibility:
  - `src/features/parent-guards/model/access.ts`
  - `src/features/parent-guards/model/access.test.ts`

### Changed

- Luong Board da loc lich theo quyen trung tam (admin/teacher/parent) va chan mo chi tiet ca dạy khi khong du quyen.
- Luong Attendance da them guard cho parent: chi hien thi ban ghi chấm công lien quan hoc sinh duoc lien ket.
- Modal danh gia chuyen sang read-only cho parent va chan bypass submit tu client path.
- Cap nhat tien do trong `docs/FEATURE_IMPLEMENTATION_ROADMAP.md` va dong bo version metadata/runtime + README len `v1.17.0`.

### Fixed

- Giam rui ro permission bypass khi goi truc tiep action chi tiet lich/danh gia tu runtime console.

## [v1.16.0] - 2026-04-05

### Added

- Khoi dong Feature 1 (Cong phu huynh) theo huong domain-first: bo sung model mapping `parentId -> studentIds` va guard truy cap hoc sinh cho phu huynh.
- Them type `AppRole` ho tro `parent` va schema lien ket parent-student tai tang shared type.
- Them unit test cho luong normalize mapping, kiem tra quyen truy cap, loc danh sach hoc sinh theo permission.

### Changed

- Bo sung tai lieu tien do trien khai trong `docs/FEATURE_IMPLEMENTATION_ROADMAP.md` de theo doi cac buoc Step B -> Step C/D cua Feature 1.
- Cap nhat version metadata/runtime va README len `v1.16.0`.

### Fixed

- Chua co.

## [v1.15.18] - 2026-04-05

### Added

- Bo sung tai lieu `docs/FEATURE_IMPLEMENTATION_ROADMAP.md` lam nguon ghi nho trung tam cho backlog tinh nang moi va trinh tu trien khai tung buoc.

### Changed

- Chuan hoa quy trinh them tinh nang theo huong domain-first + quality gate bat buoc (typecheck/test/build) de giam no ky thuat va loi tiem an.
- Cap nhat version metadata/runtime va README len `v1.15.18`.

### Fixed

- Chua co.

## [v1.15.17] - 2026-04-05

### Added

- Chua co.

### Changed

- Dong bo hien thi ky tuan tren toan app sang dinh dang khoang ngay `Tu ngay dd/mm/yyyy den ngay dd/mm/yyyy` de nguoi dung nhin truc tiep moc bat dau va ket thuc.
- Chuan hoa formatter ky tuan dung chung cho Board/Attendance/chi tiet lich/chinh sua lich, loai bo cach hien thi `Tuan x, yyyy` va `Tuan x/yyyy` phan manh truoc day.
- Cap nhat version metadata/runtime va README len `v1.15.17`.

### Fixed

- Tang do an toan helper tuan: validate theo dung so tuan ISO cua tung nam (khong cho token tuan khong ton tai), giam rui ro du lieu tuan sai gay loi am tham.
- Bo sung test cho khoang ngay tuan (Thu 2 -> Chu nhat), bao dam tinh dung tren bien nam.

## [v1.15.16] - 2026-04-05

### Added

- Chua co.

### Changed

- Rut gon them micro-copy trong luong quan ly hoc sinh va mot so thong bao UI de giao dien ngan gon, de doc hon nhung van du nghia thao tac.
- Dong bo version metadata/runtime va README len `v1.15.16`.

### Fixed

- Tang do an toan tao ID cho ban ghi hoc sinh/tai khoan/giao vien bang helper uu tien `crypto.randomUUID` (co fallback), giam rui ro trung ID khi thao tac nhanh.

## [v1.15.15] - 2026-04-05

### Added

- Chua co.

### Changed

- Don gon text UI tren cac view Board/Master/Attendance va cac message runtime lien quan, giu noi dung cot loi de thao tac nhanh va de nhin hon.
- Rut gon copy trong cac modal/chuc nang quan ly hoc sinh, tai khoan va QR cham cong de giao dien nhat quan va it nhieu chu hon.
- Cap nhat version metadata va version hien thi len `v1.15.15`.

### Fixed

- Giam rui ro trung ID khi tao nhanh tai khoan/giao vien/hoc sinh bang cach chuyen sang helper tao ID co them entropy ngau nhien.
- Loai bo them canh bao/style debt cuc bo trong cac file vua duoc toi uu text.

## [v1.15.14] - 2026-04-05

### Added

- Chua co.

### Changed

- Chuan hoa module quan ly giao vien theo huong dung `globalThis` thay cho `window` de dong nhat voi cac module runtime khac.
- Rut gon mot so check Gmail bang optional chain de code ngan gon, de doc hon ma khong doi hanh vi.
- Cap nhat version metadata va version hien thi len `v1.15.14`.

### Fixed

- Loai bo loat canh bao static analysis trong `teacher-management` (global object convention, optional chain, toan tu `void` du thua).

## [v1.15.13] - 2026-04-05

### Added

- Chua co.

### Changed

- Rut gon text UI o cac luong Tao/Chinh sua ca day va Chinh sua nhom ca day: bo helper text dai, rut gon label/hint, giu lai thong tin can thiet de thao tac.
- Rut gon mot so mo ta modal quan ly giao vien de man hinh gon va de tap trung vao hanh dong chinh.
- Cap nhat version metadata va version hien thi len `v1.15.13`.

### Fixed

- Loai bo canh bao static analysis do nhanh `if/else` trung logic trong `schedule-management` sau dot toi uu text.

## [v1.15.12] - 2026-04-05

### Added

- Bo sung co che toggle "Hiện danh sách/Ẩn danh sách" cho tat ca khu vuc chon giao vien/hoc sinh bang card trong luong Tao ca day va Chinh sua ca day.
- Bo sung toggle tuong tu cho khu vuc chon giao vien (va nhom/lop) trong modal Chinh sua nhom ca day de thao tac dong nhat.

### Changed

- Card giao vien/hoc sinh chi hien thi khi nguoi dung chu dong bam mo danh sach, giam roi mat va gon bo cuc khi vua mo form/modal.
- Dong bo hanh vi mo/dong danh sach card giua cac man hinh co chon giao vien/hoc sinh.
- Cap nhat version metadata va version hien thi len `v1.15.12`.

### Fixed

- Loai bo tinh trang danh sach card giao vien/hoc sinh tu bung mo ngay khi vao form, gay nhieu thong tin tren man hinh.
- Giam do lech trai nghiem giua cac modal tao/sua lich do moi noi da co cung mot kieu tuong tac click moi hien card.

## [v1.15.11] - 2026-04-05

### Added

- Bo sung giao dien chon giao vien theo card cho form Tao ca day va cac modal Chinh sua ca day/Chinh sua nhom ca day, co badge trang thai (Da chon, Chinh, Ngoai mon).
- Bo sung card picker cho nhom/lop trong modal Chinh sua nhom ca day de thao tac nhieu muc nhanh va ro rang hon.

### Changed

- Dong bo trai nghiem chon hoc sinh theo card hien dai hon trong form Tao ca day, giu co che dem so luong da chon/tong so.
- Dong bo luong submit sua ca day de ho tro payload giao vien nhieu nguoi (`teacherId` + `coTeacherIds`) tu card selection.
- Cap nhat version metadata va version hien thi len `v1.15.11`.

### Fixed

- Loai bo bat tien khi phai giu Ctrl/Command de multi-select giao vien trong ca them/sua; giam nguy co bo sot giao vien dong giang.
- Giam xung dot UX giua cac man hinh lap lich do truoc day mot so man hinh da dung card, mot so man hinh con dung select list.

## [v1.15.10] - 2026-04-05

### Added

- Bo sung helper runtime `dismissAppFormModal` de dong an toan `appFormModal` truoc khi chuyen sang cac modal overlay legacy.

### Changed

- Dong bo luong handoff modal trong cac action mo `Sua ca day`, `Sua nhom ca day`, `Chi tiet danh gia` de uu tien dong dialog top-layer dang mo truoc khi mo overlay tiep theo.
- Cap nhat version metadata va version hien thi len `v1.15.10`.

### Fixed

- Sua loi xep lop modal: `Chi tiet ca day` khong con che/sau sai thu tu voi `Chinh sua nhom ca day` va cac modal overlay tuong tu.

## [v1.15.9] - 2026-04-05

### Added

- Chua co.

### Changed

- Doi ten branding hien thi cua du an/trang web tu `CuiEduTop` sang `EduTopS` tren cau hinh runtime va cac fallback HTML (header, login overlay, loading overlay, page title, README).
- Dong bo acronym giao dien tu `CET` sang `ETS`.
- Cap nhat version metadata va version hien thi len `v1.15.9`.

### Fixed

- Loai bo sai lech ten thuong hieu giua cac man hinh/tang render khi tai partial fallback va khi apply config runtime.

## [v1.15.8] - 2026-04-05

### Added

- Bo sung data revision layer cho cac collection runtime de lam nen cho cache/index cap du lieu an toan, de theo doi khi nao can rebuild.

### Changed

- Toi uu realtime sync: chi kich hoat `requestRenderAll()` khi snapshot co thay doi du lieu thuc, bo qua metadata-only update.
- Chuyen lookup `subject/teacher/student/class` sang index map O(1) thay cho quet tuyen tinh lặp lai.
- Cache `buildAutoClassGroups` va `getSelectableClasses` theo revision de tranh rebuild khong can thiet.
- Cap nhat version metadata va version hien thi len `v1.15.8`.

### Fixed

- Giam hien tuong re-render du thua khi Firestore chi cap nhat metadata (fromCache/hasPendingWrites), nhat la luc dong bo realtime day.
- Giam rui ro nghen UI do lap lai tinh toan nhom/lop tu dong va tra cuu ID nhieu lan trong vong render lon.

## [v1.15.7] - 2026-04-05

### Added

- Chua co.

### Changed

- Dong bo class tab runtime voi class responsive goc de giu chieu cao header/tab strip on dinh khi chuyen tab.
- Cap nhat version metadata va version hien thi len `v1.15.7`.

### Fixed

- Sua hien tuong lech UI khi bam sang tab `Xep lich` do class runtime cua `switchTab` khac spacing/typography so voi markup ban dau.

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
