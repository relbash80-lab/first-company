import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION = 'cars';
const carsRef = collection(db, COLLECTION);

// إضافة سيارة جديدة
export async function addCar(carData) {
  // تحقق من عدم تكرار VIN
  const q = query(carsRef, where('vin', '==', carData.vin));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    throw new Error('VIN_EXISTS');
  }

  return addDoc(carsRef, {
    ...carData,
    commission: 100, // ثابتة $100
    status: 'purchased',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// تحديث سيارة
export async function updateCar(id, carData) {
  const carRef = doc(db, COLLECTION, id);
  return updateDoc(carRef, {
    ...carData,
    updatedAt: serverTimestamp(),
  });
}

// حذف سيارة
export async function deleteCar(id) {
  return deleteDoc(doc(db, COLLECTION, id));
}

// جلب سيارة واحدة
export async function getCar(id) {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// الاستماع للتحديثات الحية
export function subscribeToCars(callback) {
  const q = query(carsRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const cars = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(cars);
  });
}

// حساب المجموع الجزئي للشراء
export function calcPurchaseSubTotal(car) {
  const price = Number(car.buyingPrice) || 0;
  const commission = 100;
  const fees = Number(car.otherFees) || 0;
  return price + commission + fees;
}

// حساب المجموع الجزئي للشحن
export function calcShippingSubTotal(car) {
  const inland = Number(car.inlandPrice) || 0;
  const ocean = Number(car.oceanPrice) || 0;
  return inland + ocean;
}

// حساب المتبقي (شراء)
export function calcPurchaseRemaining(car) {
  const subTotal = calcPurchaseSubTotal(car);
  const paid = Number(car.purchasePaid) || 0;
  return Math.max(0, subTotal - paid);
}

// حساب المتبقي (شحن)
export function calcShippingRemaining(car) {
  const subTotal = calcShippingSubTotal(car);
  const paid = Number(car.shippingPaid) || 0;
  return Math.max(0, subTotal - paid);
}
