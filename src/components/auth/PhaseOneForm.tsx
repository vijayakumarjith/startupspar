import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  Youtube,
  AlertCircle,
  CheckCircle,
  Calendar,
  Info,
} from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';

interface PhaseOneFormProps {
  userId: string;
  userName: string;
}

const PhaseOneForm: React.FC<PhaseOneFormProps> = ({ userId, userName }) => {
  const [formData, setFormData] = useState({
    teamName: '',
    collegeName: '',
    whatsappNumber: '',
    productDescription: '',
    solution: '',
    fileUrl: '',
    youtubeLink: '',
    registrationId: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadSubmissionData = async () => {
      try {
        // Get team data first to get registration ID
        const teamDoc = await getDoc(doc(db, 'teams', userId));
        if (teamDoc.exists()) {
          const teamData = teamDoc.data();
          setFormData(prev => ({
            ...prev,
            teamName: teamData.teamName || '',
            registrationId: teamData.registrationId || '',
          }));
        }

        // Then get submission data if it exists
        const submissionDoc = await getDoc(doc(db, 'phase1_submissions', userId));
        if (submissionDoc.exists()) {
          const data = submissionDoc.data();
          setFormData(prev => ({
            ...prev,
            ...data,
          }));
          setIsSubmitted(true);
        }
      } catch (err) {
        console.error('Error loading submission data:', err);
        setError('Failed to load your submission data');
      } finally {
        setInitialLoading(false);
      }
    };

    loadSubmissionData();
  }, [userId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
        setError('Please upload a PowerPoint file (.pptx)');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.collegeName || !formData.whatsappNumber || !formData.productDescription || !formData.solution) {
        throw new Error('Please fill in all required fields');
      }

      // If this is the initial submission, require the PPT file
      if (!isSubmitted && !file) {
        throw new Error('Please upload your presentation file');
      }

      let updatedFormData = { ...formData };

      // Handle file upload if a new file is selected
      if (file) {
        const fileRef = ref(storage, `presentations/${userId}_${file.name}`);
        await uploadBytes(fileRef, file);
        const fileUrl = await getDownloadURL(fileRef);
        updatedFormData.fileUrl = fileUrl;
      }

      // Save submission data
      await setDoc(doc(db, 'phase1_submissions', userId), {
        ...updatedFormData,
        userId,
        userName,
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setSuccess('Your submission has been saved successfully!');
      setIsSubmitted(true);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit your entry');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-xl rounded-xl p-6 sm:p-8 border border-purple-500/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold gradient-text mb-4">Phase 1 Submission</h2>
            <p className="text-gray-300">Submit your project details and presentation</p>
          </div>

          {/* Important Notice */}
          <div className="bg-blue-900/30 border border-blue-500/20 rounded-lg p-4 mb-8">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-400 mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-blue-400 font-semibold mb-2">Important Notice</h3>
                <p className="text-gray-300 text-sm">
                  Please submit your PPT presentation first. You can add your YouTube video link later, 
                  but it must be submitted by April 2nd, 2025.
                </p>
              </div>
            </div>
          </div>

          {/* Submission Status */}
          {isSubmitted && (
            <div className="bg-green-900/30 border border-green-500/20 rounded-lg p-4 mb-8">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                <span className="text-green-400">Initial submission complete!</span>
              </div>
              <p className="text-gray-300 text-sm mt-2">
                You can still update your submission and add your YouTube video link until April 2nd, 2025.
              </p>
            </div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-900/30 text-red-400 p-4 rounded-lg mb-6 flex items-center"
            >
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-900/30 text-green-400 p-4 rounded-lg mb-6 flex items-center"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              {success}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-300 mb-2">Team Name</label>
                <input
                  type="text"
                  value={formData.teamName}
                  className="w-full px-4 py-2 bg-white/5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-white"
                  disabled
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Registration ID</label>
                <input
                  type="text"
                  value={formData.registrationId}
                  className="w-full px-4 py-2 bg-white/5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-white"
                  disabled
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">College Name</label>
                <input
                  type="text"
                  value={formData.collegeName}
                  onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">WhatsApp Number</label>
                <input
                  type="tel"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Product Description</label>
              <textarea
                value={formData.productDescription}
                onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-white"
                rows={4}
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Solution Overview</label>
              <textarea
                value={formData.solution}
                onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-white"
                rows={4}
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">
                Upload Presentation (PPT)
                <span className="text-purple-400 ml-2 text-sm">Max size: 10MB</span>
              </label>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pptx"
                  className="hidden"
                  id="ppt-upload"
                />
                <label
                  htmlFor="ppt-upload"
                  className="flex items-center justify-center px-4 py-2 bg-white/5 rounded-lg border-2 border-dashed border-purple-500/30 hover:border-purple-500/50 cursor-pointer"
                >
                  <Upload className="w-5 h-5 text-purple-400 mr-2" />
                  <span className="text-gray-300">
                    {file ? file.name : formData.fileUrl ? 'Replace current presentation' : 'Choose PPT file'}
                  </span>
                </label>
              </div>
              {formData.fileUrl && !file && (
                <div className="mt-2 flex items-center text-green-400">
                  <FileText className="w-4 h-4 mr-2" />
                  <span className="text-sm">Presentation uploaded</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-gray-300 mb-2">
                YouTube Video Link
                <span className="text-purple-400 ml-2 text-sm">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Submit by April 2nd, 2025
                </span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={formData.youtubeLink}
                  onChange={(e) => setFormData({ ...formData, youtubeLink: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-4 py-2 bg-white/5 rounded-lg pl-10 focus:ring-2 focus:ring-purple-500 outline-none text-white"
                />
                <Youtube className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-white font-semibold flex items-center justify-center ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  {isSubmitted ? 'Update Submission' : 'Submit Entry'}
                  <Upload className="w-5 h-5 ml-2" />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default PhaseOneForm;
