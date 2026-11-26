ALTER TABLE labassist_student.projects ADD COLUMN project_number TEXT;
ALTER TABLE labassist_student.projects ADD CONSTRAINT project_number_length
  CHECK (project_number IS NULL OR length(btrim(project_number)) BETWEEN 1 AND 80);
ALTER TABLE labassist_student.projects ADD CONSTRAINT project_number_per_term
  UNIQUE (term_id, project_number);

-- Each stay gets a distinct row. The existing one_current_team_per_student_per_term
-- index still enforces one active membership within a semester.
ALTER TABLE labassist_student.project_students
  DROP CONSTRAINT project_students_project_id_student_id_key;
