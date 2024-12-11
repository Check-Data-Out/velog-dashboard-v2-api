import dotenv from 'dotenv';

dotenv.config();

const keys: string[] = Array.from({ length: 10 }, (_, i) => {
  const key = process.env[`AES_KEY_${i}`];
  if (!key || key.length !== 32) {
    throw new Error(`Invalid AES_KEY_${i}: Must be 32 bytes`);
  }
  return key;
});

export const getKeyByGroup = (group: number): string => {
  const keyIndex = (group % 100) % keys.length;
  return keys[keyIndex];
};
