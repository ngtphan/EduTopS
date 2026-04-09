# Firestore Role Matrix (v1.22.0)

Muc tieu:
- Tach ro quyen theo role de review nhanh.
- Dong bo matrix voi file firestore.rules, tranh drift giua code va ha tang.

## 1) Scope duong dan du lieu

Rules ap dung cho ca 2 path:
- Root: /{collection}/{docId}
- Canvas namespace: /artifacts/{appId}/public/data/{collection}/{docId}

## 2) Matrix tong quan

| Collection | admin | teacher | parent |
|---|---|---|---|
| subjects | R/W/D | R | R |
| teachers | R/W/D | R | R |
| students | R/W/D | R | R |
| classes | R/W/D | R | R |
| schedules | R/W/D | R + write co ownership | R |
| attendanceRequests | R/W/D | R + write co ownership | R |
| accounts | R/W/D | R | R |
| settings | R/W/D | R | R |

Ghi chu:
- R: read, W: create/update, D: delete.
- Teacher khong co quyen delete.
- Parent khong co quyen write/delete.

## 3) Ownership rules quan trong

### schedules (teacher write)
- Teacher chi duoc create khi approval.status = pending.
- Teacher phai duoc gan vao schedule (teacherId hoac coTeacherIds).
- Update pending: cac field protected giu nguyen (week/day/time/location/class/studentIds/subject/topic/attendance/evaluations).
- Update approved: teacher chi duoc giu nguyen protected fields va khong duoc sua review metadata.

### attendanceRequests (teacher write)
- teacherId phai khop actor (auth uid hoac claim teacherId).
- status teacher write bat buoc la pending.
- reviewedBy/reviewedAt/reviewNote phai null.
- submittedAtServer/reviewedAtServer/updatedAtServer bi cam tu client.
- id phai theo convention: teacherId_attendanceDate.
- Update chi hop le khi ban ghi truoc do bi rejected va cung owner/cung ngay.

## 4) Admin bootstrap

Ngoai role claim admin, email bootstrap admin duoc fallback:
- ngoctaiphan.edu@gmail.com

Muc dich: tranh lock-out khi chua sync custom claims.

## 5) Nguyen tac bao tri

- Moi thay doi role matrix phai sua dong thoi:
  1) firestore.rules
  2) file nay (FIRESTORE_ROLE_MATRIX.md)
  3) test bypass ownership o src/shared/lib/firestore-role-matrix.test.ts
- Neu matrix doi theo huong harden read-level (dac biet accounts), phai co migration plan de runtime khong can list full accounts.
