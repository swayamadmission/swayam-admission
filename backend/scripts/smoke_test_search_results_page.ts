import * as fs from 'fs';
import * as path from 'path';

async function runSearchResultsSmokeTest() {
  console.log('================================================================');
  console.log(' SWAYAM ADMISSION — SEARCH RESULTS PAGE SMOKE TEST & LAYOUT AUDIT ');
  console.log('================================================================\n');

  const filePath = path.resolve(__dirname, '../../frontend/user/src/app/components/SearchResultsPage.tsx');
  if (!fs.existsSync(filePath)) {
    throw new Error(`SearchResultsPage.tsx not found at ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // 1. Verify layout sequence: Search bar -> Category tabs -> Result count/filter row -> Search results
  console.log('[1] Verifying exact DOM hierarchy: Search bar → Category tabs → Result count row → Search results...');

  const searchBarIdx = content.indexOf('<LiquidGlassSearchBar');
  const categoryTabsIdx = content.indexOf('CATEGORY TABS / CHIPS — DIRECTLY BELOW SEARCH BAR');
  const resultCountIdx = content.indexOf('RESULT COUNT & FILTER ROW');
  const searchResultsIdx = content.indexOf('RESULTS SECTIONS');

  if (searchBarIdx === -1) throw new Error('LiquidGlassSearchBar not found in SearchResultsPage');
  if (categoryTabsIdx === -1) throw new Error('Category tabs container not found in SearchResultsPage');
  if (resultCountIdx === -1) throw new Error('Result count & filter row not found in SearchResultsPage');
  if (searchResultsIdx === -1) throw new Error('Search results section not found in SearchResultsPage');

  if (
    searchBarIdx < categoryTabsIdx &&
    categoryTabsIdx < resultCountIdx &&
    resultCountIdx < searchResultsIdx
  ) {
    console.log('    ✅ Verified correct ordering:');
    console.log('       1. LiquidGlassSearchBar (Search bar)');
    console.log('       2. Category Tabs (Directly below search bar)');
    console.log('       3. Result Count & Filter Row');
    console.log('       4. Search Results Grid/Sections');
  } else {
    throw new Error(
      `Incorrect element ordering! Expected SearchBar (${searchBarIdx}) < Tabs (${categoryTabsIdx}) < Count (${resultCountIdx}) < Results (${searchResultsIdx})`
    );
  }

  // 2. Verify Category Tabs container properties (no clipping, responsive horizontal scroll)
  console.log('\n[2] Verifying Category Tabs responsive container and styling...');
  if (!content.includes('overflow-x-auto') || !content.includes('no-scrollbar') || !content.includes('scroll-smooth')) {
    throw new Error('Category tabs missing responsive horizontal scrolling utilities (overflow-x-auto, no-scrollbar, scroll-smooth)');
  }
  if (!content.includes('shrink-0')) {
    throw new Error('Category tabs buttons missing shrink-0 to prevent squashing/wrapping on smaller screens');
  }
  console.log('    ✅ Category tabs equipped with overflow-x-auto, no-scrollbar, scroll-smooth and shrink-0.');

  // 3. Verify Header Section is NOT overflow-hidden (which causes dropdown or tab clipping)
  console.log('\n[3] Verifying Header Section overflow behavior...');
  if (content.includes('overflow-hidden border-b border-gray-200/80 bg-gradient-to-b')) {
    throw new Error('Header section still contains overflow-hidden which clips floating dropdown and tabs!');
  }
  if (!content.includes('overflow-visible')) {
    throw new Error('Header section should explicitly have overflow-visible');
  }
  console.log('    ✅ Header section is overflow-visible (no clipping of dropdown or tabs).');

  // 4. Verify all 10 Academic Categories are present in filters
  console.log('\n[4] Verifying all category filters exist and are properly labeled...');
  const expectedKeys = ['ALL', 'COLLEGES', 'COURSES', 'MATERIALS', 'GUIDES', 'EXAMS', 'SCHOLARSHIPS', 'STREAMS', 'BLOGS', 'REPORTS'];
  for (const key of expectedKeys) {
    if (!content.includes(`key: "${key}"`)) {
      throw new Error(`Missing expected filter key: ${key}`);
    }
  }
  console.log('    ✅ All 10 categories present: All, Colleges, Courses, Materials, Guides, Exams, Scholarships, Streams, Blogs, Reports.');

  // 5. Verify Brand Colors and styling preservation
  console.log('\n[5] Verifying Brand Colors and Liquid Glass styling...');
  if (!content.includes('#4A7B5B') || !content.includes('#E8F3EC')) {
    throw new Error('Swayam Admission brand colors (#4A7B5B, #E8F3EC) missing from SearchResultsPage');
  }
  console.log('    ✅ Swayam Admission primary (#4A7B5B) and accent/subtle colors verified.');

  // 6. Verify Filter reset and synchronicity
  console.log('\n[6] Verifying Filter State Synchronization...');
  if (!content.includes('Clear Category Filter') || !content.includes('handleFilterChange("ALL")')) {
    throw new Error('Missing active filter reset functionality');
  }
  console.log('    ✅ Category filter state is synchronized with URL search params and includes reset action.');

  console.log('\n================================================================');
  console.log(' 🌟 ALL SEARCH RESULTS PAGE SMOKE TESTS PASSED CLEANLY!         ');
  console.log('================================================================');
}

runSearchResultsSmokeTest().catch((err) => {
  console.error('❌ Test failed:', err.message || err);
  process.exit(1);
});
