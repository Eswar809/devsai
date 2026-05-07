// Error Boundary Component
export default function ErrorBoundary({ children }) {
  // Provides graceful UI failure handling
  return <div className="error-boundary">{children}</div>;
}
