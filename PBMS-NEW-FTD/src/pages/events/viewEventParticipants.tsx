import React, { useState, useEffect } from 'react';
import { 
  FaUserPlus, FaEdit, FaTrash, FaMoneyBillWave, 
  FaSearch, FaPrint 
} from 'react-icons/fa';
import { useParams } from 'react-router-dom';
import CustomTable from '../../custom/table/customTable';
import useEvents from '../../hooks/events/useEvent';
import AddParticipantModal from './AddorModiyEventParticipant';
import { formatDate } from '../../libs/dateFormatter';

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ticketType: string;
  paymentStatus: 'paid' | 'pending' | 'refunded';
  amountPaid: number;
  registrationDate: string;
  notes?: string;
}

interface Event {
  id: string;
  title: string;
  ticketPrice: number;
  participants: Participant[];
}

const ParticipantsManagement = () => {
  const { id } = useParams<{ id: string }>();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [paymentUpdate, setPaymentUpdate] = useState<{id: string, status: Participant['paymentStatus'], amount: number} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | Participant['paymentStatus']>('all');
  
  const { data: events = [], isLoading, error } = useEvents();
  
  // Find the current event
  const event = events.find((event: Event) => event.id === id);
  
  if (isLoading) {
    return <div className="flex justify-center items-center p-8">Loading...</div>;
  }
  
  if (error) {
    return <div className="flex justify-center items-center p-8 text-red-600">Error loading events: {error.message}</div>;
  }
  
  if (!event) {
    return <div className="flex justify-center items-center p-8">Event not found</div>;
  }

  const participants = event.EventParticipant || [];

  // Calculate totals
  const totalParticipants = participants.length;
  const totalAmountCollected = participants
    .filter(p => p.paymentStatus === 'paid')
    .reduce((sum, participant) => sum + participant.amountPaid, 0);

  // Filter participants based on search and filter
  const filteredParticipants = participants.filter(participant => {
    const matchesSearch = 
      participant.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.tel.includes(searchTerm);
    
    const matchesFilter = filterStatus === 'all' || participant.paymentStatus === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  // Mock functions - you'll need to implement these with your actual API calls
  const onAddParticipant = async (participantData: Omit<Participant, 'id'>) => {
    console.log('Adding participant:', participantData);
    // Implement your API call here
  };

  const onUpdateParticipant = async (id: string, updates: Partial<Participant>) => {
    console.log('Updating participant:', id, updates);
    // Implement your API call here
  };

  const onRemoveParticipant = async (id: string) => {
    console.log('Removing participant:', id);
    // Implement your API call here
  };

  const onUpdatePayment = async (id: string, paymentStatus: Participant['paymentStatus'], amount: number) => {
    console.log('Updating payment:', id, paymentStatus, amount);
    // Implement your API call here
  };

  const handleAddParticipant = (participantData: Omit<Participant, 'id'>) => {
    if (editingParticipant) {
      onUpdateParticipant(editingParticipant.id, participantData);
    } else {
      onAddParticipant(participantData);
    }
    setEditingParticipant(null);
    setShowAddModal(false);
  };

  const handleEdit = (participant: Participant) => {
    setEditingParticipant(participant);
    setShowAddModal(true);
  };

  const handlePaymentUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentUpdate) {
      onUpdatePayment(paymentUpdate.id, paymentUpdate.status, paymentUpdate.amount);
      setPaymentUpdate(null);
    }
  };

  // CustomTable columns configuration
  const tableColumns = [
    {
      key: 'name',
      label: `firstName `,
      sortable: true,
      filterable: true,
      render: (value: any, row: Participant) => (
        <div>
          <div className="font-medium">{row.firstName}</div>
          <div className="text-sm text-gray-500">{row.lastName}</div>
        </div>
      )
    },
    {
      key: 'contact',
      label: 'Contact',
      sortable: false,
      filterable: true,
      render: (value: any, row: Participant) => (
        <div>
          <div className="font-medium">{row.email}</div>
          <div className="text-sm text-gray-500">{row.tel}</div>
        </div>
      )
    },

    {
      key: 'paymentStatus',
      label: 'Payment Status',
      sortable: true,
      filterable: true,
      render: (value: Participant['paymentStatus']) => (
        <span className={`px-2 py-1 text-xs rounded-full capitalize ${
          value.toLowerCase() === 'paid' 
            ? 'bg-green-100 text-green-800' 
            : value.toLowerCase() === 'partially_paid'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'amountPaid',
      label: 'Amount Paid',
      sortable: true,
      filterable: true,
      render: (value: number) => (
        <span className="font-medium">
          {new Intl.NumberFormat('en-UG', {
            style: 'currency',
            currency: 'UGX',
          }).format(value)}
        </span>
      )
    },
    {
      key: 'registrationDate',
      label: 'Date Registered',
      sortable: true,
      filterable: true,
      render: (value: number, row: Participant) => (
        <span className="font-medium">
          {formatDate(row.createdAt)}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      filterable: false,
      render: (value: any, row: Participant) => (
        <div className="flex gap-2">
          <button
            onClick={() => setPaymentUpdate({
              id: row.id,
              status: row.paymentStatus,
              amount: row.amountPaid
            })}
            className="text-green-600 hover:text-green-800 transition-colors"
            title="Update Payment"
          >
            <FaMoneyBillWave />
          </button>
          <button
            onClick={() => handleEdit(row)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="Edit Participant"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => onRemoveParticipant(row.id)}
            className="text-red-600 hover:text-red-800 transition-colors"
            title="Remove Participant"
          >
            <FaTrash />
          </button>
        </div>
      )
    }
  ];

  // Prepare data for CustomTable
  const tableData = filteredParticipants.map(participant => ({
    ...participant,
    contact: `${participant.email} ${participant.phone}`, // For search/filter purposes
    actions: null // This will be handled by the render function
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Manage Participants</h2>
            <p className="text-gray-600">{event.title}</p>
          </div>
           <div className="relative group flex items-center  gap-3">
              <button className="p-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors">
                <FaPrint />
              </button>
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                Print
              </span>
            </div>
        
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-gray-50 p-4 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-sm text-gray-600">Total Participants</div>
            <div className="text-2xl font-bold text-gray-800">{totalParticipants}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Amount Collected</div>
            <div className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('en-UG', {
                style: 'currency',
                currency: 'UGX',
              }).format(totalAmountCollected)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Expected Revenue</div>
            <div className="text-2xl font-bold text-blue-600">
              {new Intl.NumberFormat('en-UG', {
                style: 'currency',
                currency: 'UGX',
              }).format(totalParticipants * event.ticketPrice)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Balance</div>
            <div className="text-2xl font-bold text-orange-600">
              {new Intl.NumberFormat('en-UG', {
                style: 'currency',
                currency: 'UGX',
              }).format((totalParticipants * event.ticketPrice) - totalAmountCollected)}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex-1 min-w-[200px]">
            {/* <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search participants..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div> */}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors w-full md:w-auto justify-center"
          >
            <FaUserPlus className="mr-2" />
            Add Participant
          </button>
        </div>
      </div>

      {/* Payment Update Form */}
      {paymentUpdate && (
        <div className="p-4 border-b border-gray-200 bg-green-50">
          <h3 className="text-lg font-semibold mb-4">Update Payment</h3>
          <form onSubmit={handlePaymentUpdate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
              <select
                value={paymentUpdate.status}
                onChange={(e) => setPaymentUpdate({
                  ...paymentUpdate,
                  status: e.target.value as Participant['paymentStatus']
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (UGX)</label>
              <input
                type="number"
                value={paymentUpdate.amount}
                onChange={(e) => setPaymentUpdate({
                  ...paymentUpdate,
                  amount: parseFloat(e.target.value) || 0
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => setPaymentUpdate(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Update Payment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Participants Table */}
      <div className="p-4">
        <CustomTable
          columns={tableColumns}
          data={tableData}
          pageSize={10}
        />
      </div>

      {/* Add/Edit Participant Modal */}
      <AddParticipantModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingParticipant(null);
        }}
        event={event}
        onSubmit={handleAddParticipant}
        editingParticipant={editingParticipant}
      />
    </div>
  );
};

export default ParticipantsManagement;