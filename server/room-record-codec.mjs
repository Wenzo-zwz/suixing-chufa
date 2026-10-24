import { Buffer } from 'node:buffer';
import { gzipSync, gunzipSync } from 'node:zlib';

export const ROOM_RECORD_ENCODING = 'gzip-base64-v1';

export function encodeRoomRecord(record) {
  // Keep the generation identifier available to D1's json_extract CAS guard.
  return JSON.stringify({
    encoding: ROOM_RECORD_ENCODING,
    room: { id: record.room.id },
    data: gzipSync(JSON.stringify(record)).toString('base64')
  });
}

export function decodeRoomRecord(storedRecord) {
  if (!Object.hasOwn(storedRecord, 'encoding')) return storedRecord;
  if (storedRecord.encoding !== ROOM_RECORD_ENCODING) throw new Error('Unsupported room record encoding');
  const record = JSON.parse(gunzipSync(Buffer.from(storedRecord.data, 'base64')).toString('utf8'));
  if (record.room.id !== storedRecord.room.id) throw new Error('Room record generation mismatch');
  return record;
}
