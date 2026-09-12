const url = 'http://localhost:3000/v1/auth/login';
const testUrl = 'http://localhost:3000/v1/users/counselors';

async function run() {
  const loginRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@swayamadmission.in', password: 'Admin@123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.access_token;
  
  const createRes = await fetch(testUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      fullName: 'Test Counselor',
      email: 'test.counselor@swayamadmission.in',
      mobile: '9999999999',
      password: 'password123',
      isApproved: true
    })
  });
  
  const createData = await createRes.json();
  console.log("Status:", createRes.status);
  console.log("Response:", createData);
}
run();
