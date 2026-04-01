// Form state types for Inertia.js useForm integration
export interface FormState {
  processing: boolean;
  errors: Record<string, string>;
  recentlySuccessful?: boolean;
}

// Navigation types
export interface NavItem {
  label: string;
  href: string;
  badge?: string | number;
  children?: NavItem[];
  icon?: string;
}

export interface UserRole {
  id: string;
  name: 'admin' | 'instructor' | 'client' | 'guest';
  permissions: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  notifications?: Notification[];
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// Product types
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  image: string;
  category: ProductCategory;
  stock: number;
  featured: boolean;
  tags?: string[];
}

export type ProductCategory = 
  | 'tablas' 
  | 'neoprenos' 
  | 'accesorios' 
  | 'surfskate';

// Service/Class types
export interface SurfClass {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  price: number;
  maxParticipants: number;
  currentParticipants: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  instructor: Instructor;
  date: string;
  time: string;
  location: string;
  status: 'available' | 'full' | 'cancelled' | 'completed';
}

export interface Instructor {
  id: string;
  name: string;
  avatar?: string;
  certifications: string[];
  specialties: string[];
  rating: number;
  totalClasses: number;
}

// Booking types
export interface Booking {
  id: string;
  type: 'class' | 'rental' | 'locker';
  status: BookingStatus;
  user: User;
  date: string;
  time: string;
  totalPrice: number;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled';

export type PaymentStatus = 
  | 'pending' 
  | 'paid' 
  | 'refunded' 
  | 'failed';

// Locker types
export interface Locker {
  id: string;
  number: string;
  size: 'small' | 'medium' | 'large';
  status: 'available' | 'occupied' | 'maintenance';
  currentBooking?: LockerBooking;
  pricePerHour: number;
  pricePerDay: number;
}

export interface LockerBooking {
  id: string;
  locker: Locker;
  user: User;
  startTime: string;
  endTime: string;
  code: string;
  status: BookingStatus;
}

// Testimonial types
export interface Testimonial {
  id: string;
  author: string;
  role?: string;
  content: string;
  rating: number;
  avatar?: string;
  date: string;
}

// Category Card types
export interface CategoryCard {
  id: string;
  title: string;
  slug: string;
  image: string;
  description?: string;
  href: string;
}

// Feature types
export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
}

// Trust Badge types
export interface TrustBadge {
  id: string;
  icon: string;
  title: string;
  description: string;
}

// Table filter types
export interface TableFilter {
  field: string;
  label: string;
  type: 'select' | 'search' | 'date' | 'dateRange';
  options?: { value: string; label: string }[];
}

// KPI types
export interface KPIData {
  label: string;
  value: number | string;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: string;
}
