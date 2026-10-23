import { describe, it, expect } from 'vitest';
import { dec, DecimalValue, DivisionByZeroError, InvalidDecimalError, RoundingMode } from './decimal.js';

describe('BE-01: Shared Decimal Arithmetic Module', () => {
  describe('Precision & Floating-Point Protection', () => {
    it('accurately computes 0.1 + 0.2 without JavaScript floating-point error (0.30000000000000004)', () => {
      const a = dec('0.1');
      const b = dec('0.2');
      const sum = a.add(b);
      expect(sum.toString()).toBe('0.3');
      expect(sum.toNumber()).toBe(0.3);
      expect(sum.toFixed(2)).toBe('0.30');
    });

    it('accurately subtracts 0.3 - 0.2', () => {
      const diff = dec('0.3').sub('0.2');
      expect(diff.toString()).toBe('0.1');
    });

    it('accurately multiplies rates and fuel quantities without precision loss', () => {
      // 150.35 litres * 94.75 INR/L = 14245.6625
      const litres = dec('150.35');
      const rate = dec('94.75');
      const total = litres.mul(rate);
      expect(total.toString()).toBe('14245.6625');
      // Preserves intermediate precision
      expect(total.roundMoney().toString()).toBe('14245.66');
    });

    it('accurately handles precise division without premature rounding', () => {
      const ten = dec('10');
      const three = dec('3');
      const result = ten.div(three);
      expect(result.toString().startsWith('3.3333333333333333333')).toBe(true);
      // Explicit boundary rounding
      expect(result.round(4).toString()).toBe('3.3333');
      expect(result.round(2).toString()).toBe('3.33');
    });
  });

  describe('Division by Zero & Input Validation', () => {
    it('throws DivisionByZeroError when dividing by zero', () => {
      const a = dec(100);
      expect(() => a.div(0)).toThrow(DivisionByZeroError);
      expect(() => a.div('0')).toThrow(DivisionByZeroError);
      expect(() => a.div(dec(0))).toThrow(DivisionByZeroError);
    });

    it('throws DivisionByZeroError when modulo by zero', () => {
      const a = dec(100);
      expect(() => a.mod(0)).toThrow(DivisionByZeroError);
    });

    it('throws InvalidDecimalError on malformed string or non-finite number inputs', () => {
      expect(() => dec('abc')).toThrow(InvalidDecimalError);
      expect(() => dec('')).toThrow(InvalidDecimalError);
      expect(() => dec('   ')).toThrow(InvalidDecimalError);
      expect(() => dec(NaN)).toThrow(InvalidDecimalError);
      expect(() => dec(Infinity)).toThrow(InvalidDecimalError);
    });
  });

  describe('Explicit Rounding Policies', () => {
    it('supports ROUND_HALF_UP correctly on boundary values', () => {
      expect(dec('10.555').round(2, RoundingMode.ROUND_HALF_UP).toString()).toBe('10.56');
      expect(dec('10.554').round(2, RoundingMode.ROUND_HALF_UP).toString()).toBe('10.55');
      expect(dec('10.555').roundMoney().toString()).toBe('10.56');
    });

    it('supports ROUND_FLOOR and ROUND_CEIL correctly', () => {
      expect(dec('10.559').round(2, RoundingMode.ROUND_FLOOR).toString()).toBe('10.55');
      expect(dec('10.551').round(2, RoundingMode.ROUND_CEIL).toString()).toBe('10.56');
    });

    it('supports roundMoney, roundFuel, roundDistance, and roundRate', () => {
      expect(dec('1234.5678').roundMoney().toString()).toBe('1234.57');
      expect(dec('45.6789').roundFuel().toString()).toBe('45.68');
      expect(dec('350.456').roundDistance().toString()).toBe('350.46');
      expect(dec('4.123456').roundRate().toString()).toBe('4.1235');
    });
  });

  describe('Comparisons & Predicates', () => {
    it('correctly compares greater than, less than, equals', () => {
      const a = dec('100.50');
      const b = dec('100.5');
      const c = dec('100.51');
      const d = dec('99.99');

      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
      expect(c.greaterThan(a)).toBe(true);
      expect(d.lessThan(a)).toBe(true);
      expect(a.greaterThanOrEqual(b)).toBe(true);
      expect(a.lessThanOrEqual(b)).toBe(true);
    });

    it('checks zero, positive, and negative values', () => {
      expect(dec(0).isZero()).toBe(true);
      expect(dec('0.00').isZero()).toBe(true);
      expect(dec(5).isPositive()).toBe(true);
      expect(dec(0).isPositive()).toBe(false);
      expect(dec(-5).isNegative()).toBe(true);
      expect(dec(0).isNegative()).toBe(false);
    });

    it('computes min and max correctly across multiple inputs', () => {
      const min = DecimalValue.min(10, '5.5', dec('8.2'), 12);
      expect(min.toString()).toBe('5.5');

      const max = DecimalValue.max(10, '5.5', dec('8.2'), '25.75');
      expect(max.toString()).toBe('25.75');
    });
  });

  describe('Serialization & Serialization Precision', () => {
    it('serializes to string and JSON cleanly without scientific notation for standard numbers', () => {
      const val = dec('1234567.89');
      expect(val.toString()).toBe('1234567.89');
      expect(val.toJSON()).toBe('1234567.89');
      expect(JSON.stringify({ amount: val })).toBe('{"amount":"1234567.89"}');
    });

    it('preserves exact string representation when converted to fixed', () => {
      expect(dec('45').toFixed(2)).toBe('45.00');
      expect(dec('45.1').toFixed(2)).toBe('45.10');
    });
  });
});
