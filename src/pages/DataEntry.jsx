import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LogOut,
    RotateCcw,
    Plus,
    Package,
    ShieldCheck,
    ChevronDown,
    CheckCircle,
    AlertTriangle,
    FileSpreadsheet,
    Layers,
    Trash2,
    Calendar,
    Box,
    Scale,
    User,
    Loader
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import '../index.css';

// --- Constants ---
const NUMERIC_SIZES = [45, 47, 68, 74, 80, 86, 92, 98, 104, 110, 116, 122, 128, 134, 140];
const ALPHA_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'];
const ALL_SIZES = [...NUMERIC_SIZES, ...ALPHA_SIZES];

const BUYERS = ['DUNS', 'MORE THAN A FLINGS'];

const DataEntry = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Header Data
    const [buyer, setBuyer] = useState('');
    const [storeName, setStoreName] = useState('');

    // Row Data
    const [committedRows, setCommittedRows] = useState([]);
    const [currentRow, setCurrentRow] = useState({
        print: '',
        style: '',
        quantities: ALL_SIZES.reduce((acc, size) => ({ ...acc, [size]: '' }), {}),

    });

    // Inline Editing State
    const [editingRowId, setEditingRowId] = useState(null);
    const [editValues, setEditValues] = useState({
        print: '',
        style: '',
        quantities: {}
    });

    // Footer / Details
    const [cartonNo, setCartonNo] = useState('');
    const [netWeight, setNetWeight] = useState('');
    const [grossWeight, setGrossWeight] = useState('');
    const [cartonDimension, setCartonDimension] = useState('');

    // Global
    const [season, setSeason] = useState('SS24');
    const [notification, setNotification] = useState(null);
    const [activeSheetName, setActiveSheetName] = useState('Default Sheet');

    // Refs
    const printInputRef = useRef(null);
    const editInputRef = useRef(null);

    useEffect(() => {
        const user = localStorage.getItem('user');
        const role = localStorage.getItem('role');
        if (!user) { navigate('/'); return; }
        setCurrentUser(user);
        setIsAdmin(role === 'admin');
        const storedSeason = localStorage.getItem('admin_season');
        if (storedSeason) setSeason(storedSeason);

        // Load Active Sheet
        const sId = localStorage.getItem('active_sheet_id');
        const sheets = JSON.parse(localStorage.getItem('sheets') || '[]');
        const active = sheets.find(s => s.id === sId);
        if (active) setActiveSheetName(active.name);
    }, [navigate]);

    // Auto-focus edit input
    useEffect(() => {
        if (editingRowId && editInputRef.current) {
            editInputRef.current.focus();
        }
    }, [editingRowId]);

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            localStorage.clear();
            navigate('/');
        }
    };

    const showNotification = (msg, type = 'success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const calculateRowTotal = (rowQty) => {
        return Object.values(rowQty).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    };

    const calculateGrandTotal = () => {
        return committedRows.reduce((sum, row) => sum + calculateRowTotal(row.quantities), 0);
    };

    const handleCurrentRowQtyChange = (size, val) => {
        if (val === '' || /^\d+$/.test(val)) {
            setCurrentRow(prev => ({
                ...prev,
                quantities: { ...prev.quantities, [size]: val }
            }));
        }
    };

    const handleSaveRow = () => {
        if (!currentRow.print.trim() || !currentRow.style.trim()) {
            showNotification('Print and Style are required', 'error');
            return;
        }
        const qty = calculateRowTotal(currentRow.quantities);
        if (qty === 0) {
            showNotification('Enter quantity for at least one size', 'error');
            return;
        }

        setCommittedRows([...committedRows, { ...currentRow, id: Date.now() }]);

        // Reset Logic
        setCurrentRow({
            print: '',
            style: '',
            quantities: ALL_SIZES.reduce((acc, size) => ({ ...acc, [size]: '' }), {}),
            netWeight: '',
            grossWeight: ''
        });

        setTimeout(() => printInputRef.current?.focus(), 50);
    };

    const handleDeleteRow = (index) => {
        if (window.confirm('Delete this row?')) {
            const newRows = [...committedRows];
            newRows.splice(index, 1);
            setCommittedRows(newRows);
        }
    };

    // --- Inline Edit Handlers ---
    const startEditing = (row) => {
        setEditingRowId(row.id);
        setEditValues({
            print: row.print,
            style: row.style,
            quantities: { ...row.quantities }
        });
    };

    const cancelEditing = () => {
        setEditingRowId(null);
        setEditValues({
            print: '',
            style: '',
            quantities: {}
        });
    };

    const saveEditing = () => {
        setCommittedRows(prevRows => prevRows.map(row => {
            if (row.id === editingRowId) {
                return {
                    ...row,
                    print: editValues.print,
                    style: editValues.style,
                    quantities: editValues.quantities
                };
            }
            return row;
        }));
        cancelEditing();
        showNotification('Row Updated successfully');
    };

    const handleSaveEntry = () => {
        if (!buyer) return showNotification('Select Buyer', 'error');
        if (!storeName.trim()) return showNotification('Enter Store Name', 'error');
        if (committedRows.length === 0) return showNotification('No rows to save', 'error');
        if (!cartonNo) return showNotification('Enter Carton No', 'error');
        if (!netWeight) return showNotification('Enter Net Weight', 'error');
        if (!grossWeight) return showNotification('Enter Gross Weight', 'error');

        setIsSaving(true);
        try {
            const uniquePrints = [...new Set(committedRows.map(r => r.print.trim()))];
            const uniqueStyles = [...new Set(committedRows.map(r => r.style.trim()))];
            const currentSheetId = localStorage.getItem('active_sheet_id'); // Get latest

            const existingCartons = JSON.parse(localStorage.getItem('cartons') || '[]');

            const newCarton = {
                id: Date.now(),
                cartonNo, buyer, storeName: storeName.trim(), rows: committedRows,
                totalPieces: calculateGrandTotal(), netWeight, grossWeight, cartonDimension, season,
                timestamp: new Date().toISOString(), uniquePrints, uniqueStyles,
                sheetId: currentSheetId
            };

            const updatedCartons = [...existingCartons, newCarton];
            localStorage.setItem('cartons', JSON.stringify(updatedCartons));

            showNotification(`Carton #${cartonNo} Saved to ${activeSheetName}`, 'success');

            // Auto-Reset for next entry
            setCommittedRows([]);
            setCurrentRow({
                print: '', style: '',
                quantities: ALL_SIZES.reduce((acc, size) => ({ ...acc, [size]: '' }), {}),
            });
            setCartonNo(prev => prev ? (parseInt(prev) + 1).toString() : '');
            setNetWeight('');
            setGrossWeight('');
            setCartonDimension('');

        } catch (err) {
            console.error(err);
            showNotification('Save failed', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        if (window.confirm('Reset all fields? Unsaved data will be lost.')) {
            setBuyer(''); setStoreName(''); setCommittedRows([]);
            setCurrentRow({
                print: '', style: '',
                quantities: ALL_SIZES.reduce((acc, size) => ({ ...acc, [size]: '' }), {}),
            });
            setCartonNo(''); setNetWeight(''); setGrossWeight(''); setCartonDimension('');
        }
    };

    return (
        <div className="erp-container font-sans">
            <div className="erp-main">

                {/* --- HEADER --- */}
                <header className="h-[70px] bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm shrink-0 z-40">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                            <Package size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-none">Carton<span className="text-blue-600">Entry</span></h1>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active: {activeSheetName}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {isAdmin && (
                            <button onClick={() => navigate('/admin')} className="hidden sm:flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all border border-transparent hover:border-blue-100">
                                <ShieldCheck size={16} /> Admin Panel
                            </button>
                        )}

                        <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex flex-col items-end">
                                <span className="text-sm font-bold text-slate-700">{currentUser?.split('@')[0]}</span>
                                <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 rounded-full border border-emerald-100">{isAdmin ? 'Administrator' : 'Operator'}</span>
                            </div>
                            <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 text-slate-500 font-bold shadow-sm">
                                <User size={18} />
                            </div>
                        </div>

                        <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-md transition-all" title="Logout">
                            <LogOut size={20} />
                        </button>
                    </div>
                </header>

                {/* --- MAIN CONTENT --- */}
                <main className="erp-content flex flex-col gap-6 p-6">

                    {/* 1. Shipment Details Card */}
                    <div className="erp-card p-5 shrink-0 bg-white">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Layers size={14} className="text-blue-500" /> Shipment Details
                            </h3>
                            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                <Calendar size={12} className="text-blue-500" />
                                <span className="text-xs font-bold text-blue-700">Season: {season}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="erp-label">Buyer <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <select
                                        className="erp-input cursor-pointer appearance-none"
                                        value={buyer}
                                        onChange={e => setBuyer(e.target.value)}
                                    >
                                        <option value="">Select Buyer...</option>
                                        {BUYERS.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="erp-label">Store Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="erp-input"
                                    placeholder="Enter store name..."
                                    value={storeName}
                                    onChange={e => setStoreName(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2. Data Entry Table (Scrollable) */}
                    <div className="erp-table-container flex flex-col flex-1 overflow-hidden h-full min-h-0">
                        <div className="erp-table-scroll">
                            <table className="erp-table">
                                <thead>
                                    <tr>
                                        <th className="sticky-col col-sticky-1">Print</th>
                                        <th className="sticky-col col-sticky-2 shadow-[4px_0_6px_-3px_rgba(0,0,0,0.1)]">Style</th>
                                        {ALL_SIZES.map(s => <th key={s} className="text-center min-w-[70px] px-2">{s}</th>)}
                                        <th className="sticky-header text-center bg-blue-50 text-blue-800 min-w-[80px]">Total</th>
                                        <th className="sticky-header text-center w-24">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Committed Rows */}
                                    {committedRows.map((row, idx) => {
                                        const isEditing = editingRowId === row.id;
                                        return (
                                            <tr key={row.id} className={`group transition-colors ${isEditing ? 'bg-blue-50/30' : 'hover:bg-slate-50'}`}>

                                                {/* Print Column */}
                                                <td className="sticky-col col-sticky-1 pl-4 font-medium text-slate-700 bg-white group-hover:bg-slate-50">
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            className="cell-input border border-blue-300 rounded px-2 py-1 w-full text-blue-700"
                                                            value={editValues.print}
                                                            onChange={e => setEditValues({ ...editValues, print: e.target.value })}
                                                        />
                                                    ) : row.print}
                                                </td>

                                                {/* Style Column */}
                                                <td className="sticky-col col-sticky-2 pl-4 font-medium text-slate-700 shadow-[4px_0_6px_-3px_rgba(0,0,0,0.05)] bg-white group-hover:bg-slate-50">
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            className="cell-input border border-blue-300 rounded px-2 py-1 w-full text-blue-700"
                                                            value={editValues.style}
                                                            onChange={e => setEditValues({ ...editValues, style: e.target.value })}
                                                        />
                                                    ) : row.style}
                                                </td>

                                                {/* Size Columns */}
                                                {ALL_SIZES.map(size => (
                                                    <td key={size} className="text-center text-slate-600 font-mono text-sm px-1">
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                className="cell-input border border-blue-300 rounded px-1 py-1 w-full text-center text-blue-700"
                                                                value={editValues.quantities[size]}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    if (val === '' || /^\d+$/.test(val)) {
                                                                        setEditValues({
                                                                            ...editValues,
                                                                            quantities: { ...editValues.quantities, [size]: val }
                                                                        });
                                                                    }
                                                                }}
                                                            />
                                                        ) : (row.quantities[size] || <span className="text-slate-200">-</span>)}
                                                    </td>
                                                ))}
                                                <td className="bg-blue-50/50 group-hover:bg-blue-100/50 border-l border-blue-100 text-center font-bold text-blue-700 font-mono">
                                                    {isEditing ? calculateRowTotal(editValues.quantities) : calculateRowTotal(row.quantities)}
                                                </td>

                                                <td className="text-center">
                                                    {isEditing ? (
                                                        <div className="flex flex-col gap-1 items-center justify-center">
                                                            <button
                                                                onClick={saveEditing}
                                                                className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded shadow-sm w-full"
                                                            >
                                                                SAVE
                                                            </button>
                                                            <button
                                                                onClick={cancelEditing}
                                                                className="text-[10px] font-bold text-slate-500 hover:text-red-600 px-1 w-full"
                                                            >
                                                                CANCEL
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => startEditing(row)}
                                                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                                                title="Edit Row"
                                                            >
                                                                <FileSpreadsheet size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteRow(idx)}
                                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                                                title="Delete Row"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}


                                    <tr className="bg-slate-50 sticky bottom-0 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] border-t-2 border-blue-100">
                                        <td className="sticky-col col-sticky-1 p-0 bg-white">
                                            <input
                                                ref={printInputRef}
                                                type="text"
                                                className="cell-input text-left font-bold text-blue-700 placeholder:text-slate-300 w-full h-full px-4 border-none outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                                                placeholder="Print..."
                                                value={currentRow.print}
                                                onChange={e => setCurrentRow({ ...currentRow, print: e.target.value })}
                                            />
                                        </td>
                                        <td className="sticky-col col-sticky-2 p-0 bg-white shadow-[4px_0_6px_-3px_rgba(0,0,0,0.05)]">
                                            <input
                                                type="text"
                                                className="cell-input text-left font-bold text-blue-700 placeholder:text-slate-300 w-full h-full px-4 border-none outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                                                placeholder="Style..."
                                                value={currentRow.style}
                                                onChange={e => setCurrentRow({ ...currentRow, style: e.target.value })}
                                            />
                                        </td>
                                        {ALL_SIZES.map(size => (
                                            <td key={size} className="p-0 border-r border-slate-200 last:border-0 relative">
                                                <input
                                                    type="text"
                                                    className={`cell-input ${currentRow.quantities[size] ? 'font-bold text-slate-900 bg-white' : 'text-slate-400'}`}
                                                    placeholder="-"
                                                    value={currentRow.quantities[size]}
                                                    onChange={e => handleCurrentRowQtyChange(size, e.target.value)}
                                                />
                                            </td>
                                        ))}
                                        <td className="bg-blue-100 border-l border-blue-200 text-center font-bold text-blue-800 font-mono text-lg">
                                            {calculateRowTotal(currentRow.quantities)}
                                        </td>
                                        <td className="text-center p-1">
                                            <button onClick={handleSaveRow} className="erp-btn erp-btn-primary !p-0 !w-8 !h-8 rounded-md shadow-md mx-auto flex items-center justify-center">
                                                <Plus size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 3. Footer / Carton Details form */}
                    <div className="erp-card p-6 shrink-0 bg-white border-t-4 border-t-slate-100 shadow-lg">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="erp-section-title text-lg font-black text-slate-800 flex items-center gap-2 mb-0 border-0 p-0 tracking-tight">
                                <Box size={20} className="text-blue-600" />
                                CARTON DETAILS
                            </h3>
                        </div>

                        <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">

                            {/* Total Quantity (Read Only) */}
                            <div className="w-full">
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                                    Total Quantity
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        readOnly
                                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-extrabold text-lg tracking-wider focus:outline-none cursor-not-allowed"
                                        value={`${calculateGrandTotal()} Pcs`}
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500">
                                        <CheckCircle size={20} />
                                    </div>
                                </div>
                            </div>

                            {/* Carton No */}
                            <div className="w-full">
                                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                                    Carton No <span className="text-red-500 text-lg leading-none">*</span>
                                </label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow placeholder:text-slate-300 shadow-sm"
                                    placeholder="Enter Carton Number"
                                    value={cartonNo}
                                    onChange={e => setCartonNo(e.target.value)}
                                />
                            </div>

                            {/* Carton Dimension */}
                            <div className="w-full">
                                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                                    Carton Dimension
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow placeholder:text-slate-300 shadow-sm"
                                    placeholder="L x W x H (cm)"
                                    value={cartonDimension}
                                    onChange={e => setCartonDimension(e.target.value)}
                                />
                            </div>

                            {/* Weights Container */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Net Weight */}
                                <div className="w-full">
                                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                                        Net Weight <span className="text-slate-400 font-normal normal-case">(kg)</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full pl-4 pr-10 py-3.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow placeholder:text-slate-300 shadow-sm"
                                            placeholder="0.00"
                                            value={netWeight}
                                            onChange={e => setNetWeight(e.target.value)}
                                        />
                                        <Scale size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Gross Weight */}
                                <div className="w-full">
                                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                                        Gross Weight <span className="text-slate-400 font-normal normal-case">(kg)</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full pl-4 pr-10 py-3.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow placeholder:text-slate-300 shadow-sm"
                                            placeholder="0.00"
                                            value={grossWeight}
                                            onChange={e => setGrossWeight(e.target.value)}
                                        />
                                        <Scale size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 my-4"></div>

                            {/* Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={handleReset}
                                    className="erp-btn erp-btn-secondary w-full sm:w-1/3 justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100 py-3.5"
                                >
                                    <RotateCcw size={18} /> Reset Form
                                </button>
                                <button
                                    onClick={handleSaveEntry}
                                    disabled={isSaving}
                                    className="erp-btn erp-btn-primary w-full sm:w-2/3 justify-center shadow-xl shadow-blue-500/20 py-3.5 text-base hover:shadow-2xl transition-all hover:-translate-y-0.5"
                                >
                                    {isSaving ? (
                                        <><Loader size={20} className="animate-spin" /> Saving...</>
                                    ) : (
                                        <><FileSpreadsheet size={20} /> Save to Master Sheet</>
                                    )}
                                </button>
                            </div>

                        </div>
                    </div>

                </main>
            </div>

            {/* --- NOTIFICATIONS --- */}
            {notification && (
                <div className={`fixed top-6 right-6 z-50 animate-fade-in flex items-start gap-4 p-4 rounded-xl shadow-2xl border ${notification.type === 'error' ? 'bg-white border-red-100' : 'bg-slate-800 border-slate-700'}`}>
                    <div className={`p-2 rounded-full ${notification.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {notification.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                    </div>
                    <div>
                        <h4 className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${notification.type === 'error' ? 'text-red-500' : 'text-slate-400'}`}>
                            {notification.type === 'error' ? 'Action Failed' : 'Success'}
                        </h4>
                        <p className={`text-sm font-medium ${notification.type === 'error' ? 'text-slate-600' : 'text-white'}`}>
                            {notification.msg}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataEntry;
