BEGIN;
SET search_path=labassist_student,public;
CREATE FUNCTION pg_temp.ok(label TEXT,condition BOOLEAN) RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label; END IF;RETURN 'PASS: '||label;END $$;
CREATE FUNCTION pg_temp.reject(label TEXT,statement TEXT,expected TEXT) RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
 BEGIN EXECUTE statement;
 EXCEPTION WHEN OTHERS THEN
  IF position(lower(expected) IN lower(SQLERRM))=0 THEN RAISE EXCEPTION 'FAILED %: unexpected %',label,SQLERRM; END IF;
  RETURN 'PASS: '||label;
 END;
 RAISE EXCEPTION 'FAILED: % was accepted',label;
END $$;
CREATE FUNCTION pg_temp.weekly(progress INT DEFAULT 25) RETURNS JSONB LANGUAGE sql AS $$
 SELECT jsonb_build_object('work','Connected and checked the sensor.','progress',progress,'progressNote','Initial testing.',
 'tasks','Validate the sensor connection.','hasDelays',false,'delayReason','','delayAction','','problems','','plan','Measure repeatability next week.')
$$;
CREATE FUNCTION pg_temp.final_content(title TEXT DEFAULT 'Snapshot A',image UUID DEFAULT NULL) RETURNS JSONB LANGUAGE sql AS $$
 SELECT jsonb_build_object('meta',jsonb_build_object('title',title),'sections',jsonb_build_array(
 jsonb_build_object('id','background','title','Theoretical Background','blocks',
 (SELECT jsonb_agg(jsonb_build_object('id','p'||n,'kind','paragraph','text','A long section may continue over any number of rendered pages.')) FROM generate_series(1,120) n)),
 jsonb_build_object('id','results','title','Results','blocks',CASE WHEN image IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_build_object('id','photo','kind','image','file_id',image)) END)))
$$;
CREATE FUNCTION pg_temp.deck() RETURNS JSONB LANGUAGE sql AS $$
 SELECT '{"title":"Team presentation","slides":[{"id":"cover","title":"Prototype","objects":[{"id":"text-1","kind":"text","x":713.5,"y":33.25,"width":245,"height":100,"text":"Free placement"}]},{"id":"results","title":"Validation","objects":[]}]}'::jsonb
$$;
CREATE TEMP TABLE f AS
 SELECT p.id AS project_id,p.term_id,
 (SELECT student_id FROM project_students WHERE project_id=p.id ORDER BY student_id LIMIT 1) AS owner,
 (SELECT student_id FROM project_students WHERE project_id=p.id ORDER BY student_id OFFSET 1 LIMIT 1) AS teammate,
 (SELECT student_id FROM project_students WHERE project_id<>p.id AND term_id=p.term_id LIMIT 1) AS outsider,
 (SELECT supervisor_id FROM project_supervisors WHERE project_id=p.id ORDER BY supervisor_id LIMIT 1) AS supervisor,
 (SELECT a.id FROM accounts a WHERE a.role='SUPERVISOR' AND NOT EXISTS(SELECT 1 FROM project_supervisors WHERE project_id=p.id AND supervisor_id=a.id)
  AND (SELECT count(*) FROM project_supervisors ps JOIN projects x ON x.id=ps.project_id WHERE ps.supervisor_id=a.id AND x.term_id=p.term_id)<4 ORDER BY a.id LIMIT 1) AS second_supervisor
 FROM projects p WHERE p.seed_key='TEAM01';
CREATE TEMP TABLE ids(key TEXT PRIMARY KEY,id UUID NOT NULL);
INSERT INTO accounts(id,role,full_name,email,status) VALUES('44000000-0000-4000-8000-000000000001','SUPERVISOR','Other report reviewer','report.other@najah.edu','REFERENCE_ONLY');
INSERT INTO project_supervisors(project_id,supervisor_id) SELECT project_id,second_supervisor FROM f;
SET CONSTRAINTS ALL IMMEDIATE;

SELECT pg_temp.ok('twenty structural templates, independent of colors',(SELECT count(*)=20 AND count(DISTINCT design->>'layout_key')=20 FROM presentation_templates));
SELECT pg_temp.ok('one first-week submission per current team',(SELECT count(*)=23 FROM report_documents d JOIN projects p ON p.id=d.project_id WHERE p.seed_key ~ '^TEAM[0-9]{2}$' AND d.kind='WEEKLY' AND d.state='SUBMITTED'));
SELECT pg_temp.ok('current teams have no final or presentation submissions',NOT EXISTS(SELECT 1 FROM report_documents d JOIN projects p ON p.id=d.project_id WHERE p.seed_key ~ '^TEAM[0-9]{2}$' AND d.kind<>'WEEKLY'));
SELECT pg_temp.ok('all fifteen historical finals approved',(SELECT count(*)=15 FROM project_report_status s JOIN projects p ON p.id=s.project_id WHERE p.seed_key LIKE 'PAST_TEAM%' AND s.kind='FINAL' AND s.status='APPROVED'));
SELECT pg_temp.ok('all fifteen historical presentations approved',(SELECT count(*)=15 FROM project_report_status s JOIN projects p ON p.id=s.project_id WHERE p.seed_key LIKE 'PAST_TEAM%' AND s.kind='PRESENTATION' AND s.status='APPROVED'));
SELECT pg_temp.ok('historical weekly history covers every seeded reporting period',NOT EXISTS(SELECT 1 FROM projects p JOIN reporting_periods r ON r.term_id=p.term_id WHERE p.seed_key LIKE 'PAST_TEAM%' AND NOT EXISTS(SELECT 1 FROM report_documents d JOIN report_submissions s ON s.document_id=d.id JOIN report_feedback f ON f.submission_id=s.id WHERE d.project_id=p.id AND d.period_id=r.id AND f.decision='REVIEWED')));
SELECT pg_temp.ok('weekly defaults use Thursday midnight and Thursday 21:00 Palestine time',NOT EXISTS(SELECT 1 FROM reporting_periods WHERE extract(isodow FROM opens_at AT TIME ZONE 'Asia/Hebron')<>4 OR (opens_at AT TIME ZONE 'Asia/Hebron')::time<>'00:00' OR (due_at AT TIME ZONE 'Asia/Hebron')::time<>'21:00'));
SELECT pg_temp.ok('weekly late acceptance reaches the next day',NOT EXISTS(SELECT 1 FROM reporting_periods WHERE (late_until AT TIME ZONE 'Asia/Hebron')::date<>(due_at AT TIME ZONE 'Asia/Hebron')::date+1));
SELECT pg_temp.ok('seed never fabricates PDF uploads or AI results',(SELECT count(*)=0 FROM report_version_files) AND (SELECT count(*)=0 FROM report_check_runs));
SELECT pg_temp.ok('historical reports remain read only',NOT EXISTS(SELECT 1 FROM report_documents d JOIN projects p ON p.id=d.project_id WHERE p.seed_key LIKE 'PAST_TEAM%' AND d.state<>'SUBMITTED'));

SELECT pg_temp.reject('outsider cannot create a team report',$q$SELECT create_report_document(outsider,project_id,'WEEKLY',(SELECT id FROM reporting_periods WHERE term_id=f.term_id AND week_number=2)) FROM f$q$,'Current teammate');
INSERT INTO ids SELECT 'weekly',create_report_document(owner,project_id,'WEEKLY',(SELECT id FROM reporting_periods WHERE term_id=f.term_id AND week_number=2)) FROM f;
SELECT pg_temp.ok('teammates share the same weekly draft',(SELECT create_report_document(f.teammate,f.project_id,'WEEKLY',d.period_id)=d.id FROM f JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='weekly')));
SELECT pg_temp.reject('weekly period cannot come from another term',$q$SELECT create_report_document(owner,project_id,'WEEKLY',(SELECT id FROM reporting_periods WHERE term_id<>f.term_id LIMIT 1)) FROM f$q$,'another term');
SELECT pg_temp.reject('incomplete report cannot be submitted',$q$SELECT submit_report(owner,(SELECT id FROM ids WHERE key='weekly'),0,gen_random_uuid()) FROM f$q$,'complete draft snapshot');
SELECT pg_temp.reject('progress above one hundred rejected',$q$SELECT save_report_draft(owner,(SELECT id FROM ids WHERE key='weekly'),0,pg_temp.weekly(101)) FROM f$q$,'Invalid report content');
INSERT INTO ids SELECT 'weekly-version',save_report_draft(owner,(SELECT id FROM ids WHERE key='weekly'),0,pg_temp.weekly()) FROM f;
SELECT pg_temp.reject('concurrent stale draft revision rejected',$q$SELECT save_report_draft(teammate,(SELECT id FROM ids WHERE key='weekly'),0,pg_temp.weekly()) FROM f$q$,'revision conflict');
SELECT pg_temp.reject('supervisor cannot read private draft',$q$SELECT read_report_draft(supervisor,(SELECT id FROM ids WHERE key='weekly')) FROM f$q$,'private to the team');
SELECT pg_temp.reject('outsider cannot read draft',$q$SELECT read_report_draft(outsider,(SELECT id FROM ids WHERE key='weekly')) FROM f$q$,'private to the team');
SELECT pg_temp.ok('teammate can read shared draft',(SELECT read_report_draft(teammate,(SELECT id FROM ids WHERE key='weekly'))=pg_temp.weekly() FROM f));
UPDATE reporting_periods SET opens_at=clock_timestamp()+interval '1 day',due_at=clock_timestamp()+interval '2 days',late_until=clock_timestamp()+interval '3 days'
 WHERE id=(SELECT period_id FROM report_documents WHERE id=(SELECT id FROM ids WHERE key='weekly'));
SELECT pg_temp.reject('weekly submission before opening rejected',$q$SELECT submit_report(owner,(SELECT id FROM ids WHERE key='weekly'),1,gen_random_uuid()) FROM f$q$,'window is closed');
UPDATE reporting_periods SET opens_at=clock_timestamp()-interval '3 hours',due_at=clock_timestamp()-interval '2 hours',late_until=clock_timestamp()-interval '1 hour'
 WHERE id=(SELECT period_id FROM report_documents WHERE id=(SELECT id FROM ids WHERE key='weekly'));
SELECT pg_temp.reject('new submission after late cutoff rejected',$q$SELECT submit_report(owner,(SELECT id FROM ids WHERE key='weekly'),1,gen_random_uuid()) FROM f$q$,'window is closed');
UPDATE reporting_periods SET late_until=clock_timestamp()+interval '1 hour' WHERE id=(SELECT period_id FROM report_documents WHERE id=(SELECT id FROM ids WHERE key='weekly'));
INSERT INTO ids SELECT 'weekly-submit-1',submit_report(owner,(SELECT id FROM ids WHERE key='weekly'),1,'44000000-0000-4000-8000-000000000010') FROM f;
SELECT pg_temp.ok('late report accepted with late marker',(SELECT is_late FROM report_submissions WHERE id=(SELECT id FROM ids WHERE key='weekly-submit-1')));
SELECT pg_temp.ok('submission retry is idempotent',(SELECT submit_report(owner,(SELECT id FROM ids WHERE key='weekly'),1,'44000000-0000-4000-8000-000000000010')=(SELECT id FROM ids WHERE key='weekly-submit-1') FROM f));
SELECT pg_temp.reject('submission key cannot change note',$q$SELECT submit_report(owner,(SELECT id FROM ids WHERE key='weekly'),1,'44000000-0000-4000-8000-000000000010','Different') FROM f$q$,'different data');
SELECT pg_temp.reject('submitted draft cannot be overwritten',$q$SELECT save_report_draft(owner,d.id,d.revision,pg_temp.weekly()) FROM f JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='weekly')$q$,'locked');
SELECT pg_temp.reject('submitted version cannot be mutated',$q$UPDATE report_versions SET content='{}' WHERE id=(SELECT id FROM ids WHERE key='weekly-version')$q$,'immutable');
SELECT revise_weekly_report(f.teammate,(SELECT id FROM ids WHERE key='weekly-submit-1'),d.revision,true) FROM f JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='weekly');
SELECT pg_temp.ok('unseen report may be withdrawn',(SELECT state='WITHDRAWN' FROM report_submissions WHERE id=(SELECT id FROM ids WHERE key='weekly-submit-1')));
SELECT pg_temp.reject('withdrawn report cannot be opened',$q$SELECT open_report_submission(supervisor,(SELECT id FROM ids WHERE key='weekly-submit-1')) FROM f$q$,'withdrawn');
SELECT save_report_draft(f.owner,d.id,d.revision,pg_temp.weekly()) FROM f JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='weekly');
INSERT INTO ids SELECT 'weekly-submit-2',submit_report(f.owner,d.id,d.revision,'44000000-0000-4000-8000-000000000011') FROM f JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='weekly');
SELECT pg_temp.reject('unrelated supervisor cannot open report',$q$SELECT open_report_submission('44000000-0000-4000-8000-000000000001',(SELECT id FROM ids WHERE key='weekly-submit-2'))$q$,'access denied');
SELECT open_report_submission(supervisor,(SELECT id FROM ids WHERE key='weekly-submit-2')) FROM f;
SELECT pg_temp.reject('viewed weekly report cannot be withdrawn',$q$SELECT revise_weekly_report(f.owner,(SELECT id FROM ids WHERE key='weekly-submit-2'),d.revision,true) FROM f JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='weekly')$q$,'unseen weekly');
SELECT revise_weekly_report(f.teammate,(SELECT id FROM ids WHERE key='weekly-submit-2'),d.revision) FROM f JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='weekly');
SELECT pg_temp.ok('weekly report stays editable until an actual review',(SELECT state='SUPERSEDED' AND change_reason='STUDENT_EDIT' FROM report_submissions WHERE id=(SELECT id FROM ids WHERE key='weekly-submit-2')));
SELECT save_report_draft(f.teammate,d.id,d.revision,pg_temp.weekly(30)) FROM f JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='weekly');
UPDATE reporting_periods SET late_until=clock_timestamp()-interval '1 minute' WHERE id=(SELECT period_id FROM report_documents WHERE id=(SELECT id FROM ids WHERE key='weekly'));
INSERT INTO ids SELECT 'weekly-submit-3',submit_report(f.owner,d.id,d.revision,'44000000-0000-4000-8000-000000000012') FROM f JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='weekly');
SELECT pg_temp.ok('revision preserves the initial submission timeliness',(SELECT is_late FROM report_submissions WHERE id=(SELECT id FROM ids WHERE key='weekly-submit-3')));
INSERT INTO ids SELECT 'weekly-feedback',add_report_feedback(supervisor,(SELECT id FROM ids WHERE key='weekly-submit-3'),'44000000-0000-4000-8000-000000000013','REVIEW','Include repeatability measurements next week.','NEEDS_CHANGES') FROM f;
SELECT pg_temp.ok('weekly feedback visible as needs changes',(SELECT status='NEEDS_CHANGES' FROM project_report_status WHERE document_id=(SELECT id FROM ids WHERE key='weekly')));
SELECT pg_temp.reject('weekly reviewed report cannot be revised',$q$SELECT revise_weekly_report(f.owner,(SELECT id FROM ids WHERE key='weekly-submit-3'),d.revision) FROM f JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='weekly')$q$,'Reviewed weekly');
SELECT pg_temp.reject('weekly report has no final approval or grade',$q$SELECT add_report_feedback(supervisor,(SELECT id FROM ids WHERE key='weekly-submit-3'),gen_random_uuid(),'REVIEW','Approved','APPROVED') FROM f$q$,'not final approval');
SELECT edit_report_feedback(supervisor,(SELECT id FROM ids WHERE key='weekly-feedback'),0,'Add the measurements in next week report.','NEEDS_CHANGES') FROM f;
SELECT pg_temp.reject('other supervisor cannot edit author feedback',$q$SELECT edit_report_feedback(second_supervisor,(SELECT id FROM ids WHERE key='weekly-feedback'),1,'Changed','REVIEWED') FROM f$q$,'author');
SELECT acknowledge_report_feedback(teammate,(SELECT id FROM ids WHERE key='weekly-submit-3')) FROM f;
SELECT pg_temp.reject('feedback cannot change after student reads it',$q$SELECT edit_report_feedback(supervisor,(SELECT id FROM ids WHERE key='weekly-feedback'),1,'Changed','REVIEWED') FROM f$q$,'already read');

SELECT pg_temp.reject('final initially locked by supervisor',$q$SELECT create_report_document(owner,project_id,'FINAL') FROM f$q$,'not opened');
SELECT pg_temp.reject('student cannot open final window',$q$SELECT set_report_window(owner,project_id,'FINAL',0,true) FROM f$q$,'supervisor required');
SELECT set_report_window(supervisor,project_id,'FINAL',0,true) FROM f;
SELECT pg_temp.reject('stale window edit rejected',$q$SELECT set_report_window(supervisor,project_id,'FINAL',0,false) FROM f$q$,'revision conflict');
INSERT INTO ids SELECT 'final',create_report_document(owner,project_id,'FINAL') FROM f;
SELECT pg_temp.ok('final draft shared by all teammates',(SELECT create_report_document(teammate,project_id,'FINAL')=(SELECT id FROM ids WHERE key='final') FROM f));
CREATE TEMP TABLE assets AS
 SELECT md5('test-team-image')::uuid AS image,md5('test-foreign-image')::uuid AS foreign_image,md5('test-pending-image')::uuid AS pending_image,md5('test-team-pptx')::uuid AS pptx;
INSERT INTO files(id,uploaded_by,storage_key,original_name,mime_type,byte_size,sha256,status)
 SELECT a.image,f.owner,'test-reports/team-image','diagram.png','image/png',42,repeat('a',64),'READY' FROM assets a CROSS JOIN f
 UNION ALL SELECT a.foreign_image,f.outsider,'test-reports/foreign-image','foreign.png','image/png',42,repeat('b',64),'READY' FROM assets a CROSS JOIN f
 UNION ALL SELECT a.pending_image,f.owner,'test-reports/pending-image','pending.png','image/png',42,repeat('c',64),'PENDING' FROM assets a CROSS JOIN f
 UNION ALL SELECT a.pptx,f.teammate,'test-reports/source-pptx','my-template.pptx','application/vnd.openxmlformats-officedocument.presentationml.presentation',42,repeat('d',64),'READY' FROM assets a CROSS JOIN f;
SELECT pg_temp.reject('foreign team file cannot be attached',$q$SELECT save_report_draft(f.owner,d.id,0,pg_temp.final_content(),'{}',NULL,NULL,NULL,jsonb_build_array(jsonb_build_object('file_id',a.foreign_image,'purpose','IMAGE'))) FROM f CROSS JOIN assets a JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='final')$q$,'ready hashed team');
SELECT pg_temp.reject('pending upload cannot be attached',$q$SELECT save_report_draft(f.owner,d.id,0,pg_temp.final_content(),'{}',NULL,NULL,NULL,jsonb_build_array(jsonb_build_object('file_id',a.pending_image,'purpose','IMAGE'))) FROM f CROSS JOIN assets a JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='final')$q$,'ready hashed team');
SELECT save_report_draft(f.owner,d.id,0,pg_temp.final_content('Snapshot A',a.image)) FROM f CROSS JOIN assets a JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='final');
SELECT pg_temp.reject('embedded image must belong to submitted version assets',$q$SELECT submit_report(f.owner,d.id,d.revision,gen_random_uuid()) FROM f JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='final')$q$,'unattached file');
INSERT INTO ids SELECT 'final-version-1',save_report_draft(f.teammate,d.id,d.revision,pg_temp.final_content('Snapshot A',a.image),'{}',NULL,NULL,NULL,jsonb_build_array(jsonb_build_object('file_id',a.image,'purpose','IMAGE','content_key','photo')))
 FROM f CROSS JOIN assets a JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='final');
SELECT pg_temp.ok('a section can contain enough blocks for many pages',(SELECT jsonb_array_length(content->'sections'->0->'blocks')=120 FROM report_versions WHERE id=(SELECT id FROM ids WHERE key='final-version-1')));
SELECT pg_temp.ok('asset metadata frozen with version',(SELECT original_name='diagram.png' AND sha256=repeat('a',64) FROM report_version_files WHERE version_id=(SELECT id FROM ids WHERE key='final-version-1')));
INSERT INTO ids SELECT 'final-submit-1',submit_report(f.owner,d.id,d.revision,'44000000-0000-4000-8000-000000000020','Please inspect the results section.') FROM f JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='final');
SELECT pg_temp.reject('submitted version cannot gain more assets',$q$INSERT INTO report_version_files SELECT (SELECT id FROM ids WHERE key='final-version-1'),a.image,'IMAGE','extra',f.owner,'','','',0,repeat('0',64) FROM f CROSS JOIN assets a$q$,'unsubmitted team draft');
SELECT pg_temp.reject('student cannot reopen submitted final',$q$SELECT reopen_report(f.owner,d.id,d.revision) FROM f JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='final')$q$,'supervisor reopening');
INSERT INTO ids SELECT 'final-comment',add_report_feedback(supervisor,(SELECT id FROM ids WHERE key='final-submit-1'),gen_random_uuid(),'COMMENT','Clarify the comparison here.',NULL,'background',2) FROM f;
SELECT pg_temp.reject('comment cannot target nonexistent report section',$q$SELECT add_report_feedback(supervisor,(SELECT id FROM ids WHERE key='final-submit-1'),gen_random_uuid(),'COMMENT','Wrong location',NULL,'missing-section') FROM f$q$,'Section is not');
SELECT pg_temp.reject('report cannot receive a slide comment',$q$SELECT add_report_feedback(supervisor,(SELECT id FROM ids WHERE key='final-submit-1'),gen_random_uuid(),'COMMENT','Wrong slide',NULL,NULL,NULL,'results') FROM f$q$,'Slide is not');
SELECT add_report_feedback(supervisor,(SELECT id FROM ids WHERE key='final-submit-1'),gen_random_uuid(),'REVIEW','Clarify one measurement.','NEEDS_CHANGES') FROM f;
SELECT add_report_feedback(second_supervisor,(SELECT id FROM ids WHERE key='final-submit-1'),gen_random_uuid(),'REVIEW','The report is approved.','APPROVED') FROM f;
SELECT pg_temp.ok('one project supervisor approval is sufficient',(SELECT status='APPROVED' FROM project_report_status WHERE document_id=(SELECT id FROM ids WHERE key='final')));
SELECT pg_temp.ok('feedback contains no numeric grades',NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='labassist_student' AND table_name='report_feedback' AND column_name IN ('grade','score')));
SELECT set_report_window(f.supervisor,f.project_id,'FINAL',w.revision,false) FROM f JOIN report_submission_windows w ON w.project_id=f.project_id AND w.kind='FINAL';
SELECT pg_temp.reject('closed final window prevents reopening',$q$SELECT reopen_report(f.supervisor,d.id,d.revision) FROM f JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='final')$q$,'reopen');
SELECT set_report_window(f.second_supervisor,f.project_id,'FINAL',w.revision,true) FROM f JOIN report_submission_windows w ON w.project_id=f.project_id AND w.kind='FINAL';
SELECT reopen_report(f.second_supervisor,d.id,d.revision) FROM f JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='final');
SELECT save_report_draft(f.teammate,d.id,d.revision,pg_temp.final_content('Snapshot B')) FROM f JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='final');
INSERT INTO ids SELECT 'final-submit-2',submit_report(f.teammate,d.id,d.revision,'44000000-0000-4000-8000-000000000021') FROM f JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='final');
SELECT pg_temp.ok('new final submission does not inherit previous approval',(SELECT status='SUBMITTED' FROM project_report_status WHERE document_id=(SELECT id FROM ids WHERE key='final')));
SELECT pg_temp.ok('previous submitted report remains the old snapshot',(SELECT open_report_submission(supervisor,(SELECT id FROM ids WHERE key='final-submit-1'))->'meta'->>'title'='Snapshot A' FROM f));
SELECT pg_temp.ok('older final marked superseded',(SELECT state='SUPERSEDED' FROM report_submissions WHERE id=(SELECT id FROM ids WHERE key='final-submit-1')));
SELECT pg_temp.reject('older version feedback is read only',$q$SELECT edit_report_feedback(supervisor,(SELECT id FROM ids WHERE key='final-comment'),0,'Changed') FROM f$q$,'current submission');

SELECT pg_temp.reject('presentation has its own closed gate',$q$SELECT create_report_document(owner,project_id,'PRESENTATION') FROM f$q$,'not opened');
SELECT set_report_window(second_supervisor,project_id,'PRESENTATION',0,true) FROM f;
INSERT INTO ids SELECT 'deck',create_report_document(owner,project_id,'PRESENTATION',NULL,pg_temp.deck(),'cards') FROM f;
SELECT pg_temp.reject('a color is not a template',$q$SELECT save_report_draft(f.owner,d.id,d.revision,pg_temp.deck(),'{}','red',1) FROM f JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='deck')$q$,'template unavailable');
INSERT INTO ids SELECT 'deck-version',save_report_draft(f.teammate,d.id,d.revision,pg_temp.deck(),'{"accent":"#1166cc","theme":"blueprint"}','cards',1,a.pptx,
 jsonb_build_array(jsonb_build_object('file_id',a.pptx,'purpose','PPTX_SOURCE'))) FROM f CROSS JOIN assets a JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='deck');
SELECT pg_temp.ok('presentation objects retain arbitrary positions and dimensions',(SELECT content->'slides'->0->'objects'->0->>'x'='713.5' AND content->'slides'->0->'objects'->0->>'width'='245' FROM report_versions WHERE id=(SELECT id FROM ids WHERE key='deck-version')));
SELECT pg_temp.ok('palette remains independent from template',(SELECT template_id='cards' AND appearance->>'accent'='#1166cc' FROM report_versions WHERE id=(SELECT id FROM ids WHERE key='deck-version')));
SELECT pg_temp.ok('imported PPTX retained as a team source file',(SELECT imported_file_id=(SELECT pptx FROM assets) FROM report_versions WHERE id=(SELECT id FROM ids WHERE key='deck-version')));
INSERT INTO ids SELECT 'deck-submit',submit_report(f.owner,d.id,d.revision,'44000000-0000-4000-8000-000000000030') FROM f JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='deck');
SELECT add_report_feedback(supervisor,(SELECT id FROM ids WHERE key='deck-submit'),gen_random_uuid(),'COMMENT','Show the measurements on this slide.',NULL,NULL,NULL,'results') FROM f;
SELECT pg_temp.reject('presentation comment must target an existing slide',$q$SELECT add_report_feedback(supervisor,(SELECT id FROM ids WHERE key='deck-submit'),gen_random_uuid(),'COMMENT','Wrong slide',NULL,NULL,NULL,'absent') FROM f$q$,'Slide is not');
SELECT pg_temp.reject('presentation comment cannot target a PDF page',$q$SELECT add_report_feedback(supervisor,(SELECT id FROM ids WHERE key='deck-submit'),gen_random_uuid(),'COMMENT','Wrong page',NULL,NULL,3) FROM f$q$,'target a slide');
INSERT INTO ids SELECT 'check',gen_random_uuid();
INSERT INTO report_check_runs(id,version_id,requested_by,kind,engine) SELECT (SELECT id FROM ids WHERE key='check'),(SELECT id FROM ids WHERE key='deck-version'),owner,'ABET','acceptance-fixture' FROM f;
UPDATE report_check_runs SET status='SUCCEEDED',result='{"findings":[{"message":"Explain the design trade-offs."}]}' WHERE id=(SELECT id FROM ids WHERE key='check');
SELECT pg_temp.ok('ABET or AI advice never approves a submission',(SELECT status='SUBMITTED' FROM project_report_status WHERE document_id=(SELECT id FROM ids WHERE key='deck')));
SELECT pg_temp.reject('check result cannot change versions',$q$UPDATE report_check_runs SET version_id=(SELECT id FROM ids WHERE key='final-version-1') WHERE id=(SELECT id FROM ids WHERE key='check')$q$,'immutable');
SELECT pg_temp.reject('outsider cannot request checks on team content',$q$INSERT INTO report_check_runs(version_id,requested_by,kind,engine) SELECT (SELECT id FROM ids WHERE key='deck-version'),outsider,'STRUCTURE','test' FROM f$q$,'teammate');
SELECT pg_temp.reject('completed project cannot be reopened',$q$UPDATE report_submission_windows SET is_open=true WHERE project_id=(SELECT id FROM projects WHERE seed_key='PAST_TEAM01') AND kind='FINAL'$q$,'read only');
SELECT pg_temp.reject('existing template design cannot silently change',$q$UPDATE presentation_templates SET design='{"layout_key":"replacement"}' WHERE id='circuit' AND version=1$q$,'immutable');
SELECT reopen_report(f.supervisor,d.id,d.revision) FROM f JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='deck');
INSERT INTO ids SELECT 'deck-resubmit',submit_report(f.owner,d.id,d.revision,gen_random_uuid()) FROM f JOIN report_documents d ON d.id=(SELECT id FROM ids WHERE key='deck');
SELECT pg_temp.ok('unchanged resubmission preserves imported source attachments',EXISTS(
 SELECT 1 FROM report_submissions s JOIN report_version_files v ON v.version_id=s.version_id CROSS JOIN assets a
 WHERE s.id=(SELECT id FROM ids WHERE key='deck-resubmit') AND v.file_id=a.pptx AND v.purpose='PPTX_SOURCE'));
SELECT pg_temp.ok('all seed backfill guards restored',(SELECT bool_and(t.tgenabled='O') FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relnamespace='labassist_student'::regnamespace AND t.tgname IN ('report_document_scope','report_submission_scope','report_feedback_scope','report_window_scope')));
ROLLBACK;
