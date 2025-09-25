import React, { useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { toast } from 'sonner';
import useEvents from '../../hooks/events/useEvent';
import { apiRequest } from '../../libs/apiConfig';
import CustomTextInput from '../../custom/inputs/customTextInput';
import CustomButton from '../../custom/buttons/customButton';
import CustomDateInput from '../../custom/inputs/customDateSelector';
import { EventEndpoints } from '../../endpoints/event/eventEndpoints';
import CustomTextarea from '../../custom/inputs/customTextArea';
import type { IEvent } from '../../redux/types/events';

interface EventFormModalProps {
  onClose: () => void;
  event: IEvent;
}

const EventFormModal: React.FC<EventFormModalProps> = ({ onClose, event }) => {
  const { refresh } = useEvents();

  const [form, setForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    ticketPrice: '',
    location: '',
  });

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title,
        description: event.description,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
        ticketPrice: event.ticketPrice,
       location: event.location

      })
    }
  }, [event])

  const [loading, setLoading] = useState(false);

  const handleChange = (name: string, value: any) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = event ? "PATCH" : "POST";
      const endpoint = event ? EventEndpoints.updateEvent(event.id) : EventEndpoints.createEvent;

      await apiRequest(endpoint, method, "", {
        ...form,
        ticketPrice: parseFloat(form.ticketPrice),
      });
      refresh();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <FaTimes />
        </button>

        <h3 className="text-lg font-bold mb-4">{ event ? 'Edit Event': 'Create New Event'}</h3>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <CustomTextInput
            label='Event Name'
            type="text"
            name="title"
            placeholder="Enter event title"
            value={form.title}
            onChange={(val) => handleChange("title", val)}
            required
            isRequired={true}
          />

          <CustomDateInput
            name="startDate"
            value={form.startDate}
            onChange={(val) => handleChange("startDate", val)}
            required
            label="Start Date"
            isRequired={true}
          />

          <CustomDateInput
            name="endDate"
            value={form.endDate}
            onChange={(val) => handleChange("endDate", val)}
            required
            label="End Date"
            isRequired={true}
          />

          <CustomTextInput
            label='Ticket Price'
            type="number"
            name="ticketPrice"
            placeholder="Enter ticket price"
            value={form.ticketPrice}
            onChange={(val) => handleChange("ticketPrice", val)}
            required
            isRequired={true}
          />

          <CustomTextInput
            label='Event Location'
            type="text"
            name="location"
            placeholder="Enter event location"
            value={form.location}
            onChange={(val) => handleChange("location", val)}
            isRequired={true}
          />

          <CustomTextarea
            label='Description'
            type="text"
            name="description"
            placeholder="Enter description"
            value={form.description}
            onChange={(val) => handleChange("description", val)}
          />

          <div className="flex justify-end space-x-3 mt-6">
            <CustomButton type="negative" fn={onClose} label="Cancel" />
            <CustomButton
              label={event ? "Update Event" : "Create Event"}
              fn={handleSubmit}
              disabled={loading}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventFormModal;
