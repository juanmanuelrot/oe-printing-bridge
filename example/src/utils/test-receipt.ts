/**
 * Builds a sample ESC/POS receipt for testing.
 *
 * ESC/POS commands used:
 * - ESC @ (0x1B 0x40) — Initialize printer
 * - ESC a n (0x1B 0x61 n) — Set alignment (0=left, 1=center, 2=right)
 * - ESC E n (0x1B 0x45 n) — Bold on/off
 * - GS ! n (0x1D 0x21 n) — Set character size
 * - LF (0x0A) — Line feed
 * - GS V m (0x1D 0x56 m) — Cut paper (m=0 full cut, m=1 partial cut)
 */
export function buildTestReceipt(): Uint8Array {
  const parts: number[] = [];

  // Initialize printer
  parts.push(0x1B, 0x40);

  // Center alignment
  parts.push(0x1B, 0x61, 0x01);

  // Double height + double width
  parts.push(0x1D, 0x21, 0x11);

  // Title
  appendText(parts, 'PRINTER BRIDGE');
  parts.push(0x0A);

  // Normal size
  parts.push(0x1D, 0x21, 0x00);

  appendText(parts, 'Test Receipt');
  parts.push(0x0A);

  // Separator
  appendText(parts, '================================');
  parts.push(0x0A);

  // Left alignment
  parts.push(0x1B, 0x61, 0x00);

  // Date/time
  const now = new Date();
  appendText(parts, `Date: ${now.toLocaleDateString()}`);
  parts.push(0x0A);
  appendText(parts, `Time: ${now.toLocaleTimeString()}`);
  parts.push(0x0A);
  parts.push(0x0A);

  // Bold on
  parts.push(0x1B, 0x45, 0x01);
  appendText(parts, 'Order Items:');
  parts.push(0x0A);
  // Bold off
  parts.push(0x1B, 0x45, 0x00);

  // Items
  const items = [
    { name: 'Espresso', qty: 2, price: 3.50 },
    { name: 'Cappuccino', qty: 1, price: 4.00 },
    { name: 'Croissant', qty: 3, price: 2.50 },
  ];

  for (const item of items) {
    const line = `${item.qty}x ${item.name}`;
    const price = `$${(item.qty * item.price).toFixed(2)}`;
    const padding = 32 - line.length - price.length;
    appendText(parts, line + ' '.repeat(Math.max(1, padding)) + price);
    parts.push(0x0A);
  }

  appendText(parts, '--------------------------------');
  parts.push(0x0A);

  // Total
  const total = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  parts.push(0x1B, 0x45, 0x01); // Bold
  const totalLine = 'TOTAL';
  const totalPrice = `$${total.toFixed(2)}`;
  const totalPadding = 32 - totalLine.length - totalPrice.length;
  appendText(parts, totalLine + ' '.repeat(Math.max(1, totalPadding)) + totalPrice);
  parts.push(0x0A);
  parts.push(0x1B, 0x45, 0x00); // Bold off

  parts.push(0x0A);

  // Center
  parts.push(0x1B, 0x61, 0x01);
  appendText(parts, 'Thank you!');
  parts.push(0x0A);
  appendText(parts, 'Printer Bridge v1.0');
  parts.push(0x0A);
  parts.push(0x0A);
  parts.push(0x0A);

  // Cut paper (partial)
  parts.push(0x1D, 0x56, 0x01);

  return new Uint8Array(parts);
}

function appendText(parts: number[], text: string): void {
  for (let i = 0; i < text.length; i++) {
    parts.push(text.charCodeAt(i));
  }
}
