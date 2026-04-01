// Layout Components
export { Header, defaultNavigation } from "./layout/header";
export { Footer } from "./layout/footer";
export { TopBanner } from "./layout/top-banner";

// Section Components
export { HeroSection } from "./sections/hero-section";
export { CategoryCards, defaultCategories } from "./sections/category-cards";
export { FeaturesSection } from "./sections/features-section";
export { TestimonialsSection } from "./sections/testimonials-section";
export { ProductCarousel, defaultProducts } from "./sections/product-carousel";

// Form Components
export { FormInput } from "./forms/form-input";
export { FormSelect } from "./forms/form-select";
export { SubmitButton } from "./forms/submit-button";

// Table Components
export { DataTable, type Column, type RowAction } from "./tables/data-table";

// Modal Components
export {
  ConfirmationModal,
  PaymentConfirmationModal,
  LockerAssignmentModal,
  DeleteConfirmationModal,
} from "./modals/confirmation-modal";

// Dashboard Components
export { KPICard, KPIGrid, defaultKPIs } from "./dashboard/kpi-card";

// UI Extensions
export {
  StatusBadge,
  getStatusVariant,
  getStatusLabel,
} from "./ui/status-badge";
