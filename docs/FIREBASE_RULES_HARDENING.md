# Firebase Rules Hardening - Deploy Checklist

Muc tieu:
- Chuan hoa quy trinh deploy rules de khong lech giua code va ha tang.
- Dam bao co rollback path va audit evidence cho moi lan thay doi.

## 0) Input bat buoc truoc deploy

- Branch da merge matrix moi.
- Da update:
  - firestore.rules
  - docs/FIRESTORE_ROLE_MATRIX.md
  - test bypass ownership
- Version release da bump dung SemVer.

## 1) Pre-flight quality gate (local)

Chay full gate:
1. npm run typecheck
2. npm test
3. npm run build

Khong deploy rules neu 1 trong 3 buoc fail.

## 2) Claims readiness

Neu dung custom claims role/teacherId:
1. Chuan bi danh sach account can sync claim.
2. Chay script claims sync o mode dry-run.
3. Verify random sampling 3-5 account.
4. Chay apply mode.
5. Yeu cau user logout/login lai de refresh token.

## 3) Rules dry-run va review

1. Mo firestore.rules, review nhanh cac ham:
- isAdmin/isTeacher/isParent
- canTeacherCreateSchedule/canTeacherUpdateSchedule
- canTeacherCreateAttendanceRequest/canTeacherUpdateAttendanceRequest
2. Diff voi docs/FIRESTORE_ROLE_MATRIX.md phai 1-1.
3. Peer review toi thieu 1 nguoi (4-eyes) cho phan ownership.

## 4) Deploy production

1. Snapshot rules hien tai (copy file + tag release).
2. Deploy rules moi.
3. Ghi lai:
- deploy time
- commit hash
- nguoi deploy
- issue/ticket lien quan

## 5) Post-deploy smoke test (bat buoc)

Kich ban nhanh:
1. Admin doc/ghi/xoa schedules: pass.
2. Teacher tao pending schedule cua chinh minh: pass.
3. Teacher sua schedule khong thuoc ownership: fail (mong doi).
4. Teacher tao attendanceRequest cho teacherId khac: fail (mong doi).
5. Parent write schedules/attendanceRequests: fail (mong doi).
6. Parent read dashboard du lieu can thiet: pass.

Neu co 1 case sai ket qua mong doi: rollback ngay.

## 6) Rollback plan

1. Re-deploy file rules version truoc.
2. Clear incident channel + ghi root cause.
3. Tao task fix forward, khong hotfix vo huong.

## 7) Audit artifact sau deploy

Luu vao release note:
- commit hash rules
- role matrix version
- smoke test result screenshot/log
- nguoi phe duyet

## 8) Dinh ky hang thang

- Review drift giua runtime va rules.
- Review danh sach bypass test con thieu.
- Review bootstrap admin fallback co con can thiet hay da thay bang claims on dinh.
