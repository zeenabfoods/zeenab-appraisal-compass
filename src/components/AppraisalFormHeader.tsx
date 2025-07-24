
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DeleteAppraisalButton } from './DeleteAppraisalButton';
import { useNavigate } from 'react-router-dom';

interface AppraisalFormHeaderProps {
  appraisalId: string;
  employeeName: string;
  cycleName: string;
  status: string;
}

export function AppraisalFormHeader({ appraisalId, employeeName, cycleName, status }: AppraisalFormHeaderProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const handleDeleteSuccess = () => {
    navigate('/hr-appraisals');
  };

  const canDelete = profile?.role === 'hr' || profile?.role === 'admin';

  return (
    <div className="flex justify-between items-start mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{employeeName}'s Appraisal</h1>
        <p className="text-gray-600 mt-1">{cycleName}</p>
        <div className="flex items-center space-x-2 mt-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            status === 'draft' ? 'bg-gray-100 text-gray-800' :
            status === 'submitted' ? 'bg-blue-100 text-blue-800' :
            status === 'manager_review' ? 'bg-yellow-100 text-yellow-800' :
            status === 'committee_review' ? 'bg-purple-100 text-purple-800' :
            'bg-green-100 text-green-800'
          }`}>
            {status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>
      
      {canDelete && (
        <DeleteAppraisalButton
          appraisalId={appraisalId}
          employeeName={employeeName}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
