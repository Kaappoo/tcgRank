import './env.ts'

/**
 * One-off: deletes every file the app ever uploaded to UploadThing (profile photos and legacy deck covers). Photos
 * were replaced by avatars, so nothing reads them any more. Uses UploadThing's REST API directly, since the SDK is no
 * longer a dependency. Run once with the old `UPLOADTHING_TOKEN` set: `pnpm tsx scripts/delete-uploaded-photos.ts`.
 * Pass `--dry-run` to only list what would go.
 */
const token = process.env.UPLOADTHING_TOKEN
if (!token) throw new Error('Set UPLOADTHING_TOKEN to the app’s token first')
const { apiKey } = JSON.parse(Buffer.from(token, 'base64').toString('utf8')) as { apiKey: string }
const dryRun = process.argv.includes('--dry-run')

const call = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(`https://api.uploadthing.com${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-uploadthing-api-key': apiKey },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`UploadThing ${path} answered ${response.status}: ${await response.text()}`)
  return response.json() as Promise<T>
}

const keys: Array<string> = []
for (let offset = 0; ; offset += 500) {
  const { files, hasMore } = await call<{ files: Array<{ key: string }>; hasMore: boolean }>('/v6/listFiles', {
    limit: 500,
    offset,
  })
  keys.push(...files.map((f) => f.key))
  if (!hasMore) break
}
console.log(`${keys.length} uploaded files found`)
if (dryRun || keys.length === 0) process.exit(0)

for (let i = 0; i < keys.length; i += 100) {
  await call('/v6/deleteFiles', { fileKeys: keys.slice(i, i + 100) })
}
console.log(`✓ deleted ${keys.length} files`)
