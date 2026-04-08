export default function SessionSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 animate-pulse">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Row 1: back + buttons */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="h-3 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
          </div>

          {/* Row 2: session name */}
          <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded mt-1 mb-2" />

          {/* Row 3: member filter pills */}
          <div className="flex flex-wrap gap-1.5 mt-1">
            <div className="h-5 w-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Action bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="flex gap-2">
            <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
        </div>

        {/* Search bar */}
        <div className="h-9 w-full bg-gray-200 dark:bg-gray-700 rounded-lg mb-4" />

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
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
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
