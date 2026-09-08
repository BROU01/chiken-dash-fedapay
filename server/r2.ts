import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";

let client: S3Client | undefined;

/** Cloudflare R2 is S3-API-compatible, so the standard AWS SDK works against
 * its endpoint — no separate R2-specific SDK needed. */
function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env.r2AccessKeyId, secretAccessKey: env.r2SecretAccessKey },
    });
  }
  return client;
}

const UPLOAD_URL_TTL_SECONDS = 5 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

/** Presigned PUT URL the browser uploads directly to — the file never passes through our server. */
export async function createUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({ Bucket: env.r2Bucket, Key: key, ContentType: contentType });
  return getSignedUrl(getClient(), command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
}

/** Presigned GET URL for reviewing a previously uploaded (private) document. */
export async function createDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: env.r2Bucket, Key: key });
  return getSignedUrl(getClient(), command, { expiresIn: DOWNLOAD_URL_TTL_SECONDS });
}
