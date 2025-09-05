export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <div className="text-center lg:text-left">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            QoderResume
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            AI-Powered Resume Optimization Platform
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-2">Resume Analysis</h2>
              <p className="text-gray-600">AI-powered parsing and ATS scoring</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-2">Job Tracking</h2>
              <p className="text-gray-600">Manage applications and follow-ups</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-2">JD Matching</h2>
              <p className="text-gray-600">Compare resumes with job descriptions</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}