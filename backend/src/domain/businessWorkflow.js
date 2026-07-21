export const STAGES = Object.freeze(['lead', 'proposal', 'contract', 'active', 'delivered', 'invoiced', 'paid', 'closed']);

export function validateMoney(value, field = 'amount') {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${field} must be a non-negative number`);
  return Math.round(number * 100) / 100;
}

export function validateTransition(from, to, { role, contractVersion, approvedAt, reconciliationReference } = {}) {
  const allowed = {
    lead: ['proposal'], proposal: ['lead', 'contract'], contract: ['proposal', 'active'], active: ['delivered'],
    delivered: ['active', 'invoiced'], invoiced: ['paid'], paid: ['closed'], closed: []
  };
  if (!allowed[from]?.includes(to)) throw new Error('invalid workflow transition');
  if (to === 'active' && (!contractVersion || !approvedAt)) throw new Error('approved contract version required');
  if (['paid', 'closed'].includes(to) && !reconciliationReference) throw new Error('payment reconciliation reference required');
  if (['invoiced', 'paid', 'closed'].includes(to) && !['owner', 'admin', 'finance'].includes(role)) throw new Error('financial authority required');
  return true;
}

export function calculateInvoice(lines, taxRate = 0) {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error('invoice lines required');
  const subtotal = lines.reduce((total, line) => total + validateMoney(line.quantity, 'quantity') * validateMoney(line.unit_price, 'unit_price'), 0);
  const tax = subtotal * validateMoney(taxRate, 'tax_rate');
  return { subtotal: Math.round(subtotal * 100) / 100, tax: Math.round(tax * 100) / 100, total: Math.round((subtotal + tax) * 100) / 100 };
}
