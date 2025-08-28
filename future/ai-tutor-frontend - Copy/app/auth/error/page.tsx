import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string }>
}) {
  const params = await searchParams
  const error = params?.error
  const errorDescription = params?.error_description

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-2">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-balance">Authentication Error</CardTitle>
              <CardDescription className="text-lg mt-2 text-balance">
                Something went wrong during authentication
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertDescription className="text-base">
                  <strong>Error:</strong> {error}
                  {errorDescription && (
                    <>
                      <br />
                      <span className="text-sm">{errorDescription}</span>
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Button asChild size="lg" className="w-full text-lg py-6">
                <Link href="/auth/login">Try Again</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full text-lg py-6 bg-transparent">
                <Link href="/">Go Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
