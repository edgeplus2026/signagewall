import {
  applyColumnMapping,
  hashMapping,
  parsePriceNumber,
} from './apply-mapping';

describe('applyColumnMapping', () => {
  const table = {
    headers: ['Name', 'Price', 'Notes', 'Group'],
    rows: [
      ['Espresso', '2.50', 'double shot', 'Drinks'],
      ['Flat white', '3', '', 'Drinks'],
      ['', '', '', ''],
      ['Brownie', '4', 'gluten free', 'Desserts'],
    ],
  };

  it('maps by header name and drops all-blank rows', () => {
    const records = applyColumnMapping(table, {
      name: 'Name',
      price: 'Price',
      description: 'Notes',
      category: 'Group',
    });
    expect(records).toEqual([
      {
        name: 'Espresso',
        price: '2.50',
        description: 'double shot',
        category: 'Drinks',
      },
      { name: 'Flat white', price: '3', category: 'Drinks' },
      {
        name: 'Brownie',
        price: '4',
        description: 'gluten free',
        category: 'Desserts',
      },
    ]);
  });

  it('survives column reordering — the mapping names headers, not positions', () => {
    const reordered = {
      headers: ['Price', 'Name'],
      rows: [['9', 'Burger']],
    };
    expect(
      applyColumnMapping(reordered, { name: 'Name', price: 'Price' }),
    ).toEqual([{ name: 'Burger', price: '9' }]);
  });

  it('ignores mapped headers that no longer exist', () => {
    expect(
      applyColumnMapping(table, { name: 'Name', imageUrl: 'Photo' }),
    ).toEqual([
      { name: 'Espresso' },
      { name: 'Flat white' },
      { name: 'Brownie' },
    ]);
  });
});

describe('parsePriceNumber', () => {
  it('reads the first numeric token, with comma decimals', () => {
    expect(parsePriceNumber('2,50 €')).toBe(2.5);
    expect(parsePriceNumber('25 kr')).toBe(25);
    expect(parsePriceNumber('$ 1 299.90')).toBe(1299.9);
  });

  it('returns undefined for text with no number', () => {
    expect(parsePriceNumber('ask us')).toBeUndefined();
  });
});

describe('hashMapping', () => {
  it('is order-insensitive and value-sensitive', () => {
    const a = hashMapping({ name: 'Name', price: 'Price' });
    const b = hashMapping({ price: 'Price', name: 'Name' });
    const c = hashMapping({ name: 'Name', price: 'Cost' });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
