/** Diet kitchen feature barrel. */
export type { DietOrder, DietMeal, DietStats } from './types';
export {
  getOrders,
  getStats,
  createOrder,
  deliverMeal,
  confirmMeal,
  reviewDiet,
  addFeedback,
  notifyKitchen,
  addToBilling,
} from './api';
export {
  useDietOrders,
  useDietStats,
  useCreateDietOrder,
  useDeliverMeal,
  useConfirmMeal,
  useReviewDiet,
  useAddDietFeedback,
  useNotifyKitchen,
  useAddDietToBilling,
} from './hooks';
