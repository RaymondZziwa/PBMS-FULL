import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import CustomButton from '../../custom/buttons/customButton';
import CustomDropdown from '../../custom/inputs/customDropdown';
import CustomTextInput from '../../custom/inputs/customTextInput';
import useEmployees from '../../hooks/humanResource/useEmployees';
import useBranches from '../../hooks/settings/useBranches';
import { apiRequest } from '../../libs/apiConfig';
import { ExpenseCategory } from '../exhibition/exhibitionExpenses/AddorModify';
import type { IBranchExpense } from '../../redux/types/expenses';
import { BranchExpenseEndpoints } from '../../endpoints/expense/expenseEndpoints';
import type { RootState } from '../../redux/store';
import useBranchExpense from '../../hooks/expenses/useBranchExpense';
import CustomDateInput from '../../custom/inputs/customDateSelector';

interface AddOrModifyBranchExpenseProps {
  visible: boolean;
  expense: IBranchExpense | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const AddOrModifyBranchExpense: React.FC<AddOrModifyBranchExpenseProps> = ({
  visible,
  expense,
  onCancel,
  onSuccess,
}) => {
  const branch = useSelector((state: RootState) => state.userAuth.data.branch);
  const user = useSelector((state: RootState) => state.userAuth.data);
  const { refresh } = useBranchExpense(branch.id);
  const { data: employees } = useEmployees();

  const [formData, setFormData] = useState({
    branchId: branch?.id || '',
    category: '' as ExpenseCategory | '',
    title: '',
    description: '',
    amount: '',
    dateIncurred: '',
    recordedBy: user?.id || '',
  });

  // Populate form when editing
  useEffect(() => {
    if (expense) {
      setFormData({
        branchId: expense.branchId || '',
        category: expense.category || '',
        title: expense.title || '',
        description: expense.description || '',
        amount: expense.amount?.toString() || '',
        dateIncurred: expense.dateIncurred
          ? new Date(expense.dateIncurred).toISOString().split('T')[0]
          : '',
        recordedBy: expense.recordedBy || '',
      });
    } else {
      setFormData({
        branchId: branch?.id || '',
        category: '',
        title: '',
        description: '',
        amount: '',
        dateIncurred: '',
        recordedBy: user?.id || '',
      });
    }
  }, [expense, branch, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const { branchId, category, title, amount, dateIncurred, recordedBy } = formData;
    if (!branchId || !category || !title || !amount || !dateIncurred || !recordedBy) {
      console.log(user)
      console.log(formData)
      toast.error('Please fill in all required fields');
      return;
    }

    const payload = {
      branchId,
      category,
      title,
      description: formData.description,
      amount: parseFloat(amount),
      dateIncurred: new Date(dateIncurred).toISOString(),
      recordedBy: user?.id || '',
    };

    try {
      const endpoint = expense
        ? BranchExpenseEndpoints.modifyExpense(expense.id)
        : BranchExpenseEndpoints.createExpense;
      const method = expense ? 'PUT' : 'POST';
      await apiRequest(endpoint, method, '', payload);
      
      refresh();
      toast.success(expense ? 'Expense updated successfully' : 'Expense created successfully');
      onSuccess();
      onCancel();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save expense');
    }
  };

  if (!visible) return null;

  // Expense category options (from enum) - FIXED: Use the actual enum values
  const categoryOptions = Object.values(ExpenseCategory).map((val) => ({
    label: val,
    value: val,
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          {expense ? 'Edit Expense' : 'Add New Expense'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category - FIXED: Added singleSelect and corrected onChange */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <CustomDropdown
              options={categoryOptions}
              value={formData.category ? [formData.category] : []}
              onChange={(values: string[]) =>
                setFormData((prev) => ({
                  ...prev,
                  category: values[0] as ExpenseCategory || '',
                }))
              }
              placeholder="Select expense category"
              singleSelect={true} // ADD THIS - crucial for single selection
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <CustomTextInput
              type="text"
              value={formData.title}
              onChange={(val) => setFormData((p) => ({ ...p, title: val }))}
              placeholder="Enter expense title"

            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <CustomTextInput
              type="text"
              value={formData.description}
              onChange={(val) => setFormData((p) => ({ ...p, description: val }))}
              placeholder="Enter description (optional)"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (UGX) *
            </label>
            <CustomTextInput
              type="number"
              value={formData.amount}
              onChange={(val) => setFormData((p) => ({ ...p, amount: val }))}
              placeholder="Enter amount"

            />
          </div>

          {/* Date Incurred */}
          <div>
  <CustomDateInput
    label="Date Incurred"
    value={formData.dateIncurred}
    onChange={(val) => setFormData((p) => ({ ...p, dateIncurred: val }))}
    isRequired={true}
  />
</div>

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <CustomButton type="negative" fn={onCancel} label="Cancel" />
            <CustomButton
              type="positive"
              label={expense ? 'Update Expense' : 'Create Expense'}
              fn={handleSubmit}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOrModifyBranchExpense;