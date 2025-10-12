// components/ReportHeader.tsx
import React from 'react';
import { Building2, Globe, Mail, Phone, MapPin } from 'lucide-react';
import { baseURL } from '../../libs/apiConfig';

interface CompanyInfo {
  id: string;
  name: string;
  email: string;
  tel1: string;
  tel2: string;
  address: string;
  logo: string;
  website: string;
  tinNumber: string;
  description: string;
  foundedYear: number;
  industry: string;
  employees: string;
}

interface ReportHeaderProps {
  companyInfo: CompanyInfo;
  reportName: string;
  storeName?: string;
  generatedDate?: Date;
}

const ReportHeader: React.FC<ReportHeaderProps> = ({ 
  companyInfo, 
  reportName, 
  storeName,
  generatedDate = new Date() 
}) => {
  return (
    <div className="bg-white border-b border-gray-200 pb-6 mb-6">
      {/* Company Header */}
      <div className="flex justify-between items-start mb-6">
        {/* Logo Section */}
        <div className="flex items-center">
          {companyInfo.logo ? (
            <img 
              src={`${baseURL}${companyInfo.logo}`}
              alt={companyInfo.name}
              className="h-24 w-24 object-contain"
            />
          ) : (
            <div className="h-32 w-32 bg-teal-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          )}
          <div className="ml-4">
            <h1 className="text-2xl font-bold text-gray-800">{companyInfo.name}</h1>
            <p className="text-gray-600 text-sm">{companyInfo.description}</p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="text-right text-sm text-gray-700">
          <div className="flex items-center justify-end mb-1">
            <Globe className="w-4 h-4 mr-2" />
            <a href={`https://${companyInfo.website}`} className="hover:text-teal-600">
              {companyInfo.website}
            </a>
          </div>
          <div className="flex items-center justify-end mb-1">
            <Mail className="w-4 h-4 mr-2" />
            <a href={`mailto:${companyInfo.email}`} className="hover:text-teal-600">
              {companyInfo.email}
            </a>
          </div>
          <div className="flex items-center justify-end mb-1">
            <Phone className="w-4 h-4 mr-2" />
            <span>{companyInfo.tel1}</span>
            {companyInfo.tel2 && <span className="ml-2">| {companyInfo.tel2}</span>}
          </div>
          <div className="flex items-center justify-end">
            <MapPin className="w-4 h-4 mr-2" />
            <span>{companyInfo.address}</span>
          </div>
        </div>
      </div>

      {/* Report Title Section */}
      <div className="text-center border-t border-gray-200 pt-4">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">{reportName}</h2>
        <div className="flex justify-center items-center space-x-6 text-sm text-gray-600">
          {storeName && (
            <div>
              <span className="font-semibold">Store:</span> {storeName}
            </div>
          )}
          <div>
            <span className="font-semibold">Generated:</span> {generatedDate.toLocaleDateString()} at {generatedDate.toLocaleTimeString()}
          </div>
          <div>
            <span className="font-semibold">TIN:</span> {companyInfo.tinNumber}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportHeader;