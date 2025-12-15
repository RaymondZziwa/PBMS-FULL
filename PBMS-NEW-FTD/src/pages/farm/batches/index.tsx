import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaEye, FaSkull } from 'react-icons/fa';
import CustomTable from '../../../custom/table/customTable';
import CustomDeleteModal from '../../../custom/modals/customDeleteModal';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import useSeedlingBatches from '../../../hooks/farm/useSeedlingBatches';
import { farmEndpoints } from '../../../endpoints/farm/farmEndpoints';
import type { SeedlingBatch } from '../../../redux/types/farm';
import AddorModifySeedlingBatch from './AddorModify';
import { 
  X, 
  Calendar, 
  Hash, 
  Clock, 
  FileText, 
  ArrowRight, 
  CheckCircle, 
  XCircle,
  Sprout,
  AlertTriangle,
  Plus,
  Minus,
  TrendingDown,
  BarChart3,
  Info,
  Activity
} from 'lucide-react';
import useSeedlingStages from '../../../hooks/farm/useSeedlingStages';
import React from 'react';

const SeedlingBatchesManagement = () => {
  const { data, refresh } = useSeedlingBatches();
  const { data: stagesData } = useSeedlingStages();
  const [batches, setBatches] = useState(data);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setBatches(data);
  }, [data]);

  const [modalProps, setModalProps] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | '';
    batch: SeedlingBatch | null;
  }>({
    isOpen: false,
    mode: 'create',
    batch: null
  });
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [previewBatch, setPreviewBatch] = useState<SeedlingBatch | null>(null);
  const [deathModalOpen, setDeathModalOpen] = useState(false);
  const [selectedBatchForDeath, setSelectedBatchForDeath] = useState<SeedlingBatch | null>(null);
  const [deathFormData, setDeathFormData] = useState<{
    stageId: string;
    reason: string;
    seedlingDeaths: Array<{
      seedlingId: string;
      seedlingName: string;
      deathCount: number;
      maxPossible: number;
    }>;
  }>({
    stageId: '',
    reason: '',
    seedlingDeaths: []
  });

  const deleteBatch = async () => {
    try {
      if (modalProps.batch) {
        await apiRequest(farmEndpoints.seedlingBatch.remove(modalProps.batch.id), 'DELETE', '');
        refresh();
        setIsDeleteModalOpen(false);
        toast.success('Batch deleted successfully');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete batch');
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return {
          color: 'text-yellow-800 bg-yellow-100 border-yellow-200',
          icon: <Clock size={16} className="text-yellow-600" />,
          label: 'In Progress'
        };
      case 'COMPLETED':
        return {
          color: 'text-green-800 bg-green-100 border-green-200',
          icon: <CheckCircle size={16} className="text-green-600" />,
          label: 'Completed'
        };
      case 'FAILED':
        return {
          color: 'text-red-800 bg-red-100 border-red-200',
          icon: <XCircle size={16} className="text-red-600" />,
          label: 'Failed'
        };
      default:
        return {
          color: 'text-gray-800 bg-gray-100 border-gray-200',
          icon: <Clock size={16} className="text-gray-600" />,
          label: status
        };
    }
  };

  const handleOpenDeathModal = (batch: SeedlingBatch) => {
    setSelectedBatchForDeath(batch);
    
    // Initialize death form with current batch data
    const seedlingDeaths = batch.seedlings.map(seedling => ({
      seedlingId: seedling.id,
      seedlingName: seedling.name || `Seedling ${seedling.id.substring(0, 8)}...`,
      deathCount: 0,
      maxPossible: seedling.currentQty // Can't record more deaths than current quantity
    }));

    setDeathFormData({
      stageId: batch.currentStageId || '',
      reason: '',
      seedlingDeaths
    });
    
    setDeathModalOpen(true);
  };

  const handleDeathCountChange = (seedlingId: string, count: number) => {
    setDeathFormData(prev => ({
      ...prev,
      seedlingDeaths: prev.seedlingDeaths.map(sd => 
        sd.seedlingId === seedlingId 
          ? { ...sd, deathCount: Math.max(0, Math.min(count, sd.maxPossible)) }
          : sd
      )
    }));
  };

  const handleRecordDeaths = async () => {
    try {
      if (!selectedBatchForDeath) return;
      setLoading(true);

      // Validate
      const totalDeaths = deathFormData.seedlingDeaths.reduce((sum, sd) => sum + sd.deathCount, 0);
      if (totalDeaths === 0) {
        toast.error('Please enter at least one death record');
        setLoading(false);
        return;
      }

      if (!deathFormData.stageId) {
        toast.error('Please select the current stage');
        setLoading(false);
        return;
      }

      // Prepare seedlings JSON as per your model
      const seedlings = deathFormData.seedlingDeaths.map(sd => ({
        seedlingId: sd.seedlingId,
        deathCount: sd.deathCount
      })).filter(sd => sd.deathCount > 0);

      const deathData = {
        batchId: selectedBatchForDeath.id,
        stageId: deathFormData.stageId,
        reason: deathFormData.reason || null,
        seedlings
      };

      await apiRequest(farmEndpoints.seedlingDeath.create, 'POST', '', deathData);
      
      toast.success('Death records saved successfully');
      refresh();
      setDeathModalOpen(false);
      setSelectedBatchForDeath(null);
      setDeathFormData({
        stageId: '',
        reason: '',
        seedlingDeaths: []
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to record deaths');
    } finally {
      setLoading(false);
    }
  };

  // Table columns configuration
  const columns = [
    { key: 'batchNumber', label: 'Batch Number', sortable: true, filterable: true },
    { key: 'currentStage.name', label: 'Current Stage', sortable: true, filterable: false, render: (_, row: SeedlingBatch) => row.currentStage?.name },
    { key: 'daysSpentInCurrentStage', label: 'Days in Current Stage', sortable: true, filterable: false },
    {
      key: "status",
      label: "Status",
      sortable: true,
      filterable: true,
      render: (value: string) => {
        const config = getStatusConfig(value);
        return (
          <div className="flex items-center gap-2">
            {config.icon}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color} border`}>
              {config.label}
            </span>
          </div>
        );
      },
    },
    { 
      key: 'seedlings', 
      label: 'Seedlings', 
      sortable: false, 
      filterable: false,
      render: (value: any[], row: SeedlingBatch) => {
        const totalCurrent = row.seedlings?.reduce((sum, s) => sum + s.currentQty, 0) || 0;
        const totalPlanted = row.seedlings?.reduce((sum, s) => sum + s.plantedQty, 0) || 0;
        const survivalRate = totalPlanted > 0 ? (totalCurrent / totalPlanted * 100).toFixed(0) : '0';
        
        return (
          <div className="text-sm">
            <div className="flex items-center gap-1">
              <Sprout size={14} className="text-gray-500" />
              <span>{row.seedlings?.length || 0} types</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {totalCurrent} remaining ({survivalRate}% survival)
            </div>
          </div>
        );
      }
    },
    { key: 'actions', label: 'Actions', sortable: false, filterable: false },
  ];

  // Prepare data for the table
  const tableData = batches.map(batch => ({
    ...batch,
    actions: (
        <div className="flex gap-3">
             <button
          className="text-green-600 hover:text-green-800 transition-colors p-2 rounded-lg hover:bg-green-50"
          onClick={() => setPreviewBatch(batch)}
          title="View Details"
        >
          <FaEye size={16} />
        </button>
            {
                batch.status === 'IN_PROGRESS' && (
                    <>
        <button
          className="text-red-600 hover:text-red-800 transition-colors p-2 rounded-lg hover:bg-red-50"
          onClick={() => handleOpenDeathModal(batch)}
          title="Record Deaths"
          disabled={batch.status === 'COMPLETED' || batch.status === 'FAILED'}
        >
          <FaSkull size={16} />
        </button>
        {/* Edit Button */}
        <button
          className="text-gray-600 hover:text-gray-800 transition-colors p-2 rounded-lg hover:bg-gray-50"
          onClick={() => setModalProps({ isOpen: true, mode: 'edit', batch })}
          title="Edit Batch"
        >
          <FaEdit size={16} />
        </button>
        {/* Delete Button */}
        <button
          className="text-red-600 hover:text-red-800 transition-colors p-2 rounded-lg hover:bg-red-50"
          onClick={() => {
            setModalProps({ isOpen: false, mode: '', batch });
            setIsDeleteModalOpen(true);
          }}
          title="Delete Batch"
        >
          <FaTrash size={16} />
        </button>
                    </>
                )
            }
      </div>
    ),
  }));

  // Death Record Modal Component
  const RecordDeathsModal = () => {
    if (!deathModalOpen || !selectedBatchForDeath) return null;

    const totalPossibleDeaths = deathFormData.seedlingDeaths.reduce((sum, sd) => sum + sd.maxPossible, 0);
    const totalRecordedDeaths = deathFormData.seedlingDeaths.reduce((sum, sd) => sum + sd.deathCount, 0);
    const remainingAfter = totalPossibleDeaths - totalRecordedDeaths;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">Record Seedling Deaths</h3>
              <p className="text-sm text-gray-500 mt-1">
                Batch: <span className="font-medium">{selectedBatchForDeath.batchNumber}</span>
              </p>
            </div>
            <button
              onClick={() => {
                setDeathModalOpen(false);
                setSelectedBatchForDeath(null);
              }}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              type="button"
            >
              <X size={24} className="text-gray-500" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Warning Banner */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-yellow-600 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <h4 className="font-medium text-yellow-800">Important Notice</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Recording deaths will permanently reduce the current quantity of seedlings. 
                      This action updates the batch statistics and creates a permanent death record.
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Stage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Stage *
                </label>
                <select
                  value={deathFormData.stageId}
                  onChange={(e) => setDeathFormData(prev => ({ ...prev, stageId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white"
                  required
                >
                  <option value="">Select Current Stage</option>
                  {stagesData?.map(stage => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name} ({stage.stageDays} days)
                    </option>
                  ))}
                </select>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-700">{totalPossibleDeaths}</div>
                  <div className="text-sm text-blue-600">Total Current</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-700">{totalRecordedDeaths}</div>
                  <div className="text-sm text-red-600">To Record</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-700">{remainingAfter}</div>
                  <div className="text-sm text-green-600">Will Remain</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-700">
                    {totalPossibleDeaths > 0 ? ((remainingAfter / totalPossibleDeaths) * 100).toFixed(0) : '0'}%
                  </div>
                  <div className="text-sm text-purple-600">Survival Rate</div>
                </div>
              </div>

              {/* Seedling Deaths Table */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-700 flex items-center gap-2">
                    <TrendingDown size={20} className="text-gray-500" />
                    Record Deaths per Seedling Type
                  </h4>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Total: {totalRecordedDeaths}</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg overflow-hidden border">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Seedling Type</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Current</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Deaths</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Remaining</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {deathFormData.seedlingDeaths.map((seedling) => {
                        const remaining = seedling.maxPossible - seedling.deathCount;
                        const percentage = seedling.maxPossible > 0 ? (remaining / seedling.maxPossible) * 100 : 0;
                        
                        return (
                          <tr key={seedling.seedlingId} className="hover:bg-gray-100">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Sprout size={16} className="text-gray-400" />
                                <div>
                                  <span className="font-medium text-gray-800 block">{seedling.seedlingName}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                                {seedling.maxPossible}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleDeathCountChange(seedling.seedlingId, seedling.deathCount - 1)}
                                  disabled={seedling.deathCount <= 0}
                                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  <Minus size={14} />
                                </button>
                                <input
                                  type="number"
                                  value={seedling.deathCount}
                                  onChange={(e) => handleDeathCountChange(seedling.seedlingId, parseInt(e.target.value) || 0)}
                                  min="0"
                                  max={seedling.maxPossible}
                                  className="w-20 px-3 py-1.5 border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-gray-500 font-medium"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDeathCountChange(seedling.seedlingId, seedling.deathCount + 1)}
                                  disabled={seedling.deathCount >= seedling.maxPossible}
                                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="h-2 rounded-full transition-all duration-300"
                                    style={{ 
                                      width: `${percentage}%`,
                                      backgroundColor: percentage > 70 ? '#10b981' : percentage > 40 ? '#f59e0b' : '#ef4444'
                                    }}
                                  ></div>
                                </div>
                                <span className={`text-sm font-medium min-w-[3ch] ${
                                  percentage > 70 ? 'text-green-600' :
                                  percentage > 40 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {remaining}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleDeathCountChange(seedling.seedlingId, 0)}
                                  disabled={seedling.deathCount === 0}
                                  className="text-xs text-gray-600 hover:text-gray-800 hover:underline px-2 py-1 rounded hover:bg-gray-200"
                                >
                                  Clear
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeathCountChange(seedling.seedlingId, seedling.maxPossible)}
                                  disabled={seedling.maxPossible === 0}
                                  className="text-xs text-red-600 hover:text-red-800 hover:underline px-2 py-1 rounded hover:bg-red-50"
                                >
                                  All Dead
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Reason for Death */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Death (Optional)
                </label>
                <textarea
                  value={deathFormData.reason}
                  onChange={(e) => setDeathFormData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Enter reason for seedling deaths (e.g., disease, pests, environmental factors, etc.)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Providing a reason helps with analysis and future prevention strategies
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-6">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Remaining: {remainingAfter}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Deaths: {totalRecordedDeaths}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDeathModalOpen(false);
                    setSelectedBatchForDeath(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  type="button"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordDeaths}
                  disabled={totalRecordedDeaths === 0 || !deathFormData.stageId || loading}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  type="button"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    `Record ${totalRecordedDeaths} Death${totalRecordedDeaths !== 1 ? 's' : ''}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

// Batch Preview Modal Component
const BatchPreviewModal = () => {
  if (!previewBatch) return null;

  const statusConfig = getStatusConfig(previewBatch.status);
  const totalPlanted = previewBatch.seedlings?.reduce((sum, s) => sum + s.plantedQty, 0) || 0;
  const totalCurrent = previewBatch.seedlings?.reduce((sum, s) => sum + s.currentQty, 0) || 0;
  const totalLost = previewBatch.seedlings?.reduce((sum, s) => sum + s.lostQty, 0) || 0;
  const overallSurvivalRate = totalPlanted > 0 ? (totalCurrent / totalPlanted * 100).toFixed(1) : '0.0';
  const daysRemaining = previewBatch.currentStage?.stageDays 
    ? previewBatch.currentStage.stageDays - previewBatch.daysSpentInCurrentStage 
    : 0;

  // Calculate stage progress
  const stageProgress = previewBatch.currentStage?.stageDays 
    ? Math.min(100, (previewBatch.daysSpentInCurrentStage / previewBatch.currentStage.stageDays) * 100)
    : 0;

  // Calculate total deaths from death records
  const totalDeathsFromRecords = previewBatch.seedlingDeaths?.reduce((total, death) => {
    return total + death.seedlings.reduce((sum, seedling) => sum + seedling.deathCount, 0);
  }, 0) || 0;

  // Get seedling names mapping for death records
  const getSeedlingName = (seedlingId: string) => {
    const seedling = previewBatch.seedlings?.find(s => s.id === seedlingId);
    return seedling?.name || `Seedling ${seedlingId.substring(0, 8)}...`;
  };

  // Group deaths by seedling
  const deathsBySeedling = previewBatch.seedlingDeaths?.reduce((acc, death) => {
    death.seedlings.forEach(seedlingDeath => {
      if (!acc[seedlingDeath.seedlingId]) {
        acc[seedlingDeath.seedlingId] = {
          name: getSeedlingName(seedlingDeath.seedlingId),
          totalDeaths: 0,
          records: []
        };
      }
      acc[seedlingDeath.seedlingId].totalDeaths += seedlingDeath.deathCount;
      acc[seedlingDeath.seedlingId].records.push({
        date: new Date(death.createdAt),
        deathCount: seedlingDeath.deathCount,
        reason: death.reason,
        stageName: previewBatch.currentStage?.name || 'Unknown Stage'
      });
    });
    return acc;
  }, {} as Record<string, { name: string; totalDeaths: number; records: Array<{ date: Date; deathCount: number; reason: string | null; stageName: string }> }>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <Hash className="text-gray-600" />
              {previewBatch.batchNumber}
            </h3>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
              <Calendar size={14} />
              Created: {new Date(previewBatch.createdAt).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <button
            onClick={() => setPreviewBatch(null)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            type="button"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {/* Top Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Status</p>
                    <div className="flex items-center gap-2 mt-2">
                      {statusConfig.icon}
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                  <Activity className="text-blue-500" size={24} />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Survival Rate</p>
                    <p className="text-2xl font-bold text-green-800 mt-2">{overallSurvivalRate}%</p>
                  </div>
                  <BarChart3 className="text-green-500" size={24} />
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700 font-medium">Current Quantity</p>
                    <p className="text-2xl font-bold text-gray-800 mt-2">{totalCurrent}</p>
                    <p className="text-xs text-gray-600">of {totalPlanted} planted</p>
                  </div>
                  <Sprout className="text-gray-500" size={24} />
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-700 font-medium">Total Deaths</p>
                    <p className="text-2xl font-bold text-red-800 mt-2">{totalLost}</p>
                    <p className="text-xs text-red-600">
                      {previewBatch.seedlingDeaths?.length || 0} record(s)
                    </p>
                  </div>
                  <TrendingDown className="text-red-500" size={24} />
                </div>
              </div>
            </div>

            {/* Stage Information */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ArrowRight className="text-gray-600" />
                Current Stage Information
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Stage Name:</span>
                    <span className="font-semibold text-gray-800">{previewBatch.currentStage?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Stage Days:</span>
                    <span className="font-semibold text-gray-800">{previewBatch.currentStage?.stageDays || 0} days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Days Completed:</span>
                    <span className="font-semibold text-gray-800">{previewBatch.daysSpentInCurrentStage} days</span>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Stage Progress</span>
                    <span>{daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Stage completed'}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                      style={{ width: `${stageProgress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>Day 0</span>
                    <span>Day {previewBatch.currentStage?.stageDays || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seedlings Detailed Table */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Sprout className="text-gray-600" />
                Seedlings Details ({previewBatch.seedlings?.length || 0} Types)
              </h4>
              
              <div className="bg-white border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Seedling Name</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Planted Qty</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Current Qty</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Lost Qty</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Survival Rate</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {previewBatch.seedlings?.map((seedling) => {
                        const survivalRate = seedling.plantedQty > 0 
                          ? ((seedling.currentQty / seedling.plantedQty) * 100).toFixed(1)
                          : '0.0';
                        const isAllDead = seedling.currentQty === 0;
                        const isCritical = seedling.currentQty < seedling.plantedQty * 0.3;
                        
                        return (
                          <tr key={seedling.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  isAllDead ? 'bg-red-500' : 
                                  isCritical ? 'bg-yellow-500' : 'bg-green-500'
                                }`}></div>
                                <div>
                                  <span className="font-medium text-gray-800">
                                    {seedling.name || `Seedling ${seedling.id.substring(0, 8)}...`}
                                  </span>
                                  <p className="text-xs text-gray-500 mt-1">{seedling.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                                {seedling.plantedQty}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                                seedling.currentQty === 0 ? 'bg-red-100 text-red-800' :
                                seedling.currentQty < seedling.plantedQty * 0.5 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {seedling.currentQty}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm font-medium">
                                {seedling.lostQty}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-24 bg-gray-200 rounded-full h-2.5">
                                  <div 
                                    className="h-2.5 rounded-full transition-all duration-500"
                                    style={{ 
                                      width: `${Math.min(100, parseFloat(survivalRate))}%`,
                                      background: `linear-gradient(90deg, ${
                                        parseFloat(survivalRate) > 70 ? '#10b981' : 
                                        parseFloat(survivalRate) > 40 ? '#f59e0b' : '#ef4444'
                                      }, ${
                                        parseFloat(survivalRate) > 70 ? '#34d399' : 
                                        parseFloat(survivalRate) > 40 ? '#fbbf24' : '#f87171'
                                      })`
                                    }}
                                  ></div>
                                </div>
                                <span className={`text-sm font-semibold min-w-[5ch] ${
                                  parseFloat(survivalRate) > 90 ? 'text-green-600' :
                                  parseFloat(survivalRate) > 70 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {survivalRate}%
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                seedling.currentQty === 0 ? 'bg-red-100 text-red-800' :
                                seedling.currentQty === seedling.plantedQty ? 'bg-green-100 text-green-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {seedling.currentQty === 0 ? 'All Dead' :
                                 seedling.currentQty === seedling.plantedQty ? 'All Alive' :
                                 'Some Lost'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Seedling Death Records Section */}
            {previewBatch.seedlingDeaths && previewBatch.seedlingDeaths.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingDown className="text-red-500" />
                  Death Records ({previewBatch.seedlingDeaths.length})
                </h4>
                
                <div className="bg-white border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Seedling</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Deaths</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Stage</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {previewBatch.seedlingDeaths.map((death, deathIndex) => (
                          <React.Fragment key={death.id}>
                            {death.seedlings.map((seedlingDeath, seedlingIndex) => {
                              const seedlingName = getSeedlingName(seedlingDeath.seedlingId);
                              const isFirstRow = seedlingIndex === 0;
                              
                              return (
                                <tr key={`${death.id}-${seedlingDeath.seedlingId}`} className="hover:bg-gray-50 transition-colors">
                                  {isFirstRow && (
                                    <td 
                                      className="px-6 py-4 align-top border-r border-gray-200"
                                      rowSpan={death.seedlings.length}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-gray-400" />
                                        <span className="font-medium text-gray-800">
                                          {new Date(death.createdAt).toLocaleDateString()}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {new Date(death.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    </td>
                                  )}
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                      <span className="font-medium text-gray-800">{seedlingName}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                                      {seedlingDeath.deathCount}
                                    </span>
                                  </td>
                                  {isFirstRow && (
                                    <td 
                                      className="px-6 py-4 align-top border-r border-gray-200"
                                      rowSpan={death.seedlings.length}
                                    >
                                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                        {previewBatch.currentStage?.name || 'Unknown'}
                                      </span>
                                    </td>
                                  )}
                                  {isFirstRow && (
                                    <td 
                                      className="px-6 py-4 align-top"
                                      rowSpan={death.seedlings.length}
                                    >
                                      {death.reason ? (
                                        <div className="max-w-xs">
                                          <p className="text-gray-700 text-sm">{death.reason}</p>
                                        </div>
                                      ) : (
                                        <span className="text-gray-400 italic text-sm">No reason provided</span>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Death Summary */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-700">Total Deaths Recorded</p>
                        <p className="text-2xl font-bold text-red-800">{totalDeathsFromRecords}</p>
                      </div>
                      <TrendingDown className="text-red-500" size={24} />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Death Records</p>
                        <p className="text-2xl font-bold text-gray-800">{previewBatch.seedlingDeaths.length}</p>
                      </div>
                      <FileText className="text-gray-500" size={24} />
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700">Mortality Rate</p>
                        <p className="text-2xl font-bold text-green-800">
                          {totalPlanted > 0 ? ((totalDeathsFromRecords / totalPlanted) * 100).toFixed(1) : '0.0'}%
                        </p>
                      </div>
                      <BarChart3 className="text-green-500" size={24} />
                    </div>
                  </div>
                </div>

                {/* Deaths by Seedling Breakdown */}
                {Object.keys(deathsBySeedling).length > 0 && (
                  <div className="mt-6">
                    <h5 className="font-medium text-gray-700 mb-3">Deaths by Seedling Type</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(deathsBySeedling).map(([seedlingId, data]) => {
                        const seedling = previewBatch.seedlings?.find(s => s.id === seedlingId);
                        const mortalityRate = seedling?.plantedQty 
                          ? (data.totalDeaths / seedling.plantedQty * 100).toFixed(1)
                          : '0.0';
                        
                        return (
                          <div key={seedlingId} className="bg-white border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <span className="font-medium text-gray-800">{data.name}</span>
                              </div>
                              <span className="text-lg font-bold text-red-600">{data.totalDeaths}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              <div className="flex justify-between">
                                <span>Mortality Rate:</span>
                                <span className="font-medium">{mortalityRate}%</span>
                              </div>
                              <div className="flex justify-between mt-1">
                                <span>Records:</span>
                                <span className="font-medium">{data.records.length}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Notes */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FileText className="text-gray-600" />
                  Notes
                </h4>
                <div className="bg-white p-4 rounded-lg border">
                  {previewBatch.notes ? (
                    <p className="text-gray-700 whitespace-pre-wrap">{previewBatch.notes}</p>
                  ) : (
                    <p className="text-gray-500 italic">No notes available for this batch</p>
                  )}
                </div>
              </div>

              {/* Tracking & Death Records */}
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Info className="text-gray-600" />
                    Records Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border text-center">
                      <div className="text-3xl font-bold text-blue-700">{previewBatch.seedlingBatchTrackers?.length || 0}</div>
                      <div className="text-sm text-gray-600 mt-1">Tracking Records</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border text-center">
                      <div className="text-3xl font-bold text-red-700">{previewBatch.seedlingDeaths?.length || 0}</div>
                      <div className="text-sm text-gray-600 mt-1">Death Records</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Last Updated Info */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Last Updated</p>
                    <p className="font-medium text-gray-800">
                      {new Date(previewBatch.updatedAt).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  Batch ID: <span className="font-mono text-xs">{previewBatch.id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="border-t p-6">
          <div className="flex justify-between items-center">
            <button
              onClick={() => handleOpenDeathModal(previewBatch)}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              disabled={previewBatch.status === 'COMPLETED' || previewBatch.status === 'FAILED'}
            >
              <FaSkull size={16} />
              Record Deaths
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setPreviewBatch(null)}
                className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border"
                type="button"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setModalProps({ isOpen: true, mode: 'edit', batch: previewBatch });
                  setPreviewBatch(null);
                }}
                className="px-4 py-2.5 bg-gray-800 text-white hover:bg-gray-900 rounded-lg transition-colors shadow-sm"
                type="button"
              >
                Edit Batch
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Seedling Batches</h2>
          <p className="text-gray-600 mt-1">Manage and track all seedling batches in your farm</p>
        </div>
        <button
          onClick={() => setModalProps({ isOpen: true, mode: 'create', batch: null })}
          className="flex items-center px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors shadow-sm"
        >
          <FaPlus className="mr-2" />
          Add New Batch
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        <CustomTable 
          columns={columns} 
          data={tableData} 
          pageSize={10}
          searchable={true}
          pagination={true}
        />
      </div>

      <AddorModifySeedlingBatch
        visible={modalProps.isOpen}
        batch={modalProps.batch}
        onCancel={() => setModalProps({ isOpen: false, mode: 'create', batch: null })}
      />

      <CustomDeleteModal
        visible={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={deleteBatch}
        title="Delete Seedling Batch"
        message={`Are you sure you want to delete batch "${modalProps.batch?.batchNumber}"? This action cannot be undone.`}
      />

      <BatchPreviewModal />
      <RecordDeathsModal />
    </div>
  );
};

export default SeedlingBatchesManagement;