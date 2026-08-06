import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION = 'containers';
const containersRef = collection(db, COLLECTION);

// إضافة حاوية
export async function addContainer(data) {
  return addDoc(containersRef, {
    ...data,
    sharedCosts: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// تحديث حاوية
export async function updateContainer(id, data) {
  return updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// حذف حاوية
export async function deleteContainer(id) {
  return deleteDoc(doc(db, COLLECTION, id));
}

// الاستماع للتحديثات الحية
export function subscribeToContainers(callback) {
  const q = query(containersRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const containers = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    callback(containers);
  });
}

// إضافة تكلفة مشتركة لحاوية
export async function addSharedCost(containerId, cost) {
  const containerDoc = doc(db, COLLECTION, containerId);
  const snap = await getDocs(query(containersRef));
  const container = snap.docs.find((d) => d.id === containerId);
  if (!container) throw new Error('Container not found');

  const existing = container.data().sharedCosts || [];
  return updateDoc(containerDoc, {
    sharedCosts: [...existing, { ...cost, id: Date.now().toString() }],
    updatedAt: serverTimestamp(),
  });
}

// حساب تكلفة الحاوية المشتركة لكل سيارة
export function calcSharedCostPerCar(sharedCosts, carCount) {
  if (!carCount || carCount === 0) return 0;
  const totalShared = (sharedCosts || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  return totalShared / carCount;
}
