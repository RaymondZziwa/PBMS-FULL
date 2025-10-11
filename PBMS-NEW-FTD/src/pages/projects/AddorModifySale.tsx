import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import CustomButton from '../../custom/buttons/customButton';
import CustomNumberInput from '../../custom/inputs/customNumberInput';
import CustomDropdown from '../../custom/inputs/customDropdown';
import useProjects from '../../hooks/projects/useProjects';
import useClients from '../../hooks/sales/useClients';
import { apiRequest } from '../../libs/apiConfig';
import type { IProjectSale } from '../../redux/types/sales';
import { PROJECTENDPOINTS } from '../../endpoints/projects/projectEndpoints';
import useProjectSale from '../../hooks/projects/useProjectSale';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux/store';

interface AddOrModifyProjectSaleProps {
  visible: boolean;
  projectSale?: IProjectSale | null;
  onCancel: () => void;
}

const AddOrModifyProjectSale: React.FC<AddOrModifyProjectSaleProps> = ({
  visible,
  projectSale,
  onCancel,
}) => {
  const { data: projects } = useProjects();
  const { data: clients } = useClients();
  const { refresh } = useProjectSale();
  const user = useSelector((state: RootState) => state.userAuth.data.id)

  const [formData, setFormData] = useState({
    clientId: '',
    projectId: '',
    projectPrice: '', // Store original project price
    discount: '', // Discount amount
    saleTotal: '', // Calculated: projectPrice - discount
    downPayment: '0',
    numberOfInstallments: '',
    installmentAmount: '',
    cashierId: user,
  });

  const [loading, setLoading] = useState(false);

  // Prefill form when projectSale prop changes (edit mode)
  useEffect(() => {
    if (projectSale && visible) {
      // Calculate discount from project price and sale total
      const projectPrice = parseFloat(projectSale.project?.price || '0');
      const saleTotal = parseFloat(projectSale.saleTotal);
      const discount = projectPrice - saleTotal;
      
      setFormData({
        clientId: projectSale.clientId || '',
        projectId: projectSale.projectId || '',
        projectPrice: projectPrice.toString(),
        discount: Math.max(discount, 0).toString(),
        saleTotal: saleTotal.toString(),
        downPayment: projectSale.downPayment?.toString() || '0',
        numberOfInstallments: projectSale.numberOfInstallments?.toString() || '',
        installmentAmount: projectSale.installmentAmount?.toString() || '',
        cashierId: projectSale.cashierId || user,
      });
    } else if (!projectSale && visible) {
      // Reset form for create mode
      setFormData({
        clientId: '',
        projectId: '',
        projectPrice: '',
        discount: '0',
        saleTotal: '',
        downPayment: '0',
        numberOfInstallments: '',
        installmentAmount: '',
        cashierId: user,
      });
    }
  }, [projectSale, visible, user]);

  // Get selected project details
  const selectedProject = projects?.find(p => p.id === formData.projectId);

  // Auto-fill project price and calculate sale total when project is selected (only in create mode)
  useEffect(() => {
    if (selectedProject && !projectSale) {
      const projectPrice = parseFloat(selectedProject.price).toString();
      const discount = formData.discount || '0';
      const saleTotal = (parseFloat(projectPrice) - parseFloat(discount)).toString();
      
      setFormData(prev => ({
        ...prev,
        projectPrice,
        saleTotal: saleTotal
      }));
    }
  }, [selectedProject, projectSale]);

  // Recalculate sale total when discount changes (only in create mode)
  useEffect(() => {
    if (formData.projectPrice && formData.discount && !projectSale) {
      const saleTotal = (parseFloat(formData.projectPrice) - parseFloat(formData.discount)).toString();
      setFormData(prev => ({
        ...prev,
        saleTotal
      }));
    }
  }, [formData.discount, formData.projectPrice, projectSale]);

  // Calculate installment amount automatically
  const calculateInstallmentAmount = () => {
    const saleTotal = parseFloat(formData.saleTotal) || 0;
    const downPayment = parseFloat(formData.downPayment) || 0;
    const installments = parseInt(formData.numberOfInstallments) || 0;

    if (installments > 0) {
      // If full payment at once, installment amount equals sale total
      if (downPayment >= saleTotal) {
        setFormData(prev => ({
          ...prev,
          installmentAmount: saleTotal.toFixed(2)
        }));
      } else {
        // Regular installment calculation
        const installmentAmount = (saleTotal - downPayment) / installments;
        setFormData(prev => ({
          ...prev,
          installmentAmount: installmentAmount.toFixed(2)
        }));
      }
    }
  };

  // Auto-calculate when relevant fields change
  useEffect(() => {
    if (formData.saleTotal && formData.downPayment && formData.numberOfInstallments) {
      calculateInstallmentAmount();
    }
  }, [formData.saleTotal, formData.downPayment, formData.numberOfInstallments]);

  // Handle project selection (only in create mode)
  const handleProjectSelect = (projectId: string) => {
    if (!projectSale) {
      setFormData(prev => ({
        ...prev,
        projectId,
        // Reset discount when project changes
        discount: '0'
      }));
    }
  };

  // Handle discount change (different behavior for create vs edit)
  const handleDiscountChange = (value: string) => {
    if (projectSale) {
      // In edit mode, recalculate sale total based on original project price and new discount
      const projectPrice = parseFloat(formData.projectPrice);
      const discount = parseFloat(value) || 0;
      const saleTotal = Math.max(projectPrice - discount, 0);
      
      setFormData(prev => ({
        ...prev,
        discount: value,
        saleTotal: saleTotal.toString()
      }));
    } else {
      // In create mode, use the existing logic
      setFormData(prev => ({
        ...prev,
        discount: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate required fields
    if (!formData.clientId || !formData.projectId || !formData.saleTotal || 
        !formData.downPayment || !formData.numberOfInstallments || !formData.cashierId) {
      toast.error("Please fill in all required fields");
      setLoading(false);
      return;
    }

    // Validate numeric values
    const saleTotal = parseFloat(formData.saleTotal);
    const downPayment = parseFloat(formData.downPayment);
    const numberOfInstallments = parseInt(formData.numberOfInstallments);
    const installmentAmount = parseFloat(formData.installmentAmount) || 0;

    if (saleTotal <= 0 || downPayment < 0 || numberOfInstallments <= 0) {
      toast.error("Please enter valid numeric values");
      setLoading(false);
      return;
    }

    if (downPayment > saleTotal) {
      toast.error("Down payment cannot exceed sale total");
      setLoading(false);
      return;
    }

    // Special case: If paying in full at once, installment amount should be saleTotal
    let finalInstallmentAmount = installmentAmount;
    if (downPayment >= saleTotal) {
      finalInstallmentAmount = saleTotal;
    }

    // Validate installment calculation only if not paying in full
    if (downPayment < saleTotal) {
      const calculatedInstallmentTotal = numberOfInstallments * finalInstallmentAmount;
      const remainingAfterDownPayment = saleTotal - downPayment;

      if (Math.abs(calculatedInstallmentTotal - remainingAfterDownPayment) > 0.01) {
        toast.error("Installment calculation doesn't match. Please check the values.");
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        clientId: formData.clientId,
        projectId: formData.projectId,
        saleTotal: saleTotal,
        downPayment: downPayment,
        numberOfInstallments: numberOfInstallments,
        installmentAmount: finalInstallmentAmount,
        cashierId: formData.cashierId,
      };

      const endpoint = projectSale
        ? PROJECTENDPOINTS.PROJECT_SALES.modify(projectSale.id)
        : PROJECTENDPOINTS.PROJECT_SALES.create;

      const method = projectSale ? 'PATCH' : 'POST';
      
      await apiRequest(endpoint, method, '', payload);
      
      refresh();
      onCancel();
      setFormData({
    clientId: '',
    projectId: '',
    projectPrice: '', // Store original project price
    discount: '', // Discount amount
    saleTotal: '', // Calculated: projectPrice - discount
    downPayment: '0',
    numberOfInstallments: '',
    installmentAmount: '',
    cashierId: user,
  })
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-800">
            {projectSale ? 'Edit Project Sale' : 'Create New Project Sale'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {projectSale ? 'Update the project sale details' : 'Set up a new project sale with installment payments'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Selection */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client *
              </label>
              <CustomDropdown
                options={clients?.map(client => ({
                  label: `${client.firstName} ${client.lastName} - ${client.contact}`,
                  value: client.id
                })) || []}
                value={formData.clientId ? [formData.clientId] : []}
                onChange={(val: string[]) => setFormData(prev => ({ ...prev, clientId: val[0] || '' }))}
                placeholder="Select a client"
                disabled={!!projectSale} // Disable client selection in edit mode
              />
              {projectSale && (
                <p className="text-xs text-gray-500 mt-1">
                  Client cannot be changed for existing sales
                </p>
              )}
            </div>

            {/* Project Selection */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project *
              </label>
              <CustomDropdown
                options={projects?.map(project => ({
                  label: `${project.name} - ${parseFloat(project.price).toLocaleString()} UGX`,
                  value: project.id
                })) || []}
                value={formData.projectId ? [formData.projectId] : []}
                onChange={(val: string[]) => handleProjectSelect(val[0] || '')}
                placeholder="Select a project"
                disabled={!!projectSale} // Disable project selection in edit mode
              />
              {projectSale && (
                <p className="text-xs text-gray-500 mt-1">
                  Project cannot be changed for existing sales
                </p>
              )}
            </div>

            {/* Project Price (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Price (UGX)
              </label>
              <CustomNumberInput
                value={formData.projectPrice}
                onChange={() => {}} // Read-only
                placeholder="Select project to see price"
                disabled
              />
            </div>

            {/* Discount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount (UGX)
              </label>
              <CustomNumberInput
                value={formData.discount}
                onChange={handleDiscountChange}
                placeholder="Enter discount amount"
                min="0"
                max={formData.projectPrice || "0"}
                step="0.01"
              />
              {formData.projectPrice && formData.discount && (
                <p className="text-xs text-gray-500 mt-1">
                  {((parseFloat(formData.discount) / parseFloat(formData.projectPrice)) * 100).toFixed(1)}% discount
                </p>
              )}
            </div>

            {/* Sale Total (Read-only, calculated) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sale Total (UGX) *
              </label>
              <CustomNumberInput
                value={formData.saleTotal}
                onChange={() => {}} // Read-only
                placeholder="Calculated automatically"
                disabled
              />
              {formData.projectPrice && formData.discount && parseFloat(formData.discount) > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  Original: {parseFloat(formData.projectPrice).toLocaleString()} UGX - 
                  Discount: {parseFloat(formData.discount).toLocaleString()} UGX = 
                  Total: {parseFloat(formData.saleTotal).toLocaleString()} UGX
                </p>
              )}
            </div>

            {/* Down Payment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Down Payment (UGX) *
              </label>
              <CustomNumberInput
                value={formData.downPayment}
                onChange={(val) => setFormData(prev => ({ ...prev, downPayment: val }))}
                placeholder="Enter down payment amount"
                min="0"
                max={formData.saleTotal || "0"}
                step="0.01"
              />
              {formData.saleTotal && formData.downPayment && (
                <p className="text-xs text-gray-500 mt-1">
                  {((parseFloat(formData.downPayment) / parseFloat(formData.saleTotal)) * 100).toFixed(1)}% of sale total
                </p>
              )}
            </div>

            {/* Number of Installments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Installments *
              </label>
              <CustomNumberInput
                value={formData.numberOfInstallments}
                onChange={(val) => setFormData(prev => ({ ...prev, numberOfInstallments: val }))}
                placeholder="Number of installments"
                min="1"
                step="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Set to 1 for full payment at once
              </p>
            </div>

            {/* Installment Amount (Auto-calculated) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Installment Amount (UGX)
              </label>
              <CustomNumberInput
                value={formData.installmentAmount}
                onChange={(val) => setFormData(prev => ({ ...prev, installmentAmount: val }))}
                placeholder="Calculated automatically"
                min="0"
                step="0.01"
                disabled
              />
              {formData.installmentAmount && (
                <p className="text-xs text-gray-500 mt-1">
                  {parseFloat(formData.downPayment) >= parseFloat(formData.saleTotal) 
                    ? 'Full payment at once' 
                    : 'Calculated based on remaining balance'
                  }
                </p>
              )}
            </div>

            {/* Cashier Selection */}
            {/* <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cashier *
              </label>
              <CustomDropdown
                options={employees?.map(emp => ({
                  label: `${emp.firstName} ${emp.lastName}`,
                  value: emp.id
                })) || []}
                value={formData.cashierId ? [formData.cashierId] : []}
                onChange={(val: string[]) => setFormData(prev => ({ ...prev, cashierId: val[0] || '' }))}
                placeholder="Select cashier"
              />
            </div> */}
          </div>

          {/* Summary Section */}
          {(formData.saleTotal && formData.downPayment) && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-3">Payment Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Project Price:</span>
                  <p className="font-semibold">{parseFloat(formData.projectPrice || '0').toLocaleString()} UGX</p>
                </div>
                {parseFloat(formData.discount) > 0 && (
                  <div>
                    <span className="text-gray-600">Discount:</span>
                    <p className="font-semibold text-green-600">-{parseFloat(formData.discount).toLocaleString()} UGX</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Sale Total:</span>
                  <p className="font-semibold">{parseFloat(formData.saleTotal).toLocaleString()} UGX</p>
                </div>
                <div>
                  <span className="text-gray-600">Down Payment:</span>
                  <p className="font-semibold">{parseFloat(formData.downPayment).toLocaleString()} UGX</p>
                </div>
                <div>
                  <span className="text-gray-600">Remaining Balance:</span>
                  <p className="font-semibold">
                    {(parseFloat(formData.saleTotal) - parseFloat(formData.downPayment)).toLocaleString()} UGX
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">
                    {parseFloat(formData.downPayment) >= parseFloat(formData.saleTotal) ? 'Full Payment' : 'Installment Amount'}:
                  </span>
                  <p className="font-semibold">{parseFloat(formData.installmentAmount || '0').toLocaleString()} UGX</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
            <CustomButton 
              type='negative' 
              label="Cancel"
              fn={onCancel}
              disabled={loading}
            />
            <CustomButton
              label={projectSale ? 'Update Sale' : 'Create Sale'}
              fn={handleSubmit}
              loading={loading}
              disabled={loading}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOrModifyProjectSale;