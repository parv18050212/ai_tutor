import React, { useState } from 'react';
import { Accessibility, Save, RotateCcw, Eye, Volume2, Keyboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { toast } from '@/components/ui/use-toast';

interface AccessibilitySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccessibilitySidebar({ isOpen, onClose }: AccessibilitySidebarProps) {
  const { settings, updateSetting, resetSettings } = useAccessibility();

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your accessibility preferences have been applied.",
    });
  };

  const handleReset = () => {
    resetSettings();
    toast({
      title: "Settings Reset",
      description: "All accessibility settings have been reset to defaults.",
    });
  };

  const fontSizeOptions = [
    { value: 'Small', label: 'Small' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Large', label: 'Large' },
    { value: 'XL', label: 'XL' },
  ] as const;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div 
        className="fixed right-0 top-0 h-full w-80 bg-card border-l border-border shadow-xl transform transition-transform duration-300 ease-in-out overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Accessibility className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Accessibility</h2>
                <p className="text-sm text-muted-foreground">Customize your experience</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
              aria-label="Close accessibility sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Visual Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <h3 className="font-semibold text-foreground">Visual</h3>
            </div>
            
            {/* High Contrast Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="contrast" className="text-sm font-medium">
                High Contrast Mode
              </Label>
              <Switch
                id="contrast"
                checked={settings.contrastMode === 'high'}
                onCheckedChange={(checked) => 
                  updateSetting('contrastMode', checked ? 'high' : 'normal')
                }
              />
            </div>

            {/* Font Size Radio Group */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Text Size</Label>
              <RadioGroup
                value={settings.fontSize}
                onValueChange={(value) => updateSetting('fontSize', value as 'Small' | 'Medium' | 'Large' | 'XL')}
                className="grid grid-cols-2 gap-2"
              >
                {fontSizeOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`fontSize-${option.value}`} />
                    <Label 
                      htmlFor={`fontSize-${option.value}`} 
                      className="text-xs cursor-pointer"
                      style={{ fontSize: option.value === 'Small' ? '12px' : option.value === 'Large' ? '16px' : option.value === 'XL' ? '18px' : '14px' }}
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Dyslexia-friendly Font */}
            <div className="flex items-center justify-between">
              <Label htmlFor="dyslexia-font" className="text-sm font-medium">
                Dyslexia-friendly Font
              </Label>
              <Switch
                id="dyslexia-font"
                checked={settings.dyslexiaFont}
                onCheckedChange={(checked) => updateSetting('dyslexiaFont', checked)}
              />
            </div>

            {/* Reduce Motion */}
            <div className="flex items-center justify-between">
              <Label htmlFor="reduce-motion" className="text-sm font-medium">
                Reduce Motion
              </Label>
              <Switch
                id="reduce-motion"
                checked={!settings.animations}
                onCheckedChange={(checked) => updateSetting('animations', !checked)}
              />
            </div>
          </div>

          <Separator />

          {/* Audio Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              <h3 className="font-semibold text-foreground">Audio</h3>
            </div>
            
            {/* Text-to-Speech */}
            <div className="flex items-center justify-between">
              <Label htmlFor="tts" className="text-sm font-medium">
                Text-to-Speech (Tutor Responses)
              </Label>
              <Switch
                id="tts"
                checked={settings.textToSpeech}
                onCheckedChange={(checked) => updateSetting('textToSpeech', checked)}
              />
            </div>

            {/* Captions */}
            <div className="flex items-center justify-between">
              <Label htmlFor="captions" className="text-sm font-medium">
                Show Captions/Transcripts
              </Label>
              <Switch
                id="captions"
                checked={settings.captions}
                onCheckedChange={(checked) => updateSetting('captions', checked)}
              />
            </div>
          </div>

          <Separator />

          {/* Navigation Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              <h3 className="font-semibold text-foreground">Navigation</h3>
            </div>
            
            {/* Keyboard Navigation Mode */}
            <div className="flex items-center justify-between">
              <Label htmlFor="keyboard-mode" className="text-sm font-medium">
                Keyboard Navigation Mode
              </Label>
              <Switch
                id="keyboard-mode"
                checked={settings.keyboardMode}
                onCheckedChange={(checked) => updateSetting('keyboardMode', checked)}
              />
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <Button
              onClick={handleSave}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Save & Apply
            </Button>
            
            <Button
              onClick={handleReset}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Defaults
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AccessibilityTriggerProps {
  onToggle: () => void;
}

export function AccessibilityTrigger({ onToggle }: AccessibilityTriggerProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="fixed top-4 right-4 z-40 bg-card border-border shadow-lg hover:shadow-xl transition-shadow"
      data-accessibility-trigger
      aria-label="Toggle accessibility settings"
      onClick={onToggle}
    >
      <Accessibility className="h-4 w-4" />
    </Button>
  );
}