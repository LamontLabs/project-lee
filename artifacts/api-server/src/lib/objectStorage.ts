import { randomUUID } from "node:crypto";
import { Storage, type File } from "@google-cloud/storage";

const SIDECAR = "http://127.0.0.1:1106";
export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit", subject_token_type: "access_token", token_url: `${SIDECAR}/token`,
    type: "external_account", credential_source: { url: `${SIDECAR}/credential`, format: { type: "json", subject_token_field_name: "access_token" } },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

function objectRef(path: string) {
  const parts = path.replace(/^\/+/, "").split("/");
  const bucket = parts.shift();
  if (!bucket || !parts.length) throw new Error("Invalid object storage path.");
  return { bucket, name: parts.join("/") };
}

export class ObjectNotFoundError extends Error {}

export class ObjectStorageService {
  private privateDir() {
    const value = process.env.PRIVATE_OBJECT_DIR;
    if (!value) throw new Error("PRIVATE_OBJECT_DIR is not configured.");
    return value.replace(/\/$/, "");
  }
  async requestUpload() {
    const id = randomUUID();
    const objectName = `${this.privateDir()}/uploads/${id}`;
    const { bucket, name } = objectRef(objectName);
    const response = await fetch(`${SIDECAR}/object-storage/signed-object-url`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ bucket_name: bucket, object_name: name, method: "PUT", expires_at: new Date(Date.now() + 15 * 60_000).toISOString() }),
    });
    if (!response.ok) throw new Error(`Failed to sign upload URL (${response.status}).`);
    const { signed_url: uploadURL } = await response.json() as { signed_url: string };
    return { uploadURL, objectPath: `/objects/uploads/${id}` };
  }
  async fileForPath(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError("Invalid object path.");
    const { bucket, name } = objectRef(`${this.privateDir()}/${objectPath.slice("/objects/".length)}`);
    const file = objectStorageClient.bucket(bucket).file(name);
    const [exists] = await file.exists();
    if (!exists) throw new ObjectNotFoundError("Object not found.");
    return file;
  }
  async read(objectPath: string) {
    const file = await this.fileForPath(objectPath);
    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();
    return { buffer, contentType: metadata.contentType ?? "application/octet-stream", size: Number(metadata.size ?? buffer.length) };
  }
}