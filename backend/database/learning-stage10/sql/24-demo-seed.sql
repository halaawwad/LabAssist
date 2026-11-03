BEGIN;SET search_path=labassist_student,public;
INSERT INTO learning_resources(id,seed_key,title_en,title_ar,kind,url,publisher,language)
 SELECT md5('LEARNING_RESOURCE:'||url)::uuid,'DOC_'||part_key,title,title,CASE WHEN format='PDF' THEN 'DATASHEET' ELSE 'ARTICLE' END,url,publisher,'en' FROM catalog_documents WHERE part_key IN ('arduino_uno','hc_sr04','servo_sg90') ON CONFLICT DO NOTHING;
INSERT INTO learning_lessons(id,slug,version,title_en,title_ar,content,circuit_data,expected_result_en,expected_result_ar)
 SELECT md5('LESSON:led-resistor')::uuid,'led-resistor',1,'LED with a series resistor','LED Ù…Ø¹ Ù…Ù‚Ø§ÙˆÙ…Ø© ØªØ³Ù„Ø³Ù„ÙŠØ©','{"steps":["Identify supply polarity, resistor and LED terminals.","A series resistor limits LED current.","The 3D scene is a model, not a substitute for the exact component ratings."]}',v.data,'A correctly oriented LED may light with suitable supply and current limiting.','ÙŠØ¶ÙŠØ¡ LED Ø¹Ù†Ø¯ Ø§Ø®ØªÙŠØ§Ø± Ù‚Ø·Ø¨ÙŠØ© ÙˆØªØºØ°ÙŠØ© ÙˆÙ…Ù‚Ø§ÙˆÙ…Ø© Ù…Ù†Ø§Ø³Ø¨Ø©.' FROM circuit_versions v WHERE v.id=md5('DEMO_CIRCUIT_VERSION:'||(SELECT id FROM projects WHERE seed_key='TEAM01'))::uuid ON CONFLICT DO NOTHING;
INSERT INTO learning_lesson_parts SELECT md5('LESSON:led-resistor')::uuid,key FROM catalog_parts WHERE key IN ('led_red','resistor_220') ON CONFLICT DO NOTHING;
INSERT INTO learning_lesson_resources SELECT md5('LESSON:led-resistor')::uuid,id FROM learning_resources ON CONFLICT DO NOTHING;
DO $$ DECLARE graph JSONB;BEGIN
 SELECT circuit_data INTO graph FROM learning_lessons WHERE slug='led-resistor' AND version=1;
 graph=jsonb_set(graph,'{parts,1,type}','"resistor-10k"');
 INSERT INTO learning_lessons(id,slug,version,title_en,title_ar,content,circuit_data,expected_result_en,expected_result_ar)
 VALUES(md5('LESSON:ldr-divider')::uuid,'ldr-divider',1,'LDR voltage divider','Ù…Ù‚Ø³Ù‘Ù… Ø¬Ù‡Ø¯ Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… LDR',
 '{"steps":["A fixed resistor and LDR form a series divider.","The junction voltage depends on their resistance ratio.","Use a compatible measurement input to observe the junction; exact readings depend on the real parts."]}',
 jsonb_set(graph,'{parts,2,type}','"ldr-bare"'),'The junction voltage changes as the modeled LDR resistance changes.','ÙŠØªØºÙŠÙ‘Ø± Ø¬Ù‡Ø¯ Ø§Ù„Ù†Ù‚Ø·Ø© Ø§Ù„Ù…Ø´ØªØ±ÙƒØ© Ø¹Ù†Ø¯ ØªØºÙŠÙ‘Ø± Ù…Ù‚Ø§ÙˆÙ…Ø© LDR.') ON CONFLICT DO NOTHING;
 INSERT INTO learning_lessons(id,slug,version,title_en,title_ar,content,circuit_data,expected_result_en,expected_result_ar)
 VALUES(md5('LESSON:button-pullup')::uuid,'button-pullup',1,'Button with pull-up resistor','Ø²Ø± Ù…Ø¹ Ù…Ù‚Ø§ÙˆÙ…Ø© Pull-up',
 '{"steps":["The resistor connects the signal junction toward the supply.","The modeled switch connects the junction to ground when closed.","Confirm the physical switch terminal pairs before building the real circuit."]}',
 jsonb_set(graph,'{parts,2,type}','"push-button"'),'Closing the switch brings the junction toward ground; opening it allows pull-up toward the supply.','Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ø²Ø± ÙŠÙ‚Ø±Ù‘Ø¨ Ø¬Ù‡Ø¯ Ø§Ù„Ù†Ù‚Ø·Ø© Ù…Ù† GNDØŒ ÙˆÙØªØ­Ù‡ ÙŠØ³Ù…Ø­ Ù„Ù„Ù…Ù‚Ø§ÙˆÙ…Ø© Ø¨Ø³Ø­Ø¨Ù‡Ø§ Ù†Ø­Ùˆ Ø§Ù„ØªØºØ°ÙŠØ©.') ON CONFLICT DO NOTHING;
 INSERT INTO learning_lesson_parts SELECT md5('LESSON:ldr-divider')::uuid,key FROM catalog_parts WHERE key IN ('ldr','resistor_10k') ON CONFLICT DO NOTHING;
 INSERT INTO learning_lesson_parts SELECT md5('LESSON:button-pullup')::uuid,key FROM catalog_parts WHERE key IN ('push_button','resistor_10k') ON CONFLICT DO NOTHING;
END $$;
COMMIT;
