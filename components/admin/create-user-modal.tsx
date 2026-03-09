'use client';

import { useState } from 'react';
import { User, Mail, Phone, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateUserModal({ open, onClose, onSuccess }: CreateUserModalProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'LEARNER',
    sendInvitation: true,
    password: '',
  });

  const handleSubmit = async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      await api.post(
        '/api/v1/admin/users',
        {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone || undefined,
          role: formData.role,
          password: formData.sendInvitation ? formData.password || undefined : undefined,
        },
        accessToken
      );
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        role: 'LEARNER',
        sendInvitation: true,
        password: '',
      });
      onSuccess();
      onClose();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to create user';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg" showClose={true}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Create New User
          </DialogTitle>
          <DialogDescription>
            Add a new user to the system. Optionally set a password or leave blank for invite flow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              placeholder="Enter full name"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                className="pl-10"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phone"
                placeholder="+91 98765 43210"
                className="pl-10"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>User Role *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                <SelectItem value="PROGRAMME_ADMIN">Programme Admin</SelectItem>
                <SelectItem value="FACULTY">Faculty</SelectItem>
                <SelectItem value="GUEST_FACULTY">Guest Faculty</SelectItem>
                <SelectItem value="EVALUATOR">Evaluator</SelectItem>
                <SelectItem value="LEARNER">Learner</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {formData.role === 'SUPER_ADMIN' && 'Full system access with MFA required'}
              {formData.role === 'LEARNER' && 'Can enroll in programmes and take assessments'}
              {formData.role === 'FACULTY' && 'Can create content and grade assessments'}
            </p>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendInvitation"
                checked={formData.sendInvitation}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, sendInvitation: checked === true })
                }
              />
              <Label htmlFor="sendInvitation" className="text-sm font-normal cursor-pointer">
                Set initial password (user can change on first login)
              </Label>
            </div>
            {formData.sendInvitation && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="password">Temporary Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Leave blank for no password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={loading || !formData.fullName || !formData.email}
          >
            {loading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Create User
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
