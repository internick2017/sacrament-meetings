import { describe, it, expect } from 'vitest';
import { callingFormSchema } from './callings-schema';

const t = ((key: string) => key) as never;

const valid = {
  organizationKey: 'primary',
  personName: 'Ana Silva',
  title: 'President',
  displayOrder: '0',
};

describe('callingFormSchema', () => {
  it('accepts a valid calling', () => {
    expect(callingFormSchema(t).safeParse(valid).success).toBe(true);
  });

  it('requires a person name', () => {
    const result = callingFormSchema(t).safeParse({ ...valid, personName: '   ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['personName']);
  });

  it('requires a title', () => {
    const result = callingFormSchema(t).safeParse({ ...valid, title: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['title']);
  });

  it('rejects an organization key that is not one of the seven', () => {
    expect(callingFormSchema(t).safeParse({ ...valid, organizationKey: 'choir' }).success).toBe(
      false
    );
  });

  it('coerces the display order from the string a form sends', () => {
    const result = callingFormSchema(t).safeParse({ ...valid, displayOrder: '3' });
    expect(result.success).toBe(true);
    expect(result.data?.displayOrder).toBe(3);
  });

  it('rejects a negative display order', () => {
    expect(callingFormSchema(t).safeParse({ ...valid, displayOrder: '-1' }).success).toBe(false);
  });
});
