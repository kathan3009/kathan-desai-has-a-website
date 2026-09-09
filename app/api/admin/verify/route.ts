import { isAdminAuthenticated } from "@/lib/auth";
import { adminJson, withAdminErrors } from "@/lib/adminRequest";

export async function GET() {
  return withAdminErrors(async () => {
    const authenticated = await isAdminAuthenticated();
    return adminJson({ authenticated });
  });
}
