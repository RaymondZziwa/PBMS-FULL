import { useState } from 'react';
import { 
  FaBoxes, 
  FaChartLine, 
  FaMoneyBillWave, 
  FaImages, 
  FaChevronDown,
  FaFileAlt,
  FaUsers
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const ReportsComponent = () => {
  const [openCategories, setOpenCategories] = useState(new Set());
  const navigate = useNavigate()

  const toggleCategory = (categoryName) => {
    const newOpenCategories = new Set(openCategories);
    if (newOpenCategories.has(categoryName)) {
      newOpenCategories.delete(categoryName);
    } else {
      newOpenCategories.add(categoryName);
    }
    setOpenCategories(newOpenCategories);
  };

  const reportsData = [
    {
      name: 'Inventory Reports',
      icon: <FaBoxes className="mr-3" />,
      reports: [
        'Store Stock Level Analysis',
        'Store Stock Movement Analysis',
        'Supplier Analysis'
      ]
    },
    {
      name: 'Sales Reports',
      icon: <FaChartLine className="mr-3" />,
      reports: [
        'Daily Sales Summary',
        'Product Performance',
        'Store Sales Comparison',
        'Massage Services Report',
      ]
    },
    {
      name: 'Human Resource Reports',
      icon: <FaUsers className="mr-3" />,
      reports: [
        'Attendance Report',
        // 'Payroll Summary',
      ]
    },
    {
      name: 'Expenditure Reports',
      icon: <FaMoneyBillWave className="mr-3" />,
      reports: [
        'Expense Report',
        // 'Vendor Payment Summary',
        // 'Monthly Expense Trend',
       // 'Budget vs Actual Expense'
      ]
    },
    {
      name: 'Exhibition Reports',
      icon: <FaImages className="mr-3" />,
      reports: [
        'Exhibition Revenue Comparison',
        'Exhibition Sales Summary',
        'Exhibition Expenses Summary',
      ]
    },
    // {
    //   name: 'Projects Reports',
    //   icon: <FaTasks className="mr-3" />,
    //   reports: [
    //     'Project Status Summary',
    //     'Project Timeline',
    //     'Resource Allocation',
    //     'Budget vs Actual Cost',
    //     'Milestone Completion',
    //     'Project Risk Assessment'
    //   ]
    // },
    // {
    //   name: 'Events Reports',
    //   icon: <FaCalendarAlt className="mr-3" />,
    //   reports: [
    //     'Event Attendance',
    //     'Event Revenue',
    //     'Participant Feedback',
    //     'Event Cost Analysis',
    //     'Speaker Performance',
    //     'Event ROI Analysis'
    //   ]
    // },
    // {
    //   name: 'Budget Reports',
    //   icon: <FaChartPie className="mr-3" />,
    //   reports: [
    //     'Departmental Budget',
    //     'Budget vs Actual',
    //     'Budget Variance Analysis',
    //     'Quarterly Budget Forecast',
    //     'Capital Expenditure Budget',
    //     'Annual Budget Summary'
    //   ]
    // },
    // {
    //   name: 'Procurement Reports',
    //   icon: <FaShoppingCart className="mr-3" />,
    //   reports: [
    //     'Purchase Order Status',
    //     'Vendor Performance',
    //     'Procurement Timeline',
    //     'Spend Analysis',
    //     'Contract Compliance',
    //     'Supplier Evaluation'
    //   ]
    // }
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <p className="text-gray-600 mb-8">Browse and access all system reports by category</p>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="divide-y divide-gray-200">
            {reportsData.map((category, index) => (
              <div key={category.name} className="report-category">
                <div 
                  className="category-header flex justify-between items-center p-4 bg-gray-700 text-white cursor-pointer hover:bg-gray-800 transition-colors"
                  onClick={() => toggleCategory(category.name)}
                >
                  <div className="flex items-center">
                    {category.icon}
                    <h2 className="text-lg font-semibold">{category.name}</h2>
                  </div>
                  <FaChevronDown 
                    className={`transition-transform duration-300 ${
                      openCategories.has(category.name) ? 'rotate-180' : ''
                    }`} 
                  />
                </div>
                
                {openCategories.has(category.name) && (
                  <div className="category-content p-4 bg-gray-50">
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {category.reports.map((report, reportIndex) => (
                        <li 
                          key={reportIndex}
                          className="p-2 hover:bg-gray-200 rounded cursor-pointer transition-colors flex items-center"
                          onClick={() => {
                            const route = report.toLowerCase().replace(/ /g, '-');
                            navigate(`/reports/${route}`)
                            console.log(`Navigating to /reports/${route}`);
                          }}
                        >
                          <FaFileAlt className="mr-2 text-gray-700" />
                          {report}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-8 text-center text-gray-600">
          <p>Click on any category to view available reports</p>
        </div>
      </div>
    </div>
  );
};

export default ReportsComponent;