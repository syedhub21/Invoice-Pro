const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'];

const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertBelowThousand(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) {
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
  }
  return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convertBelowThousand(n % 100) : '');
}

export function amountToWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';

  const isNegative = amount < 0;
  amount = Math.abs(amount);

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let words = '';

  // Indian numbering: Crores, Lakhs, Thousands, Hundreds
  if (rupees >= 10000000) {
    words += convertBelowThousand(Math.floor(rupees / 10000000)) + ' Crore ';
  }
  const afterCrore = rupees % 10000000;
  if (afterCrore >= 100000) {
    words += convertBelowThousand(Math.floor(afterCrore / 100000)) + ' Lakh ';
  }
  const afterLakh = afterCrore % 100000;
  if (afterLakh >= 1000) {
    words += convertBelowThousand(Math.floor(afterLakh / 1000)) + ' Thousand ';
  }
  const afterThousand = afterLakh % 1000;
  if (afterThousand > 0) {
    words += convertBelowThousand(afterThousand);
  }

  words = words.trim() + ' Rupees';

  if (paise > 0) {
    words += ' and ' + convertBelowThousand(paise) + ' Paise';
  }

  words += ' Only';

  if (isNegative) words = 'Minus ' + words;

  return words;
}

export function formatInvoiceNumber(num: number): string {
  return `INV-${String(num).padStart(4, '0')}`;
}
