import { useNavigate } from 'react-router-dom';

export const VoiceAssistantFab = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      <div className="group relative">
        <button
          type="button"
          className="floating-assistant"
          aria-label="Trợ lý pháp lý AI"
          onClick={() => navigate('/support')}
        >
          <span className="pointer-events-none absolute inset-0 -z-10 animate-ping rounded-full bg-brand-secondary/20" />
          <span className="absolute inset-0 rounded-full bg-brand-secondary/10 transition group-hover:bg-brand-secondary/20" />
          <span
            className="material-symbols-outlined relative z-10 text-[30px] md:text-[34px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            record_voice_over
          </span>
        </button>

        <div className="pointer-events-none absolute bottom-full right-0 mb-3 hidden whitespace-nowrap rounded-2xl border border-border-base bg-surface-card px-4 py-3 text-sm font-bold text-brand-primary shadow-card group-hover:block md:block md:opacity-0 md:transition md:group-hover:opacity-100">
          Trợ lý AI: &quot;Tôi có thể giúp gì cho bạn?&quot;
        </div>
      </div>
    </div>
  );
};
