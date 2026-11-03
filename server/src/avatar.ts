import { db } from './db.js';

// The app sends a small square picture, so anything larger did not come from it. A free database has 512 MB in all.
const MAX_AVATAR_BYTES = 30 * 1024;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

interface AvatarDocument {
  _id: string;
  image: string;
}

// Apart from the user, because Better Auth sends the whole user with each session.
const avatars = () => db.collection<AvatarDocument>('avatar');

/** Whether a value is a base64 JPEG picture of an acceptable size. */
export function isValidAvatar(image: unknown): image is string {
  if (typeof image !== 'string' || !BASE64.test(image)) return false;
  const bytes = Buffer.from(image, 'base64');
  return bytes.length <= MAX_AVATAR_BYTES && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export async function readAvatar(userId: string): Promise<string | null> {
  return (await avatars().findOne({ _id: userId }))?.image ?? null;
}

export async function saveAvatar(userId: string, image: string): Promise<void> {
  await avatars().updateOne({ _id: userId }, { $set: { image } }, { upsert: true });
}

export async function deleteAvatar(userId: string): Promise<void> {
  await avatars().deleteOne({ _id: userId });
}
