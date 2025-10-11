import { useState, useEffect } from "react";
import CustomButton from "../../custom/buttons/customButton";
import CustomTextInput from "../../custom/inputs/customTextInput";
import CustomTextarea from "../../custom/inputs/customTextArea";
import { toast } from "sonner";
import { apiRequest } from "../../libs/apiConfig";
import { EventEndpoints } from "../../endpoints/event/eventEndpoints";
import useEvents from "../../hooks/events/useEvent";

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  tel: string;
  tel2?: string;
  amountPaid: number;
  paymentStatus: string;
  eventId: string;
  registrationDate: string;
  notes?: string;
}

export const EventPaymentStatus = {
  PAID: "PAID",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  UNPAID: "UNPAID"
} as const;

type EventPaymentStatus = typeof EventPaymentStatus[keyof typeof EventPaymentStatus];

interface Event {
  id: string;
  title: string;
  ticketPrice: number;
}

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (participant: Omit<Participant, 'id'>) => void;
  editingParticipant?: Participant | null;
  event: Event;
}

const AddParticipantModal: React.FC<AddParticipantModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingParticipant,
  event
}) => {
  const { refresh } = useEvents();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    tel: string;
    tel2: string;
    amountPaid: number;
    paymentStatus: string;
    eventId: string;
    notes: string;
  }>({
    firstName: '',
    lastName: '',
    tel: '',
    tel2: '',
    amountPaid: 0,
    paymentStatus: EventPaymentStatus.UNPAID,
    eventId: event.id,
    notes: ''
  });

  useEffect(() => {
    if (editingParticipant) {
      setFormData({
        firstName: editingParticipant.firstName,
        lastName: editingParticipant.lastName,
        tel: editingParticipant.tel,
        tel2: editingParticipant.tel2 || '',
        amountPaid: editingParticipant.amountPaid,
        paymentStatus: editingParticipant.paymentStatus,
        eventId: editingParticipant.eventId,
        notes: editingParticipant.notes || ''
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        tel: '',
        tel2: '',
        amountPaid: 0,
        paymentStatus: EventPaymentStatus.UNPAID,
        eventId: event.id,
        notes: ''
      });
    }
  }, [editingParticipant, isOpen, event.id]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePaymentStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    let newAmount = formData.amountPaid;

    // Automatically set amount based on payment status
    if (newStatus === EventPaymentStatus.PAID) {
      newAmount = event.ticketPrice;
    } else if (newStatus === EventPaymentStatus.UNPAID) {
      newAmount = 0;
    }
    // For PARTIALLY_PAID, keep the current amount or set to 0 if not valid
    else if (newStatus === EventPaymentStatus.PARTIALLY_PAID && formData.amountPaid <= 0) {
      newAmount = 0;
    }

    setFormData(prev => ({
      ...prev,
      paymentStatus: newStatus,
      amountPaid: newAmount
    }));
  };

  const handleAmountChange = (value: string) => {
    const numericValue = parseFloat(value) || 0;
    handleInputChange('amountPaid', numericValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation - check if required fields are filled
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.tel.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        tel: formData.tel,
        ...(formData.tel2 && { tel2: formData.tel2 }),
        amountPaid: formData.amountPaid,
        paymentStatus: formData.paymentStatus,
        eventId: formData.eventId,
        ...(formData.notes && { notes: formData.notes }),
        registrationDate: editingParticipant ? editingParticipant.registrationDate : new Date().toISOString().split('T')[0]
      };

      await apiRequest(EventEndpoints.addParticipant(event.id), "POST", '', payload);
      onClose();
      refresh();
    } catch (error) {
      console.error("Error submitting participant:", error);
      toast.error("Failed to submit participant");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-800">
            {editingParticipant ? 'Edit Participant' : 'Add New Participant'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors text-2xl"
            type="button"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <CustomTextInput
              label="First Name"
              value={formData.firstName}
              onChange={(value) => handleInputChange('firstName', value)}
              placeholder="Enter first name"
              isRequired
              disabled={loading}
            />

            <CustomTextInput
              label="Last Name"
              value={formData.lastName}
              onChange={(value) => handleInputChange('lastName', value)}
              placeholder="Enter last name"
              isRequired
              disabled={loading}
            />

            <CustomTextInput
              label="Phone Number"
              value={formData.tel}
              onChange={(value) => handleInputChange('tel', value)}
              placeholder="Enter phone number"
              type="tel"
              isRequired
              disabled={loading}
            />

            <CustomTextInput
              label="Alternate Phone (Optional)"
              value={formData.tel2}
              onChange={(value) => handleInputChange('tel2', value)}
              placeholder="Enter alternate phone"
              type="tel"
              disabled={loading}
            />

            <div className="w-full">
              <label className="block mb-1 font-medium text-gray-700">Payment Status</label>
              <select
                value={formData.paymentStatus}
                onChange={handlePaymentStatusChange}
                disabled={loading}
                className={`
                  w-full
                  border border-gray-300
                  rounded-md
                  px-3 py-2
                  text-gray-700
                  placeholder-gray-400
                  focus:border-blue-500 
                  focus:ring-2 
                  focus:ring-blue-200
                  focus:outline-none
                  disabled:bg-gray-50
                  disabled:text-gray-400
                  transition-colors
                  duration-200
                  cursor-pointer
                `}
              >
                <option value={EventPaymentStatus.UNPAID}>Unpaid</option>
                <option value={EventPaymentStatus.PARTIALLY_PAID}>Partially Paid</option>
                <option value={EventPaymentStatus.PAID}>Paid</option>
              </select>
            </div>

            {formData.paymentStatus === EventPaymentStatus.PARTIALLY_PAID && (
              <CustomTextInput
                label="Amount Paid (UGX)"
                value={formData.amountPaid.toString()}
                onChange={handleAmountChange}
                placeholder={`Enter amount (max: ${event.ticketPrice - 1})`}
                type="number"
                disabled={loading}
              />
            )}

            {/* Display auto-calculated amounts for non-partial payments */}
            {formData.paymentStatus !== EventPaymentStatus.PARTIALLY_PAID && (
              <div className="w-full p-3 bg-gray-50 rounded-md col-span-2 md:col-span-1">
                <p className="text-sm font-medium text-gray-700">
                  {formData.paymentStatus === EventPaymentStatus.PAID 
                    ? `Full amount: ${new Intl.NumberFormat('en-UG', {
                        style: 'currency',
                        currency: 'UGX',
                      }).format(event.ticketPrice)}`
                    : `Amount due: ${new Intl.NumberFormat('en-UG', {
                        style: 'currency',
                        currency: 'UGX',
                      }).format(event.ticketPrice)}`
                  }
                </p>
              </div>
            )}
          </div>
          
          <div className="mb-6">
            <CustomTextarea
              label="Notes (Optional)"
              value={formData.notes}
              onChange={(value) => handleInputChange('notes', value)}
              placeholder="Add any additional notes"
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <CustomButton 
              type="negative" 
              fn={onClose} 
              label="Cancel" 
              disabled={loading}
            />
            <CustomButton
              type="positive"
              label={editingParticipant ? "Update Participant" : "Create Participant"}
              fn={handleSubmit}
              disabled={loading}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddParticipantModal;