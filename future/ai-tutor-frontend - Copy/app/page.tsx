import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-2">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">AA</span>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-balance">Atypical Academy AI Tutor</CardTitle>
              <CardDescription className="text-lg mt-2 text-balance">
                Personalized learning designed for every mind
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center text-balance">
              Get started with your accessible, AI-powered learning experience tailored to your unique needs.
            </p>
            <div className="space-y-3">
              <Button asChild size="lg" className="w-full text-lg py-6">
                <Link href="/auth/sign-up">Create Account</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full text-lg py-6 bg-transparent">
                <Link href="/auth/login">Sign In</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
