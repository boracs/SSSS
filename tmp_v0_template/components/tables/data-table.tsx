"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge, getStatusVariant, getStatusLabel } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import type { TableFilter } from "@/types";

// ============================================
// TYPES
// ============================================
export interface Column<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  // For status columns
  isStatus?: boolean;
  // For secondary/discrete data
  isSecondary?: boolean;
  // For primary/highlighted data
  isPrimary?: boolean;
}

export interface RowAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  variant?: "default" | "destructive";
  condition?: (row: T) => boolean;
}

interface DataTableProps<T extends { id: string | number }> {
  data: T[];
  columns: Column<T>[];
  filters?: TableFilter[];
  actions?: RowAction<T>[];
  primaryAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: (row: T) => void;
  };
  selectable?: boolean;
  onSelectionChange?: (selectedIds: (string | number)[]) => void;
  loading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  className?: string;
}

// ============================================
// SUBCOMPONENTS
// ============================================

// Sort Icon
function SortIcon({ direction }: { direction: "asc" | "desc" | null }) {
  if (!direction) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />;
  if (direction === "asc") return <ChevronUp className="h-3.5 w-3.5" />;
  return <ChevronDown className="h-3.5 w-3.5" />;
}

// Table Actions Dropdown
function ActionsDropdown<T extends { id: string | number }>({
  row,
  actions,
}: {
  row: T;
  actions: RowAction<T>[];
}) {
  const visibleActions = actions.filter(
    (action) => !action.condition || action.condition(row)
  );

  if (visibleActions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Acciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {visibleActions.map((action, index) => (
          <DropdownMenuItem
            key={action.label}
            onClick={() => action.onClick(row)}
            className={cn(
              action.variant === "destructive" &&
                "text-destructive focus:text-destructive"
            )}
          >
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Filter Bar
function FilterBar({
  filters,
  filterValues,
  onFilterChange,
  searchValue,
  onSearchChange,
}: {
  filters: TableFilter[];
  filterValues: Record<string, string>;
  onFilterChange: (field: string, value: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 bg-secondary/30 p-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-background"
        />
      </div>

      {/* Filters */}
      {filters.map((filter) => (
        <div key={filter.field} className="min-w-[150px]">
          <Select
            value={filterValues[filter.field] || "all"}
            onValueChange={(value) => onFilterChange(filter.field, value)}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {filter.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}

      {/* Filter Badge Count */}
      {Object.values(filterValues).some((v) => v && v !== "all") && (
        <Badge variant="secondary" className="gap-1">
          <Filter className="h-3 w-3" />
          {Object.values(filterValues).filter((v) => v && v !== "all").length}{" "}
          filtros
        </Badge>
      )}
    </div>
  );
}

// Pagination
function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
      <p className="text-sm text-muted-foreground">
        Mostrando <span className="font-medium">{startItem}</span> a{" "}
        <span className="font-medium">{endItem}</span> de{" "}
        <span className="font-medium">{totalItems}</span> resultados
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Anterior</span>
        </Button>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "ghost"}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className="h-8 w-8 p-0"
              >
                {pageNum}
              </Button>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Siguiente</span>
        </Button>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  filters = [],
  actions = [],
  primaryAction,
  selectable = false,
  onSelectionChange,
  loading = false,
  emptyMessage = "No hay datos disponibles",
  pageSize = 10,
  className,
}: DataTableProps<T>) {
  // State
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    new Set()
  );
  const [currentPage, setCurrentPage] = useState(1);

  // Filter handler
  const handleFilterChange = (field: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  // Sort handler
  const handleSort = (columnId: string) => {
    setSortConfig((prev) => {
      if (prev?.key === columnId) {
        if (prev.direction === "asc") return { key: columnId, direction: "desc" };
        return null;
      }
      return { key: columnId, direction: "asc" };
    });
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedData.map((row) => row.id));
      setSelectedIds(allIds);
      onSelectionChange?.(Array.from(allIds));
    } else {
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (id: string | number, checked: boolean) => {
    const newSelection = new Set(selectedIds);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedIds(newSelection);
    onSelectionChange?.(Array.from(newSelection));
  };

  // Get cell value
  const getCellValue = (row: T, column: Column<T>): React.ReactNode => {
    if (typeof column.accessor === "function") {
      return column.accessor(row);
    }
    const value = row[column.accessor];
    
    // Handle status columns
    if (column.isStatus && typeof value === "string") {
      return (
        <StatusBadge variant={getStatusVariant(value)} showDot pulse={value === "pending"}>
          {getStatusLabel(value)}
        </StatusBadge>
      );
    }
    
    return value as React.ReactNode;
  };

  // Processed data with filtering and sorting
  const processedData = useMemo(() => {
    let result = [...data];

    // Search filter
    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const value = typeof col.accessor === "function" 
            ? null 
            : row[col.accessor];
          return value?.toString().toLowerCase().includes(searchLower);
        })
      );
    }

    // Column filters
    Object.entries(filterValues).forEach(([field, value]) => {
      if (value && value !== "all") {
        result = result.filter((row) => {
          const rowValue = (row as Record<string, unknown>)[field];
          return rowValue?.toString() === value;
        });
      }
    });

    // Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortConfig.key];
        const bVal = (b as Record<string, unknown>)[sortConfig.key];
        
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        const comparison = aVal < bVal ? -1 : 1;
        return sortConfig.direction === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchValue, filterValues, sortConfig, columns]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize);
  const paginatedData = processedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const allSelected =
    paginatedData.length > 0 &&
    paginatedData.every((row) => selectedIds.has(row.id));
  const someSelected =
    paginatedData.some((row) => selectedIds.has(row.id)) && !allSelected;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/50 bg-card",
        className
      )}
    >
      {/* Filters */}
      {(filters.length > 0 || true) && (
        <div className="border-b border-border/50 p-4">
          <FilterBar
            filters={filters}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
            searchValue={searchValue}
            onSearchChange={(v) => {
              setSearchValue(v);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {/* Selection Checkbox */}
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Seleccionar todos"
                  />
                </TableHead>
              )}

              {/* Column Headers */}
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    "whitespace-nowrap",
                    column.sortable && "cursor-pointer select-none",
                    column.headerClassName
                  )}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{column.header}</span>
                    {column.sortable && (
                      <SortIcon
                        direction={
                          sortConfig?.key === column.id
                            ? sortConfig.direction
                            : null
                        }
                      />
                    )}
                  </div>
                </TableHead>
              ))}

              {/* Actions Column */}
              {(actions.length > 0 || primaryAction) && (
                <TableHead className="w-24 text-right">Acciones</TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            <AnimatePresence mode="wait">
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      columns.length + (selectable ? 1 : 0) + (actions.length > 0 || primaryAction ? 1 : 0)
                    }
                    className="h-32"
                  >
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Cargando datos...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      columns.length + (selectable ? 1 : 0) + (actions.length > 0 || primaryAction ? 1 : 0)
                    }
                    className="h-32 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, index) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={cn(
                      "border-b border-border/50 transition-colors hover:bg-secondary/30",
                      selectedIds.has(row.id) && "bg-accent/5"
                    )}
                  >
                    {/* Selection Checkbox */}
                    {selectable && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={(checked) =>
                            handleSelectRow(row.id, checked as boolean)
                          }
                          aria-label={`Seleccionar fila ${row.id}`}
                        />
                      </TableCell>
                    )}

                    {/* Data Cells */}
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        className={cn(
                          column.isSecondary && "text-muted-foreground text-sm",
                          column.isPrimary && "font-medium",
                          column.className
                        )}
                      >
                        {getCellValue(row, column)}
                      </TableCell>
                    ))}

                    {/* Actions */}
                    {(actions.length > 0 || primaryAction) && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {primaryAction && (
                            <Button
                              size="sm"
                              onClick={() => primaryAction.onClick(row)}
                              className="h-8"
                            >
                              {primaryAction.icon}
                              <span className="ml-1">{primaryAction.label}</span>
                            </Button>
                          )}
                          {actions.length > 0 && (
                            <ActionsDropdown row={row} actions={actions} />
                          )}
                        </div>
                      </TableCell>
                    )}
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {processedData.length > pageSize && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={processedData.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
