// Development storage uses local disk. Production: upload to a private S3 bucket,
// then serve via CloudFront signed URLs (never make paid course media public).
export function publicUploadUrl(filename){return `/uploads/${encodeURIComponent(filename)}`;}
export function cloudFrontUrl(key){const domain=process.env.CLOUDFRONT_DOMAIN;if(!domain)return null;return `https://${domain}/${key}`;}
