import React from 'react';

/**
 * Props (either/or):
 * - pharmacyId: string  -> used only when role === 'customer' (start chat with this pharmacy)
 * - threadId: string  -> used for existing threads (vendor flow or customer opening from list)
 * - onBackRoute?: string
 * - onClose?: () => void
 */

export default function ChatThread({ onBackRoute, onClose }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-white">
      {/* Header */}
      <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto pt-1 pb-1 sticky top-0 z-20 bg-white text-brand-primary shadow">
        <div className="px-4 sm:px-5 pt-6 pb-3 border-b border-brand-primary/30 flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { onClose?.(); }}
              className="rounded-full border border-brand-primary/30 px-3 sm:px-4 py-1 bg-white text-brand-primary"
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {/* No messaging feature content */}
      <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto flex-1 flex flex-col items-center justify-center">
        <p className="text-center text-gray-500">
          Messaging feature has been removed.
        </p>
      </div>
    </div>
  );
}
