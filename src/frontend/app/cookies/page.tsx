import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata = {
  title: 'Cookie Policy - QoderResume',
  description: 'Learn about how QoderResume uses cookies and similar technologies.',
};

export default function CookiePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Cookie Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-lg text-gray-700 mb-8">
              This Cookie Policy explains how QoderResume uses cookies and similar technologies to provide, 
              improve, and secure our AI-powered resume optimization services.
            </p>
            
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">What Are Cookies?</h2>
            <p className="text-gray-700 mb-6">
              Cookies are small text files stored on your device when you visit our website. They help us provide 
              a better user experience by remembering your preferences and maintaining your session.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Types of Cookies We Use</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Essential Cookies</h3>
            <p className="text-gray-700 mb-4">These cookies are necessary for the website to function properly:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li><strong>Authentication Cookies:</strong> Maintain your login session using NextAuth.js</li>
              <li><strong>Security Cookies:</strong> Protect against CSRF attacks and ensure secure transactions</li>
              <li><strong>Session Cookies:</strong> Remember your preferences during your visit</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Functional Cookies</h3>
            <p className="text-gray-700 mb-4">These cookies enhance your experience on our platform:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li><strong>User Preferences:</strong> Remember your dashboard layout and settings</li>
              <li><strong>Language Settings:</strong> Store your preferred language and region</li>
              <li><strong>Theme Preferences:</strong> Remember your dark/light mode selection</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Analytics Cookies</h3>
            <p className="text-gray-700 mb-4">These cookies help us understand how users interact with our service:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li><strong>Usage Analytics:</strong> Track feature usage to improve our platform</li>
              <li><strong>Performance Monitoring:</strong> Monitor website performance and errors</li>
              <li><strong>A/B Testing:</strong> Test different features to enhance user experience</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Third-Party Cookies</h2>
            <p className="text-gray-700 mb-4">We may use third-party services that set their own cookies:</p>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h4 className="font-semibold text-gray-800 mb-2">Stripe (Payment Processing)</h4>
              <p className="text-gray-700 text-sm">
                Stripe uses cookies to process payments securely and prevent fraud. These cookies are essential 
                for subscription management and payment processing.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h4 className="font-semibold text-gray-800 mb-2">AI Providers</h4>
              <p className="text-gray-700 text-sm">
                Our AI providers (Gemini, OpenAI, Claude) may set cookies when processing your resume data. 
                These are used for authentication and rate limiting purposes only.
              </p>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Cookie Management</h2>
            <p className="text-gray-700 mb-4">You can control cookies through:</p>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Browser Settings</h3>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>Most browsers allow you to block or delete cookies</li>
              <li>You can set your browser to notify you when cookies are being used</li>
              <li>Private/Incognito browsing mode limits cookie storage</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Our Cookie Preferences</h3>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
              <p className="text-blue-800">
                <strong>Cookie Preferences Center:</strong> We provide a cookie management interface 
                where you can control non-essential cookies. Access this through your account settings 
                or the cookie banner on your first visit.
              </p>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Data Retention</h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li><strong>Session Cookies:</strong> Deleted when you close your browser</li>
              <li><strong>Authentication Cookies:</strong> Valid for 30 days or until logout</li>
              <li><strong>Preference Cookies:</strong> Stored for up to 1 year</li>
              <li><strong>Analytics Cookies:</strong> Retained for up to 2 years (anonymized)</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Legal Basis</h2>
            <p className="text-gray-700 mb-4">We use cookies based on:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li><strong>Legitimate Interest:</strong> For essential functionality and security</li>
              <li><strong>Consent:</strong> For analytics and non-essential features</li>
              <li><strong>Contract Performance:</strong> For providing our paid services</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Impact of Disabling Cookies</h2>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6">
              <p className="text-amber-800">
                <strong>Important:</strong> Disabling essential cookies may prevent you from using key features 
                of QoderResume, including logging in, uploading resumes, and accessing your dashboard.
              </p>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about our use of cookies, contact us at:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">
                Email: privacy@qoderresume.com<br />
                Subject: Cookie Policy Inquiry<br />
                We'll respond within 48 hours.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}