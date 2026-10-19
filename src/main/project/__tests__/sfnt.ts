import { inflateSync } from 'zlib'

/** Ricostruisce un ttf dal woff, per provare la lettura diretta delle tabelle */
export function woffToSfnt(buf: Buffer, base = 0): Buffer {
  const n = buf.readUInt16BE(12)
  const tables = Array.from({ length: n }, (_, i) => {
    const r = 44 + i * 20
    const offset = buf.readUInt32BE(r + 4)
    const comp = buf.readUInt32BE(r + 8)
    const orig = buf.readUInt32BE(r + 12)
    const data = buf.subarray(offset, offset + comp)
    return { tag: buf.subarray(r, r + 4), data: comp < orig ? inflateSync(data) : data }
  })
  const head = Buffer.alloc(12 + n * 16)
  head.writeUInt32BE(0x00010000, 0)
  head.writeUInt16BE(n, 4)
  let offset = base + head.length
  const body: Buffer[] = []
  tables.forEach((t, i) => {
    const r = 12 + i * 16
    t.tag.copy(head, r)
    head.writeUInt32BE(offset, r + 8)
    head.writeUInt32BE(t.data.length, r + 12)
    const padded = Buffer.alloc(Math.ceil(t.data.length / 4) * 4)
    t.data.copy(padded)
    body.push(padded)
    offset += padded.length
  })
  return Buffer.concat([head, ...body])
}

/** Raccolta (ttc) con un solo font, per provare la lettura delle raccolte */
export function sfntToTtc(woff: Buffer): Buffer {
  const head = Buffer.alloc(16)
  head.write('ttcf', 0, 'latin1')
  head.writeUInt32BE(0x00010000, 4)
  head.writeUInt32BE(1, 8)
  head.writeUInt32BE(16, 12)
  return Buffer.concat([head, woffToSfnt(woff, 16)])
}
