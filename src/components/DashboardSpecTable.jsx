import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Building2, ChevronLeft, ChevronRight, Search, Activity, Zap, CheckCircle, Server, Variable, Columns, ChevronDown, ChevronUp, Folder, FileCode, TestTube } from 'lucide-react';
import clsx from 'clsx';

// Storage keys for reading persisted data
const STORAGE_KEYS = {
  COLLECTIONS: 'probestack_collections',
  MOCKS: 'probestack_mock_apis',
  ENV_VARS: 'probestack_env_vars',
  GLOBAL_VARS: 'probestack_global_vars',
  TEST_FILES: 'probestack_test_files',
};

const getStorageData = (key, defaultVal = []) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const calculateTotalRequests = (collections) => {
  let count = 0;
  const countRequests = (items) => {
    items?.forEach(item => {
      if (item.type === 'request') count++;
      if (item.items) countRequests(item.items);
    });
  };
  collections?.forEach(col => countRequests(col.items));
  return count;
};

const calculateTotalVariables = (envVars, globalVars) => {
  const envCount = envVars?.reduce((sum, env) => sum + (env.variables?.length || 0), 0) || 0;
  const globalCount = globalVars?.length || 0;
  return envCount + globalCount;
};

// Dummy data for the specification table - all organizations are ProbeStack
// Data is minimal: 5 specifications total, 2-3 test cases per specification
const dummySpecificationData = [
  {
    id: 1,
    organization: 'ProbeStack',
    projectName: 'API Testing Platform',
    appId: 'APP-PROBE-001',
    specificationName: 'User Management API',
    version: '2.1.0',
    testCases: 3,
    collectionDetails: 'User Collection v3',
    requestStatus: 'success',
  },
  {
    id: 2,
    organization: 'ProbeStack',
    projectName: 'E-commerce Backend',
    appId: 'APP-ACME-102',
    specificationName: 'Order Processing API',
    version: '1.5.2',
    testCases: 2,
    collectionDetails: 'Orders Collection v2',
    requestStatus: 'success',
  },
  {
    id: 3,
    organization: 'ProbeStack',
    projectName: 'Cloud Services',
    appId: 'APP-TG-893',
    specificationName: 'Storage Management API',
    version: '3.0.1',
    testCases: 3,
    collectionDetails: 'Storage Collection v1',
    requestStatus: 'failure',
  },
  {
    id: 4,
    organization: 'ProbeStack',
    projectName: 'Payment Gateway',
    appId: 'APP-SU-445',
    specificationName: 'Payment Processing API',
    version: '1.0.0',
    testCases: 2,
    collectionDetails: 'Payments Collection v1',
    requestStatus: 'success',
  },
  {
    id: 5,
    organization: 'ProbeStack',
    projectName: 'Banking Integration',
    appId: 'APP-FH-221',
    specificationName: 'Account Management API',
    version: '2.3.4',
    testCases: 3,
    collectionDetails: 'Banking Collection v4',
    requestStatus: 'success',
  },
];

// Helper function to get organization color - single color for ProbeStack
const getOrgColor = () => {
  return 'bg-primary/20 text-primary';
};

export default function DashboardSpecTable() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Column visibility state
  const [columnVisibilityOpen, setColumnVisibilityOpen] = useState(false);
  const columnVisibilityRef = useRef(null);
  const [visibleColumns, setVisibleColumns] = useState({
    organization: true,
    projectName: true,
    appId: true,
    specificationName: true,
    version: true,
    testCases: true,
    collectionDetails: true,
    requestStatus: true,
  });

  // Column definitions
  const columnDefinitions = [
    { key: 'organization', label: 'Organization' },
    { key: 'projectName', label: 'Project Name' },
    { key: 'appId', label: 'App ID' },
    { key: 'specificationName', label: 'Specification Name' },
    { key: 'version', label: 'Version' },
    { key: 'testCases', label: 'Test Cases' },
    { key: 'collectionDetails', label: 'Collection Details' },
    { key: 'requestStatus', label: 'Request Status' },
  ];

  // Close column visibility dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (columnVisibilityRef.current && !columnVisibilityRef.current.contains(event.target)) {
        setColumnVisibilityOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if all columns are visible
  const allColumnsVisible = Object.values(visibleColumns).every(v => v);

  // Check if any column is visible
  const anyColumnVisible = Object.values(visibleColumns).some(v => v);

  // Toggle all columns
  const toggleAllColumns = (checked) => {
    const newVisibility = {};
    Object.keys(visibleColumns).forEach(key => {
      newVisibility[key] = checked;
    });
    setVisibleColumns(newVisibility);
  };

  // Toggle individual column
  const toggleColumn = (columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  // Read persisted data from localStorage
  const collections = getStorageData(STORAGE_KEYS.COLLECTIONS);
  const mockApis = getStorageData(STORAGE_KEYS.MOCKS);
  const envVars = getStorageData(STORAGE_KEYS.ENV_VARS);
  const globalVars = getStorageData(STORAGE_KEYS.GLOBAL_VARS);
  const testFiles = getStorageData(STORAGE_KEYS.TEST_FILES);

  // Calculate metrics for the 5 cards
  const totalRequests = calculateTotalRequests(collections);
  const mockedServicesCount = mockApis.length;
  const totalVariables = calculateTotalVariables(envVars, globalVars);
  const loadTestsCount = testFiles.length;
  const functionalTestsCount = collections.filter(c => c.items?.some(i => i.type === 'request')).length;
  
  // Calculate total test cases from dummySpecificationData
  const totalTestCases = dummySpecificationData.reduce((sum, spec) => sum + spec.testCases, 0);

  // Metrics data with real values - 8 cards in 2 rows of 4
  const metricsData = [
    {
      label: 'Specifications',
      value: dummySpecificationData.length.toString(),
      change: `total specifications`,
      trend: 'up',
      icon: Activity,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      label: 'Collections',
      value: collections.length.toString(),
      change: 'total collections',
      trend: 'up',
      icon: Folder,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-400/10',
    },
    {
      label: 'Requests',
      value: totalRequests.toString(),
      change: 'total requests',
      trend: 'up',
      icon: FileCode,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-400/10',
    },
    {
      label: 'Test Cases',
      value: totalTestCases.toString(),
      change: 'total test cases',
      trend: 'up',
      icon: TestTube,
      color: 'text-pink-400',
      bgColor: 'bg-pink-400/10',
    },
    {
      label: 'Load Testing',
      value: loadTestsCount.toString(),
      change: 'test files',
      trend: 'up',
      icon: Zap,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
    },
    {
      label: 'Functional Testing',
      value: functionalTestsCount.toString(),
      change: 'collections',
      trend: 'up',
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
    },
    {
      label: 'Mocked Services',
      value: mockedServicesCount.toString(),
      change: 'active mocks',
      trend: 'up',
      icon: Server,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10',
    },
    {
      label: 'Variables',
      value: totalVariables.toString(),
      change: 'configured',
      trend: 'up',
      icon: Variable,
      color: 'text-teal-400',
      bgColor: 'bg-teal-400/10',
    },
  ];

  const [expandedRow, setExpandedRow] = useState(null);

  // Toggle row expansion
  const handleRowClick = (itemId) => {
    setExpandedRow(expandedRow === itemId ? null : itemId);
  };

  // Generate dummy test cases based on row status
  const generateTestCases = (rowData) => {
    const { testCases, requestStatus, specificationName } = rowData;
    const testCasesList = [];
    
    for (let i = 1; i <= testCases; i++) {
      let status;
      if (requestStatus === 'success') {
        status = 'success';
      } else {
        // Randomly mix success and failure for failed rows
        status = Math.random() > 0.5 ? 'success' : 'failure';
      }
      
      testCasesList.push({
        id: `tc-${i}`,
        name: `${specificationName} - Test Case ${i}`,
        status: status,
      });
    }
    
    return testCasesList;
  };

  // Filter data based on search
  const filteredData = useMemo(() => {
    return dummySpecificationData.filter((item) =>
      item.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.specificationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.appId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-probestack-bg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-700 bg-dark-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">ProbeStack Dashboard</h2>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search specifications..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-dark-900/60 border border-dark-700 rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable Area with Metrics + Table */}
      <div className="flex-1 overflow-auto p-6">
        {/* Metrics Section */}
        <div className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metricsData.map((metric, index) => (
              <div
                key={index}
                className="bg-dark-800/50 border border-dark-700 rounded-xl p-4 hover:border-primary/30 transition-all duration-300"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                      {metric.label}
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">
                      {metric.value}
                    </div>
                    <div className="text-xs font-medium text-green-400">
                      {metric.change}
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg ${metric.bgColor} ${metric.color}`}>
                    <metric.icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Manage Columns Dropdown */}
        <div className="mb-4 relative" ref={columnVisibilityRef}>
          <button
            onClick={() => setColumnVisibilityOpen(!columnVisibilityOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dark-700 bg-dark-800/50 text-white hover:border-primary/50 focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-all outline-none cursor-pointer"
          >
            <Columns className="h-4 w-4" />
            <span className="text-sm font-medium">Manage Columns</span>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${columnVisibilityOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {columnVisibilityOpen && (
            <div className="absolute left-0 mt-2 w-72 rounded-lg border border-dark-700 bg-dark-800/95 backdrop-blur-xl shadow-lg overflow-hidden z-30 max-h-96 overflow-y-auto">
              <div className="py-2">
                {/* Select All Checkbox */}
                <div className="px-4 py-2.5 border-b border-dark-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allColumnsVisible}
                      onChange={(e) => toggleAllColumns(e.target.checked)}
                      className="cursor-pointer w-4 h-4 rounded border-gray-600 text-primary focus:ring-primary focus:ring-offset-0"
                    />
                    <span className="text-xl font-extrabold gradient-text font-heading whitespace-nowrap">ProbeStack</span>
                  </label>
                </div>
                
                {/* Individual Column Checkboxes */}
                {columnDefinitions.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors cursor-pointer hover:bg-dark-700/50"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[col.key]}
                      onChange={() => toggleColumn(col.key)}
                      className="cursor-pointer w-4 h-4 rounded border-gray-600 text-primary focus:ring-primary focus:ring-offset-0"
                    />
                    <span className="text-gray-300">{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Table Container */}
        {anyColumnVisible ? (
          <div className="bg-[#161B30] border border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-slate-800/50 border-b border-slate-700">
                    {visibleColumns.organization && (
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                        Organization
                      </th>
                    )}
                    {visibleColumns.projectName && (
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                        Project Name
                      </th>
                    )}
                    {visibleColumns.appId && (
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                        App ID
                      </th>
                    )}
                    {visibleColumns.specificationName && (
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                        Specification Name
                      </th>
                    )}
                    {visibleColumns.version && (
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                        Version
                      </th>
                    )}
                    {visibleColumns.testCases && (
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                        Test Cases
                      </th>
                    )}
                    {visibleColumns.collectionDetails && (
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                        Collection Details
                      </th>
                    )}
                    {visibleColumns.requestStatus && (
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                        Request Status
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {paginatedData.length > 0 ? (
                    paginatedData.map((item) => {
                      const isExpanded = expandedRow === item.id;
                      const testCasesList = generateTestCases(item);
                      
                      return (
                        <React.Fragment key={item.id}>
                          <tr 
                            onClick={() => handleRowClick(item.id)}
                            className={clsx(
                              "group transition-colors cursor-pointer",
                              isExpanded ? "bg-slate-800/50" : "hover:bg-slate-800/30"
                            )}
                          >
                            {visibleColumns.organization && (
                              <td className="px-8 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className={`w-6 h-6 rounded flex items-center justify-center ${getOrgColor()}`}>
                                    <Building2 className="h-3 w-3" />
                                  </div>
                                  <span className="font-medium text-white">{item.organization}</span>
                                </div>
                              </td>
                            )}
                            {visibleColumns.projectName && (
                              <td className="px-8 py-4 font-medium text-slate-200 whitespace-nowrap">
                                {item.projectName}
                              </td>
                            )}
                            {visibleColumns.appId && (
                              <td className="px-8 py-4 font-mono text-xs text-slate-400 uppercase tracking-tighter whitespace-nowrap">
                                {item.appId}
                              </td>
                            )}
                            {visibleColumns.specificationName && (
                              <td className="px-8 py-4 whitespace-nowrap">
                                <span className="font-medium text-slate-200">{item.specificationName}</span>
                              </td>
                            )}
                            {visibleColumns.version && (
                              <td className="px-8 py-4 whitespace-nowrap">
                                <span className="text-xs px-2 py-1 bg-slate-800 rounded font-mono text-slate-300">
                                  {item.version}
                                </span>
                              </td>
                            )}
                            {visibleColumns.testCases && (
                              <td className="px-8 py-4 whitespace-nowrap">
                                <span className="text-sm text-slate-300">{item.testCases}</span>
                              </td>
                            )}
                            {visibleColumns.collectionDetails && (
                              <td className="px-8 py-4 whitespace-nowrap">
                                <span className="text-sm text-slate-300">{item.collectionDetails}</span>
                              </td>
                            )}
                            {visibleColumns.requestStatus && (
                              <td className="px-8 py-4 whitespace-nowrap">
                                <span
                                  className={clsx(
                                    'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border',
                                    item.requestStatus === 'success'
                                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                      : 'bg-red-500/20 text-red-400 border-red-500/30'
                                  )}
                                >
                                  {item.requestStatus === 'success' ? 'Success' : 'Failure'}
                                </span>
                              </td>
                            )}
                          </tr>
                          
                          {/* Expanded Row with Test Cases */}
                          {isExpanded && (
                            <tr className="bg-slate-800/30">
                              <td 
                                colSpan={Object.values(visibleColumns).filter(v => v).length} 
                                className="px-8 py-4"
                              >
                                <div className="space-y-3">
                                  {/* Header with Collapse Button */}
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-slate-200">
                                      Test Cases ({item.testCases})
                                    </h4>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedRow(null);
                                      }}
                                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
                                    >
                                      <ChevronUp className="w-4 h-4" />
                                      Collapse
                                    </button>
                                  </div>
                                  
                                  {/* Test Cases List */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {testCasesList.map((tc) => (
                                      <div
                                        key={tc.id}
                                        className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
                                      >
                                        <span
                                          className={clsx(
                                            'w-2 h-2 rounded-full',
                                            tc.status === 'success' ? 'bg-green-400' : 'bg-red-400'
                                          )}
                                        />
                                        <span className="text-xs text-slate-300 truncate flex-1">
                                          {tc.name}
                                        </span>
                                        <span
                                          className={clsx(
                                            'text-[10px] px-1.5 py-0.5 rounded font-medium',
                                            tc.status === 'success'
                                              ? 'bg-green-500/20 text-green-400'
                                              : 'bg-red-500/20 text-red-400'
                                          )}
                                        >
                                          {tc.status === 'success' ? 'Pass' : 'Fail'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={Object.values(visibleColumns).filter(v => v).length} className="px-6 py-12 text-center text-slate-400">
                        {searchQuery ? 'No specifications found matching your search' : 'No specification records found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          {/* Pagination Footer */}
          <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Showing{' '}
                <span className="font-semibold text-slate-200">
                  {paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredData.length)}
                </span>{' '}
                of {filteredData.length} results
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-[#161B30] border border-slate-700 rounded hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={clsx(
                        'w-8 h-8 flex items-center justify-center text-sm font-medium rounded transition-colors',
                        currentPage === i + 1
                          ? 'bg-[#F97316] text-white'
                          : 'text-slate-300 hover:bg-slate-800'
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-3 py-1 text-sm bg-[#161B30] border border-slate-700 rounded hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
        ) : (
          <div className="bg-[#161B30] border border-slate-800 rounded-xl shadow-sm overflow-hidden p-12 text-center">
            <p className="text-slate-400">No columns selected. Please select at least one column to display the table.</p>
          </div>
        )}
      </div>
    </div>
  );
}
