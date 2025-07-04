const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand} = require('@aws-sdk/client-s3');

class StorageService {
    constructor() {
        this.bucket = process.env.S3_BUCKET_NAME;

        this.client = new S3Client({
            endpoint: process.env.S3_ENDPOINT,
            region: process.env.S3_REGION,
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
            },
            forcePathStyle: true
        });
    }

    async uploadBuffer(buffer, key, mimeType) {
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
            ACL: 'public-read'
        });

        await this.client.send(command);

        return `${process.env.S3_ENDPOINT.replace(/\/+$/, '')}/${this.bucket}/${key}`;
    }

    async download(key) {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key
        });

        try {
            const response = await this.client.send(command);
            return response; // вернёт stream в поле Body
        } catch (error) {
            console.error('Failed to download file from S3:', error);
            throw error;
        }
    }

    async delete(key) {
        const command = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });

        try {
            return await this.client.send(command);
        } catch (error) {
            console.error('Failed to delete file from S3:', error);
            throw error;
        }
    }
}

module.exports = StorageService;
