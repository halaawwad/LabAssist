# Department administration

PostgreSQL 17 migration after stages 1–11.

- `sql/27-department-administration.sql`: department-head accounts, account provisioner, staff login numbers, group formation and activation.
- `tests/acceptance.sql`: transaction-based checks; all fixtures are rolled back.

Department heads create student/staff accounts and form groups. A group uses the existing project ID, `project_students` and `project_supervisors`; it has no separate name. The project title can be empty while a draft, then students supply it. Supervisors remain linked once per project. Existing account-supervisor references are retained as history only.

Students sign in with their university email. Supervisors use four-digit staff numbers; the workshop manager uses a five-digit number. Existing staff rows need their actual numbers populated before staff login. Activation stores an Argon2id hash supplied by the backend; no passwords or usable invitation tokens are seeded.

Apply the migration once to an existing database. For a fresh database, apply stages 1–11 first, then this migration. Historical seed scripts and their stage-specific tests run before this migration; new account fixtures must follow the department-head creation policy.

The initial department-head account is provisioned during server setup. Actor identities and permissions must be enforced by the authenticated backend; SQL creator references do not authenticate requests. The current web preview remains local-only.
