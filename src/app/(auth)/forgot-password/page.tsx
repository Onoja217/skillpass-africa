import { AuthForm } from "@/components/auth-form";
import { requestPasswordReset } from "@/app/auth/actions";
export default function ForgotPage() { return <AuthForm mode="forgot" action={requestPasswordReset} />; }
