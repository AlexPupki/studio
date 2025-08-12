
'use client';

import React, { useState, useEffect, useRef, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useToast } from '@/hooks/use-toast';
import { handleGenerateCode } from './actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Wand2, Copy, Download, Bot, Loader2, Code2, Check } from 'lucide-react';

const techStacks: Record<string, { frameworks: string[]; fileExtension: string }> = {
  'Node.js': {
    frameworks: ['Express', 'Fastify', 'Koa.js'],
    fileExtension: 'js',
  },
  Python: {
    frameworks: ['Django', 'Flask', 'FastAPI'],
    fileExtension: 'py',
  },
  Go: {
    frameworks: ['Gin', 'Echo', 'Fiber'],
    fileExtension: 'go',
  },
};

const databaseOptions = ['PostgreSQL', 'MongoDB', 'MySQL', 'SQLite', 'Redis'];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full mt-4" size="lg">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Wand2 className="mr-2 h-5 w-5" />
          Generate Code
        </>
      )}
    </Button>
  );
}

export default function Home() {
  const [state, formAction] = useActionState(handleGenerateCode, {
    data: null,
    error: null,
  });
  const { toast } = useToast();

  const [selectedLanguage, setSelectedLanguage] = useState(
    Object.keys(techStacks)[0]
  );
  const [selectedFramework, setSelectedFramework] = useState(techStacks[Object.keys(techStacks)[0]].frameworks[0]);
  const [dbEnabled, setDbEnabled] = useState(false);
  const [copied, setCopied] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error) {
      toast({
        variant: 'destructive',
        title: 'Error Generating Code',
        description: state.error,
      });
    }
  }, [state, toast]);

  const handleCopy = () => {
    if (!state.data?.generatedCode) return;
    navigator.clipboard.writeText(state.data.generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleDownload = () => {
    if (!state.data?.generatedCode) return;
    const fileExtension = techStacks[selectedLanguage]?.fileExtension || 'txt';
    const frameworkName = selectedFramework.toLowerCase().replace(/\./g, '');
    const fileName = `${frameworkName}-backend.${fileExtension}`;

    const blob = new Blob([state.data.generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 w-full bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary text-primary-foreground rounded-lg">
              <Code2 className="h-6 w-6" />
            </div>
            <h1 className="text-xl md:text-2xl font-headline font-bold">
              Backend Boilerplate Generator
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-2">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="font-headline">Configure Your Backend</CardTitle>
                <CardDescription>
                  Select your stack and features to generate boilerplate code.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={formAction} ref={formRef}>
                  <div className="space-y-6">
                    <div className="space-y-2" suppressHydrationWarning>
                      <Label htmlFor="backendLanguage">Language</Label>
                      <Select
                        name="backendLanguage"
                        defaultValue={selectedLanguage}
                        onValueChange={lang => {
                          setSelectedLanguage(lang);
                          setSelectedFramework(techStacks[lang].frameworks[0]);
                          formRef.current?.requestSubmit();
                        }}
                      >
                        <SelectTrigger id="backendLanguage">
                          <SelectValue placeholder="Select a language" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(techStacks).map((lang) => (
                            <SelectItem key={lang} value={lang}>
                              {lang}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2" suppressHydrationWarning>
                      <Label htmlFor="framework">Framework</Label>
                      <Select name="framework" defaultValue={selectedFramework} onValueChange={setSelectedFramework}>
                        <SelectTrigger id="framework">
                          <SelectValue placeholder="Select a framework" />
                        </SelectTrigger>
                        <SelectContent>
                          {techStacks[selectedLanguage]?.frameworks.map(
                            (fw) => (
                              <SelectItem key={fw} value={fw}>
                                {fw}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                       <div className="flex items-center justify-between rounded-lg border p-3" suppressHydrationWarning>
                          <div className="space-y-0.5">
                            <Label htmlFor="includeAuthentication">Authentication</Label>
                            <p className="text-sm text-muted-foreground">Include user auth endpoints.</p>
                          </div>
                          <Switch id="includeAuthentication" name="includeAuthentication" />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3" suppressHydrationWarning>
                          <div className="space-y-0.5">
                            <Label htmlFor="includeDatabaseConnectivity">Database</Label>
                            <p className="text-sm text-muted-foreground">Include DB connection setup.</p>
                          </div>
                          <Switch id="includeDatabaseConnectivity" name="includeDatabaseConnectivity" checked={dbEnabled} onCheckedChange={setDbEnabled}/>
                        </div>
                    </div>
                    
                    {dbEnabled && (
                      <div className="space-y-2 animate-in fade-in" suppressHydrationWarning>
                        <Label htmlFor="databaseType">Database Type</Label>
                        <Select name="databaseType" defaultValue={databaseOptions[0]}>
                          <SelectTrigger id="databaseType">
                            <SelectValue placeholder="Select a database" />
                          </SelectTrigger>
                          <SelectContent>
                            {databaseOptions.map((db) => (
                              <SelectItem key={db} value={db}>
                                {db}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div className="space-y-2" suppressHydrationWarning>
                      <Label htmlFor="additionalModules">Additional Modules (Optional)</Label>
                      <Input id="additionalModules" name="additionalModules" placeholder="e.g., cors, dotenv, nodemon" />
                    </div>

                  </div>
                <SubmitButton />
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
             <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-headline">Generated Code</CardTitle>
                  <CardDescription>Review, copy, or download your boilerplate.</CardDescription>
                </div>
                {state.data && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={handleCopy} disabled={copied}>
                      {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
                      <span className="sr-only">Copy code</span>
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleDownload}>
                      <Download className="h-4 w-4" />
                      <span className="sr-only">Download code</span>
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {useFormStatus().pending ? (
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-[400px] w-full mt-4" />
                  </div>
                ) : state.data ? (
                  <div className="space-y-6">
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <h3 className="flex items-center font-semibold mb-2">
                            <Bot className="mr-2 h-5 w-5 text-primary" /> Assumptions Made
                        </h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap font-mono">
                            {state.data.assumptions}
                        </p>
                    </div>
                    <div className="relative">
                      <ScrollArea className="h-[60vh] w-full rounded-md border bg-card">
                        <pre className="p-4">
                          <code className="font-code text-sm">
                            {state.data.generatedCode}
                          </code>
                        </pre>
                      </ScrollArea>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 border-2 border-dashed rounded-lg">
                      <div className="p-4 bg-accent/10 rounded-full mb-4">
                        <Wand2 className="h-10 w-10 text-accent" />
                      </div>
                      <h3 className="text-xl font-headline font-semibold">Your code will appear here</h3>
                      <p className="text-muted-foreground mt-2 max-w-sm">
                        Fill out the form on the left and click "Generate Code" to see the magic happen.
                      </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
