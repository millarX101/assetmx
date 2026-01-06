import { ChatApplication } from '@/components/chat/ChatApplication';
import { SEO } from '@/components/SEO';

export function ChatApply() {
  return (
    <>
      <SEO
        title="Apply for Asset Finance | Quick Online Application | AssetMX"
        description="Apply for asset finance in 10 minutes. Chat-based application, instant ABN lookup, same-day approval. No paperwork, no phone calls - 100% online."
        keywords="apply for finance, asset finance application, quick finance approval, online finance application, ABN finance"
        canonicalUrl="https://assetmx.com.au/chat-apply"
      />
      <ChatApplication />
    </>
  );
}
