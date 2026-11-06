# API actions (Apps Script Web App)

เรียกด้วย `POST <WEB_APP_URL>` header `Content-Type: text/plain;charset=utf-8` body JSON `{ "action": "...", "token": "...", ...params }`
หรือ `GET <WEB_APP_URL>?action=public.summary&fiscalYear=2570` สำหรับ public เท่านั้น

Response: `{ ok, data, meta: { requestId, version, serverTime }, error: { code, message, details? } }` (HTTP 200 เสมอ — ADR-001)

Types ของ request/response: `packages/domain/src/contracts.ts` (interface `Actions`)

| action | ต้องเข้าสู่ระบบ | เขียนข้อมูล (lock) | rate limit |
|---|---|---|---|
| `public.lookups` | ไม่ |  | public |
| `public.summary` | ไม่ |  | public |
| `public.projects` | ไม่ |  | public |
| `public.project` | ไม่ |  | public |
| `auth.requestAccess` | ไม่ | ใช่ | auth |
| `auth.login` | ไม่ | ใช่ | auth |
| `auth.loginSuper` | ไม่ | ใช่ | auth |
| `auth.me` | ใช่ |  | admin |
| `auth.logout` | ใช่ | ใช่ | admin |
| `admin.overview` | ใช่ |  | admin |
| `projects.list` | ใช่ |  | admin |
| `projects.get` | ใช่ |  | admin |
| `projects.create` | ใช่ | ใช่ | admin |
| `projects.update` | ใช่ | ใช่ | admin |
| `projects.delete` | ใช่ | ใช่ | admin |
| `activities.create` | ใช่ | ใช่ | admin |
| `activities.update` | ใช่ | ใช่ | admin |
| `allocations.create` | ใช่ | ใช่ | admin |
| `allocations.void` | ใช่ | ใช่ | admin |
| `disbursements.create` | ใช่ | ใช่ | admin |
| `disbursements.setStatus` | ใช่ | ใช่ | admin |
| `disbursements.void` | ใช่ | ใช่ | admin |
| `progress.create` | ใช่ | ใช่ | admin |
| `files.upload` | ใช่ | ใช่ | import |
| `files.ocrCoverLetter` | ใช่ | ใช่ | import |
| `imports.upload` | ใช่ | ใช่ | import |
| `imports.remap` | ใช่ | ใช่ | import |
| `imports.get` | ใช่ |  | admin |
| `imports.list` | ใช่ |  | admin |
| `imports.commit` | ใช่ | ใช่ | import |
| `imports.cancel` | ใช่ | ใช่ | admin |
| `imports.errorsCsv` | ใช่ |  | admin |
| `plans.preview` | ใช่ | ใช่ | import |
| `plans.commit` | ใช่ | ใช่ | import |
| `plans.list` | ใช่ |  | admin |
| `plans.get` | ใช่ |  | admin |
| `plans.assign` | ใช่ | ใช่ | admin |
| `plans.unassign` | ใช่ | ใช่ | admin |
| `admin.requests` | ใช่ |  | admin |
| `admin.decideRequest` | ใช่ | ใช่ | admin |
| `admin.users` | ใช่ |  | admin |
| `admin.saveUser` | ใช่ | ใช่ | admin |
| `admin.setUserStatus` | ใช่ | ใช่ | admin |
| `admin.loginReport` | ใช่ |  | admin |
| `admin.audit` | ใช่ |  | admin |
| `admin.health` | ใช่ |  | admin |
| `admin.saveSettings` | ใช่ | ใช่ | admin |
| `admin.saveMaster` | ใช่ | ใช่ | admin |
| `admin.rebuildSnapshot` | ใช่ | ใช่ | admin |

## Error codes

`AUTH_REQUIRED`, `TOKEN_EXPIRED`, `TOKEN_REVOKED`, `ACCOUNT_PENDING`, `ACCOUNT_SUSPENDED`, `LOGIN_THROTTLED`, `REAUTH_REQUIRED`, `FORBIDDEN_SCOPE`, `NOT_FOUND`, `VERSION_CONFLICT`, `VALIDATION_FAILED`, `DUPLICATE_IMPORT`, `IMPORT_REVIEW_REQUIRED`, `BUDGET_EXCEEDED`, `BUSY_RETRY`, `QUOTA_RETRY`, `UNKNOWN_ACTION`, `INTERNAL_ERROR`
