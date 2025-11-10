import { z } from "zod";

// Customer validation schema
export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(5, "Name must be at least 5 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number"),
  address: z
    .string()
    .trim()
    .min(10, "Address must be at least 10 characters")
    .max(500, "Address must be less than 500 characters"),
  id_proof: z
    .string()
    .trim()
    .regex(/^\d{12}$/, "Aadhaar number must be exactly 12 digits")
});

export type CustomerFormData = z.infer<typeof customerSchema>;

// Credit validation schema
export const creditSchema = z.object({
  customer_id: z.string().min(1, "Please select a customer"),
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .max(10000000, "Amount cannot exceed ₹1,00,00,000"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be less than 500 characters")
    .optional()
    .or(z.literal(""))
});

export type CreditFormData = z.infer<typeof creditSchema>;

// Payment validation schema
export const paymentSchema = z.object({
  customer_id: z.string().min(1, "Please select a customer"),
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .max(10000000, "Amount cannot exceed ₹1,00,00,000"),
  payment_method: z.enum(["cash", "upi", "bank_transfer", "cheque", "card"]).refine((val) => val, {
    message: "Please select a payment method"
  }),
  payment_date: z.string().min(1, "Please select a payment date")
});

export type PaymentFormData = z.infer<typeof paymentSchema>;

// Profile validation schema
export const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .optional(),
  shop_name: z
    .string()
    .trim()
    .min(2, "Shop name must be at least 2 characters")
    .max(200, "Shop name must be less than 200 characters")
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .trim()
    .max(500, "Address must be less than 500 characters")
    .optional(),
  shop_location: z
    .string()
    .trim()
    .max(500, "Shop location must be less than 500 characters")
    .optional(),
  business_type: z
    .string()
    .trim()
    .max(100, "Business type must be less than 100 characters")
    .optional(),
  license_number: z
    .string()
    .trim()
    .max(50, "License number must be less than 50 characters")
    .optional(),
  shop_owner: z
    .string()
    .trim()
    .max(100, "Shop owner name must be less than 100 characters")
    .optional()
});

export type ProfileFormData = z.infer<typeof profileSchema>;

// Auth validation schemas
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters")
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const signUpSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters"),
  fullName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  shopName: z
    .string()
    .trim()
    .min(2, "Shop name must be at least 2 characters")
    .max(200, "Shop name must be less than 200 characters"),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number")
});

export type SignUpFormData = z.infer<typeof signUpSchema>;

// Global search validation
export const globalSearchSchema = z.object({
  aadhar: z
    .string()
    .trim()
    .regex(/^\d{12}$/, "Aadhar number must be exactly 12 digits")
});

export type GlobalSearchFormData = z.infer<typeof globalSearchSchema>;
