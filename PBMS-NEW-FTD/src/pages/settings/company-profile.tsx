import React, { useEffect, useState } from 'react';
import { FaUpload, FaEdit, FaPhone, FaPlus, FaTimes, FaSave } from 'react-icons/fa';
import CustomTextArea from '../../custom/inputs/customTextArea';
import CustomTextInput from '../../custom/inputs/customTextInput';
import CustomNumberInput from '../../custom/inputs/customNumberInput';
import { baseURL } from '../../libs/apiConfig';
import axios from 'axios';
import { toast } from 'sonner';

interface CompanyProfileType {
  id: string;
  logo: File | string | null;
  name: string;
  email: string;
  website: string;
  tel1: string;
  tel2: string;
  phoneNumbers: string[];
  address: string;
  tinNumber: string;
  description: string;
  foundedYear: number;
  industry: string;
  workHours: number;
  employees: string;
}

const CompanyProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<CompanyProfileType>({
    id: '',
    logo: null,
    name: 'Company Name',
    email: 'contact@company.com',
    website: 'www.company.com',
    tel1: '07 (555) 123-4567',
    tel2: '07 (555) 987-6543',
    phoneNumbers: ['07 (555) 123-4567', '07 (555) 987-6543'],
    address: '123 Business Street, City, State 12345',
    tinNumber: '12-3456789',
    description: 'We provide excellent products and services to our customers.',
    foundedYear: 2010,
    workHours: 10,
    industry: 'Technology',
    employees: '50-100',
  });

  const [newPhoneNumber, setNewPhoneNumber] = useState('');

  // Sync tel1 and tel2 with phoneNumbers array
  const syncTelWithArray = (numbers: string[]) => {
    return {
      tel1: numbers[0] || '07 (555) 123-4567',
      tel2: numbers[1] || '07 (555) 987-6543',
      phoneNumbers: numbers,
    };
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${baseURL}/api/company/profile`);
        if (response.data) {
          const data = response.data;
          setProfile({
            id: data.id,
            logo: data.logo || null,
            name: data.name || 'Company Name',
            email: data.email || 'contact@company.com',
            website: data.website || 'www.company.com',
            tel1: data.tel1 || '07 (555) 123-4567',
            tel2: data.tel2 || '07 (555) 987-6543',
            phoneNumbers: [
              data.tel1 || '07 (555) 123-4567',
              data.tel2 || '07 (555) 987-6543'
            ],
            address: data.address || '123 Business Street, City, State 12345',
            tinNumber: data.tinNumber || '12-3456789',
            description: data.description || '',
            foundedYear: data.foundedYear || 2010,
            workHours: data.workHours || 10,
            industry: data.industry || '',
            employees: data.employees || '',
          });
        }
      } catch (error: any) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load company profile. Using default info.');
      }
    };
    

    fetchProfile();
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setProfile(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePhoneNumberChange = (index: number, value: string) => {
    const updatedNumbers = [...profile.phoneNumbers];
    updatedNumbers[index] = value;
    setProfile(prev => ({
      ...prev,
      ...syncTelWithArray(updatedNumbers),
    }));
  };

  const addPhoneNumber = () => {
    if (newPhoneNumber.trim()) {
      const updatedNumbers = [...profile.phoneNumbers, newPhoneNumber];
      setProfile(prev => ({
        ...prev,
        ...syncTelWithArray(updatedNumbers),
      }));
      setNewPhoneNumber('');
    }
  };

  const removePhoneNumber = (index: number) => {
    const updatedNumbers = profile.phoneNumbers.filter((_, i) => i !== index);
    setProfile(prev => ({
      ...prev,
      ...syncTelWithArray(updatedNumbers),
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfile(prev => ({
        ...prev,
        logo: file,
      }));
    }
  };

  const handleSave = async () => {
    try {
      const formData = new FormData();
      if (profile.logo instanceof File) formData.append('logo', profile.logo);
      formData.append('name', profile.name);
      formData.append('email', profile.email);
      formData.append('website', profile.website);
      formData.append('address', profile.address);
      formData.append('tinNumber', profile.tinNumber);
      formData.append('description', profile.description);
      formData.append('foundedYear', profile.foundedYear.toString());
      formData.append('industry', profile.industry);
      formData.append('workHours', profile.workHours.toString());
      formData.append('employees', profile.employees);
      profile.phoneNumbers.forEach((num, idx) => formData.append(`phoneNumbers[${idx}]`, num));

      await axios.patch(`${baseURL}/api/company/modify/${profile.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Profile saved successfully');
      setIsEditing(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const handleCancel = () => setIsEditing(false);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-md">
      {/* Header Buttons */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Company Profile</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <FaEdit className="mr-2" /> Edit Profile
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <FaSave className="mr-2" /> Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Profile Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Logo Section */}
        <div className="md:col-span-1 flex flex-col items-center">
          <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden mb-4">
            {profile.logo ? (
              <img
                src={
                  profile.logo instanceof File
                    ? URL.createObjectURL(profile.logo)
                    : `${baseURL}${profile.logo}`
                }
                alt="Company Logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-400">No Logo</span>
            )}
          </div>
          {isEditing && (
            <label className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
              <FaUpload className="mr-2" /> Upload Logo
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
          )}
        </div>

        {/* Profile Details */}
        <div className="md:col-span-2 space-y-4">
          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            {isEditing ? (
              <CustomTextInput value={profile.name} onChange={val => handleInputChange('name', val)} />
            ) : (
              <p className="text-lg font-semibold text-gray-800">{profile.name}</p>
            )}
          </div>

          {/* Email & Website */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              {isEditing ? (
                <CustomTextInput type="email" value={profile.email} onChange={val => handleInputChange('email', val)} />
              ) : (
                <p className="text-gray-800">{profile.email}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              {isEditing ? (
                <CustomTextInput type="url" value={profile.website} onChange={val => handleInputChange('website', val)} />
              ) : (
                <p className="text-gray-600 hover:underline">{profile.website}</p>
              )}
            </div>
          </div>

          {/* Phone Numbers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <FaPhone className="mr-2" /> Phone Numbers
            </label>
            <div className="space-y-2">
              <div className="flex items-center">
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.tel1}
                    onChange={e => handlePhoneNumberChange(0, e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-800">{profile.tel1}</p>
                )}
              </div>
              <div className="flex items-center">
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.tel2}
                    onChange={e => handlePhoneNumberChange(1, e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-800">{profile.tel2}</p>
                )}
              </div>

              {/* Additional Numbers */}
              {profile.phoneNumbers.slice(2).map((num, idx) => (
                <div key={idx + 2} className="flex items-center">
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={num}
                        onChange={e => handlePhoneNumberChange(idx + 2, e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                      <button onClick={() => removePhoneNumber(idx + 2)} className="ml-2 text-red-500">
                        <FaTimes />
                      </button>
                    </>
                  ) : (
                    <p className="text-gray-800">{num}</p>
                  )}
                </div>
              ))}

              {isEditing && (
                <div className="flex items-center">
                  <input
                    value={newPhoneNumber}
                    onChange={e => setNewPhoneNumber(e.target.value)}
                    placeholder="Add new phone number"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                  <button onClick={addPhoneNumber} className="ml-2 p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
                    <FaPlus />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            {isEditing ? (
              <CustomTextArea value={profile.address} onChange={val => handleInputChange('address', val)} rows={2} />
            ) : (
              <p className="text-gray-800">{profile.address}</p>
            )}
          </div>

          {/* TIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">TIN Number</label>
            {isEditing ? (
              <CustomTextInput value={profile.tinNumber} onChange={val => handleInputChange('tinNumber', val)} />
            ) : (
              <p className="text-gray-800">{profile.tinNumber}</p>
            )}
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Founded Year</label>
              {isEditing ? (
                <CustomNumberInput value={profile.foundedYear} onChange={val => handleInputChange('foundedYear', val)} />
              ) : (
                <p className="text-gray-800">{profile.foundedYear}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              {isEditing ? (
                <CustomTextInput value={profile.industry} onChange={val => handleInputChange('industry', val)} />
              ) : (
                <p className="text-gray-800">{profile.industry}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employees</label>
              {isEditing ? (
                <CustomTextInput value={profile.employees} onChange={val => handleInputChange('employees', val)} />
              ) : (
                <p className="text-gray-800">{profile.employees}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Hours</label>
              {isEditing ? (
                <CustomNumberInput value={profile.workHours} onChange={val => handleInputChange('workHours', val)} />
              ) : (
                <p className="text-gray-800">{profile.workHours} hrs/day</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            {isEditing ? (
              <CustomTextArea value={profile.description} onChange={val => handleInputChange('description', val)} rows={3} />
            ) : (
              <p className="text-gray-800">{profile.description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfile;
