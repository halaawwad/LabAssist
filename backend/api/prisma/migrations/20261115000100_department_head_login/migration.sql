SET search_path=labassist_student,public;
ALTER TABLE accounts DROP CONSTRAINT employee_login_number;
ALTER TABLE accounts ADD CONSTRAINT employee_login_number CHECK(
 employee_number IS NULL OR
 (role='SUPERVISOR' AND employee_number ~ '^[0-9]{4}$') OR
 (role='WORKSHOP_MANAGER' AND employee_number ~ '^[0-9]{5}$') OR
 (role='DEPARTMENT_HEAD' AND employee_number='0'));
ALTER TABLE accounts DROP CONSTRAINT head_identity;
ALTER TABLE accounts ADD CONSTRAINT head_identity CHECK(role<>'DEPARTMENT_HEAD' OR
 (university_number IS NULL AND account_supervisor_id IS NULL AND
 (employee_number IS NULL OR employee_number='0')));
