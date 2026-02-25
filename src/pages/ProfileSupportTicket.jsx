import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import {
  Upload,
  Clock,
  Loader2,
  ArrowLeft,
} from "lucide-react";

export const ProfileSupportTicket = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Helper function to format name from email or regular name
  const formatDisplayName = (name) => {
    if (!name) return "";
    
    if (name.includes("@")) {
      const beforeAt = name.split("@")[0];
      let formatted = beforeAt
        .replace(/[._-]/g, " ")
        .trim();
      formatted = formatted
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
      return formatted || "";
    }
    
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    productArea: "",
    subject: "",
    description: ""
  });

  // Pre-populate form with user info from localStorage
  useEffect(() => {
    const userEmail = localStorage.getItem("userEmail") || "";
    const userFirstName = localStorage.getItem("userFirstName") || "";
    const displayName = formatDisplayName(userFirstName);
    
    setFormData(prev => ({
      ...prev,
      fullName: displayName,
      email: userEmail
    }));
  }, []);

  const [attachments, setAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const productAreas = [
    { value: "", label: "Select an area" },
    { value: "dashboard", label: "Dashboard & Analytics" },
    { value: "api", label: "API & SDKs" },
    { value: "billing", label: "Billing & Subscriptions" },
    { value: "integrations", label: "Third-party Integrations" },
    { value: "security", label: "Security & Access" },
    { value: "other", label: "Other" }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'application/zip'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name} is not a valid file type`);
        return false;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name} exceeds 10MB limit`);
        return false;
      }
      return true;
    });
    setAttachments(prev => [...prev, ...validFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => {
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'application/zip'];
      const maxSize = 10 * 1024 * 1024;
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name} is not a valid file type`);
        return false;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name} exceeds 10MB limit`);
        return false;
      }
      return true;
    });
    setAttachments(prev => [...prev, ...validFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    if (!formData.productArea) {
      toast.error("Please select a product area");
      return;
    }
    if (!formData.subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Please describe your issue");
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting ticket:", error);
      toast.error("Failed to submit ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-probestack-bg flex flex-col overflow-y-auto">
      {/* Subtle background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <main className="flex-grow flex items-start justify-center px-4 sm:px-6 pb-20 pt-8">
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Link
              to="/workspace/profile/support"
              className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Help Center
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-center mb-10"
          >
            <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
              <span className="bg-gradient-to-r from-primary via-amber-500 to-teal-500 bg-clip-text text-transparent">Raise a Support Ticket</span>
            </h1>
            <p className="text-gray-400 max-w-md mx-auto">
              Tell us about the issue you&apos;re facing. Our technical experts
              will get back to you shortly.
            </p>
          </motion.div>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-dark-700 bg-dark-800/50 p-8 text-center"
            >
              <p className="text-white font-medium mb-2">
                Thank you for reaching out.
              </p>
              <p className="text-gray-400 text-sm mb-6">
                We&apos;ve received your ticket and will respond within 24
                hours.
              </p>
              <Button variant="outline" asChild>
                <Link to="/workspace/profile/support">Back to Help Center</Link>
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-dark-700 bg-dark-800/80 backdrop-blur-sm p-8 md:p-10 shadow-xl"
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-white">
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      placeholder="John Doe"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="name@company.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productArea" className="text-white">
                    Product Area
                  </Label>
                  <select
                    id="productArea"
                    name="productArea"
                    value={formData.productArea}
                    onChange={handleInputChange}
                    required
                    className="flex h-11 w-full rounded-lg border border-dark-700 bg-dark-900/60 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
                  >
                    {productAreas.map((opt, i) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                        disabled={i === 0}
                      >
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-white">
                    Subject
                  </Label>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="Brief summary of the issue"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Please provide as much detail as possible..."
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={5}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">
                    Attachments (Optional)
                  </Label>
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border-2 border-dashed border-dark-700 hover:border-primary/50 bg-dark-700/30 p-6 flex flex-col items-center justify-center cursor-pointer group transition-colors"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.zip"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Upload className="h-8 w-8 text-primary mb-2" />
                    <p className="text-sm font-medium text-white group-hover:text-primary transition-colors">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PDF, PNG, JPG or ZIP (max. 10MB)
                    </p>
                    {attachments.length > 0 && (
                      <p className="text-xs text-primary mt-2">
                        {attachments.length} file(s) selected
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    variant="default"
                    className="w-full py-4 font-semibold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Support Ticket"
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2">
                  <Clock className="h-4 w-4" />
                  <span>Estimated response time: &lt; 24 hours</span>
                </div>
              </form>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-12 text-center"
          >
            <p className="text-sm text-gray-400">
              Need immediate assistance?{" "}
              <Link to="/contact" className="text-primary hover:underline font-medium">
                Contact us
              </Link>{" "}
              or check our{" "}
              <Link to="/workspace/profile/support" className="text-primary hover:underline font-medium">
                Help Center
              </Link>
              .
            </p>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-700/50 shrink-0 bg-dark-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-gray-400 md:flex-row">
            <div className="flex items-center gap-2">
              <img
                src="/assets/justlogo.png"
                alt="ProbeStack logo"
                className="h-6 w-auto"
                onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
              />
              <span className="font-semibold gradient-text font-heading">ProbeStack</span>
              <span className="text-gray-400">
                © {new Date().getFullYear()} All rights reserved
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a href="/privacy-policy" className="hover:text-[#ff5b1f] transition-colors text-gray-400">
                Privacy Policy
              </a>
              <a href="/terms-of-service" className="hover:text-[#ff5b1f] transition-colors text-gray-400">
                Terms of Service
              </a>
              <a href="/security" className="hover:text-[#ff5b1f] transition-colors text-gray-400">
                Security
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
