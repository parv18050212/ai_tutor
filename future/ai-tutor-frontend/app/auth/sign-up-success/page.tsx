import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-2">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-balance">Check Your Email</CardTitle>
              <CardDescription className="text-lg mt-2 text-balance">
                We've sent you a confirmation link
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="space-y-2">
              <p className="text-muted-foreground text-balance">
                Please check your email and click the confirmation link to activate your account.
              </p>
              <p className="text-sm text-muted-foreground text-balance">
                Don't see the email? Check your spam folder or try signing up again.
              </p>
            </div>

            <Button asChild variant="outline" size="lg" className="w-full text-lg py-6 bg-transparent">
              <Link href="/auth/login">Return to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
