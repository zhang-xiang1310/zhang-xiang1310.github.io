import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { list, put } from "@vercel/blob";
import { uploadSlots } from "./slots.js";

const LOCAL_UPLOAD_ROOT = path.join(
  process.cwd(),
  "public",
  "uploads",
  "personal-site"
);
const LOCAL_PUBLIC_PREFIX = "/uploads/personal-site";
const BLOB_PREFIX = process.env.BLOB_PREFIX ?? "personal-intro-site";

function hasBlobStorage() {
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

function sanitizeFileName(name) {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return cleaned || "asset";
}

async function getLatestBlobAsset(slot) {
  const result = await list({
    prefix: `${BLOB_PREFIX}/${slot}/`,
    limit: 1000
  });

  const latest = result.blobs
    .slice()
    .sort(
      (left, right) =>
        new Date(right.uploadedAt).getTime() -
        new Date(left.uploadedAt).getTime()
    )[0];

  if (!latest) {
    return null;
  }

  return {
    slot,
    url: latest.url,
    pathname: latest.pathname,
    uploadedAt: new Date(latest.uploadedAt).toISOString(),
    size: latest.size
  };
}

async function getLatestLocalAsset(slot) {
  const slotDirectory = path.join(LOCAL_UPLOAD_ROOT, slot);

  try {
    const entries = await fs.readdir(slotDirectory, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const fullPath = path.join(slotDirectory, entry.name);
          const stat = await fs.stat(fullPath);

          return { name: entry.name, stat };
        })
    );
    const latest = files.sort(
      (left, right) => right.stat.mtimeMs - left.stat.mtimeMs
    )[0];

    if (!latest) {
      return null;
    }

    return {
      slot,
      url: `${LOCAL_PUBLIC_PREFIX}/${slot}/${latest.name}`,
      pathname: `${slot}/${latest.name}`,
      uploadedAt: latest.stat.mtime.toISOString(),
      size: latest.stat.size
    };
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function getLatestAssets() {
  const entries = await Promise.all(
    uploadSlots.map(async (slot) => {
      const asset = hasBlobStorage()
        ? await getLatestBlobAsset(slot.id)
        : await getLatestLocalAsset(slot.id);

      return [slot.id, asset];
    })
  );

  return Object.fromEntries(entries);
}

export async function saveUploadedAsset(slot, buffer, meta = {}) {
  const originalName = sanitizeFileName(meta.filename || "upload");
  const pathname = `${BLOB_PREFIX}/${slot}/${Date.now()}-${crypto.randomUUID()}-${originalName}`;

  if (hasBlobStorage()) {
    const blob = await put(
      pathname,
      new Blob([buffer], {
        type: meta.contentType || "application/octet-stream"
      }),
      {
        access: "public",
        addRandomSuffix: false
      }
    );

    return {
      slot,
      url: blob.url,
      pathname: blob.pathname,
      uploadedAt: new Date().toISOString(),
      contentType: meta.contentType,
      size: buffer.length
    };
  }

  const slotDirectory = path.join(LOCAL_UPLOAD_ROOT, slot);
  const localFileName = `${Date.now()}-${crypto.randomUUID()}-${originalName}`;
  const localFilePath = path.join(slotDirectory, localFileName);

  await fs.mkdir(slotDirectory, { recursive: true });
  await fs.writeFile(localFilePath, buffer);

  return {
    slot,
    url: `${LOCAL_PUBLIC_PREFIX}/${slot}/${localFileName}`,
    pathname: `${slot}/${localFileName}`,
    uploadedAt: new Date().toISOString(),
    contentType: meta.contentType,
    size: buffer.length
  };
}
