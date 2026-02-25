import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { User, Key, Sun, Bell, LogOut, Headphones, ArrowLeft } from "lucide-react";

export const Profile = () => {
  const navigate = useNavigate();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  // Helper function to format name from email or regular name
  const formatDisplayName = (name) => {
    if (!name) return "Developer";
    
    // Check if it's an email (contains @)
    if (name.includes("@")) {
      // Extract the part before @
      const beforeAt = name.split("@")[0];
      
      // Replace dots, underscores, and hyphens with spaces
      let formatted = beforeAt
        .replace(/[._-]/g, " ")
        .trim();
      
      // Capitalize first letter of each word
      formatted = formatted
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
      
      // If empty after processing, return a default
      return formatted || "Developer";
    }
    
    // If it's not an email, just capitalize the first letter
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  // Get user info from localStorage
  const userEmail = localStorage.getItem("userEmail") || "admin@test.com";
  const userFirstName = localStorage.getItem("userFirstName") || "Developer";
  const displayName = formatDisplayName(userFirstName);
  const userOrganization = localStorage.getItem("userOrganization") || "Org_admin";
  const userRole = localStorage.getItem("userRole") || "User";

  // Get initials for avatar
  const getInitials = (name) => {
    const names = name.split(" ");
    if (names.length >= 2) {
      return names[0][0] + names[1][0];
    }
    return name[0] || "U";
  };

  const handleLogout = () => {
    // Clear local storage
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("userFirstName");
    localStorage.removeItem("authToken");
    localStorage.removeItem("pendingAuthEmail");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userOrganization");
    
    // Redirect to home page
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-probestack-bg overflow-y-auto">
      {/* Back Button */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-4">
        <button
          onClick={() => navigate("/workspace/collections")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm">Back</span>
        </button>
      </div>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Section */}
        <Card className="mb-6 bg-dark-800/50 border-dark-700">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-white" />
              <CardTitle className="text-white">Profile</CardTitle>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Your account information
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-2xl font-semibold text-primary">
                  {getInitials(displayName)}
                </span>
              </div>
              {/* User Info */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">
                  {displayName}
                </h3>
                <p className="text-sm text-gray-400">{userEmail}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Organization: {userOrganization}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Role: {userRole}
                </p>
              </div>
              {/* Support Button */}
              <Button
                variant="outline"
                size="md"
                className="border-primary bg-primary text-white hover:bg-primary/90 px-4 py-2"
                onClick={() => navigate("/workspace/profile/support")}
              >
                <Headphones className="h-5 w-5 mr-2" />
                Support
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card className="mb-6 bg-dark-800/50 border-dark-700">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-white" />
              <CardTitle className="text-white">Security</CardTitle>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Manage your password and security settings
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-3">
              <div>
                <h4 className="text-sm font-medium text-white">Password</h4>
                <p className="text-sm text-gray-400">
                  Change your account password
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-dark-700 text-white hover:bg-dark-700"
              >
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Section */}
        <Card className="mb-6 bg-dark-800/50 border-dark-700">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-white" />
              <CardTitle className="text-white">Appearance</CardTitle>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Customize how the dashboard looks
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-3">
              <div>
                <h4 className="text-sm font-medium text-white">Dark Mode</h4>
                <p className="text-sm text-gray-400">
                  Toggle between light and dark themes
                </p>
              </div>
              <Switch
                checked={true}
                onCheckedChange={() => {}}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card className="mb-6 bg-dark-800/50 border-dark-700">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-white" />
              <CardTitle className="text-white">Notifications</CardTitle>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Configure notification preferences
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3">
              <div>
                <h4 className="text-sm font-medium text-white">
                  Email Notifications
                </h4>
                <p className="text-sm text-gray-400">
                  Receive email for new organization requests
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <h4 className="text-sm font-medium text-white">
                  Push Notifications
                </h4>
                <p className="text-sm text-gray-400">
                  Browser notifications for important updates
                </p>
              </div>
              <Switch
                checked={pushNotifications}
                onCheckedChange={setPushNotifications}
              />
            </div>
          </CardContent>
        </Card>

        {/* Session Section */}
        <Card className="mb-6 bg-dark-800/50 border-red-500/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-red-400" />
              <CardTitle className="text-red-400">Session</CardTitle>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Manage your current session
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-3">
              <div>
                <h4 className="text-sm font-medium text-white">Sign Out</h4>
                <p className="text-sm text-gray-400">
                  End your current session and return to login
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-red-500 text-red-400 hover:bg-red-500/10"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

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
