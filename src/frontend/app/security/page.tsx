import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata = {
  title: 'Security Policy - QoderResume',
  description: 'Learn about QoderResume security measures and data protection protocols.',
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Security Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-lg text-gray-700 mb-8">
              Security is fundamental to QoderResume. We implement comprehensive security measures to protect your personal information 
              and resume data throughout our platform.
            </p>
            
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Data Encryption</h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>All data transmission uses TLS 1.3 encryption</li>
              <li>Database encryption at rest using AES-256</li>
              <li>Resume files encrypted using industry-standard algorithms</li>
              <li>API communications secured with HTTPS</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">File Upload Security</h2>
            <p className="text-gray-700 mb-4">Our file upload system implements multiple security layers:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>File type validation using magic number verification</li>
              <li>Maximum file size limit of 10MB</li>
              <li>Virus and malware scanning</li>
              <li>Supported formats: PDF, DOCX, TXT only</li>
              <li>Secure filename generation to prevent path traversal attacks</li>
              <li>Content sanitization before AI processing</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Authentication & Authorization</h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>JWT-based authentication with refresh tokens</li>
              <li>Role-based access control (User/Admin)</li>
              <li>Password hashing using bcrypt with salt rounds</li>
              <li>Session management and automatic logout</li>
              <li>Multi-factor authentication support (planned)</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">API Security</h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>Rate limiting on all API endpoints</li>
              <li>CORS protection with domain whitelisting</li>
              <li>Input validation using class-validator</li>
              <li>SQL injection prevention through parameterized queries</li>
              <li>Request size limits and timeout configurations</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Third-Party Integrations</h2>
            <p className="text-gray-700 mb-4">We maintain security standards with our integration partners:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li><strong>AI Providers (Gemini, OpenAI, Claude):</strong> Data processing agreements and automatic data deletion</li>
              <li><strong>Stripe:</strong> PCI DSS compliant payment processing</li>
              <li><strong>Supabase:</strong> SOC 2 Type II certified database hosting</li>
              <li><strong>Redis:</strong> Secured cache with authentication and encryption</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Infrastructure Security</h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>Dockerized deployment with security scanning</li>
              <li>Nginx reverse proxy with security headers</li>
              <li>Regular security updates and patch management</li>
              <li>Network isolation and firewall protection</li>
              <li>Automated backup and disaster recovery</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Incident Response</h2>
            <p className="text-gray-700 mb-4">In the event of a security incident:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>Immediate containment and assessment procedures</li>
              <li>User notification within 72 hours if personal data is affected</li>
              <li>Cooperation with law enforcement when required</li>
              <li>Post-incident analysis and security improvements</li>
              <li>Regulatory compliance reporting (GDPR, CCPA)</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Security Audits</h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>Regular penetration testing by third-party security firms</li>
              <li>Automated vulnerability scanning</li>
              <li>Code security reviews and static analysis</li>
              <li>Employee security training and awareness programs</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Report Security Issues</h2>
            <p className="text-gray-700 mb-4">
              If you discover a security vulnerability, please report it responsibly:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">
                Email: security@qoderresume.com<br />
                PGP Key: [PGP Key ID]<br />
                We commit to responding within 24 hours and providing updates on our investigation.
              </p>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-8">
              <p className="text-blue-800">
                <strong>Security Notice:</strong> We continuously monitor and improve our security measures. 
                This policy is reviewed quarterly and updated as needed to address emerging threats.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}