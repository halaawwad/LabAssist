-- Synthetic planned work for existing demo projects; no completed work is invented.
BEGIN;
SET search_path=labassist_student,public;
INSERT INTO project_tasks(id,seed_key,project_id,created_by,assigned_to,updated_by,title,description,due_on)
 SELECT md5('project-work-task:'||m.student_id::text)::uuid,'DEMO_TASK_'||a.seed_key,m.project_id,
 first_member.student_id,m.student_id,first_member.student_id,'Review assigned circuit connections',
 'Synthetic first-week task: inspect assigned connections and record findings.',term.starts_on+3
 FROM project_students m JOIN accounts a ON a.id=m.student_id
 JOIN projects p ON p.id=m.project_id JOIN academic_terms term ON term.id=p.term_id
 CROSS JOIN LATERAL(SELECT x.student_id FROM project_students x WHERE x.project_id=m.project_id AND x.left_at IS NULL ORDER BY x.student_id LIMIT 1) first_member
 WHERE m.left_at IS NULL AND term.is_demo AND a.seed_key LIKE 'STU%'
 ON CONFLICT(seed_key) DO NOTHING;
INSERT INTO project_issues(id,seed_key,project_id,created_by,updated_by,title,description)
 SELECT md5('project-work-issue:'||p.id::text)::uuid,'DEMO_ISSUE_'||p.seed_key,p.id,m.student_id,m.student_id,
 'Confirm sensor mounting clearance','Synthetic example only: check the available mounting space before assembly.'
 FROM (SELECT * FROM projects WHERE seed_key IS NOT NULL ORDER BY seed_key LIMIT 3) p
 CROSS JOIN LATERAL(SELECT student_id FROM project_students WHERE project_id=p.id AND left_at IS NULL ORDER BY student_id LIMIT 1) m
 JOIN academic_terms term ON term.id=p.term_id AND term.is_demo
 ON CONFLICT(seed_key) DO NOTHING;
COMMIT;
