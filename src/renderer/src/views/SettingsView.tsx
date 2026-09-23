import React, { useState } from 'react';
import { SettingsSidebar, SettingsTab } from '../components/Settings/SettingsSidebar';
import { AppearanceSection } from '../components/Settings/AppearanceSection';
import { ViewportSection } from '../components/Settings/ViewportSection';
import { KeybindsSection } from '../components/Settings/KeybindsSection';
import { StorageSection } from '../components/Settings/StorageSection';
import { AiProvidersSection } from '../components/Settings/AiProvidersSection';
import { SystemInfoSection } from '../components/Settings/SystemInfoSection';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-canvas text-ink-primary select-none font-body">
      {/* Navigation Sidebar */}
      <SettingsSidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Settings Content Area */}
      <main className="flex-1 overflow-y-auto p-8 min-w-0">
        <div className="max-w-4xl space-y-8">
          {activeTab === 'appearance' && <AppearanceSection />}
          {activeTab === 'viewport' && <ViewportSection />}
          {activeTab === 'keybinds' && <KeybindsSection />}
          {activeTab === 'storage' && <StorageSection />}
          {activeTab === 'ai' && <AiProvidersSection />}
          {activeTab === 'system' && <SystemInfoSection />}
        </div>
      </main>
    </div>
  );
};
