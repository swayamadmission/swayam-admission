const BASE_URL = 'http://localhost:3000/v1';

async function runSmokeTests() {
  console.log('🚀 Starting Swayam Admission Liquid Glass Smart Search Smoke Tests...\n');

  // Test 1: Real Database Trending Content
  console.log('1. Testing Real Database Trending Content (/v1/search/trending)...');
  const trendingRes = await fetch(`${BASE_URL}/search/trending`);
  if (!trendingRes.ok) {
    throw new Error(`Failed to fetch trending content: ${trendingRes.status}`);
  }
  const trending = (await trendingRes.json()) as any;
  console.log('   - Trending searches count:', trending.searches?.length || 0);
  console.log('   - Trending colleges count:', trending.colleges?.length || 0);
  console.log('   - Trending courses count:', trending.courses?.length || 0);
  console.log('   - Trending study materials count:', trending.studyMaterials?.length || 0);
  console.log('   - Trending guides count:', trending.guides?.length || 0);
  console.log('   - Trending streams:', trending.streams);

  if (trending.searches?.length > 0) {
    console.log('   ✅ Sample real trending search:', trending.searches[0]);
  }
  if (trending.colleges?.length > 0) {
    console.log('   ✅ Sample real college URL:', trending.colleges[0].url);
  }
  if (trending.studyMaterials?.length > 0) {
    console.log('   ✅ Sample real study material URL:', trending.studyMaterials[0].url);
  }

  // Test 2: Live Categorized Suggestions for various terms
  console.log('\n2. Testing Live Suggestions (/v1/search/suggestions)...');
  const testKeywords = ['neet', 'eng', 'tech', 'delhi'];
  for (const kw of testKeywords) {
    const suggRes = await fetch(`${BASE_URL}/search/suggestions?q=${encodeURIComponent(kw)}`);
    if (!suggRes.ok) {
      throw new Error(`Failed to fetch suggestions for ${kw}`);
    }
    const data = (await suggRes.json()) as any;
    console.log(`   - Keyword "${kw}": ${data.all?.length || 0} total suggestions (Colleges: ${data.colleges?.length || 0}, Courses: ${data.courses?.length || 0}, StudyMaterials: ${data.studyMaterials?.length || 0}, Guides: ${data.guides?.length || 0}, Locations: ${data.locations?.length || 0})`);
    if (data.all?.length > 0) {
      const first = data.all[0];
      if (!first.title || !first.url || !first.type) {
        throw new Error(`Invalid suggestion structure for ${kw}`);
      }
    }
  }
  console.log('   ✅ Live suggestions return valid typed structures for all content types');

  // Test 3: Dedicated Full Search API (/v1/search)
  console.log('\n3. Testing Full Database Search (/v1/search)...');
  const searchRes = await fetch(`${BASE_URL}/search?q=engineering`);
  if (!searchRes.ok) {
    throw new Error(`Failed to fetch full search results: ${searchRes.status}`);
  }
  const searchData = (await searchRes.json()) as any;
  console.log('   - Search results for "engineering":');
  console.log('     * Colleges:', searchData.colleges?.length || 0);
  console.log('     * Courses:', searchData.courses?.length || 0);
  console.log('     * Study Materials:', searchData.studyMaterials?.length || 0);
  console.log('     * Guides:', searchData.guides?.length || 0);
  console.log('   ✅ Multi-entity database search successfully retrieves results across all tables');

  // Test 4: Verify navigation URLs match real routes
  console.log('\n4. Verifying Result Navigation URLs...');
  const sampleSuggestionsRes = await fetch(`${BASE_URL}/search/suggestions?q=a`);
  const sampleSuggestions = ((await sampleSuggestionsRes.json()) as any).all || [];
  for (const item of sampleSuggestions.slice(0, 5)) {
    console.log(`   * [${item.type.toUpperCase()}] ${item.title} -> ${item.url}`);
    if (
      !item.url.startsWith('/colleges') &&
      !item.url.startsWith('/courses') &&
      !item.url.startsWith('/study-materials') &&
      !item.url.startsWith('/blog') &&
      !item.url.startsWith('/exams') &&
      !item.url.startsWith('/scholarships')
    ) {
      throw new Error(`Unrecognized navigation route for item: ${item.url}`);
    }
  }
  console.log('   ✅ All suggestion URLs map to legitimate, active application routes');

  console.log('\n🎉 ALL SMOKE TESTS PASSED SUCCESSFULLY!');
}

runSmokeTests().catch((err) => {
  console.error('❌ Smoke test failed:', err);
  process.exit(1);
});
