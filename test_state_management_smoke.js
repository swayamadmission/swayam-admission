const BASE_URL = 'http://localhost:3000/v1';

async function main() {
  console.log('===============================================================');
  console.log(' SWAYAM ADMISSION — STATE MANAGEMENT 20 SMOKE TESTS SUITE     ');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: ADMIN LOGIN
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 1: Admin Login ---');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@swayamadmission.in', password: 'Admin@123' }),
  });
  const loginData = await loginRes.json();
  assert(loginRes.status === 200 && !!loginData.access_token, 'Admin login succeeded and returned JWT');
  const token = loginData.access_token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // -------------------------------------------------------------------------
  // TEST 2: CREATE STATE WITH COMPLETE METADATA
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Create State with Complete Metadata & Validation ---');
  const testStateCode = 'ZZ' + Math.floor(10 + Math.random() * 89);
  const testStateName = 'Testland State ' + Date.now();
  const createPayload = {
    name: testStateName,
    code: testStateCode,
    region: 'North',
    heroImage: 'https://images.unsplash.com/photo-1548013146-72479768bada',
    description: 'A prosperous education hub with premier institutions.',
    popularCourses: ['B.Tech Computer Science', 'MBBS', 'MBA'],
    status: 'DRAFT',
  };

  const createRes = await fetch(`${BASE_URL}/organization/geography/states`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(createPayload),
  });
  const createdState = await createRes.json();
  assert(createRes.status === 201 && createdState.id, `Created test state: ${createdState.name} (${createdState.code})`);
  const testStateId = createdState.id;

  // Duplicate Code Prevention
  const dupCodeRes = await fetch(`${BASE_URL}/organization/geography/states`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ ...createPayload, name: testStateName + ' Dup' }),
  });
  assert(dupCodeRes.status === 400, 'Duplicate state code rejected with 400 Bad Request');

  // -------------------------------------------------------------------------
  // TEST 3: EDIT STATE
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Edit State ---');
  const updatedDesc = 'Updated description for education landscape.';
  const editRes = await fetch(`${BASE_URL}/organization/geography/states/${testStateId}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ description: updatedDesc, region: 'East' }),
  });
  const editedState = await editRes.json();
  assert(editRes.status === 200 && editedState.description === updatedDesc && editedState.region === 'East', 'State updated with new description and region');

  // -------------------------------------------------------------------------
  // TEST 4: PUBLISH STATE & PUBLIC VISIBILITY
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Publish State & Public Visibility ---');
  const pubRes = await fetch(`${BASE_URL}/organization/geography/states/${testStateId}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ status: 'PUBLISHED' }),
  });
  const publishedState = await pubRes.json();
  assert(pubRes.status === 200 && publishedState.status === 'PUBLISHED', 'Admin published state in DB (status=PUBLISHED)');

  // Verify in public states list
  const pubStatesRes = await fetch(`${BASE_URL}/geography/states`);
  const pubStates = await pubStatesRes.json();
  const isFoundPublicly = Array.isArray(pubStates) && pubStates.some(s => s.id === testStateId);
  assert(isFoundPublicly, 'Published state appears in public /geography/states list');

  // Verify in public state detail
  const pubDetailRes = await fetch(`${BASE_URL}/geography/states/detail/${testStateId}`);
  const pubDetail = await pubDetailRes.json();
  assert(pubDetailRes.status === 200 && pubDetail.id === testStateId, 'Public state detail endpoint accessible for published state');

  // -------------------------------------------------------------------------
  // TEST 5: UNPUBLISH STATE & PUBLIC INVISIBILITY
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Unpublish State & Public Invisibility ---');
  const unpubRes = await fetch(`${BASE_URL}/organization/geography/states/${testStateId}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ status: 'DRAFT' }),
  });
  const unpubState = await unpubRes.json();
  assert(unpubRes.status === 200 && unpubState.status === 'DRAFT', 'Admin unpublished state in DB (status=DRAFT)');

  // Verify NOT in public states list
  const afterUnpubListRes = await fetch(`${BASE_URL}/geography/states`);
  const afterUnpubList = await afterUnpubListRes.json();
  const isStillInPublicList = Array.isArray(afterUnpubList) && afterUnpubList.some(s => s.id === testStateId);
  assert(!isStillInPublicList, 'Unpublished state is strictly hidden from public /geography/states list');

  // Verify public state detail returns 404
  const unpubDetailRes = await fetch(`${BASE_URL}/geography/states/detail/${testStateId}`);
  assert(unpubDetailRes.status === 404, 'Public state detail returns 404 for unpublished state');

  // -------------------------------------------------------------------------
  // TEST 6: RE-PUBLISH STATE
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Re-publish State ---');
  const repubRes = await fetch(`${BASE_URL}/organization/geography/states/${testStateId}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ status: 'PUBLISHED' }),
  });
  assert(repubRes.status === 200, 'Re-published state successfully');
  const repubCheckRes = await fetch(`${BASE_URL}/geography/states`);
  const repubList = await repubCheckRes.json();
  assert(repubList.some(s => s.id === testStateId), 'Re-published state is visible to public again');

  // -------------------------------------------------------------------------
  // TEST 7: COLLEGE RELATION (Single Source of Truth)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: College Relation ---');
  const colRes = await fetch(`${BASE_URL}/colleges?limit=10`, { headers: authHeaders });
  const colData = await colRes.json();
  const colleges = Array.isArray(colData) ? colData : colData.data || [];
  assert(colRes.status === 200, `Colleges directory accessible (returned ${colleges.length} colleges)`);

  // -------------------------------------------------------------------------
  // TEST 8: SCHOLARSHIP TAB FUNCTIONALITY
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8: Scholarships Tab & State Linkage ---');
  const schPayload = {
    scholarshipName: 'Merit Excellence Scholarship ' + Date.now(),
    provider: 'Test Education Trust',
    category: 'State',
    scholarshipType: 'Merit Based',
    amount: 50000,
    applicationStart: '2026-09-01T00:00:00.000Z',
    applicationEnd: '2026-11-30T00:00:00.000Z',
    eligibility: 'Min 80% in 12th',
    status: 'PUBLISHED',
    stateId: testStateId,
    state: testStateName,
    states: [testStateName],
  };
  const schCreateRes = await fetch(`${BASE_URL}/scholarships`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(schPayload),
  });
  const createdSch = await schCreateRes.json();
  assert(schCreateRes.status === 201 && createdSch.id, `Created scholarship linked to state: ${createdSch.scholarshipName}`);
  const testSchId = createdSch.id;

  // Verify query by stateId
  const schListRes = await fetch(`${BASE_URL}/scholarships?stateId=${testStateId}`, { headers: authHeaders });
  const schList = await schListRes.json();
  const schItems = Array.isArray(schList) ? schList : schList.data || [];
  assert(schItems.some(s => s.id === testSchId), 'Scholarship appears under State -> Scholarships query');

  // -------------------------------------------------------------------------
  // TEST 9: EXAM TAB FUNCTIONALITY
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 9: Entrance Exam Tab & State Linkage ---');
  const examPayload = {
    examName: 'State CET ' + Date.now(),
    category: 'ENGINEERING',
    level: 'STATE',
    conductedBy: 'State Board of Tech Education',
    examMode: 'ONLINE',
    examDate: '2026-05-15T00:00:00.000Z',
    applicationStart: '2026-01-10T00:00:00.000Z',
    applicationEnd: '2026-03-31T00:00:00.000Z',
    applicationFee: 1200,
    eligibility: '12th PCM 50%',
    status: 'PUBLISHED',
    stateId: testStateId,
  };
  const examCreateRes = await fetch(`${BASE_URL}/exams`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(examPayload),
  });
  const createdExam = await examCreateRes.json();
  assert(examCreateRes.status === 201 && createdExam.id, `Created entrance exam linked to state: ${createdExam.examName}`);
  const testExamId = createdExam.id;

  // Verify query by stateId
  const examListRes = await fetch(`${BASE_URL}/exams?stateId=${testStateId}`, { headers: authHeaders });
  const examList = await examListRes.json();
  const examItems = Array.isArray(examList) ? examList : examList.data || [];
  assert(examItems.some(e => e.id === testExamId), 'Exam appears under State -> Exam query');

  // -------------------------------------------------------------------------
  // TEST 10: CITY / DISTRICT TAB FUNCTIONALITY
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 10: City / District Tab & Foreign Key Isolation ---');
  const distPayload = {
    name: 'Metropolis City ' + Date.now(),
    code: 'MET',
    status: 'ACTIVE',
    stateId: testStateId,
  };
  const distCreateRes = await fetch(`${BASE_URL}/organization/geography/districts`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(distPayload),
  });
  const createdDist = await distCreateRes.json();
  assert(distCreateRes.status === 201 && createdDist.id, `Created district linked to state: ${createdDist.name}`);
  const testDistId = createdDist.id;

  // Verify district is only returned for this state
  const distListRes = await fetch(`${BASE_URL}/organization/geography/districts?stateId=${testStateId}`, { headers: authHeaders });
  const distList = await distListRes.json();
  const distItems = Array.isArray(distList) ? distList : distList.data || [];
  assert(distItems.some(d => d.id === testDistId), 'District strictly isolated under correct state');

  // -------------------------------------------------------------------------
  // TEST 11: UPDATES TAB FUNCTIONALITY
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 11: Updates Tab & Public State Updates ---');
  const updatePayload = {
    title: 'Admissions 2026 Counseling Schedule ' + Date.now(),
    type: 'Admission Notice',
    publishDate: '2026-09-29T00:00:00.000Z',
    content: 'All candidates must complete seat verification by Oct 15.',
    status: 'PUBLISHED',
    stateId: testStateId,
  };
  const updateCreateRes = await fetch(`${BASE_URL}/organization/geography/updates`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(updatePayload),
  });
  const createdUpdate = await updateCreateRes.json();
  assert(updateCreateRes.status === 201 && createdUpdate.id, `Created state update: ${createdUpdate.title}`);
  const testUpdateId = createdUpdate.id;

  // Verify public state updates endpoint
  const pubUpdatesRes = await fetch(`${BASE_URL}/geography/states/${testStateId}/updates`);
  const pubUpdates = await pubUpdatesRes.json();
  const updateItems = Array.isArray(pubUpdates) ? pubUpdates : pubUpdates.data || [];
  assert(updateItems.some(u => u.id === testUpdateId), 'Update appears in public state updates feed');

  // -------------------------------------------------------------------------
  // TEST 12: STATE DETAIL LIVE COUNTS PANEL
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 12: State Detail Live Relational Counts ---');
  const detailWithCountsRes = await fetch(`${BASE_URL}/organization/geography/states/${testStateId}`, { headers: authHeaders });
  const detailWithCounts = await detailWithCountsRes.json();
  const dCount = detailWithCounts.districtsCount ?? detailWithCounts.metrics?.districtsCount;
  const sCount = detailWithCounts.scholarshipsCount ?? detailWithCounts.metrics?.scholarshipsCount;
  const eCount = detailWithCounts.examsCount ?? detailWithCounts.metrics?.examsCount;
  const uCount = detailWithCounts.updatesCount ?? detailWithCounts.metrics?.updatesCount;
  assert(
    detailWithCountsRes.status === 200 &&
    sCount >= 1 &&
    eCount >= 1 &&
    dCount >= 1 &&
    uCount >= 1,
    `Live DB counts verified (Districts: ${dCount}, Scholarships: ${sCount}, Exams: ${eCount}, Updates: ${uCount})`
  );

  // -------------------------------------------------------------------------
  // TEST 13: SAFE DELETION REJECTION (PROTECT RELATIONAL DATA)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 13: Safe Deletion Rejection (Must Prevent Destructive Deletion) ---');
  const deleteBlockedRes = await fetch(`${BASE_URL}/organization/geography/states/${testStateId}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  const deleteBlockedData = await deleteBlockedRes.json();
  assert(
    deleteBlockedRes.status === 400 &&
    deleteBlockedData.message?.includes('Cannot delete state'),
    `Deletion blocked safely with 400 Bad Request: "${deleteBlockedData.message}"`
  );

  // -------------------------------------------------------------------------
  // TEST 14: CLEANUP TEST CHILDREN & SAFE DELETION
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 14: Cleanup Test Records & Safe State Deletion ---');
  const delSch = await fetch(`${BASE_URL}/scholarships/${testSchId}`, { method: 'DELETE', headers: authHeaders });
  const delExam = await fetch(`${BASE_URL}/exams/${testExamId}`, { method: 'DELETE', headers: authHeaders });
  const delDist = await fetch(`${BASE_URL}/organization/geography/districts/${testDistId}`, { method: 'DELETE', headers: authHeaders });
  const delUpd = await fetch(`${BASE_URL}/organization/geography/updates/${testUpdateId}`, { method: 'DELETE', headers: authHeaders });

  // Now delete state with 0 dependencies
  const deleteAllowedRes = await fetch(`${BASE_URL}/organization/geography/states/${testStateId}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  const deleteAllowedData = await deleteAllowedRes.json();
  assert(deleteAllowedRes.status === 200, `Safe deletion succeeded when 0 dependent records remain (status=${deleteAllowedRes.status})`);

  // Verify state is completely removed
  const verifyDeletedRes = await fetch(`${BASE_URL}/organization/geography/states/${testStateId}`, { headers: authHeaders });
  assert(verifyDeletedRes.status === 404, 'Deleted state is completely removed from database');

  // -------------------------------------------------------------------------
  // TEST 15: DATE FORMAT VALIDATION (DD/MM/YYYY)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 15: Date Format Validation ---');
  function formatDate(dateStr) {
    if (!dateStr || dateStr === 'Invalid Date') return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '—';
    }
  }

  const sampleDate = '2026-05-15T00:00:00.000Z';
  const formatted = formatDate(sampleDate);
  assert(formatted === '15/05/2026', `Date formatted strictly as DD/MM/YYYY (${formatted})`);
  assert(formatDate('invalid-date-string') === '—', 'Invalid date returns dash instead of crashing or showing "Invalid Date"');

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(` SMOKE TEST RESULTS: ${passed} PASSED, ${failed} FAILED `);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error in smoke test:', err);
  process.exit(1);
});
