import React from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { Activity, Zap, CheckCircle, Server, Variable } from 'lucide-react';

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

export default function Reports({ history }) {
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

    // Process history data for charts
    const successCount = history.filter(h => !h.error && (!h.status || (h.status >= 200 && h.status < 400))).length;
    const errorCount = history.length - successCount;

    const pieData = [
        { name: 'Success', value: successCount },
        { name: 'Error', value: errorCount }
    ];
    const COLORS = ['#22c55e', '#ef4444'];

    // Mock trend data logic mixed with real history for demo purposes
    const lineData = history.slice(0, 20).reverse().map((h, i) => ({
        name: `R-${i}`,
        time: h.time || Math.floor(Math.random() * 200) + 50,
        size: h.size || 0
    }));

    return (
        <div className="flex-1 overflow-auto bg-dark-900 p-8">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">Workspace Reports</h1>
                <p className="text-gray-400">Analytics overview for your API activities</p>
            </header>

            {/* Stats Grid - 5 Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <StatCard icon={Activity} label="Requests" value={totalRequests} color="text-blue-400" />
                <StatCard icon={Zap} label="Load Testing" value={loadTestsCount} color="text-purple-400" />
                <StatCard icon={CheckCircle} label="Functional Testing" value={functionalTestsCount} color="text-green-400" />
                <StatCard icon={Server} label="Mocked Services" value={mockedServicesCount} color="text-amber-400" />
                <StatCard icon={Variable} label="Variables" value={totalVariables} color="text-cyan-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Trend Chart */}
                <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 shadow-xl">
                    <h3 className="font-semibold text-gray-200 mb-6">Response Time Trend</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={lineData}>
                                <defs>
                                    <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ff5d2e" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#ff5d2e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
                                <XAxis dataKey="name" stroke="#575757" tick={{ fontSize: 10 }} />
                                <YAxis stroke="#575757" tick={{ fontSize: 10 }} />
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#15192b', border: '1px solid #343b5c', color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="time" stroke="#ff5d2e" fillOpacity={1} fill="url(#colorTime)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Success Pie Chart */}
                <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 shadow-xl flex flex-col items-center">
                    <h3 className="font-semibold text-gray-200 mb-6 self-start">Request Outcome Distribution</h3>
                    <div className="h-64 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip contentStyle={{ backgroundColor: '#15192b', border: '1px solid #343b5c', color: '#fff' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color }) {
    return (
        <div className="bg-dark-800 border border-dark-700 rounded-lg p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-xl font-bold text-white">{value}</p>
            </div>
        </div>
    )
}
