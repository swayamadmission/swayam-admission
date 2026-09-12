async function run() {
  try {
    console.log('1. Logging in as Admin...');
    const loginRes = await fetch('http://localhost:3000/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@swayamadmission.in',
        password: 'Admin@123'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.access_token;
    console.log('Login successful. Token:', token.substring(0, 20) + '...');
    
    console.log('2. Creating counselor with new unique values...');
    const createRes = await fetch('http://localhost:3000/v1/users/counselors', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        fullName: 'MOHAMMAD',
        email: 'mohammad9999@gmail.com',
        mobile: '9999888877',
        password: 'password123',
        isApproved: true
      })
    });
    
    const createData = await createRes.json();
    if (!createRes.ok) {
      console.error('--- API EXCEPTION ---');
      console.error('Status:', createRes.status);
      console.error('Data:', createData);
    } else {
      console.log('Create Counselor SUCCESS!');
      console.log(createData);
    }
  } catch (err: any) {
    console.error('--- FETCH EXCEPTION ---');
    console.error(err);
  }
}

run();
