const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3000/v1';

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const config = {
    method: options.method || 'GET',
    headers,
  };
  if (options.body) {
    config.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const res = await fetch(url, config);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }

  return {
    status: res.status,
    ok: res.ok,
    data,
  };
}

async function main() {
  console.log('====================================================');
  console.log('SWAYAM ADMISSION — CONTACT & ENQUIRY MASTER SMOKE TEST');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // ─── 1. PUBLIC CONTACT DATA ────────────────────────────────────────────────
  console.log('--- TEST GROUP 1: Public Contact Page Sync & Data ---');
  const publicRes = await request('/contact/public');
  assert(publicRes.status === 200, 'Public contact endpoint returns 200 OK');
  assert(publicRes.data.brand.brandName === 'Swayam Admission', 'Brand name is Swayam Admission');
  assert(publicRes.data.brand.primaryColor === '#4A7B5B', 'Primary brand color is #4A7B5B');
  assert(publicRes.data.brand.accentColor === '#F0AE1A', 'Accent brand color is #F0AE1A');
  assert(Array.isArray(publicRes.data.departments), 'Departments list is an array');
  assert(publicRes.data.departments.length >= 6, `At least 6 departments loaded (got ${publicRes.data.departments.length})`);

  // Verify real phone & email numbers in departments
  const admissions = publicRes.data.departments.find(d => d.name.includes('Admissions'));
  assert(admissions && admissions.phone === '6284308664', 'Admissions Helpline has real phone 6284308664');
  assert(admissions && admissions.whatsapp === '6284308664', 'Admissions WhatsApp has real number 6284308664');

  const appSupport = publicRes.data.departments.find(d => d.name.includes('Application Support'));
  assert(appSupport && appSupport.phone === '6399102731', 'Application Support Desk has real phone 6399102731');

  const general = publicRes.data.departments.find(d => d.name.includes('General Enquiries'));
  assert(general && general.email === 'swayamadmissions@gmail.com', 'General Enquiries has swayamadmissions@gmail.com');

  assert(publicRes.data.pageSettings && publicRes.data.pageSettings.pageHeading, 'Page settings has pageHeading');
  assert(publicRes.data.socials && typeof publicRes.data.socials === 'object', 'Socials map is present and object');

  // ─── 2. FORM VALIDATION & ENQUIRY SUBMISSION ───────────────────────────────
  console.log('\n--- TEST GROUP 2: Enquiry Validation & Submission ---');

  // 2.1 Name required validation
  const emptyNameRes = await request('/contact/enquire', {
    method: 'POST',
    body: {
      fullName: '',
      mobile: '9876543210',
      subject: 'Admission counselling',
      category: 'Admission Counselling',
    },
  });
  assert(emptyNameRes.status === 400, 'Fails with 400 Bad Request when fullName is empty');

  // 2.2 Mobile validation
  const invalidMobileRes = await request('/contact/enquire', {
    method: 'POST',
    body: {
      fullName: 'Rahul Sharma',
      mobile: '12345',
      subject: 'Admission counselling',
      category: 'Admission Counselling',
    },
  });
  assert(invalidMobileRes.status === 400, 'Fails with 400 Bad Request for invalid mobile');

  // 2.3 Subject validation
  const emptySubjectRes = await request('/contact/enquire', {
    method: 'POST',
    body: {
      fullName: 'Rahul Sharma',
      mobile: '9876543210',
      subject: '',
      category: 'Admission Counselling',
    },
  });
  assert(emptySubjectRes.status === 400, 'Fails with 400 Bad Request for empty subject');

  // 2.4 Category validation
  const emptyCatRes = await request('/contact/enquire', {
    method: 'POST',
    body: {
      fullName: 'Rahul Sharma',
      mobile: '9876543210',
      subject: 'Valid Subject',
      category: '',
    },
  });
  assert(emptyCatRes.status === 400, 'Fails with 400 Bad Request for empty category');

  // 2.5 Successful submission with ONLY mandatory fields (email & message omitted!)
  const uniqueMobile = '9' + Math.floor(100000000 + Math.random() * 900000000);
  const subRes = await request('/contact/enquire', {
    method: 'POST',
    body: {
      fullName: 'Pooja Verma',
      mobile: uniqueMobile,
      subject: 'B.Tech CSE Admission Guidance 2026',
      category: 'Admission Counselling',
    },
  });
  assert(subRes.status === 201 || subRes.status === 200, 'Enquiry submitted with only mandatory fields');
  assert(subRes.data.success === true, 'Response contains success: true');
  assert(subRes.data.referenceNo && subRes.data.referenceNo.startsWith('ENQ-'), `Generated reference number ${subRes.data.referenceNo}`);

  const savedRef = subRes.data.referenceNo;

  // 2.6 Duplicate accidental submission prevention
  const dupRes = await request('/contact/enquire', {
    method: 'POST',
    body: {
      fullName: 'Pooja Verma',
      mobile: uniqueMobile,
      subject: 'B.Tech CSE Admission Guidance 2026',
      category: 'Admission Counselling',
    },
  });
  assert(dupRes.status === 400, 'Duplicate submission prevented within 2-minute cooldown window');

  // 2.7 Submission with optional email and message
  const uniqueMobile2 = '8' + Math.floor(100000000 + Math.random() * 900000000);
  const subRes2 = await request('/contact/enquire', {
    method: 'POST',
    body: {
      fullName: 'Amit Patel',
      mobile: uniqueMobile2,
      email: 'amit.patel.test@example.com',
      subject: 'Scholarship Eligibility Inquiry',
      category: 'Payment and Fee Enquiry',
      message: 'Hello Swayam Admission team, I would like to know about available fee concessions and scholarships.',
      consent: true,
    },
  });
  assert(subRes2.data.success === true, 'Enquiry with optional email and message succeeded');
  assert(subRes2.data.referenceNo.startsWith('ENQ-'), `Generated ref ${subRes2.data.referenceNo}`);

  // ─── 3. ADMIN AUTH & MANAGEMENT ───────────────────────────────────────────
  console.log('\n--- TEST GROUP 3: Admin Auth, Departments CRUD & Enquiry Management ---');

  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
  });

  if (!adminUser) {
    throw new Error('No admin user found in database to authenticate test.');
  }

  const jwt = require('jsonwebtoken');
  const jwtSecret = process.env.JWT_SECRET || 'supersecretjwtkey';
  const token = jwt.sign(
    {
      sub: adminUser.id,
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    },
    jwtSecret,
    { expiresIn: '1h' }
  );

  const authHeaders = {
    headers: { Authorization: `Bearer ${token}` },
  };

  // 3.1 Admin get department contacts
  const adminDepts = await request('/contact/admin/departments', authHeaders);
  assert(adminDepts.status === 200, 'Admin departments list returns 200 OK');
  assert(adminDepts.data.length >= 6, `Admin fetched ${adminDepts.data.length} department contacts`);

  // 3.2 Admin create new department contact
  const newDeptRes = await request('/contact/admin/departments', {
    method: 'POST',
    ...authHeaders,
    body: {
      name: 'Hostel & Student Accommodation',
      badge: 'Campus Living',
      description: 'Dedicated guidance for hostel allotment, mess charges, and PG verification near colleges.',
      phone: '6284308664',
      whatsapp: '6284308664',
      email: 'hostel@swayamadmission.com',
      officeHours: 'Mon – Sat: 10:00 AM – 6:00 PM',
      workingDays: 'Monday to Saturday',
      address: 'New Delhi Campus Desk',
      ctaText: 'Check Hostels',
      ctaAction: 'CALL',
      isActive: true,
    },
  });
  assert(newDeptRes.status === 201 || newDeptRes.status === 200, 'Admin created new department contact');
  const createdDeptId = newDeptRes.data.id;
  assert(createdDeptId, `Created department ID: ${createdDeptId}`);

  // 3.3 Verify new department is immediately active on public contact page!
  const publicAfterCreate = await request('/contact/public');
  const foundInPublic = publicAfterCreate.data.departments.some(d => d.id === createdDeptId);
  assert(foundInPublic, 'Newly created department immediately visible on public Contact Us page');

  // 3.4 Admin edit department contact
  const updateDeptRes = await request(`/contact/admin/departments/${createdDeptId}`, {
    method: 'PATCH',
    ...authHeaders,
    body: {
      description: 'Updated description for hostel assistance and campus accommodation.',
      badge: 'Hostel Desk (Updated)',
    },
  });
  assert(updateDeptRes.data.badge === 'Hostel Desk (Updated)', 'Admin successfully updated department contact details');

  // 3.5 Admin toggle active/inactive status
  await request(`/contact/admin/departments/${createdDeptId}`, {
    method: 'PATCH',
    ...authHeaders,
    body: { isActive: false },
  });
  const publicAfterDeactivate = await request('/contact/public');
  const hiddenInPublic = !publicAfterDeactivate.data.departments.some(d => d.id === createdDeptId);
  assert(hiddenInPublic, 'Deactivated department immediately hidden from public Contact Us page');

  // 3.6 Admin delete department contact
  const deleteDeptRes = await request(`/contact/admin/departments/${createdDeptId}`, {
    method: 'DELETE',
    ...authHeaders,
  });
  assert(deleteDeptRes.data.success === true, 'Admin successfully deleted temporary department contact');

  // 3.7 Admin view & filter enquiries
  const enquiriesRes = await request(`/contact/admin/enquiries?search=${savedRef}`, authHeaders);
  assert(enquiriesRes.status === 200, 'Admin enquiries endpoint returns 200 OK');
  assert(enquiriesRes.data.items.length === 1, `Found submitted enquiry by reference: ${savedRef}`);
  const targetEnquiry = enquiriesRes.data.items[0];

  // 3.8 Admin assign department, staff & update status
  const staffRes = await request('/contact/admin/staff', authHeaders);
  assert(staffRes.status === 200, 'Admin fetched assignable staff list');
  const firstStaff = staffRes.data[0];

  const updateStatusRes = await request(`/contact/admin/enquiries/${targetEnquiry.id}/status`, {
    method: 'PATCH',
    ...authHeaders,
    body: {
      status: 'IN_REVIEW',
      adminNotes: 'Assigned to senior counselor for immediate phone consultation.',
      assignedDepartment: 'Admissions & Counselling',
      assignedStaffId: firstStaff ? firstStaff.id : undefined,
      assignedStaffName: firstStaff ? firstStaff.fullName : undefined,
    },
  });
  assert(updateStatusRes.data.status === 'IN_REVIEW', 'Enquiry status updated to IN_REVIEW');
  assert(updateStatusRes.data.assignedDepartment === 'Admissions & Counselling', 'Department assigned');

  // Resolve enquiry
  const resolveRes = await request(`/contact/admin/enquiries/${targetEnquiry.id}/status`, {
    method: 'PATCH',
    ...authHeaders,
    body: {
      status: 'RESOLVED',
      adminNotes: 'Student consulted and college shortlist provided via WhatsApp.',
    },
  });
  assert(resolveRes.data.status === 'RESOLVED', 'Enquiry status updated to RESOLVED');
  assert(resolveRes.data.resolvedAt !== null, 'resolvedAt timestamp recorded');

  // 3.9 Admin update page settings & social links
  const updateSettingsRes = await request('/contact/admin/settings', {
    method: 'PATCH',
    ...authHeaders,
    body: {
      pageHeading: 'Contact Swayam Admission — Verified Desk',
      helpdeskBadge: 'Official Swayam Admission Helpdesk 2026',
      officeHours: 'Monday – Saturday: 9:30 AM – 6:30 PM (IST)',
      instagramUrl: 'https://www.instagram.com/swayamadmission',
    },
  });
  assert(updateSettingsRes.data.success === true, 'Contact settings updated successfully');

  // Verify public reflects it
  const publicFinal = await request('/contact/public');
  assert(publicFinal.data.pageSettings.pageHeading === 'Contact Swayam Admission — Verified Desk', 'Public page heading matches updated setting');
  assert(publicFinal.data.pageSettings.helpdeskBadge === 'Official Swayam Admission Helpdesk 2026', 'Public page badge matches updated setting');

  // Restore heading
  await request('/contact/admin/settings', {
    method: 'PATCH',
    ...authHeaders,
    body: {
      pageHeading: 'Contact Swayam Admission',
      helpdeskBadge: 'Official Swayam Admission Helpdesk',
    },
  });

  console.log('\n====================================================');
  console.log(`ALL TESTS PASSED! (${passedTests}/${totalTests} assertions verified)`);
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error('\n❌ Smoke test failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
