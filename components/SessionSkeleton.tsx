export default function SessionSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 animate-pulse">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="h-3 w-10 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-6 w-44 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-3.5 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="flex gap-2 pt-1">
              <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              <div className="h-7 w-7 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Action bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="flex gap-2">
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
        </div>

        {/* Day header */}
        <div className="flex items-center justify-between mb-2">
          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>

        {/* Expense cards */}
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
