import React from 'react';
import { useLocation } from 'react-router-dom';
import { PreferencesDialog } from '@/components/PreferencesDialog';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  // Hide header on index/landing page to avoid overlap
  const isIndexRoute = location.pathname === '/' || location.pathname === '' || location.pathname === '/index';
  const showHeader = !isIndexRoute;

  return (
    <div className="min-h-screen w-full">
      {/* Skip Links for Keyboard Navigation - WCAG 2.4.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {showHeader && (
        <a
          href="#settings"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-48 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none"
        >
          Skip to settings
        </a>
      )}

      {/* Header with Preferences Access - Hidden on landing page */}
      {showHeader && (
        <header id="settings" className="fixed top-4 right-4 z-50 flex gap-2">
          <PreferencesDialog>
            <Button
              variant="outline"
              size="icon"
              className="bg-background/80 backdrop-blur-sm border-border hover:bg-accent hover:text-accent-foreground"
              aria-label="Open accessibility and preferences settings"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
            </Button>
          </PreferencesDialog>
        </header>
      )}

      <main id="main-content" className="w-full" role="main">
        {children}
      </main>
    </div>
  );
}
