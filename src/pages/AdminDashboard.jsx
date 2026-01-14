import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
    LayoutDashboard,
    Package,
    Users,
    Settings,
    LogOut,
    Search,
    Bell,
    FileSpreadsheet,
    TrendingUp,
    Box,
    Layers,
    ChevronRight,
    Trash2,
    Download,
    Menu,
    X,
    Plus,
    Loader,
    FilePlus
} from 'lucide-react';
import '../index.css';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    // Data State
    const [cartons, setCartons] = useState([]);
    const [stats, setStats] = useState({ totalCartons: 0, totalPieces: 0, totalSites: 0 });
    const [viewSeason, setViewSeason] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Settings State
    const [newSeason, setNewSeason] = useState('');

    useEffect(() => {
        // Simulate initial data loading for smoother UX
        const timer = setTimeout(() => {
            const role = localStorage.getItem('role');
            if (role !== 'admin') {
                navigate('/entry');
                return;
            }

            const storedCartons = JSON.parse(localStorage.getItem('cartons') || '[]');
            setCartons(storedCartons);

            // Calculate Stats
            const totalPcs = storedCartons.reduce((sum, c) => sum + (parseInt(c.totalPieces) || 0), 0);
            const uniqueStores = new Set(storedCartons.map(c => c.storeName)).size;

            setStats({
                totalCartons: storedCartons.length,
                totalPieces: totalPcs,
                totalSites: uniqueStores
            });

            const storedSeason = localStorage.getItem('admin_season') || 'SS24';
            setViewSeason(storedSeason);
            setNewSeason(storedSeason);

            setIsLoading(false);
        }, 500);

        return () => clearTimeout(timer);

    }, [navigate]);

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            localStorage.clear();
            navigate('/');
        }
    };

    const updateSeason = () => {
        if (!newSeason.trim()) return;
        localStorage.setItem('admin_season', newSeason);
        setViewSeason(newSeason);
        alert('Season Updated Successfully');
    };

    const handleDeleteCarton = (id) => {
        if (window.confirm('Are you sure you want to delete this carton entry?')) {
            const updated = cartons.filter(c => c.id !== id);
            setCartons(updated);
            localStorage.setItem('cartons', JSON.stringify(updated));

            // Recalc stats
            const totalPcs = updated.reduce((sum, c) => sum + (parseInt(c.totalPieces) || 0), 0);
            setStats(prev => ({ ...prev, totalCartons: updated.length, totalPieces: totalPcs }));
        }
    };

    const handleCreateSheet = () => {
        const currentSheets = JSON.parse(localStorage.getItem('sheets') || '[]');
        const nextNum = currentSheets.length + 1;
        const newSheet = {
            id: `sheet_${Date.now()}`,
            name: `Sheet ${nextNum}`,
            createdAt: new Date().toISOString()
        };

        const updatedSheets = [...currentSheets, newSheet];
        localStorage.setItem('sheets', JSON.stringify(updatedSheets));
        localStorage.setItem('active_sheet_id', newSheet.id);

        alert(`New Sheet "${newSheet.name}" created! Future entries will be saved to this sheet.`);
    };

    const handleDownloadMaster = () => {
        if (cartons.length === 0) return alert('No data to export');

        const wb = XLSX.utils.book_new();
        // Sort cartons by Carton No (numeric) to ensure order makes sense
        const sortedCartons = [...cartons].sort((a, b) => (parseInt(a.cartonNo) || 0) - (parseInt(b.cartonNo) || 0));
        const totalCartons = sortedCartons.length;

        // Constants for Table Headers (match DataEntry)
        const NUMERIC_SIZES = [45, 47, 68, 74, 80, 86, 92, 98, 104, 110, 116, 122, 128, 134, 140];
        const ALPHA_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'];
        const ALL_SIZES = [...NUMERIC_SIZES, ...ALPHA_SIZES];

        sortedCartons.forEach((carton, index) => {
            // 1. Top Section (Vertical Label Format)
            const topSection = [
                ["CARTON No.", `: ${index + 1} OF ${totalCartons}`],
                ["SEASON", `: ${carton.season || ''}`],
                ["STORE NAME", `: ${carton.storeName || ''}`],
                ["COLOUR", `: ALL COLOURS`], // Hardcoded as per request
                ["STYLE", `: ${carton.uniqueStyles && carton.uniqueStyles.length === 1 ? carton.uniqueStyles[0] : 'ALL STYLES'}`],
                ["TOTAL PCS", `: ${carton.totalPieces || 0}`],
                ["NET WEIGHT", `: ${carton.netWeight || '-'} KG`],
                ["GROSS WEIGHT", `: ${carton.grossWeight || '-'} KG`],
                ["CARTON DIMENSION", `: ${carton.cartonDimension || '-'}`],
                ["MADE IN INDIA", ""],
                [] // Empty row for spacing
            ];

            // 2. Table Section (Item Details)
            const tableHeaders = ["Print", "Style", ...ALL_SIZES, "Total"];

            const tableRows = (carton.rows || []).map(row => {
                const qtyValues = ALL_SIZES.map(size => row.quantities[size] || "");
                const rowTotal = ALL_SIZES.reduce((sum, size) => sum + (parseInt(row.quantities[size]) || 0), 0);
                return [row.print, row.style, ...qtyValues, rowTotal];
            });

            // Combine all data
            const wsData = [...topSection, tableHeaders, ...tableRows];

            // Create Worksheet
            const ws = XLSX.utils.aoa_to_sheet(wsData);

            // Set Column Widths (Approximate visual layout)
            const wscols = [
                { wch: 20 }, // A: Labels / Print
                { wch: 25 }, // B: Values / Style
            ];
            // Sizes columns (Compact)
            ALL_SIZES.forEach(() => wscols.push({ wch: 4 }));
            wscols.push({ wch: 8 }); // Total Column

            ws['!cols'] = wscols;

            // Add Sheet to Workbook
            // Sheet Name: Carton_1, Carton_2, etc.
            XLSX.utils.book_append_sheet(wb, ws, `Carton_${index + 1}`);
        });

        const fileName = `Carton_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName);
    };

    const getFilteredCartons = () => {
        if (!searchTerm) return cartons;
        const term = searchTerm.toLowerCase();
        return cartons.filter(c =>
            c.cartonNo?.toLowerCase().includes(term) ||
            c.buyer?.toLowerCase().includes(term) ||
            c.storeName?.toLowerCase().includes(term)
        );
    };

    const SidebarItem = ({ id, icon: Icon, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`erp-nav-item ${activeTab === id ? 'active' : ''}`}
        >
            <Icon size={20} className="relative z-10 shrink-0" />
            {isSidebarOpen && <span className="relative z-10">{label}</span>}
        </button>
    );

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#F0F4F8]">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin text-blue-600">
                        <Loader size={40} />
                    </div>
                    <p className="text-slate-500 font-medium">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="erp-container font-sans">

            {/* SIDEBAR */}
            <aside className={`bg-[#111827] flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-[260px]' : 'w-[80px]'} shrink-0 z-50 border-r border-[#1F2937]`}>
                <div className="h-16 flex items-center px-6 border-b border-slate-800">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                        <Package size={20} className="text-white" />
                    </div>
                    {isSidebarOpen && (
                        <span className="ml-3 font-bold text-white tracking-tight text-lg">Carton<span className="text-blue-500">Admin</span></span>
                    )}
                </div>

                <div className="p-4 flex-1 flex flex-col gap-2">
                    <p className={`px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ${!isSidebarOpen && 'hidden'}`}>Main Menu</p>
                    <SidebarItem id="overview" icon={LayoutDashboard} label="Dashboard" />
                    <SidebarItem id="shipments" icon={FileSpreadsheet} label="Data Review" />

                    <div className="my-2 border-t border-slate-800"></div>

                    <p className={`px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ${!isSidebarOpen && 'hidden'}`}>Administration</p>
                    <SidebarItem id="users" icon={Users} label="User Management" />
                    <SidebarItem id="settings" icon={Settings} label="Settings" />
                </div>

                <div className="p-4 border-t border-slate-800">
                    <button onClick={handleLogout} className="erp-nav-item erp-nav-item-logout">
                        <LogOut size={20} className="shrink-0" />
                        {isSidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <div className="erp-main">

                {/* HEADER */}
                <header className="h-[70px] bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm shrink-0 z-40">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="erp-btn-icon hover:bg-slate-100 text-slate-500">
                            <Menu size={20} />
                        </button>
                        <div className="relative hidden md:block w-96">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search orders, cartons, or buyers..."
                                className="pl-10 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="relative cursor-pointer hover:bg-slate-50 p-2 rounded-full transition-colors">
                            <Bell size={20} className="text-slate-400 hover:text-slate-600" />
                            <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        </div>
                        <div className="h-8 w-px bg-slate-200"></div>
                        <div className="flex flex-col items-end hidden sm:flex">
                            <span className="text-sm font-bold text-slate-700">HEMKUMAR M</span>
                            <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Super Admin</span>
                        </div>
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 text-slate-600 font-bold shadow-sm">
                            HM
                        </div>
                    </div>
                </header>

                {/* CONTENT SCROLL AREA */}
                <main className="erp-content">

                    {/* 1. OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="flex flex-col gap-8 animate-fade-in">
                            {/* Welcome Banner */}
                            <div className="flex flex-wrap items-end justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard Overview</h2>
                                    <p className="text-slate-500 text-sm mt-1">Real-time insights and performance metrics.</p>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => navigate('/entry')} className="erp-btn erp-btn-secondary">
                                        <Plus size={16} /> New Entry
                                    </button>
                                    <button onClick={handleCreateSheet} className="erp-btn bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20">
                                        <FilePlus size={16} /> New Excel Sheet
                                    </button>
                                    <button onClick={handleDownloadMaster} className="erp-btn erp-btn-primary">
                                        <Download size={16} /> Export Master
                                    </button>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                                <div className="erp-stat-card p-6 flex items-start justify-between group hover:border-blue-300">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Cartons</p>
                                        <h3 className="text-3xl font-bold text-slate-800">{stats.totalCartons}</h3>
                                        <p className="text-xs font-medium text-emerald-500 flex items-center gap-1 mt-2">
                                            <TrendingUp size={12} /> +12% this week
                                        </p>
                                    </div>
                                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                                        <Box size={24} />
                                    </div>
                                </div>

                                <div className="erp-stat-card p-6 flex items-start justify-between group hover:border-indigo-300">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Pieces</p>
                                        <h3 className="text-3xl font-bold text-slate-800">{stats.totalPieces.toLocaleString()}</h3>
                                        <p className="text-xs font-medium text-emerald-500 flex items-center gap-1 mt-2">
                                            <TrendingUp size={12} /> +6.8% this week
                                        </p>
                                    </div>
                                    <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm">
                                        <Layers size={24} />
                                    </div>
                                </div>

                                <div className="erp-stat-card p-6 flex items-start justify-between group hover:border-emerald-300">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Active Stores</p>
                                        <h3 className="text-3xl font-bold text-slate-800">{stats.totalSites}</h3>
                                        <p className="text-xs font-medium text-slate-400 mt-2">Global Distribution</p>
                                    </div>
                                    <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-sm">
                                        <Users size={24} />
                                    </div>
                                </div>

                                <div className="erp-stat-card p-6 flex items-start justify-between group hover:border-violet-300 cursor-pointer" onClick={() => setActiveTab('settings')}>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Season</p>
                                        <h3 className="text-3xl font-bold text-slate-800">{viewSeason}</h3>
                                        <p className="text-xs font-medium text-violet-600 mt-2 hover:underline">Configure Season</p>
                                    </div>
                                    <div className="p-3 bg-violet-50 rounded-lg text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors shadow-sm">
                                        <Settings size={24} />
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity Table Preview */}
                            <div className="erp-table-container flex flex-col">
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                                    <h3 className="font-bold text-slate-700">Recent Activity</h3>
                                    <button onClick={() => setActiveTab('shipments')} className="erp-btn-link text-blue-600 font-bold flex items-center hover:underline">
                                        View All Shipments <ChevronRight size={14} />
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="erp-table">
                                        <thead>
                                            <tr>
                                                <th>Carton No</th>
                                                <th>Buyer</th>
                                                <th>Store</th>
                                                <th className="text-center">Qty</th>
                                                <th className="text-right">Date Added</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {getFilteredCartons().slice().reverse().slice(0, 5).map((c) => (
                                                <tr key={c.id}>
                                                    <td className="font-semibold text-slate-700">#{c.cartonNo}</td>
                                                    <td className="text-slate-600">{c.buyer}</td>
                                                    <td>
                                                        <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600 border border-slate-200">{c.storeName}</span>
                                                    </td>
                                                    <td className="text-center font-mono font-medium text-slate-600">{c.totalPieces}</td>
                                                    <td className="text-right text-slate-400">{new Date(c.timestamp).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                            {getFilteredCartons().length === 0 && (
                                                <tr>
                                                    <td colSpan="5">
                                                        <div className="erp-empty-state">
                                                            <Package className="erp-empty-icon" />
                                                            <h3 className="font-bold text-slate-700">No Activity Yet</h3>
                                                            <p className="text-sm">Start by creating a new carton entry.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. ALL SHIPMENTS TAB */}
                    {activeTab === 'shipments' && (
                        <div className="flex flex-col gap-6 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">Data Review</h2>
                                    <p className="text-slate-500 text-sm mt-1">Review and manage all submitted carton entries.</p>
                                </div>
                                <button onClick={handleDownloadMaster} className="erp-btn erp-btn-primary">
                                    <FileSpreadsheet size={16} /> Export Full Report
                                </button>
                            </div>

                            <div className="erp-table-container">
                                <div className="overflow-x-auto">
                                    <table className="erp-table">
                                        <thead>
                                            <tr>
                                                <th>Carton ID</th>
                                                <th>Season</th>
                                                <th>Buyer</th>
                                                <th>Store Name</th>
                                                <th className="text-center">Total Pcs</th>
                                                <th className="text-center">Net Wt</th>
                                                <th className="text-center">Gross Wt</th>
                                                <th className="text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {getFilteredCartons().slice().reverse().map((c) => (
                                                <tr key={c.id}>
                                                    <td className="font-bold text-slate-700">#{c.cartonNo}</td>
                                                    <td><span className="erp-badge erp-badge-primary">{c.season}</span></td>
                                                    <td className="font-medium">{c.buyer}</td>
                                                    <td>{c.storeName}</td>
                                                    <td className="text-center font-mono font-bold text-slate-700">{c.totalPieces}</td>
                                                    <td className="text-center text-slate-500">{c.netWeight} kg</td>
                                                    <td className="text-center text-slate-500">{c.grossWeight} kg</td>
                                                    <td className="text-right">
                                                        <button onClick={() => handleDeleteCarton(c.id)} className="erp-btn-icon danger small opacity-0 group-hover:opacity-100" title="Delete Entry">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {getFilteredCartons().length === 0 && (
                                                <tr>
                                                    <td colSpan="8">
                                                        <div className="erp-empty-state">
                                                            <Layers className="erp-empty-icon" />
                                                            <h3 className="font-bold text-slate-700">No Shipments Found</h3>
                                                            <p className="text-sm">Your shipment records will appear here.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. SETTINGS TAB */}
                    {activeTab === 'settings' && (
                        <div className="max-w-2xl mx-auto flex flex-col gap-8 animate-fade-in">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">System Settings</h2>
                                <p className="text-slate-500 text-sm mt-1">Manage global configurations.</p>
                            </div>

                            <div className="erp-card p-8">
                                <h3 className="text-lg font-bold text-slate-700 mb-6 border-b border-slate-100 pb-4">Season Configuration</h3>
                                <div className="flex flex-col gap-6">
                                    <div>
                                        <label className="erp-label">Current Active Season</label>
                                        <input
                                            type="text"
                                            value={newSeason}
                                            onChange={(e) => setNewSeason(e.target.value)}
                                            className="erp-input font-bold tracking-wide"
                                            placeholder="e.g. SS25"
                                        />
                                        <p className="text-xs text-slate-400 mt-2">This season code will start appearing on all newly created carton exports immediately.</p>
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <button onClick={updateSeason} className="erp-btn erp-btn-primary shadow-lg shadow-blue-500/20">
                                            Update Season Configuration
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. USERS TAB */}
                    {activeTab === 'users' && (
                        <div className="flex flex-col gap-6 animate-fade-in">
                            <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
                            <div className="erp-card p-12 text-center">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 border border-slate-100">
                                    <Users size={40} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-700">Access Control Restricted</h3>
                                <p className="text-slate-500 mt-2 max-w-md mx-auto">User management is currently handled via the backend configuration file. Please contact your system administrator to modify operator access privileges.</p>

                                <div className="mt-10 flex justify-center gap-6">
                                    <div className="flex items-center gap-3 px-5 py-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 shadow-sm">
                                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                        <span className="text-sm font-bold">2 Admins Active</span>
                                    </div>
                                    <div className="flex items-center gap-3 px-5 py-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 shadow-sm">
                                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></div>
                                        <span className="text-sm font-bold">4 Operators Active</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;
