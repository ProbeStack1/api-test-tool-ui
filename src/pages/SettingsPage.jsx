import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Shield, ChevronDown, ChevronUp, User, Bell, Globe, Database, Lock, FileText, Save, Check } from 'lucide-react';
import clsx from 'clsx';

/**
 * Settings Page - General and Certification sections with accordions
 */
export default function SettingsPage() {
  const navigate = useNavigate();
  
  // Accordion states
  const [generalOpen, setGeneralOpen] = useState(true);
  const [certificationOpen, setCertificationOpen] = useState(false);
  
  // General settings state
  const [generalSettings, setGeneralSettings] = useState({
    username: 'admin',
    email: 'admin@probestack.io',
    language: 'en',
    timezone: 'UTC',
    notifications: true,
    autoSave: true,
    theme: 'dark',
  });
  
  // Certification settings state
  const [certSettings, setCertSettings] = useState({
    sslVerification: true,
    certPath: '',
    keyPath: '',
    caBundle: '',
    clientCert: false,
    strictSSL: true,
  });
  
  // Save feedback state
  const [savedSection, setSavedSection] = useState(null);
  
  const handleSave = (section) => {
    setSavedSection(section);
    setTimeout(() => setSavedSection(null), 2000);
  };
  
  const handleGeneralChange = (field, value) => {
    setGeneralSettings(prev => ({ ...prev, [field]: value }));
  };
  
  const handleCertChange = (field, value) => {
    setCertSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-probestack-bg text-white min-h-0">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
            <p className="text-sm text-gray-400">Configure your application preferences and security settings</p>
          </div>

          {/* General Accordion */}
          <div className="rounded-xl border border-dark-700 bg-dark-800/40 overflow-hidden">
            <button
              onClick={() => setGeneralOpen(!generalOpen)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-dark-800/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">General</h2>
                  <p className="text-xs text-gray-400">User preferences, notifications, and display settings</p>
                </div>
              </div>
              {generalOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            {generalOpen && (
              <div className="p-4 border-t border-dark-700 space-y-4">
                {/* Profile Section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <User className="w-3.5 h-3.5" />
                    Profile Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">Username</label>
                      <input
                        type="text"
                        value={generalSettings.username}
                        onChange={(e) => handleGeneralChange('username', e.target.value)}
                        className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">Email</label>
                      <input
                        type="email"
                        value={generalSettings.email}
                        onChange={(e) => handleGeneralChange('email', e.target.value)}
                        className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Preferences Section */}
                <div className="space-y-3 pt-4 border-t border-dark-700/50">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    Preferences
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">Language</label>
                      <select
                        value={generalSettings.language}
                        onChange={(e) => handleGeneralChange('language', e.target.value)}
                        className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="zh">Chinese</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">Timezone</label>
                      <select
                        value={generalSettings.timezone}
                        onChange={(e) => handleGeneralChange('timezone', e.target.value)}
                        className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="UTC">UTC</option>
                        <option value="EST">EST (Eastern)</option>
                        <option value="PST">PST (Pacific)</option>
                        <option value="GMT">GMT</option>
                        <option value="IST">IST (India)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Notifications Toggle */}
                <div className="flex items-center justify-between pt-4 border-t border-dark-700/50">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">Enable Notifications</span>
                  </div>
                  <button
                    onClick={() => handleGeneralChange('notifications', !generalSettings.notifications)}
                    className={clsx(
                      'w-11 h-6 rounded-full transition-colors relative',
                      generalSettings.notifications ? 'bg-primary' : 'bg-dark-700'
                    )}
                  >
                    <span
                      className={clsx(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                        generalSettings.notifications ? 'left-6' : 'left-1'
                      )}
                    />
                  </button>
                </div>

                {/* Auto-save Toggle */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Save className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">Auto-save Requests</span>
                  </div>
                  <button
                    onClick={() => handleGeneralChange('autoSave', !generalSettings.autoSave)}
                    className={clsx(
                      'w-11 h-6 rounded-full transition-colors relative',
                      generalSettings.autoSave ? 'bg-primary' : 'bg-dark-700'
                    )}
                  >
                    <span
                      className={clsx(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                        generalSettings.autoSave ? 'left-6' : 'left-1'
                      )}
                    />
                  </button>
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t border-dark-700/50 flex justify-end">
                  <button
                    onClick={() => handleSave('general')}
                    className={clsx(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                      savedSection === 'general'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-primary text-white hover:bg-primary/90'
                    )}
                  >
                    {savedSection === 'general' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Certification Accordion */}
          <div className="rounded-xl border border-dark-700 bg-dark-800/40 overflow-hidden">
            <button
              onClick={() => setCertificationOpen(!certificationOpen)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-dark-800/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Certification</h2>
                  <p className="text-xs text-gray-400">SSL/TLS certificates and security settings</p>
                </div>
              </div>
              {certificationOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            {certificationOpen && (
              <div className="p-4 border-t border-dark-700 space-y-4">
                {/* SSL Verification Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">SSL Certificate Verification</span>
                  </div>
                  <button
                    onClick={() => handleCertChange('sslVerification', !certSettings.sslVerification)}
                    className={clsx(
                      'w-11 h-6 rounded-full transition-colors relative',
                      certSettings.sslVerification ? 'bg-primary' : 'bg-dark-700'
                    )}
                  >
                    <span
                      className={clsx(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                        certSettings.sslVerification ? 'left-6' : 'left-1'
                      )}
                    />
                  </button>
                </div>

                {/* Strict SSL Toggle */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">Strict SSL Mode</span>
                  </div>
                  <button
                    onClick={() => handleCertChange('strictSSL', !certSettings.strictSSL)}
                    className={clsx(
                      'w-11 h-6 rounded-full transition-colors relative',
                      certSettings.strictSSL ? 'bg-primary' : 'bg-dark-700'
                    )}
                  >
                    <span
                      className={clsx(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                        certSettings.strictSSL ? 'left-6' : 'left-1'
                      )}
                    />
                  </button>
                </div>

                {/* Client Certificate Toggle */}
                <div className="flex items-center justify-between pt-2 pb-4 border-b border-dark-700/50">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">Use Client Certificate</span>
                  </div>
                  <button
                    onClick={() => handleCertChange('clientCert', !certSettings.clientCert)}
                    className={clsx(
                      'w-11 h-6 rounded-full transition-colors relative',
                      certSettings.clientCert ? 'bg-primary' : 'bg-dark-700'
                    )}
                  >
                    <span
                      className={clsx(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                        certSettings.clientCert ? 'left-6' : 'left-1'
                      )}
                    />
                  </button>
                </div>

                {/* Certificate Paths */}
                {certSettings.clientCert && (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" />
                      Certificate Paths
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-400">Certificate File (PEM)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={certSettings.certPath}
                            onChange={(e) => handleCertChange('certPath', e.target.value)}
                            placeholder="/path/to/certificate.pem"
                            className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                          />
                          <button className="px-3 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-xs text-gray-300 transition-colors">
                            Browse
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-400">Private Key File</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={certSettings.keyPath}
                            onChange={(e) => handleCertChange('keyPath', e.target.value)}
                            placeholder="/path/to/private.key"
                            className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                          />
                          <button className="px-3 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-xs text-gray-300 transition-colors">
                            Browse
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-400">CA Bundle (Optional)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={certSettings.caBundle}
                            onChange={(e) => handleCertChange('caBundle', e.target.value)}
                            placeholder="/path/to/ca-bundle.crt"
                            className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                          />
                          <button className="px-3 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-xs text-gray-300 transition-colors">
                            Browse
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Certificate Info Box */}
                <div className="rounded-lg bg-dark-900/50 border border-dark-700 p-3 mt-4">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-primary mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-xs font-medium text-white mb-1">Certificate Information</h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Configure SSL/TLS certificates for secure API testing. Enable client certificates 
                        when your API requires mutual TLS authentication. Certificate files should be 
                        in PEM format.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t border-dark-700/50 flex justify-end">
                  <button
                    onClick={() => handleSave('certification')}
                    className={clsx(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                      savedSection === 'certification'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-primary text-white hover:bg-primary/90'
                    )}
                  >
                    {savedSection === 'certification' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer - same as Home page */}
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
              <span className="font-semibold gradient-text font-heading">ForgeQ</span>
              <span className="text-gray-400">
                © {new Date().getFullYear()} All rights reserved
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="/privacy-policy"
                className="hover:text-[#ff5b1f] transition-colors text-gray-400"
              >
                Privacy Policy
              </a>
              <a
                href="/terms-of-service"
                className="hover:text-[#ff5b1f] transition-colors text-gray-400"
              >
                Terms of Service
              </a>
              <a
                href="/security"
                className="hover:text-[#ff5b1f] transition-colors text-gray-400"
              >
                Security
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
