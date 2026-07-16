export function isRegistrationEnabled(): boolean {
  return import.meta.env.VITE_ALLOW_REGISTRATION === 'true';
}
