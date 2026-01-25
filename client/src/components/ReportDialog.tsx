import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Flag, Loader2 } from "lucide-react";

interface ReportDialogProps {
  userId: string;
  userName?: string;
  trigger?: React.ReactNode;
}

const reportReasons = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "fake_profile", label: "Fake or impersonation profile" },
  { value: "underage", label: "Suspected underage user" },
  { value: "spam", label: "Spam or scam" },
  { value: "threats", label: "Threats or violence" },
  { value: "non_consensual", label: "Non-consensual behavior" },
  { value: "other", label: "Other" },
];

export function ReportDialog({ userId, userName, trigger }: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const submitReport = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reports", {
        reportedUserId: userId,
        reason,
        description: description || undefined,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to submit report");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Report Submitted",
        description: "Thank you for helping keep our community safe. We will review your report.",
      });
      setOpen(false);
      setReason("");
      setDescription("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      toast({
        title: "Please select a reason",
        description: "You must select a reason for your report.",
        variant: "destructive",
      });
      return;
    }
    submitReport.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="text-red-500 border-red-500/30 hover:bg-red-500/10" data-testid="button-report-user">
            <Flag className="w-4 h-4 mr-1" />
            Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />
            Report User
          </DialogTitle>
          <DialogDescription>
            {userName ? `Report ${userName} for violating our community guidelines.` : "Report this user for violating our community guidelines."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for report</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger data-testid="select-report-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reportReasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Additional details (optional)</Label>
            <Textarea
              id="description"
              placeholder="Please provide any additional context that might help us review this report..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              data-testid="textarea-report-description"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              data-testid="button-report-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitReport.isPending || !reason}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-report-submit"
            >
              {submitReport.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Report
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
