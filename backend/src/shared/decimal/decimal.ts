import { Decimal } from 'decimal.js';

export class DecimalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecimalError';
  }
}

export class DivisionByZeroError extends DecimalError {
  constructor(message = 'Division by zero is not permitted.') {
    super(message);
    this.name = 'DivisionByZeroError';
  }
}

export class InvalidDecimalError extends DecimalError {
  constructor(invalidValue: unknown, message?: string) {
    super(message || `Invalid decimal input: ${String(invalidValue)}`);
    this.name = 'InvalidDecimalError';
  }
}

export enum RoundingMode {
  ROUND_UP = Decimal.ROUND_UP,
  ROUND_DOWN = Decimal.ROUND_DOWN,
  ROUND_CEIL = Decimal.ROUND_CEIL,
  ROUND_FLOOR = Decimal.ROUND_FLOOR,
  ROUND_HALF_UP = Decimal.ROUND_HALF_UP,
  ROUND_HALF_DOWN = Decimal.ROUND_HALF_DOWN,
  ROUND_HALF_EVEN = Decimal.ROUND_HALF_EVEN,
  ROUND_HALF_CEIL = Decimal.ROUND_HALF_CEIL,
  ROUND_HALF_FLOOR = Decimal.ROUND_HALF_FLOOR,
}

export type DecimalInput = string | number | Decimal | DecimalValue | { toString(): string };

// Configure default precision
const PreciseDecimal = Decimal.clone({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -12,
  toExpPos: 28,
});

/**
 * Immutable, precision-safe decimal wrapper for financial and operational calculations.
 * Prevents JavaScript IEEE-754 floating-point errors.
 */
export class DecimalValue {
  private readonly _d: Decimal;

  constructor(value: DecimalInput) {
    if (value instanceof DecimalValue) {
      this._d = value._d;
      return;
    }

    if (value instanceof Decimal) {
      this._d = value;
      return;
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new InvalidDecimalError(value, `Cannot create DecimalValue from non-finite number: ${value}`);
      }
      this._d = new PreciseDecimal(value.toString());
      return;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed || isNaN(Number(trimmed))) {
        throw new InvalidDecimalError(value, `Cannot parse string "${value}" as a decimal.`);
      }
      try {
        this._d = new PreciseDecimal(trimmed);
        return;
      } catch (err: unknown) {
        throw new InvalidDecimalError(value, `Decimal parsing failed: ${(err as Error).message}`);
      }
    }

    if (value && typeof value === 'object' && typeof value.toString === 'function') {
      const str = value.toString();
      if (!str || isNaN(Number(str))) {
        throw new InvalidDecimalError(value, `Cannot convert object to decimal: ${str}`);
      }
      this._d = new PreciseDecimal(str);
      return;
    }

    throw new InvalidDecimalError(value, `Unsupported decimal input type: ${typeof value}`);
  }

  public static from(value: DecimalInput): DecimalValue {
    if (value instanceof DecimalValue) {
      return value;
    }
    return new DecimalValue(value);
  }

  public static zero(): DecimalValue {
    return new DecimalValue(0);
  }

  public static min(...values: DecimalInput[]): DecimalValue {
    if (values.length === 0) {
      throw new DecimalError('DecimalValue.min requires at least one value');
    }
    return values.reduce<DecimalValue>((min, cur) => {
      const curDec = DecimalValue.from(cur);
      return curDec.lessThan(min) ? curDec : min;
    }, DecimalValue.from(values[0]));
  }

  public static max(...values: DecimalInput[]): DecimalValue {
    if (values.length === 0) {
      throw new DecimalError('DecimalValue.max requires at least one value');
    }
    return values.reduce<DecimalValue>((max, cur) => {
      const curDec = DecimalValue.from(cur);
      return curDec.greaterThan(max) ? curDec : max;
    }, DecimalValue.from(values[0]));
  }

  public get raw(): Decimal {
    return this._d;
  }

  public add(other: DecimalInput): DecimalValue {
    const o = DecimalValue.from(other);
    return new DecimalValue(this._d.plus(o._d));
  }

  public sub(other: DecimalInput): DecimalValue {
    const o = DecimalValue.from(other);
    return new DecimalValue(this._d.minus(o._d));
  }

  public mul(other: DecimalInput): DecimalValue {
    const o = DecimalValue.from(other);
    return new DecimalValue(this._d.times(o._d));
  }

  public div(other: DecimalInput): DecimalValue {
    const o = DecimalValue.from(other);
    if (o.isZero()) {
      throw new DivisionByZeroError();
    }
    return new DecimalValue(this._d.dividedBy(o._d));
  }

  public mod(other: DecimalInput): DecimalValue {
    const o = DecimalValue.from(other);
    if (o.isZero()) {
      throw new DivisionByZeroError('Modulo by zero is not permitted.');
    }
    return new DecimalValue(this._d.modulo(o._d));
  }

  public abs(): DecimalValue {
    return new DecimalValue(this._d.abs());
  }

  public neg(): DecimalValue {
    return new DecimalValue(this._d.negated());
  }

  /**
   * Explicit rounding at business boundaries.
   * Default: 2 decimal places with ROUND_HALF_UP.
   */
  public round(decimalPlaces = 2, mode: RoundingMode = RoundingMode.ROUND_HALF_UP): DecimalValue {
    if (decimalPlaces < 0) {
      throw new DecimalError('Decimal places cannot be negative.');
    }
    return new DecimalValue(this._d.toDecimalPlaces(decimalPlaces, mode as Decimal.Rounding));
  }

  /**
   * Currency rounding policy: 2 decimal places, half-up.
   */
  public roundMoney(): DecimalValue {
    return this.round(2, RoundingMode.ROUND_HALF_UP);
  }

  /**
   * Fuel quantity rounding policy: 2 decimal places, half-up.
   */
  public roundFuel(): DecimalValue {
    return this.round(2, RoundingMode.ROUND_HALF_UP);
  }

  /**
   * Distance rounding policy: 2 decimal places, half-up.
   */
  public roundDistance(): DecimalValue {
    return this.round(2, RoundingMode.ROUND_HALF_UP);
  }

  /**
   * Unit rate / benchmark mileage rounding policy: 4 decimal places, half-up.
   */
  public roundRate(): DecimalValue {
    return this.round(4, RoundingMode.ROUND_HALF_UP);
  }

  // Comparisons
  public equals(other: DecimalInput): boolean {
    const o = DecimalValue.from(other);
    return this._d.equals(o._d);
  }

  public greaterThan(other: DecimalInput): boolean {
    const o = DecimalValue.from(other);
    return this._d.greaterThan(o._d);
  }

  public greaterThanOrEqual(other: DecimalInput): boolean {
    const o = DecimalValue.from(other);
    return this._d.greaterThanOrEqualTo(o._d);
  }

  public lessThan(other: DecimalInput): boolean {
    const o = DecimalValue.from(other);
    return this._d.lessThan(o._d);
  }

  public lessThanOrEqual(other: DecimalInput): boolean {
    const o = DecimalValue.from(other);
    return this._d.lessThanOrEqualTo(o._d);
  }

  public isZero(): boolean {
    return this._d.isZero();
  }

  public isPositive(): boolean {
    return this._d.isPositive() && !this._d.isZero();
  }

  public isNegative(): boolean {
    return this._d.isNegative() && !this._d.isZero();
  }

  public isInteger(): boolean {
    return this._d.isInteger();
  }

  // Serialization & Formatting
  public toString(): string {
    return this._d.toString();
  }

  public toFixed(decimalPlaces = 2): string {
    return this._d.toFixed(decimalPlaces);
  }

  /**
   * Converts to JS number. Only use for non-sensitive presentation where precision is assured.
   */
  public toNumber(): number {
    return this._d.toNumber();
  }

  /**
   * Default JSON serialization outputs string representation to preserve precision across wire.
   */
  public toJSON(): string {
    return this._d.toString();
  }
}

/**
 * Convenience helper factory: dec(12.34)
 */
export function dec(val: DecimalInput): DecimalValue {
  return DecimalValue.from(val);
}
