import React, { useState, useEffect } from "react";
import CustomTextInput from "../../../custom/inputs/customTextInput";
import CustomButton from "../../../custom/buttons/customButton";
import { apiRequest } from "../../../libs/apiConfig";
import { toast } from "sonner";
import CustomDateInput from "../../../custom/inputs/customDateSelector";
import useExhibitionExpense from "../../../hooks/exhibitions/useExhibitionExpense";
import { ExhibitionEndpoints } from "../../../endpoints/exhibitions/exhibitionEndpoints";
import CustomDropdown from "../../../custom/inputs/customDropdown";
import useExhibition from "../../../hooks/exhibitions/useExhibition";
import { formatDate } from "../../../libs/dateFormatter";

// Match your backend enum for ExpenseCategory
export enum ExpenseCategory {
  RENT = "RENT",
  UTILITIES = "UTILITIES",
  SALARIES = "SALARIES",
  SUPPLIES = "SUPPLIES",
  MAINTENANCE = "MAINTENANCE",
  TRANSPORT = "TRANSPORT",
  INSURANCE = "INSURANCE",
  MARKETING = "MARKETING",
  TRAINING = "TRAINING",
  TAXES = "TAXES",
  MEDICAL_SUPPLIES = "MEDICAL_SUPPLIES",
  OFFICE_SUPPLIES = "OFFICE_SUPPLIES",
  EQUIPMENT_PURCHASE = "EQUIPMENT_PURCHASE",
  EQUIPMENT_REPAIR = "EQUIPMENT_REPAIR",
  CLEANING = "CLEANING",
  SECURITY = "SECURITY",
  INTERNET = "INTERNET",
  WATER = "WATER",
  ELECTRICITY = "ELECTRICITY",
  COMMUNICATION = "COMMUNICATION",
  SOFTWARE_SUBSCRIPTIONS = "SOFTWARE_SUBSCRIPTIONS",
  MISCELLANEOUS = "MISCELLANEOUS",
}


interface IExhibitionExpense {
  id?: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  dateIncurred: string;
  description?: string;
  exhibitionId: string; // Add exhibitionId to the interface
}

interface AddOrModifyExhibitionExpenseProps {
  visible: boolean;
  expense: IExhibitionExpense | null;
  onCancel: () => void;
}

const AddOrModifyExhibitionExpense: React.FC<
  AddOrModifyExhibitionExpenseProps
> = ({ visible, expense, onCancel }) => {
  const { refresh } = useExhibitionExpense();
  const { data: exhibitions, loading: exhibitionsLoading } = useExhibition(); // Get exhibitions

  const [formData, setFormData] = useState<IExhibitionExpense>({
    title: "",
    category: ExpenseCategory.MISCELLANEOUS,
    amount: 0,
    dateIncurred: "",
    description: "",
    exhibitionId: "", // Add exhibitionId to initial state
  });

  // Category options for dropdown
  const categoryOptions = Object.values(ExpenseCategory).map((category) => ({
    value: category,
    label: category.charAt(0) + category.slice(1).toLowerCase().replace(/_/g, ' '),
  }));

  // Exhibition options for dropdown
  const exhibitionOptions = exhibitions.map((exhibition) => ({
    value: exhibition.id,
    label: `${exhibition.name} ${formatDate(exhibition.startDate)} - ${formatDate(exhibition.endDate)}` || `Exhibition ${exhibition.id}`, // Use title or fallback
  }));

  useEffect(() => {
    if (expense) {
      setFormData({
        title: expense.title || "",
        category: expense.category || ExpenseCategory.MISCELLANEOUS,
        amount: expense.amount || 0,
        dateIncurred: expense.dateIncurred
          ? expense.dateIncurred.split("T")[0]
          : "",
        description: expense.description || "",
        exhibitionId: expense.exhibitionId || "", // Set exhibitionId from expense
      });
    } else {
      setFormData({
        title: "",
        category: ExpenseCategory.MISCELLANEOUS,
        amount: 0,
        dateIncurred: "",
        description: "",
        exhibitionId: "", // Reset exhibitionId for new expense
      });
    }
  }, [expense]);

  // Handle category change from dropdown
  const handleCategoryChange = (selectedValues: string[]) => {
    const selectedCategory = selectedValues[0] as ExpenseCategory || ExpenseCategory.MISCELLANEOUS;
    setFormData((prev) => ({ ...prev, category: selectedCategory }));
  };

  // Handle exhibition change from dropdown
  const handleExhibitionChange = (selectedValues: string[]) => {
    const selectedExhibitionId = selectedValues[0] || "";
    setFormData((prev) => ({ ...prev, exhibitionId: selectedExhibitionId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { title, category, amount, dateIncurred, exhibitionId } = formData;

    if (!title || !category || !amount || !dateIncurred || !exhibitionId) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const endpoint = expense
        ? ExhibitionEndpoints.EXHIBITION_EXPENSES.modify(expense.id!)
        : ExhibitionEndpoints.EXHIBITION_EXPENSES.create;
      const method = expense ? "PUT" : "POST";

      // Prepare payload according to CreateExhibitionExpenseDto
      const payload = {
        title: formData.title,
        category: formData.category,
        amount: formData.amount,
        dateIncurred: formData.dateIncurred,
        description: formData.description,
        exhibitionId: formData.exhibitionId,
      };

      await apiRequest(endpoint, method, "", payload);

      refresh();
      onCancel();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Something went wrong");
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          {expense ? "Edit Exhibition Expense" : "Add New Exhibition Expense"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Exhibition Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exhibition *
            </label>
            {exhibitionsLoading ? (
              <div className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-500">
                Loading exhibitions...
              </div>
            ) : (
              <CustomDropdown
                options={exhibitionOptions}
                value={formData.exhibitionId ? [formData.exhibitionId] : []}
                onChange={handleExhibitionChange}
                placeholder="Select Exhibition"
                singleSelect={true}
                disabled={exhibitions.length === 0}
              />
            )}
            {exhibitions.length === 0 && !exhibitionsLoading && (
              <p className="text-sm text-red-500 mt-1">
                No exhibitions available. Please create an exhibition first.
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expense Title *
            </label>
            <CustomTextInput
              type="text"
              value={formData.title}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, title: val }))
              }
              placeholder="Enter expense title"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <CustomDropdown
              options={categoryOptions}
              value={[formData.category]}
              onChange={handleCategoryChange}
              placeholder="Select Expense Category"
              singleSelect={true}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (UGX) *
            </label>
            <CustomTextInput
              type="number"
              value={formData.amount.toString()}
              onChange={(val) =>
                setFormData((prev) => ({
                  ...prev,
                  amount: parseFloat(val) || 0,
                }))
              }
              placeholder="Enter amount spent"
            />
          </div>

          {/* Date */}
          <CustomDateInput
            label="Date Incurred"
            value={formData.dateIncurred}
            onChange={(val) =>
              setFormData((prev) => ({ ...prev, dateIncurred: val }))
            }
            isRequired
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description / Remarks
            </label>
            <textarea
              value={formData.description || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Enter additional notes (optional)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <CustomButton type="negative" fn={onCancel} />
            <CustomButton
              autoCloseModal={onCancel}
              label={expense ? "Update Expense" : "Create Expense"}
              fn={handleSubmit}
              disabled={!formData.exhibitionId && exhibitions.length > 0} // Disable if no exhibition selected but exhibitions exist
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOrModifyExhibitionExpense;