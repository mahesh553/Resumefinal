import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata = {
  title: 'Terms of Service - QoderResume',
  description: 'Read the terms and conditions for using QoderResume AI-powered resume optimization services.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-lg text-gray-700 mb-8">
              Welcome to QoderResume. These Terms of Service govern your use of our AI-powered resume optimization platform. 
              By using our services, you agree to these terms.
            </p>
            
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Service Description</h2>
            <p className="text-gray-700 mb-6">
              QoderResume provides AI-powered resume optimization services including:
            </p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>Resume analysis and ATS scoring</li>
              <li>Skill extraction and keyword optimization</li>
              <li>Job description matching</li>
              <li>Resume version management (up to 10 versions)</li>
              <li>Job application tracking</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Subscription Plans</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Free Plan</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>7 resume analyses per month</li>
              <li>7 JD matching operations per month</li>
              <li>Basic features access</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Pro Plan</h3>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>12 resume analyses per day</li>
              <li>12 JD matching operations per day</li>
              <li>Bulk upload support</li>
              <li>Calendar integration</li>
              <li>Priority customer support</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">User Responsibilities</h2>
            <p className="text-gray-700 mb-4">You agree to:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>Provide accurate and truthful information</li>
              <li>Use the service for legitimate job search purposes</li>
              <li>Not upload malicious files or content</li>
              <li>Respect intellectual property rights</li>
              <li>Not attempt to reverse engineer our AI algorithms</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">AI Service Disclaimers</h2>
            <p className="text-gray-700 mb-6">
              Our AI-powered analysis provides suggestions and insights, but we cannot guarantee:
            </p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>Job interview success or employment outcomes</li>
              <li>100% accuracy in ATS scoring predictions</li>
              <li>Compatibility with all ATS systems</li>
              <li>Perfect resume optimization for every industry</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Intellectual Property</h2>
            <p className="text-gray-700 mb-6">
              You retain ownership of your resume content. QoderResume owns the platform, algorithms, and analysis results. 
              You grant us license to process your content to provide our services.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Account Termination</h2>
            <p className="text-gray-700 mb-6">
              We may suspend or terminate accounts for violations of these terms, illegal activity, or abuse of our services. 
              You may delete your account at any time through your account settings.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Limitation of Liability</h2>
            <p className="text-gray-700 mb-6">
              QoderResume is provided "as is" without warranties. We are not liable for any damages arising from use of our service, 
              including but not limited to employment outcomes or data loss.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Contact Information</h2>
            <p className="text-gray-700 mb-4">
              For questions about these Terms of Service, contact us at:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">
                Email: legal@qoderresume.com<br />
                Address: [Company Address]
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}