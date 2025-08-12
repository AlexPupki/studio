'use server';

/**
 * @fileOverview An AI agent for generating backend code based on user specifications and selected boilerplate modules.
 *
 * - generateBackendCode - A function that generates backend code based on user specifications and selected boilerplate modules.
 * - GenerateBackendCodeInput - The input type for the generateBackendCode function.
 * - GenerateBackendCodeOutput - The return type for the generateBackendCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBackendCodeInputSchema = z.object({
  backendLanguage: z.string().describe('The programming language for the backend (e.g., Node.js, Python, Go).'),
  framework: z.string().describe('The framework to use for the backend (e.g., Express, Django, Flask).'),
  includeAuthentication: z.boolean().describe('Whether to include authentication boilerplate.'),
  includeDatabaseConnectivity: z.boolean().describe('Whether to include database connectivity boilerplate.'),
  databaseType: z.string().optional().describe('The type of database to connect to (e.g., MongoDB, PostgreSQL). Required if includeDatabaseConnectivity is true.'),
  additionalModules: z.string().optional().describe('Any additional modules or dependencies to include.'),
});

export type GenerateBackendCodeInput = z.infer<typeof GenerateBackendCodeInputSchema>;

const GenerateBackendCodeOutputSchema = z.object({
  generatedCode: z.string().describe('The generated backend code.'),
  assumptions: z.string().describe('Any assumptions made during code generation.'),
});

export type GenerateBackendCodeOutput = z.infer<typeof GenerateBackendCodeOutputSchema>;

export async function generateBackendCode(input: GenerateBackendCodeInput): Promise<GenerateBackendCodeOutput> {
  return generateBackendCodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBackendCodePrompt',
  input: {schema: GenerateBackendCodeInputSchema},
  output: {schema: GenerateBackendCodeOutputSchema},
  prompt: `You are an expert backend developer who can generate backend code based on user specifications.

You will use the following information to generate the backend code:

Backend Language: {{{backendLanguage}}}
Framework: {{{framework}}}
Include Authentication: {{#if includeAuthentication}}Yes{{else}}No{{/if}}
Include Database Connectivity: {{#if includeDatabaseConnectivity}}Yes{{else}}No{{/if}}
{{#if includeDatabaseConnectivity}}
Database Type: {{{databaseType}}}
{{/if}}
{{#if additionalModules}}
Additional Modules: {{{additionalModules}}}
{{/if}}

Generate the backend code, making intelligent assumptions to include necessary dependencies and helper functions. Add comments to the code explaining your decisions and assumptions.

Make sure to return the generated code and a list of assumptions you made.
`, 
});

const generateBackendCodeFlow = ai.defineFlow(
  {
    name: 'generateBackendCodeFlow',
    inputSchema: GenerateBackendCodeInputSchema,
    outputSchema: GenerateBackendCodeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
