import { AuthForm } from "@/components/auth-form";
import { login } from "@/app/auth/actions";
export default function LoginPage() { return <AuthForm mode="login" action={login} />; }
