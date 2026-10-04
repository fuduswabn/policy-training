#!/usr/bin/env node
import { createWriteStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const supabaseUrl = required('SUPABASE_URL').replace(/\/$/, '');
const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY');
const outputDir = process.env.BACKUP_STORAGE_DIR || './storage-backup';
const allowlist = (process.env.BACKUP_STORAGE_BUCKET_ALLOWLIST || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

async function callSupabase(route, init = {}) {
  const response = await fetch(`${supabaseUrl}${route}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase ${route} failed: ${response.status} ${body}`);
  }

  return response.json();
}

function encodeObjectPath(objectPath) {
  return objectPath.split('/').map(encodeURIComponent).join('/');
}

function safeTargetPath(bucketName, objectPath) {
  const target = path.resolve(outputDir, 'objects', bucketName, ...objectPath.split('/'));
  const root = path.resolve(outputDir, 'objects', bucketName);
  if (!target.startsWith(root + path.sep) && target !== root) {
    throw new Error(`Unsafe storage object path: ${bucketName}/${objectPath}`);
  }
  return target;
}

async function downloadObject(bucketName, objectPath) {
  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucketName)}/${encodeObjectPath(objectPath)}`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  if (!response.ok || !response.body) {
    const body = await response.text();
    throw new Error(`Download failed for ${bucketName}/${objectPath}: ${response.status} ${body}`);
  }

  const target = safeTargetPath(bucketName, objectPath);
  await mkdir(path.dirname(target), { recursive: true });

  const hash = crypto.createHash('sha256');
  const hasher = new Transform({
    transform(chunk, _encoding, callback) {
      hash.update(chunk);
      callback(null, chunk);
    },
  });

  await pipeline(Readable.fromWeb(response.body), hasher, createWriteStream(target));

  return {
    path: objectPath,
    sha256: hash.digest('hex'),
    bytes: Number(response.headers.get('content-length') || 0),
    contentType: response.headers.get('content-type'),
    backedUpAt: new Date().toISOString(),
  };
}

async function listObjects(bucketName, prefix = '') {
  const objects = [];
  let offset = 0;

  while (true) {
    const page = await callSupabase(`/storage/v1/object/list/${encodeURIComponent(bucketName)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        limit: 1000,
        offset,
        prefix,
        sortBy: { column: 'name', order: 'asc' },
      }),
    });

    if (!Array.isArray(page) || page.length === 0) {
      break;
    }

    for (const item of page) {
      const objectPath = prefix ? `${prefix}/${item.name}` : item.name;
      const looksLikeFolder = !item.id && !item.metadata;

      if (looksLikeFolder) {
        objects.push(...await listObjects(bucketName, objectPath));
      } else {
        const downloaded = await downloadObject(bucketName, objectPath);
        objects.push({ ...item, ...downloaded });
      }
    }

    offset += page.length;
  }

  return objects;
}

await mkdir(outputDir, { recursive: true });

const buckets = await callSupabase('/storage/v1/bucket');
const selectedBuckets = allowlist.length > 0
  ? buckets.filter((bucket) => allowlist.includes(bucket.name) || allowlist.includes(bucket.id))
  : buckets;

const manifest = {
  generatedAt: new Date().toISOString(),
  supabaseUrl,
  allowlist,
  bucketCount: selectedBuckets.length,
  buckets: [],
};

for (const bucket of selectedBuckets) {
  const objects = await listObjects(bucket.id || bucket.name);
  manifest.buckets.push({
    id: bucket.id,
    name: bucket.name,
    public: bucket.public,
    fileSizeLimit: bucket.file_size_limit,
    allowedMimeTypes: bucket.allowed_mime_types,
    createdAt: bucket.created_at,
    updatedAt: bucket.updated_at,
    objectCount: objects.length,
    objects,
  });
}

await writeFile(
  path.join(outputDir, 'storage-inventory.json'),
  JSON.stringify(manifest, null, 2),
);

console.log(`Storage backup complete: ${manifest.bucketCount} bucket(s), ${manifest.buckets.reduce((sum, bucket) => sum + bucket.objectCount, 0)} object(s).`);
