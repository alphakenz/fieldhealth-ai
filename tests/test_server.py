import copy
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server

class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();server.DB_PATH=self.tmp.name+'/visits.db'
        self.visit={'id':'195a2e17-966e-4a31-b8e5-e1a92ce836ec','household_code':'HH-014','households_visited':1,'people_present':5,'water_source':'borehole','follow_up_required':True,'follow_up_type':'health_education','community':'Fictional Kuje','note':'Five people present.','visit_date':'2026-10-09','activity':'household_visit','status':'confirmed','follow_up_status':'open','server_revision':0,'sync_state':'pending'}
    def tearDown(self):self.tmp.cleanup()
    def test_sync_idempotency_and_conflict(self):
        first=server.save_visit(self.visit);self.assertEqual(first['server_revision'],1)
        retry=server.save_visit(self.visit);self.assertEqual(retry['server_revision'],1)
        edited={**first,'people_present':6};second=server.save_visit(edited);self.assertEqual(second['server_revision'],2)
        with self.assertRaises(server.Conflict):server.save_visit({**first,'people_present':9})
        self.assertEqual(server.all_visits()[0]['people_present'],6)
    def test_confirm_requires_complete_data(self):
        self.visit['water_source']=None
        with self.assertRaises(ValueError):server.save_visit(self.visit)
        self.visit['status']='draft';self.assertEqual(server.save_visit(self.visit)['status'],'draft')
    def test_duplicate_household_visit_is_blocked_for_same_date(self):
        server.save_visit(self.visit)
        duplicate={**self.visit,'id':'2b99a2c8-7f3a-4c5e-9d1a-3dbd7f0c7b11','server_revision':0,'household_code':'HH-014'}
        with self.assertRaises(server.DuplicateRecord):server.save_visit(duplicate)
        different_date={**duplicate,'visit_date':'2026-10-10'}
        self.assertEqual(server.save_visit(different_date)['visit_date'],'2026-10-10')
    def test_delete_visit_removes_saved_record(self):
        saved=server.save_visit(self.visit)
        deleted=server.delete_visit(self.visit['id'],saved['server_revision'])
        self.assertEqual(deleted['id'],self.visit['id'])
        self.assertEqual(server.all_visits(),[])
    def test_strict_model_types(self):
        extracted={k:self.visit[k] for k in server.FIELDS};extracted['people_present']=True
        with self.assertRaises(ValueError):server.validate_extraction(extracted)
        extracted['people_present']=5;extracted['diagnosis']='malaria'
        with self.assertRaises(ValueError):server.validate_extraction(extracted)
    def test_households_and_people_are_separate_counts(self):
        extracted={k:self.visit[k] for k in server.FIELDS}
        extracted['households_visited']=5;extracted['people_present']=2
        self.assertEqual(server.validate_extraction(extracted)['households_visited'],5)
    def test_ollama_adapter_preserves_unknowns(self):
        draft={k:self.visit[k] for k in server.FIELDS};draft['water_source']=None
        with patch.dict(os.environ,{'AI_PROVIDER':'ollama','OLLAMA_MODEL':'gemma3:1b'}),patch('server.post_json',return_value={'message':{'content':json.dumps(draft)}}) as call:
            result=server.extract('Visited HH-014. Five present. Water source not recorded. Health education follow-up requested.')
            self.assertIsNone(result['draft']['water_source']);self.assertEqual(result['review_status'],'pending');self.assertIn('Missing water source',result['issues']);self.assertEqual(call.call_args.args[1]['format'],server.SCHEMA)
    def test_backboard_adapter_pins_model(self):
        draft={k:self.visit[k] for k in server.FIELDS}
        with patch.dict(os.environ,{'AI_PROVIDER':'backboard','BACKBOARD_API_KEY':'test-key','BACKBOARD_MODEL':'verified-open-weight-model','BACKBOARD_PROVIDER':'openrouter'}),patch('server.post_json',return_value={'content':json.dumps(draft)}) as call:
            result=server.extract('Synthetic household note.');self.assertEqual(result['provider'],'backboard');self.assertEqual(call.call_args.args[1]['model_name'],'verified-open-weight-model');self.assertEqual(call.call_args.args[1]['memory'],'off');self.assertEqual(call.call_args.args[1]['response_format']['type'],'json_schema')
    def test_empty_ai_response_has_actionable_error(self):
        with patch.dict(os.environ,{'AI_PROVIDER':'backboard','BACKBOARD_API_KEY':'test-key','BACKBOARD_MODEL':'verified-open-weight-model','BACKBOARD_PROVIDER':'openrouter'}),patch('server.post_json',return_value={'content':''}):
            with self.assertRaisesRegex(RuntimeError,'empty AI response'):
                server.extract('Synthetic household note.')
    def test_non_json_response_uses_explicit_facts_without_retry(self):
        note='Visited HH-016. Five people were present. Main water source was not recorded. The household requested a follow-up health education visit.'
        with patch.dict(os.environ,{'AI_PROVIDER':'backboard','BACKBOARD_API_KEY':'test-key','BACKBOARD_MODEL':'verified-open-weight-model','BACKBOARD_PROVIDER':'openrouter'}),patch('server.post_json',return_value={'content':'I found several administrative facts.'}) as call:
            result=server.extract(note)
        self.assertEqual(call.call_count,1)
        self.assertEqual(result['draft']['household_code'],'HH-016')
        self.assertEqual(result['draft']['households_visited'],1)
        self.assertEqual(result['draft']['people_present'],5)
        self.assertEqual(result['draft']['water_source'], 'not_recorded')
        self.assertTrue(result['draft']['follow_up_required'])
        self.assertEqual(result['extraction_mode'],'explicit_facts_fallback')
    def test_unconfigured_ai_has_no_fake_result(self):
        with patch.dict(os.environ,{'AI_PROVIDER':'none'}):
            with self.assertRaises(RuntimeError):server.extract('Fictional household note.')
    def test_identifiers_blocked(self):
        with self.assertRaises(ValueError):server.extract('Contact test@example.com')
        with self.assertRaises(ValueError):server.extract('Call 08012345678')

if __name__=='__main__':unittest.main()
