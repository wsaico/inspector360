'use client';

import { SafetyTalkWizard } from "@/components/safety-talks/wizard/safety-talk-wizard";
import { useSearchParams } from 'next/navigation';

export default function RegisterTalkPage() {
    const searchParams = useSearchParams();
    const editId = searchParams.get('edit');

    return (
        <div className="p-6">
            <SafetyTalkWizard editId={editId || undefined} />
        </div>
    );
}
