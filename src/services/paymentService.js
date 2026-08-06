import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION = 'payments';
const paymentsRef = collection(db, COLLECTION);

// إضافة دفعة
export async function addPayment(paymentData) {
  return addDoc(paymentsRef, {
    ...paymentData,
    createdAt: serverTimestamp(),
  });
}

// حذف دفعة
export async function deletePayment(id) {
  return deleteDoc(doc(db, COLLECTION, id));
}

// جلب دفعات سيارة معينة
export function subscribeToCarPayments(carId, callback) {
  const q = query(
    paymentsRef,
    where('carId', '==', carId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const payments = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    callback(payments);
  });
}

// حساب إجمالي الدفعات حسب النوع
export function calcTotalPayments(payments, type) {
  return payments
    .filter((p) => p.type === type)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}
