# Kien truc Feature-Sliced + Clean Boundaries

Tai lieu nay mo ta kien truc moi cua du an sau khi chuyen sang TypeScript + Vite.

## 1) Muc tieu

- Tach nghiep vu theo feature de giam coupling.
- Gioi han side-effect o boundary ro rang.
- Dam bao deploy static tren GitHub Pages.
- Ho tro migration an toan tu code legacy JS.

## 2) Cau truc lop

- `src/app`: bootstrap app, provider, startup flow.
- `src/shared`: type chung, helper chung, config chung.
- `src/entities`: model nghiep vu co ban (pure logic).
- `src/features`: use-case nghiep vu theo luong.
- `src/widgets`: khoi UI tong hop tu nhieu feature.
- `src/pages`: route/page composition.

## 3) Quy tac boundary

1. `shared` khong import tu layer tren.
2. `entities` chi import tu `shared`.
3. `features` chi import tu `entities` + `shared`.
4. `widgets` chi import tu `features` + `entities` + `shared`.
5. `pages` va `app` la diem ghep cao nhat.
6. Khong de business rule nam trong UI rendering thuong.

## 4) Transitional strategy

- `src/app/main.ts` dang bootstrap app legacy de dam bao khong vo luong hien tai.
- Logic nhay cam da duoc tach sang module TS:
  - schedule teacher assignment
  - conflict target selection
  - teacher delete guard
- Cac module JS legacy goi vao TS boundary trong qua trinh migration dan.

## 5) Chien luoc chong loi tiem an

- Rule nghiep vu quan trong duoc viet thanh ham pure co test.
- Truong hop race/same-slot duoc uu tien strategy ro rang.
- Xoa giao vien duoc chan tham chieu mo coi ca teacherId/coTeacherIds.
- TypeScript strict + typecheck gate trong CI.

## 6) Deploy GitHub Pages

- Build bang Vite tao static `dist/`.
- Workflow `.github/workflows/deploy-gh-pages.yml` tu dong deploy khi push `main`.
- HTML partial duoc phuc vu qua `public/partials` de dung voi runtime `fetch`.
