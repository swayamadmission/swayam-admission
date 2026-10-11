import { PrismaClient } from '@prisma/client';
import { CollegesBulkService } from '../src/colleges/colleges-bulk.service';
import { CollegesService } from '../src/colleges/colleges.service';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function runSmokeTests() {
  console.log('===============================================================');
  console.log('  COLLEGE MEDIA & BULK UPLOAD MASTER FIX - COMPREHENSIVE SMOKE TEST');
  console.log('===============================================================\n');

  const mockAuditService: any = {
    logAction: async () => {},
  };

  const bulkService = new CollegesBulkService(prisma as any, mockAuditService);
  const collegesService = new CollegesService(prisma as any, mockAuditService);

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName} ${details ? '- ' + details : ''}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  const dbDistrict = await prisma.district.findFirst({
    include: { state: true },
  });
  const testCity = dbDistrict ? dbDistrict.name : 'Patna';
  const testState = dbDistrict ? dbDistrict.state.name : 'Bihar';
  const testCollegeName = `AutoTest Media College ${Date.now()}`;

  try {
    // ------------------------------------------------------------------
    // TEST 1: Template generation (XLSX and CSV with Brochure URL)
    // ------------------------------------------------------------------
    console.log('\n--- 1. Testing Template Generation (XLSX & CSV) ---');
    const csvResult = bulkService.generateTemplate('csv');
    const csvString = csvResult.buffer.toString('utf-8');
    assert(csvString.includes('Brochure URL'), 'CSV template includes Brochure URL header');
    assert(csvString.includes('Logo Image URL'), 'CSV template includes Logo Image URL header');
    assert(csvString.includes('Cover / Banner URL'), 'CSV template includes Cover / Banner URL header');

    const xlsxResult = bulkService.generateTemplate('xlsx');
    assert(xlsxResult.buffer.length > 500, 'XLSX template generated with valid buffer size');

    // ------------------------------------------------------------------
    // TEST 2: Validation of New College with Logo + Banner + Brochure
    // ------------------------------------------------------------------
    console.log('\n--- 2. Validating New College with Full Media URLs ---');
    const validRowWithAllMedia = {
      name: testCollegeName,
      state: testState,
      city: testCity,
      type: 'Private',
      ownership: 'Private',
      website: 'https://www.autotest-media.edu.in',
      phone: '+91 9876543210',
      email: 'admissions@autotest-media.edu.in',
      logo: 'https://images.unsplash.com/photo-1562774053-701939374585?w=200',
      banner: 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200',
      brochureUrl: 'https://www.autotest-media.edu.in/downloads/prospectus_2026.pdf',
      galleryUrls: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800, https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
    };

    const previewFull = await bulkService.validateRows([validRowWithAllMedia]);
    assert(previewFull.previewRows.length === 1, 'Single row preview returned');
    const row1 = previewFull.previewRows[0];
    assert(row1.action === 'CREATE' && row1.errors.length === 0, 'Valid row marked with action CREATE and 0 errors');
    assert(row1.mediaStatus?.logo === 'VALID', 'Logo mediaStatus is VALID');
    assert(row1.mediaStatus?.banner === 'VALID', 'Banner mediaStatus is VALID');
    assert(row1.mediaStatus?.brochure === 'VALID', 'Brochure mediaStatus is VALID');

    // ------------------------------------------------------------------
    // TEST 3: Validation of College without Optional Brochure
    // ------------------------------------------------------------------
    console.log('\n--- 3. Validating College without Optional Brochure ---');
    const validRowWithoutBrochure = {
      name: `${testCollegeName} No Brochure`,
      state: testState,
      city: testCity,
      type: 'Private',
      logo: 'https://images.unsplash.com/photo-1562774053-701939374585?w=200',
      banner: 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200',
      brochureUrl: '', // Optional empty
    };

    const previewNoBrochure = await bulkService.validateRows([validRowWithoutBrochure]);
    const row2 = previewNoBrochure.previewRows[0];
    assert(row2.action === 'CREATE' && row2.errors.length === 0, 'College without optional brochure remains CREATE with 0 errors');
    assert(row2.mediaStatus?.logo === 'VALID', 'Logo mediaStatus is VALID');
    assert(row2.mediaStatus?.banner === 'VALID', 'Banner mediaStatus is VALID');
    assert(row2.mediaStatus?.brochure === 'MISSING', 'Brochure mediaStatus is MISSING without error');

    // ------------------------------------------------------------------
    // TEST 4: Invalid Media URLs (Logo, Banner, Brochure)
    // ------------------------------------------------------------------
    console.log('\n--- 4. Validating Invalid Media URLs ---');
    const rowInvalidLogo = {
      ...validRowWithAllMedia,
      name: `${testCollegeName} Bad Logo`,
      logo: 'ftp://invalid-logo-domain/image.png',
    };
    const prevInvalidLogo = await bulkService.validateRows([rowInvalidLogo]);
    assert(prevInvalidLogo.previewRows[0].action === 'INVALID', 'Invalid logo URL rejected');
    assert(prevInvalidLogo.previewRows[0].mediaStatus?.logo === 'INVALID', 'Logo flagged INVALID');

    const rowInvalidBanner = {
      ...validRowWithAllMedia,
      name: `${testCollegeName} Bad Banner`,
      banner: 'not_a_url_string',
    };
    const prevInvalidBanner = await bulkService.validateRows([rowInvalidBanner]);
    assert(prevInvalidBanner.previewRows[0].action === 'INVALID', 'Malformed banner URL rejected');
    assert(prevInvalidBanner.previewRows[0].mediaStatus?.banner === 'INVALID', 'Banner flagged INVALID');

    const rowInvalidBrochure = {
      ...validRowWithAllMedia,
      name: `${testCollegeName} Bad Brochure`,
      brochureUrl: 'http://dummy.fake.invalid/prospectus.pdf', // Dummy/fake domain rejected
    };
    const prevInvalidBrochure = await bulkService.validateRows([rowInvalidBrochure]);
    assert(prevInvalidBrochure.previewRows[0].action === 'INVALID', 'Dummy/fake brochure URL rejected');
    assert(prevInvalidBrochure.previewRows[0].mediaStatus?.brochure === 'INVALID', 'Brochure flagged INVALID');

    // ------------------------------------------------------------------
    // TEST 5: Bulk Import Execution & Database Mapping
    // ------------------------------------------------------------------
    console.log('\n--- 5. Executing Bulk Import into Database ---');
    const validationForImport = await bulkService.validateRows([validRowWithAllMedia, validRowWithoutBrochure]);
    const importRes = await bulkService.executeImport(
      validationForImport.previewRows,
      'SKIP_EXISTING',
      'test-admin-id',
    );
    console.log('importRes summary:', {
      totalProcessed: importRes.totalProcessed,
      successfullyCreated: importRes.successfullyCreated,
      successfullyUpdated: importRes.successfullyUpdated,
      failed: importRes.failed,
      errors: importRes.items.filter((i) => i.status === 'FAILED'),
    });
    assert(importRes.successfullyCreated >= 2, `Successfully imported colleges (created: ${importRes.successfullyCreated})`);

    // Verify in DB
    const collegeInDb = await prisma.college.findFirst({
      where: { name: testCollegeName },
      include: { gallery: true },
    });
    assert(!!collegeInDb, 'College 1 found in database');
    assert(collegeInDb!.logo === validRowWithAllMedia.logo, 'College 1 logo matches input URL');
    assert(collegeInDb!.banner === validRowWithAllMedia.banner, 'College 1 banner matches input URL');
    assert(collegeInDb!.brochureUrl === validRowWithAllMedia.brochureUrl, 'College 1 brochureUrl matches input URL');
    assert(collegeInDb!.gallery.length === 2, 'College 1 gallery URLs correctly mapped (2 images)');

    const collegeNoBrochureDb = await prisma.college.findFirst({
      where: { name: `${testCollegeName} No Brochure` },
    });
    assert(!!collegeNoBrochureDb, 'College 2 found in database');
    assert(collegeNoBrochureDb!.brochureUrl === null, 'College 2 brochureUrl is null as expected');

    // ------------------------------------------------------------------
    // TEST 6: Existing College Update & Duplicate Prevention
    // ------------------------------------------------------------------
    console.log('\n--- 6. Testing Existing College Update & Duplicate Prevention ---');
    const updatedBrochureUrl = 'https://www.autotest-media.edu.in/downloads/updated_prospectus.pdf';
    const updateRow = {
      ...validRowWithAllMedia,
      brochureUrl: updatedBrochureUrl,
    };

    const validationForUpdate = await bulkService.validateRows([updateRow]);
    const updateImportRes = await bulkService.executeImport(
      validationForUpdate.previewRows,
      'UPDATE_EXISTING',
      'test-admin-id',
    );
    assert(updateImportRes.successfullyUpdated === 1, 'College record updated without creating duplicate');

    const totalMatching = await prisma.college.count({
      where: { name: testCollegeName },
    });
    assert(totalMatching === 1, 'Strictly 1 college record exists (no duplicate created)');

    const updatedCollegeDb = await prisma.college.findFirst({
      where: { name: testCollegeName },
    });
    assert(updatedCollegeDb!.brochureUrl === updatedBrochureUrl, 'College brochureUrl updated correctly');

    // ------------------------------------------------------------------
    // TEST 7: Direct Media File Upload, Replacement, and Old File Cleanup
    // ------------------------------------------------------------------
    console.log('\n--- 7. Testing Admin Media Upload, Replacement & Cleanup ---');
    const collegeId = collegeInDb!.id;

    // A. Logo Upload
    const fakeLogoBuffer = Buffer.from('fake-png-content-for-logo-testing');
    const logoFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'college_logo.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: fakeLogoBuffer.length,
      buffer: fakeLogoBuffer,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const uploadedLogo = await collegesService.uploadMediaFile(collegeId, logoFile, 'logo');
    assert(uploadedLogo.url.startsWith('/uploads/colleges/logos/'), 'Logo saved to secure uploads path');

    // Check file exists on disk
    const relativeLogoPath = uploadedLogo.url.replace(/^\//, '');
    const fullLogoPath = path.join(process.cwd(), relativeLogoPath);
    assert(fs.existsSync(fullLogoPath), 'Uploaded logo file exists on server disk');

    // B. Banner Upload & Replacement Cleanup
    const fakeBanner1 = Buffer.from('banner-version-1');
    const bannerFile1: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'banner1.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: fakeBanner1.length,
      buffer: fakeBanner1,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };
    const uploadedBanner1 = await collegesService.uploadMediaFile(collegeId, bannerFile1, 'banner');
    const fullBanner1Path = path.join(process.cwd(), uploadedBanner1.url.replace(/^\//, ''));
    assert(fs.existsSync(fullBanner1Path), 'Banner 1 written to disk');

    // Replace with Banner 2
    const fakeBanner2 = Buffer.from('banner-version-2-replaced');
    const bannerFile2: Express.Multer.File = {
      ...bannerFile1,
      originalname: 'banner2.webp',
      mimetype: 'image/webp',
      size: fakeBanner2.length,
      buffer: fakeBanner2,
    };
    const uploadedBanner2 = await collegesService.uploadMediaFile(collegeId, bannerFile2, 'banner');
    const fullBanner2Path = path.join(process.cwd(), uploadedBanner2.url.replace(/^\//, ''));
    assert(fs.existsSync(fullBanner2Path), 'Banner 2 written to disk');
    assert(!fs.existsSync(fullBanner1Path), 'Old Banner 1 file cleaned up (no orphaned media)');

    // C. Brochure Upload
    const fakeBrochure = Buffer.from('%PDF-1.4 test brochure binary stream');
    const brochureFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'campus_prospectus.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: fakeBrochure.length,
      buffer: fakeBrochure,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };
    const uploadedBrochure = await collegesService.uploadMediaFile(collegeId, brochureFile, 'brochure');
    assert(uploadedBrochure.url.startsWith('/uploads/colleges/brochures/'), 'Brochure saved in brochures folder');
    const fullBrochurePath = path.join(process.cwd(), uploadedBrochure.url.replace(/^\//, ''));
    assert(fs.existsSync(fullBrochurePath), 'Brochure PDF exists on disk');

    // Verify DB has the new brochureUrl
    const collegeWithNewBrochure = await prisma.college.findUnique({ where: { id: collegeId } });
    assert(collegeWithNewBrochure!.brochureUrl === uploadedBrochure.url, 'DB brochureUrl synchronized with upload');

    // ------------------------------------------------------------------
    // TEST 8: Partner Portal Brochure Update
    // ------------------------------------------------------------------
    console.log('\n--- 8. Testing Partner Portal Brochure Update ---');
    const partnerBrochure = 'https://www.autotest-media.edu.in/partner/brochure_v3.pdf';
    const partnerUpdateRes = await collegesService.updateCollege(
      collegeId,
      { brochureUrl: partnerBrochure } as any,
      'test-admin-id',
    );
    assert(partnerUpdateRes.brochureUrl === partnerBrochure, 'Partner update successfully sets brochureUrl');

    // ------------------------------------------------------------------
    // TEST 9: Student College Detail & Search Synchronization
    // ------------------------------------------------------------------
    console.log('\n--- 9. Testing Student College Detail & Search Synchronization ---');
    const detail = await collegesService.getCollegeById(collegeId);
    assert(detail.brochureUrl === partnerBrochure, 'Student detail API returns latest brochureUrl');
    assert(detail.logo === uploadedLogo.url, 'Student detail API returns latest logo');
    assert(detail.banner === uploadedBanner2.url, 'Student detail API returns latest banner');
    assert(Array.isArray(detail.gallery), 'Student detail API returns galleries list');

    // Test Search query returns logo and banner
    const searchResult = await prisma.college.findFirst({
      where: { id: collegeId },
      select: {
        id: true,
        name: true,
        logo: true,
        banner: true,
        city: true,
        state: true,
      },
    });
    assert(searchResult!.logo === uploadedLogo.url, 'Search query includes college logo');
    assert(searchResult!.banner === uploadedBanner2.url, 'Search query includes college banner');

    // ------------------------------------------------------------------
    // CLEANUP
    // ------------------------------------------------------------------
    console.log('\n--- Cleaning up test records & files ---');
    // Remove test files from disk
    if (fs.existsSync(fullLogoPath)) fs.unlinkSync(fullLogoPath);
    if (fs.existsSync(fullBanner2Path)) fs.unlinkSync(fullBanner2Path);
    if (fs.existsSync(fullBrochurePath)) fs.unlinkSync(fullBrochurePath);

    // Remove test colleges from DB
    await prisma.collegeGallery.deleteMany({
      where: { collegeId: { in: [collegeId, collegeNoBrochureDb!.id] } },
    });
    await prisma.college.deleteMany({
      where: { name: { in: [testCollegeName, `${testCollegeName} No Brochure`] } },
    });
    console.log('[CLEANUP] Database & test artifacts cleaned successfully.');

    console.log('\n===============================================================');
    console.log(`  ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('===============================================================\n');
  } catch (err) {
    console.error('Test failed with error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSmokeTests();
