import React, { createContext, useContext, useEffect, useState } from 'react';

export interface AccessibilitySettings {
  contrastMode: 'normal' | 'high' | 'dark';
  fontSize: 'Small' | 'Medium' | 'Large' | 'XL';
  dyslexiaFont: boolean;
  lineSpacing: boolean;
  animations: boolean;
  captions: boolean;
  keyboardMode: boolean;
  simplifyLanguage: boolean;
  colorBlindFriendly: boolean;
  chatScrolling: boolean;
}

const defaultSettings: AccessibilitySettings = {
  contrastMode: 'normal',
  fontSize: 'Medium',
  dyslexiaFont: false,
  lineSpacing: false,
  animations: true,
  captions: true,
  keyboardMode: true,
  simplifyLanguage: false,
  colorBlindFriendly: false,
  chatScrolling: true,
};

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => void;
  resetSettings: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    const stored = localStorage.getItem('accessibility-settings');
    if (stored) {
      try {
        return { ...defaultSettings, ...JSON.parse(stored) };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      localStorage.setItem('accessibility-settings', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.setItem('accessibility-settings', JSON.stringify(defaultSettings));
  };

  // Apply settings to document
  useEffect(() => {
    const root = document.documentElement;

    // Remove existing accessibility classes
    root.classList.remove(
      'accessibility-high-contrast',
      'accessibility-dark-mode',
      'accessibility-small-text',
      'accessibility-large-text',
      'accessibility-extra-large-text',
      'accessibility-increased-spacing',
      'accessibility-reduced-motion',
      'accessibility-colorblind-friendly',
      'accessibility-readable-font'
    );

    // Apply contrast mode
    if (settings.contrastMode === 'high') {
      root.classList.add('accessibility-high-contrast');
    } else if (settings.contrastMode === 'dark') {
      root.classList.add('accessibility-dark-mode');
    }

    // Apply font size
    if (settings.fontSize === 'Small') {
      root.classList.add('accessibility-small-text');
    } else if (settings.fontSize === 'Large') {
      root.classList.add('accessibility-large-text');
    } else if (settings.fontSize === 'XL') {
      root.classList.add('accessibility-extra-large-text');
    }

    // Apply dyslexia-friendly font
    if (settings.dyslexiaFont) {
      root.classList.add('accessibility-readable-font');
    }

    // Apply line spacing
    if (settings.lineSpacing) {
      root.classList.add('accessibility-increased-spacing');
    }

    // Apply reduced motion
    if (!settings.animations) {
      root.classList.add('accessibility-reduced-motion');
    }

    // Apply colorblind friendly mode
    if (settings.colorBlindFriendly) {
      root.classList.add('accessibility-colorblind-friendly');
    }
  }, [settings]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key === 'a') {
        event.preventDefault();
        const button = document.querySelector('[data-accessibility-trigger]') as HTMLButtonElement;
        if (button) {
          button.click();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <AccessibilityContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
