import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

type GradeLevel = "primary" | "middle" | "high" | "college" | "graduate";

interface Profile {
  id?: string;
  user_id: string;
  display_name?: string;
  bio?: string;
  grade_level?: GradeLevel;
  learning_preferences?: Record<string, any>;
  accessibility_needs?: string[];
}

interface ProfileDialogProps {
  children: React.ReactNode;
}

export function ProfileDialog({ children }: ProfileDialogProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    display_name: "",
    bio: "",
    grade_level: "" as GradeLevel | "",
    accessibility_needs: "",
  });

  useEffect(() => {
    if (open) {
      fetchProfile();
    }
  }, [open]);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Type assertion for profiles table until types are regenerated
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setProfile(data as Profile);
        setFormData({
          display_name: data.display_name || "",
          bio: data.bio || "",
          grade_level: data.grade_level || "",
          accessibility_needs: data.accessibility_needs?.join(", ") || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const profileData = {
        user_id: user.id,
        display_name: formData.display_name || null,
        bio: formData.bio || null,
        grade_level: formData.grade_level || null,
        accessibility_needs: formData.accessibility_needs
          ? formData.accessibility_needs.split(",").map(s => s.trim()).filter(Boolean)
          : null,
      };

      // Type assertion for profiles table until types are regenerated
      const { error } = await (supabase as any)
        .from("profiles")
        .upsert(profileData);

      if (error) throw error;

      // Update localStorage with accessibility needs for the chat
      if (profileData.accessibility_needs) {
        localStorage.setItem("accessibilityNeeds", JSON.stringify(profileData.accessibility_needs));
      }

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setOpen(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Display Name */}
          <div>
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              placeholder="Enter your display name"
            />
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              rows={3}
            />
          </div>

          {/* Grade Level */}
          <div>
            <Label htmlFor="grade_level">Grade Level</Label>
            <Select
              value={formData.grade_level}
              onValueChange={(value) => setFormData({ ...formData, grade_level: value as GradeLevel })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your grade level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Primary School</SelectItem>
                <SelectItem value="middle">Middle School</SelectItem>
                <SelectItem value="high">High School</SelectItem>
                <SelectItem value="college">College</SelectItem>
                <SelectItem value="graduate">Graduate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Accessibility Needs */}
          <div>
            <Label htmlFor="accessibility_needs">Accessibility Needs</Label>
            <Input
              id="accessibility_needs"
              value={formData.accessibility_needs}
              onChange={(e) => setFormData({ ...formData, accessibility_needs: e.target.value })}
              placeholder="e.g., dyslexia, visual impairment (comma-separated)"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}