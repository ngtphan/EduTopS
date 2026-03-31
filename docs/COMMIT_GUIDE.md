# Commit Guide (EduTops)

Tai lieu nay giup commit dung cach, ro pham vi, de review va rollback.

## 1. Nguyen tac

- Moi commit chi nen co mot muc dich chinh.
- Message ngan gon, co y nghia, de truy vet.
- Tach biet:
  - `refactor` (doi cau truc, khong doi hanh vi)
  - `feat` (them tinh nang)
  - `fix` (sua loi)
  - `docs` (tai lieu)

## 2. Dinh dang commit message de xuat

Su dung phong cach Conventional Commits:

```text
<type>(<scope>): <summary>
```

Vi du:

- `refactor(ui): split index into partials and modules`
- `feat(security): harden csp and sanitize cloud payloads`
- `fix(cdn): remove crossorigin to restore tailwind loading`
- `docs(readme): add setup, architecture, and troubleshooting`

## 3. Quy trinh commit chuan

```bash
git status --short
git add <files>
git commit -m "<message>"
```

Neu can bo sung mo ta dai:

```bash
git commit -m "feat(security): harden client-side safeguards" -m "- validate doc ids before cloud writes\n- sanitize payload and dynamic render content\n- guard role-based write permissions"
```

## 4. Cach tach commit cho trang thai hien tai

De xuat tach theo 3 commit:

1. Refactor cau truc giao dien/module

- `index.html`
- `assets/**`
- `src/**`

Message goi y:

```text
refactor(frontend): modularize app into partials and feature modules
```

2. Bao mat va CSP/CDN fix

- `index.html`
- `assets/js/app.js`
- `assets/js/modules/security-utils.js`
- cac module render/data/reporting lien quan

Message goi y:

```text
feat(security): harden rendering, cloud writes, and CSP compatibility
```

3. Tai lieu

- `README.md`
- `docs/COMMIT_GUIDE.md`

Message goi y:

```text
docs(project): add project documentation and commit workflow guide
```

## 5. Lenh mau de dung ngay

### Commit 1: refactor

```bash
git add index.html assets src
git commit -m "refactor(frontend): modularize app into partials and feature modules"
```

### Commit 2: security/csp

```bash
git add index.html assets/js/app.js assets/js/modules
git commit -m "feat(security): harden rendering, cloud writes, and CSP compatibility"
```

Neu ban da add trung file cho commit truoc, dung `git restore --staged <file>` de bo staged roi add lai theo nhom.

### Commit 3: docs

```bash
git add README.md docs/COMMIT_GUIDE.md
git commit -m "docs(project): add setup, architecture, and commit guide"
```

## 6. Truoc khi push

- Chay nhanh app tren Live Server
- Kiem tra login, render view, xuat Excel, va CSS
- Kiem tra `git status` phai sach

```bash
git status
git push
```
