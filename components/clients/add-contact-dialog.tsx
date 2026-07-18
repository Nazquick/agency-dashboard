"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  is_primary: z.boolean(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export function AddContactDialog({
  clientId,
  onAdded,
}: {
  clientId: string;
  onAdded: (contact: Tables<"client_contacts">) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", role: "", email: "", phone: "", is_primary: false },
  });

  async function onSubmit(values: ContactFormValues) {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("client_contacts")
      .insert({
        client_id: clientId,
        name: values.name,
        role: values.role || null,
        email: values.email || null,
        phone: values.phone || null,
        is_primary: values.is_primary,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Contact added");
    onAdded(data);
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Add contact
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact-name">Name</Label>
            <Input id="contact-name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-role">Role / title</Label>
            <Input id="contact-role" placeholder="Marketing Director" {...register("role")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input id="contact-email" type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-phone">Phone</Label>
            <Input id="contact-phone" {...register("phone")} />
          </div>
          <div className="flex items-center gap-2">
            <Controller
              name="is_primary"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="contact-primary"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              )}
            />
            <Label htmlFor="contact-primary" className="font-normal">
              Primary contact
            </Label>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Adding…" : "Add contact"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
