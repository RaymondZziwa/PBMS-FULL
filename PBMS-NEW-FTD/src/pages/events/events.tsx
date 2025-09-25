import React, { useState } from 'react';
import CustomTable from '../../custom/table/customTable';
import { FaPlus, FaTrash, FaUsers } from 'react-icons/fa6';
import useEvents from '../../hooks/events/useEvent';
import EventFormModal from './AddorModify';
import { formatDate } from '../../libs/dateFormatter';
import { FaEdit } from 'react-icons/fa';
import CustomDeleteModal from '../../custom/modals/customDeleteModal';
import { toast } from 'sonner';
import { apiRequest } from '../../libs/apiConfig';
import { EventEndpoints } from '../../endpoints/event/eventEndpoints';
import type { IEvent } from '../../redux/types/events';
import { useNavigate } from 'react-router-dom';

  
const EventTable: React.FC = () => {
  const { data: events, refresh } = useEvents()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalProps, setModalProps] = useState<{
      isOpen: boolean;
      mode: 'create' | 'edit' | 'delete' | 'view' | null;
      event: IEvent | null;
    }>({
    isOpen: false, mode: null ,event: null
    })
  
  const deleteEvent = async () => {
    try {
      await apiRequest(EventEndpoints.deleteEvent(modalProps.event?.id), "DELETE", '');
      refresh()
    } catch (error) {
      toast.error(error?.response?.data?.message)
    }
  }


  const columns = [
    { key: "title", label: "Title" },
    {
      key: `startDate`,
      label: "Start Date",
      render: (value: string) => formatDate(value)
    },
    {
      key: "endDate",
      label: "End Date",
      render: (value: string) => formatDate(value)
    },
    {
      key: "ticketPrice",
      label: "Ticket Price (UGX)",
      render: (value: number) =>
        new Intl.NumberFormat("en-UG", {
          style: "currency",
          currency: "UGX",
        }).format(value),
    },
    { key: "location", label: "Location" },
    { key: "status", label: "Status" },
   {
  key: "actions",
  label: "Actions",
  render: (_: any, row: any) => (
    <div className="flex gap-3">
      {/* View Participants Button with Tooltip */}
      <div className="relative group">
        <button
          className="text-green-600 hover:text-green-800 transition-colors"
          // onClick={() => {
          //   setMProps({
          //   isOpen: true,
          //   mode: 'view',
          //   event: row
          // })
          // }}
          onClick={() => navigate(`/tickets/events/${row?.id}`)}
        >
          <FaUsers />
        </button>
        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          Manage Participants
        </span>
      </div>
      
      {/* Edit Button with Tooltip */}
      <div className="relative group">
        <button
          className="text-blue-600 hover:text-blue-800 transition-colors"
          onClick={() => {
            setShowModal(true)
            setModalProps({
            isOpen: false,
            mode: 'edit',
            event: row
          })
          }}
        >
          <FaEdit />
        </button>
        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          Edit
        </span>
      </div>
      
      {/* Delete Button with Tooltip */}
      <div className="relative group">
        <button
          className="text-red-600 hover:text-red-800 transition-colors"
          onClick={() => setModalProps({
            isOpen: true,
            mode: 'delete',
            event: row
          })}
        >
          <FaTrash />
        </button>
        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          Delete
        </span>
      </div>
    </div>
  ),
}
  ];
  
  

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Upcoming Events</h2>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          onClick={() => setShowModal(true)}
        >
          <FaPlus /> New Event
        </button>
      </div>

      <CustomTable
        columns={columns}
        data={events}
      />

      {showModal && <EventFormModal
          onClose={() => {
          setShowModal(false)
          setModalProps({isOpen: false, mode: null, event: null})
          }}
        event={modalProps.event} />}
      <CustomDeleteModal visible={modalProps.isOpen} onCancel={()=> setModalProps({isOpen: false, mode: null, event: null})} onConfirm={deleteEvent} />
    </div>
  );
};

export default EventTable;
