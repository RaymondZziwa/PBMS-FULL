import React, { useState, useRef, useEffect } from "react";
import { FaCalendarAlt, FaChevronLeft, FaChevronRight } from "react-icons/fa";

interface CustomDateInputProps {
  label: string;
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  disabled?: boolean;
  min?: string;
  max?: string;
  error?: string;
  helperText?: string;
  isRequired?: boolean;
}

const CustomDateInput: React.FC<CustomDateInputProps> = ({
  label,
  value = "",
  onChange,
  disabled = false,
  min,
  max,
  error = "",
  helperText = "",
  isRequired
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value) : null
  );
  const [viewDate, setViewDate] = useState<Date>(
    value ? new Date(value) : new Date()
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Update internal state when value prop changes
  useEffect(() => {
    if (value) {
      setSelectedDate(new Date(value));
      setViewDate(new Date(value));
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  // FIXED: Proper date handling without timezone issues
  const handleDateSelect = (date: Date) => {
    // Create a date string in YYYY-MM-DD format without timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    setSelectedDate(date);
    onChange(dateString);
    setIsOpen(false);
  };

  const navigateMonth = (direction: number) => {
    setViewDate(
      new Date(viewDate.getFullYear(), viewDate.getMonth() + direction, 1)
    );
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // FIXED: Date comparison functions that handle timezone issues
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const generateCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    // Days in the month
    const daysInMonth = lastDay.getDate();
    // Day of the week for the first day
    const firstDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-9 w-9"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isSelected = selectedDate && isSameDay(date, selectedDate);
      const isToday = isSameDay(date, new Date());

      // Check if date is within min/max constraints
      let isDisabled = false;
      if (min) {
        const minDate = new Date(min);
        // Compare dates without time
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);
        const compareMinDate = new Date(minDate);
        compareMinDate.setHours(0, 0, 0, 0);
        isDisabled = compareDate < compareMinDate;
      }
      if (max && !isDisabled) {
        const maxDate = new Date(max);
        // Compare dates without time
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);
        const compareMaxDate = new Date(maxDate);
        compareMaxDate.setHours(0, 0, 0, 0);
        isDisabled = compareDate > compareMaxDate;
      }

      days.push(
        <button
          key={day}
          type="button"
          disabled={isDisabled}
          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors
            ${isSelected ? "bg-[#3d5aa0] text-white" : ""}
            ${isToday && !isSelected ? "border border-blue-500" : ""}
            ${
              !isSelected && !isDisabled
                ? "hover:bg-gray-100 text-gray-700"
                : ""
            }
            ${isDisabled ? "text-gray-300 cursor-not-allowed" : ""}
          `}
          onClick={() => !isDisabled && handleDateSelect(date)}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  // FIXED: Today button handler
  const handleTodayClick = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    setSelectedDate(today);
    onChange(dateString);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label} { isRequired && <span className="text-red-500">*</span>}
      </label>
      <div
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 transition-colors
          ${disabled ? "cursor-not-allowed bg-gray-100 text-gray-400" : "cursor-pointer bg-white text-gray-700"}
          ${error ? "border-red-500" : "border-gray-300 hover:border-gray-400"}
          ${isOpen ? "border-blue-500 ring-2 ring-blue-200" : ""}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={selectedDate ? "text-gray-900" : "text-gray-500"}>
          {selectedDate ? formatDate(selectedDate) : "Select a date"}
        </span>
        <FaCalendarAlt
          className={`h-5 w-5 ${disabled ? "text-gray-400" : "text-gray-500"}`}
        />
      </div>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
              onClick={() => navigateMonth(-1)}
              aria-label="Previous month"
            >
              <FaChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-medium text-gray-900">
              {viewDate.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </span>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
              onClick={() => navigateMonth(1)}
              aria-label="Next month"
            >
              <FaChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <div key={day} className="py-1 font-medium">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {generateCalendarDays()}
          </div>

          <div className="mt-4 flex justify-between border-t pt-3">
            <button
              type="button"
              className="rounded-md px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
              onClick={() => {
                setSelectedDate(null);
                onChange("");
                setIsOpen(false);
              }}
            >
              Clear
            </button>
            <button
              type="button"
              className="rounded-md bg-[#3d5aa0] px-3 py-1 text-sm text-white hover:bg-[#3d5aa0]"
              onClick={handleTodayClick}
            >
              Today
            </button>
          </div>
        </div>
      )}

      {(error || helperText) && (
        <div className={`mt-1 text-sm ${error ? "text-red-500" : "text-gray-500"}`}>
          {error || helperText}
        </div>
      )}
    </div>
  );
};

export default CustomDateInput;