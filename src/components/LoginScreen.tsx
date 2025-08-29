import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff, Shield, Users } from "lucide-react";
import { UserMode } from "../App";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (mode: UserMode) => void;
}

export const LoginModal = ({ isOpen, onClose, onLogin }: LoginModalProps) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedMode, setSelectedMode] = useState<UserMode>("viewer");

  const handleLogin = () => {
    const adminPassword = "YK789";
    const viewerPassword = "SDYK8"; // <-- viewer password

    if (selectedMode === "admin" && password === adminPassword) {
      onLogin("admin");
      onClose();
    } else if (selectedMode === "viewer" && password === viewerPassword) {
      onLogin("viewer");
      onClose();
    } else {
      alert("Kyaa bee Shaane!! Nikal yaha se");
    }

    setPassword("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gang-card border-border/50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-orbitron text-center text-gang-glow">
            🔐 FYB Access Control
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          <div className="text-center text-muted-foreground">
            <p>Choose your access level, homie 💜</p>
          </div>

          {/* Mode Selection */}
          <div className="grid grid-cols-2 gap-4">
            <Card
              className={`p-4 cursor-pointer transition-all duration-300 ${
                selectedMode === "viewer"
                  ? "card-gang border-primary ring-2 ring-primary/50"
                  : "bg-muted hover:bg-muted/80"
              }`}
              onClick={() => setSelectedMode("viewer")}
            >
              <div className="text-center space-y-2">
                <Users className="w-8 h-8 mx-auto text-accent" />
                <h3 className="font-rajdhani font-bold">Viewer</h3>
                <p className="text-xs text-muted-foreground">Read-only access</p>
              </div>
            </Card>

            <Card
              className={`p-4 cursor-pointer transition-all duration-300 ${
                selectedMode === "admin"
                  ? "card-gang border-primary ring-2 ring-primary/50"
                  : "bg-muted hover:bg-muted/80"
              }`}
              onClick={() => setSelectedMode("admin")}
            >
              <div className="text-center space-y-2">
                <Shield className="w-8 h-8 mx-auto text-warning" />
                <h3 className="font-rajdhani font-bold">Admin</h3>
                <p className="text-xs text-muted-foreground">Full control</p>
              </div>
            </Card>
          </div>

          {/* Password Input for Both Modes */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-rajdhani">
              {selectedMode === "admin" ? "Admin Password" : "Viewer Key"}{" "}
              <span className="text-warning">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={
                  selectedMode === "admin"
                    ? "Enter the gang code..."
                    : "Enter the viewer key..."
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-input border-border pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleLogin} className="flex-1 btn-gang">
              Enter the Hood 🏠
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
