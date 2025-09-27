import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AccessibilitySidebar, AccessibilityTrigger } from '@/components/AccessibilitySidebar';
import { PreferencesDialog } from '@/components/PreferencesDialog';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  
  // Hide header on index/landing page to avoid overlap
  const isIndexRoute = location.pathname === '/' || location.pathname === '' || location.pathname === '/index';
  const showHeader = !isIndexRoute;

  return (
    <div className="min-h-screen w-full">
      {/* Header with Preferences Access - Hidden on landing page */}
      {showHeader && (
        <header className="fixed top-4 right-4 z-50 flex gap-2">
          <PreferencesDialog>
            <Button
              variant="outline"
              size="icon"
              className="bg-background/80 backdrop-blur-sm border-border hover:bg-accent hover:text-accent-foreground"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </PreferencesDialog>
        </header>
      )}

      <main className="w-full">
        {children}
      </main>
      <AccessibilitySidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      <AccessibilityTrigger onToggle={() => setSidebarOpen(!sidebarOpen)} />
    </div>
  );
}