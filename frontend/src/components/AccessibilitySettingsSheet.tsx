import React, { useState } from 'react';
import { Accessibility, Volume2, Mic, Type, Eye, Zap, RotateCcw } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAccessibility } from '@/contexts/AccessibilityContext';

interface AccessibilitySettingsSheetProps {
  children: React.ReactNode;
}

export const AccessibilitySettingsSheet: React.FC<AccessibilitySettingsSheetProps> = ({ children }) => {
  const { settings, updateSetting, resetSettings } = useAccessibility();
  const [isOpen, setIsOpen] = useState(false);

  const contrastOptions = [
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High Contrast' },
    { value: 'dark', label: 'Dark Mode' },
  ] as const;

  const fontSizeOptions = [
    { value: 'Small', label: 'Small' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Large', label: 'Large' },
    { value: 'XL', label: 'Extra Large' },
  ] as const;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger 
        asChild 
        data-accessibility-trigger
        aria-label="Open accessibility settings (Alt+A)"
      >
        {children}
      </SheetTrigger>
      <SheetContent 
        className="w-[400px] sm:w-[540px] overflow-y-auto"
        aria-describedby="accessibility-description"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Accessibility className="h-5 w-5" />
            Accessibility Settings
          </SheetTitle>
          <SheetDescription id="accessibility-description">
            Customize your experience to meet your accessibility needs. Changes are saved automatically.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Visual Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <h3 className="font-semibold">Visual Settings</h3>
            </div>
            
            {/* Contrast Mode */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Contrast Mode</Label>
              <div className="grid grid-cols-1 gap-2">
                {contrastOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateSetting('contrastMode', option.value)}
                    className={`text-left p-3 rounded-md border transition-colors ${
                      settings.contrastMode === option.value
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    aria-pressed={settings.contrastMode === option.value}
                    role="radio"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Font Size</Label>
              <div className="grid grid-cols-2 gap-2">
                {fontSizeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateSetting('fontSize', option.value)}
                    className={`text-left p-3 rounded-md border transition-colors ${
                      settings.fontSize === option.value
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    aria-pressed={settings.fontSize === option.value}
                    role="radio"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Line Spacing */}
            <div className="flex items-center justify-between">
              <Label htmlFor="line-spacing" className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Increased Line Spacing
              </Label>
              <Switch
                id="line-spacing"
                checked={settings.lineSpacing}
                onCheckedChange={(checked) => updateSetting('lineSpacing', checked)}
                aria-describedby="line-spacing-desc"
              />
            </div>
            <p id="line-spacing-desc" className="text-sm text-muted-foreground">
              Increases space between lines for better readability
            </p>
          </div>

          <Separator />

          {/* Motion Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <h3 className="font-semibold">Motion & Animation</h3>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="animations" className="flex-1">
                Enable Animations
              </Label>
              <Switch
                id="animations"
                checked={settings.animations}
                onCheckedChange={(checked) => updateSetting('animations', checked)}
                aria-describedby="animations-desc"
              />
            </div>
            <p id="animations-desc" className="text-sm text-muted-foreground">
              Disable to reduce motion and visual distractions
            </p>

            <div className="flex items-center justify-between">
              <Label htmlFor="chat-scrolling" className="flex-1">
                Smooth Chat Scrolling
              </Label>
              <Switch
                id="chat-scrolling"
                checked={settings.chatScrolling}
                onCheckedChange={(checked) => updateSetting('chatScrolling', checked)}
                aria-describedby="chat-scrolling-desc"
              />
            </div>
            <p id="chat-scrolling-desc" className="text-sm text-muted-foreground">
              Enable smooth scrolling in chat messages
            </p>
          </div>

          <Separator />

          {/* Audio Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              <h3 className="font-semibold">Audio Settings</h3>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="tts" className="flex items-center gap-2 flex-1">
                <Volume2 className="h-4 w-4" />
                Text-to-Speech
              </Label>
              <Switch
                id="tts"
                checked={settings.textToSpeech}
                onCheckedChange={(checked) => updateSetting('textToSpeech', checked)}
                aria-describedby="tts-desc"
              />
            </div>
            <p id="tts-desc" className="text-sm text-muted-foreground">
              Read AI responses aloud (requires browser support)
            </p>

            <div className="flex items-center justify-between">
              <Label htmlFor="stt" className="flex items-center gap-2 flex-1">
                <Mic className="h-4 w-4" />
                Speech-to-Text
              </Label>
              <Switch
                id="stt"
                checked={settings.speechToText}
                onCheckedChange={(checked) => updateSetting('speechToText', checked)}
                aria-describedby="stt-desc"
              />
            </div>
            <p id="stt-desc" className="text-sm text-muted-foreground">
              Use voice input for messages (requires browser support)
            </p>
          </div>

          <Separator />

          {/* Additional Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold">Additional Options</h3>

            <div className="flex items-center justify-between">
              <Label htmlFor="simplify" className="flex-1">
                Simplified Language
              </Label>
              <Switch
                id="simplify"
                checked={settings.simplifyLanguage}
                onCheckedChange={(checked) => updateSetting('simplifyLanguage', checked)}
                aria-describedby="simplify-desc"
              />
            </div>
            <p id="simplify-desc" className="text-sm text-muted-foreground">
              Request simpler explanations from the AI tutor
            </p>

            <div className="flex items-center justify-between">
              <Label htmlFor="colorblind" className="flex-1">
                Color Blind Friendly
              </Label>
              <Switch
                id="colorblind"
                checked={settings.colorBlindFriendly}
                onCheckedChange={(checked) => updateSetting('colorBlindFriendly', checked)}
                aria-describedby="colorblind-desc"
              />
            </div>
            <p id="colorblind-desc" className="text-sm text-muted-foreground">
              Adjust colors for better visibility
            </p>
          </div>

          <Separator />

          {/* Reset Settings */}
          <Button 
            onClick={resetSettings} 
            variant="outline" 
            className="w-full"
            aria-label="Reset all accessibility settings to default"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset All Settings
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};