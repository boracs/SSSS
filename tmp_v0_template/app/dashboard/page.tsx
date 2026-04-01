"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  User,
  CreditCard,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  Plus,
} from "lucide-react";
import { Header, defaultNavigation } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { KPIGrid, defaultKPIs } from "@/components/dashboard/kpi-card";
import { DataTable, type Column, type RowAction } from "@/components/tables/data-table";
import { FormInput } from "@/components/forms/form-input";
import { FormSelect } from "@/components/forms/form-select";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  PaymentConfirmationModal,
  DeleteConfirmationModal,
} from "@/components/modals/confirmation-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FormState, TableFilter, Booking } from "@/types";

// ============================================
// DEMO DATA
// ============================================
interface BookingRow {
  id: string;
  customerName: string;
  customerEmail: string;
  type: string;
  date: string;
  time: string;
  status: string;
  paymentStatus: string;
  amount: number;
}

const demoBookings: BookingRow[] = [
  {
    id: "RES-001",
    customerName: "María García López",
    customerEmail: "maria@email.com",
    type: "Clase de Surf",
    date: "2024-03-26",
    time: "10:00",
    status: "confirmed",
    paymentStatus: "paid",
    amount: 45.0,
  },
  {
    id: "RES-002",
    customerName: "Juan Pérez Martín",
    customerEmail: "juan@email.com",
    type: "Alquiler Tabla",
    date: "2024-03-26",
    time: "11:30",
    status: "pending",
    paymentStatus: "pending",
    amount: 25.0,
  },
  {
    id: "RES-003",
    customerName: "Ana Ruiz Fernández",
    customerEmail: "ana@email.com",
    type: "Clase Surfskate",
    date: "2024-03-26",
    time: "16:00",
    status: "confirmed",
    paymentStatus: "paid",
    amount: 35.0,
  },
  {
    id: "RES-004",
    customerName: "Carlos Sánchez Gil",
    customerEmail: "carlos@email.com",
    type: "Surf Trip",
    date: "2024-03-27",
    time: "09:00",
    status: "pending",
    paymentStatus: "pending",
    amount: 120.0,
  },
  {
    id: "RES-005",
    customerName: "Laura Moreno Díaz",
    customerEmail: "laura@email.com",
    type: "Clase de Surf",
    date: "2024-03-27",
    time: "10:00",
    status: "cancelled",
    paymentStatus: "refunded",
    amount: 45.0,
  },
  {
    id: "RES-006",
    customerName: "Pedro Jiménez Torres",
    customerEmail: "pedro@email.com",
    type: "Taquilla",
    date: "2024-03-26",
    time: "08:00",
    status: "in_progress",
    paymentStatus: "paid",
    amount: 8.0,
  },
];

// ============================================
// TABLE CONFIGURATION
// ============================================
const bookingColumns: Column<BookingRow>[] = [
  {
    id: "id",
    header: "Reserva",
    accessor: "id",
    isPrimary: true,
    sortable: true,
  },
  {
    id: "customerName",
    header: "Cliente",
    accessor: (row) => (
      <div>
        <p className="font-medium">{row.customerName}</p>
        <p className="text-xs text-muted-foreground">{row.customerEmail}</p>
      </div>
    ),
    sortable: true,
  },
  {
    id: "type",
    header: "Tipo",
    accessor: "type",
    sortable: true,
  },
  {
    id: "date",
    header: "Fecha",
    accessor: (row) => (
      <div className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{row.date}</span>
        <span className="text-muted-foreground">{row.time}</span>
      </div>
    ),
    sortable: true,
  },
  {
    id: "status",
    header: "Estado",
    accessor: "status",
    isStatus: true,
    sortable: true,
  },
  {
    id: "paymentStatus",
    header: "Pago",
    accessor: "paymentStatus",
    isStatus: true,
    sortable: true,
  },
  {
    id: "amount",
    header: "Importe",
    accessor: (row) => (
      <span className="font-semibold">
        {new Intl.NumberFormat("es-ES", {
          style: "currency",
          currency: "EUR",
        }).format(row.amount)}
      </span>
    ),
    sortable: true,
    className: "text-right",
    headerClassName: "text-right",
  },
];

const bookingFilters: TableFilter[] = [
  {
    field: "status",
    label: "Estado",
    type: "select",
    options: [
      { value: "pending", label: "Pendiente" },
      { value: "confirmed", label: "Confirmado" },
      { value: "in_progress", label: "En curso" },
      { value: "completed", label: "Completado" },
      { value: "cancelled", label: "Cancelado" },
    ],
  },
  {
    field: "type",
    label: "Tipo",
    type: "select",
    options: [
      { value: "Clase de Surf", label: "Clase de Surf" },
      { value: "Alquiler Tabla", label: "Alquiler Tabla" },
      { value: "Clase Surfskate", label: "Clase Surfskate" },
      { value: "Surf Trip", label: "Surf Trip" },
      { value: "Taquilla", label: "Taquilla" },
    ],
  },
];

// ============================================
// MAIN COMPONENT
// ============================================
export default function DashboardPage() {
  // Form state (Inertia.js useForm simulation)
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    type: "",
    date: "",
    time: "",
  });
  const [formState, setFormState] = useState<FormState>({
    processing: false,
    errors: {},
    recentlySuccessful: false,
  });

  // Modal states
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    booking: BookingRow | null;
  }>({ open: false, booking: null });
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    booking: BookingRow | null;
  }>({ open: false, booking: null });

  // Selected rows
  const [selectedBookings, setSelectedBookings] = useState<(string | number)[]>(
    []
  );

  // Table actions
  const bookingActions: RowAction<BookingRow>[] = [
    {
      label: "Ver detalles",
      icon: <Eye className="h-4 w-4" />,
      onClick: (row) => console.log("[v0] View:", row.id),
    },
    {
      label: "Confirmar pago",
      icon: <CreditCard className="h-4 w-4" />,
      onClick: (row) => setPaymentModal({ open: true, booking: row }),
      condition: (row) => row.paymentStatus === "pending",
    },
    {
      label: "Eliminar",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (row) => setDeleteModal({ open: true, booking: row }),
      variant: "destructive",
    },
  ];

  // Form handlers
  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (formState.errors[name]) {
      setFormState((prev) => ({
        ...prev,
        errors: { ...prev.errors, [name]: "" },
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Simple validation
    const errors: Record<string, string> = {};
    if (!formData.customerName) errors.customerName = "El nombre es requerido";
    if (!formData.customerEmail) errors.customerEmail = "El email es requerido";
    if (!formData.type) errors.type = "Selecciona un tipo";

    if (Object.keys(errors).length > 0) {
      setFormState({ processing: false, errors, recentlySuccessful: false });
      return;
    }

    // Simulate API call
    setFormState({ processing: true, errors: {}, recentlySuccessful: false });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setFormState({ processing: false, errors: {}, recentlySuccessful: true });

    // Reset success state after 3 seconds
    setTimeout(() => {
      setFormState((prev) => ({ ...prev, recentlySuccessful: false }));
    }, 3000);

    console.log("[v0] Form submitted:", formData);
  };

  // Modal handlers
  const handleConfirmPayment = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("[v0] Payment confirmed for:", paymentModal.booking?.id);
    setPaymentModal({ open: false, booking: null });
  };

  const handleDeleteBooking = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("[v0] Deleted booking:", deleteModal.booking?.id);
    setDeleteModal({ open: false, booking: null });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <Header
        navigation={defaultNavigation}
        user={{
          id: "1",
          name: "Admin Demo",
          email: "admin@s4surf.com",
          role: { id: "1", name: "admin", permissions: [] },
        }}
        notifications={[
          {
            id: "1",
            type: "info",
            title: "Nueva reserva",
            message: "María García ha reservado una clase de surf",
            read: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: "2",
            type: "warning",
            title: "Pago pendiente",
            message: "Juan Pérez tiene un pago pendiente",
            read: false,
            createdAt: new Date().toISOString(),
          },
        ]}
        cartItemsCount={3}
        onLogout={() => console.log("[v0] Logout")}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-foreground">
              Panel de Administración
            </h1>
            <p className="mt-1 text-muted-foreground">
              Gestiona reservas, clases y operaciones diarias
            </p>
          </motion.div>

          {/* KPIs */}
          <section className="mb-8">
            <KPIGrid kpis={defaultKPIs} />
          </section>

          {/* Tabs */}
          <Tabs defaultValue="reservas" className="space-y-6">
            <TabsList>
              <TabsTrigger value="reservas" className="gap-2">
                <Calendar className="h-4 w-4" />
                Reservas
              </TabsTrigger>
              <TabsTrigger value="nueva" className="gap-2">
                <Plus className="h-4 w-4" />
                Nueva Reserva
              </TabsTrigger>
            </TabsList>

            {/* Reservations Table */}
            <TabsContent value="reservas">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <DataTable
                  data={demoBookings}
                  columns={bookingColumns}
                  filters={bookingFilters}
                  actions={bookingActions}
                  primaryAction={{
                    label: "Aprobar",
                    icon: <CheckCircle className="h-3.5 w-3.5" />,
                    onClick: (row) =>
                      console.log("[v0] Approve booking:", row.id),
                  }}
                  selectable
                  onSelectionChange={setSelectedBookings}
                  pageSize={5}
                />
              </motion.div>
            </TabsContent>

            {/* New Booking Form */}
            <TabsContent value="nueva">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-accent" />
                      Crear Nueva Reserva
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid gap-6 sm:grid-cols-2">
                        {/* Customer Name */}
                        <FormInput
                          label="Nombre del Cliente"
                          name="customerName"
                          placeholder="Ej: María García"
                          value={formData.customerName}
                          onChange={(e) =>
                            handleInputChange("customerName", e.target.value)
                          }
                          error={formState.errors.customerName}
                          success={formState.recentlySuccessful}
                          processing={formState.processing}
                          required
                          leftIcon={<User className="h-4 w-4" />}
                        />

                        {/* Customer Email */}
                        <FormInput
                          label="Email"
                          name="customerEmail"
                          type="email"
                          placeholder="cliente@email.com"
                          value={formData.customerEmail}
                          onChange={(e) =>
                            handleInputChange("customerEmail", e.target.value)
                          }
                          error={formState.errors.customerEmail}
                          success={formState.recentlySuccessful}
                          processing={formState.processing}
                          required
                        />

                        {/* Booking Type */}
                        <FormSelect
                          label="Tipo de Reserva"
                          name="type"
                          placeholder="Seleccionar tipo..."
                          value={formData.type}
                          onChange={(value) => handleInputChange("type", value)}
                          options={[
                            { value: "surf-class", label: "Clase de Surf" },
                            { value: "board-rental", label: "Alquiler Tabla" },
                            { value: "surfskate", label: "Clase Surfskate" },
                            { value: "surf-trip", label: "Surf Trip" },
                            { value: "locker", label: "Taquilla" },
                          ]}
                          error={formState.errors.type}
                          success={formState.recentlySuccessful}
                          processing={formState.processing}
                          required
                        />

                        {/* Date */}
                        <FormInput
                          label="Fecha"
                          name="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) =>
                            handleInputChange("date", e.target.value)
                          }
                          error={formState.errors.date}
                          success={formState.recentlySuccessful}
                          processing={formState.processing}
                          leftIcon={<Calendar className="h-4 w-4" />}
                        />

                        {/* Time */}
                        <FormInput
                          label="Hora"
                          name="time"
                          type="time"
                          value={formData.time}
                          onChange={(e) =>
                            handleInputChange("time", e.target.value)
                          }
                          error={formState.errors.time}
                          success={formState.recentlySuccessful}
                          processing={formState.processing}
                          leftIcon={<Clock className="h-4 w-4" />}
                        />
                      </div>

                      {/* Submit Button */}
                      <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline">
                          Cancelar
                        </Button>
                        <SubmitButton
                          processing={formState.processing}
                          recentlySuccessful={formState.recentlySuccessful}
                          loadingText="Creando reserva..."
                          successText="¡Reserva creada!"
                          icon={<Plus className="h-4 w-4" />}
                        >
                          Crear Reserva
                        </SubmitButton>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Modals */}
      {paymentModal.booking && (
        <PaymentConfirmationModal
          open={paymentModal.open}
          onOpenChange={(open) =>
            setPaymentModal((prev) => ({ ...prev, open }))
          }
          bookingId={paymentModal.booking.id}
          amount={paymentModal.booking.amount}
          customerName={paymentModal.booking.customerName}
          onConfirm={handleConfirmPayment}
        />
      )}

      {deleteModal.booking && (
        <DeleteConfirmationModal
          open={deleteModal.open}
          onOpenChange={(open) => setDeleteModal((prev) => ({ ...prev, open }))}
          itemName={`Reserva ${deleteModal.booking.id}`}
          itemType="reserva"
          onConfirm={handleDeleteBooking}
        />
      )}
    </div>
  );
}
