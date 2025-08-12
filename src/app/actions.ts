'use server';

import { z } from 'zod';
import {
  generateBackendCode,
  type GenerateBackendCodeInput,
  type GenerateBackendCodeOutput,
} from '@/ai/flows/generate-backend-code';

const FormSchema = z.object({
  backendLanguage: z.string().min(1, 'Backend language is required.'),
  framework: z.string().min(1, 'Framework is required.'),
  includeAuthentication: z.boolean(),
  includeDatabaseConnectivity: z.boolean(),
  databaseType: z.string().optional(),
  additionalModules: z.string().optional(),
});

export type FormState = {
  data: GenerateBackendCodeOutput | null;
  error: string | null;
};

export async function handleGenerateCode(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const rawFormData = Object.fromEntries(formData);
  
  const parsed = FormSchema.safeParse({
    ...rawFormData,
    includeAuthentication: rawFormData.includeAuthentication === 'on',
    includeDatabaseConnectivity: rawFormData.includeDatabaseConnectivity === 'on',
  });
  
  if (!parsed.success) {
    return {
      data: null,
      error: parsed.error.errors.map((e) => e.message).join(', '),
    };
  }

  const inputData: GenerateBackendCodeInput = parsed.data;

  // The AI prompt expects a databaseType if database connectivity is included
  if (inputData.includeDatabaseConnectivity && !inputData.databaseType) {
    return {
        data: null,
        error: "Please select a database type when including database connectivity.",
    };
  }
  
  try {
    const result = await generateBackendCode(inputData);
    return { data: result, error: null };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred during code generation.';
    console.error(e);
    return { data: null, error };
  }
}
