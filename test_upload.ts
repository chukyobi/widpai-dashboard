import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: "dcpvbgqdw",
  api_key: "645355554349312",
  api_secret: "fXAfgyqoc0EoJS-PA_njqXV__P0"
});

const buffer = Buffer.from("dummy pdf content %PDF-1.4");
cloudinary.uploader.upload_stream(
  { resource_type: 'raw', folder: 'widpai_uploads', public_id: 'test_pdf_upload.pdf' },
  (err, result) => {
    console.log(err, result?.secure_url);
  }
).end(buffer);
