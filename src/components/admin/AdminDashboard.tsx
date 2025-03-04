import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Phone,
  User,
  IndianRupee,
  Mail,
  ExternalLink,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Briefcase,
  FileText,
  Award,
  Trash2,
  Edit,
  Plus,
  X,
  Save,
  Image,
  Link,
  Eye,
  Calendar,
  Clock,
  Search,
  Filter,
  Download,
} from 'lucide-react';
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, deleteDoc, addDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Countdown from 'react-countdown';
import { generateUniqueId } from '../../lib/instamojo';

interface AdminDashboardProps {
  isFinanceAdmin: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ isFinanceAdmin }) => {
  const [activeTab, setActiveTab] = useState<'teams' | 'submissions' | 'sponsors' | 'payments'>('teams');
  const [teams, setTeams] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSponsorForm, setShowSponsorForm] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<any>(null);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all');
  const [totalPayments, setTotalPayments] = useState(0);
  const [sponsorFormData, setSponsorFormData] = useState({
    name: '',
    logo: '',
    website: '',
    description: '',
    category: 'Diamond'
  });

  useEffect(() => {
    fetchData();
  }, [activeTab, isFinanceAdmin, searchTerm, filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'teams') {
        let teamsQuery = collection(db, 'teams');
        const teamsSnapshot = await getDocs(teamsQuery);
        let teamsData: any[] = [];
        teamsSnapshot.forEach((doc) => {
          teamsData.push({ id: doc.id, ...doc.data() });
        });

        // Apply search filter if provided
        if (searchTerm) {
          teamsData = teamsData.filter(team => 
            team.teamName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            team.registrationId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            team.members?.some((member: any) => 
              member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              member.email?.toLowerCase().includes(searchTerm.toLowerCase())
            )
          );
        }

        // Apply payment status filter
        if (filterStatus !== 'all') {
          teamsData = teamsData.filter(team => team.paymentStatus === filterStatus);
        }

        setTeams(teamsData);
      } else if (activeTab === 'submissions') {
        const submissionsSnapshot = await getDocs(collection(db, 'phase1_submissions'));
        const submissionsData: any[] = [];
        submissionsSnapshot.forEach((doc) => {
          submissionsData.push({ id: doc.id, ...doc.data() });
        });
        setSubmissions(submissionsData);
      } else if (activeTab === 'sponsors') {
        const sponsorsSnapshot = await getDocs(collection(db, 'sponsors'));
        const sponsorsData: any[] = [];
        sponsorsSnapshot.forEach((doc) => {
          sponsorsData.push({ id: doc.id, ...doc.data() });
        });
        setSponsors(sponsorsData);
      } else if (activeTab === 'payments') {
        const paymentsSnapshot = await getDocs(collection(db, 'payments'));
        const paymentsData: any[] = [];
        let total = 0;
        
        paymentsSnapshot.forEach((doc) => {
          const paymentData = { id: doc.id, ...doc.data() };
          paymentsData.push(paymentData);
          
          // Calculate total for paid payments
          if (paymentData.status === 'paid' && paymentData.amount) {
            total += parseFloat(paymentData.amount);
          }
        });
        
        // Apply search filter if provided
        if (searchTerm) {
          const filtered = paymentsData.filter(payment => 
            payment.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            payment.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            payment.payment_id?.toLowerCase().includes(searchTerm.toLowerCase())
          );
          setPayments(filtered);
        } else {
          setPayments(paymentsData);
        }
        
        setTotalPayments(total);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (teamId: string, status: 'pending' | 'paid') => {
    try {
      await updateDoc(doc(db, 'teams', teamId), {
        paymentStatus: status,
        paymentUpdatedAt: new Date().toISOString(),
      });
      
      // Refresh the teams data
      fetchData();
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  const handleSponsorFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSponsorFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSponsor) {
        // Update existing sponsor
        await updateDoc(doc(db, 'sponsors', editingSponsor.id), {
          ...sponsorFormData,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Add new sponsor
        await addDoc(collection(db, 'sponsors'), {
          ...sponsorFormData,
          createdAt: new Date().toISOString()
        });
      }
      
      // Reset form and refresh data
      setSponsorFormData({
        name: '',
        logo: '',
        website: '',
        description: '',
        category: 'Diamond'
      });
      setEditingSponsor(null);
      setShowSponsorForm(false);
      fetchData();
    } catch (error) {
      console.error('Error saving sponsor:', error);
    }
  };

  const handleEditSponsor = (sponsor: any) => {
    setEditingSponsor(sponsor);
    setSponsorFormData({
      name: sponsor.name,
      logo: sponsor.logo,
      website: sponsor.website || '',
      description: sponsor.description || '',
      category: sponsor.category
    });
    setShowSponsorForm(true);
  };

  const handleDeleteSponsor = async (sponsorId: string) => {
    if (window.confirm('Are you sure you want to delete this sponsor?')) {
      try {
        await deleteDoc(doc(db, 'sponsors', sponsorId));
        fetchData();
      } catch (error) {
        console.error('Error deleting sponsor:', error);
      }
    }
  };

  const viewTeamDetails = (team: any) => {
    setSelectedTeam(team);
  };

  const closeTeamDetails = () => {
    setSelectedTeam(null);
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

  const renderTeams = () => {
    if (teams.length === 0) {
      return (
        <div className="text-center py-12 text-gray-400">
          {searchTerm || filterStatus !== 'all' ? 'No teams match your search criteria.' : 'No teams registered yet.'}
        </div>
      );
    }

    return (
      <div className="grid gap-6">
        {teams.map((team) => (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-xl rounded-xl p-6"
          >
            <div className="flex flex-col md:flex-row justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">{team.teamName}</h3>
                <p className="text-gray-300 mb-4">Registration ID: {team.registrationId}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-purple-400 font-semibold mb-2">Team Members</h4>
                    <ul className="space-y-2">
                      {team.members && team.members.map((member: any, index: number) => (
                        <li key={index} className="text-gray-300">
                          <span className="font-semibold">{index === 0 ? 'Lead: ' : `Member ${index + 1}: `}</span>
                          {member.name} ({member.email})
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-purple-400 font-semibold mb-2">Registration Details</h4>
                    <p className="text-gray-300">Team Size: {team.teamSize}</p>
                    <p className="text-gray-300">Created: {new Date(team.createdAt).toLocaleDateString()}</p>
                    <p className="text-gray-300">
                      Amount: ₹{team.teamSize * 250}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 md:mt-0">
                <div className="flex flex-col items-end">
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold mb-4 ${
                    team.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {team.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => viewTeamDetails(team)}
                      className="px-3 py-1 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <Eye className="w-4 h-4 inline mr-1" /> View Details
                    </button>
                    
                    {isFinanceAdmin && (
                      <>
                        <button
                          onClick={() => updatePaymentStatus(team.id, 'paid')}
                          disabled={team.paymentStatus === 'paid'}
                          className={`px-3 py-1 rounded-lg text-sm ${
                            team.paymentStatus === 'paid' 
                              ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          Mark as Paid
                        </button>
                        
                        <button
                          onClick={() => updatePaymentStatus(team.id, 'pending')}
                          disabled={team.paymentStatus === 'pending'}
                          className={`px-3 py-1 rounded-lg text-sm ${
                            team.paymentStatus === 'pending' 
                              ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                              : 'bg-yellow-600 text-white hover:bg-yellow-700'
                          }`}
                        >
                          Mark as Pending
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  const renderSubmissions = () => {
    if (submissions.length === 0) {
      return (
        <div className="text-center py-12 text-gray-400">
          No submissions yet.
        </div>
      );
    }

    return (
      <div className="grid gap-6">
        {submissions.map((submission) => (
          <motion.div
            key={submission.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-xl rounded-xl p-6"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">{submission.teamName}</h3>
                <div className="space-y-2 text-gray-300">
                  <p className="flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Team Lead: {submission.teamLeadName}
                  </p>
                  <p className="flex items-center">
                    <Briefcase className="w-5 h-5 mr-2" />
                    College: {submission.collegeName}
                  </p>
                  <p className="flex items-center">
                    <Phone className="w-5 h-5 mr-2" />
                    WhatsApp: {submission.whatsappNumber}
                  </p>
                  <p className="text-purple-400">
                    Registration ID: {submission.registrationId}
                  </p>
                  <p className="text-gray-400">
                    Submitted: {new Date(submission.submittedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Project Details</h4>
                <p className="text-gray-300 mb-2">{submission.productDescription}</p>
                <p className="text-gray-300 mb-4">{submission.solution}</p>
                <div className="flex space-x-4">
                  {submission.fileUrl && (
                    <a
                      href={submission.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      View Document
                    </a>
                  )}
                  {submission.youtubeLink && (
                    <a
                      href={submission.youtubeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-400 hover:text-red-300 flex items-center"
                    >
                      <ExternalLink className="w-5 h-5 mr-2" />
                      Watch Video
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  const renderSponsors = () => {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-white">Sponsors Management</h3>
          <motion.button
            onClick={() => {
              setEditingSponsor(null);
              setSponsorFormData({
                name: '',
                logo: '',
                website: '',
                description: '',
                category: 'Diamond'
              });
              setShowSponsorForm(true);
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-white flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Sponsor
          </motion.button>
        </div>

        <div className="bg-purple-900/20 p-4 rounded-lg mb-6">
          <h4 className="text-lg font-semibold text-white mb-3">Sponsor Guidelines</h4>
          <ul className="space-y-2 text-gray-300 text-sm">
            <li className="flex items-start">
              <span className="bg-purple-500/20 rounded-full w-5 h-5 flex items-center justify-center text-purple-400 mr-2 mt-0.5 flex-shrink-0">1</span>
              <span>Logo should be high quality (recommended size: 600x300px)</span>
            </li>
            <li className="flex items-start">
              <span className="bg-purple-500/20 rounded-full w-5 h-5 flex items-center justify-center text-purple-400 mr-2 mt-0.5 flex-shrink-0">2</span>
              <span>Use transparent background PNG or SVG for best results</span>
            </li>
            <li className="flex items-start">
              <span className="bg-purple-500/20 rounded-full w-5 h-5 flex items-center justify-center text-purple-400 mr-2 mt-0.5 flex-shrink-0">3</span>
              <span>Description should be concise (max 100 characters)</span>
            </li>
            <li className="flex items-start">
              <span className="bg-purple-500/20 rounded-full w-5 h-5 flex items-center justify-center text-purple-400 mr-2 mt-0.5 flex-shrink-0">4</span>
              <span>Website URL must include http:// or https:// prefix</span>
            </li>
          </ul>
        </div>

        <AnimatePresence>
          {showSponsorForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-xl rounded-xl p-6 mb-8"
            >
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xl font-semibold text-white">
                  {editingSponsor ? 'Edit Sponsor' : 'Add New Sponsor'}
                </h4>
                <button
                  onClick={() => setShowSponsorForm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSponsor} className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">Sponsor Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="name"
                      value={sponsorFormData.name}
                      onChange={handleSponsorFormChange}
                      className="w-full px-4 py-2 bg-white/5 rounded-lg pl-10 focus:ring-2 focus:ring-purple-500 outline-none text-white"
                      required
                    />
                    <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Logo URL</label>
                  <div className="relative">
                    <input
                      type="url"
                      name="logo"
                      value={sponsorFormData.logo}
                      onChange={handleSponsorFormChange}
                      className="w-full px-4 py-2 bg-white/5 rounded-lg pl-10 focus:ring-2 focus:ring-purple-500 outline-none text-white"
                      required
                      placeholder="https://example.com/logo.png"
                    />
                    <Image className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Website URL</label>
                  <div className="relative">
                    <input
                      type="url"
                      name="website"
                      value={sponsorFormData.website}
                      onChange={handleSponsorFormChange}
                      className="w-full px-4 py-2 bg-white/5 rounded-lg pl-10 focus:ring-2 focus:ring-purple-500 outline-none text-white"
                      placeholder="https://example.com"
                    />
                    <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={sponsorFormData.description}
                    onChange={handleSponsorFormChange}
                    className="w-full px-4 py-2 bg-white/5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-white"
                    rows={3}
                    required
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {sponsorFormData.description.length}/100 characters
                  </p>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Category</label>
                  <select
                    name="category"
                    value={sponsorFormData.category}
                    onChange={handleSponsorFormChange}
                    className="w-full px-4 py-2 bg-white/5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-white"
                    required
                  >
                    <option value="Diamond">Diamond</option>
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="Basic">Basic</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3">
                  <motion.button
                    type="button"
                    onClick={() => setShowSponsorForm(false)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 bg-gray-700 rounded-lg text-white"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-white flex items-center"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    {editingSponsor ? 'Update Sponsor' : 'Add Sponsor'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {sponsors.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No sponsors added yet.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sponsors.map((sponsor) => (
              <motion.div
                key={sponsor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-xl rounded-xl overflow-hidden"
              >
                <div className="relative h-40">
                  <img
                    src={sponsor.logo}
                    alt={sponsor.name}
                    className="w-full h-full object-contain p-4"
                  />
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300">
                      {sponsor.category}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="text-lg font-semibold text-white mb-2">{sponsor.name}</h4>
                  <p className="text-gray-300 text-sm mb-4 line-clamp-2">{sponsor.description}</p>
                  
                  <div className="flex justify-between items-center">
                    {sponsor.website ? (
                      <a
                        href={sponsor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex items-center text-sm"
                      >
                        Visit Website
                        <ExternalLink className="w-4 h-4 ml-1" />
                      </a>
                    ) : (
                      <span className="text-gray-500 text-sm">No website</span>
                    )}
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditSponsor(sponsor)}
                        className="p-1 text-yellow-400 hover:text-yellow-300"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSponsor(sponsor.id)}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderPayments = () => {
    return (
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h3 className="text-2xl font-bold text-white">Finance Dashboard</h3>
            <p className="text-gray-300">Track and manage all payments</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 backdrop-blur-xl rounded-lg p-4 text-center">
              <p className="text-gray-300 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold text-green-400">₹{totalPayments.toFixed(2)}</p>
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
        </div>

        <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-xl rounded-xl p-6 mb-8">
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
                      {searchTerm ? 'No payments match your search criteria.' : 'No payment records found.'}
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
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full py-20 px-4 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-4">
            {isFinanceAdmin ? 'Finance Admin Dashboard' : 'Admin Dashboard'}
          </h1>
          <p className="text-gray-300">
            {isFinanceAdmin 
              ? 'Manage payments and financial records' 
              : 'Manage teams, submissions, and sponsors'}
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Search by name, email, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 rounded-lg pl-10 focus:ring-2 focus:ring-purple-500 outline-none text-white"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
          
          {activeTab === 'teams' && (
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-2 rounded-lg text-sm ${
                  filterStatus === 'all' 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                    : 'bg-white/5 text-gray-300'
                }`}
              >
                All Teams
              </button>
              <button
                onClick={() => setFilterStatus('paid')}
                className={`px-3 py-2 rounded-lg text-sm ${
                  filterStatus === 'paid' 
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' 
                    : 'bg-white/5 text-gray-300'
                }`}
              >
                Paid
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-2 rounded-lg text-sm ${
                  filterStatus === 'pending' 
                    ? 'bg-gradient-to-r from-yellow-600 to-amber-600 text-white' 
                    : 'bg-white/5 text-gray-300'
                }`}
              >
                Pending
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-8 bg-black/40 p-2 rounded-lg">
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'teams'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Teams
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'submissions'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Submissions
          </button>
          <button
            onClick={() => setActiveTab('sponsors')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'sponsors'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            <Award className="w-4 h-4 inline mr-2" />
            Sponsors
          </button>
          {isFinanceAdmin && (
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'payments'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              <IndianRupee className="w-4 h-4 inline mr-2" />
              Payments
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <div>
            {activeTab === 'teams' && renderTeams()}
            {activeTab === 'submissions' && renderSubmissions()}
            {activeTab === 'sponsors' && renderSponsors()}
            {activeTab === 'payments' && isFinanceAdmin && renderPayments()}
          </div>
        )}
      </div>

      {/* Team Details Modal */}
      <AnimatePresence>
        {selectedTeam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-xl rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Team Details</h3>
                <button
                  onClick={closeTeamDetails}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="bg-black/30 rounded-lg p-4 mb-6">
                    <h4 className="text-xl font-semibold text-white mb-4 flex items-center">
                      <Users className="w-5 h-5 mr-2 text-purple-400" />
                      Team Information
                    </h4>
                    <div className="space-y-3">
                      <p className="text-gray-300">
                        <span className="text-purple-400 font-semibold">Team Name:</span> {selectedTeam.teamName}
                      </p>
                      <p className="text-gray-300">
                        <span className="text-purple-400 font-semibold">Registration ID:</span> {selectedTeam.registrationId}
                      </p>
                      <p className="text-gray-300">
                        <span className="text-purple-400 font-semibold">Team Size:</span> {selectedTeam.teamSize} members
                      </p>
                      <p className="text-gray-300">
                        <span className="text-purple-400 font-semibold">Created:</span> {new Date(selectedTeam.createdAt).toLocaleString()}
                      </p>
                      <p className="text-gray-300">
                        <span className="text-purple-400 font-semibold">Payment Status:</span> 
                        <span className={selectedTeam.paymentStatus === 'paid' ? 'text-green-400 ml-2' : 'text-yellow-400 ml-2'}>
                          {selectedTeam.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      </p>
                      {selectedTeam.paymentUpdatedAt && (
                        <p className="text-gray-300">
                          <span className="text-purple-400 font-semibold">Payment Updated:</span> {new Date(selectedTeam.paymentUpdatedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-black/30 rounded-lg p-4">
                    <h4 className="text-xl font-semibold text-white mb-4 flex items-center">
                      <User className="w-5 h-5 mr-2 text-purple-400" />
                      Team Members
                    </h4>
                    <div className="space-y-4">
                      {selectedTeam.members && selectedTeam.members.map((member: any, index: number) => (
                        <div key={index} className="border-b border-purple-500/20 pb-3 last:border-0">
                          <p className="text-white font-semibold">{index === 0 ? 'Team Lead' : `Member ${index + 1}`}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            <p className="text-gray-300 flex items-center">
                              <User className="w-4 h-4 mr-2 text-gray-400" />
                              {member.name}
                            </p>
                            <p className="text-gray-300 flex items-center">
                              <Mail className="w-4 h-4 mr-2 text-gray-400" />
                              {member.email}
                            </p>
                            <p className="text-gray-300 flex items-center">
                              <Phone className="w-4 h-4 mr-2 text-gray-400" />
                              {member.phone}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="bg-black/30 rounded-lg p-4 mb-6">
                    <h4 className="text-xl font-semibold text-white mb-4 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-purple-400" />
                      Submission Status
                    </h4>
                    
                    {submissions.filter(s => s.registrationId === selectedTeam.registrationId).length > 0 ? (
                      submissions.filter(s => s.registrationId === selectedTeam.registrationId).map((submission) => (
                        <div key={submission.id} className="space-y-3">
                          <p className="text-green-400 flex items-center">
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Phase 1 Submission Complete
                          </p>
                          <p className="text-gray-300">
                            <span className="text-purple-400 font-semibold">Submitted:</span> {new Date(submission.submittedAt).toLocaleString()}
                          </p>
                          <p className="text-gray-300">
                            <span className="text-purple-400 font-semibold">College:</span> {submission.collegeName}
                          </p>
                          <p className="text-gray-300">
                            <span className="text-purple-400 font-semibold">WhatsApp:</span> {submission.whatsappNumber}
                          </p>
                          
                          <div className="mt-4">
                            <h5 className="text-lg font-semibold text-white mb-2">Project Details</h5>
                            <div className="bg-black/20 p-3 rounded-lg mb-3">
                              <p className="text-gray-300 text-sm">
                                <span className="text-purple-400 font-semibold">Product Description:</span>
                              </p>
                              <p className="text-gray-300 mt-1">{submission.productDescription}</p>
                            </div>
                            <div className="bg-black/20 p-3 rounded-lg mb-3">
                              <p className="text-gray-300 text-sm">
                                <span className="text-purple-400 font-semibold">Solution:</span>
                              </p>
                              <p className="text-gray-300 mt-1">{submission.solution}</p>
                            </div>
                            
                            <div className="flex flex-wrap gap-3 mt-4">
                              {submission.fileUrl && (
                                <a
                                  href={submission.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-3 py-2 bg-blue-600/30 hover:bg-blue-600/50 rounded-lg text-blue-300 text-sm transition-colors"
                                >
                                  <FileText className="w-4 h-4 mr-2" />
                                  View Document
                                </a>
                              )}
                              {submission.youtubeLink && (
                                <a
                                  href={submission.youtubeLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-3 py-2 bg-red-600/30 hover:bg-red-600/50 rounded-lg text-red-300 text-sm transition-colors"
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Watch Video
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-yellow-400 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        No Phase 1 submission yet
                      </div>
                    )}
                  </div>
                  
                  {isFinanceAdmin && (
                    <div className="bg-black/30 rounded-lg p-4">
                      <h4 className="text-xl font-semibold text-white mb-4 flex items-center">
                        <IndianRupee className="w-5 h-5 mr-2 text-purple-400" />
                        Payment Management
                      </h4>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-gray-300">
                            <span className="text-purple-400 font-semibold">Amount:</span> ₹{selectedTeam.teamSize * 250}
                          </p>
                          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            selectedTeam.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {selectedTeam.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                          </div>
                        </div>
                        
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              updatePaymentStatus(selectedTeam.id, 'paid');
                              setSelectedTeam({...selectedTeam, paymentStatus: 'paid'});
                            }}
                            disabled={selectedTeam.paymentStatus === 'paid'}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                              selectedTeam.paymentStatus === 'paid' 
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            <CheckCircle className="w-4 h-4 inline mr-1" /> Mark as Paid
                          </button>
                          
                          <button
                            onClick={() => {
                              updatePaymentStatus(selectedTeam.id, 'pending');
                              setSelectedTeam({...selectedTeam, paymentStatus: 'pending'});
                            }}
                            disabled={selectedTeam.paymentStatus === 'pending'}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                              selectedTeam.paymentStatus === 'pending' 
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                                : 'bg-yellow-600 text-white hover:bg-yellow-700'
                            }`}
                          >
                            <AlertCircle className="w-4 h-4 inline mr-1" /> Mark as Pending
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end">
                <motion.button
                  onClick={closeTeamDetails}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-white"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;