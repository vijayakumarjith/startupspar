import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  IndianRupee,
  Download,
  Search,
  Calendar,
  TrendingUp,
  Users,
  CheckCircle,
  AlertCircle,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const FinanceDashboard: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [paidTeams, setPaidTeams] = useState(0);
  const [pendingTeams, setPendingTeams] = useState(0);
  const [averagePayment, setAveragePayment] = useState(0);

  useEffect(() => {
    fetchData();
  }, [searchTerm, dateFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch payments
      const paymentsSnapshot = await getDocs(collection(db, 'payments'));
      let paymentsData: any[] = [];
      let total = 0;
      let count = 0;
      
      paymentsSnapshot.forEach((doc) => {
        const paymentData = { id: doc.id, ...doc.data() };
        paymentsData.push(paymentData);
        
        // Calculate total for paid payments
        if (paymentData.status === 'paid' && paymentData.amount) {
          total += parseFloat(paymentData.amount);
          count++;
        }
      });
      
      // Apply date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        let filterDate = new Date();
        
        if (dateFilter === 'today') {
          filterDate.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'week') {
          filterDate.setDate(now.getDate() - 7);
        } else if (dateFilter === 'month') {
          filterDate.setMonth(now.getMonth() - 1);
        }
        
        paymentsData = paymentsData.filter(payment => {
          if (!payment.createdAt) return false;
          const paymentDate = new Date(payment.createdAt);
          return paymentDate >= filterDate;
        });
      }
      
      // Apply search filter
      if (searchTerm) {
        paymentsData = paymentsData.filter(payment => 
          payment.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.payment_id?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setPayments(paymentsData);
      setTotalRevenue(total);
      setAveragePayment(count > 0 ? total / count : 0);
      
      // Fetch teams
      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      const teamsData: any[] = [];
      let paidCount = 0;
      let pendingCount = 0;
      
      teamsSnapshot.forEach((doc) => {
        const teamData = { id: doc.id, ...doc.data() };
        teamsData.push(teamData);
        
        if (teamData.paymentStatus === 'paid') {
          paidCount++;
        } else {
          pendingCount++;
        }
      });
      
      setTeams(teamsData);
      setPaidTeams(paidCount);
      setPendingTeams(pendingCount);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportPaymentsToCSV = () => {
    if (payments.length === 0) return;
    
    // Create CSV content
    const headers = ['Date', 'Name', 'Email', 'Amount', 'Status', 'Payment ID'];
    const csvRows = [headers.join(',')];
    
    payments.forEach(payment => {
      const row = [
        payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A',
        payment.buyerName || 'N/A',
        payment.email || 'N/A',
        payment.amount || '0',
        payment.status || 'N/A',
        payment.payment_id || 'N/A'
      ];
      
      // Escape any commas in the data
      const escapedRow = row.map(field => {
        if (field.includes(',')) {
          return `"${field}"`;
        }
        return field;
      });
      
      csvRows.push(escapedRow.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    
    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `payments_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen w-full py-20 px-4 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-4">
            Finance Dashboard
          </h1>
          <p className="text-gray-300">
            Track payments and manage financial records
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 backdrop-blur-xl rounded-xl p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-400 text-sm">Total Revenue</p>
                <h3 className="text-2xl font-bold text-green-400">₹{totalRevenue.toFixed(2)}</h3>
              </div>
              <div className="bg-green-500/20 p-2 rounded-lg">
                <IndianRupee className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <div className="flex items-center text-xs text-green-400">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              <span>+{Math.round(paidTeams / (paidTeams + pendingTeams || 1) * 100)}% collection rate</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 backdrop-blur-xl rounded-xl p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-400 text-sm">Registered Teams</p>
                <h3 className="text-2xl font-bold text-blue-400">{teams.length}</h3>
              </div>
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div className="flex items-center text-xs text-blue-400">
              <TrendingUp className="w-3 h-3 mr-1" />
              <span>{paidTeams + pendingTeams} total registrations</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-purple-900/30 to-violet-900/30 backdrop-blur-xl rounded-xl p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-400 text-sm">Paid Teams</p>
                <h3 className="text-2xl font-bold text-purple-400">{paidTeams}</h3>
              </div>
              <div className="bg-purple-500/20 p-2 rounded-lg">
                <CheckCircle className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div className="flex items-center text-xs text-purple-400">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              <span>{pendingTeams} teams pending payment</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-amber-900/30 to-yellow-900/30 backdrop-blur-xl rounded-xl p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-400 text-sm">Average Payment</p>
                <h3 className="text-2xl font-bold text-yellow-400">₹{averagePayment.toFixed(2)}</h3>
              </div>
              <div className="bg-yellow-500/20 p-2 rounded-lg">
                <BarChart3 className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <div className="flex items-center text-xs text-yellow-400">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              <span>Based on {paidTeams} payments</span>
            </div>
          </motion.div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Search by name, email, payment ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 rounded-lg pl-10 focus:ring-2 focus:ring-purple-500 outline-none text-white"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-2 rounded-lg text-sm ${
                dateFilter === 'all' 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                  : 'bg-white/5 text-gray-300'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-2 rounded-lg text-sm ${
                dateFilter === 'today' 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                  : 'bg-white/5 text-gray-300'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-3 py-2 rounded-lg text-sm ${
                dateFilter === 'week' 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                  : 'bg-white/5 text-gray-300'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-3 py-2 rounded-lg text-sm ${
                dateFilter === 'month' 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                  : 'bg-white/5 text-gray-300'
              }`}
            >
              Last 30 Days
            </button>
          </div>
          
          <motion.button
            onClick={exportPaymentsToCSV}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-blue-600 rounded-lg text-white flex items-center justify-center"
            disabled={payments.length === 0}
          >
            <Download className="w-5 h-5 mr-2" />
            Export CSV
          </motion.button>
        </div>

        {/* Payment Status Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-xl rounded-xl p-6"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Payment Status</h3>
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center">
                <div className="relative w-48 h-48">
                  {/* Circular progress chart */}
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#1f2937"
                      strokeWidth="10"
                    />
                    
                    {/* Paid segment */}
                    {(paidTeams > 0 || pendingTeams > 0) && (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="10"
                        strokeDasharray={`${(paidTeams / (paidTeams + pendingTeams)) * 251.2} 251.2`}
                        strokeDashoffset="0"
                        transform="rotate(-90 50 50)"
                      />
                    )}
                  </svg>
                  
                  {/* Center text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-white">
                      {Math.round(paidTeams / (paidTeams + pendingTeams || 1) * 100)}%
                    </span>
                    <span className="text-sm text-gray-400">Paid</span>
                  </div>
                </div>
                
                <div className="flex justify-center mt-4 space-x-6">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-gray-300">Paid ({paidTeams})</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                    <span className="text-gray-300">Pending ({pendingTeams})</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-xl rounded-xl p-6"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-4">
              <button
                onClick={exportPaymentsToCSV}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg text-white flex items-center justify-center"
              >
                <Download className="w-5 h-5 mr-2" />
                Export Payment Data
              </button>
              
              <button
                onClick={() => window.print()}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-violet-600 rounded-lg text-white flex items-center justify-center"
              >
                <PieChart className="w-5 h-5 mr-2" />
                Generate Report
              </button>
              
              <div className="bg-black/30 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-2">Payment Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Teams:</span>
                    <span className="text-white">{teams.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Paid Teams:</span>
                    <span className="text-green-400">{paidTeams}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Pending Teams:</span>
                    <span className="text-yellow-400">{pendingTeams}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-700">
                    <span className="text-gray-300">Total Revenue:</span>
                    <span className="text-green-400">₹{totalRevenue.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Payments Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-xl rounded-xl p-6"
        >
          <h3 className="text-xl font-semibold text-white mb-4">Payment Records</h3>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-purple-500/20">
                    <th className="text-left py-3 px-4 text-gray-300">Date</th>
                    <th className="text-left py-3 px-4 text-gray-300">Name</th>
                    <th className="text-left py-3 px-4 text-gray-300">Email</th>
                    <th className="text-left py-3 px-4 text-gray-300">Amount</th>
                    <th className="text-left py-3 px-4 text-gray-300">Status</th>
                    <th className="text-left py-3 px-4 text-gray-300">Payment ID</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400">
                        {searchTerm || dateFilter !== 'all' ? 'No payments match your search criteria.' : 'No payment records found.'}
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment, index) => (
                      <tr 
                        key={payment.id} 
                        className={`border-b border-purple-500/10 ${index % 2 === 0 ? 'bg-purple-900/10' : ''}`}
                      >
                        <td className="py-3 px-4 text-gray-300">
                          {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-white">{payment.buyerName || 'N/A'}</td>
                        <td className="py-3 px-4 text-gray-300">{payment.email || 'N/A'}</td>
                        <td className="py-3 px-4 text-green-400">₹{payment.amount || '0'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            payment.status === 'paid' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {payment.status || 'pending'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-300 font-mono text-xs">
                          {payment.payment_id || 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default FinanceDashboard;