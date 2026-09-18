/** Diet kitchen feature — API response types. */
export interface DietMeal {
  mealType?: string;
  date?: string;
  items?: string;
  deliveredBy?: string;
  patientFeedback?: string;
  quantityFeedback?: string;
  comments?: string;
  confirmedByNurse?: boolean;
}

export interface DietOrder {
  _id: string;
  patientName: string;
  patientId?: string;
  ward?: string;
  bedNumber?: string;
  dietType?: string;
  status?: string;
  createdAt?: string;
  doctorName?: string;
  referringDoctorId?: string;
  instructions?: string;
  allergies?: string;
  mealTimes?: string[];
  meals?: DietMeal[];
  reviewedByDietitian?: boolean;
  dietitianName?: string;
  reviewNotes?: string;
  reviewStatus?: string;
  kitchenNotified?: boolean;
  billingAdded?: boolean;
}

export interface DietStats {
  active: number;
  todayMeals: number;
  pendingReview: number;
  total: number;
}
