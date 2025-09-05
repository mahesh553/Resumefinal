import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata = {
  title: 'Privacy Policy - QoderResume',
  description: 'Learn how QoderResume protects your privacy and handles your personal data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-lg text-gray-700 mb-8">
              At QoderResume, we are committed to protecting your privacy and ensuring the security of your personal information. 
              This Privacy Policy explains how we collect, use, and safeguard your data when you use our AI-powered resume optimization platform.
            </p>
            
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Information We Collect</h2>
            <p className="text-gray-700 mb-4">We collect information you provide directly to us, including:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>Account information (name, email address, password)</li>
              <li>Resume files and content you upload</li>
              <li>Job descriptions you provide for matching</li>
              <li>Usage data and analytics</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">How We Use Your Information</h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>Provide AI-powered resume analysis and optimization</li>
              <li>Generate ATS scores and improvement suggestions</li>
              <li>Match your resume with job descriptions</li>
              <li>Maintain your account and provide customer support</li>
              <li>Send important updates about our services</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">AI Provider Data Sharing</h2>
            <p className="text-gray-700 mb-4">
              To provide our AI-powered services, we may share your resume content with our AI providers:
            </p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>Google Gemini (Primary AI provider)</li>
              <li>OpenAI (Fallback provider)</li>
              <li>Anthropic Claude (Secondary fallback)</li>
            </ul>
            <p className="text-gray-700 mb-6">
              We implement strict data handling agreements with all AI providers to ensure your information is processed securely and deleted after processing.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Data Retention</h2>
            <p className="text-gray-700 mb-6">
              We retain up to 10 versions of your resume files to provide version management services. 
              You can delete your data at any time through your account settings.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Your Rights</h2>
            <p className="text-gray-700 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and data</li>
              <li>Export your data</li>
              <li>Opt out of marketing communications</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about this Privacy Policy or want to exercise your rights, please contact us at:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">
                Email: privacy@qoderresume.com<br />
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