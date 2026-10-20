import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Watchdog, waitForAll, within } from '../exportWait'

const later = <T>(ms: number, v?: T): Promise<T | undefined> =>
  new Promise((r) => setTimeout(() => r(v), ms))

describe("attese dell'esportazione", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('un lavoro lungo che procede non scade', async () => {
    // 100 immagini che arrivano ogni 2 s: 200 s in tutto, mai 10 s di silenzio
    const items = Array.from({ length: 100 }, (_, i) => ({
      label: `img${i}`,
      promise: later((i + 1) * 2000)
    }))
    let progress = 0
    const done = waitForAll(items, 10000, () => progress++)
    await vi.advanceTimersByTimeAsync(200000)
    await expect(done).resolves.toBeUndefined()
    expect(progress).toBe(100)
  })

  it('dopo il silenzio rifiuta e dice cosa manca', async () => {
    const items = [
      { label: 'a.png', promise: later(1000) },
      { label: 'b.png', promise: new Promise(() => {}) },
      { label: 'font X', promise: new Promise(() => {}) }
    ]
    const done = waitForAll(items, 10000)
    const check = expect(done).rejects.toThrow('still waiting after 10 s for: b.png, font X')
    await vi.advanceTimersByTimeAsync(11001)
    await check
  })

  it('una promessa rifiutata conta come finita', async () => {
    const done = waitForAll([{ label: 'x', promise: Promise.reject(new Error('no')) }], 1000)
    await expect(done).resolves.toBeUndefined()
  })

  it('niente da aspettare', async () => {
    await expect(waitForAll([], 1000)).resolves.toBeUndefined()
  })

  it('within scade con il messaggio dato', async () => {
    const p = within(new Promise(() => {}), 500, 'no frame')
    const check = expect(p).rejects.toThrow('no frame')
    await vi.advanceTimersByTimeAsync(501)
    await check
    await expect(within(Promise.resolve(3), 500, 'x')).resolves.toBe(3)
  })

  it('il watchdog scatta solo dopo il silenzio', async () => {
    const fired = vi.fn()
    const dog = new Watchdog(60000, fired)
    // 5 minuti di lavoro con un segno di vita ogni 5 s
    for (let t = 0; t < 300000; t += 5000) {
      await vi.advanceTimersByTimeAsync(5000)
      dog.alive()
    }
    expect(fired).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(60000)
    expect(fired).toHaveBeenCalledOnce()
    dog.stop()
  })

  it('il watchdog fermato non scatta', async () => {
    const fired = vi.fn()
    new Watchdog(1000, fired).stop()
    await vi.advanceTimersByTimeAsync(2000)
    expect(fired).not.toHaveBeenCalled()
  })
})
