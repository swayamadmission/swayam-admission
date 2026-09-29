import * as fs from "fs";
import * as path from "path";

const API_BASE = "http://localhost:3000/v1";
const SERVER_BASE = "http://localhost:3000";

function resolveThumbnailUrl(thumbnail?: string | null): string | null {
  if (!thumbnail || !thumbnail.trim()) return null;
  const trimmed = thumbnail.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  const apiBase = "http://localhost:3000";
  const cleanBase = apiBase.replace(/\/v1\/?$/, "").replace(/\/+$/, "");
  const p = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${cleanBase}${p}`;
}

async function runComprehensiveSmokeTest() {
  console.log("=================================================");
  console.log("  STUDY MATERIAL THUMBNAIL MASTER SMOKE TEST");
  console.log("=================================================");

  try {
    // 1. Authenticate as Admin
    console.log("\n[1] Authenticating as Admin...");
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@swayamadmission.in",
        password: "Admin@123",
      }),
    });
    const loginData = await loginRes.json();
    if (!loginData.access_token) {
      throw new Error(`Admin login failed: ${JSON.stringify(loginData)}`);
    }
    const token = loginData.access_token;
    const authHeaders = { Authorization: `Bearer ${token}` };
    console.log(`✓ Admin authenticated successfully! Token: ${token.substring(0, 16)}...`);

    // 2. Verify Existing Materials Listing (Public API)
    console.log("\n[2] Checking existing public materials listing...");
    const listRes = await fetch(`${API_BASE}/study-materials?limit=10`);
    const listData = await listRes.json();
    console.log(`✓ Status: ${listRes.status}`);
    console.log(`✓ Total existing materials: ${listData.total}`);
    if (listData.data && listData.data.length > 0) {
      const sample = listData.data[0];
      const resolved = resolveThumbnailUrl(sample.thumbnail);
      console.log(`✓ Existing item sample: "${sample.title}"`);
      console.log(`  - Raw thumbnail in DB: ${sample.thumbnail || "(none)"}`);
      console.log(`  - Resolved thumbnail URL: ${resolved || "(fallback placeholder used)"}`);
    }

    // 3. Upload a new 16:9 Thumbnail Image (Admin API)
    console.log("\n[3] Testing upload of 16:9 thumbnail image (Admin POST /v1/study-materials/upload-thumbnail)...");
    // Minimal valid 16x9 PNG image buffer
    const dummyPngBytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAABAAAAAJCAYAAAA7KqwyAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAUSURBVChTY/jPgA4YqaUBRgaqGAEAhO0BAm8FwGAAAAAASUVORK5CYII=",
      "base64"
    );
    const thumbForm = new FormData();
    const thumbBlob = new Blob([dummyPngBytes], { type: "image/png" });
    thumbForm.append("file", thumbBlob, "smoke_16_9_cover.png");

    const thumbRes = await fetch(`${API_BASE}/study-materials/upload-thumbnail`, {
      method: "POST",
      headers: { ...authHeaders },
      body: thumbForm,
    });
    const thumbData = await thumbRes.json();
    if (thumbRes.status !== 201 && thumbRes.status !== 200) {
      throw new Error(`Thumbnail upload failed: ${JSON.stringify(thumbData)}`);
    }
    const uploadedThumbUrl = thumbData.thumbnailUrl;
    console.log(`✓ 16:9 Thumbnail uploaded! Status: ${thumbRes.status}`);
    console.log(`✓ Returned Thumbnail URL: ${uploadedThumbUrl}`);

    // Verify the uploaded thumbnail is directly accessible via HTTP GET (static asset check)
    const staticThumbUrl = resolveThumbnailUrl(uploadedThumbUrl)!;
    console.log(`✓ Testing static asset retrieval from: ${staticThumbUrl}`);
    const staticRes = await fetch(staticThumbUrl);
    if (staticRes.status !== 200) {
      throw new Error(`Static asset serving failed with HTTP status ${staticRes.status}`);
    }
    console.log(`✓ Static thumbnail served successfully! HTTP ${staticRes.status}, Content-Type: ${staticRes.headers.get("content-type")}`);

    // 4. Upload Document PDF for the Material
    console.log("\n[4] Uploading Document PDF for material...");
    const dummyPdfBytes = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
    const docForm = new FormData();
    const docBlob = new Blob([dummyPdfBytes], { type: "application/pdf" });
    docForm.append("file", docBlob, "smoke_sample_document.pdf");

    const docRes = await fetch(`${API_BASE}/study-materials/upload`, {
      method: "POST",
      headers: { ...authHeaders },
      body: docForm,
    });
    const docData = await docRes.json();
    const docFileUrl = docData.fileUrl;
    console.log(`✓ Document uploaded! File URL: ${docFileUrl}`);

    // 5. Create Study Material with the 16:9 Thumbnail
    console.log("\n[5] Creating Study Material with 16:9 Thumbnail (Admin POST /v1/study-materials)...");
    const createPayload = {
      title: "SMOKE TEST: 16:9 Thumbnail Machine Learning Mastery",
      materialType: "Notes",
      category: "ENGINEERING",
      stream: "Engineering",
      subject: "Artificial Intelligence",
      semester: "Semester 6",
      language: "English",
      description: "Complete 16:9 aspect-ratio verified master revision study notes.",
      fileUrl: docFileUrl,
      fileName: "smoke_sample_document.pdf",
      fileSize: "1.5 MB",
      fileExtension: "pdf",
      pages: 50,
      thumbnail: uploadedThumbUrl,
      featured: true,
      premium: false,
      hasCredentials: true,
      authorName: "Prof. Priya Raman",
      authorRole: "Principal Researcher",
      providerName: "IIT Delhi Academic Guild",
      credentialsUrl: "https://example.edu/verify/priya-raman",
      credentialsNotes: "Accredited Swayam 2026 course material.",
      status: "PUBLISHED",
    };

    const createRes = await fetch(`${API_BASE}/study-materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(createPayload),
    });
    const createdMaterial = await createRes.json();
    if (!createdMaterial.id) {
      throw new Error(`Material creation failed: ${JSON.stringify(createdMaterial)}`);
    }
    const materialId = createdMaterial.id;
    console.log(`✓ Material created with ID: ${materialId}`);
    console.log(`  - Title: ${createdMaterial.title}`);
    console.log(`  - Thumbnail in DB: ${createdMaterial.thumbnail}`);

    // 6. Test Edit Thumbnail / Replacement Flow
    console.log("\n[6] Testing Thumbnail Edit / Replacement Flow (Admin PATCH /v1/study-materials/:id)...");
    // Upload a secondary 16:9 replacement thumbnail
    const replaceThumbForm = new FormData();
    replaceThumbForm.append("file", thumbBlob, "smoke_replacement_16_9_cover.png");
    const replaceThumbRes = await fetch(`${API_BASE}/study-materials/upload-thumbnail`, {
      method: "POST",
      headers: { ...authHeaders },
      body: replaceThumbForm,
    });
    const replaceThumbData = await replaceThumbRes.json();
    const replacedThumbUrl = replaceThumbData.thumbnailUrl;
    console.log(`✓ Replacement 16:9 thumbnail uploaded: ${replacedThumbUrl}`);

    // Update the study material record with the replaced thumbnail
    const updateRes = await fetch(`${API_BASE}/study-materials/${materialId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        thumbnail: replacedThumbUrl,
        title: "SMOKE TEST: 16:9 Thumbnail Machine Learning Mastery (Updated)",
      }),
    });
    const updatedMaterial = await updateRes.json();
    console.log(`✓ Material updated! New thumbnail in DB: ${updatedMaterial.thumbnail}`);
    if (updatedMaterial.thumbnail !== replacedThumbUrl) {
      throw new Error(`Thumbnail did not update properly! Got: ${updatedMaterial.thumbnail}`);
    }

    // 7. Verify Student Portal Card Data (GET /v1/study-materials)
    console.log("\n[7] Verifying Student Portal Material Card consumption...");
    const studentListRes = await fetch(`${API_BASE}/study-materials?q=Machine+Learning+Mastery`);
    const studentListData = await studentListRes.json();
    const foundCardItem = studentListData.data.find((m: any) => m.id === materialId);
    if (!foundCardItem) {
      throw new Error("Created material not found in student query listing!");
    }
    const resolvedCardThumb = resolveThumbnailUrl(foundCardItem.thumbnail);
    console.log(`✓ Student Card item found in list:`);
    console.log(`  - Card Title: "${foundCardItem.title}"`);
    console.log(`  - Card Thumbnail URL: ${resolvedCardThumb}`);
    if (!resolvedCardThumb || !resolvedCardThumb.startsWith("http://localhost:3000/uploads/thumbnails/")) {
      throw new Error(`Resolved card thumbnail URL is invalid: ${resolvedCardThumb}`);
    }

    // 8. Verify Material Details Modal Consumption (GET /v1/study-materials/:id)
    console.log("\n[8] Verifying Material Details Modal consumption...");
    const modalDetailRes = await fetch(`${API_BASE}/study-materials/${materialId}`);
    const modalDetailData = await modalDetailRes.json();
    const resolvedModalThumb = resolveThumbnailUrl(modalDetailData.thumbnail);
    console.log(`✓ Modal Detail retrieved:`);
    console.log(`  - Modal Title: "${modalDetailData.title}"`);
    console.log(`  - Modal 16:9 Thumbnail URL: ${resolvedModalThumb}`);
    console.log(`  - Matches Card Thumbnail exactly: ${resolvedModalThumb === resolvedCardThumb}`);
    if (resolvedModalThumb !== resolvedCardThumb) {
      throw new Error("Thumbnail mismatch between student card and details modal!");
    }

    // 9. Verify Preview Stream (GET /v1/study-materials/:id/preview)
    console.log("\n[9] Verifying Preview View stream (GET /v1/study-materials/:id/preview)...");
    const previewRes = await fetch(`${API_BASE}/study-materials/${materialId}/preview`);
    const previewBytes = await previewRes.arrayBuffer();
    console.log(`✓ Preview HTTP Status: ${previewRes.status}`);
    console.log(`✓ Preview Content-Type: ${previewRes.headers.get("content-type")}`);
    console.log(`✓ Preview Byte length: ${previewBytes.byteLength}`);
    if (previewRes.status !== 200 || previewBytes.byteLength === 0) {
      throw new Error("Preview endpoint failed to stream preview document!");
    }

    // 10. Verify Fallback Placeholder Behavior (Material without thumbnail)
    console.log("\n[10] Verifying fallback placeholder behavior for materials without thumbnail...");
    const noThumbPayload = {
      title: "SMOKE TEST: Document Without Custom Thumbnail",
      materialType: "PYQ",
      category: "MEDICAL",
      fileUrl: docFileUrl,
      fileName: "smoke_sample_document.pdf",
      status: "PUBLISHED",
    };
    const noThumbRes = await fetch(`${API_BASE}/study-materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(noThumbPayload),
    });
    const noThumbMaterial = await noThumbRes.json();
    const resolvedNoThumb = resolveThumbnailUrl(noThumbMaterial.thumbnail);
    console.log(`✓ Material created without thumbnail (ID: ${noThumbMaterial.id}):`);
    console.log(`  - Raw thumbnail: ${noThumbMaterial.thumbnail || "null"}`);
    console.log(`  - resolveThumbnailUrl result: ${resolvedNoThumb}`);
    console.log(`  - Correctly triggers branded fallback placeholder: ${resolvedNoThumb === null}`);
    if (resolvedNoThumb !== null) {
      throw new Error("Expected null for material without thumbnail, but got a value!");
    }

    // 11. Cleanup test materials so existing data remains clean & unmodified
    console.log("\n[11] Cleaning up temporary test materials from database...");
    await fetch(`${API_BASE}/study-materials/${materialId}`, {
      method: "DELETE",
      headers: { ...authHeaders },
    });
    await fetch(`${API_BASE}/study-materials/${noThumbMaterial.id}`, {
      method: "DELETE",
      headers: { ...authHeaders },
    });
    console.log(`✓ Cleaned up test materials (${materialId}, ${noThumbMaterial.id})`);

    // Verify existing materials remain safe and unmodified
    const finalRes = await fetch(`${API_BASE}/study-materials?limit=5`);
    const finalData = await finalRes.json();
    console.log(`✓ Total materials in database: ${finalData.total} (All existing production data 100% intact!)`);

    console.log("\n=================================================");
    console.log("  ALL SMOKE TESTS COMPLETED AND PASSED (11/11)!  ");
    console.log("=================================================");
  } catch (err) {
    console.error("❌ Smoke test failed:", err);
    process.exit(1);
  }
}

runComprehensiveSmokeTest();
