const axios = require('axios');
const FormData = require('form-data');
const archiver = require('archiver');
const { Busboy } = require('busboy');

exports.handler = async (event, context) => {
    // Hanya izinkan metode POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Parse form data (multipart/form-data) dari request body
        const parsedData = await parseMultipartData(event);
        
        const { siteName, files } = parsedData;

        if (!siteName || !files || files.length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Nama situs dan file harus disertakan'
                })
            };
        }

        // Validasi nama situs
        if (!/^[a-z0-9-]+$/.test(siteName)) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Nama situs hanya boleh mengandung huruf kecil, angka, dan tanda hubung'
                })
            };
        }

        // Dapatkan access token dari environment variables Netlify
        const accessToken = process.env.NETLIFY_ACCESS_TOKEN;

        if (!accessToken) {
            console.error('Netlify access token tidak dikonfigurasi di environment variables.');
            return {
                statusCode: 500,
                body: JSON.stringify({
                    success: false,
                    message: 'ada kesalahan di bagian backend, harap bersabar (Konfigurasi Server Salah)'
                })
            };
        }

        // 1. Buat site baru di Netlify
        const createSiteResponse = await axios.post(
            'https://api.netlify.com/api/v1/sites',
            { name: siteName },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const siteId = createSiteResponse.data.site_id;
        const siteUrl = createSiteResponse.data.url;

        // 2. Buat zip stream dari file yang diunggah
        const zipStream = archiver('zip', { zlib: { level: 9 } });
        const form = new FormData();
        
        // Pipe arsip ke form
        zipStream.pipe(form);

        // Tambahkan setiap file ke arsip
        files.forEach(file => {
            zipStream.append(file.content, { name: file.filename });
        });
        
        // Finalisasi arsip
        zipStream.finalize();

        // 3. Unggah file zip ke Netlify
        const deployResponse = await axios.post(
            `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
            form,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    ...form.getHeaders() // Penting untuk mendapatkan boundary yang benar
                }
            }
        );

        if (deployResponse.data && deployResponse.data.deploy) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    url: siteUrl,
                    message: 'Deploy berhasil'
                })
            };
        } else {
            throw new Error('Gagal mendeploy ke Netlify');
        }

    } catch (error) {
        console.error('Error during deployment:', error.response?.data || error.message);
        
        let errorMessage = 'ada kesalahan di bagian backend, harap bersabar';
        if (error.response && error.response.status === 409) {
            errorMessage = 'Nama situs sudah digunakan. Silakan pilih nama lain.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: errorMessage
            })
        };
    }
};

// Fungsi untuk parsing multipart data di dalam environment serverless
function parseMultipartData(event) {
    return new Promise((resolve, reject) => {
        const busboy = Busboy({ headers: event.headers });
        const result = {
            files: [],
            siteName: null
        };

        busboy.on('file', (fieldname, file, { filename, mimeType }) => {
            const chunks = [];
            file.on('data', data => chunks.push(data));
            file.on('end', () => {
                result.files.push({
                    filename,
                    content: Buffer.concat(chunks),
                    mimeType
                });
            });
        });

        busboy.on('field', (fieldname, value) => {
            if (fieldname === 'siteName') {
                result.siteName = value;
            }
        });

        busboy.on('error', error => reject(error));
        busboy.on('finish', () => resolve(result));

        // Menggunakan Buffer dari event.body
        busboy.end(Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'binary'));
    });
}