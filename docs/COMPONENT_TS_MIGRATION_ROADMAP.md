# Component + TypeScript Migration Roadmap

## Muc tieu

- Tach render lon thanh cac component co the tai su dung.
- Chuyen toan bo module JS sang TS theo lo trinh an toan.
- Giu app luon deploy duoc va khong tang technical debt.
- San sang migration React nhanh khi can, khong phai viet lai business logic.

## Nguyen tac ky thuat

- Khong rewrite 1 lan, migrate theo batch nho.
- Moi batch bat buoc qua: typecheck + test + build.
- Uu tien tach business logic khoi UI truoc, sau do moi doi framework.
- Utility/rule dung chung dat o `src/entities` / `src/shared` / `src/widgets`.

## Trang thai hien tai (da hoan thanh)

- Da tach model gom nhom lich + tong hop trang thai duyet ve TS boundary.
- Da bo sung test cho model nhom lich.
- Da bo sung component helper render class chips tai `src/widgets`.
- Da chuyen 3 module JS rui ro thap sang TS:
  - `assets/js/modules/security-utils.ts`
  - `assets/js/modules/student-grade-utils.ts`
  - `assets/js/modules/subject-management.ts`
- Da mo rong `tsconfig` de typecheck duoc `assets/js/**/*.ts`.

## Lo trinh de xuat

### Phase 1: Utility and Core Contracts

- Hoan tat migration toan bo utility JS nho sang TS.
- Chuan hoa types cho runtime global (`db`, `cloudSave`, modal APIs).
- Khoa hanh vi utility bang unit test.

### Phase 2: View-Model Separation

- Tach `render-core` thanh:
  - View-model builder (TS, pure)
  - DOM renderer wrappers (legacy)
- Chia component renderer theo module nho o `src/widgets/...`.
- Giam han tong ham trong `render-core` theo tung su kien.

### Phase 3: Medium Modules TS Migration

- Chuyen lan luot:
  - `auth.js`
  - `teacher-management.js`
  - `student-management.js`
  - `data-management.js`
- Moi module co facade/onboarding de giu API cu.

### Phase 4: Heavy Modules TS Migration

- Chuyen cac module lon:
  - `reporting.js`
  - `attendance-feature.js`
  - `schedule-management.js`
  - `render-core.js`
- Tach dần submodule theo domain de tranh 1 file qua lon.

### Phase 5: React-ready Adapter

- Gioi thieu layer adapter React cho 1 man hinh pilot (Board hoac Master).
- Tai su dung truc tiep model/entities/widgets da co.
- Chot guideline de co the mo rong sang cac man hinh con lai.

## Tieu chi done cho moi phase

- `npm run typecheck` pass.
- `npm run test` pass.
- `npm run build` pass.
- Khong tang canh bao static-analysis moi.
- Changelog va version duoc cap nhat theo quy uoc patch/minor.

## Rui ro va cach giam thiieu

- Rui ro drift logic giua UI cu va moi:
  - Giam thiieu bang test model + helper dung chung.
- Rui ro module lon chuyen doi gay loi an:
  - Chia nho theo feature flag/facade, khong doi API public 1 lan.
- Rui ro mismatch state realtime Firestore:
  - Tach state mapper TS va bo sung test du lieu bien.
