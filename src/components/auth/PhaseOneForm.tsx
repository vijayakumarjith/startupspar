import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Youtube, FileText, Send, Download, User, School, Phone, AlertCircle } from 'lucide-react';
import { collection, addDoc, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';

interface PhaseOneFormProps {
  userId: string;
  userName: string;
  isAdmin?: boolean;
}

interface Submission {
  id: string;
  teamName: string;
  teamLeadName: string;
  collegeName: string;
  whatsappNumber: string;
  productDescription: string;
  solution: string;
  youtubeLink: string;
  fileUrl: string;
  submittedAt: string;
  registrationId: string;
}

const PhaseOneForm: React.FC<PhaseOneFormProps> = ({ userId, userName, isAdmin = false }) => {
  const [formData, setFormData] = useState({
    teamName: '',
    collegeName: '',
    whatsappNumber: '',
    productDescription: '',
    solution: '',
    youtubeLink: '',
    file: null as File | null,
  });

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [registrationId, setRegistrationId] = useState('');
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending');

  useEffect(() => {
    if (isAdmin) {
      fetchSubmissions();
    } else {
      fetchTeamData();
      checkExistingSubmission();
    }
  }, [isAdmin, userId]);

  const fetchTeamData = async () => {
    try {
      const teamDoc = await getDoc(doc(db, 'teams', userId));
      if (teamDoc.exists()) {
        const data = teamDoc.data();
        setFormData(prev => ({
          ...prev,
          teamName: data.teamName || '',
          whatsappNumber: data.members && data.members[0]?.phone || '',
        }));
        
        if (data.registrationId) {
          setRegistrationId(data.registrationId);
        }
        
        // Check for "paid" status (lowercase)
        setPaymentStatus(data.paymentStatus === 'paid' ? 'paid' : 'pending');
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
    }
  };

  const checkExistingSubmission = async () => {
    try {
      const q = query(collection(db, 'phase1_submissions'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setIsSubmitted(true);
      }
    } catch (error) {
      console.error('Error checking existing submission:', error);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'phase1_submissions'));
      const submissionData: Submission[] = [];
      querySnapshot.forEach((doc) => {
        submissionData.push({ id: doc.id, ...doc.data() } as Submission);
      });
      setSubmissions(submissionData);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, file: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (paymentStatus !== 'paid') {
        throw new Error('Payment not confirmed. Please complete payment before submitting.');
      }

      if (!registrationId) {
        throw new Error('Registration ID not found. Please complete registration first.');
      }

      if (!formData.teamName || !formData.collegeName || !formData.whatsappNumber || 
          !formData.productDescription || !formData.solution || !formData.youtubeLink) {
        throw new Error('Please fill in all required fields');
      }

      if (!formData.file) {
        throw new Error('Please upload a presentation file (PPT/PDF)');
      }

      let fileUrl = '';
      if (formData.file) {
        const storageRef = ref(storage, `phase1_submissions/${registrationId}_${formData.file.name}`);
        await uploadBytes(storageRef, formData.file);
        fileUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'phase1_submissions'), {
        userId,
        teamName: formData.teamName,
        teamLeadName: userName,
        collegeName: formData.collegeName,
        whatsappNumber: formData.whatsappNumber,
        productDescription: formData.productDescription,
        solution: formData.solution,
        youtubeLink: formData.youtubeLink,
        fileUrl,
        registrationId,
        submittedAt: new Date().toISOString(),
      });

      setIsSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting form:', error);
      setError(error.message || 'Error submitting form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isAdmin) {
    return (
      <div className="min-h-screen w-full py-20 px-4 bg-black">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-center gradient-text mb-12">Phase 1 Submissions</h1>
          
          {submissions.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              No submissions yet
            </div>
          ) : (
            <div className="grid gap-8">
              {submissions.map((submission) => (
                <motion.div
                  key={submission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-xl rounded-xl p-6"
                >
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4">{submission.teamName}</h3>
                      <div className="space-y-2 text-gray-300">
                        <p className="flex items-center">
                          <User className="w-5 h-5 mr-2" />
                          Team Lead: {submission.teamLeadName}
                        </p>
                        <p className="flex items-center">
                          <School className="w-5 h-5 mr-2" />
                          College: {submission.collegeName}
                        </p>
                        <p className="flex items-center">
                          <Phone className="w-5 h-5 mr-2" />
                          WhatsApp: {submission.whatsappNumber}
                        </p>
                        <p className="text-purple-400">
                          Registration ID: {submission.registrationId}
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
                            <Youtube className="w-5 h-5 mr-2" />
                            Watch Video
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (paymentStatus !== 'paid') {
    return (
      <div className="min-h-screen w-full py-20 px-4 bg-black">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl backdrop-blur-xl bg-black/40 border border-purple-500/20 p-6 sm:p-8 text-center"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 sm:w-20 sm:h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-500" />
            </motion.div>
            <h2 className="text-2xl sm:text-3xl font-bold gradient-text mb-4">Payment Required</h2>
            <p className="text-gray-300 mb-6 text-sm sm:text-base">
              You need to complete your payment before you can submit your Phase 1 materials.
            </p>
            <div className="bg-yellow-900/20 p-4 sm:p-6 rounded-lg text-left mb-8">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Payment Instructions</h3>
              <ol className="space-y-2 text-gray-300 text-sm sm:text-base">
                <li className="flex items-start">
                  <span className="bg-yellow-500/20 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-yellow-400 mr-2 sm:mr-3 mt-0.5 flex-shrink-0">1</span>
                  <span>Go back to the registration page</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-yellow-500/20 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-yellow-400 mr-2 sm:mr-3 mt-0.5 flex-shrink-0">2</span>
                  <span>Complete your payment at the payment portal</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-yellow-500/20 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-yellow-400 mr-2 sm:mr-3 mt-0.5 flex-shrink-0">3</span>
                  <span>Return here after your payment is confirmed</span>
                </li>
              </ol>
            </div>
            <motion.a
              href="/"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-white font-semibold inline-block text-sm sm:text-base"
            >
              Return to Home
            </motion.a>
          </motion.div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen w-full py-20 px-4 bg-black">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl backdrop-blur-xl bg-black/40 border border-purple-500/20 p-6 sm:p-8 text-center"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 sm:w-20 sm:h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
            <h2 className="text-2xl sm:text-3xl font-bold gradient-text mb-4">Phase 1 Submission Complete!</h2>
            <p className="text-gray-300 mb-6 text-sm sm:text-base">
              Thank you for submitting your Phase 1 materials. Our team will review your submission and get back to you with the results.
            </p>
            <p className="text-purple-400 mb-8 text-sm sm:text-base">
              Registration ID: <span className="text-white font-mono">{registrationId}</span>
            </p>
            <div className="bg-purple-900/20 p-4 sm:p-6 rounded-lg text-left">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">What's Next?</h3>
              <ul className="space-y-2 text-gray-300 text-sm sm:text-base">
                <li>• Our judges will evaluate your submission</li>
                <li>• Results will be announced via email</li>
                <li>• Selected teams will proceed to Phase 2</li>
                <li>• Stay tuned for updates on our website and social media</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full py-20 px-4 bg-black">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl backdrop-blur-xl bg-black/40 border border-purple-500/20 p-6 sm:p-8"
        >
          <h1 className="text-2xl sm:text-4xl font-bold text-center gradient-text mb-2">Welcome to Phase 1</h1>
          <p className="text-gray-400 text-center mb-8 text-sm sm:text-base">Submit your project details below</p>

          {error && (
            <div className="bg-red-500/10 text-red-400 p-4 rounded-lg mb-6 text-sm sm:text-base">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-8">
            <div className="bg-purple-900/20 p-4 sm:p-6 rounded-lg">
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Part 1: Project Details</h2>
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-gray-300 mb-2 text-sm sm:text-base">Team Name</label>
                  <input
                    type="text"
                    value={formData.teamName}
                    onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-white text-sm sm:text-base"
                    required
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 text-sm sm:text-base">College/Institution Name</label>
                  <input
                    type="text"
                    value={formData.collegeName}
                    onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-white text-sm sm:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 text-sm sm:text-base">WhatsApp Number</label>
                  <input
                    type="tel"
                    value={formData.whatsappNumber}
                    onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-white text-sm sm:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 text-sm sm:text-base">Product Description</label>
                  <textarea
                    value={formData.productDescription}
                    onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-white h-24 sm:h-32 text-sm sm:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 text-sm sm:text-base">Solution</label>
                  <textarea
                    value={formData.solution}
                    onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-white h-24 sm:h-32 text-sm sm:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 text-sm sm:text-base">Upload PPT/PDF</label>
                  <div className="relative">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.ppt,.pptx"
                      className="hidden"
                      id="file-upload"
                      required
                    />
                    <label
                      htmlFor="file-upload"
                      className="w-full px-4 py-3 bg-white/5 rounded-lg text-gray-300 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors text-sm sm:text-base"
                    >
                      <Upload className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      {formData.file ? formData.file.name : 'Choose file'}
                    </label>
                  </div>
                </div>
              </form>
            </div>

            <div className="bg-purple-900/20 p-4 sm:p-6 rounded-lg">
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Part 2: Video Submission</h2>
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-gray-300 mb-2 text-sm sm:text-base">YouTube Link</label>
                  <div className="relative">
                    <input
                      type="url"
                      value={formData.youtubeLink}
                      onChange={(e) => setFormData({ ...formData, youtubeLink: e.target.value })}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full px-4 py-3 bg-white/5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-white pl-10 text-sm sm:text-base"
                      required
                    />
                    <Youtube className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-500 w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>

                <div className="bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3">Video Guidelines</h3>
                  <ul className="space-y-2 text-gray-300 text-xs sm:text-sm">
                    <li>• Maximum duration: 5 minutes</li>
                    <li>• Include product demo</li>
                    <li>• Highlight key features</li>
                    <li>• Explain market potential</li>
                  </ul>
                  <motion.a
                    href="/guidelines.pdf"
                    download
                    className="inline-flex items-center mt-4 text-blue-400 hover:text-blue-300 text-xs sm:text-sm"
                    whileHover={{ x: 5 }}
                  >
                    <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    Download detailed guidelines
                  </motion.a>
                </div>

                <div className="bg-purple-900/20 p-4 rounded-lg">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3">Registration ID</h3>
                  <p className="text-gray-300 mb-2 text-xs sm:text-sm">Your unique registration ID:</p>
                  <div className="bg-black/30 p-2 rounded font-mono text-white text-xs sm:text-sm break-all">
                    {registrationId || 'Not available. Please complete registration first.'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <motion.button
            onClick={handleSubmit}
            disabled={loading || !registrationId}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-white font-semibold flex items-center justify-center group text-sm sm:text-base ${
              loading || !registrationId ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Submitting...' : 'Submit Phase 1'}
            <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default PhaseOneForm;