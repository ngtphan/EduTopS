# Feature Implementation Roadmap (EduTopS)

Muc tieu cua file nay:

- Luu danh sach tinh nang moi da uu tien.
- Xac dinh trinh tu trien khai tung buoc, co tieu chi chat luong ro rang.
- Dam bao moi thay doi deu toi uu, han che loi tiem an ve sau (khong lam kieu "chi chay duoc").

Baseline theo doi hien tai: v1.22.1 (refactor giam cognitive complexity o dashboard/data-management, bo nested ternary, chuan hoa globalThis toan bo, 2026-04-07).

Nguyen tac bat buoc khi implement:

- Uu tien shared helper va domain model dung chung, khong duplicate logic o runtime modules.
- Moi thay doi phai co test cho happy path + edge case + regression.
- Mo rong theo chieu doc (end-to-end) tung feature nho, khong mo rong tran lan nhieu feature cung luc.
- Co canary gate cho du lieu that: fallback an toan khi gap data khong hop le.
- Moi dot sua code phai qua full gate: `npm run typecheck` + `npm test` + `npm run build`.

## 1) Backlog uu tien (theo gia tri van hanh)

P0 (lam truoc):

1. Cong phu huynh (xem lich hoc, diem danh, danh gia).
2. Nhac lich tu dong (Zalo/Email/SMS) cho hoc sinh-phu huynh-giao vien.
3. Quan ly hoc phi/cong no + nhac no theo moc.

P1 (lam ngay sau P0): 4. Payroll giao vien theo gio cong da duyet. 5. Engine kiem tra xung dot lich nang cao (teacher/class/room/time policy). 6. Audit log day du (ai, lam gi, truoc/sau, thoi diem).

P2 (toi uu van hanh): 7. Workflow duyet da cap + mau ly do tu choi. 8. Dashboard KPI (ti le vang, ti le giu chan, hieu suat giao vien, no qua han). 9. PWA/mobile cho giao vien (xem lich/cham cong nhanh). 10. Sao luu-phuc hoi 1 cham + verify toan ven.

## 2) Khuon mau trien khai tung feature (bat buoc)

Ap dung khuon nay cho moi feature moi:

### Step A - Scope va rui ro

1. Viet user story + acceptance criteria ro rang.
2. Liet ke data contract (input/output/schema).
3. Liet ke rui ro: race condition, data sai format, timezone, duplicate submit, permission bypass.
4. Chot strategy rollback.

### Step B - Domain first

1. Them/doi model o `src/entities/...` va `src/shared/types/...`.
2. Them helper thuần (pure functions) o `src/shared/lib/...`.
3. Viet unit test cho model/helper truoc (TDD nhe).

### Step C - Feature integration

1. Noi vao `src/features/...` (service/use-case).
2. Tich hop vao runtime modules `assets/js/modules/...` voi guard ro rang.
3. Co fallback UI khi du lieu thieu/sai, khong de vo man hinh.

### Step D - Data + permission

1. Kiem tra phan quyen tai entry point va write path.
2. Validate payload tai client truoc khi goi cloud write.
3. Chuan hoa idempotency (tranh ghi trung do click nhanh/retry).

### Step E - Observability

1. Them telemetry/event log toi thieu cho hanh dong quan trong.
2. Them audit event (neu feature can truy vet).
3. Co thong diep loi ngan gon cho user + thong tin ky thuat cho log.

### Step F - Quality gate

1. Chay full gate: `npm run typecheck`, `npm test`, `npm run build`.
2. Test thu cong cac case bat buoc: permission, edge data, offline/slow network.
3. Cap nhat changelog + version theo quy uoc.

## 3) Ke hoach chi tiet tung feature

## Feature 1 - Cong phu huynh (P0)

Muc tieu:

- Phu huynh xem lich hoc, diem danh, danh gia theo hoc sinh lien ket.

Trien khai de xuat:

1. Domain:

- Them `parent` role va mapping `parentId -> studentIds`.
- Them model truy cap hoc sinh theo parent (guard trung tam).

2. Data contract:

- API/read model chi tra du lieu cua hoc sinh duoc lien ket.
- Bat buoc loc theo permission ngay tu query layer.

3. UI:

- View tong quan phu huynh: lich tuan, buoi gan nhat, trang thai diem danh.
- View chi tiet danh gia theo buoi.

4. Bao mat:

- Kiem tra privilege escalation (sua URL/ID khac).
- Regression test cho data isolation.

5. Toi uu:

- Cache read-only theo parent session + invalidation khi co realtime update.

Dinh nghia hoan tat (DoD):

- Parent khong the xem du lieu hoc sinh khong lien ket.
- Time-to-first-view chap nhan duoc (muc tieu <= 1.5s voi dataset vua).

## Feature 2 - Nhac lich tu dong (P0)

Muc tieu:

- Gui nhac lich truoc buoi hoc va nhac trang thai vang/doi lich.

Trien khai de xuat:

1. Domain:

- Them `notificationJobs` va `notificationTemplates`.
- Them scheduler token idempotent theo `target + scheduleId + triggerAt`.

2. Luong gui:

- Queue -> worker -> provider adapter (Zalo/Email/SMS).
- Retry co gioi han + dead-letter.

3. Chinh sach:

- Khung gio gui hop le, tan suat gioi han, opt-out.

4. Toi uu:

- Batch send theo provider, dedupe theo key.

5. Kiem soat loi tiem an:

- Khong gui trung khi retry/redeploy.
- Alert khi ty le fail vuot nguong.

DoD:

- Ti le gui trung = 0 trong test scenario retry.
- Co dashboard theo doi sent/failed/pending.

## Feature 3 - Quan ly hoc phi/cong no (P0)

Muc tieu:

- Quan ly hoc phi theo ky, ghi nhan thanh toan, no con lai.

Trien khai de xuat:

1. Domain:

- Them `tuitionPlans`, `invoices`, `payments`, `debtSnapshots`.
- Quy tac tinh no thuần (pure function) + test bien.

2. Luong nghiep vu:

- Tao hoa don theo chu ky.
- Thanh toan mot phan/toan phan.
- Chot cong no theo ky.

3. Toi uu va an toan:

- Transaction-safe update (tranh double payment).
- Audit cho thao tac tai chinh (before/after amount).

4. Bao cao:

- Cong no theo lop/phu huynh/ky.

DoD:

- Khong am so du.
- Khong double tru no khi click nhanh/retry.

## Feature 4 - Payroll giao vien (P1)

Muc tieu:

- Tinh luong dua tren gio cong da duyet + quy tac phu cap.

Trien khai de xuat:

1. Domain:

- `payrollRules`, `timesheetSnapshots`, `payrollRuns`.

2. Cong thuc:

- Tach calculator thuần + unit test theo tung rule.

3. Kiem soat:

- Snapshot du lieu truoc khi run payroll (tranh drift realtime).
- Khoa payroll run sau khi chot.

4. Toi uu:

- Tinh toan incremental khi update nho.

DoD:

- Ket qua payroll lap lai cho cung snapshot la deterministic.

## Feature 5 - Xung dot lich nang cao (P1)

Muc tieu:

- Chan xung dot teacher/class/room/time truoc khi luu.

Trien khai de xuat:

1. Domain:

- Tong hop conflict key theo chieu teacher/class/location/time.

2. Rule engine:

- Rule co cau hinh (co/khong cho phep overlap theo role).

3. UX:

- Hien ly do xung dot ro rang + de xuat xu ly.

4. Toi uu:

- Index theo week/day/slot de check O(log n) hoac gan O(1) voi map key.

DoD:

- Khong co false-negative voi bo test xung dot can ban.

## Feature 6 - Audit log day du (P1)

Muc tieu:

- Truy vet moi thay doi quan trong.

Trien khai de xuat:

1. Audit schema:

- actor, action, target, before, after, timestamp, correlationId.

2. Integration:

- Hook vao cloud write wrapper de ghi nhat ky dong nhat.

3. Toi uu:

- Redact truong nhay cam.
- Pagination/index cho truy van nhanh.

DoD:

- Tra cuu 1 thay doi bat ky trong <= 2s voi data quy mo vua.

## 4) Trinh tu release de lam "tu tu" (khuyen nghi)

Release R1 (minor): Cong phu huynh (MVP) + nen permission.
Release R2 (minor): Nhac lich tu dong (MVP, 1 kenh chinh) + idempotency.
Release R3 (minor): Hoc phi/cong no (MVP) + debt snapshot.
Release R4 (minor): Payroll + audit log.
Release R5 (minor): Conflict engine nang cao + workflow duyet da cap.

Moi release nho:

- Chia tiep thanh cac patch de refactor/fix performance va hardening.
- Luon uu tien no-tech-debt gate truoc khi sang release tiep.

## 5) Checklist anti-loi tiem an (phai tick truoc merge)

- [ ] Co test cho edge case bien ngay/gio/timezone.
- [ ] Co test duplicate submit/retry/network flicker.
- [ ] Co test permission bypass (role/user/record ownership).
- [ ] Co migration/data backfill an toan neu doi schema.
- [ ] Co rollback plan + feature flag neu can.
- [ ] Khong duplicate business logic giua modules.
- [ ] Full gate xanh: typecheck + test + build.

## 6) Quy tac lam viec tiep theo

Tu lan sau, khi them tinh nang moi, se bat dau tu file nay theo dung trinh tu:

1. Chon 1 feature trong backlog uu tien cao nhat chua hoan tat.
2. Tao task nho theo Step A -> F.
3. Implement theo tung patch nho, moi patch deu full gate.
4. Ghi lai tien do va cap nhat file nay sau moi release.

## 7) Tien do trien khai thuc te

Trang thai hien tai:

- Baseline hien tai cua roadmap: v1.22.1.
- Da khoi dong Feature 1 (Cong phu huynh) theo huong domain-first.
- Da them model guard truy cap hoc sinh cho phu huynh o tang entity, kem unit test happy-path + edge-case.
- Da hoan tat integration role `parent` o runtime cho cac luong doc cốt loi (lich/cham cong/danh gia) theo huong read-only an toan.
- Da hoan tat Step E hardening dot 1: telemetry deny event + role-switch cache safety + feature flag scaffold cho parent dashboard.

Da hoan tat (R1-Foundation / Step B):

1. Them kieu du lieu quyen truy cap:

- `src/shared/types/access-control.ts`

2. Them bo helper thuần cho mapping parent -> student:

- `src/entities/parent/model/student-access.ts`

3. Them unit test regression:

- `src/entities/parent/model/student-access.test.ts`

Da hoan tat tiep (R1-Integration / Step C + D):

1. Mo rong auth mapping runtime voi role `parent` + xac thuc lien ket hoc sinh bat buoc:

- `assets/js/app.ts`

2. Them guard hien thi lich theo role (admin/teacher/parent) va chan truy cap chi tiet lich khong du quyen:

- `assets/js/modules/render-core.ts`

3. Them guard du lieu chấm công theo quyen parent (chi thay ban ghi lien quan hoc sinh duoc lien ket):

- `assets/js/modules/features/attendance/attendance-feature.ts`

4. Chuyen modal danh gia sang che do read-only cho parent + chan bypass submit:

- `assets/js/modules/data-management.ts`

5. Bo sung model guard thuần va unit test cho schedule/attendance visibility cua parent:

- `src/features/parent-guards/model/access.ts`
- `src/features/parent-guards/model/access.test.ts`

Da hoan tat tiep (R1-Hardening / Step E dot 1):

1. Telemetry deny event + dedupe cua so ngan:

- `src/shared/lib/access-denied-telemetry.ts`
- `src/shared/lib/access-denied-telemetry.test.ts`
- integration runtime:
  - `assets/js/app.ts`
  - `assets/js/modules/render-core.ts`
  - `assets/js/modules/data-management.ts`

2. Role-switch runtime cache safety (teacher -> parent -> admin):

- `src/features/parent-guards/model/access-context.ts`
- `src/features/parent-guards/model/access-context.test.ts`
- runtime sync:
  - `assets/js/app.ts`

3. Feature flag scaffold cho parent dashboard:

- `assets/js/config/app-config.ts` (`features.parentDashboardEnabled`)
- `assets/js/modules/render-core.ts` (gan body dataset de mo rong UI o release sau)

Da hoan tat tiep (R1-Hardening / Step E dot 2):

1. Mo rong mini dashboard telemetry cho admin trong tab Tong (`Master`), gom:

- tong deny event
- phan bo theo `action`
- phan bo theo `reason`
- danh sach su kien deny gan nhat

2. Bo sung thao tac clear log deny theo phien runtime de debug nhanh khi van hanh.

3. Bo sung test tich hop role-switch + realtime snapshot update:

- `src/features/parent-guards/model/runtime-role-switch.test.ts`

Cong viec tiep theo (R1-Step F ket thuc + chuyen R2):

1. Duy tri full gate bat buoc cho moi patch tiep theo (typecheck + test + build).
2. Chuan bi Scope Step A cho Feature 2 (Nhac lich tu dong): data contract + rui ro idempotency + retry/dead-letter.
3. Dua telemetry deny event vao audit/export layer khi can truy vet lien release.
