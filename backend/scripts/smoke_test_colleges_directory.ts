import { PrismaClient, CollegeType, CourseLevel, CollegeOwnership } from '@prisma/client';
import { CollegesService } from '../src/colleges/colleges.service';
import { CollegesBulkService } from '../src/colleges/colleges-bulk.service';

async function runSmokeTest() {
  console.log('================================================================');
  console.log('🚀 STARTING COMPREHENSIVE SMOKE TEST FOR COLLEGES DIRECTORY');
  console.log('================================================================\n');

  const prisma = new PrismaClient();
  await prisma.$connect();

  const mockAuditService: any = {
    log: async () => {},
    createLog: async () => {},
    logAction: async () => {},
  };

  const bulkService = new CollegesBulkService(prisma as any, mockAuditService);
  const collegesService = new CollegesService(prisma as any, mockAuditService);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: MANUAL COLLEGE CREATION WITH ALL 6 SECTIONS
    // -------------------------------------------------------------
    console.log('--- TEST 1: Create College Profile with All 6 Sections ---');
    const testCollegeSlug = `smoke-test-inst-${Date.now()}`;
    const createdCollege = await prisma.college.create({
      data: {
        name: 'Smoke Test Institute of Technology & Science',
        slug: testCollegeSlug,
        shortDescription: 'Leading engineering and research institution in Bengaluru.',
        fullDescription: 'Comprehensive academic campus featuring advanced laboratories and hostels.',
        logo: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=128',
        banner: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200',
        establishedYear: 2005,
        ownership: CollegeOwnership.PRIVATE,
        type: CollegeType.AUTONOMOUS,
        university: 'Visvesvaraya Technological University',
        naacGrade: 'A++',
        approvals: ['AICTE', 'UGC', 'NBA'],
        rating: 4.8,
        city: 'Bengaluru',
        state: 'Karnataka',
        address: 'Electronic City Phase 1, Hosur Road',
        pincode: '560100',
        website: 'https://smoketest-inst.edu.in',
        email: 'admissions@smoketest-inst.edu.in',
        phone: '+91 80 2852 0000',
        contactPerson: 'Dr. Ramesh Kumar (Dean of Admissions)',
        // Hostel section
        hostelAvailable: true,
        boysHostelAvailable: true,
        girlsHostelAvailable: true,
        hostelFee: '₹85,000 - ₹1,20,000 / year',
        messInfo: 'Nutritious 4-meal plan with vegetarian and non-vegetarian menus.',
        hostelFacilities: ['Wi-Fi 100Mbps', '24/7 Power Backup', 'Gym', 'Laundry Service', 'Solar Hot Water'],
        otherFacilities: ['Central AC Library', 'Indoor Badminton Stadium', '24/7 Health Clinic', 'Cafeteria'],
        // Placement section
        placementPercentage: 92,
        averagePackage: 9.8,
        highestPackage: 48.5,
        medianPackage: 8.2,
        placementYear: '2024-25',
        placementCompanies: ['Google', 'Microsoft', 'Amazon', 'Infosys', 'TCS Digital', 'Cisco'],
        placementInfo: '92% of students secured premium offers across IT, Core Engineering, and Analytics.',
        // Status & SEO
        status: 'DRAFT',
        seoTitle: 'Smoke Test Institute Bangalore - Admissions, Courses & Placements',
        seoDescription: 'Explore programs, seat intake, hostel fees and recruiter placement highlights.',
        seoKeywords: ['engineering admission', 'bengaluru engineering', 'btech artificial intelligence'],
        // Initial Course
        courses: {
          create: [
            {
              name: 'B.Tech in Artificial Intelligence & Data Science',
              slug: `${testCollegeSlug}-btech-ai-ds`,
              duration: '4 Years',
              level: CourseLevel.UG,
              specialization: 'Artificial Intelligence',
              seats: 120,
              totalFees: 360000,
              applicationFee: 1500,
              eligibility: '10+2 with 60% in Physics, Math & Chemistry. KCET or COMEDK rank.',
              scholarshipInfo: 'Merit scholarship up to 50% tuition waiver for top 500 rankers.',
              status: 'PUBLISHED',
            },
            {
              name: 'M.Tech in Cyber Security',
              slug: `${testCollegeSlug}-mtech-cs`,
              duration: '2 Years',
              level: CourseLevel.PG,
              specialization: 'Information Security',
              seats: 30,
              totalFees: 240000,
              applicationFee: 2000,
              eligibility: 'B.E./B.Tech with 55% aggregate and GATE score.',
              scholarshipInfo: 'AICTE stipend of ₹12,400/month for GATE qualified students.',
              status: 'PUBLISHED',
            }
          ]
        },
        // Initial Gallery
        gallery: {
          create: [
            {
              imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800',
              caption: 'Main Academic Block & Innovation Hub',
              isCover: true,
              sortOrder: 1,
            },
            {
              imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
              caption: 'Central Digital Library & Discussion Pods',
              isCover: false,
              sortOrder: 2,
            }
          ]
        }
      },
      include: {
        courses: true,
        gallery: true,
      }
    });

    assert(!!createdCollege.id, `College created with ID: ${createdCollege.id}`);
    assert(createdCollege.name === 'Smoke Test Institute of Technology & Science', 'College name matches');
    assert(createdCollege.boysHostelAvailable === true && createdCollege.girlsHostelAvailable === true, 'Hostel availability stored');
    assert(createdCollege.hostelFacilities.length === 5, 'Hostel facilities stored (5 items)');
    assert(createdCollege.placementPercentage === 92, 'Placement percentage stored (92%)');
    assert(createdCollege.placementCompanies.length === 6, 'Placement companies stored (6 recruiters)');
    assert(createdCollege.courses.length === 2, '2 courses created successfully');
    assert(createdCollege.gallery.length === 2, '2 gallery images created successfully');

    // -------------------------------------------------------------
    // TEST 2: PUBLIC / STUDENT PAGE FETCH SYNCHRONIZATION
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Public Student College Page Retrieval ---');
    const publicCollege = await collegesService.getCollegeById(createdCollege.id);
    assert(publicCollege.id === createdCollege.id, 'Public service returned matching college ID');
    assert(publicCollege.hostelFee === '₹85,000 - ₹1,20,000 / year', 'Hostel fee structure retrieved without fallbacks');
    assert(publicCollege.courses.length === 2, 'Public courses match database records');
    assert(publicCollege.gallery.length === 2, 'Public gallery matches database records');
    assert(publicCollege.gallery[0].isCover === true, 'Featured/cover gallery image preserved');

    // -------------------------------------------------------------
    // TEST 3: EDIT COLLEGE SECTIONS & PARTNER SYNCHRONIZATION
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Update College Profile & Partner Portal Sync ---');
    const updatedCollege = await collegesService.updateCollege(createdCollege.id, {
      highestPackage: 52.0,
      messInfo: 'Upgraded 5-star rated multicuisine dining facility with organic choices.',
      hostelFacilities: ['Wi-Fi 100Mbps', '24/7 Power Backup', 'Gym', 'Laundry Service', 'Solar Hot Water', 'AC Rooms Available'],
    } as any, 'smoke-test-admin');

    assert(updatedCollege.highestPackage === 52.0, 'Highest package updated to 52 LPA');
    assert(updatedCollege.messInfo?.includes('multicuisine') ?? false, 'Mess info updated');
    assert(updatedCollege.hostelFacilities.length === 6, 'Hostel facilities updated to 6 items');

    // -------------------------------------------------------------
    // TEST 4: PUBLISH / UNPUBLISH TOGGLE
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Publish / Unpublish Status Toggle ---');
    const publishedCollege = await collegesService.setPublishStatus(createdCollege.id, true, 'system-admin');
    assert(publishedCollege.status === 'PUBLISHED', 'College status set to PUBLISHED');

    const draftCollege = await collegesService.setPublishStatus(createdCollege.id, false, 'system-admin');
    assert(draftCollege.status === 'DRAFT', 'College status reverted to DRAFT');

    // -------------------------------------------------------------
    // TEST 5: TEMPLATE GENERATION (XLSX & CSV)
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Bulk Import Template Generation ---');
    const xlsxTemplate = bulkService.generateTemplate('xlsx');
    assert(xlsxTemplate.buffer instanceof Buffer && xlsxTemplate.buffer.length > 1000, `Generated valid XLSX template (${xlsxTemplate.buffer.length} bytes)`);

    const csvTemplate = bulkService.generateTemplate('csv');
    assert(csvTemplate.buffer instanceof Buffer && csvTemplate.buffer.toString().includes('College Name'), 'Generated valid CSV template with headers');

    // -------------------------------------------------------------
    // TEST 6: VALIDATION & DUPLICATE DETECTION
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Validation, Duplicate Checking & Error Preview ---');
    const testRows = [
      {
        'College Name': 'Smoke Test Institute of Technology & Science', // Duplicate of existing
        'City': 'Bengaluru',
        'State': 'Karnataka',
        'Ownership': 'PRIVATE',
        'College Type': 'AUTONOMOUS',
      },
      {
        'College Name': 'Brand New Autonomous College',
        'City': 'Mysuru',
        'State': 'Karnataka',
        'Ownership': 'AUTONOMOUS',
        'College Type': 'AUTONOMOUS',
        'Boys Hostel Available (YES/NO)': 'YES',
        'Girls Hostel Available (YES/NO)': 'YES',
        'Hostel Fee Structure': '₹70,000/yr',
        'Placement Rate (%)': '85',
        'Average Package (LPA)': '6.5',
        'Course Name': 'B.Sc Computer Science',
        'Annual Fees (INR)': '65000',
        'Duration': '3 Years',
        'Degree / Level': 'UG',
      },
      {
        'College Name': '', // Invalid row missing name
        'City': 'Pune',
        'State': 'Maharashtra',
      },
      {
        'College Name': 'College with Invalid Numbers and Malformed URL',
        'City': 'Mumbai',
        'State': 'Maharashtra',
        'Placement Rate (%)': 'invalid_number',
        'Gallery URLs (Comma or Semicolon Separated)': 'not_a_valid_url',
      }
    ];

    const validationRes = await bulkService.validateRows(testRows);
    assert(validationRes.totalRows === 4, 'Total rows validated: 4');
    assert(validationRes.invalidRows >= 2, `Identified ${validationRes.invalidRows} invalid rows (missing name, bad numbers/urls)`);
    assert(validationRes.rowsToUpdate >= 1 || validationRes.duplicateRows >= 1, 'Identified existing duplicate college for update');
    assert(validationRes.rowsToCreate >= 1, 'Identified new valid college to create');

    // -------------------------------------------------------------
    // TEST 7: 100-ROW BULK IMPORT (WITH DATABASE CHUNKING)
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: 100-Row Large-Scale Bulk Import ---');
    const rows100: any[] = [];
    const runTimestamp = Date.now();
    for (let i = 1; i <= 100; i++) {
      rows100.push({
        'College Name': `Batch 100 College #${i} - ${runTimestamp}`,
        'City': i % 2 === 0 ? 'Chennai' : 'Coimbatore',
        'State': 'Tamil Nadu',
        'Ownership': i % 3 === 0 ? 'GOVERNMENT' : 'PRIVATE',
        'College Type': 'AUTONOMOUS',
        'Established Year': 1990 + (i % 30),
        'Boys Hostel Available (YES/NO)': 'YES',
        'Girls Hostel Available (YES/NO)': 'YES',
        'Hostel Fee Structure': '₹65,000 - ₹90,000/yr',
        'Placement Rate (%)': 70 + (i % 25),
        'Average Package (LPA)': (4.5 + (i % 5)).toFixed(1),
        'Highest Package (LPA)': (18 + (i % 20)).toFixed(1),
        'Top Recruiters (Comma Separated)': 'TCS, Cognizant, Wipro, Zoho',
        'Course Name': 'B.Tech Information Technology',
        'Annual Fees (INR)': 120000,
        'Duration': '4 Years',
        'Degree / Level': 'UG',
        'Intake / Seats': 120,
        'Gallery URLs (Comma or Semicolon Separated)': 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600',
        'Status (PUBLISHED/DRAFT/ACTIVE)': 'PUBLISHED'
      });
    }

    const t0 = Date.now();
    const import100Result = await bulkService.executeImport(rows100, 'UPDATE_EXISTING', 'smoke-test-admin');
    const elapsed100 = Date.now() - t0;

    assert(import100Result.totalProcessed === 100, '100-row batch import processed 100 rows');
    assert(import100Result.successfullyCreated === 100, `Successfully created 100 colleges (took ${elapsed100}ms)`);
    assert(import100Result.failed === 0, 'Zero failed rows in 100-row batch');
    assert(typeof import100Result.reportCsv === 'string' && import100Result.reportCsv.length > 500, 'Generated downloadable report CSV');

    // -------------------------------------------------------------
    // TEST 8: 500-ROW BULK IMPORT & CREATE VS UPDATE STRATEGY
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: 500-Row Bulk Import & Update Strategy ---');
    const rows500: any[] = [];
    for (let i = 1; i <= 500; i++) {
      rows500.push({
        'College Name': `Batch 500 College #${i} - ${runTimestamp}`,
        'City': i % 3 === 0 ? 'Hyderabad' : (i % 3 === 1 ? 'Warangal' : 'Vijayawada'),
        'State': i % 3 === 2 ? 'Andhra Pradesh' : 'Telangana',
        'Ownership': 'PRIVATE',
        'College Type': 'PRIVATE',
        'Established Year': 2000 + (i % 20),
        'Boys Hostel Available (YES/NO)': 'YES',
        'Girls Hostel Available (YES/NO)': 'YES',
        'Hostel Fee Structure': '₹80,000/yr',
        'Placement Rate (%)': 75 + (i % 20),
        'Average Package (LPA)': '6.2',
        'Highest Package (LPA)': '28.0',
        'Course Name': 'B.Tech Computer Engineering',
        'Annual Fees (INR)': 150000,
        'Duration': '4 Years',
        'Status (PUBLISHED/DRAFT/ACTIVE)': 'PUBLISHED'
      });
    }

    const t1 = Date.now();
    const import500Result = await bulkService.executeImport(rows500, 'UPDATE_EXISTING', 'smoke-test-admin');
    const elapsed500 = Date.now() - t1;

    assert(import500Result.totalProcessed === 500, '500-row batch import processed 500 rows');
    assert(import500Result.successfullyCreated === 500, `Successfully created 500 colleges in chunks (took ${elapsed500}ms)`);
    assert(import500Result.failed === 0, 'Zero failed rows in 500-row batch');

    // Re-import the first 50 rows to verify UPDATE_EXISTING strategy
    console.log('\n--- TEST 8b: Testing UPDATE_EXISTING Deduplication Logic ---');
    const updateRows = rows500.slice(0, 50).map(r => ({
      ...r,
      'Average Package (LPA)': '9.5',
      'Hostel Fee Structure': '₹95,000/yr',
    }));

    const updateResult = await bulkService.executeImport(updateRows, 'UPDATE_EXISTING', 'smoke-test-admin');
    assert(updateResult.successfullyUpdated === 50, 'Correctly identified and updated 50 existing college records without creating duplicates');
    assert(updateResult.successfullyCreated === 0, 'Zero new duplicate records created on re-import');

    // -------------------------------------------------------------
    // TEST 9: 1000-ROW BULK IMPORT SAFE CAPACITY CHECK
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: 1000-Row Bulk Import Performance & Safety ---');
    const rows1000: any[] = [];
    for (let i = 1; i <= 1000; i++) {
      rows1000.push({
        'College Name': `Batch 1000 College #${i} - ${runTimestamp}`,
        'City': 'Ahmedabad',
        'State': 'Gujarat',
        'Ownership': 'PRIVATE',
        'College Type': 'PRIVATE',
        'Established Year': 2010,
        'Placement Rate (%)': 80,
        'Course Name': 'MBA Business Analytics',
        'Annual Fees (INR)': 200000,
        'Status (PUBLISHED/DRAFT/ACTIVE)': 'PUBLISHED'
      });
    }

    const t2 = Date.now();
    const import1000Result = await bulkService.executeImport(rows1000, 'UPDATE_EXISTING', 'smoke-test-admin');
    const elapsed1000 = Date.now() - t2;

    assert(import1000Result.totalProcessed === 1000, '1000-row batch import completed safely');
    assert(import1000Result.successfullyCreated === 1000, `Successfully imported 1000 colleges in chunked transactions (took ${elapsed1000}ms)`);

    // -------------------------------------------------------------
    // TEST 10: SEARCH & FILTER INTEGRITY AFTER IMPORT
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Search and Filter Consistency ---');
    const searchRes = await collegesService.getAllColleges({
      q: `Batch 1000 College #42 - ${runTimestamp}`,
      limit: 5,
    });
    assert(searchRes.data.length === 1, 'Indexed college found instantly through search query');
    assert(searchRes.data[0]?.city === 'Ahmedabad', 'Matched college location verified');

    // -------------------------------------------------------------
    // CLEANUP TEST DATA
    // -------------------------------------------------------------
    console.log('\n--- CLEANUP: Removing Smoke Test Records ---');
    const deletedBatch100 = await prisma.college.deleteMany({
      where: { name: { contains: `Batch 100 College` } }
    });
    const deletedBatch500 = await prisma.college.deleteMany({
      where: { name: { contains: `Batch 500 College` } }
    });
    const deletedBatch1000 = await prisma.college.deleteMany({
      where: { name: { contains: `Batch 1000 College` } }
    });
    const deletedSmokeInst = await prisma.college.deleteMany({
      where: { slug: testCollegeSlug }
    });

    console.log(`Cleaned up ${deletedBatch100.count + deletedBatch500.count + deletedBatch1000.count + deletedSmokeInst.count} test colleges.`);

  } catch (error) {
    console.error('Fatal error during smoke test:', error);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  console.log(`🏁 SMOKE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSmokeTest();
