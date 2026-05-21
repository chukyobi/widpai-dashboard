const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
  cloud_name: "dcpvbgqdw",
  api_key: "645355554349312",
  api_secret: "fXAfgyqoc0EoJS-PA_njqXV__P0"
});

// Create a valid minimalist PDF
const pdfBuffer = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000109 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n187\n%%EOF',
  'utf-8'
);

cloudinary.uploader.upload_stream(
  { resource_type: 'auto', folder: 'widpai_uploads', public_id: 'test_real_pdf_auto' },
  (err, result) => {
    console.log("AUTO err:", err, "url:", result?.secure_url);
    if(result) {
        fetch(result.secure_url).then(r => console.log('AUTO Headers:', r.headers.get('content-type')));
    }
  }
).end(pdfBuffer);
