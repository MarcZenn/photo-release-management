// Redirect target for the route guard. Full staff_login implementation
// (magic-link/OTP flow via supabase.auth.signInWithOtp) lands in F5.
export function StaffLoginPage() {
  return (
    <main>
      <h1>Staff Login</h1>
      <p>Login placeholder.</p>
    </main>
  )
}
