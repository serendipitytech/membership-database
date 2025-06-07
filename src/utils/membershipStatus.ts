import { format, isAfter, isBefore, startOfYear, endOfYear, parseISO } from 'date-fns';

interface Payment {
  date: string;
  amount: number;
}

export const calculateMembershipStatus = (payments: Payment[]): 'Active' | 'Inactive' | 'Pending' => {
  if (!payments || payments.length === 0) {
    return 'Pending';
  }

  const currentYear = new Date().getFullYear();
  const currentYearStart = startOfYear(new Date(currentYear, 0, 1));
  const currentYearEnd = endOfYear(new Date(currentYear, 0, 1));
  const gracePeriodStart = new Date(currentYear - 1, 9, 1); // Oct 1 of previous year
  const gracePeriodEnd = new Date(currentYear, 11, 31); // Dec 31 of current year

  let currentYearTotal = 0;

  payments.forEach(payment => {
    const paymentDate = parseISO(payment.date);
    
    // Check if payment is in grace period (Oct-Dec)
    if (isAfter(paymentDate, gracePeriodStart) && isBefore(paymentDate, gracePeriodEnd)) {
      // Payment counts for both current and next year
      currentYearTotal += payment.amount;
    } 
    // Check if payment is in current year (Jan-Sept)
    else if (isAfter(paymentDate, currentYearStart) && isBefore(paymentDate, currentYearEnd)) {
      currentYearTotal += payment.amount;
    }
  });

  if (currentYearTotal >= 25) {
    return 'Active';
  } else if (currentYearTotal > 0) {
    return 'Inactive';
  } else {
    return 'Pending';
  }
}; 