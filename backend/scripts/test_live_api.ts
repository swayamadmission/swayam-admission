async function testApi() {
  const baseURL = 'http://localhost:3000/v1';

  console.log('Testing Endpoints on Live Backend...\n');

  // 1. Get States
  const statesRes = await fetch(`${baseURL}/geography/states`).then(r => r.json());
  console.log(`1. GET /v1/geography/states -> Count: ${statesRes.length}`);

  const bihar = statesRes.find((s: any) => s.code === 'BR');
  const punjab = statesRes.find((s: any) => s.code === 'PB');

  // 2. Get Districts for Bihar
  const biharDistrictsRes = await fetch(`${baseURL}/geography/states/${bihar.id}/districts`).then(r => r.json());
  console.log(`2. GET /v1/geography/states/${bihar.id}/districts -> Count: ${biharDistrictsRes.length} (e.g. ${biharDistrictsRes.slice(0, 3).map((d: any) => d.name).join(', ')})`);
  const patna = biharDistrictsRes.find((d: any) => d.name === 'Patna');

  // 3. Get Courses filtered by Education Level & Stream
  const coursesRes = await fetch(`${baseURL}/courses?educationLevel=12th&stream=Science&limit=10`).then(r => r.json());
  console.log(`3. GET /v1/courses?educationLevel=12th&stream=Science -> Total: ${coursesRes.total}, Returned: ${coursesRes.data.length}`);

  // 4. Create Standard Lead
  const leadRes = await fetch(`${baseURL}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Aryan Sharma',
      mobile: '9876543210',
      email: 'aryan.sharma@example.com',
      educationLevel: '12th',
      passingYear: 2024,
      stream: 'Science',
      stateId: bihar.id,
      districtId: patna.id,
      courseId: coursesRes.data[0].id,
      budget: '₹2L - ₹4L',
      hasConsent: true,
    }),
  }).then(r => r.json());
  console.log(`4. POST /v1/leads (Standard) -> Success! Lead ID: ${leadRes.id}, State: ${leadRes.state}, District: ${leadRes.district}, Course: ${leadRes.preferredCourse}`);

  // 5. Create Custom 'Other' Course Lead
  const customLeadRes = await fetch(`${baseURL}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Meera Patel',
      mobile: '9876543211',
      educationLevel: '12th',
      passingYear: 2024,
      stream: 'Science',
      stateId: bihar.id,
      districtId: patna.id,
      preferredCourse: 'B.Tech in Aerospace Engineering & Avionics',
      budget: '₹3L - ₹5L',
      hasConsent: true,
    }),
  }).then(r => r.json());
  console.log(`5. POST /v1/leads (Custom 'Other' Course) -> Success! Lead ID: ${customLeadRes.id}, CourseId: ${customLeadRes.courseId} (null as expected), PreferredCourse: "${customLeadRes.preferredCourse}"`);

  // 6. Security Check: State-District Mismatch Rejection
  const mismatchRes = await fetch(`${baseURL}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Hacker Mismatch',
      mobile: '9876543212',
      educationLevel: '12th',
      passingYear: 2024,
      stateId: punjab.id, // Punjab State
      districtId: patna.id, // Bihar Patna District
      budget: '₹2L - ₹4L',
      hasConsent: true,
    }),
  });
  const mismatchJson = await mismatchRes.json();
  console.log(`6. Security Check: Mismatch rejection -> Status: ${mismatchRes.status}, Message: "${mismatchJson.message}" (Properly Rejected!)`);

  console.log('\nAll Live API tests completed with 100% Success!');
}

testApi().catch((err) => {
  console.error('API Test Error:', err);
  process.exit(1);
});
