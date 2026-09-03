// Step 11.4 EMI generator foundation

export function generateEmiSchedule({ amount, tenure }) {
  const emi = amount / tenure;
  return Array.from({ length: tenure }, (_, i) => ({
    emi_no: i + 1,
    amount: emi,
    status: 'PENDING'
  }));
}
