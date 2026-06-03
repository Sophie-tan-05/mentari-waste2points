import { describe, it, expect } from 'vitest'
import { calcPoints } from '../lib/points'

describe('calcPoints', () => {
  describe('within launch bonus (first 50 scans — 2× multiplier)', () => {
    it('1 kg → 20 pts', () => {
      expect(calcPoints(1, 0)).toBe(20)
    })

    it('0.5 kg → 10 pts', () => {
      expect(calcPoints(0.5, 0)).toBe(10)
    })

    it('scan #49 still gets bonus', () => {
      expect(calcPoints(1, 49)).toBe(20)
    })
  })

  describe('after launch bonus (scan #50 onward — 1× multiplier)', () => {
    it('1 kg → 10 pts', () => {
      expect(calcPoints(1, 50)).toBe(10)
    })

    it('0.5 kg → 5 pts', () => {
      expect(calcPoints(0.5, 50)).toBe(5)
    })

    it('scan #100 gets no bonus', () => {
      expect(calcPoints(1, 100)).toBe(10)
    })
  })
})
