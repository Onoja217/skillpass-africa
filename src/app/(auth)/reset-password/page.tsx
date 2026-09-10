import { AuthForm } from "@/components/auth-form";
import { updatePassword } from "@/app/auth/actions";
export default function ResetPage() { return <AuthForm mode="reset" action={updatePassword} />; }
