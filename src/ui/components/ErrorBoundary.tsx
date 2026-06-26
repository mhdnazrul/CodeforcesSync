import React from "react";
import Button from "./Button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error.message };
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-[350px] h-[500px] flex flex-col items-center justify-center bg-[#F4F4F5] p-6">
          <svg className="w-12 h-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h2 className="font-bold font-mono text-sm mb-2">Something went wrong</h2>
          <p className="font-mono text-[11px] text-gray-600 text-center mb-4 max-w-[260px]">
            {this.state.errorMessage || "An unexpected error occurred."}
          </p>
          <Button variant="primary" onClick={this.handleReset}>
            Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
